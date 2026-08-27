"""
extractor.py — structured data extraction for steel spec/test PDFs.
Uses ocr.py's extract_document_annotation: rotation-corrected image ->
single Mistral call -> schema-validated structured JSON.

Public function names/return shapes match the original extractor.py so
downstream code doesn't need to change — only the input changed
(pdf_path instead of pre-OCR'd text, since OCR now happens inside the
same call).
"""

from typing import List

import json
import re

from pydantic import BaseModel, Field

from .ocr import extract_document_annotation, call_annotation_api, get_page_table_html

# ── Shared building blocks ───────────────────────────────────────────────────

class Parameter(BaseModel):
    element: str = Field(
        ...,
        description=(
            "The exact parameter/element name as printed in the table, e.g. 'C%', 'Mn%', 'Si%', "
            "'P%', 'S%', 'Al%', 'Nb%', 'V%', 'Ti%', 'CE', 'N ppm', 'YS MPa', 'UTS MPa', 'EL %', 'BH'. "
            "Copy exactly as printed, do not rename or normalize."
        ),
    )
    rv: str = Field(
        ...,
        description=(
            "The single R/V (requirement value) exactly as printed, digit for digit — "
            "e.g. '0.10 max', '330-490', '27 min'. Do NOT round, reformat, or shift decimals."
        ),
    )


class PropertyValue(BaseModel):
    name: str = Field(
        ...,
        description=(
            "The exact property/element name as printed, e.g. 'C%', 'Mn%', 'YS MPa'. "
            "Copy exactly as shown, do not rename or normalize."
        ),
    )
    value: str = Field(
        ...,
        description=(
            "The actual MEASURED test value exactly as printed — a measured result, not a "
            "specification limit. Copy verbatim, digit for digit — do not round or shift decimals."
        ),
    )


# ── Pipeline 1: Standard spec sheet extractor ────────────────────────────────

class StandardsSheet(BaseModel):
    parameters: List[Parameter] = Field(
        ..., description="Every chemical/mechanical parameter row in the table(s). Do not skip any row."
    )


def extract_standards_json(pdf_path: str, grade_name: str = "UNKNOWN") -> dict:
    """
    Extract chemical + mechanical parameters from a standards spec PDF.

    Returns:
    {
      "<grade_name>": {
        "parameters": [
          {"element": "C%",     "rv": "0.10 max"},
          {"element": "YS MPa", "rv": "330-410"},
          ...
        ]
      }
    }
    """
    prompt = f"""This document is a STANDARDS specification sheet for steel grade "{grade_name}".
Extract every element/parameter row from the table(s): chemical (C%, Mn%, Si%, P%, S%, Al%, Nb%, V%,
Ti%, CE, N ppm, ...) and mechanical (YS MPa, UTS MPa, EL %, BH, ...).

STRICT RULES:
- Extract EVERY row — do not skip any, do not summarize or merge rows.
- "rv" must be copied exactly as printed — no rounding, no reformatting, no decimal shifting."""

    print(f"  🤖 Extracting standards parameters for grade: {grade_name}…")
    result = extract_document_annotation(pdf_path, StandardsSheet, document_annotation_prompt=prompt)

    return {grade_name: {"parameters": [p.model_dump() for p in result.parameters]}}


# ── Pipeline 2: Test / mill-certificate extractor ────────────────────────────

class TestCertificate(BaseModel):
    grade: str = Field(default="", description="Grade / product name")
    supply_spec: str = Field(default="", description="Supply spec, e.g. TS4012, IS2062")
    drawing_designation: str = Field(default="", description="Drawing designation, e.g. CR3")
    steel_grade_form: str = Field(default="", description="e.g. Cold Rolled, Hot Rolled, Galvanised")
    section_txw: List[str] = Field(
        default_factory=list,
        description=(
            "Every thickness x width (Section/TxW) value found, normalized to 'TxW' form e.g. "
            "'0.960x1250.000mm'. May be labeled 'Section(TxW)', 'Size', 'Dimension', or shown inside "
            "a 'Batch No. (Size)' / similar column as a parenthesized expression like "
            "'(0.800 * 1250 *)' — that means thickness=0.800, width=1250 (the trailing '*' is an "
            "empty/continuous length field for coils, ignore it). Convert such expressions to "
            "'0.800x1250.000mm' form. Empty list if truly no dimension value is present anywhere."
        ),
    )
    chemical_properties: List[PropertyValue] = Field(
        default_factory=list, description="Actual measured chemical test values (C%, Mn%, Si%, P%, S%, Al%, ...)"
    )
    mechanical_properties: List[PropertyValue] = Field(
        default_factory=list, description="Actual measured mechanical test values (YS MPa, UTS MPa, EL %, BH, ...)"
    )


def _extract_txw_from_html(html: str) -> list:
    """Pull TxW values out of raw OCR table HTML — known formats."""
    results = []

    # Format A: "Section(TxW): 0.960x1250.000mm"
    pattern_a = r'Section\s*\(\s*TxW\s*\)\s*:\s*([0-9.]+\s*[xX]\s*[0-9.]+(?:\.\d+)?\s*mm)'
    for m in re.finditer(pattern_a, html, flags=re.IGNORECASE):
        val = re.sub(r'\s+', '', m.group(1)).strip()
        if val and val not in results:
            results.append(val)

    # Format B: "( 0.800 * 1250 * )" — thickness * width * (length, blank for coils)
    pattern_b = r'\(\s*([0-9.]+)\s*\*\s*([0-9.]+)\s*\*[^)]*\)'
    for m in re.finditer(pattern_b, html):
        thickness, width = m.group(1), m.group(2)
        val = f"{thickness}x{width}.000mm"
        if val not in results:
            results.append(val)

    # Format C: "<td>3.00 x 1250 x C</td>" — thickness x width x C (C = continuous, coils)
    pattern_c = r'<td>\s*([0-9]+(?:\.[0-9]+)?)\s*x\s*([0-9]+(?:\.[0-9]+)?)\s*x\s*[A-Za-z]+\s*</td>'
    for m in re.finditer(pattern_c, html, flags=re.IGNORECASE):
        thickness, width = m.group(1), m.group(2)
        val = f"{thickness}x{width}mm"
        if val not in results:
            results.append(val)

    return results


def extract_test_json(pdf_path: str, pdf_name: str = "") -> dict:
    """
    Extract ACTUAL measured values from a mill certificate / test report PDF.

    Keys are extracted verbatim as printed (freeform) — an earlier version of
    this prompt tried steering the model toward standards_json's canonical
    element vocabulary, but that measurably corrupted column alignment on
    real certificates (values got assigned to the wrong element on multi-row
    HTML tables). The deterministic comparator's key normalization
    (deterministic/normalize.py) already bridges naming differences like
    "Al" vs "Al%" without needing extraction to know the standard's exact
    key strings, so there's no accuracy trade-off in keeping this freeform.

    Returns:
    {
      "grade":                 "CR3",
      "supply_spec":           "TS4012",
      "drawing_designation":   "CR3",
      "steel_grade_form":      "Cold Rolled",
      "section_txw":           ["0.960x1250.000mm"],
      "chemical_properties":   {"C%": "0.0350", "Mn%": "0.202", ...},
      "mechanical_properties": {"YS MPa": "194", "UTS MPa": "301", "EL %": "38"}
    }
    """
    prompt = f"""This document is a TEST / MILL CERTIFICATE PDF: "{pdf_name}"

Mill certificates commonly show TWO different sets of numbers per element: (a) the specification/
limit rows (labeled "Min"/"Max"/"Specification Requirements"), and (b) the ACTUAL MEASURED result
(rows labeled "Test Results", tied to a specific batch/coil/heat). Extract ONLY set (b) — ignore the
Min/Max/specification rows entirely, even though they list the same element/column names.

Extract: grade, supply spec, drawing designation, steel grade form, every thickness x width
(Section/TxW) value found (as a list), and the actual TEST RESULT chemical and mechanical property
values.

CRITICAL — Section(TxW) / size may not be literally labeled that way:
- It is sometimes shown inside a "Batch No. (Size)" or similarly named column as a parenthesized
  expression such as "( 0.800 * 1250 * )" — read this as thickness * width * (length, blank for
  coils). Normalize it to "0.800x1250.000mm" form.
- Look for it under any of these labels: "Section(TxW)", "Size", "Dimension", "T x W". Only leave the
  list empty if no such value appears anywhere in the document.

CRITICAL — table reading:
- Tables may use HTML with colspan/rowspan for merged header cells (e.g. a wide header spanning
  several columns, with "Min"/"Max"/"Test Results" sub-rows beneath). Use that structure to determine
  which header each value truly belongs to — do not assume simple 1-to-1 row/column position.
- If the same value appears repeated identically across many rows, that's a red flag the table was
  misread — re-check and find the row that genuinely corresponds to the correct heat/coil.

CRITICAL — number formatting:
- Copy each value EXACTLY as printed, digit for digit, including leading/trailing zeros and exact
  decimal position. Do not round. Do not shift the decimal point. Do not drop trailing zeros.
- If a field is not present in the document, leave it as an empty string rather than guessing."""

    print(f"  🤖 Extracting test values from: {pdf_name}…")
    response = call_annotation_api(pdf_path, TestCertificate, document_annotation_prompt=prompt)

    annotation = response.document_annotation
    if isinstance(annotation, str):
        annotation = json.loads(annotation)
    result = TestCertificate.model_validate(annotation)

    section_txw = result.section_txw
    if not section_txw:
        # The schema-based pass sometimes drops label:value pairs that sit inside a
        # merged multi-line table cell (e.g. "Section(TxW): 3.000x1250.000mm" packed
        # alongside "Grade:"/"TDC No:" in one <td>) even though the OCR'd table HTML
        # from this SAME call has it verbatim — regex-rescue from that, no 2nd API call.
        try:
            section_txw = _extract_txw_from_html(get_page_table_html(response))
        except Exception:
            pass

    return {
        "grade": result.grade,
        "supply_spec": result.supply_spec,
        "drawing_designation": result.drawing_designation,
        "steel_grade_form": result.steel_grade_form,
        "section_txw": section_txw,
        "chemical_properties": {p.name: p.value for p in result.chemical_properties},
        "mechanical_properties": {p.name: p.value for p in result.mechanical_properties},
    }


# ── Generic extractor (used by legacy Streamlit tab 1) ───────────────────────

class ProductEntry(BaseModel):
    supply_spec: str = Field(default="", description="e.g. TS4012A7")
    drawing_designation: str = Field(default="", description="e.g. CR3, HR4")
    steel_grade_form: str = Field(default="", description="e.g. Cold Rolled, Hot Rolled")
    mechanical_properties: List[PropertyValue] = Field(default_factory=list)
    chemical_properties: List[PropertyValue] = Field(default_factory=list)


class ProductEntries(BaseModel):
    entries: List[ProductEntry] = Field(default_factory=list, description="All steel grade entries in the document")


def extract_json(pdf_path: str, pdf_name: str = "") -> list:
    """
    Legacy extractor: returns a list of product entries from a standards PDF.
    Used by the Standards Library tab.
    """
    prompt = f"""This document is: "{pdf_name}". Extract ALL steel grade entries: supply_spec,
drawing_designation, steel_grade_form, mechanical_properties, chemical_properties for each entry.
If multiple entries exist, extract all of them, not just the first. Copy values exactly as printed."""

    result = extract_document_annotation(pdf_path, ProductEntries, document_annotation_prompt=prompt)

    return [
        {
            "supply_spec": e.supply_spec,
            "drawing_designation": e.drawing_designation,
            "steel_grade_form": e.steel_grade_form,
            "mechanical_properties": {p.name: p.value for p in e.mechanical_properties},
            "chemical_properties": {p.name: p.value for p in e.chemical_properties},
        }
        for e in result.entries
    ]