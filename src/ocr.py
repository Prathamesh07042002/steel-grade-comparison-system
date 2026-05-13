

import base64
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("MISTRAL_API_KEY")


def extract_text_from_pdf(pdf_path: str) -> str:
    
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    if not API_KEY:
        raise ValueError("MISTRAL_API_KEY not found in .env file")

    print(f"  📂 Reading: {Path(pdf_path).name}")
    with open(pdf_path, "rb") as f:
        encoded_pdf = base64.b64encode(f.read()).decode("utf-8")

    print("  📤 Sending to Mistral OCR API...")
    response = requests.post(
        "https://api.mistral.ai/v1/ocr",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "mistral-ocr-latest",
            "document": {
                "type": "document_url",
                "document_url": f"data:application/pdf;base64,{encoded_pdf}",
            },
        },
        timeout=120,
    )

    if response.status_code != 200:
        raise Exception(f"OCR Error {response.status_code}: {response.text}")

    pages = response.json().get("pages", [])
    print(f"  📑 Pages extracted: {len(pages)}")
    return "\n".join(p.get("markdown", "") for p in pages)


# ── CLI test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else input("PDF path: ").strip().strip('"')
    text = extract_text_from_pdf(path)
    print("\n===== FIRST 2000 CHARS =====\n")
    print(text[:2000])