import asyncio
import base64
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.conversation_agent import (
    get_or_create_session,
    evaluate_and_generate_next,
    ConversationSession,
)
from app.services.elevenlabs_service import (
    stream_text_to_speech,
    transcribe_audio,
)

logger = logging.getLogger("voice_interview")
router = APIRouter()


def detect_audio_format(data: bytes) -> tuple[str, str]:
    """Detects audio container/codec from magic bytes."""
    if data.startswith(b"RIFF"):
        return "candidate_response.wav", "audio/wav"
    if data.startswith(b"\x1a\x45\xdf\xa3"):
        return "candidate_response.webm", "audio/webm"
    if data.startswith(b"ID3") or (len(data) > 2 and data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")):
        return "candidate_response.mp3", "audio/mpeg"
    if data.startswith(b"OggS"):
        return "candidate_response.ogg", "audio/ogg"
    if data.startswith(b"fLaC"):
        return "candidate_response.flac", "audio/flac"
    return "candidate_response.wav", "audio/wav"


@router.websocket("/ws/{session_id}")
@router.websocket("/api/ws/interview/{session_id}")
async def voice_interview_websocket(websocket: WebSocket, session_id: str):
    """
    Full-duplex WebSocket endpoint for coordinated voice interviews.
    Synchronizes screen questions, candidate speech, AI evaluation,
    spoken feedback, and adaptive next questions.
    """
    await websocket.accept()

    session: Optional[ConversationSession] = None
    candidate_audio_buffer = bytearray()
    current_turn_task: Optional[asyncio.Task] = None

    async def send_json(data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception:
            pass

    async def stream_audio_phrase(text_to_speak: str, phase: str = "question"):
        """Streams a single phrase/sentence via ElevenLabs TTS to the browser."""
        clean_text = text_to_speak.strip()
        if not clean_text:
            return

        await send_json({
            "type": "interviewer_speech_start",
            "phase": phase,
            "sentence": clean_text
        })

        async for chunk in stream_text_to_speech(clean_text):
            b64_audio = base64.b64encode(chunk).decode("ascii")
            await send_json({
                "type": "audio_chunk",
                "phase": phase,
                "audio": b64_audio
            })

        await send_json({
            "type": "interviewer_speech_end",
            "phase": phase
        })

    async def handle_opening_question():
        """Speaks the initial question displayed on top to start the interview."""
        if not session:
            return
        try:
            await send_json({"type": "status", "status": "speaking"})
            intro = f"Welcome to your {session.role} interview. Here is question one: {session.current_question_title}"
            await stream_audio_phrase(intro, phase="question")
            await send_json({"type": "status", "status": "listening"})
        except asyncio.CancelledError:
            pass
        except Exception as err:
            logger.error(f"Error speaking opening question: {err}")
            await send_json({"type": "status", "status": "listening"})

    async def handle_candidate_turn(candidate_transcript: str):
        """
        Executes the user's required loop:
        1. Evaluate candidate answer with Ollama.
        2. ElevenLabs speaks feedback first.
        3. Send new question to frontend to update top card on screen.
        4. ElevenLabs speaks only the next question.
        5. Switch back to listening.
        """
        nonlocal current_turn_task
        if not session or not candidate_transcript.strip():
            await send_json({"type": "status", "status": "listening"})
            return

        try:
            await send_json({"type": "status", "status": "thinking"})

            # 1. Ollama evaluates answer & generates next adaptive question
            eval_result = await evaluate_and_generate_next(session, candidate_transcript)
            spoken_feedback = eval_result["spoken_feedback"]
            score = eval_result["score"]
            next_diff = eval_result["next_difficulty"]
            next_q_title = eval_result["next_question_title"]

            await send_json({"type": "status", "status": "speaking"})

            # 2. ElevenLabs speaks what Ollama said about the answer (FEEDBACK FIRST)
            await stream_audio_phrase(spoken_feedback, phase="feedback")

            # Brief natural pause between feedback and next question
            await asyncio.sleep(0.4)

            # 3. Check if all questions completed
            if session.current_question_number >= session.total_questions:
                wrapup = (
                    "Thank you. You have completed all technical questions for this interview. "
                    "You can now review your final evaluation summary."
                )
                await stream_audio_phrase(wrapup, phase="completed")
                await send_json({"type": "interview_completed", "score": score})
                await send_json({"type": "status", "status": "completed"})
                return

            # Update session state for next question
            session.current_question_number += 1
            session.current_question_title = next_q_title
            session.current_difficulty = next_diff
            session.record_turn(candidate_transcript, spoken_feedback, next_q_title)

            # 4. Update the TOP CARD ON SCREEN
            await send_json({
                "type": "new_question",
                "question_number": session.current_question_number,
                "total_questions": session.total_questions,
                "title": session.current_question_title,
                "difficulty": session.current_difficulty,
                "score": score,
                "feedback": spoken_feedback
            })

            # 5. ElevenLabs speaks ONLY the NEXT QUESTION
            await stream_audio_phrase(session.current_question_title, phase="question")

            # 6. Return to listening for candidate's next answer
            await send_json({"type": "status", "status": "listening"})

        except asyncio.CancelledError:
            logger.info("Turn processing cancelled by candidate interrupt")
            await send_json({"type": "status", "status": "listening"})
        except Exception as exc:
            logger.error(f"Error handling candidate turn: {exc}")
            await send_json({"type": "error", "message": str(exc)})
            await send_json({"type": "status", "status": "listening"})
        finally:
            current_turn_task = None

    async def process_turn_audio(audio_data: bytes, fallback_text: str = ""):
        """Processes candidate voice turn: transcribes via ElevenLabs STT with fallback."""
        nonlocal current_turn_task
        await send_json({"type": "status", "status": "transcribing"})

        transcribed_text = ""
        if audio_data and len(audio_data) > 400:
            fname, ctype = detect_audio_format(audio_data)
            logger.info(f"Submitting {len(audio_data)} bytes to ElevenLabs STT (format: {ctype}, name: {fname})")
            try:
                transcribed_text = await transcribe_audio(
                    audio_data,
                    filename=fname,
                    content_type=ctype
                )
                logger.info(f"ElevenLabs STT transcription: '{transcribed_text}'")
            except Exception as stt_err:
                logger.error(f"ElevenLabs STT error: {stt_err}")
                transcribed_text = ""

        # Use fallback transcript if ElevenLabs was silent or errored
        candidate_speech = transcribed_text.strip()
        if not candidate_speech and fallback_text.strip():
            logger.info(f"Using client real-time speech fallback: '{fallback_text}'")
            candidate_speech = fallback_text.strip()

        if candidate_speech:
            await send_json({
                "type": "candidate_transcript",
                "text": candidate_speech
            })
            current_turn_task = asyncio.create_task(
                handle_candidate_turn(candidate_speech)
            )
        else:
            logger.warning("No speech detected from STT or fallback")
            await send_json({
                "type": "candidate_transcript",
                "text": "(Silence or unclear speech)"
            })
            await send_json({"type": "status", "status": "listening"})

    try:
        while True:
            message = await websocket.receive()

            # Binary audio frame from mic
            if "bytes" in message and message["bytes"]:
                candidate_audio_buffer.extend(message["bytes"])
                continue

            # Control message
            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type")

                # 1. Initialize Interview Session (Synced with top question)
                if msg_type == "init_session":
                    role = data.get("role", "DevOps Engineer")
                    name = data.get("candidate_name", "Candidate")
                    initial_q = data.get("initial_question") or {}
                    initial_title = initial_q.get("title") if isinstance(initial_q, dict) else str(initial_q)
                    initial_diff = initial_q.get("difficulty", "Medium") if isinstance(initial_q, dict) else "Medium"

                    session = get_or_create_session(
                        session_id,
                        role=role,
                        candidate_name=name,
                        initial_question_title=initial_title,
                        initial_difficulty=initial_diff,
                    )

                    await send_json({
                        "type": "session_ready",
                        "session_id": session_id,
                        "role": role,
                        "candidate_name": name,
                        "question_number": session.current_question_number,
                        "question_title": session.current_question_title,
                    })

                    # If first turn, speak the question displayed on top (only once per session)
                    if session.turn_count == 0 and not getattr(session, "has_spoken_opening", False):
                        session.has_spoken_opening = True
                        current_turn_task = asyncio.create_task(handle_opening_question())

                # 2. Base64 Audio Chunk from Mic
                elif msg_type == "audio_chunk":
                    b64_chunk = data.get("data", "")
                    if b64_chunk:
                        candidate_audio_buffer.extend(base64.b64decode(b64_chunk))

                # 3. Complete Candidate Audio Turn (Self-contained WAV/WebM with valid headers)
                elif msg_type == "candidate_audio_turn":
                    b64_audio = data.get("audio", "")
                    fallback_text = data.get("fallback_text", "")
                    audio_bytes = base64.b64decode(b64_audio) if b64_audio else bytes(candidate_audio_buffer)
                    candidate_audio_buffer.clear()
                    await process_turn_audio(audio_bytes, fallback_text=fallback_text)

                # 4. Candidate Finished Speaking (Turn Complete with optional fallback)
                elif msg_type == "finish_speaking":
                    fallback_text = data.get("fallback_text", "")
                    audio_bytes = bytes(candidate_audio_buffer)
                    candidate_audio_buffer.clear()
                    await process_turn_audio(audio_bytes, fallback_text=fallback_text)

                # 5. Direct Text Input
                elif msg_type == "text_message":
                    text = data.get("text", "").strip()
                    if text:
                        await send_json({
                            "type": "candidate_transcript",
                            "text": text
                        })
                        current_turn_task = asyncio.create_task(
                            handle_candidate_turn(text)
                        )

                # 6. Candidate Interrupted Speech (Barge-in)
                elif msg_type == "interrupt":
                    if current_turn_task and not current_turn_task.done():
                        current_turn_task.cancel()
                    await send_json({"type": "interrupted"})
                    await send_json({"type": "status", "status": "listening"})

    except WebSocketDisconnect:
        logger.info(f"Candidate disconnected from session {session_id}")
    except Exception as exc:
        logger.error(f"WebSocket session error: {exc}")
    finally:
        if current_turn_task and not current_turn_task.done():
            current_turn_task.cancel()
