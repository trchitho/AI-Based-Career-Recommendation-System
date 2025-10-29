from __future__ import annotations
import random
from typing import Literal
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    AssessmentForm,
    AssessmentQuestion,
    Assessment,
    AssessmentResponse,
    UserFeedback,
)
from ..content.models import Essay


def _normalize_type(t: str) -> str:
    # Map FE types to DB enum/check-compatible values
    return "BigFive" if t == "BIG_FIVE" else t


def get_questions(
    session: Session,
    test_type: Literal["RIASEC", "BIG_FIVE"],
    *,
    shuffle: bool = False,
    seed: int | None = None,
    lang: str | None = None,
    limit: int | None = None,
    per_dim: int | None = None,
):
    db_type = _normalize_type(test_type)
    form_stmt = select(AssessmentForm.id).where(AssessmentForm.form_type == db_type)
    if lang:
        form_stmt = form_stmt.where(AssessmentForm.lang == lang)
    form_ids = [r[0] for r in session.execute(form_stmt).all()]
    if not form_ids:
        return []
    rows = (
        session.execute(
            select(AssessmentQuestion)
            .where(AssessmentQuestion.form_id.in_(form_ids))
            .order_by(AssessmentQuestion.form_id.asc(), AssessmentQuestion.question_no.asc())
        )
        .scalars()
        .all()
    )
    out = [q.to_client() | {"test_type": test_type} for q in rows]

    if shuffle:
        rng = random.Random(seed)
        rng.shuffle(out)
        for idx, item in enumerate(out, start=1):
            item["order_index"] = idx

    if per_dim and per_dim > 0:
        dims = ("RIASEC" if test_type == "RIASEC" else "OCEAN")
        cap: dict[str, int] = {d: 0 for d in dims}
        sel: list[dict] = []
        for it in out:
            dim_key = str(it.get("dimension") or "").upper()
            d = dim_key[:1] if dim_key else None
            if not d or d not in cap:
                continue
            if cap[d] < per_dim:
                sel.append(it)
                cap[d] += 1
            if all(v >= per_dim for v in cap.values()):
                break
        out = sel

    if limit and limit > 0:
        out = out[:limit]

    for idx, item in enumerate(out, start=1):
        item["order_index"] = idx
    return out


def save_assessment(session: Session, user_id: int, payload: dict) -> int:
    test_types = payload.get("testTypes") or []
    responses = payload.get("responses") or []
    a_type_client = (test_types[0] if test_types else "RIASEC")
    a_type = _normalize_type(a_type_client)

    # Accumulate scores per dimension for both tests
    riasec_letters = {"R", "I", "A", "S", "E", "C"}
    big5_letters = {"O", "C", "E", "A", "N"}
    riasec_acc: dict[str, list[float]] = {k: [] for k in riasec_letters}
    big5_acc: dict[str, list[float]] = {k: [] for k in big5_letters}

    # Fetch question keys as needed and aggregate
    for r in responses:
        raw_qid = r.get("questionId")
        qid_int = None
        try:
            if raw_qid is not None and str(raw_qid).isdigit():
                qid_int = int(str(raw_qid))
        except Exception:
            qid_int = None

        qkey = None
        if qid_int is not None:
            try:
                qobj = session.get(AssessmentQuestion, qid_int)
                if qobj and qobj.question_key:
                    qkey = qobj.question_key
            except Exception:
                qkey = None
        if qkey is None and raw_qid is not None:
            qkey = str(raw_qid)

        # normalize key and value
        dim = (qkey or "").strip().upper()[:1]
        val: float | None
        try:
            val = float(r.get("answer"))
        except Exception:
            val = None
        if val is None:
            continue
        if dim in riasec_acc:
            riasec_acc[dim].append(val)
        if dim in big5_acc:
            big5_acc[dim].append(val)

    def _avg_map(acc: dict[str, list[float]]) -> dict[str, float]:
        return {k: (round(sum(v)/len(v), 3) if v else 0.0) for k, v in acc.items()}

    scores_payload = {
        "riasec": _avg_map(riasec_acc),
        "big5": _avg_map(big5_acc),
    }

    assessment = Assessment(user_id=user_id, a_type=a_type, scores=scores_payload)
    session.add(assessment)
    session.flush()

    for r in responses:
        raw_qid = r.get("questionId")
        qid_int = None
        qkey = None
        try:
            if raw_qid is not None and str(raw_qid).isdigit():
                qid_int = int(str(raw_qid))
        except Exception:
            qid_int = None

        if qid_int is not None:
            try:
                qobj = session.get(AssessmentQuestion, qid_int)
                if qobj and qobj.question_key:
                    qkey = qobj.question_key
            except Exception:
                pass
        if qkey is None:
            qkey = str(raw_qid) if raw_qid is not None else None

        score_val = None
        try:
            score_val = float(r.get("answer"))
        except Exception:
            score_val = None

        ar = AssessmentResponse(
            assessment_id=assessment.id,
            question_id=qid_int,
            question_key=qkey,
            answer_raw=str(r.get("answer")),
            score_value=score_val,
        )
        session.add(ar)

    session.commit()
    return int(assessment.id)


def save_essay(session: Session, user_id: int, content: str) -> int:
    essay = Essay(user_id=user_id, lang="vi", content=content)
    session.add(essay)
    session.commit()
    return int(essay.id)


def build_results(session: Session, assessment_id: int) -> dict:
    obj = session.get(Assessment, assessment_id)
    if not obj:
        raise ValueError("Assessment not found")

    resp_rows = session.execute(
        select(AssessmentResponse).where(AssessmentResponse.assessment_id == obj.id)
    ).scalars().all()

    riasec_map = {
        "R": "realistic",
        "I": "investigative",
        "A": "artistic",
        "S": "social",
        "E": "enterprising",
        "C": "conventional",
    }
    big5_map = {
        "O": "openness",
        "C": "conscientiousness",
        "E": "extraversion",
        "A": "agreeableness",
        "N": "neuroticism",
    }

    riasec_acc: dict[str, list[float]] = {v: [] for v in riasec_map.values()}
    big5_acc: dict[str, list[float]] = {v: [] for v in big5_map.values()}

    for r in resp_rows:
        key = (r.question_key or "").strip().upper()
        try:
            val = float(r.score_value) if r.score_value is not None else float(r.answer_raw)
        except Exception:
            val = None
        if val is None:
            continue
        if key in riasec_map:
            riasec_acc[riasec_map[key]].append(val)
        if key in big5_map:
            big5_acc[big5_map[key]].append(val)

    def _avg(d: dict[str, list[float]]) -> dict[str, float]:
        out: dict[str, float] = {}
        for k, arr in d.items():
            out[k] = round(sum(arr) / len(arr), 3) if arr else 0.0
        return out

    riasec_scores = _avg(riasec_acc)
    big_five_scores = _avg(big5_acc)
    if not any(riasec_scores.values()) and not any(big_five_scores.values()):
        riasec_scores = {
            "realistic": 3.0,
            "investigative": 3.0,
            "artistic": 3.0,
            "social": 3.0,
            "enterprising": 3.0,
            "conventional": 3.0,
        }
        big_five_scores = {
            "openness": 3.0,
            "conscientiousness": 3.0,
            "extraversion": 3.0,
            "agreeableness": 3.0,
            "neuroticism": 3.0,
        }

    # Suggest top 3 careers (placeholder): pick first 3 existing IDs to avoid 404/500
    from ..content.models import Career  # local import to avoid cycles
    rec_rows = session.execute(select(Career.id).order_by(Career.id.asc()).limit(3)).all()
    rec_ids = [str(cid) for (cid,) in rec_rows]

    # Preload minimal career details to avoid FE N+1 calls
    careers_full: list[dict] = []
    try:
        if rec_ids:
            id_ints = [int(x) for x in rec_ids if str(x).isdigit()]
            if id_ints:
                rows = session.execute(
                    select(
                        Career.id,
                        Career.slug,
                        Career.title_vi,
                        Career.title_en,
                        Career.short_desc_vn,
                        Career.short_desc_en,
                    ).where(Career.id.in_(id_ints))
                ).all()
                for rid, slug, tvi, ten, sdesc_vn, sdesc_en in rows:
                    title = tvi or ten or ((slug or "").replace("-", " ").title())
                    sdesc = sdesc_vn or sdesc_en or ""
                    careers_full.append({
                        "id": str(rid),
                        "title": title,
                        "description": sdesc,
                        "slug": slug,
                    })
    except Exception:
        pass

    return {
        "assessment_id": str(obj.id),
        "user_id": str(obj.user_id),
        "riasec_scores": riasec_scores,
        "big_five_scores": big_five_scores,
        "career_recommendations": rec_ids,
        "career_recommendations_full": careers_full,
        "completed_at": obj.created_at.isoformat() if getattr(obj, "created_at", None) else None,
    }


def save_feedback(session: Session, user_id: int, assessment_id: int, rating: int, comment: str | None):
    if rating < 1 or rating > 5:
        raise ValueError("rating must be 1..5")
    fb = UserFeedback(user_id=user_id, assessment_id=assessment_id, rating=rating, comment=(comment or None))
    session.add(fb)
    session.commit()
