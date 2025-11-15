from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import Session

from ...core.jwt import require_user
from . import service

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


def _normalize_type(t: str) -> str:
    return service._normalize_type(t)


@router.get("/questions/{test_type}")
def get_questions(
    request: Request,
    test_type: Literal["RIASEC", "BIG_FIVE"],
    shuffle: bool = False,
    seed: int | None = None,
    lang: str | None = None,
    limit: int | None = None,
    per_dim: int | None = None,
):
    session = _db(request)
    try:
        return service.get_questions(
            session,
            test_type,
            shuffle=shuffle,
            seed=seed,
            lang=lang,
            limit=limit,
            per_dim=per_dim,
        )
    except Exception as e:
        # Avoid 500 to keep FE functional if DB seed chưa sẵn
        print("[assessments] get_questions error:", repr(e))
        return []


@router.post("/submit")
def submit_assessment(request: Request, payload: dict):
    session = _db(request)
    user_id = require_user(request)
    try:
        aid = service.save_assessment(session, user_id, payload)
        return {"assessmentId": str(aid)}
    except Exception as e:
        print("[assessments] submit error:", repr(e))
        raise


@router.post("/essay")
def submit_essay(request: Request, payload: dict):
    session = _db(request)
    user_id = require_user(request)
    content = payload.get("essayText") or payload.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="essayText is required")
    eid = service.save_essay(session, user_id, content)
    return {"status": "ok", "essay_id": str(eid)}


@router.get("/{assessment_id}/results")
def get_results(request: Request, assessment_id: int):
    session = _db(request)
    try:
        return service.build_results(session, assessment_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Assessment not found")


@router.post("/{assessment_id}/feedback")
def submit_feedback(request: Request, assessment_id: int, payload: dict):
    session = _db(request)
    uid = require_user(request)
    try:
        rating = int(payload.get("rating") or 0)
        comment = (payload.get("comment") or "").strip() or None
        service.save_feedback(session, uid, assessment_id, rating, comment)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
