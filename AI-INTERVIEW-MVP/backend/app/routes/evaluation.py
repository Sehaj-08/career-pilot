from fastapi import APIRouter, HTTPException, status

from app.schemas.interview import AnswerSubmission, EvaluationResponse
from app.services.ai_engine import (
    AIEngineError,
    AIResponseError,
    OllamaConnectionError,
    OllamaModelUnavailableError,
    OllamaTimeoutError,
    evaluate_candidate_answer,
)
from app.services.question_generator import ALLOWED_ROLES, get_question_by_role_and_id


router = APIRouter()


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(submission: AnswerSubmission) -> EvaluationResponse:
    if submission.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid job role: '{submission.role}'. "
                f"Allowed roles: {ALLOWED_ROLES}"
            ),
        )

    question = get_question_by_role_and_id(submission.role, submission.question_id)
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Question '{submission.question_id}' was not found for role "
                f"'{submission.role}'."
            ),
        )

    try:
        evaluation = await evaluate_candidate_answer(
            question=question["title"],
            reference_answer=question["reference_answer"],
            evaluation_concepts=question["evaluation_concepts"],
            candidate_answer=submission.answer,
        )
    except OllamaModelUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"AI model '{exc.model}' is unavailable. "
                f"Install it with: ollama pull {exc.model}"
            ),
        ) from exc
    except OllamaConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI evaluation service is unavailable. Ensure Ollama is running.",
        ) from exc
    except OllamaTimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI evaluation timed out. Please retry your answer.",
        ) from exc
    except AIResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI evaluation returned an invalid response. Please retry.",
        ) from exc
    except AIEngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI evaluation failed. Please retry.",
        ) from exc

    return EvaluationResponse(
        question_id=submission.question_id,
        **evaluation.model_dump(),
    )
