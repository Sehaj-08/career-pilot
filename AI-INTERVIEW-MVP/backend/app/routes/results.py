from fastapi import APIRouter, HTTPException, status
from app.database.db import get_result, save_result
from app.schemas.interview import ResultSubmission

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_result(submission: ResultSubmission):
    """
    Save an interview result into SQLite.
    Prevents duplicates on repeated submissions (e.g. network retries).
    """
    try:
        data = submission.model_dump()
        saved = save_result(data)
        return {
            "status": "success",
            "message": "Interview result saved successfully",
            "id": saved["id"],
            "interview_id": saved["interview_id"],
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save interview result: {str(exc)}",
        )


@router.get("/{interview_id}")
def read_result(interview_id: str):
    """
    Retrieve a saved interview result by unique interview_id from SQLite.
    """
    cleaned_id = interview_id.strip()
    record = get_result(cleaned_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview result for '{cleaned_id}' not found",
        )

    return {
        "status": "success",
        "id": record["id"],
        "interview_id": record["interview_id"],
        "candidate": record["candidate"],
        "role": record["role"],
        "score": record["score"],
        "total_questions": record["total_questions"],
        "warnings": record["warnings"],
        "feedback": record["feedback"],
        "question_details": record["question_details"],
        "monitoring_events": record["monitoring_events"],
        "completed_at": record["completed_at"],
    }
