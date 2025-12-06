from typing import Literal, Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import _db
from app.modules.auth.deps import get_current_user_optional
from app.modules.auth.models import User

router = APIRouter(prefix="", tags=["tracking"])


class CareerEventIn(BaseModel):
    event_type: Literal["impression", "click", "save", "apply"]
    job_id: str
    rank_pos: Optional[int] = None
    score_shown: Optional[float] = None
    ref: Optional[str] = None
    dwell_ms: Optional[int] = None


@router.post("/career-event", status_code=status.HTTP_201_CREATED)
def track_career_event(
    payload: CareerEventIn,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    db: Session = _db(request)

    # 1) Ưu tiên user từ auth (sau này em dùng JWT thì sẽ có)
    user_id: Optional[int] = current_user.id if current_user else None

    # 2) Nếu chưa có, fallback lấy từ header X-User-Id (FE gửi)
    if user_id is None:
        user_id_header = request.headers.get("X-User-Id")
        if user_id_header:
            try:
                user_id = int(user_id_header)
            except ValueError:
                user_id = None

    # Session ID: UUID string từ FE (đúng rồi)
    session_id = request.headers.get("X-Session-Id")

    result = db.execute(
        text(
            """
            INSERT INTO analytics.career_events
              (user_id, session_id, job_id, event_type,
               rank_pos, score_shown, source, ref, dwell_ms)
            VALUES
              (:user_id, :session_id, :job_id, :event_type,
               :rank_pos, :score_shown, :source, :ref, :dwell_ms)
            RETURNING id, created_at;
            """
        ),
        {
            "user_id": user_id,
            "session_id": session_id,
            "job_id": payload.job_id,
            "event_type": payload.event_type,
            "rank_pos": payload.rank_pos,
            "score_shown": payload.score_shown,
            "source": "neumf",
            "ref": payload.ref or "recommend",
            "dwell_ms": payload.dwell_ms,
        },
    )

    row = result.mappings().first()
    db.commit()

    return {
        "ok": True,
        "id": row["id"],
        "created_at": row["created_at"],
        "user_id": user_id,
        "session_id": session_id,
    }
