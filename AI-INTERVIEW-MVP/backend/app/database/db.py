SESSION_DATA = {}

# Stores generated adaptive questions keyed by interview_id.
# Structure: { interview_id: { question_id: { role, title, reference_answer, evaluation_concepts } } }
ADAPTIVE_QUESTION_STORE: dict = {}


def get_session_summary(session_id: str):
    return SESSION_DATA.get(session_id, {
        "session_id": session_id,
        "overallScore": 88,
        "technicalScore": 86,
        "integrityScore": 95,
        "feedback": "Clear explanations with structured responses. Consistent focus throughout the interview."
    })


def save_adaptive_question(interview_id: str, question_id: str, data: dict) -> None:
    """Persist a generated adaptive question for the given interview session."""
    if interview_id not in ADAPTIVE_QUESTION_STORE:
        ADAPTIVE_QUESTION_STORE[interview_id] = {}
    ADAPTIVE_QUESTION_STORE[interview_id][question_id] = data


def get_adaptive_question(interview_id: str, question_id: str) -> dict | None:
    """Retrieve a generated adaptive question by interview and question ID."""
    return ADAPTIVE_QUESTION_STORE.get(interview_id, {}).get(question_id)
