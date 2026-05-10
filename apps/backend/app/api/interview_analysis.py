"""
interview_analysis.py
=====================
SSE streaming endpoint for deep AI analysis of interview answers.

- Uses dedicated GEMINI_ANALYSIS_API_KEY (separate from TTS/STT streams)
- Streams analysis token-by-token via Server-Sent Events
- Saves structured data to interview.interview_answer_analysis table
- Data encoded as MessagePack binary in analysis_data column (not raw JSON)
"""
from __future__ import annotations

import os
import logging
from typing import AsyncGenerator, Optional

import msgpack
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview/analysis", tags=["interview-analysis"])


# ── Dedicated Gemini client for analysis (separate from TTS/STT) ─────────────

def _get_analysis_model():
    """Return a Gemini model using the dedicated ANALYSIS API key."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_ANALYSIS_API_KEY") or os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_ANALYSIS_MODEL", "gemini-2.5-flash")

    if not api_key:
        raise RuntimeError("GEMINI_ANALYSIS_API_KEY not set in .env")

    genai.configure(api_key=api_key)

    safety = [
        {"category": c, "threshold": "BLOCK_NONE"}
        for c in [
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
        ]
    ]
    return genai.GenerativeModel(model_name, safety_settings=safety)


# ── Encode/decode for DB storage (MessagePack binary) ────────────────────────

def _pack(data: dict) -> bytes:
    """Pack dict to MessagePack binary for DB BYTEA column."""
    return msgpack.packb(data, use_bin_type=True)


def _unpack(raw: bytes) -> dict:
    """Unpack MessagePack binary from DB."""
    return msgpack.unpackb(raw, raw=False)


# ── Build prompt ──────────────────────────────────────────────────────────────

def _build_prompt(question: str, answer: str, question_type: str, job_title: str, score: Optional[float]) -> str:
    qt_labels = {
        "behavioral": "Câu hỏi Hành vi (STAR: Situation-Task-Action-Result)",
        "technical":  "Câu hỏi Kỹ thuật",
        "situational": "Câu hỏi Tình huống",
        "warm_up":    "Câu hỏi Khởi động",
        "jd_specific": "Câu hỏi theo Job Description",
        "closing":    "Câu hỏi Kết thúc",
    }
    qt = qt_labels.get(question_type, question_type)
    score_text = f"{score:.1f}/10" if score is not None else "chưa chấm"

    return f"""Bạn là chuyên gia tuyển dụng cấp cao. Hãy phân tích sâu câu trả lời phỏng vấn sau.

THÔNG TIN:
- Vị trí: {job_title or 'chưa rõ'}
- Loại câu hỏi: {qt}
- Câu hỏi: {question}
- Câu trả lời của ứng viên: {answer or '(không có câu trả lời)'}
- Điểm AI chấm: {score_text}

YÊU CẦU: Phân tích THỰC TẾ và CỤ THỂ dựa trên nội dung câu trả lời trên.
Trả về đúng định dạng JSON sau (không thêm text ngoài JSON):

{{
  "strengths": ["điểm mạnh cụ thể 1", "điểm mạnh cụ thể 2"],
  "weaknesses": ["điểm yếu cụ thể 1", "điểm yếu cụ thể 2"],
  "missing_elements": ["yếu tố còn thiếu 1", "yếu tố còn thiếu 2"],
  "improved_example": "Viết lại câu trả lời tốt hơn (2-4 câu, có số liệu, áp dụng STAR nếu là behavioral)",
  "action_tips": ["lời khuyên hành động 1", "lời khuyên hành động 2"],
  "score_explanation": "Giải thích rõ tại sao điểm {score_text} là hợp lý"
}}"""


# ── SSE helpers ───────────────────────────────────────────────────────────────

def _sse(event: str, data: str) -> str:
    return f"event: {event}\ndata: {data}\n\n"


async def _stream_analysis(
    session_id: int,
    message_id: int,
    user_id: int,
    db: Session,
) -> AsyncGenerator[str, None]:
    """
    Stream AI analysis for a single interview answer.
    Steps:
      1. Check if already cached in DB → return cached
      2. Fetch question + answer from DB
      3. Stream Gemini response token by token
      4. Parse final JSON and save to DB (MessagePack binary + structured columns)
    """
    import json, re

    # ── 1. Check cache ────────────────────────────────────────────────────────
    cached = db.execute(text("""
        SELECT id, strengths, weaknesses, missing_elements,
               improved_example, action_tips, score_explanation
        FROM interview.interview_answer_analysis
        WHERE message_id = :mid AND session_id = :sid
    """), {"mid": message_id, "sid": session_id}).fetchone()

    if cached:
        yield _sse("cached", json.dumps({
            "strengths":        list(cached.strengths or []),
            "weaknesses":       list(cached.weaknesses or []),
            "missing_elements": list(cached.missing_elements or []),
            "improved_example": cached.improved_example or "",
            "action_tips":      list(cached.action_tips or []),
            "score_explanation": cached.score_explanation or "",
        }, ensure_ascii=False))
        yield _sse("done", json.dumps({"from_cache": True}))
        return

    # ── 2. Fetch message data ─────────────────────────────────────────────────
    msg_row = db.execute(text("""
        SELECT m.content, m.score, m.question_type,
               q.content AS question_text,
               s.job_title
        FROM interview.interview_messages m
        JOIN interview.interview_sessions s ON s.id = m.session_id
        LEFT JOIN LATERAL (
            SELECT content FROM interview.interview_messages
            WHERE session_id = m.session_id
              AND role = 'interviewer'
              AND id < m.id
              AND question_type NOT IN ('greeting')
            ORDER BY id DESC LIMIT 1
        ) q ON true
        WHERE m.id = :mid AND m.session_id = :sid AND m.role = 'candidate'
    """), {"mid": message_id, "sid": session_id}).fetchone()

    if not msg_row:
        yield _sse("error", json.dumps({"message": "Message not found"}))
        return

    yield _sse("start", json.dumps({"message": "Bắt đầu phân tích AI..."}))

    # ── 3. Stream Gemini ──────────────────────────────────────────────────────
    prompt = _build_prompt(
        question=msg_row.question_text or "",
        answer=msg_row.content or "",
        question_type=msg_row.question_type or "behavioral",
        job_title=msg_row.job_title or "",
        score=msg_row.score,
    )

    full_text = ""
    try:
        model = _get_analysis_model()
        stream = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 4096, "temperature": 0.3},
            stream=True,
        )
        for chunk in stream:
            if chunk.text:
                full_text += chunk.text
                yield _sse("chunk", json.dumps({"text": chunk.text}, ensure_ascii=False))
    except Exception as e:
        logger.error(f"[Analysis] Gemini stream error: {e}")
        yield _sse("error", json.dumps({"message": f"Lỗi AI: {str(e)[:100]}"}))
        return

    # ── 4. Parse JSON and save to DB ──────────────────────────────────────────
    try:
        m = re.search(r'\{.*\}', full_text, re.DOTALL)
        if not m:
            yield _sse("error", json.dumps({"message": "AI không trả về JSON hợp lệ"}))
            return

        analysis = json.loads(m.group())

        # Encode as MessagePack binary for analysis_data column
        packed = _pack({
            "v": 1,  # schema version
            "msg_id": message_id,
            "session_id": session_id,
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "missing_elements": analysis.get("missing_elements", []),
            "improved_example": analysis.get("improved_example", ""),
            "action_tips": analysis.get("action_tips", []),
            "score_explanation": analysis.get("score_explanation", ""),
            "raw_score": msg_row.score,
        })

        # Upsert into structured table
        db.execute(text("""
            INSERT INTO interview.interview_answer_analysis
                (session_id, message_id, user_id,
                 strengths, weaknesses, missing_elements,
                 improved_example, action_tips, score_explanation, raw_score)
            VALUES (:sid, :mid, :uid,
                    :strengths, :weaknesses, :missing,
                    :example, :tips, :score_exp, :raw_score)
            ON CONFLICT (message_id) DO UPDATE SET
                strengths        = EXCLUDED.strengths,
                weaknesses       = EXCLUDED.weaknesses,
                missing_elements = EXCLUDED.missing_elements,
                improved_example = EXCLUDED.improved_example,
                action_tips      = EXCLUDED.action_tips,
                score_explanation = EXCLUDED.score_explanation,
                raw_score        = EXCLUDED.raw_score,
                created_at       = NOW()
        """), {
            "sid": session_id,
            "mid": message_id,
            "uid": user_id,
            "strengths":  analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "missing":    analysis.get("missing_elements", []),
            "example":    analysis.get("improved_example", ""),
            "tips":       analysis.get("action_tips", []),
            "score_exp":  analysis.get("score_explanation", ""),
            "raw_score":  msg_row.score,
        })

        # Also store binary in interview_messages.analysis_data
        db.execute(text("""
            UPDATE interview.interview_messages
            SET analysis_data = :packed
            WHERE id = :mid
        """), {"packed": packed, "mid": message_id})

        db.commit()
        logger.info(f"[Analysis] Saved analysis for message {message_id}")

    except json.JSONDecodeError:
        db.rollback()
        yield _sse("error", json.dumps({"message": "Lỗi parse JSON từ AI"}))
        return
    except Exception as e:
        db.rollback()
        logger.error(f"[Analysis] DB save error: {e}")
        yield _sse("error", json.dumps({"message": f"Lỗi lưu DB: {str(e)[:80]}"}))
        return

    yield _sse("done", json.dumps({
        "analysis": analysis,
        "from_cache": False,
        "saved": True,
    }, ensure_ascii=False))


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get(
    "/stream/{session_id}/{message_id}",
    summary="Stream AI analysis for one interview answer (SSE)",
)
async def stream_answer_analysis(
    session_id: int,
    message_id: int,
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    SSE endpoint — streams AI deep analysis for a single candidate answer.
    Uses GEMINI_ANALYSIS_API_KEY (dedicated, not shared with TTS/STT).
    Caches result in interview.interview_answer_analysis table.

    Events: start | chunk | cached | done | error
    """
    # Auth: support both header and ?token= (SSE can't set custom headers)
    raw_token = token
    if not raw_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            raw_token = auth[7:]
    if not raw_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        from app.core.jwt import decode_token
        payload = decode_token(raw_token)
        user_id = int(payload.get("sub", 0))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Verify session ownership
    owns = db.execute(text("""
        SELECT 1 FROM interview.interview_sessions
        WHERE id = :sid AND user_id = :uid
    """), {"sid": session_id, "uid": user_id}).fetchone()

    if not owns:
        raise HTTPException(status_code=403, detail="Access denied")

    return StreamingResponse(
        _stream_analysis(session_id, message_id, user_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get(
    "/result/{session_id}/{message_id}",
    summary="Get saved analysis for one answer (from DB)",
)
def get_analysis_result(
    session_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Return already-saved analysis from DB without re-running AI."""
    row = db.execute(text("""
        SELECT a.strengths, a.weaknesses, a.missing_elements,
               a.improved_example, a.action_tips, a.score_explanation,
               a.raw_score, a.created_at
        FROM interview.interview_answer_analysis a
        JOIN interview.interview_sessions s ON s.id = a.session_id
        WHERE a.message_id = :mid AND a.session_id = :sid
          AND s.user_id = :uid
    """), {"mid": message_id, "sid": session_id, "uid": current_user.id}).fetchone()

    if not row:
        return {"found": False}

    return {
        "found": True,
        "analysis": {
            "strengths":        list(row.strengths or []),
            "weaknesses":       list(row.weaknesses or []),
            "missing_elements": list(row.missing_elements or []),
            "improved_example": row.improved_example or "",
            "action_tips":      list(row.action_tips or []),
            "score_explanation": row.score_explanation or "",
        },
        "raw_score":  row.raw_score,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
