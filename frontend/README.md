FRONTEND Setup
==============

## Overview
React.js frontend with Vite build tool for the Steel Grade Comparison System.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment (optional):
   ```bash
   # Create .env file (defaults to http://localhost:8000)
   VITE_API_URL=http://localhost:8000
   ```

3. Start development server:
   ```bash
   npm run dev
   ```
   Access at: http://localhost:3000

4. Build for production:
   ```bash
   npm run build
   ```
   Output in: `dist/` directory

## Features

### Pipeline 1: Manual Comparison
- Upload PDF
- Select standard from list
- Run comparison
- View results
- Download PDF report

### Pipeline 2: Auto Match
- Upload PDF
- LLM automatically finds best match
- View top 5 matches with scores

## Technology Stack
- React 18
- Vite
- Axios
- CSS3

## Project Structure

```
src/
├── App.jsx       # Main app component (Pipeline 1 & 2)
├── main.jsx      # Entry point
└── index.css     # Global styles

index.html        # HTML template
vite.config.js    # Vite configuration
package.json      # Dependencies
```

## Environment Variables
- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)

## API Integration

The frontend communicates with the backend at `http://localhost:8000`.

Key endpoints used:
- `GET /standards/list` - Load available standards
- `POST /extract/test-json` - Extract PDF values
- `POST /compare/direct` - Run direct comparison
- `POST /compare/auto` - Run auto-match

## Styling

All styles are in `src/index.css`. The UI includes:
- Two-tab interface
- PDF upload and preview
- Property comparison tables
- Color-coded results (pass/fail)
- Responsive design

## Performance Tips
- CSS is optimized for mobile first
- Images/assets should be optimized
- Consider lazy loading for large reports

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Port 3000 already in use
```bash
npm run dev -- --port 3001
```

### API calls failing
- Check backend is running on http://localhost:8000
- Check browser console (F12) for CORS errors
- Verify network connection

### Dependencies issues
```bash
rm node_modules package-lock.json
npm install
```

## Production Build

```bash
npm run build
npm run preview  # Preview production build locally

# Deploy dist/ folder to web server
```
