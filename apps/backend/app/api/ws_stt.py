"""
ws_stt.py
=========
WebSocket endpoint for real-time Speech-to-Text streaming.

Flow:
  Browser  → WS connect(token)
  Browser  → send binary audio chunk (every ~1s)
  Backend  → accumulate chunks in Redis buffer
  Backend  → run faster-whisper every N bytes
  Backend  → send JSON { transcript, is_final } back to browser
  Browser  → update Live Transcript UI instantly
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

logger = logging.getLogger(__name__)

router = APIRouter()

MIN_BYTES_FOR_STT = 8_000    # ~0.5s of audio before sending to Whisper
MAX_BUFFER_BYTES  = 512_000  # 512KB max buffer per session


@router.websocket("/ws/stt")
async def stt_websocket(
    ws: WebSocket,
    token: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    lang: str = Query("vi"),
):
    """
    WebSocket STT endpoint.
    - Client sends binary audio chunks (webm/opus)
    - Server runs faster-whisper and returns transcript
    - Realtime: transcript updates arrive every 1-3 seconds
    """
    # ── Accept first, then optionally validate token ──────────────
    await ws.accept()

    user_id = None
    if token:
        try:
            from app.core.jwt import decode_token
            payload = decode_token(token)
            user_id = int(payload.get("sub", 0))
        except Exception:
            # Invalid token — close gracefully after accept
            await ws.send_text('{"type":"error","message":"Invalid token"}')
            await ws.close(code=4001)
            return
    logger.info(f"[WS-STT] Connected: user={user_id} session={session_id}")

    audio_buffer = bytearray()
    accumulated_text = ""

    # Use executor to avoid blocking event loop during Whisper inference
    loop = asyncio.get_event_loop()

    try:
        while True:
            data = await ws.receive()

            if "bytes" in data and data["bytes"]:
                chunk = data["bytes"]
                audio_buffer.extend(chunk)
                logger.info(f"[WS-STT] Received chunk: {len(chunk)} bytes | buffer: {len(audio_buffer)} bytes")

                # Run STT when we have enough audio
                if len(audio_buffer) >= MIN_BYTES_FOR_STT:
                    audio_snapshot = bytes(audio_buffer)
                    audio_buffer.clear()  # reset for next segment

                    logger.info(f"[WS-STT] Running faster-whisper on {len(audio_snapshot)} bytes...")

                    # Run faster-whisper in thread pool (non-blocking)
                    def do_transcribe():
                        from app.modules.interview.faster_stt_service import transcribe_audio_bytes
                        return transcribe_audio_bytes(audio_snapshot, "audio/webm", lang)

                    text = await loop.run_in_executor(None, do_transcribe)
                    logger.info(f"[WS-STT] Transcription result: {repr(text)}")

                    if text and text.strip():
                        accumulated_text = (accumulated_text + " " + text).strip()
                        await ws.send_text(json.dumps({
                            "type": "transcript",
                            "text": text.strip(),
                            "accumulated": accumulated_text,
                            "is_final": False,
                        }))
                        logger.info(f"[WS-STT] Sent transcript: {text[:80]}")

                # Safety: cap buffer size
                if len(audio_buffer) > MAX_BUFFER_BYTES:
                    audio_buffer = audio_buffer[-MAX_BUFFER_BYTES:]

            elif "text" in data:
                msg = data.get("text", "")
                if msg == "stop":
                    # Final transcription of remaining buffer
                    if len(audio_buffer) > 8000:
                        audio_final = bytes(audio_buffer)

                        def do_final():
                            from app.modules.interview.faster_stt_service import transcribe_audio_bytes
                            return transcribe_audio_bytes(audio_final, "audio/webm", lang)

                        text = await loop.run_in_executor(None, do_final)
                        if text:
                            accumulated_text = (accumulated_text + " " + text).strip()

                    await ws.send_text(json.dumps({
                        "type": "final",
                        "accumulated": accumulated_text,
                        "is_final": True,
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
# Deepgram Streaming WebSocket — dùng Deepgram SDK async
# Browser → Backend WS → DeepgramClient.listen.asynclive → transcript → Browser
# interim_results=True: từng từ xuất hiện ngay khi nói (~50-200ms)
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws/deepgram-stt")
async def deepgram_stt_websocket(
    ws: WebSocket,
    token: Optional[str] = Query(None),
    lang: str = Query("vi"),
):
    """
    Deepgram SDK streaming: audio từ browser → Deepgram → transcript real-time.
    interim_results=True cho phép hiển thị từng từ ngay khi nói.
    """
    await ws.accept()

    import os as _os
    api_key = _os.getenv("DEEPGRAM_API_KEY", "")
    if not api_key:
        logger.error("[DG-WS] DEEPGRAM_API_KEY not configured")
        await ws.send_text(json.dumps({"type": "error", "message": "DEEPGRAM_API_KEY not set"}))
        await ws.close(code=4001)
        return

    logger.info(f"[DG-WS] Starting Deepgram SDK streaming session (lang={lang}, api_key={'*' * 8 + api_key[-4:]})")

    try:
        import websockets as _wss

        # Deepgram streaming URL — không chỉ định encoding để Deepgram tự detect WebM/Opus
        dg_url = (
            f"wss://api.deepgram.com/v1/listen"
            f"?model=nova-2"
            f"&language={lang}"
            f"&smart_format=true"
            f"&interim_results=true"
            f"&endpointing=300"
            f"&vad_events=true"
        )

        confirmed_text = ""

        async with _wss.connect(
            dg_url,
            additional_headers={"Authorization": f"Token {api_key}"},
            ping_interval=None,   # Deepgram manages its own keepalive
            close_timeout=5,
        ) as dg_ws:
            logger.info("[DG-WS] Deepgram connected ✓")
            await ws.send_text(json.dumps({"type": "ready"}))
            
            # Send KeepAlive to verify connection
            try:
                await dg_ws.send(json.dumps({"type": "KeepAlive"}))
                logger.info("[DG-WS] KeepAlive sent to Deepgram")
            except Exception as e:
                logger.warning(f"[DG-WS] Failed to send KeepAlive: {e}")

            async def _recv_from_deepgram():
                """Nhận transcript events từ Deepgram → gửi về browser."""
                nonlocal confirmed_text
                message_count = 0
                try:
                    async for raw in dg_ws:
                        message_count += 1
                        try:
                            data = json.loads(raw)
                        except json.JSONDecodeError as e:
                            logger.warning(f"[DG-WS] Failed to parse JSON: {e}")
                            continue
                            
                        msg_type = data.get('type', 'unknown')
                        logger.info(f"[DG-WS] Message #{message_count}: type={msg_type}")
                        
                        if msg_type != "Results":
                            logger.debug(f"[DG-WS] Skipping non-Results message: {msg_type}")
                            continue
                        
                        alts = data.get("channel", {}).get("alternatives", [{}])
                        if not alts:
                            logger.warning("[DG-WS] No alternatives in Results message")
                            continue
                            
                        text = (alts[0].get("transcript", "") or "").strip()
                        
                        if not text:
                            logger.debug("[DG-WS] Empty transcript, skipping")
                            continue
                        
                        is_final   = data.get("is_final", False)
                        sp_final   = data.get("speech_final", False)
                        
                        logger.info(f"[DG-WS] 🎤 Transcript: '{text[:80]}' (is_final={is_final}, speech_final={sp_final})")
                        
                        if is_final or sp_final:
                            confirmed_text = (confirmed_text + " " + text).strip()
                            response = {
                                "type": "transcript",
                                "text": text,
                                "accumulated": confirmed_text,
                                "is_final": True,
                            }
                            await ws.send_text(json.dumps(response))
                            logger.info(f"[DG-WS] ✓ Sent FINAL transcript to client: '{text[:50]}'")
                        else:
                            response = {
                                "type": "transcript",
                                "text": text,
                                "accumulated": (confirmed_text + " " + text).strip(),
                                "is_final": False,
                            }
                            await ws.send_text(json.dumps(response))
                            logger.debug(f"[DG-WS] → Sent INTERIM transcript to client: '{text[:50]}'")
                            
                except Exception as e:
                    error_msg = str(e)
                    # Ignore Deepgram timeout errors (1011 = normal when user stops speaking)
                    if "1011" in error_msg or "timeout" in error_msg.lower():
                        logger.info(f"[DG-WS] Deepgram timeout after {message_count} messages (user stopped speaking)")
                    else:
                        logger.error(f"[DG-WS] recv loop error after {message_count} messages: {e}", exc_info=True)

            async def _send_to_deepgram():
                """Đọc audio từ browser → forward sang Deepgram."""
                chunk_count = 0
                total_bytes = 0
                try:
                    while True:
                        msg = await ws.receive()
                        if "bytes" in msg and msg["bytes"]:
                            chunk_count += 1
                            chunk_size = len(msg["bytes"])
                            total_bytes += chunk_size
                            await dg_ws.send(msg["bytes"])
                            if chunk_count % 10 == 0:  # Log every 10 chunks
                                logger.debug(f"[DG-WS] Sent {chunk_count} chunks ({total_bytes} bytes total)")
                        elif "text" in msg and msg.get("text") == "stop":
                            logger.info(f"[DG-WS] Stop signal received. Sent {chunk_count} chunks ({total_bytes} bytes total)")
                            await dg_ws.send(json.dumps({"type": "CloseStream"}))
                            break
                except WebSocketDisconnect:
                    logger.info(f"[DG-WS] Browser disconnected after {chunk_count} chunks")
                except Exception as e:
                    # Ignore normal closure (1000 = OK, 1001 = going away)
                    if "1000" in str(e) or "1001" in str(e):
                        logger.info(f"[DG-WS] Connection closed normally after {chunk_count} chunks")
                    else:
                        logger.error(f"[DG-WS] send loop error after {chunk_count} chunks: {e}", exc_info=True)

            await asyncio.gather(_recv_from_deepgram(), _send_to_deepgram())
            logger.info(f"[DG-WS] Session done. final={repr(confirmed_text[:80])}")

    except _wss.exceptions.ConnectionClosedError as e:
        logger.error(f"[DG-WS] Deepgram connection closed unexpectedly: code={e.code}, reason={e.reason}")
        try:
            await ws.send_text(json.dumps({
                "type": "error",
                "message": f"Deepgram connection closed (code {e.code}). Vui lòng thử lại."
            }))
        except Exception:
            pass
    except _wss.exceptions.InvalidStatusCode as e:
        logger.error(f"[DG-WS] Deepgram rejected connection: status={e.status_code}")
        try:
            await ws.send_text(json.dumps({
                "type": "error",
                "message": f"Deepgram API error (status {e.status_code}). Kiểm tra API key."
            }))
        except Exception:
            pass

    except Exception as e:
        logger.error(f"[DG-WS] Error: {e}")
        try:
            await ws.send_text(json.dumps({"type": "error", "message": str(e)[:200]}))
        except Exception:
            pass
