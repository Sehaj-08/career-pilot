import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

# Stable path to SQLite database file
DB_PATH = Path(__file__).resolve().parent / "interview.db"

# In-memory stores preserved from earlier hours
SESSION_DATA = {}
ADAPTIVE_QUESTION_STORE: dict = {}


def get_db_connection() -> sqlite3.Connection:
    """Create a thread-safe connection to the SQLite database."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the SQLite database and create tables if they do not exist."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interview_id TEXT UNIQUE NOT NULL,
                candidate TEXT NOT NULL,
                role TEXT NOT NULL,
                score REAL NOT NULL,
                total_questions INTEGER NOT NULL,
                warnings INTEGER NOT NULL,
                feedback TEXT NOT NULL,
                question_details TEXT NOT NULL,
                monitoring_events TEXT NOT NULL,
                completed_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_results_interview_id ON results (interview_id)"
        )
        conn.commit()
    finally:
        conn.close()


def save_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save or update an interview result in SQLite.
    Prevents duplicates on identical interview_id by updating the existing record.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        question_details_json = json.dumps(data.get("question_details", []))
        monitoring_events_json = json.dumps(data.get("monitoring_events", []))

        cursor.execute(
            """
            INSERT INTO results (
                interview_id, candidate, role, score, total_questions,
                warnings, feedback, question_details, monitoring_events, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(interview_id) DO UPDATE SET
                candidate = excluded.candidate,
                role = excluded.role,
                score = excluded.score,
                total_questions = excluded.total_questions,
                warnings = excluded.warnings,
                feedback = excluded.feedback,
                question_details = excluded.question_details,
                monitoring_events = excluded.monitoring_events,
                completed_at = excluded.completed_at
            """,
            (
                data["interview_id"],
                data["candidate"],
                data["role"],
                float(data["score"]),
                int(data["total_questions"]),
                int(data["warnings"]),
                data.get("feedback", ""),
                question_details_json,
                monitoring_events_json,
                data.get("completed_at", ""),
            ),
        )
        conn.commit()

        # Retrieve saved row id
        cursor.execute(
            "SELECT id FROM results WHERE interview_id = ?",
            (data["interview_id"],),
        )
        row = cursor.fetchone()
        row_id = row["id"] if row else None

        return {
            "id": row_id,
            "interview_id": data["interview_id"],
            "status": "success",
        }
    finally:
        conn.close()


def get_result(interview_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an interview result by interview_id from SQLite."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, interview_id, candidate, role, score, total_questions,
                   warnings, feedback, question_details, monitoring_events, completed_at
            FROM results
            WHERE interview_id = ?
            """,
            (interview_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        return {
            "id": row["id"],
            "interview_id": row["interview_id"],
            "candidate": row["candidate"],
            "role": row["role"],
            "score": row["score"],
            "total_questions": row["total_questions"],
            "warnings": row["warnings"],
            "feedback": row["feedback"],
            "question_details": json.loads(row["question_details"]),
            "monitoring_events": json.loads(row["monitoring_events"]),
            "completed_at": row["completed_at"],
        }
    finally:
        conn.close()


# In-memory functions preserved from previous hours
def get_session_summary(session_id: str):
    # If saved in SQLite, prefer SQLite record
    sqlite_record = get_result(session_id)
    if sqlite_record:
        return sqlite_record

    return SESSION_DATA.get(
        session_id,
        {
            "session_id": session_id,
            "overallScore": 88,
            "technicalScore": 86,
            "integrityScore": 95,
            "feedback": "Clear explanations with structured responses. Consistent focus throughout the interview.",
        },
    )


def save_adaptive_question(interview_id: str, question_id: str, data: dict) -> None:
    """Persist a generated adaptive question for the given interview session."""
    if interview_id not in ADAPTIVE_QUESTION_STORE:
        ADAPTIVE_QUESTION_STORE[interview_id] = {}
    ADAPTIVE_QUESTION_STORE[interview_id][question_id] = data


def get_adaptive_question(interview_id: str, question_id: str) -> Optional[dict]:
    """Retrieve a generated adaptive question by interview and question ID."""
    return ADAPTIVE_QUESTION_STORE.get(interview_id, {}).get(question_id)
