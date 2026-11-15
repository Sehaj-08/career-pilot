from typing import Any, Dict, List, Optional

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


class AdaptiveQuestionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(min_length=1, max_length=100)
    previous_question: str = Field(min_length=1, max_length=1_000)
    answer: str = Field(min_length=1, max_length=10_000)
    score: int = Field(strict=True, ge=0, le=10)
    current_question_number: int = Field(strict=True, ge=1, le=5)
    interview_id: str = Field(min_length=1, max_length=100)

    @field_validator("role", "previous_question", "answer", "interview_id")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class GeneratedQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=5, max_length=1_000)
    difficulty: str = Field(min_length=3, max_length=50)
    expected_answer: str = Field(min_length=5, max_length=5_000)
    important_concepts: List[str] = Field(min_length=1, max_length=10)

    @field_validator("question", "difficulty", "expected_answer")
    @classmethod
    def strip_str(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class AdaptiveQuestionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: str
    question: str
    difficulty: str


VALID_JOB_ROLES = {"DevOps Engineer", "Backend Developer", "Frontend Developer"}


class ResultSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interview_id: str = Field(min_length=1, max_length=100)
    candidate: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=100)
    score: float = Field(ge=0.0, le=10.0)
    total_questions: int = Field(ge=0, le=5)
    warnings: int = Field(ge=0)
    feedback: str = Field(default="", max_length=5_000)
    question_details: List[Dict[str, Any]] = Field(default_factory=list)
    monitoring_events: List[Dict[str, Any]] = Field(default_factory=list)
    completed_at: str = Field(min_length=1, max_length=100)

    @field_validator("interview_id", "candidate", "completed_at")
    @classmethod
    def strip_required_strings(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        stripped = value.strip()
        if stripped not in VALID_JOB_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_JOB_ROLES)}")
        return stripped

