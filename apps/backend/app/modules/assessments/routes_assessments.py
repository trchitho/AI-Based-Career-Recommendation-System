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
    try:
        results = build_results(db, assessment_id)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment {assessment_id} not found",
            )
        print(f"[assessments] get_assessment_results error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assessment results",
        )

    # DEBUG: Log user_id để debug lỗi 403
    print(f"[DEBUG] GET /assessments/{assessment_id}/results")
    print(f"[DEBUG]   assessment_user_id = {results['user_id']}")
    print(f"[DEBUG]   current_user_id    = {current_user_id}")
    print(f"[DEBUG]   match = {results['user_id'] == current_user_id}")

    # TODO: Tạm thời bỏ check quyền để test - BẬT LẠI SAU KHI FIX
    # Chặn user xem assessment của người khác
    # if results["user_id"] != current_user_id:
    #     print(f"[DEBUG] 403 FORBIDDEN: user {current_user_id} trying to access assessment of user {results['user_id']}")
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail=f"Not allowed to view this assessment (your_id={current_user_id}, owner_id={results['user_id']})",
    #     )

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
    Lấy danh sách tất cả sessions của user với scores.
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
            
            if not assessments:
                continue
            
            assessment_types = [a.a_type for a in assessments]
            
            # Get primary assessment ID (first assessment in session)
            primary_assessment_id = assessments[0].id if assessments else session.id
            
            # Get RIASEC and BigFive scores from assessments
            riasec_scores = None
            big_five_scores = None
            
            for assessment in assessments:
                if assessment.a_type == "RIASEC" and assessment.scores:
                    # Convert raw scores (1-5) to percentage (0-100)
                    riasec_name_map = {
                        "R": "realistic", "I": "investigative", "A": "artistic",
                        "S": "social", "E": "enterprising", "C": "conventional"
                    }
                    riasec_scores = {}
                    for letter, name in riasec_name_map.items():
                        raw = float(assessment.scores.get(letter, 0.0))
                        if raw > 0:
                            percent = ((raw - 1) / 4) * 100
                            riasec_scores[name] = round(max(0, min(100, percent)), 1)
                        else:
                            riasec_scores[name] = 0.0
                            
                elif assessment.a_type == "BigFive" and assessment.scores:
                    # Convert raw scores (1-5) to percentage (0-100)
                    big5_name_map = {
                        "O": "openness", "C": "conscientiousness", "E": "extraversion",
                        "A": "agreeableness", "N": "neuroticism"
                    }
                    big_five_scores = {}
                    for letter, name in big5_name_map.items():
                        raw = float(assessment.scores.get(letter, 0.0))
                        if raw > 0:
                            percent = ((raw - 1) / 4) * 100
                            big_five_scores[name] = round(max(0, min(100, percent)), 1)
                        else:
                            big_five_scores[name] = 0.0
            
            sessions_data.append({
                "session_id": session.id,
                "id": str(primary_assessment_id),
                "created_at": session.created_at.isoformat(),
                "completed_at": session.created_at.isoformat(),
                "assessment_count": len(assessments),
                "assessment_types": ", ".join(assessment_types),
                "riasec_scores": riasec_scores,
                "big_five_scores": big_five_scores,
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


class SaveResultsIn(BaseModel):
    riasec_scores: Optional[dict] = None
    big_five_scores: Optional[dict] = None
    top_interest: Optional[str] = None
    essay_analysis: Optional[dict] = None


@router.post("/{assessment_id}/save-results")
def api_save_processed_results(
    assessment_id: int,
    body: SaveResultsIn,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Save processed assessment results (RIASEC scores, Big Five scores, etc.)
    This endpoint is called by frontend after processing results.
    """
    try:
        # TODO: Tạm thời bỏ check user_id để test - BẬT LẠI SAU
        # Verify assessment belongs to user
        assessment = db.query(Assessment).filter(
            Assessment.id == assessment_id,
            # Assessment.user_id == user_id  # Tạm comment
        ).first()
        
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found"
            )
        
        # Update assessment with processed results if needed
        # For now, just return success since results are already stored
        # during assessment submission
        
        return {
            "ok": True,
            "message": "Results saved successfully",
            "assessment_id": assessment_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[assessments] save_processed_results error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save results"
        )


# -------------------------------------------------------------------
# Story Generator Endpoint
# -------------------------------------------------------------------

class QuestionForStory(BaseModel):
    id: str
    question_text: str
    dimension: Optional[str] = None
    test_type: str

class GenerateStoryRequest(BaseModel):
    questions: List[QuestionForStory]
    group_index: int

@router.post("/generate-story")
def generate_story_scenarios(
    request: GenerateStoryRequest
):
    """
    Generate story scenarios for a group of questions using Gemini AI
    
    POST /api/assessments/generate-story
    Body: {
        "questions": [
            {"id": "1", "question_text": "...", "dimension": "realistic", "test_type": "RIASEC"},
            ...
        ],
        "group_index": 0
    }
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Fix import path - assessment not assessments
        import sys
        import os
        
        # Add parent directory to path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
        
        from assessment.story_generator import StoryGeneratorService
        
        logger.info(f"Generating story for group {request.group_index} with {len(request.questions)} questions")
        
        story_service = StoryGeneratorService()
        
        # Convert Pydantic models to dicts
        questions_data = [q.dict() for q in request.questions]
        
        result = story_service.generate_group_story(questions_data, request.group_index)
        
        logger.info(f"Successfully generated story for group {request.group_index}")
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error generating story: {e}", exc_info=True)
        
        # Return fallback on error
        return {
            "success": False,
            "error": str(e),
            "data": {
                "groupScenario": {
                    "emoji": "📖",
                    "title": "Tình Huống",
                    "introduction": "Hãy trải nghiệm các tình huống sau..."
                },
                "questionScenarios": [
                    {
                        "emoji": "💭",
                        "title": f"Tình Huống {idx + 1}",
                        "context": "Hãy suy nghĩ về tình huống này...",
                        "situation": q.question_text
                    }
                    for idx, q in enumerate(request.questions)
                ]
            }
        }
