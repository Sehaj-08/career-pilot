import asyncio
import base64
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.conversation_agent import (
    get_or_create_session,
    stream_conversation_turn,
    ConversationSession,
)
from app.services.elevenlabs_service import (
    stream_text_to_speech,
    transcribe_audio,
)

logger = logging.getLogger("voice_interview")
router = APIRouter()


@router.websocket("/ws/{session_id}")
@router.websocket("/api/ws/interview/{session_id}")
async def voice_interview_websocket(websocket: WebSocket, session_id: str):
    """
    Full-duplex WebSocket endpoint for live conversational voice interviews.
    Handles microphone audio ingestion, STT, Ollama conversational reasoning,
    and ElevenLabs streaming TTS playback.
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

    async def speak_sentences(sentence_generator):
        """Streams sentences from conversation agent through ElevenLabs TTS to frontend."""
        try:
            await send_json({"type": "status", "status": "speaking"})

            async for sentence in sentence_generator:
                clean = sentence.strip()
                if not clean:
                    continue

                await send_json({
                    "type": "interviewer_speech_start",
                    "sentence": clean
                })

                # Stream audio chunks for this sentence from ElevenLabs
                async for chunk in stream_text_to_speech(clean):
                    b64_audio = base64.b64encode(chunk).decode("ascii")
                    await send_json({
                        "type": "audio_chunk",
                        "audio": b64_audio
                    })

            await send_json({"type": "interviewer_speech_end"})
            await send_json({"type": "status", "status": "listening"})
        except asyncio.CancelledError:
            logger.info("Speech generation cancelled by barge-in")
            await send_json({"type": "interviewer_speech_end", "cancelled": True})
            await send_json({"type": "status", "status": "listening"})
            raise
        except Exception as exc:
            logger.error(f"Error during speech synthesis: {exc}")
            await send_json({"type": "error", "message": str(exc)})
            await send_json({"type": "status", "status": "listening"})

    async def handle_candidate_turn(transcript: str):
        """Processes candidate's transcribed answer with Ollama and ElevenLabs."""
        nonlocal current_turn_task
        if not session or not transcript.strip():
            await send_json({"type": "status", "status": "listening"})
            return

        await send_json({"type": "status", "status": "thinking"})

        # Stream turn using Ollama conversation agent
        generator = stream_conversation_turn(session, transcript)
        current_turn_task = asyncio.create_task(speak_sentences(generator))
        try:
            await current_turn_task
        except asyncio.CancelledError:
            pass
        finally:
            current_turn_task = None

    try:
        while True:
            message = await websocket.receive()

            # Handle binary audio frame from browser mic
            if "bytes" in message and message["bytes"]:
                candidate_audio_buffer.extend(message["bytes"])
                continue

            # Handle text/JSON control messages
            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type")

                # 1. Initialize Interview Session
                if msg_type == "init_session":
                    role = data.get("role", "DevOps Engineer")
                    name = data.get("candidate_name", "Candidate")
                    session = get_or_create_session(session_id, role=role, candidate_name=name)

                    await send_json({
                        "type": "session_ready",
                        "session_id": session_id,
                        "role": role,
                        "candidate_name": name,
                    })

                    # If this is the start of the interview, have AI ask the opening question
                    if session.turn_count == 0:
                        opening_prompt = (
                            f"Hello! I am ready for my {role} interview. Please introduce yourself briefly "
                            "and ask your first question."
                        )
                        current_turn_task = asyncio.create_task(
                            handle_candidate_turn(opening_prompt)
                        )

                # 2. Base64 Audio Chunk from Browser Mic
                elif msg_type == "audio_chunk":
                    b64_chunk = data.get("data", "")
                    if b64_chunk:
                        candidate_audio_buffer.extend(base64.b64decode(b64_chunk))

                # 3. Candidate Finished Speaking (Turn Complete)
                elif msg_type == "finish_speaking":
                    if len(candidate_audio_buffer) > 500:
                        await send_json({"type": "status", "status": "transcribing"})
                        audio_to_transcribe = bytes(candidate_audio_buffer)
                        candidate_audio_buffer.clear()

                        try:
                            # Use ElevenLabs Scribe STT
                            transcribed_text = await transcribe_audio(
                                audio_to_transcribe,
                                filename="candidate_response.wav",
                                content_type="audio/wav"
                            )
                        except Exception as stt_err:
                            logger.error(f"STT error: {stt_err}")
                            transcribed_text = ""

                        if transcribed_text.strip():
                            await send_json({
                                "type": "candidate_transcript",
                                "text": transcribed_text
                            })
                            await handle_candidate_turn(transcribed_text)
                        else:
                            await send_json({
                                "type": "candidate_transcript",
                                "text": "(Silence or unclear speech)"
                            })
                            await send_json({"type": "status", "status": "listening"})
                    else:
                        candidate_audio_buffer.clear()
                        await send_json({"type": "status", "status": "listening"})

                # 4. Direct Text Input (Fallback / Direct STT)
                elif msg_type == "text_message":
                    text = data.get("text", "").strip()
                    if text:
                        await send_json({
                            "type": "candidate_transcript",
                            "text": text
                        })
                        await handle_candidate_turn(text)

                # 5. Candidate Interrupted AI Speech (Barge-in)
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
