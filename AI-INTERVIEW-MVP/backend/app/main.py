import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import interview, evaluation, results

load_dotenv()

app = FastAPI(
    title="AI Interview MVP API",
    version="0.1.0",
    description="Backend API for AI-assisted technical interviews and proctoring evaluation"
)

# Allow React frontend on localhost
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def api_health():
    """Health check endpoint required for Hour 1."""
    return {
        "status": "success",
        "message": "AI Interview Backend is running"
    }

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "AI Interview Backend is running",
        "docs": "/docs"
    }

# Hour 2+ routes (supports both /api/interview and /interview)
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(evaluation.router, prefix="/api/evaluation", tags=["Evaluation"])
app.include_router(results.router, prefix="/results", tags=["Results"])
