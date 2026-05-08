# Voice Interview Performance Notes

**Validates: Requirement 5.4**

## Whisper Model Sizes

| Model  | Size   | VRAM  | Speed (RTF) | Accuracy (VI) |
|--------|--------|-------|-------------|---------------|
| tiny   | ~75MB  | ~1GB  | ~32x        | Low           |
| base   | ~150MB | ~1GB  | ~16x        | Acceptable    |
| small  | ~500MB | ~2GB  | ~6x         | Good          |
| medium | ~1.5GB | ~5GB  | ~2x         | High          |

**Recommendation:** Use `base` for production MVP. Upgrade to `small` if accuracy complaints arise.

## Concurrent Voice Interview Limits

- `base` model: **4–6 concurrent sessions** on a 4-core CPU / 8GB RAM server
- `small` model: **2–3 concurrent sessions** on same hardware
- Use a task queue (Celery/Redis) to serialize STT jobs under load

## Memory Usage

- Whisper `base` model: ~150MB resident after first load
- Per-request overhead: ~50–80MB during transcription (freed after)
- Pre-load model at startup to avoid cold-start latency on first request

## Latency Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| STT (base, 30s audio) | < 5s | On 4-core CPU |
| TTS (Edge TTS, 100 chars) | < 2s | Network-dependent |
| Audio upload (5MB) | < 3s | Depends on R2 region |

## Production Recommendations

1. Pre-download Whisper `base` model in Docker image (avoids runtime download)
2. Run STT in a separate worker process to avoid blocking FastAPI event loop
3. Cache TTS audio for repeated questions (same text → same audio URL)
4. Set `WHISPER_MODEL=base` in `.env`; allow override to `small` via env var
5. Monitor `/api/interview/voice/health` endpoint for model load status
