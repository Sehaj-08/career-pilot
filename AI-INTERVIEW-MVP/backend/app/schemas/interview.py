from typing import Optional, Dict, Any
from pydantic import BaseModel

class AnswerSubmission(BaseModel):
    question_id: Optional[int] = 1
    answer: str
    metrics: Optional[Dict[str, Any]] = None

class EvaluationResponse(BaseModel):
    question_id: Optional[int]
    score: int
    feedback: str

class InterviewResult(BaseModel):
    session_id: str
    overall_score: int
    technical_score: int
    integrity_score: int
    feedback: str
