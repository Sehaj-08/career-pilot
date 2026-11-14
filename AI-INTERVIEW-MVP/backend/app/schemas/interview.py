from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AnswerSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(min_length=1, max_length=100)
    question_id: str = Field(min_length=1, max_length=100)
    answer: str = Field(min_length=1, max_length=10_000)

    @field_validator("role", "question_id", "answer")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class AIEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score: int = Field(strict=True, ge=0, le=10)
    feedback: str = Field(min_length=1, max_length=2_000)
    strengths: List[str] = Field(max_length=5)
    improvements: List[str] = Field(max_length=5)

    @field_validator("feedback")
    @classmethod
    def strip_feedback(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("feedback must not be empty")
        return stripped

    @field_validator("strengths", "improvements")
    @classmethod
    def validate_list_items(cls, values: List[str]) -> List[str]:
        cleaned = [item.strip() for item in values]
        if any(not item or len(item) > 500 for item in cleaned):
            raise ValueError("items must contain 1-500 characters")
        return cleaned


class EvaluationResponse(AIEvaluation):
    question_id: str


class InterviewResult(BaseModel):
    session_id: str
    overall_score: int
    technical_score: int
    integrity_score: int
    feedback: str
