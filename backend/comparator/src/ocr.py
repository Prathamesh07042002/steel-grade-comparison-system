
import base64
import io
import json
import os
import time
from pathlib import Path
from typing import Optional, Type, TypeVar

import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from dotenv import load_dotenv
from pydantic import BaseModel
from mistralai.client import Mistral
from mistralai.client.models import ImageURLChunk
from mistralai.extra import response_format_from_pydantic_model
from mistralai.client.errors import SDKError

load_dotenv()
API_KEY = os.getenv("MISTRAL_API_KEY")

T = TypeVar("T", bound=BaseModel)

_client: Optional[Mistral] = None


def _get_client() -> Mistral:
    global _client
    if not API_KEY:
        raise ValueError("MISTRAL_API_KEY not found in .env file")
    if _client is None:
        _client = Mistral(api_key=API_KEY)
    return _client


def _pdf_to_images(pdf_path: str, dpi: int = 300):
    """Rasterize every page of a PDF into PIL Images using PyMuPDF."""
    doc = fitz.open(pdf_path)
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    images = []
    for page in doc:
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        images.append(img)
    doc.close()
    return images


def _correct_page_orientation(page_image):
    """Detect rotation with Tesseract OSD and rotate the page upright if needed."""
    try:
        osd = pytesseract.image_to_osd(page_image, output_type=pytesseract.Output.DICT)
        rotate_needed = osd.get("rotate", 0)
        if rotate_needed:
            print(f"    ↻ Detected {rotate_needed}° rotation — correcting…")
            page_image = page_image.rotate(-rotate_needed, expand=True)
        return page_image
    except Exception as e:
        print(f"    ⚠️  Orientation detection skipped ({e}) — using page as-is")
        return page_image


def _image_to_data_url(image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=95)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def _get_corrected_page_data_url(pdf_path: str, page_index: int = 0, dpi: int = 300) -> str:
    """Rasterize + auto-correct rotation for one page, return as a data URL."""
    print(f"  📂 Reading: {Path(pdf_path).name}")
    print("  🖼️  Rasterizing page for orientation check…")
    pages = _pdf_to_images(pdf_path, dpi=dpi)
    corrected_image = _correct_page_orientation(pages[page_index])
    return _image_to_data_url(corrected_image)


def extract_document_annotation(
    pdf_path: str,
    response_model: Type[T],
    document_annotation_prompt: Optional[str] = None,
    max_retries: int = 5,
    page_index: int = 0,
) -> T:
    """
    Single-call OCR + structured extraction, on a rotation-corrected page.

    `response_model` is a Pydantic model describing exactly the JSON shape
    you want back. Mistral guarantees the output conforms to it.
    """
    data_url = _get_corrected_page_data_url(pdf_path, page_index=page_index)
    client = _get_client()

    kwargs = dict(
        model="mistral-ocr-latest",
        document=ImageURLChunk(image_url=data_url),
        document_annotation_format=response_format_from_pydantic_model(response_model),
        table_format="html",  # preserves merged/spanning header cells correctly
    )
    if document_annotation_prompt:
        kwargs["document_annotation_prompt"] = document_annotation_prompt

    for attempt in range(1, max_retries + 1):
        try:
            print("  📤 Sending to Mistral (OCR + annotation, one call)…")
            response = client.ocr.process(**kwargs)
            break
        except SDKError as e:
            status = getattr(e, "status_code", None)
            if status == 429 and attempt < max_retries:
                wait = attempt * 30
                print(f"  ⚠️  Rate limit — waiting {wait}s (attempt {attempt}/{max_retries})…")
                time.sleep(wait)
                continue
            raise Exception(f"OCR/Annotation API Error: {e}") from e
    else:
        raise Exception("Max retries reached — Mistral rate limit not cleared.")

    annotation = response.document_annotation
    if isinstance(annotation, str):
        annotation = json.loads(annotation)

    print(f"  📑 Pages processed: {len(response.pages)}")
    return response_model.model_validate(annotation)


def extract_text_from_pdf(pdf_path: str, page_index: int = 0) -> str:
    """
    Raw OCR only (no structured extraction) — kept for debug/preview use,
    still benefits from the same rotation correction.
    """
    data_url = _get_corrected_page_data_url(pdf_path, page_index=page_index)
    client = _get_client()

    print("  📤 Sending to Mistral OCR API...")
    response = client.ocr.process(
        model="mistral-ocr-latest",
        document=ImageURLChunk(image_url=data_url),
        table_format="html",
    )
    print(f"  📑 Pages extracted: {len(response.pages)}")
    return "\n".join(p.markdown or "" for p in response.pages)

def get_raw_table_html(pdf_path: str, page_index: int = 0) -> str:
    """
    Get raw OCR table HTML for one page — no schema/annotation involved.
    Used as a fallback to pull section_txw via regex when the annotation
    step misses it despite the data being present in the OCR'd HTML.
    """
    data_url = _get_corrected_page_data_url(pdf_path, page_index=page_index)
    client = _get_client()
    response = client.ocr.process(
        model="mistral-ocr-latest",
        document=ImageURLChunk(image_url=data_url),
        table_format="html",
    )
    page = response.pages[page_index]
    tables = page.tables or []
    return "\n".join(t.content for t in tables)


# ── CLI test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else input("PDF path: ").strip().strip('"')
    text = extract_text_from_pdf(path)
    print("\n===== FIRST 2000 CHARS =====\n")
    print(text[:2000])
