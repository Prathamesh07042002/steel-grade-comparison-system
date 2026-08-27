"""
comparator.py — Property comparison engine (deterministic, no LLM)

Two modes:
  1. direct_compare()  — Pipeline 1: user already picked the standard grade;
                          compares test properties against that one standard.
  2. auto_compare()    — Pipeline 2: ranks the test certificate against every
                          standard in standards_json_dir, picks the best match.

All matching/scoring logic lives in deterministic/ (normalize.py, naming.py,
matcher.py) — this module just loads standards and orchestrates calls into it.
"""

import os
import json

from .deterministic.matcher import compare_block, compute_coverage, select_best
from .deterministic.naming import (
    extract_grade_from_filename,
    extract_standard_name,
    extract_test_names,
    names_match,
)
from .deterministic.normalize import classify_property


# ── Pipeline 1: direct comparison against a user-selected standard ──────────

def direct_compare(test_props: dict, std_props: dict) -> dict:
    """
    Compare a flat test property dict against a flat standard property dict.

    test_props: {"C%": "0.035", ...}            — extracted test values
    std_props:  {"C%": "0.15 max.", ...}         — the standard's constraints
                (as sent by ManualCompare.jsx via parseProperties())

    Returns:
    {
      "matched":         {prop: {test_value, standard_value, within_range, note}},
      "not_in_standard": {prop: value},   # in test but not in standard
      "not_in_test":     {prop: value},   # in standard but not in test
    }
    """
    std_params = [{"element": k, "rv": v} for k, v in (std_props or {}).items()]
    return compare_block(test_props or {}, std_params)


# ── Helper: pull the [{"element":..., "rv":...}, ...] list out of a loaded
# standard product dict, whatever shape it's in ────────────────────────────

def _get_std_parameters(product: dict) -> list:
    """Handles both a direct {"parameters": [...]} and
    extract_standards_json's actual output shape,
    {"<grade_name>": {"parameters": [...]}} (grade name as the only key)."""
    if not isinstance(product, dict):
        return []
    if isinstance(product.get("parameters"), list):
        return product["parameters"]
    for v in product.values():
        if isinstance(v, dict) and isinstance(v.get("parameters"), list):
            return v["parameters"]
    return []


# ── Pipeline 2: rank against every standard, no LLM ─────────────────────────

def auto_compare(test_data: dict, standards_json_dir: str, pdf_filename: str = "") -> dict:
    """
    Compare ONE test product against all standards, ranked by COVERAGE SCORE.

    Coverage rule:
        Score is based ONLY on properties the standard defines.
        Extra properties in the test report are IGNORED — they never reduce score.

        Standard defines 7 props, test has 20 props:
        If all 7 standard props pass → score = 7/7 = 1.0 → MATCHED

    Args:
        test_data:           Extracted test dict from extractor.extract_test_json()
        standards_json_dir:  Folder containing standard *.json files
        pdf_filename:        Original uploaded filename, e.g.
                              "3MM_FE-410_TATA_STEEL_51132_300326.pdf". Used as
                              the PRIMARY name-match signal — the grade token in
                              the filename never passes through OCR, so it's
                              more reliable than the OCR-extracted grade. Falls
                              back to test_data's grade/supply_spec/
                              drawing_designation if the filename doesn't follow
                              the naming convention or isn't passed.

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

    # ── 1. Load all standard JSONs ────────────────────────────────────────
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

    std_name_by_file = {entry["file"]: extract_standard_name(entry) for entry in all_standards}

    # ── 2. Score each standard deterministically ────────────────────────────
    test_chem = test_data.get("chemical_properties", {}) or {}
    test_mech = test_data.get("mechanical_properties", {}) or {}
    test_product_name = (
        test_data.get("grade") or test_data.get("supply_spec")
        or test_data.get("drawing_designation") or ""
    )

    results = []
    for entry in all_standards:
        std_params = _get_std_parameters(entry["product"])
        chem_params = [p for p in std_params if classify_property(p.get("element", "")) == "chemical"]
        mech_params = [p for p in std_params if classify_property(p.get("element", "")) == "mechanical"]

        r = {
            "test_product": test_product_name,
            "standard_file": entry["file"],
            "standard_product": std_name_by_file.get(entry["file"], ""),
            "chemical_properties": compare_block(test_chem, chem_params),
            "mechanical_properties": compare_block(test_mech, mech_params),
        }
        compute_coverage(r)
        results.append(r)

    # ── 3. Deterministic name-match stamping ─────────────────────────────────
    filename_grade = extract_grade_from_filename(pdf_filename)
    for r in results:
        std_name = std_name_by_file.get(r["standard_file"], r.get("standard_product", ""))
        r["name_match"] = names_match(test_data, std_name, pdf_filename)
        r["name_match_reason"] = (
            f"deterministic: filename grade '{filename_grade}'" if filename_grade
            else f"deterministic: extracted test name(s) {extract_test_names(test_data, pdf_filename)}"
        ) + f" vs standard name '{std_name}'"

    # ── 4. Select the best match ──────────────────────────────────────────
    results = select_best(results)
    best = results[0]
    best_score = float(best.get("overall_score", 0))

    print(
        f"  ✅ Best match: {best.get('standard_product')} "
        f"({best.get('matched_count')}/{best.get('standard_total')} = "
        f"{best_score:.1%}) → {best.get('verdict')}"
    )

    # ── 5. Return ───────────────────────────────────────────────────────────
    if best.get("verdict") == "NO_MATCH" or best_score < 0.30:
        return {
            "status": "NO_MATCH",
            "message": "No sufficiently similar standard found.",
            "closest_attempt": {
                "standard_file": best.get("standard_file", ""),
                "standard_product": best.get("standard_product", ""),
                "overall_score": best_score,
                "matched_count": best.get("matched_count", 0),
                "standard_total": best.get("standard_total", 0),
                "verdict_reason": best.get("verdict_reason", ""),
            },
        }

    return {
        "status": best.get("verdict", "MATCHED"),
        "best_match": best,
        "top_matches": results[:5],
    }
