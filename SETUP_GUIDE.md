# Steel Grade Comparison System - Quick Start Guide

## 🚀 Getting Started

This project is now organized into 3 separate folders:
- **comparator/** - Core comparison logic (DO NOT MODIFY)
- **backend/** - FastAPI backend server
- **frontend/** - React.js frontend

## ⚡ Quick Setup (5 minutes)

### Step 1: Configure API Keys

Edit these .env files with your Mistral API key:

```bash
# Backend
backend/.env
MISTRAL_API_KEY=your_mistral_api_key_here

# Comparator
comparator/.env
MISTRAL_API_KEY=your_mistral_api_key_here
```

### Step 2: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 4: Start Backend (Terminal 1)

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 5: Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

### Step 6: Open in Browser

Visit: **http://localhost:3000**

## 📋 What Each Folder Does

### Comparator (comparator/)
**Core Business Logic - DO NOT TOUCH**

Contains:
- PDF text extraction (OCR)
- Property extraction from text
- Comparison algorithms
- PDF report generation

Usage: Only used by the backend API

### Backend (backend/)
**FastAPI Server on port 8000**

Features:
- RESTful APIs for all operations
- PDF upload and processing
- Comparison endpoints (direct & auto)
- Standard management
- Report generation
- CORS enabled for frontend

Access:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend (frontend/)
**React.js UI on port 3000**

Features:
- Two-tab interface (Pipeline 1 & 2)
- PDF upload and preview
- Standards selection
- Real-time comparison results
- Color-coded pass/fail indicators
- Responsive design

## 🔧 API Endpoints

All endpoints start with `http://localhost:8000`

```
GET    /health                    - Health check
GET    /standards/list            - List all standards
GET    /standards/{name}          - Get standard details
POST   /extract/pdf-text          - Extract text from PDF
POST   /extract/test-json         - Extract test values
POST   /compare/direct            - Manual comparison
POST   /compare/auto              - Auto-match comparison
POST   /report/generate-pdf       - Generate PDF report
```

Full documentation: http://localhost:8000/docs

## 📂 Data Management

Add standard JSON files to:
```
comparator/data/standards_json/
```

Format example:
```json
{
  "GRADE_NAME": {
    "parameters": [
      {"element": "C%", "rv": "0.10 max"},
      {"element": "Mn%", "rv": "0.40-0.80"},
      {"element": "YS MPa", "rv": "330-410"}
    ]
  }
}
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check port 8000 is free
lsof -i :8000
# Check dependencies
pip install -r requirements.txt
# Check .env file
cat backend/.env
```

### Frontend won't start
```bash
# Check port 3000 is free
lsof -i :3000
# Reinstall dependencies
rm -rf frontend/node_modules package-lock.json
npm install
```

### API calls failing
- Check backend is running on http://localhost:8000
- Check CORS in backend/.env (should be enabled by default)
- Check browser console for errors (F12)
- Verify MISTRAL_API_KEY is set

### No standards showing
- Add JSON files to `comparator/data/standards_json/`
- Restart backend after adding files

## 📦 Requirements

- Python 3.8+
- Node.js 16+
- npm or yarn
- Mistral API key

## 📝 File Structure

```
steel-grade-comparison-system/
├── comparator/              # Core logic (read-only)
│   ├── src/
│   │   ├── ocr.py
│   │   ├── extractor.py
│   │   ├── comparator.py
│   │   └── report.py
│   ├── data/standards_json/
│   ├── requirements.txt
│   └── .env
├── backend/                 # FastAPI server
│   ├── app/main.py
│   ├── requirements.txt
│   └── .env
├── frontend/                # React UI
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md               # This file
```

## 🚀 Next Steps

1. **Add your data**: Copy standard JSON files to `comparator/data/standards_json/`
2. **Test the UI**: Open http://localhost:3000
3. **Try Pipeline 1**: Upload a test PDF and select a standard
4. **Try Pipeline 2**: Upload a test PDF for auto-matching
5. **Read the docs**: Check README.md in each folder for detailed info

## 📚 Documentation

- **Main README**: `README.md`
- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`
- **Comparator README**: `comparator/README.md`
- **API Docs**: http://localhost:8000/docs

## ⚠️ Important Notes

- **DO NOT modify** files in `comparator/` folder
- Keep API keys in `.env` files (never commit to git)
- Backend must run before frontend can work
- Ensure ports 8000 and 3000 are available

## 🆘 Need Help?

Check the README files in each folder for:
- Environment setup
- Detailed API documentation
- Common issues and solutions
- Development tips

Happy testing! 🎉
