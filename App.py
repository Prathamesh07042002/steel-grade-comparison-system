

import base64
import json
import os
import tempfile
import time

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

from src.ocr        import extract_text_from_pdf
from src.extractor  import extract_json, extract_test_json
from src.comparator import direct_compare, llm_compare
from src.report     import generate_pdf_report

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Steel Grade System",
    page_icon="🔩",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Custom CSS — sidebar hidden, polished tabs ─────────────────────────────
st.markdown("""
<style>
    /* Hide sidebar completely */
    [data-testid="stSidebar"]       { display: none !important; }
    [data-testid="collapsedControl"]{ display: none !important; }

    .block-container { padding-top: 1.5rem; }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] {
        height: 44px;
        padding: 0 20px;
        font-weight: 600;
        border-radius: 8px 8px 0 0;
    }
    .metric-card {
        background: #f0f4ff;
        border: 1px solid #c8d6ff;
        border-radius: 10px;
        padding: 14px 18px;
        text-align: center;
    }
    .pass-badge  { color:#1a7a1a; font-weight:700; font-size:1.1rem; }
    .fail-badge  { color:#b52222; font-weight:700; font-size:1.1rem; }
    .warn-badge  { color:#a06000; font-weight:700; font-size:1.1rem; }
    .extracted-box {
        background: #f8faff;
        border: 1px solid #d0daff;
        border-radius: 10px;
        padding: 16px 20px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

# ── Constants ─────────────────────────────────────────────────────────────────
STANDARDS_JSON_DIR  = "data/standards_json"
STANDARDS_PDF_DIR   = "data/standards"
CACHE_FILE          = "extracted_data.json"
BATCH_SLEEP_SECONDS = 4

os.makedirs(STANDARDS_JSON_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def pdf_preview_html(pdf_bytes: bytes) -> str:
    b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    return (
        f'<iframe src="data:application/pdf;base64,{b64}" '
        f'width="100%" height="560px" '
        f'style="border:1px solid #ccc;border-radius:8px;"></iframe>'
    )


def params_to_dicts(params: list):
    MECH_KEYWORDS = {
        "ys", "uts", "el", "bh", "hardness", "impact",
        "r-bar", "n-value", "mpa", "hv", "hrc"
    }
    chem, mech = {}, {}
    for p in params:
        elem = p.get("element", "")
        rv   = p.get("rv", "")
        if any(k in elem.lower() for k in MECH_KEYWORDS):
            mech[elem] = rv
        else:
            chem[elem] = rv
    return chem, mech


def load_std_files():
    if not os.path.isdir(STANDARDS_JSON_DIR):
        return []
    return sorted(f for f in os.listdir(STANDARDS_JSON_DIR) if f.endswith(".json"))


def load_std_data(filename: str):
    with open(os.path.join(STANDARDS_JSON_DIR, filename), encoding="utf-8") as f:
        return json.load(f)


def render_prop_table(props: dict):
    matched     = props.get("matched", {})
    not_in_std  = props.get("not_in_standard", {})
    not_in_test = props.get("not_in_test", {})

    if matched:
        h0, h1, h2, h3, h4 = st.columns([3, 2, 2, 1, 2])
        h0.markdown("**Property**")
        h1.markdown("**Test value**")
        h2.markdown("**Standard value**")
        h3.markdown("**OK?**")
        h4.markdown("**Note**")
        st.markdown("---")
        for prop, info in matched.items():
            ok = info["within_range"]
            c0, c1, c2, c3, c4 = st.columns([3, 2, 2, 1, 2])
            c0.markdown(f"{'✅' if ok else '❌'} **{prop.replace('_',' ')}**")
            c1.markdown(f"`{info['test_value']}`")
            c2.markdown(f"`{info['standard_value']}`")
            c3.markdown("✅" if ok else "❌")
            c4.markdown(f"*{info.get('note','')}*")
    else:
        st.caption("No overlapping properties to compare.")

    if not_in_std:
        st.markdown("---")
        st.markdown("**❌ In test PDF but NOT in selected standard:**")
        for p, v in not_in_std.items():
            st.markdown(f"- `{p.replace('_',' ')}` : {v}")

    if not_in_test:
        st.markdown("---")
        st.markdown("**➕ In standard but NOT found in test PDF:**")
        for p, v in not_in_test.items():
            st.markdown(f"- `{p.replace('_',' ')}` : {v}")


def show_result_summary(chem_result, mech_result):
    all_matched = (
        list(chem_result.get("matched", {}).values()) +
        list(mech_result.get("matched",  {}).values())
    )
    pass_count = sum(1 for m in all_matched if m["within_range"])
    fail_count = sum(1 for m in all_matched if not m["within_range"])
    total      = len(all_matched)

    if total == 0:
        st.warning("⚠️ No overlapping properties found.")
        return pass_count, fail_count, total

    if fail_count == 0:
        st.success(f"### ✅ PASS — All {total} properties within specification")
    elif pass_count == 0:
        st.error(f"### ❌ FAIL — 0 / {total} properties within specification")
    else:
        st.warning(f"### ⚠️ PARTIAL PASS — {pass_count} / {total} within specification")

    st.progress(
        pass_count / total,
        text=f"{int(pass_count/total*100)}%  ({pass_count}/{total} passing)"
    )
    return pass_count, fail_count, total


def render_extracted_values(test_entry: dict):
    """Show extracted chemical + mechanical values right after OCR."""
    st.subheader("📋 Extracted Values from PDF")
    chem = test_entry.get("chemical_properties",  {})
    mech = test_entry.get("mechanical_properties", {})

    col_c, col_m = st.columns(2)

    with col_c:
        st.markdown("#### 🧪 Chemical Properties")
        if chem:
            for k, v in chem.items():
                st.markdown(f"- **{k}**: `{v}`")
        else:
            st.caption("None extracted.")

    with col_m:
        st.markdown("#### ⚙️ Mechanical Properties")
        if mech:
            for k, v in mech.items():
                st.markdown(f"- **{k}**: `{v}`")
        else:
            st.caption("None extracted.")




def browse_standards_expander(key_suffix: str):
    """
    'Browse Standards' expander shown at the bottom of each pipeline.
    Selecting a standard immediately shows its full property preview.
    No raw JSON button.
    """
    st.divider()
    with st.expander("📦 Browse Standards", expanded=False):
        std_files = load_std_files()
        if not std_files:
            st.warning(f"No JSON files found in: {STANDARDS_JSON_DIR}")
            return

        display_names = [os.path.splitext(f)[0] for f in std_files]
        selected = st.selectbox(
            "Select a standard to preview",
            display_names,
            key=f"browse_select_{key_suffix}",
        )
        filename = selected + ".json"
        raw      = load_std_data(filename)
        grade_key = next(iter(raw))
        params    = raw[grade_key].get("parameters", [])
        std_chem, std_mech = params_to_dicts(params)

        st.markdown(f"### 🔸 {grade_key}")
        lc, rc = st.columns(2)
        with lc:
            st.markdown("**⚙️ Mechanical Properties**")
            if std_mech:
                for k, v in std_mech.items():
                    st.markdown(f"- **{k}**: `{v}`")
            else:
                st.caption("None available")
        with rc:
            st.markdown("**🧪 Chemical Properties**")
            if std_chem:
                for k, v in std_chem.items():
                    st.markdown(f"- **{k}**: `{v}`")
            else:
                st.caption("None available")


# ── Header ────────────────────────────────────────────────────────────────────
st.title("🔩 Steel Grade Comparison System")
st.caption("Manual and automatic comparison of mill certificates against steel standards.")

if not os.getenv("MISTRAL_API_KEY"):
    st.warning("⚠️ MISTRAL_API_KEY not found in .env file!")
else:
    st.success("✅ API key loaded from .env")

# ── Tabs — Standards Library tab REMOVED ─────────────────────────────────────
tab_p1, tab_p2 = st.tabs([
    "🔬 Pipeline 1 — Manual Compare",
    "🤖 Pipeline 2 — Auto Match",
])


# ══════════════════════════════════════════════════════════════════════════════
#  TAB 1 — Pipeline 1: Manual Compare
# ══════════════════════════════════════════════════════════════════════════════
with tab_p1:
    st.subheader("🔬 Pipeline 1 — Manual Comparison")
    st.caption(
        "Upload a test / mill-certificate PDF → choose the standard to compare → "
        "get a property-by-property pass / fail report"
    )
    st.divider()

    # ── Step 1: Upload ────────────────────────────────────────────────────────
    st.markdown("### 📄 Step 1 — Upload test PDF")
    up1 = st.file_uploader(
        "Mill certificate / test report PDF",
        type=["pdf"],
        key="p1_uploader",
    )

    if not up1:
        st.info("⬆️ Upload a PDF to get started.")
    else:
        with st.expander("👁️ Preview uploaded PDF", expanded=False):
            st.markdown(pdf_preview_html(up1.read()), unsafe_allow_html=True)
            up1.seek(0)

        # ── Step 2: Pick standard ─────────────────────────────────────────────
        st.divider()
        st.markdown("### 🎯 Step 2 — Choose standard to compare against")

        std_files = load_std_files()

        if not std_files:
            st.error(
                f"No standard JSON files found in `{STANDARDS_JSON_DIR}`.  "
                "Run `ingest_standards.py` first."
            )
        else:
            display_names = [os.path.splitext(f)[0] for f in std_files]
            sel_display   = st.selectbox("Standard", display_names, key="p1_std_file")
            sel_file      = sel_display + ".json"

            # Load + preview selected standard immediately (no button needed)
            std_raw            = load_std_data(sel_file)
            grade_key          = next(iter(std_raw))
            params             = std_raw[grade_key].get("parameters", [])
            std_chem, std_mech = params_to_dicts(params)
            std_data           = {
                "chemical_properties":  std_chem,
                "mechanical_properties": std_mech,
            }

            with st.expander(f"👁️ Preview standard: **{grade_key}**", expanded=False):
                lc, rc = st.columns(2)
                with lc:
                    st.markdown("**⚙️ Mechanical Properties**")
                    if std_mech:
                        for k, v in std_mech.items():
                            st.markdown(f"- **{k}**: `{v}`")
                    else:
                        st.caption("None available")
                with rc:
                    st.markdown("**🧪 Chemical Properties**")
                    if std_chem:
                        for k, v in std_chem.items():
                            st.markdown(f"- **{k}**: `{v}`")
                    else:
                        st.caption("None available")

            # ── Step 3: Run ───────────────────────────────────────────────────
            st.divider()
            st.markdown("### ⚡ Step 3 — Run comparison")

            run_key = f"p1__{up1.name}__{sel_file}"

            if st.button("▶ Compare Now", use_container_width=True, type="primary", key="p1_run"):
                st.session_state.pop("p1_result",    None)
                st.session_state.pop("p1_key",       None)
                st.session_state["p1_triggered"] = True

            if st.session_state.pop("p1_triggered", False):
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(up1.getvalue())
                    tmp_path = tmp.name

                with st.status("Running extraction…", expanded=True) as status:
                    st.write("⏳ 1/2 — OCR on test PDF…")
                    try:
                        text = extract_text_from_pdf(tmp_path)
                        st.write(f"✅ OCR done — {len(text):,} chars")
                    except Exception as e:
                        st.error(f"❌ OCR failed: {e}")
                        os.unlink(tmp_path)
                        st.stop()

                    st.write("⏳ 2/2 — Extracting test values…")
                    try:
                        test_entry = extract_test_json(text, pdf_name=up1.name)
                        if not test_entry:
                            st.error("❌ No data could be extracted from this PDF.")
                            os.unlink(tmp_path)
                            st.stop()
                        st.write("✅ Extraction done")
                    except Exception as e:
                        st.error(f"❌ Extraction failed: {e}")
                        os.unlink(tmp_path)
                        st.stop()

                    status.update(label="✅ Ready!", state="complete")

                os.unlink(tmp_path)

                chem_res = direct_compare(
                    test_entry.get("chemical_properties",  {}),
                    std_data["chemical_properties"],
                )
                mech_res = direct_compare(
                    test_entry.get("mechanical_properties", {}),
                    std_data["mechanical_properties"],
                )

                st.session_state["p1_result"] = {
                    "chem": chem_res, "mech": mech_res, "test_entry": test_entry,
                }
                st.session_state["p1_key"] = run_key

            elif "p1_result" not in st.session_state:
                st.info("👆 Click **Compare Now** to run the comparison.")

            # ── Show results ──────────────────────────────────────────────────
            if "p1_result" in st.session_state:
                cr = st.session_state["p1_result"]["chem"]
                mr = st.session_state["p1_result"]["mech"]
                te = st.session_state["p1_result"]["test_entry"]

                if st.session_state.get("p1_key") != run_key:
                    st.warning(
                        "⚠️ Showing results from a previous run. "
                        "Click **Compare Now** to re-run with the current selection."
                    )

                st.divider()

                # ── EXTRACTED VALUES shown right here, before comparison ──────
                render_extracted_values(te)

                st.divider()
                st.subheader("📊 Comparison Results")
                st.caption(f"**Test:** {up1.name}　　**Standard:** {grade_key}")

                pass_count, fail_count, total = show_result_summary(cr, mr)

                st.divider()
                tc, tm = st.tabs(["🧪 Chemical", "⚙️ Mechanical"])
                with tc:
                    render_prop_table(cr)
                with tm:
                    render_prop_table(mr)

                st.divider()
                try:
                    pdf_bytes = generate_pdf_report(
                        up1.name, grade_key, grade_key, cr, mr, pipeline="Manual"
                    )
                    st.download_button(
                        "⬇️ Download PDF Report",
                        data=pdf_bytes,
                        file_name=f"p1_comparison_{os.path.splitext(up1.name)[0]}.pdf",
                        mime="application/pdf",
                        use_container_width=True,
                    )
                except ImportError:
                    st.warning("Install fpdf2 for PDF export: `pip install fpdf2`")

    # ── Browse Standards at bottom of Pipeline 1 ─────────────────────────────
    browse_standards_expander("p1")


# ══════════════════════════════════════════════════════════════════════════════
#  TAB 2 — Pipeline 2: Auto Match
# ══════════════════════════════════════════════════════════════════════════════
with tab_p2:
    st.subheader("🤖 Pipeline 2 — Automatic Best-Match")
    st.caption(
        "Upload a test PDF → the LLM scans ALL stored standards and selects the "
        "best-matching grade automatically"
    )
    st.divider()

    # ── Step 1: Upload ────────────────────────────────────────────────────────
    st.markdown("### 📄 Step 1 — Upload test PDF")
    up2 = st.file_uploader(
        "Mill certificate / test report PDF",
        type=["pdf"],
        key="p2_uploader",
    )

    if not up2:
        st.info("⬆️ Upload a PDF to get started.")
    else:
        with st.expander("👁️ Preview uploaded PDF", expanded=False):
            st.markdown(pdf_preview_html(up2.read()), unsafe_allow_html=True)
            up2.seek(0)

        # ── Step 2: Run ───────────────────────────────────────────────────────
        st.divider()
        st.markdown("### ⚡ Step 2 — Run auto-match")
        st.info(
            "The LLM will compare this PDF against **all standard JSONs** stored in "
            f"`{STANDARDS_JSON_DIR}` and return the best match."
        )

        run2_key = f"p2__{up2.name}"

        if st.button("▶ Find Best Match", use_container_width=True, type="primary", key="p2_run"):
            st.session_state.pop("p2_result", None)
            st.session_state.pop("p2_key",    None)
            st.session_state["p2_triggered"] = True

        if st.session_state.pop("p2_triggered", False):
            if not os.path.isdir(STANDARDS_JSON_DIR) or not any(
                f.endswith(".json") for f in os.listdir(STANDARDS_JSON_DIR)
            ):
                st.error(
                    f"No standard JSON files found in `{STANDARDS_JSON_DIR}`.  "
                    "Run `ingest_standards.py` first."
                )
                st.stop()

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(up2.getvalue())
                tmp_path = tmp.name

            with st.status("Running auto-match pipeline…", expanded=True) as status:
                st.write("⏳ 1/3 — OCR on test PDF…")
                try:
                    text = extract_text_from_pdf(tmp_path)
                    st.write(f"✅ OCR done — {len(text):,} chars")
                except Exception as e:
                    st.error(f"❌ OCR failed: {e}")
                    os.unlink(tmp_path)
                    st.stop()

                st.write("⏳ 2/3 — Extracting test values…")
                try:
                    test_entry = extract_test_json(text, pdf_name=up2.name)
                    if not test_entry:
                        st.error("❌ No data could be extracted from this PDF.")
                        os.unlink(tmp_path)
                        st.stop()
                    st.write("✅ Extraction done")
                except Exception as e:
                    st.error(f"❌ Extraction failed: {e}")
                    os.unlink(tmp_path)
                    st.stop()

                st.write("⏳ 3/3 — LLM auto-matching against all standards…")
                try:
                    result = llm_compare(test_entry, STANDARDS_JSON_DIR)
                    st.write("✅ LLM comparison done")
                except Exception as e:
                    st.error(f"❌ LLM comparison failed: {e}")
                    os.unlink(tmp_path)
                    st.stop()

                status.update(label="✅ Auto-match complete!", state="complete")

            os.unlink(tmp_path)

            st.session_state["p2_result"] = {"result": result, "test_entry": test_entry}
            st.session_state["p2_key"]    = run2_key

        elif "p2_result" not in st.session_state:
            st.info("👆 Click **Find Best Match** to run auto-matching.")

        # ── Show results ──────────────────────────────────────────────────────
        if "p2_result" in st.session_state:
            result     = st.session_state["p2_result"]["result"]
            test_entry = st.session_state["p2_result"]["test_entry"]

            if st.session_state.get("p2_key") != run2_key:
                st.warning(
                    "⚠️ Showing results from a previous run. "
                    "Click **Find Best Match** to re-run with the current file."
                )

            st.divider()

            # ── EXTRACTED VALUES shown right here, before match result ────────
            render_extracted_values(test_entry)

            st.divider()
            st.subheader("📊 Auto-Match Results")

            if result.get("status") == "NO_MATCH":
                st.error("### ❌ NO MATCH FOUND")
                st.write(result.get("message", ""))
                if "closest_attempt" in result:
                    ca = result["closest_attempt"]
                    st.markdown(f"""
| Field | Value |
|---|---|
| Closest standard | `{ca.get('standard_product','N/A')}` |
| File | `{ca.get('standard_file','')}` |
| Score | `{ca.get('overall_score',0)}` |
| Reason | {ca.get('verdict_reason','')} |
""")
            else:
                best    = result["best_match"]
                verdict = best.get("verdict", "MATCHED")
                score   = float(best.get("overall_score", 0))

                vcol, scol = st.columns([3, 1])
                with vcol:
                    if verdict == "MATCHED":
                        st.success(f"### ✅ {verdict}")
                    else:
                        st.warning(f"### ⚠️ {verdict}")
                with scol:
                    st.metric("Match Score", f"{score:.0%}")

                st.markdown(f"""
| | |
|---|---|
| **Standard file** | `{best.get('standard_file','')}` |
| **Standard product** | `{best.get('standard_product','')}` |
| **Test product** | `{best.get('test_product','')}` |
| **Name match** | {'✅' if best.get('name_match') else '❌'}  {best.get('name_match_reason','')} |
| **Verdict reason** | {best.get('verdict_reason','')} |
""")

                st.divider()

                chem_llm = best.get("chemical_properties",  {})
                mech_llm = best.get("mechanical_properties", {})

                def norm_llm_props(d: dict) -> dict:
                    out = {"matched": {}, "not_in_standard": {}, "not_in_test": {}}
                    for k in ("matched", "not_in_standard", "not_in_test"):
                        raw = d.get(k, {})
                        if isinstance(raw, dict):
                            out[k] = raw
                    return out

                cr_llm = norm_llm_props(chem_llm)
                mr_llm = norm_llm_props(mech_llm)

                all_matched_llm = (
                    list(cr_llm["matched"].values()) +
                    list(mr_llm["matched"].values())
                )
                pass_llm  = sum(1 for m in all_matched_llm if m.get("within_range"))
                total_llm = len(all_matched_llm)
                if total_llm:
                    st.progress(
                        pass_llm / total_llm,
                        text=f"{int(pass_llm/total_llm*100)}%  ({pass_llm}/{total_llm} passing)",
                    )

                tc, tm, ts = st.tabs(["🧪 Chemical", "⚙️ Mechanical", "🏆 Top Matches"])
                with tc:
                    render_prop_table(cr_llm)
                with tm:
                    render_prop_table(mr_llm)
                with ts:
                    for idx, m in enumerate(result.get("top_matches", []), 1):
                        s     = float(m.get("overall_score", 0))
                        label = f"#{idx} — {m.get('standard_product','')}  ({s:.0%})"
                        with st.expander(label, expanded=(idx == 1)):
                            st.write(f"**File:** {m.get('standard_file','')}")
                            st.write(f"**Verdict:** {m.get('verdict','')} — {m.get('verdict_reason','')}")

                st.divider()
                try:
                    pdf_bytes = generate_pdf_report(
                        up2.name,
                        best.get("standard_file",    "Auto"),
                        best.get("standard_product", "Auto"),
                        cr_llm, mr_llm,
                        pipeline="Auto",
                    )
                    st.download_button(
                        "⬇️ Download PDF Report",
                        data=pdf_bytes,
                        file_name=f"p2_automatch_{os.path.splitext(up2.name)[0]}.pdf",
                        mime="application/pdf",
                        use_container_width=True,
                    )
                except ImportError:
                    st.warning("Install fpdf2 for PDF export: `pip install fpdf2`")

    # ── Browse Standards at bottom of Pipeline 2 ─────────────────────────────
    browse_standards_expander("p2")