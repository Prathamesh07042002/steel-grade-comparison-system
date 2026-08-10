"""
comparator.py — Property comparison engine

Two modes:
  1. direct_compare()   — LLM-assisted, deterministic input (user picks the standard grade manually)
                          LLM does the actual property matching/range checking.
  2. llm_compare()      — LLM-assisted, used by Pipeline 2
                          LLM picks the best-matching standard AND does the matching.
"""

import json
import os
import re
import time
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("MISTRAL_API_KEY")

MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-large-latest"

# Retry settings
MAX_RETRIES = 4          # total attempts
RETRY_BASE_DELAY = 5     # seconds — doubles each retry: 5 → 10 → 20 → 40

# A name-matched standard needs at least this raw coverage score to get
# priority over a higher-scoring standard that didn't name-match. Below
# this floor, name_match is NOT used to rescue a candidate — see
# _select_best() for the two worked examples this rule is built from.
NAME_MATCH_FLOOR = 0.60


# ── Shared LLM caller ─────────────────────────────────────────────────────────

def _call_llm(prompt: str, timeout: int = 180) -> dict:
    """
    Send a prompt to Mistral and return the parsed JSON response.
    Retries automatically on 429 Rate Limit with exponential backoff.
    Raises on persistent failure or JSON parse error.
    """
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        response = requests.post(
            MISTRAL_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MISTRAL_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=timeout,
        )

        if response.status_code == 200:
            break  # success — exit retry loop

        if response.status_code == 429:
            wait = RETRY_BASE_DELAY * (2 ** (attempt - 1))   # 5, 10, 20, 40 s
            print(f"  ⚠️  Rate limited (attempt {attempt}/{MAX_RETRIES}). Waiting {wait}s before retry…")
            last_error = response.text
            if attempt < MAX_RETRIES:
                time.sleep(wait)
            continue

        # Any other HTTP error — fail immediately, no retry
        raise Exception(f"LLM API Error {response.status_code}: {response.text}")

    else:
        raise Exception(f"LLM API rate limit persists after {MAX_RETRIES} retries. Last error: {last_error}")

    content = response.json()["choices"][0]["message"]["content"].strip()

    # Strip markdown fences if present
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    return json.loads(content)


# ── Pipeline 1: LLM-assisted direct comparison ───────────────────────────────

def direct_compare(test_props: dict, std_props: dict) -> dict:
    """
    Use LLM to compare test property dict against a specific standard property dict.

    The user has already chosen which standard grade to compare against.
    The LLM handles property matching, range evaluation, and unit awareness.

    Returns:
    {
      "matched":         {prop: {test_value, standard_value, within_range, note}},
      "not_in_standard": {prop: value},   # in test but not in standard
      "not_in_test":     {prop: value},   # in standard but not in test
    }
    """

    prompt = f"""
You are an expert materials engineer and quality inspector.

Your job is to compare a TEST product's properties against a STANDARD product's properties.

TEST PROPERTIES:
{json.dumps(test_props, indent=2)}

STANDARD PROPERTIES:
{json.dumps(std_props, indent=2)}

Instructions:
- Match properties from the test against the standard using flexible key matching
  (e.g. "C%" matches "C% max", "YS" matches "YS MPa", ignore case and whitespace).
- For each matched property, check if the test value satisfies the standard constraint.
  Standard values may be expressed as: "0.10 max", "250 min", "330-410", ">=250", "<=0.20",
  or plain numbers (use ±5% tolerance for plain numbers).
- Classify each property into one of three groups:
    1. matched       — property exists in both
    2. not_in_standard — property exists only in the test
    3. not_in_test   — property exists only in the standard

Return STRICT JSON ONLY — no markdown, no explanation:
{{
  "matched": {{
    "<standard_property_name>": {{
      "test_value":     "<value from test>",
      "standard_value": "<constraint from standard>",
      "within_range":   true,
      "note":           "<brief reason, e.g. 'max 0.25', 'range 330–410', '±5% tolerance'>"
    }}
  }},
  "not_in_standard": {{
    "<test_property_name>": "<test value>"
  }},
  "not_in_test": {{
    "<standard_property_name>": "<standard value>"
  }}
}}
"""

    print("  📤 Sending LLM direct-compare request…")
    try:
        result = _call_llm(prompt)
    except json.JSONDecodeError:
        print("  ⚠️  LLM response could not be parsed. Returning empty result.")
        return {"matched": {}, "not_in_standard": {}, "not_in_test": {}}

    # Ensure all expected keys exist
    result.setdefault("matched", {})
    result.setdefault("not_in_standard", {})
    result.setdefault("not_in_test", {})
    return result


# ── Helper: recover property matches the LLM's fuzzy key-matching missed ─────
# Root cause: the LLM does key-matching (e.g. "YS" == "YS MPa"?) as a single
# judgment call inside the same pass as standard-selection and range math,
# with nothing checking it afterward. When that judgment fails, a standard
# property with a real matching test value lands in "not_in_test" (looks
# "missing") instead of "matched". This recovers those cases deterministically
# — normalizes both sides' keys the same way regardless of unit/spacing/
# min-max-suffix differences, so it doesn't need to know in advance which
# exact string variant caused the miss.

def _normalize_prop_key(key: str) -> str:
    """"YS MPa", "YS(MPa)", "ys mpa", "YS min", "YS max" all normalize to "YS"."""
    core = re.sub(r"%|ppm|mpa|\bmin\b|\bmax\b|\(.*?\)", "", key or "", flags=re.IGNORECASE)
    return re.sub(r"[^A-Za-z0-9]", "", core).upper()


def _parse_range(rv: str):
    """Parse a standard's constraint string into (lo, hi) floats — either
    bound may be None (open-ended). Mirrors the prompt's own STEP 2 rules
    (same formats the LLM is told to expect) so results are consistent with
    what the LLM would have computed, just deterministic. Returns None if
    the string doesn't parse as a numeric constraint at all."""
    if not rv:
        return None
    s = str(rv).strip().replace(",", ".")  # comma decimal -> "1,42" -> "1.42"
    # Drop a trailing period after a word ("max." / "min." — common cert
    # abbreviation style) without touching a decimal point after a digit
    # ("0.045" stays untouched since that "." follows a digit, not a letter).
    s = re.sub(r"(?<=[A-Za-z])\.\s*$", "", s)

    m = re.match(r"^<=\s*([\d.]+)$", s) or re.match(r"^([\d.]+)\s*max$", s, re.IGNORECASE)
    if m:
        return (None, float(m.group(1)))

    m = re.match(r"^>=\s*([\d.]+)$", s) or re.match(r"^([\d.]+)\s*min$", s, re.IGNORECASE)
    if m:
        return (float(m.group(1)), None)

    m = re.match(r"^([\d.]+)\s*-\s*([\d.]+)$", s)
    if m:
        return (float(m.group(1)), float(m.group(2)))

    m = re.match(r"^([\d.]+)$", s)
    if m:
        v = float(m.group(1))
        return (v * 0.95, v * 1.05)  # plain number -> ±5% tolerance

    return None  # unparseable — leave undetermined rather than guess


def _value_in_range(test_value, rv: str):
    """True/False if the test value's numeric comparison against rv is
    determinable, else None (unparseable test value or rv — same "leave
    undetermined" leniency the prompt already applies to OCR-suspect
    values, so this never falsely fails something it can't actually read)."""
    try:
        tv = float(str(test_value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None
    rng = _parse_range(rv)
    if rng is None:
        return None
    lo, hi = rng
    if lo is not None and tv < lo:
        return False
    if hi is not None and tv > hi:
        return False
    return True


def _get_std_parameters(product: dict) -> list:
    """Pull the [{"element":..., "rv":...}, ...] list out of a loaded
    standard product dict, whatever shape it's in. Handles both a direct
    {"parameters": [...]} and extract_standards_json's actual output shape,
    {"<grade_name>": {"parameters": [...]}} (grade name as the only key)."""
    if not isinstance(product, dict):
        return []
    if isinstance(product.get("parameters"), list):
        return product["parameters"]
    for v in product.values():
        if isinstance(v, dict) and isinstance(v.get("parameters"), list):
            return v["parameters"]
    return []


def _split_composite_key(std_key: str):
    """If std_key is a SUM of element symbols joined by "+" (e.g. "Nb+V+Ti%",
    "Nb+V+Ti"), return the list of individual element tokens ["Nb","V","Ti"].
    Otherwise return None. This is for standards that define a property as a
    combined limit on several elements together, not any single one of them —
    the test data never has one field for this, only the individual elements,
    so it has to be computed by adding them up."""
    core = re.sub(r"%\s*$", "", (std_key or "").strip())
    parts = [p.strip() for p in core.split("+") if p.strip()]
    if len(parts) < 2:
        return None
    if all(re.match(r"^[A-Za-z0-9]+$", p) for p in parts):
        return parts
    return None


def _recompute_matched_within_range(result: dict) -> None:
    """For EVERY already-matched property (not just recovered ones), redo
    the PASS/FAIL check deterministically from the stored test_value and
    standard_value, and override the LLM's own verdict when we get a
    confident answer. This is the same "never trust the LLM's arithmetic"
    principle already applied to the overall score (_compute_coverage) —
    just applied per-property too, since a single wrong 0.015-vs-0.030-max
    judgment is arithmetic, not a naming problem, and can happen to any
    property, not only the one that happened to be reported. If our parser
    can't confidently read the format, the LLM's original verdict is left
    as-is rather than replaced with an "undetermined" that might be a
    regression on a case our parser doesn't cover yet."""
    for block_name in ("chemical_properties", "mechanical_properties"):
        block = result.get(block_name)
        if not isinstance(block, dict):
            continue
        for entry in block.get("matched", {}).values():
            if not isinstance(entry, dict):
                continue
            determined = _value_in_range(entry.get("test_value"), entry.get("standard_value"))
            if determined is not None:
                entry["within_range"] = determined


def _recover_missed_property_matches(result: dict, test_flat: dict, std_params: list) -> None:
    """Mutates result in place. For every standard property the LLM put in
    not_in_test, re-check with normalized key matching against the actual
    extracted test properties. If a match is found, move it into matched
    with a deterministically computed within_range — never trust the LLM's
    original "missing" classification as final, same principle as never
    trusting its arithmetic.

    Also handles COMPOSITE properties — a standard limit written as a sum of
    elements (e.g. "Nb+V+Ti% max 0.200") that has no single matching test
    field, because the test data only has the individual elements. Sums the
    matching individual values and compares the total against the limit."""
    std_by_norm = {}
    for p in std_params:
        norm = _normalize_prop_key(p.get("element", ""))
        if norm and norm not in std_by_norm:
            std_by_norm[norm] = (p.get("element", ""), p.get("rv", ""))

    test_by_norm = {}
    for k, v in test_flat.items():
        norm = _normalize_prop_key(k)
        if norm and norm not in test_by_norm:
            test_by_norm[norm] = (k, v)

    for block_name in ("chemical_properties", "mechanical_properties"):
        block = result.get(block_name)
        if not isinstance(block, dict):
            continue
        not_in_test = block.get("not_in_test", {})
        matched = block.setdefault("matched", {})
        recovered = []
        for std_key, std_val in list(not_in_test.items()):
            norm = _normalize_prop_key(std_key)

            # Case 1: simple key-naming mismatch (e.g. "YS" vs "YS MPa")
            if norm in test_by_norm:
                test_key, test_val = test_by_norm[norm]
                matched[std_key] = {
                    "test_value": test_val,
                    "standard_value": std_val,
                    "within_range": _value_in_range(test_val, std_val),
                    "note": "",
                }
                recovered.append(std_key)
                continue

            # Case 2: composite property (e.g. "Nb+V+Ti%") — sum the parts
            parts = _split_composite_key(std_key)
            if parts:
                total = 0.0
                contributing = []
                all_found = True
                for part in parts:
                    part_norm = _normalize_prop_key(part)
                    if part_norm not in test_by_norm:
                        all_found = False
                        break
                    part_key, part_val = test_by_norm[part_norm]
                    try:
                        total += float(str(part_val).strip().replace(",", "."))
                        contributing.append(f"{part_key}={part_val}")
                    except (TypeError, ValueError):
                        all_found = False
                        break
                if all_found:
                    matched[std_key] = {
                        "test_value": f"{round(total, 4)} ({' + '.join(contributing)})",
                        "standard_value": std_val,
                        "within_range": _value_in_range(total, std_val),
                        "note": "",
                    }
                    recovered.append(std_key)

        for k in recovered:
            del not_in_test[k]


# ── Helper: recount from structured LLM data ─────────────────────────────────

def _recount_from_data(props: dict) -> tuple[int, int]:
    """
    Recount matched_count and standard_total directly from the LLM's
    structured property block.

    standard_total = matched entries (any within_range) + not_in_test entries
                     not_in_standard is EXCLUDED — extra test properties never
                     reduce the score.

    matched_count  = matched entries where within_range is True
                     within_range = null (OCR suspect) is excluded from BOTH
                     numerator and denominator so it neither helps nor hurts.
    """
    matched_props = props.get("matched", {})

    matched_count = sum(
        1 for v in matched_props.values()
        if isinstance(v, dict) and v.get("within_range") is True
    )

    # Exclude null within_range from denominator too (OCR suspect values)
    valid_matched = sum(
        1 for v in matched_props.values()
        if isinstance(v, dict) and v.get("within_range") is not None
    )

    std_total = valid_matched + len(props.get("not_in_test", {}))
    return matched_count, std_total


# ── Helper: compute and stamp coverage score ──────────────────────────────────

def _compute_coverage(result: dict) -> dict:
    """
    Recompute overall_score from the LLM's structured property data and
    re-apply verdict thresholds consistently in Python.
    Mutates and returns the result dict.

    Score formula:
        standard_total = valid_matched_count + not_in_test_count
        overall_score  = matched_count / standard_total

    Key rule:
        Extra test properties (not_in_standard) do NOT affect score.
        Standard A defines 7 props, test has 20 props:
        if all 7 standard props pass → score = 7/7 = 1.0 = MATCHED

    Verdict thresholds:
        1.00        → MATCHED
        0.50–0.99   → PARTIAL
        < 0.50      → NO_MATCH
    """
    chem_m, chem_t = _recount_from_data(result.get("chemical_properties", {}))
    mech_m, mech_t = _recount_from_data(result.get("mechanical_properties", {}))

    total_matched  = chem_m + mech_m
    total_standard = chem_t + mech_t

    score = round(total_matched / total_standard, 4) if total_standard > 0 else 0.0

    if score >= 1.0:
        verdict = "MATCHED"
    elif score >= 0.5:
        verdict = "PARTIAL"
    else:
        verdict = "NO_MATCH"

    result["matched_count"]  = total_matched
    result["standard_total"] = total_standard
    result["overall_score"]  = score
    result["verdict"]        = verdict
    return result


# ── Helper: deterministic name matching (NOT left to the LLM to judge) ───────
# The LLM was self-reporting name_match/name_match_reason while ALSO doing
# the property comparison — same "trust the model's own claim" problem we
# hit with extraction. This computes it in plain Python instead, straight
# from the fields extractor.py actually pulled off the certificate.

def _normalize_name(s: str) -> str:
    """Strip everything but letters/digits and uppercase, so "IS 2062 E350-A",
    "is2062e350a", and "IS-2062_E350.A" all compare equal."""
    return re.sub(r"[^A-Za-z0-9]", "", s or "").upper()


# Grade names that are the SAME grade in reality but get written differently
# across your files — e.g. some certs/filenames use "E-46", others use
# "BSK-46", for what is actually the same product. Plain substring/equality
# matching can never catch this (neither name contains the other), so it
# needs an explicit alias list. Each set is a group of interchangeable
# normalized names — add more groups here as you find more of these; each
# group is independent, so adding one never affects any other grade.
GRADE_ALIAS_GROUPS = [
    {"E46", "BSK46"},
]


def _names_are_aliases(a_norm: str, b_norm: str) -> bool:
    """True if a_norm and b_norm are both in the same known alias group."""
    return any(a_norm in group and b_norm in group for group in GRADE_ALIAS_GROUPS)


def _extract_grade_from_filename(pdf_filename: str) -> str:
    """Pull the grade token straight out of the uploaded PDF's filename.

    Your filenames follow "<thickness>MM_<GRADE>_<vendor...>_<batch>_<date>",
    e.g. "3MM_FE-410_TATA_STEEL_51132_300326.pdf" -> "FE-410",
         "1.6MM_E-34_POSHS_0009_020526.pdf" -> "E-34",
         "0.8MM_HSLA340_TATA_STEEL_51135_300326.pdf" -> "HSLA340".
    The grade is always the token right after the thickness prefix, so this
    doesn't need to know how many vendor/batch tokens follow — it just reads
    up to the next underscore. Returns "" if the filename doesn't match this
    convention (caller falls back to OCR-extracted names in that case).
    """
    name = os.path.splitext(os.path.basename(pdf_filename or ""))[0]
    match = re.match(r"^\s*\d+(?:\.\d+)?\s*MM[_\s]+([A-Za-z0-9\-]+)", name, flags=re.IGNORECASE)
    return match.group(1) if match else ""


def _extract_test_names(test_data: dict, pdf_filename: str = "") -> list:
    """Candidate name strings for the test side of the match, most reliable
    first. The filename-derived grade goes first — it's typed by a human and
    never passes through OCR or an LLM, so it's the least guess-prone signal
    we have. OCR-extracted grade/supply_spec/drawing_designation are kept as
    fallbacks for filenames that don't follow the naming convention."""
    names = []
    filename_grade = _extract_grade_from_filename(pdf_filename)
    if filename_grade:
        names.append(filename_grade)
    for key in ("grade", "supply_spec", "drawing_designation"):
        v = test_data.get(key)
        if v:
            names.append(str(v))
    return names


def _extract_standard_name(entry: dict) -> str:
    """Candidate name string for one loaded standard entry (see the
    all_standards list built in llm_compare). Tries common explicit fields
    first, then falls back to the shape extract_standards_json() actually
    produces — {"<grade_name>": {"parameters": [...]}} — where the grade
    name is the dict's only key, not a value. Falls back to the filename
    if nothing else is found."""
    product = entry.get("product", {})
    if isinstance(product, dict):
        for key in ("grade", "name", "standard_product", "grade_name"):
            if product.get(key):
                return str(product[key])
        if len(product) == 1:
            return str(next(iter(product.keys())))
    return os.path.splitext(entry.get("file", ""))[0]


def _names_match(test_data: dict, std_name: str, pdf_filename: str = "") -> bool:
    """True if any test-side name string and the standard's name are equal,
    contain each other, or are known aliases of the same grade (see
    GRADE_ALIAS_GROUPS), after normalization. Containment (not just
    equality) matters here — e.g. test grade "E-46(Thin)" vs standard name
    "E46" should still count as the same grade family."""
    std_norm = _normalize_name(std_name)
    if not std_norm:
        return False
    for test_name in _extract_test_names(test_data, pdf_filename):
        test_norm = _normalize_name(test_name)
        if not test_norm:
            continue
        if test_norm == std_norm or test_norm in std_norm or std_norm in test_norm:
            return True
        if _names_are_aliases(test_norm, std_norm):
            return True
    return False


# ── Helper: select best match with name-match floor rule ─────────────────────

def _select_best(results: list) -> list:
    """
    Reorder results so index 0 is the actual winner under this rule:

    A name-matched candidate takes priority over a higher-scoring
    non-name-matched candidate — but ONLY if the name-matched candidate's
    own score still clears NAME_MATCH_FLOOR (0.50). A name match never
    rescues a candidate whose underlying data doesn't reasonably back it up.

    Worked examples this rule is built from:

    Example 1 (name match with bad data — must NOT be rescued):
        Standard A: name matches, but only 3/10 properties match → 30%
        Standard B: name does NOT match, 9/10 properties match   → 90%
        A's score (30%) is below NAME_MATCH_FLOOR → A gets NO priority.
        Winner: B (90%, wins on score alone, same as a plain sort would give).

    Example 2 (the actual case we're fixing):
        Standard A: name matches, 91% of properties match
        Standard B: name does NOT match, 95% of properties match (maybe
                    OCR noise inflated it)
        A's score (91%) clears NAME_MATCH_FLOOR → A gets priority over B,
        even though B's raw score is technically higher.
        Winner: A — this is the case a plain (score, name_match) sort key
        gets wrong, because it only uses name_match to break EXACT ties.

    If no candidate is both name-matched and above the floor, falls back to
    plain highest-score-wins (Example 1's outcome, and the general case with
    no name match at all).
    """
    scored = sorted(results, key=lambda x: float(x.get("overall_score", 0)), reverse=True)

    qualified_name_matches = [
        r for r in scored
        if r.get("name_match") and float(r.get("overall_score", 0)) >= NAME_MATCH_FLOOR
    ]

    winner = qualified_name_matches[0] if qualified_name_matches else scored[0]
    rest = [r for r in scored if r is not winner]
    return [winner] + rest


# ── Pipeline 2: LLM auto-match comparison ────────────────────────────────────

def llm_compare(test_data: dict, standards_json_dir: str, pdf_filename: str = "") -> dict:
    """
    Compare ONE test product against all standards, ranked by COVERAGE SCORE.

    Coverage rule:
        Score is based ONLY on properties the standard defines.
        Extra properties in the test report are IGNORED — they never reduce score.

        Standard defines 7 props, test has 20 props:
        If all 7 standard props pass → score = 7/7 = 1.0 → MATCHED

        Standard A: 8 matched out of 13 defined → score = 0.615  (PARTIAL)
        Standard B: 7 matched out of 7  defined → score = 1.000  (MATCHED)
        → Standard B wins even though 8 > 7 in raw count.

    OCR leniency:
        If a value looks like an OCR misread, LLM marks within_range = null.
        Null values are excluded from both numerator and denominator
        so bad OCR does not silently fail a property.

    Args:
        test_data:           Extracted test dict from extractor.extract_test_json()
        standards_json_dir:  Folder containing standard *.json files
        pdf_filename:        Original uploaded filename (e.g.
                              "3MM_FE-410_TATA_STEEL_51132_300326.pdf"). Used
                              as the PRIMARY name-match signal — the grade
                              token in the filename never passes through OCR
                              or an LLM, so it's more reliable than the
                              OCR-extracted grade. Falls back to test_data's
                              grade/supply_spec/drawing_designation if the
                              filename doesn't follow the naming convention
                              or isn't passed. Pass your uploaded_file.name
                              from app.py here.

    Returns:
        {
            "status":      "MATCHED" | "PARTIAL" | "NO_MATCH",
            "best_match":  { ...full result dict... },
            "top_matches": [ ...up to 5 results... ]
        }
        or on failure:
        {
            "status":          "NO_MATCH",
            "message":         "...",
            "closest_attempt": { ... }
        }
    """

    # ── 1. Load all standard JSONs ────────────────────────────────────────────
    all_standards = []
    for filename in sorted(os.listdir(standards_json_dir)):
        if not filename.endswith(".json"):
            continue
        fp = os.path.join(standards_json_dir, filename)
        try:
            with open(fp, "r", encoding="utf-8") as f:
                std_data = json.load(f)
            if isinstance(std_data, list):
                std_data = {"products": std_data}
            products = std_data.get("products", [std_data])
            for p in products:
                all_standards.append({"file": filename, "product": p})
        except Exception as exc:
            print(f"  ⚠️  Skipping {filename}: {exc}")
            continue

    if not all_standards:
        return {"status": "NO_MATCH", "message": "No standard JSON files found."}

    print(f"  📂 Loaded {len(all_standards)} standard product(s) from {standards_json_dir}")

    # Deterministic name lookup per file — computed once here, used to
    # OVERRIDE the LLM's self-reported name_match after results come back.
    # (Assumes ~1 product per standard file, matching extract_standards_json's
    # output shape — {"<grade_name>": {"parameters": [...]}} per file.)
    std_name_by_file = {entry["file"]: _extract_standard_name(entry) for entry in all_standards}

    # ── 2. Build prompt ───────────────────────────────────────────────────────
    prompt = f"""
You are an expert materials engineer and standards comparison system.

Your task is to compare ONE test certificate product against MULTIPLE standard products.

TEST PRODUCT:
{json.dumps(test_data, indent=2)}

STANDARD PRODUCTS:
{json.dumps(all_standards, indent=2)}

━━━ CORE MATCHING RULE ━━━

A standard is evaluated ONLY on the properties IT defines.
Extra properties in the test report are completely IGNORED.

Example:
  Standard defines 7 properties.
  Test report contains 20 properties.
  If all 7 standard properties are satisfied → score = 7/7 = 1.0 → MATCHED.
  The extra 13 test properties do NOT reduce the score.

━━━ STEP 1 — Classify every standard-defined property into one bucket ━━━

For each property the standard defines:

  matched         → exists in test AND test value satisfies the constraint
  not_in_test     → exists in standard but ABSENT from test report
  not_in_standard → exists only in the test (standard makes no claim about it)
                    ← put these here and IGNORE them for scoring

━━━ STEP 2 — Evaluate constraints ━━━

  "0.10 max"  or "<=0.10"  → test_value ≤ 0.10
  "250 min"   or ">=250"   → test_value ≥ 250
  "330-410"                → 330 ≤ test_value ≤ 410
  plain number             → within ±5% tolerance
  comma decimal            → treat "1,42" same as "1.42"

  OCR LENIENCY (important):
  If a test value looks like an OCR misread (letter where digit expected,
  implausible value far from standard limit, e.g. "O.18" or "26B"):
    - Note it in the "note" field
    - Set within_range to null (not false)
    - null means "suspect value — exclude from scoring"
    - Do NOT mark as false just because it looks garbled

━━━ STEP 3 — Counts ━━━

  standard_total = count(matched where within_range != null) + count(not_in_test)
  matched_count  = count(matched where within_range = true)
  overall_score  = matched_count / standard_total  ← 4 decimal places

  not_in_standard → excluded entirely, does NOT affect standard_total or score.
  within_range = null → excluded from BOTH matched_count AND standard_total.

  Example:
    Standard A: 8 matched(all valid) + 5 not_in_test = 13 total → 8/13 = 0.6154
    Standard B: 7 matched(all valid) + 0 not_in_test = 7  total → 7/7  = 1.0000
    Standard B is BETTER — all its requirements are satisfied.

━━━ STEP 4 — Verdict ━━━

  overall_score = 1.00              → "MATCHED"
  0.50 ≤ overall_score < 1.00       → "PARTIAL"
  overall_score < 0.50              → "NO_MATCH"

━━━ OUTPUT — strict JSON only, no markdown, no explanation ━━━

{{
  "results": [
    {{
      "test_product":      "<name of test product>",
      "standard_file":     "<filename>",
      "standard_product":  "<name of standard product>",
      "standard_total":    0,
      "matched_count":     0,
      "overall_score":     0.0,
      "verdict":           "MATCHED | PARTIAL | NO_MATCH",
      "verdict_reason":    "<e.g. '7 of 7 standard properties satisfied'>",
      "name_match":        true,
      "name_match_reason": "<brief explanation>",
      "chemical_properties": {{
        "matched":          {{"<prop>": {{"test_value": "", "standard_value": "", "within_range": true, "note": ""}}}},
        "not_in_standard":  {{"<prop>": "<test_val>"}},
        "not_in_test":      {{"<prop>": "<standard_val>"}}
      }},
      "mechanical_properties": {{
        "matched":          {{"<prop>": {{"test_value": "", "standard_value": "", "within_range": true, "note": ""}}}},
        "not_in_standard":  {{"<prop>": "<test_val>"}},
        "not_in_test":      {{"<prop>": "<standard_val>"}}
      }}
    }}
  ]
}}
"""

    # ── 3. Call LLM ──────────────────────────────────────────────────────────
    print("  📤 Sending LLM auto-match request…")
    try:
        parsed = _call_llm(prompt)
    except json.JSONDecodeError:
        return {"status": "NO_MATCH", "message": "LLM response could not be parsed."}

    results = parsed.get("results", [])
    if not results:
        return {"status": "NO_MATCH", "message": "No results returned by LLM."}

    # ── 3b. Recover properties the LLM's fuzzy key-matching missed ────────────
    # Must run BEFORE coverage is computed, so recovered matches count toward
    # the score — not just cosmetically move between buckets after scoring.
    test_flat = {}
    test_flat.update(test_data.get("chemical_properties", {}) or {})
    test_flat.update(test_data.get("mechanical_properties", {}) or {})
    std_params_by_file = {
        entry["file"]: _get_std_parameters(entry["product"]) for entry in all_standards
    }
    for r in results:
        std_params = std_params_by_file.get(r.get("standard_file", ""), [])
        _recover_missed_property_matches(r, test_flat, std_params)
        _recompute_matched_within_range(r)

    # ── 4. Recompute scores from structured data (never trust LLM arithmetic) ─
    for r in results:
        _compute_coverage(r)

    # ── 4b. Overwrite name_match with the deterministic version — do not
    #        trust the LLM's own name_match/name_match_reason, same reasoning
    #        as never trusting its arithmetic. PRIMARY signal is the grade
    #        parsed from the uploaded filename (pdf_filename); falls back to
    #        the OCR-extracted grade/supply_spec fields if that's not
    #        available or doesn't follow the naming convention.
    filename_grade = _extract_grade_from_filename(pdf_filename)
    for r in results:
        std_name = std_name_by_file.get(r.get("standard_file", ""), r.get("standard_product", ""))
        r["name_match"] = _names_match(test_data, std_name, pdf_filename)
        r["name_match_reason"] = (
            f"deterministic: filename grade '{filename_grade}'" if filename_grade
            else f"deterministic: extracted test name(s) {_extract_test_names(test_data, pdf_filename)}"
        ) + f" vs standard name '{std_name}'"

    # ── 5. Select the best match ──────────────────────────────────────────────
    # NOT a plain sort-by-score: name_match only wins the top spot when its
    # OWN score also clears NAME_MATCH_FLOOR. See _select_best() for why a
    # plain (score, name_match) sort key gets this wrong — it only breaks
    # ties on EQUAL scores, so a higher-raw-score non-name-match would still
    # beat a name-matched-but-slightly-lower-score candidate, which is
    # backwards from what we actually want.
    results = _select_best(results)
    best = results[0]
    best_score = float(best.get("overall_score", 0))

    print(
        f"  ✅ Best match: {best.get('standard_product')} "
        f"({best.get('matched_count')}/{best.get('standard_total')} = "
        f"{best_score:.1%}) → {best.get('verdict')}"
    )

    # ── 6. Return ─────────────────────────────────────────────────────────────
    if best.get("verdict") == "NO_MATCH" or best_score < 0.30:
        return {
            "status":  "NO_MATCH",
            "message": "No sufficiently similar standard found.",
            "closest_attempt": {
                "standard_file":    best.get("standard_file", ""),
                "standard_product": best.get("standard_product", ""),
                "overall_score":    best_score,
                "matched_count":    best.get("matched_count", 0),
                "standard_total":   best.get("standard_total", 0),
                "verdict_reason":   best.get("verdict_reason", ""),
            },
        }

    return {
        "status":      best.get("verdict", "MATCHED"),
        "best_match":  best,
        "top_matches": results[:5],
    }