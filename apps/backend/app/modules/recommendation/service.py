from __future__ import annotations
import os
import json
import http.client
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..assessments.models import Assessment


def _latest_assessment(session: Session, user_id: int) -> Assessment | None:
    from sqlalchemy import desc
    return (
        session.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(desc(Assessment.created_at))
        .first()
    )


def generate(session: Session, user_id: int, essay: str | None = None) -> dict:
    a = _latest_assessment(session, user_id)
    base = {"user_id": user_id, "scores": a.scores if a else {}, "essay": essay}

    ai_url = os.getenv("AI_SERVICE_URL")
    if ai_url:
        try:
            u = urlparse(ai_url)
            conn = http.client.HTTPConnection(u.hostname, u.port or 80, timeout=5)
            conn.request(
                "POST",
                "/api/recommend",
                body=json.dumps(base),
                headers={"Content-Type": "application/json"},
            )
            resp = conn.getresponse()
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception:
            pass

    # fallback mock
    return {
        "recommendations": [
            {"career_id": "1", "score": 0.92},
            {"career_id": "2", "score": 0.88},
            {"career_id": "3", "score": 0.82},
        ],
        "source": "fallback",
    }

