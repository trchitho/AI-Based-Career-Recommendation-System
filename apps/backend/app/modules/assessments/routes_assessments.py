from __future__ import annotations

import base64
import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.modules.assessments.schemas import AssessmentResultsOut
from .models import Assessment, AssessmentSession
from sqlalchemy import func

from ..content.models import EssayPrompt
from ...core.subscription import SubscriptionService, require_feature_access
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
    
    # Check subscription status
    subscription = SubscriptionService.get_user_subscription(user_id, db)
    is_premium = subscription["is_premium"]
    
    if not is_premium:
        # For free users, check monthly assessment limit
        usage = SubscriptionService.get_user_usage(user_id, "assessment", db)
        current_usage = usage["usage_count"]
        limit = subscription["limits"].get("assessments_per_month", 5)
        
        if current_usage >= limit:
            raise HTTPException(
                status_code=402,  # Payment Required
                detail={
                    "message": f"Bạn đã sử dụng hết {limit} lần test miễn phí trong tháng này. Nâng cấp để test không giới hạn.",
                    "feature": "assessment",
                    "current_usage": current_usage,
                    "limit": limit,
                    "upgrade_required": True,
                    "reset_date": "Đầu tháng tới"
                }
            )
    
    try:
        assessment_id = save_assessment(
            db,
            user_id=user_id,
            payload=body.model_dump(),
        )
        
        # Increment usage count for non-premium users
        if not is_premium:
            SubscriptionService.increment_usage(user_id, "assessment", db)
            # Get updated usage for response
            updated_usage = SubscriptionService.get_user_usage(user_id, "assessment", db)
            current_usage = updated_usage["usage_count"]
            limit = subscription["limits"].get("assessments_per_month", 5)
        else:
            current_usage = -1  # Unlimited
            limit = -1

        traits = fuse_user_traits(db, user_id=user_id) or {}

        return {
            "assessmentId": str(assessment_id),
            "hasEssayTraits": bool(traits.get("has_essay_traits")),
            "hasFusedTraits": bool(traits.get("has_fused_traits")),
            "traits": traits,
            "usage_info": {
                "current_usage": current_usage,
                "limit": limit,
                "remaining": max(0, limit - current_usage) if limit != -1 else -1,
                "is_premium": is_premium
            }
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
    print(f"[assessments] POST /essay called: user_id={user_id}, essayText_len={len(body.essayText or '')}, promptId={body.promptId}")
    try:
        essay_id = save_essay(
            db,
            user_id=user_id,
            content=body.essayText,
            prompt_id=body.promptId,   # <-- dùng promptId FE gửi
            lang=body.lang,
        )
        print(f"[assessments] POST /essay: essay saved with id={essay_id}")

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


@router.post("/{assessment_id}/save-results")
def api_save_processed_results(
    assessment_id: int,
    body: dict,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Save processed assessment results (RIASEC/Big Five scores) back to database.
    This ensures the processed results are persisted for assessment history.
    """
    try:
        # Verify the assessment belongs to the user
        assessment = db.get(Assessment, assessment_id)
        if not assessment or assessment.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to save results for this assessment"
            )
        
        # Update the assessment with processed results
        if 'riasec_scores' in body and body['riasec_scores']:
            # Convert percentage scores back to 0-1 scale for storage
            riasec_scores = {}
            for key, value in body['riasec_scores'].items():
                if isinstance(value, (int, float)):
                    riasec_scores[key] = value / 100.0
            assessment.processed_riasec_scores = riasec_scores
        
        if 'big_five_scores' in body and body['big_five_scores']:
            # Convert percentage scores back to 0-1 scale for storage
            big_five_scores = {}
            for key, value in body['big_five_scores'].items():
                if isinstance(value, (int, float)):
                    big_five_scores[key] = value / 100.0
            assessment.processed_big_five_scores = big_five_scores
        
        if 'top_interest' in body:
            assessment.top_interest = body['top_interest']
        
        if 'career_recommendations' in body:
            assessment.career_recommendations = body['career_recommendations']
        
        if 'essay_analysis' in body:
            assessment.essay_analysis = body['essay_analysis']
        
        db.commit()
        
        return {"ok": True, "message": "Processed results saved successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"[assessments] save_processed_results error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save processed results"
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


@router.get("/session/{session_id}/results")
def get_session_results(
    session_id: int,
    db: Session = Depends(_db),
    current_user_id: int = Depends(_current_user_id),
):
    """
    Lấy kết quả theo session (bao gồm cả RIASEC và BigFive trong cùng session).
    """
    try:
        # Lấy tất cả assessments trong session
        assessments = db.query(Assessment).filter(
            Assessment.session_id == session_id
        ).all()
        
        if not assessments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Kiểm tra quyền truy cập
        if assessments[0].user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view this session"
            )
        
        riasec_assessment = None
        bigfive_assessment = None
        
        for assessment in assessments:
            if assessment.a_type == "RIASEC":
                riasec_assessment = assessment
            elif assessment.a_type == "BigFive":
                bigfive_assessment = assessment
        
        # Build results cho từng loại
        riasec_results = None
        bigfive_results = None
        
        if riasec_assessment:
            riasec_results = build_results(db, riasec_assessment.id)
        
        if bigfive_assessment:
            bigfive_results = build_results(db, bigfive_assessment.id)
        
        return {
            "session_id": session_id,
            "user_id": current_user_id,
            "riasec": riasec_results,
            "bigfive": bigfive_results,
            "created_at": assessments[0].created_at.isoformat() if assessments else None
        }
        
    except Exception as e:
        print(f"[assessments] get_session_results error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session results"
        )


@router.get("/user/sessions")
def get_user_sessions(
    db: Session = Depends(_db),
    current_user_id: int = Depends(_current_user_id),
):
    """
    Lấy danh sách tất cả sessions của user với processed results.
    """
    try:
        # Lấy sessions của user
        sessions_query = db.query(AssessmentSession).filter(
            AssessmentSession.user_id == current_user_id
        ).order_by(AssessmentSession.created_at.desc()).all()
        
        sessions_data = []
        for session in sessions_query:
            # Lấy assessments trong session này
            assessments = db.query(Assessment).filter(
                Assessment.session_id == session.id
            ).all()
            
            assessment_types = [a.a_type for a in assessments]
            
            # Get processed results for each assessment
            session_assessments = []
            for assessment in assessments:
                assessment_data = {
                    "id": str(assessment.id),
                    "completed_at": assessment.created_at.isoformat(),
                    "test_types": [assessment.a_type],
                    "riasec_scores": None,
                    "big_five_scores": None,
                    "top_interest": assessment.top_interest
                }
                
                # Convert processed scores from 0-1 scale to 0-100 scale for frontend
                if assessment.processed_riasec_scores:
                    assessment_data["riasec_scores"] = {
                        key: value * 100 for key, value in assessment.processed_riasec_scores.items()
                    }
                
                if assessment.processed_big_five_scores:
                    assessment_data["big_five_scores"] = {
                        key: value * 100 for key, value in assessment.processed_big_five_scores.items()
                    }
                
                session_assessments.append(assessment_data)
            
            sessions_data.append({
                "session_id": session.id,
                "created_at": session.created_at.isoformat(),
                "assessment_count": len(assessments),
                "assessment_types": ", ".join(assessment_types),
                "assessments": session_assessments
            })
        
        return {
            "user_id": current_user_id,
            "sessions": sessions_data
        }
        
    except Exception as e:
        print(f"[assessments] get_user_sessions error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user sessions"
        )
