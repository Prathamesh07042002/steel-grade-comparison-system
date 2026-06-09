# Migration Guide - From Streamlit to FastAPI + React

## What Changed?

Your monolithic Streamlit application has been refactored into a modern 3-tier architecture:

### Before (Monolithic)
```
app.py                    (Streamlit UI + Logic mixed)
src/
├── ocr.py
├── extractor.py
├── comparator.py
└── report.py
```

### After (Modular 3-Tier)
```
comparator/              (Core Logic - Unchanged)
backend/                 (FastAPI REST API)
frontend/                (React.js UI)
```

## Architecture Benefits

✅ **Separation of Concerns** - Logic, API, and UI are separate
✅ **Scalability** - Each component can scale independently
✅ **Flexibility** - Can add mobile app, desktop client, etc.
✅ **Maintainability** - Easier to understand and modify
✅ **Testability** - Each component can be tested independently
✅ **Reusability** - Backend APIs can be used by any frontend

## File Mapping

### Comparator Folder (No Changes)
```
OLD: src/ocr.py              → NEW: comparator/src/ocr.py
OLD: src/extractor.py        → NEW: comparator/src/extractor.py
OLD: src/comparator.py       → NEW: comparator/src/comparator.py
OLD: src/report.py           → NEW: comparator/src/report.py
```

### Backend Folder (New)
The FastAPI backend wraps all comparator functions and exposes them as REST APIs:

```
NEW: backend/app/main.py

Contains endpoints:
- GET /health
- GET /standards/list
- GET /standards/{name}
- POST /extract/pdf-text
- POST /extract/test-json
- POST /compare/direct
- POST /compare/auto
- POST /report/generate-pdf
```

### Frontend Folder (New)
The React frontend replicates the Streamlit UI:

```
NEW: frontend/src/App.jsx

Contains:
- Pipeline 1: Manual Comparison Tab
- Pipeline 2: Auto Match Tab
- PDF Upload & Preview
- Standards Selection
- Results Display
- Report Download
```

## UI Comparison

### Pipeline 1 - Manual Compare
**Streamlit**:
```
1. Upload PDF
2. Choose Standard
3. Click Compare
4. View Results
5. Download Report
```

**React**:
```
Tab 1: Pipeline 1 — Manual Compare
1. Upload PDF (with preview)
2. Choose Standard (dropdown)
3. Click Compare Now
4. View Results (tabbed: Chemical/Mechanical)
5. Download Report (from API)
```

### Pipeline 2 - Auto Match
**Streamlit**:
```
1. Upload PDF
2. Click Find Best Match
3. View Auto-matched Results
4. Download Report
```

**React**:
```
Tab 2: Pipeline 2 — Auto Match
1. Upload PDF (with preview)
2. Click Find Best Match
3. View Results (verdict + top 5 matches)
4. Download Report (from API)
```

## API Calls Mapping

### Manual Compare Flow

**Streamlit**:
```python
text = extract_text_from_pdf(pdf_path)
test_entry = extract_test_json(text)
chem_res = direct_compare(test_props, std_props)
mech_res = direct_compare(test_props, std_props)
```

**FastAPI Backend**:
```
POST /extract/test-json         (upload PDF)
GET  /standards/{name}           (fetch standard)
POST /compare/direct             (run comparison)
POST /report/generate-pdf        (generate report)
```

**React Frontend**:
```javascript
axios.post('/extract/test-json', formData)
axios.get('/standards/standard-name')
axios.post('/compare/direct', {test_props, std_props})
axios.post('/report/generate-pdf', {...})
```

### Auto Match Flow

**Streamlit**:
```python
text = extract_text_from_pdf(pdf_path)
test_entry = extract_test_json(text)
result = llm_compare(test_entry, standards_dir)
```

**FastAPI Backend**:
```
POST /compare/auto (upload PDF, internally calls extract & llm_compare)
```

**React Frontend**:
```javascript
axios.post('/compare/auto', formData)
```

## Data Models

### Test Data Structure (Unchanged)
```json
{
  "grade": "CR3",
  "supply_spec": "TS4012",
  "drawing_designation": "CR3",
  "steel_grade_form": "Cold Rolled",
  "chemical_properties": {"C%": "0.06", "Mn%": "0.35"},
  "mechanical_properties": {"YS MPa": "320", "UTS MPa": "420", "EL %": "38"}
}
```

### Comparison Result (Unchanged)
```json
{
  "matched": {
    "YS MPa": {
      "test_value": "320",
      "standard_value": "330-410",
      "within_range": false,
      "note": "range 330-410"
    }
  },
  "not_in_standard": {"extra_prop": "value"},
  "not_in_test": {"missing_prop": "value"}
}
```

## Environment Variables

### Before (Streamlit)
```
MISTRAL_API_KEY=xxx
```

### After
```
# backend/.env
MISTRAL_API_KEY=xxx

# comparator/.env
MISTRAL_API_KEY=xxx

# frontend/.env
VITE_API_URL=http://localhost:8000
```

## Port Assignments

```
Backend:  http://localhost:8000
Frontend: http://localhost:3000
```

## Key Differences

### State Management
- **Streamlit**: Session state built into Streamlit
- **React**: Component state with hooks (useState)
- **Backend**: Stateless REST API

### File Handling
- **Streamlit**: `st.file_uploader()` returns file-like object
- **React**: FormData with Axios multipart upload
- **Backend**: FastAPI's UploadFile

### UI Styling
- **Streamlit**: Built-in Streamlit components with CSS customization
- **React**: Custom CSS with modern design (CSS Grid, Flexbox)

### PDF Preview
- **Streamlit**: Base64 encoded PDF in iframe
- **React**: Base64 encoded PDF in iframe (same approach)

### Results Display
- **Streamlit**: st.columns(), st.tabs(), st.markdown()
- **React**: HTML tables, divs, custom components

## Migration Checklist

✅ Comparator code copied (untouched)
✅ Backend APIs created wrapping comparator functions
✅ Frontend UI replicated with React
✅ PDF upload/preview working
✅ Standards list loading
✅ Direct comparison working
✅ Auto-match comparison working
✅ Report generation working
✅ Error handling implemented
✅ CORS enabled
✅ Environment configuration done

## Testing the Migration

### Test Pipeline 1
1. Start backend: `python -m uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Visit http://localhost:3000
4. Upload a test PDF
5. Select a standard
6. Click "Compare Now"
7. Verify results display
8. Download report

### Test Pipeline 2
1. Upload a test PDF
2. Click "Find Best Match"
3. Verify top matches display
4. Check match scores are correct

## Rollback to Streamlit (if needed)

Keep the old `app.py` and Streamlit setup in a separate branch/folder for reference.

## Future Enhancements

Now that we have REST APIs, you can:
- Add a mobile app (Flutter, React Native)
- Add desktop app (Electron, PyQt)
- Add batch processing API
- Add user authentication
- Add database for storing comparisons
- Add more advanced analytics
- Integrate with other systems via APIs

## Performance Notes

- Backend can serve multiple frontends
- Frontend requests are cached (consider Redux/Context for larger app)
- PDF uploads are handled by FastAPI efficiently
- LLM calls are made server-side (not exposed to frontend)

## Security Improvements

- API keys kept server-side (never sent to frontend)
- CORS properly configured
- Input validation via Pydantic
- Error messages sanitized
- PDF processing isolated

## Questions?

Refer to README files in each folder:
- `backend/README.md` - Backend API documentation
- `frontend/README.md` - Frontend setup and features
- `comparator/README.md` - Core logic documentation
