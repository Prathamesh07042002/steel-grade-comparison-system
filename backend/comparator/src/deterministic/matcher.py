"""
matcher.py — the primary (no-LLM) property matching and scoring engine.

compare_block() replaces what used to be an LLM's fuzzy key-matching +
range-checking pass: given a flat dict of test values and a standard's
parameter list, it deterministically classifies every standard property as
matched / not_in_test, and every extra test property as not_in_standard.
"""

from .normalize import normalize_prop_key, value_in_range, split_composite_key, describe_constraint

# A name-matched standard needs at least this raw coverage score to get
# priority over a higher-scoring standard that didn't name-match. Below
# this floor, name_match is NOT used to rescue a candidate — see
# select_best() for the two worked examples this rule is built from.
NAME_MATCH_FLOOR = 0.60


def compare_block(test_flat: dict, std_params: list) -> dict:
    """
    Compare one property block (chemical or mechanical).

    test_flat:  {"C%": "0.035", "Mn%": "0.202", ...} — extracted test values
    std_params: [{"element": "C%", "rv": "0.15 max."}, ...] — one standard's
                parameter rows for this block

    Returns {"matched": {...}, "not_in_standard": {...}, "not_in_test": {...}}
    """
    std_by_norm = {}
    for p in std_params:
        norm = normalize_prop_key(p.get("element", ""))
        if norm and norm not in std_by_norm:
            std_by_norm[norm] = (p.get("element", ""), p.get("rv", ""))

    test_by_norm = {}
    for k, v in (test_flat or {}).items():
        norm = normalize_prop_key(k)
        if norm and norm not in test_by_norm:
            test_by_norm[norm] = (k, v)

    matched, not_in_test = {}, {}
    consumed_norms = set()

    for norm, (std_key, std_val) in std_by_norm.items():
        if norm in test_by_norm:
            test_key, test_val = test_by_norm[norm]
            matched[std_key] = {
                "test_value": test_val,
                "standard_value": std_val,
                "within_range": value_in_range(test_val, std_val),
                "note": describe_constraint(std_val),
            }
            consumed_norms.add(norm)
            continue

        parts = split_composite_key(std_key)
        if parts:
            total = 0.0
            contributing = []
            all_found = True
            part_norms = []
            for part in parts:
                part_norm = normalize_prop_key(part)
                part_norms.append(part_norm)
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
                    "within_range": value_in_range(total, std_val),
                    "note": describe_constraint(std_val),
                }
                consumed_norms.update(part_norms)
                continue

        not_in_test[std_key] = std_val

    not_in_standard = {
        test_key: test_val
        for norm, (test_key, test_val) in test_by_norm.items()
        if norm not in consumed_norms and norm not in std_by_norm
    }

    return {"matched": matched, "not_in_standard": not_in_standard, "not_in_test": not_in_test}


# ── Scoring ────────────────────────────────────────────────────────────────

def _recount_from_data(props: dict) -> tuple:
    """
    standard_total = matched entries (any within_range) + not_in_test entries
                     not_in_standard is EXCLUDED — extra test properties never
                     reduce the score.

    matched_count  = matched entries where within_range is True
                     within_range = null (unparseable) is excluded from BOTH
                     numerator and denominator so it neither helps nor hurts.
    """
    matched_props = props.get("matched", {})

    matched_count = sum(
        1 for v in matched_props.values()
        if isinstance(v, dict) and v.get("within_range") is True
    )

    valid_matched = sum(
        1 for v in matched_props.values()
        if isinstance(v, dict) and v.get("within_range") is not None
    )

    std_total = valid_matched + len(props.get("not_in_test", {}))
    return matched_count, std_total


def compute_coverage(result: dict) -> dict:
    """
    Stamp overall_score/verdict onto result from its chemical_properties /
    mechanical_properties blocks. Mutates and returns result.

    Score formula:
        standard_total = valid_matched_count + not_in_test_count
        overall_score  = matched_count / standard_total

    Verdict thresholds:
        1.00        → MATCHED
        0.50–0.99   → PARTIAL
        < 0.50      → NO_MATCH
    """
    chem_m, chem_t = _recount_from_data(result.get("chemical_properties", {}))
    mech_m, mech_t = _recount_from_data(result.get("mechanical_properties", {}))

    total_matched = chem_m + mech_m
    total_standard = chem_t + mech_t

    score = round(total_matched / total_standard, 4) if total_standard > 0 else 0.0

    if score >= 1.0:
        verdict = "MATCHED"
    elif score >= 0.5:
        verdict = "PARTIAL"
    else:
        verdict = "NO_MATCH"

    result["matched_count"] = total_matched
    result["standard_total"] = total_standard
    result["overall_score"] = score
    result["verdict"] = verdict
    result["verdict_reason"] = f"{total_matched} of {total_standard} standard properties satisfied"
    return result


def select_best(results: list) -> list:
    """
    Reorder results so index 0 is the actual winner under this rule:

    A name-matched candidate takes priority over a higher-scoring
    non-name-matched candidate — but ONLY if the name-matched candidate's
    own score still clears NAME_MATCH_FLOOR (0.60). A name match never
    rescues a candidate whose underlying data doesn't reasonably back it up.

    Worked examples this rule is built from:

    Example 1 (name match with bad data — must NOT be rescued):
        Standard A: name matches, but only 3/10 properties match → 30%
        Standard B: name does NOT match, 9/10 properties match   → 90%
        A's score (30%) is below NAME_MATCH_FLOOR → A gets NO priority.
        Winner: B (90%, wins on score alone, same as a plain sort would give).

    Example 2:
        Standard A: name matches, 91% of properties match
        Standard B: name does NOT match, 95% of properties match (maybe
                    OCR noise inflated it)
        A's score (91%) clears NAME_MATCH_FLOOR → A gets priority over B,
        even though B's raw score is technically higher.
        Winner: A — this is the case a plain (score, name_match) sort key
        gets wrong, because it only uses name_match to break EXACT ties.

    If no candidate is both name-matched and above the floor, falls back to
    plain highest-score-wins.
    """
    scored = sorted(results, key=lambda x: float(x.get("overall_score", 0)), reverse=True)

    qualified_name_matches = [
        r for r in scored
        if r.get("name_match") and float(r.get("overall_score", 0)) >= NAME_MATCH_FLOOR
    ]

    winner = qualified_name_matches[0] if qualified_name_matches else scored[0]
    rest = [r for r in scored if r is not winner]
    return [winner] + rest
