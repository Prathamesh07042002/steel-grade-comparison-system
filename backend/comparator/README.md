COMPARATOR Setup
================

## Overview
This is the core comparison logic module. Do NOT modify this code.

## What's Inside
- `src/ocr.py` - PDF text extraction using Mistral OCR API
- `src/extractor.py` - LLM-based property extraction from PDF text
- `src/comparator.py` - Direct comparison and auto-match logic
- `src/report.py` - PDF report generation

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Mistral API key
   ```

3. Add standard JSON files to `data/standards_json/`

## Data Format

Each standard JSON file should have this structure:
```json
{
  "GRADE_NAME": {
    "parameters": [
      {"element": "C%", "rv": "0.10 max"},
      {"element": "Mn%", "rv": "0.40-0.80"},
      {"element": "YS MPa", "rv": "330-410"},
      {"element": "UTS MPa", "rv": "390-490"},
      {"element": "EL %", "rv": "27 min"}
    ]
  }
}
```

## Functions

### `extract_text_from_pdf(pdf_path: str) -> str`
Extracts text from PDF using Mistral OCR API.

### `extract_test_json(text: str, pdf_name: str) -> dict`
Extracts test values from OCR text using LLM.

### `direct_compare(test_props: dict, std_props: dict) -> dict`
Compares test properties against standard properties.

### `llm_compare(test_data: dict, standards_json_dir: str) -> dict`
Auto-matches test data against all standards and returns ranked results.

### `generate_pdf_report(...) -> bytes`
Generates a downloadable PDF report.

## Requirements
- Python 3.8+
- Mistral API key
- See requirements.txt for package versions
