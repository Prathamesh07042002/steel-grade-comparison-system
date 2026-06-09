BACKEND Setup
=============

## Overview
FastAPI backend that exposes the comparator functions via REST APIs.

## Quick Start

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment:
   ```bash
   # Copy .env.example or create .env with Mistral API key
   MISTRAL_API_KEY=your_key_here
   ```

3. Run the server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Access API documentation:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Health Check
```
GET /health
```

### Standards
```
GET /standards/list
GET /standards/{standard_name}
```

### PDF Processing
```
POST /extract/pdf-text
POST /extract/test-json
```

### Comparison
```
POST /compare/direct
POST /compare/auto
```

### Report
```
POST /report/generate-pdf
```

## Environment Variables
- `MISTRAL_API_KEY` - Your Mistral API key

## Requirements
- Python 3.8+
- See requirements.txt

## CORS
CORS is enabled for all origins by default. Modify in `app/main.py` if needed.

## Production
Use a production ASGI server like Gunicorn:
```bash
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```
