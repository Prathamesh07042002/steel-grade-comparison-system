from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Optional
import tempfile
import os
import sys
import base64
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
project_root = os.path.dirname(backend_dir)  # root/
env_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path=env_path)

# Verify API key is loaded
api_key = os.getenv("MISTRAL_API_KEY")
if not api_key:
    print("⚠️  WARNING: MISTRAL_API_KEY not found in backend/.env")
else:
    print("✅ MISTRAL_API_KEY loaded successfully")

# Add comparator to path (ONE level up from backend)
sys.path.insert(0, os.path.join(project_root, 'comparator'))

from comparator.src.ocr import extract_text_from_pdf
from comparator.src.extractor import extract_test_json
from comparator.src.comparator import direct_compare, llm_compare
from comparator.src.report import generate_pdf_report

app = FastAPI(title="Steel Grade Comparison API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants - Path to standards directory (at project root level)
STANDARDS_JSON_DIR = os.path.join(project_root, 'comparator', 'data', 'standards_json')
os.makedirs(STANDARDS_JSON_DIR, exist_ok=True)
print(f"✅ STANDARDS_JSON_DIR: {STANDARDS_JSON_DIR}")
print(f"✅ Standards exist: {os.path.isdir(STANDARDS_JSON_DIR)}")
if os.path.isdir(STANDARDS_JSON_DIR):
    standard_files = [f for f in os.listdir(STANDARDS_JSON_DIR) if f.endswith('.json')]
    print(f"✅ Found {len(standard_files)} standards")


# ── Pydantic Models ────────────────────────────────────────────────────────────

class DirectCompareRequest(BaseModel):
    test_props: Dict
    std_props: Dict


class ComparisonResult(BaseModel):
    matched: Dict
    not_in_standard: Dict
    not_in_test: Dict


class StandardFile(BaseModel):
    name: str
    grade_name: str


class FileUploadResponse(BaseModel):
    success: bool
    filename: str
    file_size: int


# ── Health Check ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Steel Grade Comparison API",
        "version": "1.0.0"
    }


# ── Standards Management ────────────────────────────────────────────────────────

@app.get("/standards/list")
async def list_standards():
    """List all available standards."""
    try:
        if not os.path.isdir(STANDARDS_JSON_DIR):
            return {"standards": []}
        
        standards = []
        for filename in sorted(os.listdir(STANDARDS_JSON_DIR)):
            if filename.endswith('.json'):
                standards.append({
                    "filename": filename,
                    "name": os.path.splitext(filename)[0]
                })
        
        return {"standards": standards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/standards/{standard_name}")
async def get_standard_details(standard_name: str):
    """Get details of a specific standard."""
    try:
        import json
        
        filepath = os.path.join(STANDARDS_JSON_DIR, f"{standard_name}.json")
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Standard not found")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return {"standard": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── PDF Processing ─────────────────────────────────────────────────────────────

@app.post("/extract/pdf-text")
async def extract_pdf_text(file: UploadFile = File(...)):
    """Extract text from PDF using OCR."""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            text = extract_text_from_pdf(tmp_path)
            return {
                "success": True,
                "filename": file.filename,
                "text_length": len(text),
                "text": text[:5000],  # Return first 5000 chars
                "full_text": text
            }
        finally:
            os.unlink(tmp_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract/test-json")
async def extract_test_values(file: UploadFile = File(...)):
    """Extract test values from PDF."""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # CHANGED: OCR + extraction now happen in ONE call inside extract_test_json.
            # No more separate extract_text_from_pdf() step here.
            test_entry = extract_test_json(tmp_path, pdf_name=file.filename)
            
            if not test_entry:
                raise HTTPException(status_code=400, detail="No data could be extracted from this PDF")
            
            return {
                "success": True,
                "filename": file.filename,
                "test_data": test_entry
            }
        finally:
            os.unlink(tmp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Comparison Endpoints ───────────────────────────────────────────────────────

@app.post("/compare/direct")
async def compare_direct(request: DirectCompareRequest):
    """Pipeline 1: Direct comparison against selected standard."""
    try:
        result = direct_compare(request.test_props, request.std_props)
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare/auto")
async def compare_auto(file: UploadFile = File(...)):
    """Pipeline 2: Auto-match against all standards."""
    tmp_path = None
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"  📂 Saved temp PDF: {tmp_path}")
        
        # CHANGED: OCR + extraction now happen in ONE call — no separate
        # extract_text_from_pdf() step, and no standalone char-count print.
        print(f"  📋 Extracting test values (OCR + extraction combined)…")
        test_entry = extract_test_json(tmp_path, pdf_name=file.filename)
        
        if not test_entry:
            raise HTTPException(status_code=400, detail="No data could be extracted from this PDF. The PDF may not contain valid steel test data.")
        
        print(f"  ✅ Test data extracted: {list(test_entry.keys())}")
        
        # Auto-match
        print(f"  🤖 Running LLM auto-match against standards…")
        result = llm_compare(test_entry, STANDARDS_JSON_DIR, pdf_filename=file.filename)
        print(f"  ✅ Auto-match complete")
        
        return {
            "success": True,
            "filename": file.filename,
            "test_data": test_entry,
            "result": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"  ❌ Error in compare/auto: {e}")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Auto-match failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── Report Generation ──────────────────────────────────────────────────────────

class ReportGenerationRequest(BaseModel):
    test_filename: str
    selected_spec: str
    selected_desig: str
    chem_result: Dict
    mech_result: Dict
    pipeline: str = "Manual"


@app.post("/report/generate-pdf")
async def generate_report_pdf(request: ReportGenerationRequest):
    """Generate a PDF report from comparison results."""
    try:
        pdf_bytes = generate_pdf_report(
            test_filename=request.test_filename,
            selected_spec=request.selected_spec,
            selected_desig=request.selected_desig,
            chem_result=request.chem_result,
            mech_result=request.mech_result,
            pipeline=request.pipeline
        )
        
        # Save to temp file for download
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        
        return {
            "success": True,
            "pdf_size": len(pdf_bytes),
            "filename": f"report_{request.test_filename}.pdf"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Utility Endpoints ──────────────────────────────────────────────────────────

@app.get("/utils/parse-properties")
async def parse_properties(params: str = ""):
    """Parse parameters into chemical and mechanical properties."""
    try:
        import json
        
        # Parse JSON params
        params_list = json.loads(params) if params else []
        
        MECH_KEYWORDS = {
            "ys", "uts", "el", "bh", "hardness", "impact",
            "r-bar", "n-value", "mpa", "hv", "hrc"
        }
        
        chem, mech = {}, {}
        for p in params_list:
            elem = p.get("element", "")
            rv = p.get("rv", "")
            if any(k in elem.lower() for k in MECH_KEYWORDS):
                mech[elem] = rv
            else:
                chem[elem] = rv
        
        return {
            "chemical_properties": chem,
            "mechanical_properties": mech
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)