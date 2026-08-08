"""
report.py — PDF report generator
Generates a downloadable PDF comparison report using fpdf2.

Changes in this version:
  • Properties in test but NOT in standard → OK? shows "N/A" (neutral, not a fail).
  • The "In standard but NOT in test" footnote section is removed entirely.
"""

from datetime import datetime


# ── Unicode sanitizer ─────────────────────────────────────────────────────────

def _safe(text: str, max_len: int = None) -> str:
    replacements = {
        "\u2013": "-", "\u2014": "-",
        "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"',
        "\u00b0": "deg", "\u00b1": "+/-",
        "\u2264": "<=", "\u2265": ">=",
        "\u00d7": "x", "\u00f7": "/",
        "\u2022": "-", "\u2026": "...",
    }
    text = str(text)
    for char, sub in replacements.items():
        text = text.replace(char, sub)
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
    section_txw: list = None,
) -> bytes:

    from fpdf import FPDF

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

    # ── Overall verdict ────────────────────────────────────────────────────────
    # Only "matched" rows that failed count toward fail_count.
    # "not_in_standard" rows are excluded from pass/fail scoring.
    def _all_rows(result):
        rows = []
        for prop, info in result.get("matched", {}).items():
            rows.append({
                "prop":        prop,
                "test_value":  info.get("test_value", ""),
                "std_value":   info.get("standard_value", ""),
                "ok":          info.get("within_range", False),
                "note":        info.get("note", ""),
                "in_standard": True,
            })
        for prop, val in result.get("not_in_standard", {}).items():
            rows.append({
                "prop":        prop,
                "test_value":  val,
                "std_value":   "-",
                "ok":          None,   # None = N/A, not scored
                "note":        "not in std",
                "in_standard": False,
            })
        return rows

    chem_rows = _all_rows(chem_result)
    mech_rows = _all_rows(mech_result)
    all_rows  = chem_rows + mech_rows

    # Score only rows that have a standard to compare against
    scored_rows = [r for r in all_rows if r["in_standard"]]
    pass_count  = sum(1 for r in scored_rows if r["ok"])
    fail_count  = sum(1 for r in scored_rows if not r["ok"])
    total       = len(scored_rows)

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
    if pipeline == "Manual":
        info_row("Section (TxW)", ", ".join(section_txw) if section_txw else "-")
    info_row("Pipeline",      pipeline)
    info_row("Properties OK", f"{pass_count} / {total}")
    pdf.ln(6)

    # ── Section printer ────────────────────────────────────────────────────────
    def prop_section(title, result, rows):
        if not rows:
            return

        # Section header
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(20, 40, 80)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 9, _safe(f"  {title}"), ln=True, fill=True)
        pdf.ln(1)

        col_w = [58, 40, 52, 18, 30]
        headers = ["Property", "Test Value", "Standard Value", "OK?", "Note"]

        # Column headers
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(220, 220, 220)
        pdf.set_text_color(30, 30, 30)
        for hdr, w in zip(headers, col_w):
            pdf.cell(w, 7, f" {hdr}", border="B", fill=True)
        pdf.ln()

        # Data rows
        for r in rows:
            ok     = r["ok"]      # True / False / None (N/A)
            in_std = r["in_standard"]

            if ok is True:
                bg = (240, 255, 240)   # light green  — passed
            elif ok is None:
                bg = (255, 245, 220)   # light amber  — no standard to compare
            else:
                bg = (255, 235, 235)   # light red    — failed standard

            pdf.set_fill_color(*bg)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(col_w[0], 6, _safe(f" {r['prop']}",       max_len=29), fill=True)
            pdf.cell(col_w[1], 6, _safe(f" {r['test_value']}", max_len=19), fill=True)
            pdf.cell(col_w[2], 6, _safe(f" {r['std_value']}",  max_len=23), fill=True)

            # OK? column
            if ok is True:
                pdf.set_text_color(0, 130, 0)
                ok_label = "YES"
            elif ok is None:
                pdf.set_text_color(30, 30, 30)    # plain black for "-"
                ok_label = "-"
            else:
                pdf.set_text_color(180, 40, 40)
                ok_label = "NO"

            pdf.cell(col_w[3], 6, _safe(f" {ok_label}"), fill=True)

            pdf.set_text_color(80, 80, 80)
            pdf.cell(col_w[4], 6, _safe(f" {r['note']}", max_len=18), fill=True, ln=True)

        # "In standard but NOT in test" footnote — REMOVED per user request

        pdf.ln(5)

    prop_section("Chemical Properties",   chem_result, chem_rows)
    prop_section("Mechanical Properties", mech_result, mech_rows)

    # ── Legend ─────────────────────────────────────────────────────────────────
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 6, "  Legend:", ln=True)
    pdf.set_font("Helvetica", "", 8)

    legend_items = [
        ((240, 255, 240), "Within standard range  (PASS)"),
        ((255, 235, 235), "Outside standard range  (FAIL)"),
        ((255, 245, 220), "No standard defined for this property  (-)"),
    ]
    for bg, label in legend_items:
        pdf.set_fill_color(*bg)
        pdf.cell(8, 5, "", fill=True)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(0, 5, _safe(f"  {label}"), ln=True)

    return bytes(pdf.output())
