from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.question_generator import (
    get_questions_by_role, 
    get_all_questions, 
    ALLOWED_ROLES
)

router = APIRouter()

ROLE_SLUG_MAP = {
    "devops": "DevOps Engineer",
    "backend": "Backend Developer",
    "frontend": "Frontend Developer",
    "devops-engineer": "DevOps Engineer",
    "backend-developer": "Backend Developer",
    "frontend-developer": "Frontend Developer",
    "devops engineer": "DevOps Engineer",
    "backend developer": "Backend Developer",
    "frontend developer": "Frontend Developer"
}

class SessionStartRequest(BaseModel):
    candidate_name: str = "Candidate"
    role: str = "Backend Developer"

@router.get("/questions")
def list_questions(role: Optional[str] = Query(None, description="Target job role")):
    """
    Fetches predefined interview questions.
    If role is specified, returns the 5 sanitized questions for that role.
    Reference answers and evaluation concepts are stripped on the backend.
    """
    if role:
        # Check normalized slug or exact role match
        normalized_role = ROLE_SLUG_MAP.get(role.lower().strip()) or role
        if normalized_role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid job role: '{role}'. Allowed roles: {ALLOWED_ROLES}"
            )
        questions = get_questions_by_role(normalized_role, public_only=True)
        return {
            "status": "success",
            "role": normalized_role,
            "total_questions": len(questions),
            "questions": questions
        }

    questions = get_all_questions(public_only=True)
    return {
        "status": "success",
        "total_questions": len(questions),
        "questions": questions
    }

@router.get("/questions/{role_slug}")
def list_questions_by_slug(role_slug: str):
    """
    Fetches questions by slug path parameter:
    e.g. /questions/devops, /questions/backend, /questions/frontend
    """
    slug_key = role_slug.lower().strip()
    matched_role = ROLE_SLUG_MAP.get(slug_key)
    
    if not matched_role:
        for r in ALLOWED_ROLES:
            if r.lower() == slug_key:
                matched_role = r
                break
                
    if not matched_role:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid job role: '{role_slug}'. Allowed slugs: ['devops', 'backend', 'frontend'] or roles: {ALLOWED_ROLES}"
        )
        
    return list_questions(role=matched_role)

@router.post("/session/start")
def start_interview_session(payload: SessionStartRequest):
    """
    Initializes a new interview session and returns metadata with questions.
    """
    normalized_role = ROLE_SLUG_MAP.get(payload.role.lower().strip()) or payload.role
    if normalized_role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid job role: '{payload.role}'. Allowed roles: {ALLOWED_ROLES}"
        )

    questions = get_questions_by_role(normalized_role, public_only=True)
    session_id = f"sess_{normalized_role.lower().replace(' ', '_')}_{abs(hash(payload.candidate_name)) % 10000}"

    return {
        "status": "success",
        "session_id": session_id,
        "candidate_name": payload.candidate_name,
        "role": normalized_role,
        "duration_minutes": 30,
        "total_questions": len(questions),
        "questions": questions
    }
