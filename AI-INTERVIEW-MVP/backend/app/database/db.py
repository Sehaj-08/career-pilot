SESSION_DATA = {}

def get_session_summary(session_id: str):
    return SESSION_DATA.get(session_id, {
        "session_id": session_id,
        "overallScore": 88,
        "technicalScore": 86,
        "integrityScore": 95,
        "feedback": "Clear explanations with structured responses. Consistent focus throughout the interview."
    })
