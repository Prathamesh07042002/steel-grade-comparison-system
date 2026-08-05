"""
report.py — PDF report generator
Generates a downloadable PDF comparison report using fpdf2.

The PDF mirrors what the web UI (Streamlit + React) shows on screen:
  • Matched properties, properties present only in the test PDF, AND
    properties required by the standard but missing from the test PDF
    are all included (no section is silently dropped).
  • For Pipeline 2 (Auto Match) the LLM's own verdict / match score /
    product / reasoning fields are threaded through so the PDF's headline
    result matches the on-screen verdict instead of being recomputed.
  • Property/value/note text is no longer truncated — it wraps inside the
    table instead of being cut off.
  • Section (T x W) values from the test certificate are shown in the info
    block, right after Designation.
"""

from datetime import datetime

from fpdf import FPDF
from fpdf.fonts import FontFace


# ── Unicode sanitizer ─────────────────────────────────────────────────────────

def _safe(text) -> str:
    replacements = {
        "–": "-", "—": "-",
        "‘": "'", "’": "'",
        "“": '"', "”": '"',
        "°": "deg", "±": "+/-",
        "≤": "<=", "≥": ">=",
        "×": "x", "÷": "/",
        "•": "-", "…": "...",
    }
    text = str(text)
    for char, sub in replacements.items():
        text = text.replace(char, sub)
    return text.encode("latin-1", errors="ignore").decode("latin-1")


# ── Verdict → colour ───────────────────────────────────────────────────────────

_VERDICT_COLOURS = {
    "PASS":         (34,  139,  34),
    "MATCHED":      (34,  139,  34),
    "PARTIAL PASS": (210, 140,   0),
    "PARTIAL":      (210, 140,   0),
    "FAIL":         (180,  40,  40),
    "NO_MATCH":     (180,  40,  40),
}


# ── Row builder ────────────────────────────────────────────────────────────────

def _all_rows(result: dict) -> list:
    """
    Build one row per property, tagged with a `kind`:
      • "matched" — present in both test and standard (scored)
      • "extra"   — present in test only, standard has no requirement (not scored)
      • "missing" — required by standard but absent from the test (not scored)

    within_range truthiness mirrors the on-screen UI exactly: a null/None
    value (OCR-suspect) is treated as a fail, same as the Streamlit/React
    front-ends already do — this keeps the PDF consistent with what's shown
    on screen rather than introducing different scoring logic.
    """
    rows = []
    for prop, info in (result.get("matched") or {}).items():
        rows.append({
            "prop":       prop,
            "test_value": info.get("test_value", ""),
            "std_value":  info.get("standard_value", ""),
            "ok":         bool(info.get("within_range")),
            "note":       info.get("note", ""),
            "kind":       "matched",
        })
    for prop, val in (result.get("not_in_standard") or {}).items():
        rows.append({
            "prop":       prop,
            "test_value": val,
            "std_value":  "-",
            "ok":         None,
            "note":       "not in standard",
            "kind":       "extra",
        })
    for prop, val in (result.get("not_in_test") or {}).items():
        rows.append({
            "prop":       prop,
            "test_value": "-",
            "std_value":  val,
            "ok":         None,
            "note":       "not in test",
            "kind":       "missing",
        })
    return rows


_ROW_STYLE = {
    "matched_pass": ((240, 255, 240), (0, 130, 0),   "YES"),
    "matched_fail": ((255, 235, 235), (180, 40, 40), "NO"),
    "extra":        ((255, 245, 220), (30, 30, 30),  "-"),
    "missing":      ((225, 238, 255), (30, 30, 30),  "-"),
}


def _row_style(row: dict):
    if row["kind"] == "matched":
        return _ROW_STYLE["matched_pass" if row["ok"] else "matched_fail"]
    return _ROW_STYLE[row["kind"]]


# ── Report generator ──────────────────────────────────────────────────────────

def generate_pdf_report(
    test_filename: str,
    selected_spec: str,
    selected_desig: str,
    chem_result: dict,
    mech_result: dict,
    pipeline: str = "Manual",
    test_product: str = None,
    verdict: str = None,
    overall_score: float = None,
    verdict_reason: str = None,
    name_match: bool = None,
    name_match_reason: str = None,
    top_matches: list = None,
    section_txw: list = None,
) -> bytes:
    """
    test_product / verdict / overall_score / verdict_reason / name_match /
    name_match_reason / top_matches are only relevant to Pipeline 2
    (Auto Match) — pass the LLM's best-match fields through so the PDF's
    headline verdict and context match what's on screen. Leave them as
    None for Pipeline 1 (Manual) to keep the original PASS/PARTIAL/FAIL
    behaviour driven purely by the property counts.
    """

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # ── Title ──────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_fill_color(20, 40, 80)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 14, "Steel Grade Comparison Report", ln=True, fill=True, align="C")
    pdf.ln(1)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(
        0, 6,
        _safe(
            f"Generated: {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}    |    "
            f"Pipeline: {pipeline}    |    Test: {test_filename}    |    "
            f"Standard: {selected_spec} / {selected_desig}"
        ),
        ln=True, align="C",
    )
    pdf.ln(5)

    # ── Rows & counts (matched properties only — same rule the UI uses) ───────
    chem_rows = _all_rows(chem_result)
    mech_rows = _all_rows(mech_result)

    scored_rows = [r for r in chem_rows + mech_rows if r["kind"] == "matched"]
    pass_count  = sum(1 for r in scored_rows if r["ok"])
    fail_count  = sum(1 for r in scored_rows if not r["ok"])
    total       = len(scored_rows)

    if verdict:
        banner_verdict = verdict
    elif fail_count == 0 and total > 0:
        banner_verdict = "PASS"
    elif pass_count == 0:
        banner_verdict = "FAIL"
    else:
        banner_verdict = "PARTIAL PASS"

    colour = _VERDICT_COLOURS.get(banner_verdict, (100, 100, 100))

    banner_text = f"  OVERALL RESULT:  {banner_verdict}   ({pass_count}/{total} properties within range)"
    if overall_score is not None:
        banner_text += f"   |   Match Score: {overall_score:.0%}"

    pdf.set_fill_color(*colour)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 11, _safe(banner_text), ln=True, fill=True)
    pdf.ln(4)

    # ── Info rows ──────────────────────────────────────────────────────────────
    def info_row(label, value):
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(240, 240, 240)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(52, 7, _safe(f"  {label}"), fill=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(0, 7, _safe(f"  {value}"), ln=True, fill=True)

    info_row("Test File",     test_filename)
    info_row("Supply Spec",   selected_spec)
    info_row("Designation",   selected_desig)

    if section_txw:
        txw_str = "  |  ".join(dict.fromkeys(str(v) for v in section_txw))
        info_row("Section (TxW)", txw_str)

    info_row("Pipeline",      pipeline)
    info_row("Properties OK", f"{pass_count} / {total}")

    if test_product:
        info_row("Test Product", test_product)
    if name_match is not None:
        info_row("Name Match", f"{'Yes' if name_match else 'No'}" + (f" — {name_match_reason}" if name_match_reason else ""))
    if verdict_reason:
        info_row("Verdict Reason", verdict_reason)

    pdf.ln(6)

    # ── Property table ─────────────────────────────────────────────────────────
    def prop_section(title, rows):
        if not rows:
            return

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(20, 40, 80)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 9, _safe(f"  {title}"), ln=True, fill=True)
        pdf.ln(1)

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(30, 30, 30)

        with pdf.table(
            col_widths=(27, 19, 24, 9, 21),
            text_align=("LEFT", "LEFT", "LEFT", "CENTER", "LEFT"),
            headings_style=FontFace(emphasis="B", color=(30, 30, 30), fill_color=(220, 220, 220)),
            borders_layout="NONE",
            padding=1.4,
            line_height=4.5,
        ) as table:
            header = table.row()
            for hdr in ("Property", "Test Value", "Standard Value", "OK?", "Note"):
                header.cell(hdr)

            for r in rows:
                bg, ok_colour, ok_label = _row_style(r)
                row = table.row(style=FontFace(fill_color=bg))
                row.cell(_safe(r["prop"]))
                row.cell(_safe(r["test_value"]))
                row.cell(_safe(r["std_value"]))
                row.cell(ok_label, style=FontFace(fill_color=bg, color=ok_colour, emphasis="B"))
                row.cell(_safe(r["note"]), style=FontFace(fill_color=bg, color=(80, 80, 80)))

        pdf.ln(5)

    prop_section("Chemical Properties",   chem_rows)
    prop_section("Mechanical Properties", mech_rows)

    # ── Top matches (Pipeline 2 only) ───────────────────────────────────────────
    if top_matches:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(20, 40, 80)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 9, "  Top Matching Standards", ln=True, fill=True)
        pdf.ln(1)

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(30, 30, 30)

        with pdf.table(
            col_widths=(6, 30, 24, 10, 30),
            text_align=("CENTER", "LEFT", "LEFT", "CENTER", "LEFT"),
            headings_style=FontFace(emphasis="B", color=(30, 30, 30), fill_color=(220, 220, 220)),
            borders_layout="NONE",
            padding=1.4,
            line_height=4.5,
        ) as table:
            header = table.row()
            for hdr in ("#", "Standard Product", "File", "Score", "Verdict"):
                header.cell(hdr)

            for idx, m in enumerate(top_matches, 1):
                bg = (240, 255, 240) if idx == 1 else (255, 255, 255)
                row = table.row(style=FontFace(fill_color=bg))
                row.cell(str(idx))
                row.cell(_safe(m.get("standard_product", "")))
                row.cell(_safe(m.get("standard_file", "")))
                row.cell(f"{float(m.get('overall_score', 0)):.0%}")
                row.cell(_safe(m.get("verdict", "")))

        pdf.ln(5)

    # ── Legend ─────────────────────────────────────────────────────────────────
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 6, "  Legend:", ln=True)
    pdf.set_font("Helvetica", "", 8)

    legend_items = [
        ((240, 255, 240), "Within standard range  (PASS)"),
        ((255, 235, 235), "Outside standard range  (FAIL)"),
        ((255, 245, 220), "Present in test only - no standard requirement  (-)"),
        ((225, 238, 255), "Required by standard - not found in test  (-)"),
    ]
    for bg, label in legend_items:
        pdf.set_fill_color(*bg)
        pdf.cell(8, 5, "", fill=True)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(0, 5, _safe(f"  {label}"), ln=True)

    return bytes(pdf.output())
