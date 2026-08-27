"""
normalize.py — key normalization, range parsing, and property classification.

Everything here is pure Python (no LLM). It's what lets the matcher treat
"YS MPa", "YS(MPa)", and "ys min" as the same property, and "0.10 max" /
">=250" / "330-410" as numeric constraints to check a test value against.
"""

import re

# Property key variants that mean the same property but plain normalization
# can't catch — usually OCR/vendor-naming confusions (e.g. "EI" for "EL",
# since capital I and L look nearly identical in many table fonts/scans;
# JSW's certs use "EI" while your standards use "EL" for Elongation %).
PROPERTY_ALIAS_GROUPS = [
    {"EL", "EI"},
]

# Keywords that mark a property as mechanical rather than chemical. Mirrors
# the same set already used in app/main.py's /utils/parse-properties and
# frontend/src/utils/propertyUtils.jsx, kept here so the deterministic
# comparator doesn't depend on either of those.
MECH_KEYWORDS = {
    "ys", "uts", "el", "bh", "hardness", "impact",
    "r-bar", "n-value", "mpa", "hv", "hrc", "hrb",
    "ra", "er", "bend",
}


def classify_property(element: str) -> str:
    """"chemical" or "mechanical", based on keyword match against the
    element name — same rule the rest of the app already applies."""
    el = (element or "").lower()
    return "mechanical" if any(k in el for k in MECH_KEYWORDS) else "chemical"


def normalize_prop_key(key: str) -> str:
    """"YS MPa", "YS(MPa)", "ys mpa", "YS min", "YS max" all normalize to "YS"."""
    core = re.sub(r"%|ppm|mpa|\bmin\b|\bmax\b|\(.*?\)", "", key or "", flags=re.IGNORECASE)
    norm = re.sub(r"[^A-Za-z0-9]", "", core).upper()
    for group in PROPERTY_ALIAS_GROUPS:
        if norm in group:
            return sorted(group)[0]
    return norm


def parse_range(rv: str):
    """Parse a standard's constraint string into (lo, hi) floats — either
    bound may be None (open-ended). Returns None if the string doesn't parse
    as a numeric constraint at all."""
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


def describe_constraint(rv: str) -> str:
    """Human-readable description of a standard's rv constraint, for the
    "note" column — mirrors the style the old LLM-authored notes used
    ("max 0.25", "range 330-410", "min 590", "±5% tolerance"). Returns ""
    if rv is empty or doesn't parse as a numeric constraint."""
    if not rv:
        return ""
    s = str(rv).strip().replace(",", ".")
    s = re.sub(r"(?<=[A-Za-z])\.\s*$", "", s)

    m = re.match(r"^<=\s*([\d.]+)$", s) or re.match(r"^([\d.]+)\s*max$", s, re.IGNORECASE)
    if m:
        return f"max {m.group(1)}"

    m = re.match(r"^>=\s*([\d.]+)$", s) or re.match(r"^([\d.]+)\s*min$", s, re.IGNORECASE)
    if m:
        return f"min {m.group(1)}"

    m = re.match(r"^([\d.]+)\s*-\s*([\d.]+)$", s)
    if m:
        return f"range {m.group(1)}-{m.group(2)}"

    m = re.match(r"^([\d.]+)$", s)
    if m:
        return "±5% tolerance"

    return ""


def value_in_range(test_value, rv: str):
    """True/False if the test value's numeric comparison against rv is
    determinable, else None (unparseable test value or rv — left
    undetermined rather than falsely failing something that can't actually
    be read)."""
    try:
        tv = float(str(test_value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None
    rng = parse_range(rv)
    if rng is None:
        return None
    lo, hi = rng
    if lo is not None and tv < lo:
        return False
    if hi is not None and tv > hi:
        return False
    return True


def split_composite_key(std_key: str):
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
