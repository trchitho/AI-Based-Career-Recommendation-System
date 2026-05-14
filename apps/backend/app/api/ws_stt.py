"""
ws_stt.py — WebSocket endpoints for real-time Speech-to-Text.

/ws/stt          — faster-whisper buffered chunking (legacy, no Deepgram key needed)
/ws/deepgram-stt — Deepgram streaming with interim_results (low latency, preferred)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Optional

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

logger = logging.getLogger(__name__)

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# /ws/stt  — faster-whisper buffered (legacy fallback)
# ─────────────────────────────────────────────────────────────────────────────

_MIN_BYTES = 8_000    # ~0.5 s of webm/opus audio
_MAX_BUFFER = 512_000


@router.websocket("/ws/stt")
async def stt_websocket(
    ws: WebSocket,
    token: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    lang: str = Query("vi"),
):
    await ws.accept()

    user_id = None
    if token:
        try:
            from app.core.jwt import decode_token
            payload = decode_token(token)
            user_id = int(payload.get("sub", 0))
        except Exception:
            await ws.send_text('{"type":"error","message":"Invalid token"}')
            await ws.close(code=4001)
            return

    logger.info(f"[WS-STT] Connected: user={user_id} session={session_id}")
    from app.modules.interview.faster_stt_service import transcribe_audio_bytes

    audio_buffer = bytearray()
    accumulated_text = ""
    loop = asyncio.get_event_loop()

    try:
        while True:
            data = await ws.receive()

            if "bytes" in data and data["bytes"]:
                audio_buffer.extend(data["bytes"])
                if len(audio_buffer) > _MAX_BUFFER:
                    audio_buffer = audio_buffer[-_MAX_BUFFER:]

                if len(audio_buffer) >= _MIN_BYTES:
                    snapshot = bytes(audio_buffer)
                    audio_buffer.clear()

                    text = await loop.run_in_executor(
                        None, lambda: transcribe_audio_bytes(snapshot, "audio/webm", lang)
                    )
                    if text and text.strip():
                        accumulated_text = (accumulated_text + " " + text).strip()
                        await ws.send_text(json.dumps({
                            "type": "transcript",
                            "text": text.strip(),
                            "accumulated": accumulated_text,
                            "is_final": False,
                        }))

            elif data.get("text") == "stop":
                if len(audio_buffer) > 4000:
                    text = await loop.run_in_executor(
                        None, lambda: transcribe_audio_bytes(bytes(audio_buffer), "audio/webm", lang)
                    )
                    if text:
                        accumulated_text = (accumulated_text + " " + text).strip()
                await ws.send_text(json.dumps({
                    "type": "final", "accumulated": accumulated_text, "is_final": True,
                }))
                break

    except WebSocketDisconnect:
        logger.info(f"[WS-STT] Disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"[WS-STT] Error: {e}")
        try:
            await ws.send_text(json.dumps({"type": "error", "message": str(e)[:100]}))
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# /ws/deepgram-stt  — Deepgram streaming (preferred, low latency)
# ─────────────────────────────────────────────────────────────────────────────

_DG_URL_TEMPLATE = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2&language={lang}"
    "&smart_format=true&interim_results=true"
    "&endpointing=300&vad_events=true"
)


@router.websocket("/ws/deepgram-stt")
async def deepgram_stt_websocket(
    ws: WebSocket,
    token: Optional[str] = Query(None),
    lang: str = Query("vi"),
):
    """
    Proxy browser audio → Deepgram streaming → transcript events back to browser.
    interim_results=True gives word-by-word transcription (~50-200ms latency).
    """
    await ws.accept()

    api_key = os.getenv("DEEPGRAM_API_KEY", "")
    if not api_key:
        await ws.send_text(json.dumps({"type": "error", "message": "DEEPGRAM_API_KEY not configured"}))
        await ws.close(code=4001)
        return

    dg_url = _DG_URL_TEMPLATE.format(lang=lang)
    logger.info(f"[DG-WS] Connecting to Deepgram (lang={lang})")

    try:
        async with websockets.connect(
            dg_url,
            additional_headers={"Authorization": f"Token {api_key}"},
            ping_interval=None,  # Deepgram manages keepalive
            close_timeout=5,
        ) as dg_ws:
            logger.info("[DG-WS] Deepgram connected ✓")
            await ws.send_text(json.dumps({"type": "ready"}))

            confirmed_text = ""

            async def _recv_transcripts():
                nonlocal confirmed_text
                try:
                    async for raw in dg_ws:
                        data = json.loads(raw)
                        if data.get("type") != "Results":
                            continue
                        alts = data.get("channel", {}).get("alternatives", [{}])
                        text = (alts[0].get("transcript") or "").strip()
                        if not text:
                            continue
                        is_final = data.get("is_final", False) or data.get("speech_final", False)
                        if is_final:
                            confirmed_text = (confirmed_text + " " + text).strip()
                        await ws.send_text(json.dumps({
                            "type": "transcript",
                            "text": text,
                            "accumulated": confirmed_text if is_final else (confirmed_text + " " + text).strip(),
                            "is_final": is_final,
                        }))
                except Exception as e:
                    if "1011" not in str(e):  # 1011 = normal Deepgram timeout
                        logger.warning(f"[DG-WS] recv error: {e}")

            async def _send_audio():
                try:
                    while True:
                        msg = await ws.receive()
                        if "bytes" in msg and msg["bytes"]:
                            await dg_ws.send(msg["bytes"])
                        elif msg.get("text") == "stop":
                            await dg_ws.send(json.dumps({"type": "CloseStream"}))
                            break
                except WebSocketDisconnect:
                    logger.info("[DG-WS] Browser disconnected")
                except Exception as e:
                    if "1000" not in str(e) and "1001" not in str(e):
                        logger.warning(f"[DG-WS] send error: {e}")

            await asyncio.gather(_recv_transcripts(), _send_audio())
            logger.info(f"[DG-WS] Session done. final={repr(confirmed_text[:80])}")

    except Exception as e:
        logger.error(f"[DG-WS] Connection error: {e}")
        try:
            await ws.send_text(json.dumps({"type": "error", "message": str(e)[:200]}))
        except Exception:
            pass
