import json
import os
import re
from typing import AsyncGenerator, Dict, List, Optional
import httpx
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(env_path)
load_dotenv()

DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = "qwen3:4b-instruct-2507-q4_K_M"


class ConversationSession:
    """Manages multi-turn conversation state for a live candidate interview."""

    def __init__(self, session_id: str, role: str, candidate_name: str = "Candidate"):
        self.session_id = session_id
        self.role = role
        self.candidate_name = candidate_name
        self.turn_count = 0
        self.current_difficulty = "Medium"
        self.messages: List[Dict[str, str]] = [
            {"role": "system", "content": self._build_system_prompt()}
        ]

    def _build_system_prompt(self) -> str:
        return f"""You are Alex, a Principal Engineer conducting a live technical voice interview with {self.candidate_name} for the role of {self.role}.

CRITICAL SPOKEN DIALOGUE RULES:
1. Your responses will be read aloud via Text-to-Speech. Never use Markdown formatting, bullet points, asterisks, code blocks, or emojis. Write plain, natural spoken conversational English.
2. Keep each turn short and conversational: 2 to 4 sentences maximum. Never deliver long lectures or monologues.
3. Always acknowledge the candidate's last answer naturally before moving to your question or follow-up.
4. Adapt the difficulty dynamically based on the candidate's technical depth:
   - High Depth: If the candidate gives a strong, accurate answer, immediately escalate to harder topics like system failure modes, scale bottlenecks, consistency trade-offs, and edge cases.
   - Surface-level Depth: If the answer is basic or generic, probe for concrete technical mechanisms and implementation details.
   - Low Depth / Incorrect: If the candidate struggles or makes mistakes, acknowledge gracefully, provide a gentle hint, and pivot to a foundational concept.
5. Guide the conversation through core {self.role} competencies smoothly without jumping abruptly between unrelated subjects.
"""

    def add_candidate_message(self, text: str) -> None:
        self.messages.append({"role": "user", "content": text.strip()})
        self.turn_count += 1

    def add_assistant_message(self, text: str) -> None:
        self.messages.append({"role": "assistant", "content": text.strip()})


# In-memory session store (active voice interview sessions)
_active_sessions: Dict[str, ConversationSession] = {}


def get_or_create_session(session_id: str, role: str = "DevOps Engineer", candidate_name: str = "Candidate") -> ConversationSession:
    """Retrieve or initialize an in-memory interview session."""
    if session_id not in _active_sessions:
        _active_sessions[session_id] = ConversationSession(session_id, role, candidate_name)
    return _active_sessions[session_id]


def extract_sentences(buffer: str) -> tuple[list[str], str]:
    """
    Extracts complete sentences from a streaming text buffer.
    Returns (list_of_completed_sentences, remaining_uncompleted_buffer).
    """
    sentences = []
    while True:
        match = re.search(r'([A-Za-z0-9\)\]"][.?!])(\s+|\n+)', buffer)
        if not match:
            break
        end_idx = match.end()
        candidate = buffer[:end_idx].strip()
        # Avoid splitting on common abbreviations
        if candidate.lower().endswith(("e.g.", "i.e.", "vs.", "etc.", "mr.", "dr.")):
            break
        sentences.append(candidate)
        buffer = buffer[end_idx:]
    return sentences, buffer


def _clean_spoken_text(text: str) -> str:
    """Removes any accidental Markdown characters for TTS synthesis."""
    cleaned = re.sub(r'[*_#`~]', '', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


async def stream_conversation_turn(
    session: ConversationSession,
    candidate_utterance: str,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Streams conversational response sentences from Ollama.
    Emits completed sentences one by one as they are generated.
    """
    session.add_candidate_message(candidate_utterance)

    ollama_url = (base_url or os.getenv("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL)).rstrip("/")
    ollama_model = model or os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)

    payload = {
        "model": ollama_model,
        "messages": session.messages,
        "stream": True,
        "options": {
            "temperature": 0.4,
            "top_p": 0.9,
        }
    }

    buffer = ""
    full_response = []

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", f"{ollama_url}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    error_msg = f"Ollama error: status code {response.status_code}"
                    yield error_msg
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            buffer += token
                            full_response.append(token)

                        # Extract complete sentences as tokens stream in
                        sentences, buffer = extract_sentences(buffer)
                        for sentence in sentences:
                            clean_sentence = _clean_spoken_text(sentence)
                            if clean_sentence:
                                yield clean_sentence

                        if chunk.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue

        # Flush any remaining text in the buffer
        if buffer.strip():
            clean_tail = _clean_spoken_text(buffer.strip())
            if clean_tail:
                yield clean_tail

        # Record full assistant reply in conversation history
        complete_reply = "".join(full_response).strip()
        if complete_reply:
            session.add_assistant_message(complete_reply)

    except httpx.RequestError as exc:
        fallback = "Excuse me, I had a momentary connection glitch. Could you please repeat that?"
        yield fallback
        session.add_assistant_message(fallback)
