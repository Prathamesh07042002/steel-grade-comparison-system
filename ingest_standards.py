"""
ingest_standards.py — Pipeline 0: Standards Ingestion
======================================================
Reads all PDFs from a folder, OCRs them, extracts structured JSON
(chemical + mechanical parameters), and saves one JSON file per grade.

Usage:
    python ingest_standards.py
    python ingest_standards.py --folder D:/document/data/standards_2/
    python ingest_standards.py --sleep 10   # reduce wait if you have higher quota
"""

import argparse
import json
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()   # FIX 3: Load API key from .env file

from comparator.src.ocr       import extract_text_from_pdf
from comparator.src.extractor import extract_standards_json


def parse_grade_from_filename(filename: str) -> str:
    name = Path(filename).stem
    name = re.sub(r"-----[\d.\-]+$", "", name).strip()
    name = re.sub(r"^\d+(\.\d+)?\s*[Mm][Mm]\s*", "", name).strip()
    return name if name else Path(filename).stem


def ingest_standards(folder_path: str, output_dir: str | None = None, sleep_secs: int = 30):
    p          = Path(folder_path)
    pdf_files  = sorted(p.glob("*.pdf"))
    output_dir = output_dir or str(p)

    if not pdf_files:
        print(f"No PDF files found in: {folder_path}")
        return

    # FIX 3: Validate API key before starting
    if not os.getenv("MISTRAL_API_KEY"):
        print("❌ MISTRAL_API_KEY not set. Create a .env file with your key.")
        return

    print(f"\n📦 Found {len(pdf_files)} standard PDFs\n")
    print(f"⏱  Sleep between PDFs: {sleep_secs}s  (use --sleep N to adjust)\n")

    for i, pdf_path in enumerate(pdf_files):
        print(f"{'='*55}")
        print(f"[{i+1}/{len(pdf_files)}] {pdf_path.name}")

        grade = parse_grade_from_filename(pdf_path.name)
        print(f"  Grade: {grade}")

        try:
            text   = extract_text_from_pdf(str(pdf_path))
            result = extract_standards_json(text, grade)
            count  = len(result.get(grade, {}).get("parameters", []))
            print(f"  ✅ Done — {count} parameters extracted")
        except Exception as e:
            print(f"  ❌ Error: {e}")
            result = {grade: {"error": str(e)}}

        safe_name   = re.sub(r'[\\/*?:"<>|]', "_", grade)
        output_path = os.path.join(output_dir, f"{safe_name}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"  💾 Saved → {output_path}")

        # FIX 2: Configurable sleep — avoids hardcoded 30s for users with higher quotas
        if i < len(pdf_files) - 1:
            print(f"  ⏳ Waiting {sleep_secs}s before next PDF…")
            time.sleep(sleep_secs)

    print(f"\n{'='*55}")
    print(f"✅ All done — {len(pdf_files)} JSON files saved in {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest standards PDFs → JSON")
    parser.add_argument(
        "--folder",
        default="D:/document/data/standards/",
        help="Folder containing standards PDFs",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output folder for JSON files (defaults to same as --folder)",
    )
    parser.add_argument(
        "--sleep",
        type=int,
        default=30,
        help="Seconds to wait between PDFs (default: 30). Lower if you have higher API quota.",
    )
    args = parser.parse_args()
    ingest_standards(args.folder, args.output, args.sleep)