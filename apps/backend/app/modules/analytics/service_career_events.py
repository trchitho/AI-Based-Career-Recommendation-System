from typing import Optional
from sqlalchemy.orm import Session

from .models import CareerEvent
from app.modules.auth.models import User

def log_career_event(
    db: Session,
    *,
    event_type: str,
    job_id: str,
    rank_pos: Optional[int] = None,
    score_shown: Optional[float] = None,
    ref: Optional[str] = None,
    source: str = "neumf",
    user: Optional[User] = None,
):
    ev = CareerEvent(
        user_id=user.id if user else None,
        job_id=job_id,
        event_type=event_type,
        rank_pos=rank_pos,
        score_shown=score_shown,
        ref=ref,
        source=source,
    )
    db.add(ev)
    db.commit()
