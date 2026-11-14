# AI-INTERVIEW-MVP

An AI-powered technical interview and automated proctoring platform designed for scalable candidate assessment.

## Project Structure

```text
AI-INTERVIEW-MVP/
├── frontend/                 # Vite + React Client Application
│   ├── public/models/        # Mediapipe Face Detector model assets
│   ├── src/
│   │   ├── components/       # Reusable UI & Monitoring components
│   │   ├── pages/            # View pages (Login, Dashboard, Interview, Result)
│   │   ├── hooks/            # Custom hooks for webcam & proctoring logic
│   │   ├── services/         # API client & backend service connections
│   │   ├── utils/            # Scoring and event logging utilities
│   │   ├── App.jsx           # Application Router
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styling
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── backend/                  # FastAPI Application
    ├── app/
    │   ├── routes/           # API routes (interview, evaluation, results)
    │   ├── services/         # AI grading engine & question generation
    │   ├── database/         # Session database / state persistence
    │   ├── data/             # Default question bank (JSON)
    │   ├── schemas/          # Pydantic data schemas
    │   └── main.py           # FastAPI entrypoint
    ├── requirements.txt
    └── .env                  # Environment variables
```

## Features

- **Automated AI Interviewer**: Tailored technical questions with live timer and AI scoring.
- **Real-Time Proctoring & Monitoring**: Webcam monitoring, gaze/face detection alerts, and event logging.
- **Instant AI Feedback**: In-depth evaluation with technical accuracy, clarity, and improvement recommendations.
- **Comprehensive Scorecard**: Automated aggregation of technical performance and proctoring integrity scores.

## Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
