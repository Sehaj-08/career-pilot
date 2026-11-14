import json
import os
from typing import List, Dict, Any, Optional

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

    # Strip reference answers & evaluation concepts for client responses
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
