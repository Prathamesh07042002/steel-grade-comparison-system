"""
naming.py — deterministic grade-name matching between a test certificate and
a standard, so picking (or ranking) the right standard never depends on an
LLM's self-reported judgment.
"""

import os
import re

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


def normalize_name(s: str) -> str:
    """Strip everything but letters/digits and uppercase, so "IS 2062 E350-A",
    "is2062e350a", and "IS-2062_E350.A" all compare equal."""
    return re.sub(r"[^A-Za-z0-9]", "", s or "").upper()


def _names_are_aliases(a_norm: str, b_norm: str) -> bool:
    """True if a_norm and b_norm are both in the same known alias group."""
    return any(a_norm in group and b_norm in group for group in GRADE_ALIAS_GROUPS)


def extract_grade_from_filename(pdf_filename: str) -> str:
    """Pull the grade token straight out of the uploaded PDF's filename.

    Filenames follow "<thickness>MM_<GRADE>_<vendor...>_<batch>_<date>",
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


def extract_test_names(test_data: dict, pdf_filename: str = "") -> list:
    """Candidate name strings for the test side of the match, most reliable
    first. The filename-derived grade goes first — it's typed by a human and
    never passes through OCR or an LLM, so it's the least guess-prone signal
    we have. OCR-extracted grade/supply_spec/drawing_designation are kept as
    fallbacks for filenames that don't follow the naming convention."""
    names = []
    filename_grade = extract_grade_from_filename(pdf_filename)
    if filename_grade:
        names.append(filename_grade)
    for key in ("grade", "supply_spec", "drawing_designation"):
        v = test_data.get(key)
        if v:
            names.append(str(v))
    return names


def extract_standard_name(entry: dict) -> str:
    """Candidate name string for one loaded standard entry (see the
    all_standards list built in auto_compare). Tries common explicit fields
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


def names_match(test_data: dict, std_name: str, pdf_filename: str = "") -> bool:
    """True if any test-side name string and the standard's name are equal,
    contain each other, or are known aliases of the same grade (see
    GRADE_ALIAS_GROUPS), after normalization. Containment (not just
    equality) matters here — e.g. test grade "E-46(Thin)" vs standard name
    "E46" should still count as the same grade family."""
    std_norm = normalize_name(std_name)
    if not std_norm:
        return False
    for test_name in extract_test_names(test_data, pdf_filename):
        test_norm = normalize_name(test_name)
        if not test_norm:
            continue
        if test_norm == std_norm or test_norm in std_norm or std_norm in test_norm:
            return True
        if _names_are_aliases(test_norm, std_norm):
            return True
    return False
