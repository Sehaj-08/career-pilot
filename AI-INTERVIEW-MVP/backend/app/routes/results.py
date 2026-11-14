from fastapi import APIRouter
from app.database.db import get_session_summary

router = APIRouter()

@router.get("/{session_id}")
def get_results(session_id: str):
    return get_session_summary(session_id)
