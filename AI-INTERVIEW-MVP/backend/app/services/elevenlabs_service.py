import os
import io
import asyncio
from typing import AsyncGenerator, Optional
import httpx
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(env_path)
load_dotenv()  # Fallback to standard locations

DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
DEFAULT_TTS_MODEL = "eleven_flash_v2_5"
DEFAULT_STT_MODEL = "scribe_v1"
BASE_URL = "https://api.elevenlabs.io/v1"


class ElevenLabsError(RuntimeError):
    """Base error for ElevenLabs operations."""


class ElevenLabsTTSError(ElevenLabsError):
    """Error during Text-to-Speech synthesis."""


class ElevenLabsSTTError(ElevenLabsError):
    """Error during Speech-to-Text transcription."""


def get_elevenlabs_config() -> tuple[str, str, str]:
    """Retrieve API key, voice ID, and TTS model from environment."""
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID).strip() or DEFAULT_VOICE_ID
    model_id = os.getenv("ELEVENLABS_MODEL_ID", DEFAULT_TTS_MODEL).strip() or DEFAULT_TTS_MODEL

    if not api_key or api_key == "your_elevenlabs_api_key_here":
        raise ElevenLabsError("ELEVENLABS_API_KEY is not configured in backend/.env")

    return api_key, voice_id, model_id


async def stream_text_to_speech(
    text: str,
    voice_id: Optional[str] = None,
    model_id: Optional[str] = None
) -> AsyncGenerator[bytes, None]:
    """
    Streams audio/mpeg chunks from ElevenLabs TTS for ultra-low latency playback.
    """
    clean_text = text.strip()
    if not clean_text:
        return

    api_key, default_voice, default_model = get_elevenlabs_config()
    active_voice = voice_id or default_voice
    active_model = model_id or default_model

    url = f"{BASE_URL}/text-to-speech/{active_voice}/stream"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    payload = {
        "text": clean_text,
        "model_id": active_model,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise ElevenLabsTTSError(
                        f"ElevenLabs TTS failed [{response.status_code}]: {error_text.decode('utf-8', errors='ignore')}"
                    )
                async for chunk in response.aiter_bytes(chunk_size=2048):
                    if chunk:
                        yield chunk
    except httpx.RequestError as exc:
        raise ElevenLabsTTSError(f"Network error communicating with ElevenLabs TTS: {exc}") from exc


async def generate_speech_bytes(
    text: str,
    voice_id: Optional[str] = None,
    model_id: Optional[str] = None
) -> bytes:
    """Convenience helper to gather complete MP3 audio bytes for a given text."""
    chunks = []
    async for chunk in stream_text_to_speech(text, voice_id=voice_id, model_id=model_id):
        chunks.append(chunk)
    return b"".join(chunks)


async def transcribe_audio(
    audio_data: bytes,
    filename: str = "candidate_audio.wav",
    content_type: str = "audio/wav",
    model_id: str = DEFAULT_STT_MODEL
) -> str:
    """
    Transcribes audio bytes to text using ElevenLabs Scribe STT.
    Accepts WAV, MP3, WebM, OGG, or FLAC formats.
    """
    if not audio_data or len(audio_data) < 100:
        return ""

    api_key, _, _ = get_elevenlabs_config()
    url = f"{BASE_URL}/speech-to-text"
    headers = {
        "xi-api-key": api_key,
    }
    data = {
        "model_id": model_id,
    }
    files = {
        "file": (filename, io.BytesIO(audio_data), content_type)
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, headers=headers, data=data, files=files)
            if response.status_code != 200:
                raise ElevenLabsSTTError(
                    f"ElevenLabs STT failed [{response.status_code}]: {response.text}"
                )
            result = response.json()
            return result.get("text", "").strip()
    except httpx.RequestError as exc:
        raise ElevenLabsSTTError(f"Network error communicating with ElevenLabs STT: {exc}") from exc
