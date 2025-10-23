from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import os, json
import http.client
from ..assessments.models import Assessment
from ...core.jwt import require_user

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.post("/generate")
def generate_recommendations(request: Request, payload: dict):
    uid = require_user(request)
    session = _db(request)
    # latest assessment for user (simple)
    a = session.execute(select(Assessment).where(Assessment.user_id == uid).order_by(Assessment.created_at.desc())).scalars().first()
    base = {"user_id": uid, "scores": a.scores if a else {}, "essay": payload.get("essay")}

    ai_url = os.getenv("AI_SERVICE_URL")
    if ai_url:
        try:
            # very simple HTTP client (ai_url like http://host:port)
            from urllib.parse import urlparse
            u = urlparse(ai_url)
            conn = http.client.HTTPConnection(u.hostname, u.port or 80, timeout=5)
            conn.request("POST", "/api/recommend", body=json.dumps(base), headers={"Content-Type": "application/json"})
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

