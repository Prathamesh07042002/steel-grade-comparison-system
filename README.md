# Steel Grade Comparison System

This is a complete 3-folder architecture for the Steel Grade Comparison System with separate backend, comparator, and frontend components.

## Project Structure

```
steel-grade-comparison-system/
├── comparator/                # Core comparison logic (DO NOT MODIFY)
│   ├── src/
│   │   ├── __init__.py
│   │   ├── ocr.py            # PDF text extraction
│   │   ├── extractor.py       # Property extraction from OCR text
│   │   ├── comparator.py      # Direct compare & auto-match logic
│   │   └── report.py          # PDF report generation
│   ├── data/
│   │   └── standards_json/    # Standard specifications (JSON files)
│   ├── .env                   # API keys for comparator
│   └── requirements.txt       # Python dependencies
│
├── backend/                   # FastAPI Backend Server
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py           # FastAPI application with all endpoints
│   ├── .env                  # API keys for backend
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React.js Frontend
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Styling
│   ├── index.html           # HTML entry
│   ├── package.json         # Node dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── .env                 # Frontend environment variables
│   └── .gitignore
│
└── README.md                # This file
```

## Quick Start

### 1. Setup Environment Variables

#### Comparator `.env`
```bash
cd comparator
# Edit .env and add your Mistral API key
MISTRAL_API_KEY=your_mistral_api_key_here
```

#### Backend `.env`
```bash
cd backend
# Same as comparator
MISTRAL_API_KEY=your_mistral_api_key_here
```

#### Frontend `.env`
```bash
cd frontend
VITE_API_URL=http://localhost:8000
```

### 2. Install Dependencies

#### Backend (single requirements.txt at project root covers backend + comparator)
```bash
pip install -r requirements.txt
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Start the Services

#### Backend (Terminal 1)
```bash
cd backend
venv\Scripts\activate 
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
```

The frontend will be available at: http://localhost:3000

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Standards Management
- `GET /standards/list` - List all available standards
- `GET /standards/{standard_name}` - Get details of a specific standard

### PDF Processing
- `POST /extract/pdf-text` - Extract text from PDF using OCR
- `POST /extract/test-json` - Extract test values from PDF

### Comparison
- `POST /compare/direct` - Pipeline 1: Direct comparison against selected standard
- `POST /compare/auto` - Pipeline 2: Auto-match against all standards

### Report Generation
- `POST /report/generate-pdf` - Generate PDF report from comparison results

### Utilities
- `GET /utils/parse-properties` - Parse parameters into chemical and mechanical properties

## Features

### Pipeline 1: Manual Comparison
- Upload a test / mill-certificate PDF
- Choose a standard to compare against
- Get property-by-property pass/fail report
- Download PDF report

### Pipeline 2: Automatic Best-Match
- Upload a test PDF
- LLM scans ALL stored standards
- Automatically selects best-matching grade
- Returns top 5 matches ranked by match score

## Frontend Features

The React frontend mirrors the Streamlit UI with:
- **Two-tab interface** for Pipeline 1 and Pipeline 2
- **PDF upload and preview** functionality
- **Real-time comparison results** display
- **Color-coded pass/fail indicators**
- **Responsive design** for desktop and tablet
- **Modern UI** with smooth animations

## Technical Stack

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **Python 3.8+**

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Axios** - HTTP client
- **CSS3** - Styling

### Comparator (Core Logic)
- **Mistral AI API** - LLM for comparison and extraction
- **PyMuPDF (fitz)** - PDF text extraction
- **fpdf2** - PDF report generation

## Data Directory Structure

The `comparator/data/standards_json/` directory should contain JSON files for each steel standard:

```
comparator/data/standards_json/
├── BSK46.json
├── CEW-1.json
├── D513.json
├── DD1079.json
├── DP590.json
├── E34.json
├── EDD513.json
├── ERW-1.json
├── ERW-370.json
├── FE 410.json
├── HSLA 340.json
└── SS410.json
```

Each JSON file should follow this format:
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

## Important Notes

⚠️ **DO NOT MODIFY** the `comparator/` folder code. It contains core logic that should remain unchanged.

The backend uses the comparator functions to provide RESTful endpoints.

The frontend communicates with the backend via HTTP requests.

## Troubleshooting

### Backend fails to start
- Check if port 8000 is available
- Verify Python 3.8+ is installed
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check MISTRAL_API_KEY is set in .env

### Frontend fails to load
- Check if port 3000 is available
- Verify Node.js is installed
- Run `npm install` again if dependencies are missing
- Check browser console for errors (F12)

### API calls fail
- Verify backend is running on http://localhost:8000
- Check CORS is enabled (it is by default)
- Verify MISTRAL_API_KEY is valid in backend/.env

### No standards available
- Add JSON files to `comparator/data/standards_json/`
- Restart backend after adding standards

## Development Tips

1. **Hot Reload**: Both backend and frontend support hot reload during development
2. **API Documentation**: Visit http://localhost:8000/docs for interactive API docs
3. **Browser DevTools**: Use F12 to debug frontend issues
4. **Backend Logs**: Check terminal output for backend errors
5. **Network Tab**: Use browser Network tab to inspect API calls

## Production Deployment

### Backend
```bash
pip install -r requirements.txt
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

### Frontend
```bash
npm install
npm run build
# Serve dist/ folder with a web server (nginx, Apache, etc.)
```

## License

All rights reserved.
