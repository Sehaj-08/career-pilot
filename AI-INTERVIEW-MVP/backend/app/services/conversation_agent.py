import json
import os
import re
from typing import AsyncGenerator, Dict, List, Optional, Any
import httpx
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(env_path)
load_dotenv()

DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = "qwen3:4b-instruct-2507-q4_K_M"


class ConversationSession:
    """Manages multi-turn conversation and adaptive evaluation state."""

    def __init__(
        self,
        session_id: str,
        role: str,
        candidate_name: str = "Candidate",
        initial_question_title: str = "Explain how you would design a zero-downtime CI/CD deployment pipeline using Kubernetes and Canary or Blue-Green strategies.",
        initial_difficulty: str = "Medium",
    ):
        self.session_id = session_id
        self.role = role
        self.candidate_name = candidate_name
        self.current_question_number = 1
        self.total_questions = 5
        self.current_question_title = initial_question_title
        self.current_difficulty = initial_difficulty
        self.last_feedback = ""
        self.turn_count = 0
        self.messages: List[Dict[str, str]] = []

    def record_turn(self, candidate_answer: str, feedback: str, next_question: str) -> None:
        self.messages.append({
            "role": "user",
            "content": f"[Question {self.current_question_number}: {self.current_question_title}] Answer: {candidate_answer}"
        })
        self.messages.append({
            "role": "assistant",
            "content": f"Feedback: {feedback} | Next Question: {next_question}"
        })
        self.turn_count += 1


# In-memory session store
_active_sessions: Dict[str, ConversationSession] = {}


def get_or_create_session(
    session_id: str,
    role: str = "DevOps Engineer",
    candidate_name: str = "Candidate",
    initial_question_title: Optional[str] = None,
    initial_difficulty: str = "Medium",
) -> ConversationSession:
    """Retrieve or initialize an in-memory interview session."""
    if session_id not in _active_sessions:
        default_q = initial_question_title or "Explain how you would design a zero-downtime CI/CD deployment pipeline using Kubernetes and Canary or Blue-Green strategies."
        _active_sessions[session_id] = ConversationSession(
            session_id,
            role,
            candidate_name,
            initial_question_title=default_q,
            initial_difficulty=initial_difficulty,
        )
    return _active_sessions[session_id]


def _clean_spoken_text(text: str) -> str:
    """Removes any accidental Markdown characters for TTS synthesis."""
    cleaned = re.sub(r'[*_#`~]', '', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


async def evaluate_and_generate_next(
    session: ConversationSession,
    candidate_answer: str,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates candidate's spoken response, provides concise spoken feedback,
    and adaptively generates the next technical question matching the candidate's level.
    """
    ollama_url = (base_url or os.getenv("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL)).rstrip("/")
    ollama_model = model or os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)

    prompt = f"""You are Alex, a Principal Staff Engineer conducting a rigorous technical interview for a {session.role} position.

You must objectively evaluate the candidate's answer for technical accuracy, core principles, and depth.

Candidate was asked Question {session.current_question_number} of {session.total_questions}:
"{session.current_question_title}"

Candidate Spoken Answer:
"{candidate_answer}"

STRICT SCORING RUBRIC (Integer from 0 to 10):
- 0 to 2 (Completely Incorrect / Irrelevant): Answer is factually wrong, unrelated to the question, gibberish, or clearly guessing.
- 3 to 4 (Poor / Incomplete): Major technical misconceptions or missed the core concept entirely.
- 5 to 6 (Satisfactory / Basic): Foundational concepts mentioned, but lacks production depth, tools, or best practices.
- 7 to 8 (Proficient / Strong): Technically sound, accurate architecture, trade-offs, and practical mechanisms explained.
- 9 to 10 (Exceptional / Mastery): Deep production expertise, failure modes, scale, and best practices.

CRITICAL INSTRUCTION: You are a strict technical evaluator. If the candidate gives an answer that is incorrect, wrong, or off-topic, you MUST assign a score between 0 and 2. DO NOT give generous scores to incorrect answers.

TASKS:
1. "spoken_feedback": Provide 1 to 2 concise spoken sentences directly addressing the candidate ('You mentioned... however...'). Point out what was technically accurate (if any) and what key mechanism was wrong or missing. DO NOT use markdown, bullet points, asterisks, or quotes.
2. "score": Strict technical score (integer 0 to 10) according to the rubric above.
3. "next_difficulty":
   - If score >= 8: "Hard" (test architecture, failure modes, scale, consistency)
   - If score between 5 and 7: "Medium" (practical implementation and tools)
   - If score < 5: "Easy" (foundational building blocks and recovery)
4. "next_question_title": The next technical interview question (Question {session.current_question_number + 1} of {session.total_questions}) for {session.role} at the determined difficulty level. Make it build logically on the conversation. Provide ONLY the question sentence.

RESPOND ONLY IN VALID JSON matching this schema:
{{
  "spoken_feedback": "string",
  "score": 0,
  "next_difficulty": "Easy" | "Medium" | "Hard",
  "next_question_title": "string"
}}
"""

    payload = {
        "model": ollama_model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(f"{ollama_url}/api/generate", json=payload)
            if response.status_code == 200:
                raw_json = response.json().get("response", "{}")
                data = json.loads(raw_json)

                feedback = _clean_spoken_text(data.get("spoken_feedback", "Thank you for your answer."))
                raw_score = data.get("score")
                try:
                    score = max(0, min(10, int(raw_score))) if raw_score is not None else 0
                except (ValueError, TypeError):
                    score = 0

                next_diff = data.get("next_difficulty", "Medium")
                if next_diff not in ("Easy", "Medium", "Hard"):
                    next_diff = "Easy" if score < 5 else "Medium"
                next_q = _clean_spoken_text(data.get("next_question_title", f"Could you explain how foundational concepts work in {session.role}?"))

                return {
                    "spoken_feedback": feedback,
                    "score": score,
                    "next_difficulty": next_diff,
                    "next_question_title": next_q,
                }
    except Exception as exc:
        print(f"[conversation_agent] Evaluation error: {exc}")

    # Fallback response for unparseable or failed evaluation (Strict 0 score)
    return {
        "spoken_feedback": "I was unable to verify the technical concepts in that response. Let us proceed to the next question.",
        "score": 0,
        "next_difficulty": "Easy",
        "next_question_title": f"Let us return to the basics. Can you explain the core concepts of {session.role}?",
    }
