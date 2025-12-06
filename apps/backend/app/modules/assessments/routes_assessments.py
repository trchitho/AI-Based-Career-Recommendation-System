from __future__ import annotations

import base64
import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.modules.assessments.schemas import AssessmentResultsOut
from .models import Assessment
from sqlalchemy import func

from ..content.models import EssayPrompt
from .service import (
    get_questions,
    save_assessment,
    save_essay,
    build_results,
    save_feedback,   # ✅ thêm
    fuse_user_traits,
)

# KHÔNG thêm "/api" ở đây vì main.py đã prefix="/api/assessments"
router = APIRouter(prefix="", tags=["assessments"])


# -------------------------------------------------------------------
# DB + User helpers
# -------------------------------------------------------------------


def _db(req: Request) -> Session:
    """
    Lấy Session từ req.state.db (middleware DB đã gắn trước đó).
    """
    db = getattr(req.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database session not available on request state",
        )
    return db


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    """
    Decode payload của JWT mà KHÔNG verify chữ ký.
    Dùng base64url (thư viện chuẩn) nên không cần phụ thuộc ngoài.
    """
    try:
        # JWT = header.payload.signature
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("invalid jwt format")

        payload_b64 = parts[1]
        # Thêm padding cho base64url
        padding = "=" * (-len(payload_b64) % 4)
        payload_b64 += padding

        raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("jwt payload not object")
        return data
    except Exception as e:
        raise ValueError(f"cannot decode jwt: {e!r}") from e


def _current_user_id(req: Request) -> int:
    """
    Lấy user_id từ nhiều nguồn, ưu tiên:

      1) req.state.user_id
      2) req.state.user.id / req.state.user.user_id
      3) header 'X-User-Id'
      4) payload của JWT trong Authorization: Bearer <token>
         (decode payload bằng base64url, KHÔNG verify signature)

    Nếu TẤT CẢ đều fail → 401.
    Tuyệt đối không fallback user_id = 1 để tránh log sai user.
    """
    uid: Any = getattr(req.state, "user_id", None)

    # 2) req.state.user
    user_obj = getattr(req.state, "user", None)
    if uid is None and user_obj is not None:
        uid = getattr(user_obj, "id", None) or getattr(
            user_obj, "user_id", None
        )

    # 3) header X-User-Id (tuỳ chọn – nếu FE muốn gửi kèm)
    if uid is None:
        hdr = req.headers.get("X-User-Id")
        if hdr:
            try:
                uid = int(hdr)
            except ValueError:
                uid = None

    # 4) Decode JWT từ Authorization header nếu vẫn chưa có uid
    if uid is None:
        auth = req.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[len("Bearer ") :].strip()
            if token:
                try:
                    payload = _decode_jwt_payload(token)
                    uid = (
                        payload.get("user_id")
                        or payload.get("sub")
                        or payload.get("id")
                    )
                except ValueError as e:
                    # Log nhẹ cho debug, nhưng vẫn coi như chưa lấy được uid
                    print(
                        "[assessments] _current_user_id jwt decode error:",
                        repr(e),
                    )
                    uid = None

    if uid is None:
        # Ở đây mà 401 thì nghĩa là middleware auth chưa set state
        # và FE cũng không gửi header nào chứa user_id.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthenticated user",
        )

    try:
        return int(uid)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user id",
        )


# -------------------------------------------------------------------
# Pydantic models
# -------------------------------------------------------------------


class QuestionResponseIn(BaseModel):
    questionId: Any
    answer: Any | None = None


class AssessmentSubmitIn(BaseModel):
    testTypes: List[str] = []
    responses: List[QuestionResponseIn]


class EssaySubmitIn(BaseModel):
    essayText: str
    assessmentId: Optional[int] = None
    promptId: Optional[int] = None
    lang: Optional[str] = None


class EssayPromptOut(BaseModel):
    id: int
    title: str
    prompt_text: str
    lang: str


class FeedbackIn(BaseModel):
    rating: int
    comment: Optional[str] = None


# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------


@router.get("/questions/{test_type}")
def api_get_questions(
    test_type: str,
    db: Session = Depends(_db),
    shuffle: bool = Query(False),
    seed: Optional[int] = Query(None),
    per_dim: Optional[int] = Query(None),
    lang: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
):
    """
    Lấy danh sách câu hỏi cho 1 loại test (RIASEC / BIG_FIVE).
    """
    try:
        items = get_questions(
            db,
            test_type=test_type,
            shuffle=shuffle,
            seed=seed,
            lang=lang,
            limit=limit,
            per_dim=per_dim,
        )
        return items
    except Exception as e:
        print("[assessments] get_questions error:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load questions",
        )


@router.post("/submit")
def api_submit_assessment(
    body: AssessmentSubmitIn,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Nhận toàn bộ bài làm trắc nghiệm và trả về assessmentId.
    user_id lấy từ _current_user_id (dựa trên req.state / header / JWT).
    """
    try:
        assessment_id = save_assessment(
            db,
            user_id=user_id,
            payload=body.model_dump(),
        )

        traits = fuse_user_traits(db, user_id=user_id) or {}

        return {
            "assessmentId": str(assessment_id),
            "hasEssayTraits": bool(traits.get("has_essay_traits")),
            "hasFusedTraits": bool(traits.get("has_fused_traits")),
            "traits": traits,
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        db.rollback()
        print("[assessments] submit assessment error:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit assessment",
        )



@router.post("/essay")
def api_submit_essay(
    body: EssaySubmitIn,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Ghi nhận essay tự luận sau khi hoàn thành test.
    """
    try:
        essay_id = save_essay(
            db,
            user_id=user_id,
            content=body.essayText,
            prompt_id=body.promptId,   # <-- dùng promptId FE gửi
            lang=body.lang,
        )

        assessment_session_id: Optional[int] = None
        main_assessment_id: Optional[int] = body.assessmentId
        if body.assessmentId is not None:
            assess_obj = db.get(Assessment, body.assessmentId)
            if assess_obj is not None and assess_obj.session_id is not None:
                assessment_session_id = int(assess_obj.session_id)

        traits = fuse_user_traits(db, user_id=user_id) or {}

        has_essay_traits = bool(traits.get("has_essay_traits"))
        has_fused_traits = bool(traits.get("has_fused_traits"))

        return {
            "essayId": essay_id,
            "assessmentSessionId": assessment_session_id,
            "mainAssessmentId": main_assessment_id,
            "hasEssayTraits": has_essay_traits,
            "hasFusedTraits": has_fused_traits,
            "traits": traits,
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        db.rollback()
        print("[assessments] submit essay error:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit essay",
        )



@router.get("/essay-prompt", response_model=EssayPromptOut)
def api_get_essay_prompt(
    db: Session = Depends(_db),
    lang: Optional[str] = Query(None),
):
    """
    Trả về 1 prompt essay cho FE.

    - Nếu có lang: random 1 prompt đúng lang đó; nếu không có thì random toàn bảng.
    - Nếu không truyền lang: random toàn bộ prompts.
    """
    if lang:
        prompt = (
            db.query(EssayPrompt)
            .filter(EssayPrompt.lang == lang)
            .order_by(func.random())
            .first()
        )
        if prompt is None:
            prompt = db.query(EssayPrompt).order_by(func.random()).first()
    else:
        prompt = db.query(EssayPrompt).order_by(func.random()).first()

    if prompt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No essay prompt configured",
        )

    return EssayPromptOut(
        id=int(prompt.id),
        title=prompt.title,
        prompt_text=prompt.prompt_text,
        lang=prompt.lang or "vi",
    )


@router.post("/{assessment_id}/feedback")
def api_submit_feedback(
    assessment_id: int,
    body: FeedbackIn,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Lưu feedback người dùng cho 1 assessment cụ thể.
    FE gọi: POST /api/assessments/{assessment_id}/feedback
    body: { "rating": 3, "comment": "..." }
    """
    try:
        save_feedback(
            session=db,
            user_id=user_id,
            assessment_id=assessment_id,
            rating=body.rating,
            comment=body.comment,
        )
        return {"ok": True}
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        db.rollback()
        print("[assessments] submit feedback error:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback",
        )
    

@router.get("/{assessment_id}/results", response_model=AssessmentResultsOut)
def get_assessment_results(
    assessment_id: int,
    db: Session = Depends(_db),
    current_user_id: int = Depends(_current_user_id),
):
    """
    Lấy kết quả assessment (test scores + trait snapshot).
    - Join core.assessments + ai.user_trait_preds + ai.user_trait_fused
    - Trả:
      - riasec_scores, big_five_scores
      - traits: {riasec_test, riasec_essay, riasec_fused, big5_*}
    """
    results = build_results(db, assessment_id)

    # Chặn user xem assessment của người khác
    if results["user_id"] != current_user_id:
        # tuỳ bạn dùng HTTPException hay custom
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this assessment",
        )

    return results
