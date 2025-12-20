# app/modules/analytics/service_career_events.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


class CareerEventsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _insert_event(
        self,
        *,
        user_id: Optional[int],
        session_id: Optional[str],
        job_id: str,
        event_type: str,
        rank_pos: Optional[int] = None,
        score_shown: Optional[float] = None,
        source: str = "neumf",
        ref: Optional[str] = None,
        dwell_ms: Optional[int] = None,
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO analytics.career_events
                    (user_id, session_id, job_id, event_type,
                     rank_pos, score_shown, source, ref, dwell_ms)
                VALUES
                    (:user_id, :session_id, :job_id, :event_type,
                     :rank_pos, :score_shown, :source, :ref, :dwell_ms)
                """
            ),
            {
                "user_id": user_id,
                "session_id": session_id,
                "job_id": job_id,
                "event_type": event_type,
                "rank_pos": rank_pos,
                "score_shown": score_shown,
                "source": source,
                "ref": ref,
                "dwell_ms": dwell_ms,
            },
        )
        self.db.commit()

    # public helpers
    def log_event(
        self,
        *,
        user_id: Optional[int],
        session_id: Optional[str],
        job_id: str,
        event_type: str,
        rank_pos: Optional[int] = None,
        score_shown: Optional[float] = None,
        ref: Optional[str] = None,
        dwell_ms: Optional[int] = None,
    ) -> None:
        self._insert_event(
            user_id=user_id,
            session_id=session_id,
            job_id=job_id,
            event_type=event_type,
            rank_pos=rank_pos,
            score_shown=score_shown,
            ref=ref,
            dwell_ms=dwell_ms,
        )

    def log_impression(
        self,
        *,
        user_id: Optional[int],
        session_id: Optional[str],
        job_id: str,
        rank_pos: Optional[int],
        score_shown: Optional[float],
        ref: Optional[str] = None,
    ) -> None:
        self._insert_event(
            user_id=user_id,
            session_id=session_id,
            job_id=job_id,
            event_type="impression",
            rank_pos=rank_pos,
            score_shown=score_shown,
            ref=ref,
        )

    def log_click(
        self,
        *,
        user_id: Optional[int],
        session_id: Optional[str],
        job_id: str,
        rank_pos: Optional[int],
        score_shown: Optional[float],
        ref: Optional[str] = None,
        dwell_ms: Optional[int] = None,
    ) -> None:
        self._insert_event(
            user_id=user_id,
            session_id=session_id,
            job_id=job_id,
            event_type="click",
            rank_pos=rank_pos,
            score_shown=score_shown,
            ref=ref,
            dwell_ms=dwell_ms,
        )
