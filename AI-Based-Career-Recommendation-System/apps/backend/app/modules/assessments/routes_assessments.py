from fastapi import APIRouter, Request, HTTPException
from typing import Literal
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import AssessmentForm, AssessmentQuestion, Assessment, AssessmentResponse
from ..content.models import Essay  # reuse Essay model in content
from ...core.jwt import require_user

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/questions/{test_type}")
def get_questions(request: Request, test_type: Literal["RIASEC", "BIG_FIVE"]):
    session = _db(request)
    form = session.execute(
        select(AssessmentForm).where(AssessmentForm.form_type == test_type)
    ).scalar_one_or_none()
    if not form:
        return []
    rows = session.execute(
        select(AssessmentQuestion).where(AssessmentQuestion.form_id == form.id).order_by(AssessmentQuestion.question_no.asc())
    ).scalars().all()
    return [q.to_client() | {"test_type": test_type} for q in rows]


@router.post("/submit")
def submit_assessment(request: Request, payload: dict):
    session = _db(request)
    user_id = require_user(request)

    test_types = payload.get("testTypes") or []
    responses = payload.get("responses") or []
    a_type = (test_types[0] if test_types else "RIASEC")

    # naive scoring: if numeric answers, average
    numeric_scores = []
    for r in responses:
        v = r.get("answer")
        try:
            numeric_scores.append(float(v))
        except Exception:
            pass
    avg = round(sum(numeric_scores) / len(numeric_scores), 3) if numeric_scores else 0.0

    assessment = Assessment(user_id=user_id, a_type=a_type, scores={"avg": avg})
    session.add(assessment)
    session.flush()

    for r in responses:
        ar = AssessmentResponse(
            assessment_id=assessment.id,
            question_id=None,
            question_key=r.get("questionId"),
            answer_raw=str(r.get("answer")),
            score_value=None,
        )
        session.add(ar)

    session.commit()
    return {"assessmentId": str(assessment.id)}


@router.post("/essay")
def submit_essay(request: Request, payload: dict):
    session = _db(request)
    user_id = require_user(request)
    content = payload.get("essayText") or payload.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="essayText is required")
    essay = Essay(user_id=user_id, lang="vi", content=content)
    session.add(essay)
    session.commit()
    return {"status": "ok", "essay_id": str(essay.id)}


@router.get("/{assessment_id}/results")
def get_results(request: Request, assessment_id: int):
    session = _db(request)
    obj = session.get(Assessment, assessment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # demo career ids until recommendation module is wired
    return {
        "assessment_id": str(obj.id),
        "career_recommendations": ["1", "2", "3"],
        "scores": obj.scores or {},
    }
