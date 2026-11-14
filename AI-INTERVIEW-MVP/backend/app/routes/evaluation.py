from fastapi import APIRouter
from app.schemas.interview import AnswerSubmission, EvaluationResponse
from app.services.ai_engine import evaluate_candidate_answer

router = APIRouter()

@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate_answer(submission: AnswerSubmission):
    return evaluate_candidate_answer(submission)
