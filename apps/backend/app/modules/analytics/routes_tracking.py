# app/modules/analytics/routes_tracking.py
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.auth.deps import get_current_user_optional
from app.modules.users.models import User
from .service_career_events import CareerEventsService

router = APIRouter(prefix="", tags=["tracking"])
logger = logging.getLogger(__name__)

# Event types that require dwell_ms
DWELL_REQUIRED_EVENTS = {"click", "save", "apply"}


class CareerEventIn(BaseModel):
    event_type: str  # 'impression' | 'click' | 'save' | 'apply'
    job_id: str
    rank_pos: Optional[int] = None
    score_shown: Optional[float] = None
    ref: Optional[str] = None
    dwell_ms: Optional[int] = None


@router.post("/career-event", status_code=status.HTTP_204_NO_CONTENT)
def track_career_event(
    payload: CareerEventIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    svc = CareerEventsService(db)

    session_id = request.headers.get("X-Session-Id")
    # ưu tiên user đang login, fallback X-User-Id nếu có
    user_id: Optional[int] = current_user.id if current_user else None
    if not user_id:
        raw_uid = request.headers.get("X-User-Id")
        if raw_uid:
            try:
                user_id = int(raw_uid)
            except ValueError:
                user_id = None

    # Validate and normalize dwell_ms based on event_type
    dwell_ms: Optional[int] = payload.dwell_ms
    event_type = payload.event_type.lower()

    if event_type == "impression":
        # Impression: dwell_ms should be NULL
        dwell_ms = None
    elif event_type in DWELL_REQUIRED_EVENTS:
        # Click/save/apply: dwell_ms is required
        if dwell_ms is None:
            # Auto-fix: set to 0 with warning log
            logger.warning(
                f"[TRACKING] {event_type} event missing dwell_ms, "
                f"auto-fixing to 0. job_id={payload.job_id}, user_id={user_id}"
            )
            dwell_ms = 0
        elif dwell_ms < 0:
            # Invalid negative value, fix to 0
            logger.warning(
                f"[TRACKING] {event_type} event has negative dwell_ms={dwell_ms}, "
                f"auto-fixing to 0. job_id={payload.job_id}, user_id={user_id}"
            )
            dwell_ms = 0

    svc.log_event(
        user_id=user_id,
        session_id=session_id,
        job_id=payload.job_id,
        event_type=event_type,
        rank_pos=payload.rank_pos,
        score_shown=payload.score_shown,
        ref=payload.ref,
        dwell_ms=dwell_ms,
    )
