# Steel Grade Comparison System - Setup & Run Guide

## ✅ What Was Fixed

### Backend Fixes
1. **Enhanced `/compare/auto` endpoint**:
   - Added detailed logging for debugging
   - Improved error handling with proper cleanup
   - Better error messages showing exactly what failed
   - Proper temp file cleanup in all scenarios

2. **Fixed STANDARDS_JSON_DIR path**:
   - Corrected path resolution from backend directory
   - Added verification logging at startup

### Frontend Complete Rewrite
1. **Pipeline 1 (Manual Compare)**:
   - Upload PDF with preview
   - Select standard to compare against
   - Show extracted test values (chemical & mechanical)
   - Show standard preview before comparison
   - Display detailed comparison results with pass/fail indicators
   - Show properties not in standard, not in test

2. **Pipeline 2 (Auto Match)**:
   - Upload PDF with preview
   - LLM automatically matches against all standards
   - Shows best match with confidence score
   - Displays top 5 matches ranked by score
   - Shows detailed comparison for best match
   - Handles NO_MATCH case with closest attempt info

3. **Enhanced UI/UX**:
   - Modern gradient design
   - Responsive layout for mobile/tablet
   - Better error handling and messages
   - Step-by-step guidance
   - Real-time feedback during processing
   - Progress bars and verdicts (✅ PASS / ❌ FAIL / ⚠️ PARTIAL)

### CSS Complete Redesign
- Professional gradient backgrounds
- Smooth animations and transitions
- Color-coded results (green for pass, red for fail, orange for partial)
- Responsive design for all screen sizes
- Better typography and spacing
- Improved readability with proper contrast

## 🚀 How to Run

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create .env file in backend/ directory with:
MISTRAL_API_KEY=your_mistral_api_key_here

# Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 2. Frontend Setup

In a NEW terminal:

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The frontend will be available at: **http://localhost:3000**

### 3. Verify Setup

Before testing:
1. ✅ Check that standards JSON files exist in `comparator/data/standards_json/`
2. ✅ Verify MISTRAL_API_KEY is set in backend/.env
3. ✅ Ensure both backend and frontend servers are running

## 📋 Testing the Workflow

### Pipeline 1: Manual Comparison

1. Open http://localhost:3000
2. Go to **Pipeline 1 — Manual Compare** tab
3. Upload a steel test/mill certificate PDF
4. Preview the PDF if desired
5. Select a standard to compare against
6. Click **Compare Now**
7. View results:
   - Extracted test values (chemical & mechanical)
   - Comparison results with pass/fail
   - Properties breakdown
   - Detailed property table

### Pipeline 2: Automatic Best-Match

1. Go to **Pipeline 2 — Auto Match** tab
2. Upload a steel test/mill certificate PDF
3. Preview the PDF if desired
4. Click **Find Best Match**
5. View results:
   - Extracted test values
   - Best matching standard with confidence score
   - Match confidence progress bar
   - Top 5 alternative matches
   - Detailed property-by-property comparison

## 🔧 Troubleshooting

### Backend fails to start
```
Error: MISTRAL_API_KEY not set
→ Create backend/.env with your Mistral API key
```

```
Error: Port 8000 already in use
→ Change port: uvicorn app.main:app --port 8001
```

```
Error: Module not found (src.ocr, etc.)
→ Ensure comparator folder exists at the right level
→ Check sys.path.insert in main.py
```

### Frontend shows blank screen
```
Network error
→ Check backend is running on http://localhost:8000
→ Check browser console for CORS errors
→ Check backend logs for 500 errors
```

### Comparison fails with 500 error
```
Check backend logs for detailed error message
Common causes:
- PDF not readable/corrupted
- No steel data found in PDF
- Mistral API rate limit
- API key invalid
```

### No standards available
```
Add JSON files to: comparator/data/standards_json/
Each file should be: {grade_name: {parameters: [...]}}
Restart backend after adding
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Check API status

### Standards
- `GET /standards/list` - List all standards
- `GET /standards/{name}` - Get standard details

### Extraction
- `POST /extract/pdf-text` - Extract text from PDF
- `POST /extract/test-json` - Extract test values from PDF

### Comparison
- `POST /compare/direct` - Manual comparison (Pipeline 1)
- `POST /compare/auto` - Auto-match (Pipeline 2)

### Report
- `POST /report/generate-pdf` - Generate comparison report

### Utilities
- `GET /utils/parse-properties` - Parse properties

## 🎯 Key Features Working

✅ PDF upload and preview
✅ OCR text extraction
✅ Test value extraction (chemical & mechanical)
✅ Manual comparison against standards
✅ Automatic best-match detection
✅ Pass/fail verdict with confidence scores
✅ Property-by-property comparison
✅ Top 5 matches ranking
✅ Responsive mobile-friendly UI
✅ Error handling and user feedback
✅ Step-by-step guidance

## 📝 Notes

- The comparator folder logic is NOT modified (as requested)
- Only frontend and backend were enhanced
- All comparator functions work as-is
- The LLM (Mistral) handles the actual comparison logic
- OCR uses PyMuPDF for PDF text extraction
- Reports are generated with fpdf2

## 🚨 Important

- **Do NOT modify** files in the `comparator/` folder - they contain core logic
- **Keep MISTRAL_API_KEY safe** - never commit it to version control
- **Standards JSON files** should follow the expected format
- **PDF uploads** are temporary and deleted after processing

---

**System is now ready to use end-to-end!** 🎉
