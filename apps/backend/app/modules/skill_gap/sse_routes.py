"""
SSE (Server-Sent Events) endpoints for AI-heavy skill-gap operations.
Streams responses chunk by chunk instead of waiting for full completion.
"""
import re
from app.core.serialization import dumps_str as _to_json, loads as _from_json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from app.modules.skill_gap.service import SkillGapService


def _get_user_id_from_request(
    request: Request,
    token: Optional[str] = Query(None, description="JWT token (for EventSource which cannot set headers)"),
    db: Session = Depends(get_db),
) -> int:
    """
    Lấy user_id từ Authorization header HOẶC ?token= query param.
    EventSource API của browser không hỗ trợ custom headers, nên cần query param.
    """
    # 1. Try query param first (EventSource)
    raw_token = token
    # 2. Fallback to Authorization header
    if not raw_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            raw_token = auth[7:]
    if not raw_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        from app.core.jwt import decode_token
        payload = decode_token(raw_token)
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return int(sub)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

router = APIRouter(prefix="/api/skill-gap", tags=["skill-gap-sse"])


def _sse(event: str, data: dict) -> str:
    """Format a single SSE event using orjson (binary serialization)."""
    return f"event: {event}\ndata: {_to_json(data)}\n\n"


async def _stream_learning_plan(
    analysis_id: int,
    user_id: int,
    db: Session,
) -> AsyncGenerator[str, None]:
    """Core generator: builds prompt, streams Gemini response via SSE."""
    from app.modules.skill_gap.models import SkillGapAnalysis
    from sqlalchemy import text as _text

    # 1. Fetch analysis
    analysis = db.query(SkillGapAnalysis).filter(
        SkillGapAnalysis.id == analysis_id,
        SkillGapAnalysis.user_id == user_id,
    ).first()

    if not analysis:
        yield _sse("error", {"message": "Analysis not found"})
        return

    # 2. Return cache if available
    if analysis.learning_plan_cache:
        yield _sse("cached", {"plan": analysis.learning_plan_cache})
        yield _sse("done", {"from_cache": True})
        return

    # 3. Build prompt
    critical     = (analysis.skill_gaps or {}).get("critical", [])
    important    = (analysis.skill_gaps or {}).get("important", [])
    nice_to_have = (analysis.skill_gaps or {}).get("nice_to_have", [])
    matched      = analysis.matched_skills or []

    critical_names  = [s["name"] for s in critical[:8]]
    important_names = [s["name"] for s in important[:6]]
    nice_names      = [s["name"] for s in nice_to_have[:4]]
    matched_names   = [s["name"] for s in matched[:6]]

    prompt = f"""Tạo lộ trình học tập chi tiết bằng tiếng Việt cho người dùng muốn trở thành {analysis.career_id}.

Kỹ năng đã có: {', '.join(matched_names) or 'Chưa có'}
Kỹ năng CRITICAL cần học: {', '.join(critical_names) or 'Không có'}
Kỹ năng IMPORTANT cần học: {', '.join(important_names) or 'Không có'}
Kỹ năng nice-to-have: {', '.join(nice_names) or 'Không có'}
Mức độ phù hợp hiện tại: {analysis.match_percentage:.0f}%

Trả về JSON (không có text ngoài JSON):
{{
  "total_weeks": <số>,
  "summary": "<tổng quan lộ trình 1-2 câu>",
  "phases": [
    {{
      "phase": 1,
      "title": "<tên giai đoạn>",
      "weeks": "<ví dụ: Tuần 1-4>",
      "focus": "<mục tiêu giai đoạn>",
      "skills": ["skill1", "skill2"],
      "resources": [
        {{"name": "<tên khoá/tài liệu>", "platform": "<Coursera/Udemy/YouTube/freeCodeCamp/docs>", "type": "<course/video/docs/practice>", "level": "<beginner/intermediate/advanced>", "free": <true/false>}}
      ]
    }}
  ],
  "milestones": [
    {{"week": <số>, "title": "<tiêu đề>", "description": "<mô tả ngắn>"}}
  ]
}}
Tạo 3-4 phases, mỗi phase 2-4 resources cụ thể có tên thật."""

    # 4. Stream Gemini response
    yield _sse("start", {"message": "Đang tạo lộ trình học tập..."})

    from app.core.gemini_manager import multi_stream_manager
    stream = multi_stream_manager.get_cv_stream()

    full_text = ""
    try:
        for chunk in stream.generate_content_stream(prompt, max_output_tokens=3000, temperature=0.4):
            full_text += chunk
            yield _sse("chunk", {"text": chunk})
    except Exception as e:
        print(f"[sse-stream] Gemini error: {e}")
        yield _sse("error", {"message": "AI generation failed"})
        return

    # 5. Parse and cache
    try:
        cleaned = full_text.strip()
        cleaned = re.sub(r'^```(?:json)?', '', cleaned).rstrip('`').strip()
        m = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if m:
            plan = _from_json(m.group())
            # Save to cache
            try:
                db.execute(
                    _text("UPDATE core.skill_gap_analyses SET learning_plan_cache = :plan WHERE id = :id"),
                    {"plan": _to_json(plan), "id": analysis_id}
                )
                db.commit()
                analysis.learning_plan_cache = plan
            except Exception as ce:
                print(f"[sse-cache] Save error: {ce}")
                db.rollback()
            yield _sse("done", {"plan": plan})
            return
    except Exception as pe:
        print(f"[sse-parse] Parse error: {pe}")

    # Fallback: send raw text
    yield _sse("done", {"raw": full_text})


# ── Learning Plan SSE ─────────────────────────────────────────────
@router.get("/learning-plan-stream/{analysis_id}")
async def stream_learning_plan(
    analysis_id: int,
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    SSE endpoint — streams AI learning plan generation.
    Supports both Authorization header and ?token= query param (for browser EventSource).
    Events: start | chunk | cached | done | error
    """
    user_id = _get_user_id_from_request(request, token, db)
    return StreamingResponse(
        _stream_learning_plan(analysis_id, user_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Chatbot SSE ───────────────────────────────────────────────────
async def _stream_chatbot(
    message: str,
    history: list,
    user_id: int,
    db: Session,
) -> AsyncGenerator[str, None]:
    """Stream chatbot response."""
    from app.core.gemini_manager import multi_stream_manager

    yield _sse("start", {"message": "Đang xử lý..."})

    stream = multi_stream_manager.get_chatbot_stream()
    if not stream or not stream.is_available():
        yield _sse("error", {"message": "Chatbot không khả dụng"})
        return

    # Build context
    ctx = "\n".join([f"{h['role']}: {h['content']}" for h in history[-6:]])
    history_block = f"Lịch sử hội thoại:\n{ctx}" if ctx else ""
    prompt = f"""Bạn là AI Career Advisor. Trả lời ngắn gọn, hữu ích bằng tiếng Việt.
{history_block}
Người dùng: {message}
AI:"""

    full = ""
    try:
        for chunk in stream.generate_content_stream(prompt, max_output_tokens=800, temperature=0.6):
            full += chunk
            yield _sse("chunk", {"text": chunk})
    except Exception as e:
        yield _sse("error", {"message": str(e)[:100]})
        return

    yield _sse("done", {"full_response": full})
