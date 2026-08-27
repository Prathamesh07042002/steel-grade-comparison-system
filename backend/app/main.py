from fastapi import APIRouter, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask
from pydantic import BaseModel
from typing import Dict, List, Optional
import tempfile
import os
import sys
import base64
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
env_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path=env_path)

# Verify API key is loaded
api_key = os.getenv("MISTRAL_API_KEY")
if not api_key:
    print("⚠️  WARNING: MISTRAL_API_KEY not found in backend/.env")
else:
    print("✅ MISTRAL_API_KEY loaded successfully")

# Add backend dir to path so `comparator` resolves unambiguously to backend/comparator
sys.path.insert(0, backend_dir)

from comparator.src.ocr import extract_text_from_pdf
from comparator.src.extractor import extract_test_json
from comparator.src.comparator import direct_compare, auto_compare
from comparator.src.report import generate_pdf_report

app = FastAPI(title="Test Certificate Compliance API", version="1.0.0")

# Every application route hangs off this router, which is mounted under /api at
# the bottom of this file. The prefix is what lets the SPA catch-all route
# (also at the bottom) distinguish "unknown API endpoint" — which must fail
# loudly with a JSON 404 — from "client-side page path", which must fall back
# to index.html. Without it, a typo'd endpoint would quietly return HTML.
api = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants - Path to standards directory
STANDARDS_JSON_DIR = os.path.join(backend_dir, 'comparator', 'data', 'standards_json')
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


class AutoCompareFromDataRequest(BaseModel):
    test_data: Dict
    filename: str = ""


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

@api.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Test Certificate Compliance API",
        "version": "1.0.0"
    }


# ── Standards Management ────────────────────────────────────────────────────────

@api.get("/standards/list")
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


@api.get("/standards/{standard_name}")
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

@api.post("/extract/pdf-text")
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


@api.post("/extract/test-json")
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

@api.post("/compare/direct")
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


@api.post("/compare/auto")
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

        # Auto-match — deterministic, no LLM call
        print(f"  🔍 Running auto-match against standards…")
        result = auto_compare(test_entry, STANDARDS_JSON_DIR, pdf_filename=file.filename)
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


@api.post("/compare/auto-from-data")
async def compare_auto_from_data(request: AutoCompareFromDataRequest):
    """
    Pipeline 2, reusing an already-extracted test_data dict (e.g. from a prior
    /extract/test-json or /compare/auto call on the same file) instead of
    re-uploading the PDF and re-running OCR.
    """
    try:
        test_entry = request.test_data
        if not test_entry:
            raise HTTPException(status_code=400, detail="test_data is required")

        result = auto_compare(test_entry, STANDARDS_JSON_DIR, pdf_filename=request.filename)

        return {
            "success": True,
            "filename": request.filename,
            "test_data": test_entry,
            "result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"  ❌ Error in compare/auto-from-data: {e}")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Auto-match failed: {str(e)}")


# ── Report Generation ──────────────────────────────────────────────────────────

class ReportGenerationRequest(BaseModel):
    test_filename: str
    selected_spec: str
    selected_desig: str
    chem_result: Dict
    mech_result: Dict
    pipeline: str = "Manual"
    section_txw: List[str] = []


@api.post("/report/generate-pdf")
async def generate_report_pdf(request: ReportGenerationRequest):
    """Generate a PDF report from comparison results."""
    try:
        pdf_bytes = generate_pdf_report(
            test_filename=request.test_filename,
            selected_spec=request.selected_spec,
            selected_desig=request.selected_desig,
            chem_result=request.chem_result,
            mech_result=request.mech_result,
            pipeline=request.pipeline,
            section_txw=request.section_txw
        )

        # Save to temp file for download
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        # Delete the temp file once the response has been sent. Without this the
        # container accumulates one orphaned PDF per download for its whole
        # lifetime, which on a long-running deploy eventually fills /tmp.
        return FileResponse(
            tmp_path,
            media_type="application/pdf",
            filename=f"report_{request.test_filename}.pdf",
            background=BackgroundTask(os.unlink, tmp_path)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Utility Endpoints ──────────────────────────────────────────────────────────

@api.get("/utils/parse-properties")
async def parse_properties(params: str = ""):
    """Parse parameters into chemical and mechanical properties."""
    try:
        import json
        
        # Parse JSON params
        params_list = json.loads(params) if params else []
        
        MECH_KEYWORDS = {
            "ys", "uts", "el", "bh", "hardness", "impact",
            "r-bar", "n-value", "mpa", "hv", "hrc", "hrb",
            "ra", "er", "bend"
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


# ── Route registration ─────────────────────────────────────────────────────────
#
# ORDER BELOW IS LOAD-BEARING. FastAPI matches routes in registration order, so
# the SPA catch-all has to come after every real route or it swallows the API.
# Anything new goes on `api` (above this line), never after the catch-all.

app.include_router(api)


@app.get("/health")
async def health_root():
    """
    Unauthenticated health check for the nginx health location.

    Deliberately duplicates GET /api/health: nginx gates /tc_compliance/ behind
    auth_request, and the health probe has to answer without a session cookie,
    so it needs a path that can sit outside the gated location.
    """
    return {
        "status": "healthy",
        "service": "Test Certificate Compliance API",
        "version": "1.0.0"
    }


# ── SPA (built React bundle) ───────────────────────────────────────────────────
#
# Dockerfile.web copies frontend/dist here as backend/static. nginx strips the
# /tc_compliance prefix before proxying, so this process only ever sees
# unprefixed paths (/assets/index-*.js, not /tc_compliance/assets/index-*.js).
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if STATIC_DIR.is_dir():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        """Serve a real static file if one exists, else index.html."""
        # An /api/* path reaching this point means no API route matched it —
        # a typo or a removed endpoint. Fail loudly as JSON instead of
        # returning 200 text/html, which is near-impossible to debug from the
        # browser side.
        if full_path == "api" or full_path.startswith("api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        if full_path:
            # resolve() before serving: a request for "../../etc/passwd" would
            # otherwise escape STATIC_DIR and hand back an arbitrary file.
            candidate = (STATIC_DIR / full_path).resolve()
            if candidate.is_file() and candidate.is_relative_to(STATIC_DIR.resolve()):
                return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")

else:
    print(f"⚠️  WARNING: no built frontend at {STATIC_DIR} — serving API only")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)