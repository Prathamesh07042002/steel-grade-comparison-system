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


# ── Pipeline 2: LLM auto-match comparison ────────────────────────────────────




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


# ── Pipeline 2: LLM auto-match comparison ────────────────────────────────────

def llm_compare(test_data: dict, standards_json_dir: str) -> dict:
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
  If all 7 standard properties are satisfied → score = 7/7 = 1.0 = MATCHED.
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

    # ── 4. Recompute scores from structured data (never trust LLM arithmetic) ─
    for r in results:
        _compute_coverage(r)

    # ── 5. Sort: coverage score desc, name_match as tiebreaker ───────────────
    results.sort(
        key=lambda x: (float(x.get("overall_score", 0)), bool(x.get("name_match", False))),
        reverse=True,
    )

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