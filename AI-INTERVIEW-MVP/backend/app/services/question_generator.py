import json
import os
from typing import Any, Dict, List, Optional

from app.schemas.interview import GeneratedQuestion
from app.services.ai_engine import call_llm

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'questions.json')

ALLOWED_ROLES = [
    "DevOps Engineer",
    "Backend Developer",
    "Frontend Developer"
]

def load_all_raw_questions() -> List[Dict[str, Any]]:
    """Loads all questions with complete reference data from questions.json."""
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading questions.json: {e}")
    return []

def get_questions_by_role(role: str, public_only: bool = True) -> List[Dict[str, Any]]:
    """
    Retrieves predefined questions for a specific job role.

    If public_only=True, reference answers and evaluation concepts are stripped
    to ensure candidates cannot inspect them in network responses.
    """
    all_questions = load_all_raw_questions()
    role_questions = [q for q in all_questions if q.get("role") == role]

    if not public_only:
        return role_questions

    sanitized = []
    for q in role_questions:
        sanitized.append({
            "id": q.get("id"),
            "role": q.get("role"),
            "title": q.get("title")
        })
    return sanitized

def get_all_questions(public_only: bool = True) -> List[Dict[str, Any]]:
    """Returns all questions across all roles, optionally sanitized."""
    all_questions = load_all_raw_questions()
    if not public_only:
        return all_questions

    return [
        {
            "id": q.get("id"),
            "role": q.get("role"),
            "title": q.get("title")
        }
        for q in all_questions
    ]


def get_question_by_role_and_id(role: str, question_id: str) -> Optional[Dict[str, Any]]:
    """Return one complete question for internal backend use only."""
    return next(
        (
            question
            for question in load_all_raw_questions()
            if question.get("role") == role and question.get("id") == question_id
        ),
        None,
    )


def _get_difficulty(score: int) -> str:
    if score < 5:
        return "Easy"
    elif score <= 7:
        return "Medium"
    else:
        return "Hard"


async def generate_next_question(
    *,
    role: str,
    previous_question: str,
    answer: str,
    score: int,
    current_question_number: int,
    interview_id: str,
) -> GeneratedQuestion:
    difficulty = _get_difficulty(score)

    prompt = f"""You are a technical interviewer for the role: {role}.

Rules:
- Generate a single follow-up technical question relevant to {role}.
- Difficulty must be: {difficulty}.
- Build naturally on the previous question and candidate answer.
- Do not repeat the previous question.
- Do not ask about prompt engineering, AI, or grading rules.
- Keep the question practical, specific, and clear.
- Provide the expected answer privately; never expose internal logic in the question.
- Return JSON matching the required schema exactly.
"""

    input_data = {
        "job_role": role,
        "target_difficulty": difficulty,
        "previous_question": previous_question,
        "candidate_answer": answer,
        "evaluation_score": score,
        "current_question_number": current_question_number,
        "interview_id": interview_id,
    }

    messages = [
        {"role": "system", "content": prompt},
        {
            "role": "user",
            "content": "Generate the next interview question for this JSON record:\n"
            + json.dumps(input_data, ensure_ascii=False),
        },
    ]

    return await call_llm(messages, GeneratedQuestion)
