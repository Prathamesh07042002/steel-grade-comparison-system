"""
report.py — PDF report generator
Generates a downloadable PDF comparison report using fpdf2.
"""

from datetime import datetime


# ── Unicode sanitizer ─────────────────────────────────────────────────────────

def _safe(text: str, max_len: int = None) -> str:
    """
    Replace common Unicode characters that Helvetica (Latin-1) cannot render,
    then strip anything still outside Latin-1 so fpdf2 never raises
    FPDFUnicodeEncodingException.
    """
    replacements = {
        "\u2013": "-",    # en-dash  –
        "\u2014": "-",    # em-dash  —
        "\u2018": "'",    # left single quote  '
        "\u2019": "'",    # right single quote '
        "\u201c": '"',    # left double quote  "
        "\u201d": '"',    # right double quote "
        "\u00b0": "deg",  # degree sign  °
        "\u00b1": "+/-",  # plus-minus  ±
        "\u2264": "<=",   # less-than-or-equal  ≤
        "\u2265": ">=",   # greater-than-or-equal  ≥
        "\u00d7": "x",    # multiplication sign  ×
        "\u00f7": "/",    # division sign  ÷
        "\u2022": "-",    # bullet  •
        "\u2026": "...",  # ellipsis  …
    }
    text = str(text)
    for char, sub in replacements.items():
        text = text.replace(char, sub)
    # Drop anything still outside Latin-1
    text = text.encode("latin-1", errors="ignore").decode("latin-1")
    if max_len is not None:
        text = text[:max_len]
    return text


# ── Report generator ──────────────────────────────────────────────────────────

def generate_pdf_report(
    test_filename: str,
    selected_spec: str,
    selected_desig: str,
    chem_result: dict,
    mech_result: dict,
    pipeline: str = "Manual",
) -> bytes:

    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

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

    all_m       = list(chem_result.get("matched", {}).values()) + \
                  list(mech_result.get("matched", {}).values())
    pass_count  = sum(1 for m in all_m if m.get("within_range"))
    fail_count  = sum(1 for m in all_m if not m.get("within_range"))
    total       = len(all_m)

    verdict = (
        "PASS"         if fail_count == 0 and total > 0 else
        "PARTIAL PASS" if pass_count > 0              else
        "FAIL"
    )
    colour = {
        "PASS":         (34,  139,  34),
        "PARTIAL PASS": (210, 140,   0),
        "FAIL":         (180,  40,  40),
    }[verdict]

    pdf.set_fill_color(*colour)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(
        0, 11,
        _safe(f"  OVERALL RESULT:  {verdict}   ({pass_count}/{total} properties within range)"),
        ln=True, fill=True,
    )
    pdf.ln(4)

    def info_row(label, value):
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(240, 240, 240)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(52, 7, _safe(f"  {label}"), fill=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(0, 7, _safe(f"  {value}"), ln=True, fill=True)

    info_row("Test File",        test_filename)
    info_row("Supply Spec",      selected_spec)
    info_row("Designation",      selected_desig)
    info_row("Pipeline",         pipeline)
    info_row("Properties OK",    f"{pass_count} / {total}")
    pdf.ln(6)

    def prop_section(title, props):
        if not props:
            return
        matched     = props.get("matched", {})
        not_in_std  = props.get("not_in_standard", {})
        not_in_test = props.get("not_in_test", {})

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(20, 40, 80)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 9, _safe(f"  {title}"), ln=True, fill=True)
        pdf.ln(1)

        col_w = [58, 40, 52, 18, 26]
        headers = ["Property", "Test Value", "Standard Value", "OK?", "Note"]
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(220, 220, 220)
        pdf.set_text_color(30, 30, 30)
        for hdr, w in zip(headers, col_w):
            pdf.cell(w, 7, f" {hdr}", border="B", fill=True)
        pdf.ln()

        for prop, info in matched.items():
            ok = info.get("within_range", False)
            pdf.set_fill_color(*(240, 255, 240) if ok else (255, 235, 235))
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(col_w[0], 6, _safe(f" {prop}",                          max_len=29), fill=True)
            pdf.cell(col_w[1], 6, _safe(f" {info.get('test_value','')}",     max_len=19), fill=True)
            pdf.cell(col_w[2], 6, _safe(f" {info.get('standard_value','')}",  max_len=23), fill=True)
            pdf.set_text_color(0, 130, 0) if ok else pdf.set_text_color(180, 40, 40)
            pdf.cell(col_w[3], 6, _safe(f" {'YES' if ok else 'NO'}"), fill=True)
            pdf.set_text_color(80, 80, 80)
            pdf.cell(col_w[4], 6, _safe(f" {info.get('note','')}",           max_len=15), fill=True, ln=True)

        if not_in_std:
            pdf.ln(1)
            pdf.set_font("Helvetica", "BI", 8)
            pdf.set_text_color(140, 0, 0)
            pdf.cell(0, 6, "  In test but NOT in standard:", ln=True)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(60, 60, 60)
            for p, v in not_in_std.items():
                pdf.cell(0, 5, _safe(f"    - {p}: {v}"), ln=True)

        if not_in_test:
            pdf.ln(1)
            pdf.set_font("Helvetica", "BI", 8)
            pdf.set_text_color(0, 80, 140)
            pdf.cell(0, 6, "  In standard but NOT in test:", ln=True)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(60, 60, 60)
            for p, v in not_in_test.items():
                pdf.cell(0, 5, _safe(f"    + {p}: {v}"), ln=True)

        pdf.ln(5)

    prop_section("Chemical Properties",   chem_result)
    prop_section("Mechanical Properties", mech_result)

    return bytes(pdf.output())