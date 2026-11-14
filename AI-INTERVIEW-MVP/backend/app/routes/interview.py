from fastapi import APIRouter
from app.services.question_generator import get_all_questions

router = APIRouter()

@router.get("/questions")
def list_questions():
    return get_all_questions()

@router.post("/session/start")
def start_interview_session(candidate_name: str = "Candidate", role: str = "Full Stack Engineer"):
    return {
        "session_id": "sess_demo_123",
        "candidate_name": candidate_name,
        "role": role,
        "status": "in_progress"
    }
