"""
extractor.py — LLM-based structured data extractor
Converts raw OCR text into structured JSON for:
  1. Standard specification sheets  → extract_standards_json()
  2. Test / mill-certificate PDFs   → extract_test_json()
"""

import json
import os
import re
import time
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("MISTRAL_API_KEY")

# ── Helpers ───────────────────────────────────────────────────────────────────

def _call_mistral(payload: dict, max_retries: int = 5) -> str:
    """POST to Mistral chat completions with exponential back-off on 429."""
    for attempt in range(1, max_retries + 1):
        response = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=120,
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"].strip()
        if response.status_code == 429:
            wait = attempt * 30
            print(f"  ⚠️  Rate limit — waiting {wait}s (attempt {attempt}/{max_retries})…")
            time.sleep(wait)
            continue
        raise Exception(f"Chat API Error {response.status_code}: {response.text}")
    raise Exception("Max retries reached — Mistral rate limit not cleared.")


def _clean_json(raw: str) -> str:
    """Strip ```json … ``` fences if present."""
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# ── Pipeline 1: Standard spec sheet extractor ────────────────────────────────

def extract_standards_json(text: str, grade_name: str = "UNKNOWN") -> dict:
    """
    Extract chemical + mechanical parameters from a standards spec PDF.

    Returns a dict shaped like:
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
    if not text.strip():
        raise ValueError("OCR text is empty.")

    prompt = f"""
You are an expert at reading industrial steel standards documents.

This document is a STANDARDS specification sheet for steel grade: "{grade_name}"

Extract ALL elements / parameters from the table(s) in this document.

For each element or parameter extract:
- "element": the parameter name (e.g. "C%", "Mn%", "Si%", "P%", "S%", "Al%",
  "Nb%", "V%", "Ti%", "CE", "N ppm", "YS MPa", "UTS MPa", "EL %", "BH", etc.)
- "rv": the single R/V value exactly as it appears (e.g. "0.10 max", "330-490", "27 min")

Return a JSON object in this EXACT format:
{{
  "{grade_name}": {{
    "parameters": [
      {{ "element": "C%",     "rv": "0.10 max"  }},
      {{ "element": "Mn%",    "rv": "0.40-0.80" }},
      {{ "element": "YS MPa", "rv": "330-410"   }},
      {{ "element": "UTS MPa","rv": "390-490"   }},
      {{ "element": "EL %",   "rv": "27 min"    }}
    ]
  }}
}}

RULES:
- Extract EVERY SINGLE row — do not skip any element
- "rv" is one value per element, exactly as shown
- Return STRICT JSON ONLY. No explanation. No markdown. No code fences.

TEXT:
{text}
"""

    print(f"  🤖 Extracting standards parameters for grade: {grade_name}…")
    content = _clean_json(_call_mistral({
        "model": "mistral-large-latest",
        "messages": [{"role": "user", "content": prompt}],
    }))

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse failed: {e}")
        return {grade_name: {"parameters": [], "parse_error": str(e)}}


# ── Pipeline 2: Test / mill-certificate extractor ────────────────────────────

def extract_test_json(text: str, pdf_name: str = "") -> dict:
    """
    Extract ACTUAL measured values from a mill certificate / test report PDF.

    Returns a dict shaped like:
    {
      "grade":                 "CR3",
      "supply_spec":           "TS4012",
      "drawing_designation":   "CR3",
      "steel_grade_form":      "Cold Rolled",
      "chemical_properties":   {"C%": "0.06", "Mn%": "0.35", ...},
      "mechanical_properties": {"YS MPa": "320", "UTS MPa": "420", "EL %": "38"}
    }
    """
    if not text.strip():
        raise ValueError("OCR text is empty.")

    prompt = f"""
You are an expert at reading steel mill certificates and test reports.

This document is a TEST / MILL CERTIFICATE PDF: "{pdf_name}"

Extract the ACTUAL MEASURED values (not specification limits) for:
1. Grade / product name
2. Supply spec (e.g. TS4012, IS2062, etc.)
3. Drawing designation
4. Steel grade form (e.g. Cold Rolled, Hot Rolled, Galvanised, etc.)
5. Chemical properties (actual test values, e.g. C%, Mn%, Si%, P%, S%, Al%, etc.)
6. Mechanical properties (actual test values, e.g. YS MPa, UTS MPa, EL %, BH, etc.)

Return STRICT JSON ONLY — no explanation, no markdown, no code fences:
{{
  "grade":                 "",
  "supply_spec":           "",
  "drawing_designation":   "",
  "steel_grade_form":      "",
  "chemical_properties":   {{"C%": "0.06", "Mn%": "0.35"}},
  "mechanical_properties": {{"YS MPa": "320", "UTS MPa": "420", "EL %": "38"}}
}}

TEXT:
{text}
"""

    print(f"  🤖 Extracting test values from: {pdf_name}…")
    content = _clean_json(_call_mistral({
        "model": "mistral-large-latest",
        "messages": [{"role": "user", "content": prompt}],
    }))

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse failed: {e}")
        return {}


# ── Generic extractor (used by legacy Streamlit tab 1) ───────────────────────

def extract_json(text: str, pdf_name: str = "") -> list:
    """
    Legacy extractor: returns a list of product entries from a standards PDF.
    Used by the Standards Library tab.
    """
    if not text.strip():
        raise ValueError("OCR text is empty.")

    prompt = f"""
You are an expert at reading industrial steel standard PDFs.

This document is: "{pdf_name}"

Extract ALL steel grade entries.  For each entry return:
- supply_spec           (e.g. "TS4012A7")
- drawing_designation   (e.g. "CR3", "HR4")
- steel_grade_form      (e.g. "Cold Rolled", "Hot Rolled")
- mechanical_properties (dict of property -> value/range, e.g. {{"YS MPa": "270-380"}})
- chemical_properties   (dict of element -> value/range, e.g. {{"C%": "0.10 max"}})

Return STRICT JSON ONLY — a JSON array of objects:
[
  {{
    "supply_spec": "",
    "drawing_designation": "",
    "steel_grade_form": "",
    "mechanical_properties": {{}},
    "chemical_properties": {{}}
  }}
]

No explanation. No markdown. No code fences.

TEXT:
{text}
"""

    content = _clean_json(_call_mistral({
        "model": "mistral-large-latest",
        "messages": [{"role": "user", "content": prompt}],
    }))

    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, list) else [parsed]
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse failed: {e}")
        return []