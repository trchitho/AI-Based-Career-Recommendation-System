"""
FastAPI routes for AI Mock Interview feature
"""

from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import time
from functools import lru_cache
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ...core.auth_deps import get_current_user_from_token
from ...core.db import get_db
from ..auth.models import User
from .models import InterviewMessage, InterviewSession
from .schemas import (
    InterviewFeedbackRequest,
    InterviewHistoryResponse,
    InterviewStats,
    JDManualRequest,
    JDResponse,
    JobInfo,
    SkillContext,
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    UserInterviewsResponse,
)
from .services import InterviewService
from .ai_pipeline_service import AIPipelineService
from .jd_service import JDService

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=4)


def get_interview_service(db: Session = Depends(get_db)) -> InterviewService:
    return InterviewService(db)


def get_ai_pipeline_service(db: Session = Depends(get_db)) -> AIPipelineService:
    return AIPipelineService(db)


def get_jd_service(db: Session = Depends(get_db)) -> JDService:
    return JDService(db)


def _get_skills_info_for_question(session: InterviewSession, question_type: str, question_number: int = 1, db=None) -> dict:
    """Helper function để lấy thông tin skills cho câu hỏi - sử dụng logic chính xác từ services"""
    if not session or not session.skills_context:
        return {"skills_tested": [], "skills_type": None, "skills_details": []}
    
    # Sử dụng logic selection chính xác như trong services
    def is_hard_skill_safe(skill):
        is_hard = skill.get("is_hard_skill", False)
        if isinstance(is_hard, bool):
            return is_hard
        if isinstance(is_hard, str):
            return is_hard.lower() in ['true', 'yes', '1']
        if isinstance(is_hard, (int, float)):
            return bool(is_hard)
        return False
    
    def safe_importance(skill):
        importance = skill.get("importance")
        if importance is None:
            return 0
        try:
            value = float(importance)
            if value == float('inf') or value == float('-inf') or value != value:  # NaN check
                return 0
            return value
        except (ValueError, TypeError):
            return 0
    
    skills_context = session.skills_context
    soft_skills = [s for s in skills_context if not is_hard_skill_safe(s)]
    # technical dùng career hard skills (không phải JD), jd_specific dùng JD skills riêng
    hard_skills = [s for s in skills_context if is_hard_skill_safe(s) and s.get("source") != "jd"]
    
    # Sort theo importance DESC
    soft_skills.sort(key=safe_importance, reverse=True)
    hard_skills.sort(key=safe_importance, reverse=True)
    
    selected_skills = []
    skills_type = None
    
    if question_type == "technical":
        # Technical: 1 kỹ năng chuyên ngành cho mỗi câu hỏi
        # Đếm số câu technical đã hỏi từ DB nếu có, fallback heuristic
        if db is not None:
            technical_index = db.query(InterviewMessage).filter(
                InterviewMessage.session_id == session.id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_type == "technical"
            ).count()
        else:
            # Fallback heuristic khi không có DB
            technical_index = 0 if question_number <= 2 else 1
        
        if technical_index < len(hard_skills):
            selected_skills = [hard_skills[technical_index]]
        else:
            selected_skills = [hard_skills[technical_index % len(hard_skills)]] if hard_skills else []
        skills_type = "hard"
        
    elif question_type == "behavioral":
        if soft_skills:
            if db is not None:
                behavioral_index = db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session.id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "behavioral"
                ).count()
            else:
                behavioral_index = 0
            selected_skills = [soft_skills[behavioral_index % len(soft_skills)]]
        else:
            selected_skills = []
        skills_type = "soft"
        
    elif question_type == "situational":
        if soft_skills:
            if db is not None:
                situational_index = db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session.id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "situational"
                ).count()
            else:
                situational_index = 0
            offset = 1 if len(soft_skills) >= 2 else 0
            idx = (situational_index + offset) % len(soft_skills)
            selected_skills = [soft_skills[idx]]
        else:
            selected_skills = []
        skills_type = "soft"
        
    elif question_type == "jd_specific":
        jd_skills = [s for s in skills_context if s.get("source") == "jd"]
        jd_skills.sort(key=safe_importance, reverse=True)
        if not jd_skills:
            selected_skills = []
        else:
            # Đếm số câu jd_specific đã hỏi từ DB nếu có
            if db is not None:
                jd_index = db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session.id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "jd_specific"
                ).count()
            else:
                jd_index = 0
            idx = jd_index % len(jd_skills)
            selected_skills = [jd_skills[idx]]
        skills_type = "mixed"  # JD có thể có cả soft và hard skills
        
    elif question_type == "closing":
        # Closing questions don't test any skills
        selected_skills = []
        skills_type = None
        
    else:  # warm_up
        selected_skills = (soft_skills[:1] if soft_skills else hard_skills[:1])  # 1 skill only
        skills_type = "mixed"
    
    skills_tested = [s.get("skill_name", "") for s in selected_skills if s.get("skill_name")]
    
    return {
        "skills_tested": skills_tested,
        "skills_type": skills_type,
        "skills_details": selected_skills
    }


@router.post("/jd/manual", response_model=JDResponse)
async def submit_jd_manual(
    request: JDManualRequest,
    current_user: User = Depends(get_current_user_from_token),
    jd_service: JDService = Depends(get_jd_service),
):
    """Nhập JD thủ công (text)"""
    try:
        jd, jd_questions_count = jd_service.save_jd(current_user.id, request.career_id, request.content, "manual")
        
        # Build skills_context: soft skills từ nghề + hard skills từ JD
        skills_context = []
        if request.career_id:
            try:
                # Get career context để lấy soft skills
                from .ai_pipeline_service import AIPipelineService
                ai_service = AIPipelineService(jd_service.db)
                career_context = ai_service._get_career_context(request.career_id)
                
                if career_context:
                    # Lấy soft skills từ nghề (cho behavioral/situational)
                    soft_skills = [s for s in career_context.get('skills', []) if not s.get('is_hard_skill', False)]
                    skills_context.extend(soft_skills)
                    
                    # Build JD skills từ extracted_data (thay thế hard skills)
                    from .context_builder import build_interview_context
                    merged_context = build_interview_context(career_context, jd.extracted_data)
                    jd_skills = [s for s in merged_context.get('skills', []) if s.get('source') == 'jd']
                    skills_context.extend(jd_skills)
                else:
                    print(f"⚠️ Career context not found for career_id: {request.career_id}")
                    
            except Exception as e:
                print(f"⚠️ Failed to build skills_context for JD manual: {e}")
        else:
            # Fallback: Chỉ có JD skills khi không có career_id
            print("⚠️ No career_id provided, skills_context will only contain JD skills")
            try:
                from .context_builder import build_interview_context
                # Tạo empty career context
                empty_career_context = {"onet_code": "", "title": "Unknown Job", "skills": []}
                merged_context = build_interview_context(empty_career_context, jd.extracted_data)
                jd_skills = [s for s in merged_context.get('skills', []) if s.get('source') == 'jd']
                skills_context.extend(jd_skills)
            except Exception as e:
                print(f"⚠️ Failed to build JD-only skills_context: {e}")
        
        # CRITICAL FIX: Persist skills_context vào jd.extracted_data để start_interview có thể đọc
        if skills_context:
            try:
                updated_extracted = dict(jd.extracted_data or {})
                updated_extracted["skills_context"] = skills_context
                jd.extracted_data = updated_extracted
                jd_service.db.commit()
                print(f"✅ Persisted {len(skills_context)} skills_context to JD {jd.id}")
            except Exception as e:
                print(f"⚠️ Failed to persist skills_context: {e}")
        
        return JDResponse(
            jd_id=jd.id,
            career_id=jd.career_id,
            extracted_data=jd.extracted_data or {},
            jd_questions_count=jd_questions_count,
            source=jd.source,
            created_at=jd.created_at,
            skills_context=skills_context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jd/upload", response_model=JDResponse)
async def upload_jd_file(
    file: UploadFile = File(...),
    career_id: Optional[str] = None,
    current_user: User = Depends(get_current_user_from_token),
    jd_service: JDService = Depends(get_jd_service),
):
    """Upload file JD (PDF hoặc DOCX)"""
    try:
        content = await file.read()
        filename = file.filename or ""

        if filename.lower().endswith(".pdf"):
            raw_text = jd_service.extract_pdf_text(content)
            source = "pdf"
        elif filename.lower().endswith((".docx", ".doc")):
            raw_text = jd_service.extract_docx_text(content)
            source = "docx"
        else:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF hoặc DOCX")

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Không thể đọc nội dung file")

        jd, jd_questions_count = jd_service.save_jd(current_user.id, career_id, raw_text, source)
        
        # Build skills_context: soft skills từ nghề + hard skills từ JD
        skills_context = []
        if career_id:
            try:
                # Get career context để lấy soft skills
                from .ai_pipeline_service import AIPipelineService
                ai_service = AIPipelineService(jd_service.db)
                career_context = ai_service._get_career_context(career_id)
                
                if career_context:
                    # Lấy soft skills từ nghề (cho behavioral/situational)
                    soft_skills = [s for s in career_context.get('skills', []) if not s.get('is_hard_skill', False)]
                    skills_context.extend(soft_skills)
                    
                    # Build JD skills từ extracted_data (thay thế hard skills)
                    from .context_builder import build_interview_context
                    merged_context = build_interview_context(career_context, jd.extracted_data)
                    jd_skills = [s for s in merged_context.get('skills', []) if s.get('source') == 'jd']
                    skills_context.extend(jd_skills)
                else:
                    print(f"⚠️ Career context not found for career_id: {career_id}")
                    
            except Exception as e:
                print(f"⚠️ Failed to build skills_context for JD upload: {e}")
        else:
            # Fallback: Chỉ có JD skills khi không có career_id
            print("⚠️ No career_id provided, skills_context will only contain JD skills")
            try:
                from .context_builder import build_interview_context
                # Tạo empty career context
                empty_career_context = {"onet_code": "", "title": "Unknown Job", "skills": []}
                merged_context = build_interview_context(empty_career_context, jd.extracted_data)
                jd_skills = [s for s in merged_context.get('skills', []) if s.get('source') == 'jd']
                skills_context.extend(jd_skills)
            except Exception as e:
                print(f"⚠️ Failed to build JD-only skills_context: {e}")
        
        # CRITICAL FIX: Persist skills_context vào jd.extracted_data để start_interview có thể đọc
        if skills_context:
            try:
                updated_extracted = dict(jd.extracted_data or {})
                updated_extracted["skills_context"] = skills_context
                jd.extracted_data = updated_extracted
                jd_service.db.commit()
                print(f"✅ Persisted {len(skills_context)} skills_context to JD {jd.id}")
            except Exception as e:
                print(f"⚠️ Failed to persist skills_context: {e}")
        
        return JDResponse(
            jd_id=jd.id,
            career_id=jd.career_id,
            extracted_data=jd.extracted_data or {},
            jd_questions_count=jd_questions_count,
            source=jd.source,
            created_at=jd.created_at,
            skills_context=skills_context
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    request: StartInterviewRequest,
    current_user: User = Depends(get_current_user_from_token),
    ai_service: AIPipelineService = Depends(get_ai_pipeline_service),
):
    """
    Bắt đầu phiên phỏng vấn AI mới với Pipeline mới

    - **job_id**: O*NET code của nghề nghiệp (VD: "15-1252.00")
    - **question_count**: Số lượng câu hỏi (5, 7, 8, 10, 12)
    - Trả về session_id, lời chào và câu hỏi đầu tiên
    """
    try:
        print(f"🔧 Starting interview: job_id={request.job_id}, question_count={request.question_count}, jd_id={request.jd_id}, level_slug={request.level_slug}")
        
        # IDEMPOTENCY CHECK: Prevent duplicate sessions within 30 seconds
        # Filter theo đúng job_id + jd_id + level_slug để tránh trả về session sai
        from datetime import datetime, timedelta
        recent_cutoff = datetime.utcnow() - timedelta(seconds=30)
        
        # Build market_context filter để match đúng session
        existing_session = (
            ai_service.db.query(InterviewSession)
            .filter(
                InterviewSession.user_id == current_user.id,
                InterviewSession.job_id == request.job_id,
                InterviewSession.status == "active",
                InterviewSession.started_at >= recent_cutoff
            )
            .order_by(InterviewSession.started_at.desc())
            .first()
        )
        
        # Validate: session phải match đúng jd_id và level_slug
        if existing_session:
            mc = existing_session.market_context or {}
            session_jd_count = mc.get("jd_questions_count", 0)
            session_level = mc.get("effective_level", "junior")
            
            # Nếu request có jd_id nhưng session không có JD (hoặc ngược lại) -> tạo mới
            request_has_jd = request.jd_id is not None
            session_has_jd = mc.get("has_jd", False)
            
            # Nếu request có level khác session -> tạo mới
            request_level = (request.level_slug or "junior").lower()
            
            if request_has_jd != session_has_jd or request_level != session_level:
                print(f"🔄 Parameters changed (jd:{request_has_jd}!={session_has_jd} or level:{request_level}!={session_level}), creating new session")
                existing_session = None
        
        if existing_session:
            print(f"🔄 Returning existing session: session_id={existing_session.id} (started {existing_session.started_at})")
            
            # Get first question from existing session
            first_question_msg = (
                ai_service.db.query(InterviewMessage)
                .filter(
                    InterviewMessage.session_id == existing_session.id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type != "greeting"
                )
                .order_by(InterviewMessage.timestamp.asc())
                .first()
            )
            
            greeting_msg = (
                ai_service.db.query(InterviewMessage)
                .filter(
                    InterviewMessage.session_id == existing_session.id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "greeting"
                )
                .first()
            )
            
            return StartInterviewResponse(
                session_id=existing_session.id,
                job_title=existing_session.job_title,
                greeting=greeting_msg.content if greeting_msg else "Xin chào! Chào mừng bạn đến với buổi phỏng vấn.",
                first_question=first_question_msg.content if first_question_msg else "Hãy giới thiệu về bản thân bạn.",
                skills_context=existing_session.skills_context or [],
                question_count=existing_session.question_count or request.question_count,
                question_distribution=existing_session.question_distribution or {},
            )
        
        # CRITICAL FIX: Chỉ sử dụng AI Pipeline Service, không có fallback để tránh double initialization
        result = await ai_service.start_interview(
            current_user.id, request.job_id, request.question_count,
            request.jd_id, request.level_slug,
            skill_gap_analysis_id=request.skill_gap_analysis_id,
        )
        print(f"🔧 Interview started successfully: session_id={result['session_id']}, question_count={result['question_count']}")
        
        return StartInterviewResponse(
            session_id=result["session_id"],
            job_title=result["job_title"],
            greeting=result["greeting"],
            first_question=result["first_question"],
            skills_context=result.get("skills_context", []),
            question_count=result["question_count"],
            question_distribution=result.get("question_distribution", {}),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi bắt đầu phỏng vấn: {str(e)}")


@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user_from_token),
    ai_service: AIPipelineService = Depends(get_ai_pipeline_service),
):
    """
    Gửi câu trả lời và nhận câu hỏi tiếp theo hoặc kết quả cuối với Pipeline mới

    - **session_id**: ID của phiên phỏng vấn
    - **answer**: Câu trả lời của ứng viên (tối thiểu 10 ký tự)
    - **has_audio**: Có file audio kèm theo không
    - **audio_duration**: Thời lượng audio (giây)
    """
    try:
        # Kiểm tra quyền truy cập session
        session = (
            ai_service.db.query(InterviewSession)
            .filter(InterviewSession.id == request.session_id, InterviewSession.user_id == current_user.id)
            .first()
        )

        if not session:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập phiên phỏng vấn này")

        # CRITICAL FIX: Chỉ sử dụng AI Pipeline Service, không có fallback
        result = await ai_service.submit_answer(
            request.session_id, request.answer, request.has_audio, request.audio_duration, request.is_skipped
        )

        # Handle different response types
        if result["status"] == "guidance_needed":
            return SubmitAnswerResponse(
                status="guidance_needed",
                message=result["message"],
                guidance=result["guidance"],
                original_question=result["original_question"],
                question_type=result["question_type"],
                question_number=result["question_number"]
            )
        elif result["status"] == "skipped_guidance":
            return SubmitAnswerResponse(
                status="skipped_guidance", 
                message=result["message"],
                guidance=result["guidance"],
                original_question=result["original_question"],
                question_type=result["question_type"],
                question_number=result["question_number"],
                can_retry=result["can_retry"],
                skip_count=result["skip_count"]
            )
        elif result["status"] == "continue":
            # Skills info đã được tính đúng trong ai_pipeline_service (trước khi commit)
            # Dùng trực tiếp từ result thay vì tính lại để tránh off-by-one với DB count
            skills_tested = result.get("skills_tested", [])
            skills_details = result.get("skills_details", [])
            
            # Xác định skills_type từ skills_details
            if skills_details:
                has_hard = any(s.get("is_hard_skill") for s in skills_details)
                has_soft = any(not s.get("is_hard_skill") for s in skills_details)
                if has_hard and has_soft:
                    skills_type = "mixed"
                elif has_hard:
                    skills_type = "hard"
                else:
                    skills_type = "soft"
            else:
                skills_type = None
            
            # For closing questions, include empty skills fields for consistent response structure
            if result.get("question_type") == "closing":
                return SubmitAnswerResponse(
                    status="continue",
                    evaluation=result.get("evaluation"),
                    next_question=result["next_question"],
                    question_number=result["question_number"],
                    question_type=result["question_type"],
                    hr_acknowledgment=result.get("hr_acknowledgment"),
                    skills_tested=[],
                    skills_type=None,
                    skills_details=[]
                )
            else:
                return SubmitAnswerResponse(
                    status="continue",
                    evaluation=result.get("evaluation"),
                    next_question=result["next_question"],
                    question_number=result["question_number"],
                    question_type=result["question_type"],
                    hr_acknowledgment=result.get("hr_acknowledgment"),
                    skills_tested=skills_tested,
                    skills_type=skills_type,
                    skills_details=skills_details
                )
        else:
            return SubmitAnswerResponse(status="completed", evaluation=result.get("evaluation"), final_summary=result["summary"])

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi xử lý câu trả lời: {str(e)}")


@router.post("/force-skip")
async def force_skip_question(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Force skip current question and move to next (when user confirms skip)
    
    - **session_id**: ID của phiên phỏng vấn
    """
    try:
        # Kiểm tra quyền truy cập session
        session = (
            service.db.query(InterviewSession)
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
            .first()
        )

        if not session:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập phiên phỏng vấn này")

        result = service.force_skip_question(session_id)

        if result["status"] == "continue":
            skills_tested = result.get("skills_tested", [])
            skills_details = result.get("skills_details", [])
            if skills_details:
                has_hard = any(s.get("is_hard_skill") for s in skills_details)
                has_soft = any(not s.get("is_hard_skill") for s in skills_details)
                skills_type = "mixed" if (has_hard and has_soft) else ("hard" if has_hard else "soft")
            else:
                skills_type = None
            return SubmitAnswerResponse(
                status="continue",
                evaluation=result.get("evaluation"),
                next_question=result["question"],
                question_number=result["question_number"],
                question_type=result["question_type"],
                skills_tested=skills_tested,
                skills_type=skills_type,
                skills_details=skills_details,
            )
        else:
            return SubmitAnswerResponse(status="completed", evaluation=result.get("evaluation"), final_summary=result["summary"])

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi bỏ qua câu hỏi: {str(e)}")


@router.get("/session/{session_id}", response_model=InterviewHistoryResponse)
async def get_interview_history(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Lấy lịch sử chi tiết của một phiên phỏng vấn

    - **session_id**: ID của phiên phỏng vấn
    - Trả về thông tin session và tất cả messages
    """
    try:
        # Kiểm tra quyền truy cập
        session = (
            service.db.query(InterviewSession)
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên phỏng vấn hoặc bạn không có quyền truy cập"
            )

        history = service.get_session_history(session_id)
        return InterviewHistoryResponse(**history)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi lấy lịch sử phỏng vấn: {str(e)}")


@router.post("/abandon/{session_id}")
async def abandon_interview(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Hủy buổi phỏng vấn đang diễn ra
    """
    try:
        success = service.abandon_interview(session_id, current_user.id)
        if success:
            return {"message": "Buổi phỏng vấn đã được hủy thành công"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy buổi phỏng vấn hoặc bạn không có quyền hủy"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi hủy phỏng vấn: {str(e)}"
        )


@router.get("/my-interviews", response_model=UserInterviewsResponse)
async def get_my_interviews(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Lấy danh sách phỏng vấn của user hiện tại với pagination

    - **limit**: Số lượng phỏng vấn tối đa trả về (mặc định 20, tối đa 20)
    - **offset**: Vị trí bắt đầu (mặc định 0)
    """
    try:
        # Limit maximum to 20 items per page
        limit = min(limit, 20)
        
        result = service.get_user_interviews(current_user.id, limit, offset)
        return UserInterviewsResponse(
            interviews=result["interviews"], 
            total=result["total"],
            limit=result["limit"],
            offset=result["offset"],
            has_more=result["has_more"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi lấy danh sách phỏng vấn: {str(e)}"
        )


@router.post("/feedback")
async def submit_feedback(
    request: InterviewFeedbackRequest,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Gửi feedback về chất lượng phỏng vấn

    - **session_id**: ID của phiên phỏng vấn
    - **question_quality**: Chất lượng câu hỏi (1-5)
    - **ai_accuracy**: Độ chính xác AI (1-5)
    - **overall_experience**: Trải nghiệm tổng thể (1-5)
    - **comments**: Nhận xét chi tiết (tùy chọn)
    - **suggestions**: Đề xuất cải thiện (tùy chọn)
    """
    try:
        from .models import InterviewFeedback

        # Kiểm tra session tồn tại và thuộc về user
        session = (
            service.db.query(InterviewSession)
            .filter(InterviewSession.id == request.session_id, InterviewSession.user_id == current_user.id)
            .first()
        )

        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên phỏng vấn")

        # Tạo feedback mới
        feedback = InterviewFeedback(
            session_id=request.session_id,
            user_id=current_user.id,
            question_quality=request.question_quality,
            ai_accuracy=request.ai_accuracy,
            overall_experience=request.overall_experience,
            comments=request.comments,
            suggestions=request.suggestions,
        )

        service.db.add(feedback)
        service.db.commit()

        return {"message": "Cảm ơn bạn đã gửi feedback!"}

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi gửi feedback: {str(e)}")


@router.get("/jobs/search")
async def search_jobs(
    query: str = "", limit: int = 20, random: bool = False, service: InterviewService = Depends(get_interview_service)
):
    """
    Tìm kiếm nghề nghiệp với mô tả - Postgres first, Neo4j fallback

    - **query**: Từ khóa tìm kiếm (để trống để lấy tất cả)
    - **limit**: Số lượng kết quả tối đa
    - **random**: True để random từ toàn bộ 959 nghề nghiệp
    """
    try:
        from sqlalchemy import text

        if random or not query.strip():
            # TRUE RANDOM selection from ALL 959 careers in database
            sql = """
                SELECT onet_code as id, title_vi as title, description_vi
                FROM core.careers
                WHERE title_vi IS NOT NULL AND title_vi != ''
                ORDER BY RANDOM()
                LIMIT :limit
            """
            rows = service.db.execute(text(sql), {"limit": limit}).fetchall()

            # Log for debugging
            print(f"🎲 Random job selection: Retrieved {len(rows)} jobs from database")
        else:
            # Search with query
            sql = """
                SELECT onet_code as id, title_vi as title, description_vi
                FROM core.careers
                WHERE (title_vi ILIKE :q OR title_en ILIKE :q OR onet_code ILIKE :q)
                AND title_vi IS NOT NULL AND title_vi != ''
                ORDER BY 
                    CASE 
                        WHEN title_vi ILIKE :exact_q THEN 1
                        WHEN title_vi ILIKE :start_q THEN 2
                        ELSE 3
                    END,
                    title_vi
                LIMIT :limit
            """
            rows = service.db.execute(
                text(sql), {"q": f"%{query}%", "exact_q": query, "start_q": f"{query}%", "limit": limit}
            ).fetchall()

        if rows:
            jobs = []
            for r in rows:
                jobs.append(
                    {
                        "id": r.id,
                        "title": r.title,
                        "description_vi": r.description_vi or f"Tìm hiểu về nghề {r.title} và các cơ hội phát triển sự nghiệp.",
                    }
                )

            # Additional randomization for random requests
            if random:
                import random as py_random

                py_random.shuffle(jobs)
                print(f"🔀 Additional shuffle applied to {len(jobs)} jobs")

            return {"jobs": jobs}

        # Neo4j fallback only if no results from Postgres AND it's a search query
        if query.strip():  # Only fallback for search queries, not random
            neo4j_session = service.neo4j._get_session()
            if neo4j_session:
                try:
                    with neo4j_session as session:
                        search_query = """
                        MATCH (j:Job)
                        WHERE toLower(j.title) CONTAINS toLower($query)
                        RETURN j.id as id, j.title as title, 
                               'Tìm hiểu về nghề ' + j.title + ' và các cơ hội phát triển sự nghiệp.' as description_vi
                        ORDER BY j.title LIMIT $limit
                        """
                        result = session.run(search_query, {"query": query, "limit": limit})
                        neo4j_jobs = [dict(r) for r in result]
                        if neo4j_jobs:
                            print(f"📊 Neo4j fallback: Retrieved {len(neo4j_jobs)} jobs")
                            return {"jobs": neo4j_jobs}
                except Exception as e:
                    print(f"[WARN] Neo4j search failed: {e}")

        return {"jobs": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tìm kiếm nghề nghiệp: {str(e)}")


@router.get("/jobs/{job_id}", response_model=JobInfo)
async def get_job_info(job_id: str, service: InterviewService = Depends(get_interview_service)):
    try:
        title = service._get_job_title_from_postgres(job_id)
        hard_result = service._get_hard_skills_fast(job_id)

        if not title:
            try:
                job_info = service.neo4j.get_job_info(job_id)
                title = job_info["title"] if job_info else job_id
            except Exception:
                title = job_id

        # IMPLEMENT 4-STEP FLOW FOR SOFT SKILLS (same as start_interview)
        soft_skills_raw = []
        soft_skills_source = None  # Track nguồn data để tính total đúng

        # Step 1: PostgreSQL work activities
        soft_skills_raw = service._get_skills_from_postgres(job_id, 5)
        if soft_skills_raw:
            soft_skills_source = "postgres_activities"

        if not soft_skills_raw:
            # Step 2: Neo4j (without fallback)
            try:
                soft_skills_raw = service.neo4j.get_job_skills(job_id, 5, use_fallback=False)
                if soft_skills_raw:
                    soft_skills_source = "neo4j"
            except Exception:
                soft_skills_raw = []

            if not soft_skills_raw:
                # Step 3: PostgreSQL career_ksas (abilities + knowledge)
                soft_skills_raw = service._get_ksas_from_postgres(job_id, 5)
                if soft_skills_raw:
                    soft_skills_source = "postgres_ksas"

                if not soft_skills_raw:
                    # Step 4: Fallback
                    try:
                        soft_skills_raw = service.neo4j._get_fallback_skills(job_id, 5)
                        if soft_skills_raw:
                            soft_skills_source = "fallback"
                    except Exception:
                        soft_skills_raw = []

        # Lấy tổng số soft skills dựa trên nguồn data thực tế
        if soft_skills_source in ["postgres_activities", "postgres_ksas"]:
            soft_skills_total = service._get_soft_skills_total_count(job_id)
        else:
            # Nếu dùng fallback hoặc Neo4j, total = số skills hiện tại
            soft_skills_total = len(soft_skills_raw)

        hard_skills_top5 = hard_result[0] if isinstance(hard_result, tuple) else []
        all_hard_tasks = hard_result[1] if isinstance(hard_result, tuple) else []

        soft_skills = [
            SkillContext(
                skill_name=str(s.get("skill_name", "")),
                skill_type=str(s.get("skill_type", "Kỹ năng")),
                importance=float(s.get("importance", 0) or 0),
                level=float(s.get("level", 0) or 0),
                is_hard_skill=False,
            )
            for s in (soft_skills_raw or [])
        ]

        hard_skills = [
            SkillContext(
                skill_name=str(s.get("skill_name", "")),
                skill_type=str(s.get("skill_type", "Kỹ năng chuyên ngành")),
                importance=float(s.get("importance", 0) or 0),
                level=float(s.get("level", 0) or 0),
                is_hard_skill=True,
            )
            for s in (hard_skills_top5 or [])
        ]

        return JobInfo(
            id=job_id,
            title=title or job_id,
            soft_skills=soft_skills,
            hard_skills=hard_skills,
            hard_skills_total=len(all_hard_tasks),
            soft_skills_total=soft_skills_total,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/jobs/{job_id}/hard-skills")
async def get_more_hard_skills(job_id: str, limit: int = 10, service: InterviewService = Depends(get_interview_service)):
    """Lấy thêm hard skills (tasks) - dùng cho nút xem thêm"""
    try:
        from sqlalchemy import text

        sql = """
            SELECT task_en, task_vi, importance, task_type, incumbents_responding, task_id
            FROM core.career_tasks
            WHERE onet_code = :onet_code
            ORDER BY importance DESC, incumbents_responding DESC, task_id ASC
            LIMIT :limit
        """
        rows = service.db.execute(text(sql), {"onet_code": job_id, "limit": limit}).fetchall()
        skills = [
            {
                "skill_name": r.task_vi if r.task_vi and not r.task_vi.startswith("Thực hiện các nhiệm vụ") else r.task_en,
                "skill_type": "Kỹ năng chuyên ngành",
                "importance": float(r.importance or 0),
                "level": float(r.importance or 0),
                "is_hard_skill": True,
            }
            for r in rows
        ]
        return {"skills": skills, "total": len(skills)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/skills/all")
async def get_all_job_skills(job_id: str, service: InterviewService = Depends(get_interview_service)):
    """Lấy tất cả skills (soft + hard) của một nghề nghiệp"""
    try:
        title = service._get_job_title_from_postgres(job_id)
        if not title:
            info = service.neo4j.get_job_info(job_id)
            title = info["title"] if info else job_id

        # All soft skills
        try:
            from sqlalchemy import text

            sql = """
                SELECT m.element_name_vi AS skill_name, m.activity_category_vi AS skill_type,
                       s.importance_score AS importance, s.level_score AS level,
                       s.activity_rank AS rank, s.combined_score AS combined_score
                FROM core.career_work_activity_summary s
                JOIN core.career_work_activities_master m ON m.element_id = s.element_id
                WHERE s.onet_code = :onet_code
                ORDER BY s.activity_rank ASC, s.combined_score DESC
            """
            rows = service.db.execute(text(sql), {"onet_code": job_id}).fetchall()
            soft_skills = [
                {
                    "skill_name": r.skill_name,
                    "skill_type": r.skill_type or "Kỹ năng",
                    "importance": float(r.importance or 0),
                    "level": float(r.level or 0),
                    "rank": r.rank or 999,
                    "combined_score": float(r.combined_score or 0),
                    "is_hard_skill": False,
                }
                for r in rows
            ]
        except Exception:
            soft_skills = service.neo4j.get_all_job_skills(job_id)

        # All hard skills (tasks)
        try:
            from sqlalchemy import text as text2

            sql2 = """
                SELECT task_id, task_en, task_vi, importance, task_type, incumbents_responding
                FROM core.career_tasks
                WHERE onet_code = :onet_code
                ORDER BY importance DESC, incumbents_responding DESC, task_id ASC
            """
            rows2 = service.db.execute(text2(sql2), {"onet_code": job_id}).fetchall()
            hard_skills = [
                {
                    "skill_name": r.task_vi if r.task_vi and not r.task_vi.startswith("Thực hiện các nhiệm vụ") else r.task_en,
                    "skill_type": "Kỹ năng chuyên ngành",
                    "importance": float(r.importance or 0),
                    "level": float(r.importance or 0),
                    "rank": i + 1,
                    "combined_score": float(r.importance or 0),
                    "is_hard_skill": True,
                }
                for i, r in enumerate(rows2)
            ]
        except Exception:
            hard_skills = []

        all_skills = soft_skills + hard_skills
        return {"job_id": job_id, "job_title": title, "skills": all_skills, "total_skills": len(all_skills)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy tất cả skills: {str(e)}")


# Admin routes (cần role admin)
@router.get("/admin/stats", response_model=InterviewStats)
async def get_interview_stats(
    current_user: User = Depends(get_current_user_from_token), service: InterviewService = Depends(get_interview_service)
):
    """
    Lấy thống kê phỏng vấn (chỉ dành cho admin)
    """
    # Kiểm tra quyền admin (giả sử có field role trong User model)
    if not hasattr(current_user, "role") or current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ admin mới có quyền truy cập")

    try:
        from sqlalchemy import func

        # Thống kê cơ bản
        total_interviews = service.db.query(InterviewSession).count()
        completed_interviews = service.db.query(InterviewSession).filter(InterviewSession.status == "completed").count()

        # Điểm trung bình
        avg_score_result = (
            service.db.query(func.avg(InterviewSession.overall_score)).filter(InterviewSession.overall_score.isnot(None)).scalar()
        )
        average_score = float(avg_score_result) if avg_score_result else 0.0

        # Tỷ lệ pass
        pass_count = service.db.query(InterviewSession).filter(InterviewSession.recommendation == "PASS").count()
        pass_rate = (pass_count / completed_interviews * 100) if completed_interviews > 0 else 0

        # Top nghề nghiệp phổ biến
        popular_jobs_result = (
            service.db.query(InterviewSession.job_title, func.count(InterviewSession.id).label("count"))
            .group_by(InterviewSession.job_title)
            .order_by(func.count(InterviewSession.id).desc())
            .limit(5)
            .all()
        )

        popular_jobs = [{"job_title": job[0], "interview_count": job[1]} for job in popular_jobs_result]

        return InterviewStats(
            total_interviews=total_interviews,
            completed_interviews=completed_interviews,
            average_score=average_score,
            pass_rate=pass_rate,
            popular_jobs=popular_jobs,
        )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi lấy thống kê: {str(e)}")


# ── Admin: Danh sách tất cả phiên phỏng vấn ──────────────────────────────────
@router.get("/admin/sessions")
async def admin_get_all_sessions(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    mode_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """Admin: Lấy danh sách tất cả phiên phỏng vấn (có phân trang, lọc, tìm kiếm)"""
    if not hasattr(current_user, "role") or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền truy cập")

    try:
        from sqlalchemy import func, or_
        from ..auth.models import User as UserModel

        offset = (page - 1) * page_size

        # Base query với JOIN user
        query = (
            service.db.query(
                InterviewSession,
                UserModel.email.label("user_email"),
                UserModel.first_name.label("user_first_name"),
                UserModel.last_name.label("user_last_name"),
            )
            .join(UserModel, InterviewSession.user_id == UserModel.id)
        )

        # Filters
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    InterviewSession.job_title.ilike(like),
                    UserModel.email.ilike(like),
                    UserModel.first_name.ilike(like),
                    UserModel.last_name.ilike(like),
                )
            )
        if status_filter and status_filter != "all":
            query = query.filter(InterviewSession.status == status_filter)
        if mode_filter and mode_filter != "all":
            query = query.filter(InterviewSession.interview_mode == mode_filter)

        total = query.count()
        rows = query.order_by(InterviewSession.started_at.desc()).offset(offset).limit(page_size).all()

        items = []
        for session, email, first_name, last_name in rows:
            full_name = f"{first_name or ''} {last_name or ''}".strip() or email
            items.append({
                "id": session.id,
                "user_id": session.user_id,
                "user_email": email,
                "user_name": full_name,
                "job_id": session.job_id,
                "job_title": session.job_title,
                "status": session.status,
                "interview_mode": session.interview_mode,
                "voice_type": session.voice_type,
                "overall_score": session.overall_score,
                "technical_score": session.technical_score,
                "communication_score": session.communication_score,
                "logic_score": session.logic_score,
                "experience_score": session.experience_score,
                "attitude_score": session.attitude_score,
                "recommendation": session.recommendation,
                "question_count": session.question_count,
                "tab_switch_count": session.tab_switch_count,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
                "summary": session.summary,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ── Admin: Chi tiết 1 phiên phỏng vấn ────────────────────────────────────────
@router.get("/admin/sessions/{session_id}")
async def admin_get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """Admin: Lấy chi tiết 1 phiên phỏng vấn bất kỳ"""
    if not hasattr(current_user, "role") or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền truy cập")

    try:
        from ..auth.models import User as UserModel

        session = service.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên phỏng vấn")

        user = service.db.query(UserModel).filter(UserModel.id == session.user_id).first()
        messages = (
            service.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session_id)
            .order_by(InterviewMessage.order_index.asc(), InterviewMessage.id.asc())
            .all()
        )

        msgs = []
        for m in messages:
            msgs.append({
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                "question_type": m.question_type,
                "question_number": m.question_number,
                "score": m.score,
                "feedback": m.feedback,
                "strengths": m.strengths,
                "weaknesses": m.weaknesses,
                "suggestion": m.suggestion,
                "has_audio": m.has_audio,
                "audio_url": m.audio_url,
                "order_index": m.order_index,
            })

        return {
            "session": {
                "id": session.id,
                "user_id": session.user_id,
                "user_email": user.email if user else None,
                "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else None,
                "job_id": session.job_id,
                "job_title": session.job_title,
                "status": session.status,
                "interview_mode": session.interview_mode,
                "voice_type": session.voice_type,
                "overall_score": session.overall_score,
                "technical_score": session.technical_score,
                "communication_score": session.communication_score,
                "logic_score": session.logic_score,
                "experience_score": session.experience_score,
                "attitude_score": session.attitude_score,
                "recommendation": session.recommendation,
                "summary": session.summary,
                "key_strengths": session.key_strengths,
                "key_weaknesses": session.key_weaknesses,
                "skill_gaps": session.skill_gaps,
                "learning_recommendations": session.learning_recommendations,
                "question_count": session.question_count,
                "question_distribution": session.question_distribution,
                "tab_switch_count": session.tab_switch_count,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            },
            "messages": msgs,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ── Admin: Thống kê nâng cao ──────────────────────────────────────────────────
@router.get("/admin/analytics")
async def admin_get_analytics(
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """Admin: Thống kê nâng cao về phỏng vấn"""
    if not hasattr(current_user, "role") or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền truy cập")

    try:
        from sqlalchemy import func, case
        from datetime import datetime, timedelta

        db = service.db

        # Tổng quan
        total = db.query(InterviewSession).count()
        completed = db.query(InterviewSession).filter(InterviewSession.status == "completed").count()
        abandoned = db.query(InterviewSession).filter(InterviewSession.status == "abandoned").count()
        active = db.query(InterviewSession).filter(InterviewSession.status == "active").count()

        avg_score = db.query(func.avg(InterviewSession.overall_score)).filter(
            InterviewSession.overall_score.isnot(None)
        ).scalar() or 0.0

        pass_count = db.query(InterviewSession).filter(InterviewSession.recommendation == "PASS").count()
        fail_count = db.query(InterviewSession).filter(InterviewSession.recommendation == "FAIL").count()
        conditional_count = db.query(InterviewSession).filter(
            InterviewSession.recommendation == "CONDITIONAL_PASS"
        ).count()

        # Theo chế độ
        text_count = db.query(InterviewSession).filter(InterviewSession.interview_mode == "text").count()
        voice_count = db.query(InterviewSession).filter(InterviewSession.interview_mode == "voice").count()

        # Top 10 nghề phổ biến
        top_jobs = (
            db.query(InterviewSession.job_title, func.count(InterviewSession.id).label("cnt"))
            .group_by(InterviewSession.job_title)
            .order_by(func.count(InterviewSession.id).desc())
            .limit(10)
            .all()
        )

        # 7 ngày gần nhất
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        daily_counts = (
            db.query(
                func.date(InterviewSession.started_at).label("date"),
                func.count(InterviewSession.id).label("cnt"),
            )
            .filter(InterviewSession.started_at >= seven_days_ago)
            .group_by(func.date(InterviewSession.started_at))
            .order_by(func.date(InterviewSession.started_at))
            .all()
        )

        # Phân bố điểm
        score_dist = {
            "excellent": db.query(InterviewSession).filter(InterviewSession.overall_score >= 8.5).count(),
            "good": db.query(InterviewSession).filter(
                InterviewSession.overall_score >= 7.0, InterviewSession.overall_score < 8.5
            ).count(),
            "average": db.query(InterviewSession).filter(
                InterviewSession.overall_score >= 5.0, InterviewSession.overall_score < 7.0
            ).count(),
            "poor": db.query(InterviewSession).filter(
                InterviewSession.overall_score.isnot(None), InterviewSession.overall_score < 5.0
            ).count(),
        }

        return {
            "overview": {
                "total": total,
                "completed": completed,
                "abandoned": abandoned,
                "active": active,
                "avg_score": round(float(avg_score), 2),
                "pass_rate": round(pass_count / completed * 100, 1) if completed > 0 else 0,
                "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
            },
            "recommendations": {
                "pass": pass_count,
                "fail": fail_count,
                "conditional": conditional_count,
            },
            "modes": {"text": text_count, "voice": voice_count},
            "top_jobs": [{"job_title": j[0], "count": j[1]} for j in top_jobs],
            "daily_trend": [{"date": str(d[0]), "count": d[1]} for d in daily_counts],
            "score_distribution": score_dist,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/health")
async def health_check(
    service: InterviewService = Depends(get_interview_service),
    ai_service: AIPipelineService = Depends(get_ai_pipeline_service)
):
    """Health check endpoint for interview service with AI Pipeline status"""
    try:
        # Test PostgreSQL connection
        from sqlalchemy import text

        service.db.execute(text("SELECT 1")).fetchone()
        postgres_status = "healthy"
    except Exception as e:
        postgres_status = f"error: {str(e)}"

    # Test Neo4j connection
    try:
        neo4j_session = service.neo4j._get_session()
        if neo4j_session:
            with neo4j_session as session:
                session.run("RETURN 1").consume()
            neo4j_status = "healthy"
        else:
            neo4j_status = "disconnected"
    except Exception as e:
        neo4j_status = f"error: {str(e)}"

    # Test Interview Gemini Stream
    try:
        if service.gemini.stream_manager.is_available():
            gemini_status = f"available ({service.gemini.stream_manager.active_model_name or 'not initialized'})"
        else:
            gemini_status = "not available"
    except Exception as e:
        gemini_status = f"error: {str(e)}"

    # Test AI Pipeline status
    pipeline_status = ai_service.get_pipeline_status()

    return {
        "status": "ok", 
        "services": {
            "postgres": postgres_status, 
            "neo4j": neo4j_status, 
            "interview_gemini": gemini_status
        },
        "ai_pipeline": pipeline_status
    }


# Simple in-memory cache for career levels
_career_levels_cache = {}
_cache_ttl = {}

def _get_cached_levels(job_id: str):
    """Get cached career levels if still valid"""
    if job_id in _career_levels_cache:
        if time.time() - _cache_ttl.get(job_id, 0) < 3600:  # 1 hour TTL
            return _career_levels_cache[job_id]
        else:
            # Expired, remove from cache
            _career_levels_cache.pop(job_id, None)
            _cache_ttl.pop(job_id, None)
    return None

def _set_cached_levels(job_id: str, data):
    """Cache career levels data"""
    _career_levels_cache[job_id] = data
    _cache_ttl[job_id] = time.time()


@router.get("/jobs/{job_id}/debug")
async def debug_career_info(job_id: str, service: InterviewService = Depends(get_interview_service)):
    """Debug endpoint để kiểm tra career info"""
    try:
        from sqlalchemy import text
        
        # Check career exists
        career_query = text("""
            SELECT c.id, c.title_vi, c.title_en, c.onet_code, c.slug
            FROM core.careers c 
            WHERE c.onet_code = :onet_code OR c.slug = :job_id 
            LIMIT 1
        """)
        career_result = service.db.execute(career_query, {"onet_code": job_id, "job_id": job_id}).fetchone()
        
        if not career_result:
            return {"error": f"Career not found for {job_id}"}
        
        # Check mappings
        mapping_query = text("""
            SELECT cgm.career_id, cgm.group_id, cg.name as group_name
            FROM core.career_group_mapping cgm
            JOIN core.career_groups cg ON cgm.group_id = cg.id
            WHERE cgm.career_id = :career_id
        """)
        mapping_result = service.db.execute(mapping_query, {"career_id": career_result.id}).fetchall()
        
        # Check levels
        levels_query = text("""
            SELECT cgl.id, cgl.level_name_vi, cgl.level_slug, cgl.level_order, cg.name as group_name
            FROM core.career_group_levels cgl
            JOIN core.career_groups cg ON cgl.group_id = cg.id
            JOIN core.career_group_mapping cgm ON cg.id = cgm.group_id
            WHERE cgm.career_id = :career_id
            ORDER BY cgl.level_order
        """)
        levels_result = service.db.execute(levels_query, {"career_id": career_result.id}).fetchall()
        
        return {
            "career": {
                "id": career_result.id,
                "title_vi": career_result.title_vi,
                "title_en": career_result.title_en,
                "onet_code": career_result.onet_code,
                "slug": career_result.slug
            },
            "mappings": [{"career_id": r.career_id, "group_id": r.group_id, "group_name": r.group_name} for r in mapping_result],
            "levels": [{"id": r.id, "name": r.level_name_vi, "slug": r.level_slug, "order": r.level_order, "group": r.group_name} for r in levels_result],
            "cache_status": {
                "cached": job_id in _career_levels_cache,
                "cache_size": len(_career_levels_cache)
            }
        }
        
    except Exception as e:
        return {"error": str(e)}


@router.get("/jobs/{job_id}/levels")
async def get_career_levels(job_id: str, service: InterviewService = Depends(get_interview_service)):
    """Lấy danh sách levels cho một career dựa trên ONET code với caching"""
    
    # Check cache first
    cached_result = _get_cached_levels(job_id)
    if cached_result:
        print(f"✅ Cache hit for career levels: {job_id}")
        return cached_result  # Return directly, no need for JSONResponse wrapper
    
    start_time = time.time()
    print(f"🔍 Loading career levels for: {job_id}")
    
    try:
        from sqlalchemy import text
        
        # Tối ưu query với explicit joins và limit
        query = text("""
            SELECT DISTINCT
                cgl.id,
                cgl.level_name_vi as name,
                cgl.level_slug as slug,
                cgl.description_vi as description,
                cgl.level_order as seniority_level,
                cg.name as group_name,
                cg.slug as group_slug
            FROM core.careers c
            INNER JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            INNER JOIN core.career_groups cg ON cgm.group_id = cg.id
            INNER JOIN core.career_group_levels cgl ON cg.id = cgl.group_id
            WHERE (c.onet_code = :onet_code OR c.slug = :job_id)
            ORDER BY cgl.level_order ASC
            LIMIT 20
        """)
        
        result = service.db.execute(query, {"onet_code": job_id, "job_id": job_id}).fetchall()
        
        if not result:
            print(f"⚠️ No levels found for {job_id}, using defaults")
            # Fallback: try to find career first, then get default levels
            career_query = text("""
                SELECT c.id, c.title_vi, c.title_en, c.onet_code 
                FROM core.careers c 
                WHERE c.onet_code = :onet_code OR c.slug = :job_id 
                LIMIT 1
            """)
            career_result = service.db.execute(career_query, {"onet_code": job_id, "job_id": job_id}).fetchone()
            
            if not career_result:
                raise HTTPException(status_code=404, detail=f"Không tìm thấy nghề nghiệp với ID: {job_id}")
            
            # Return default levels if no specific mapping exists
            default_levels = [
                {"id": 1, "name": "Fresher", "slug": "fresher", "description": "Mới ra trường, 0-1 năm kinh nghiệm", "seniority_level": 1},
                {"id": 2, "name": "Junior", "slug": "junior", "description": "1-3 năm kinh nghiệm", "seniority_level": 2},
                {"id": 3, "name": "Middle", "slug": "middle", "description": "3-5 năm kinh nghiệm", "seniority_level": 3},
                {"id": 4, "name": "Senior", "slug": "senior", "description": "5+ năm kinh nghiệm", "seniority_level": 4},
                {"id": 5, "name": "Lead", "slug": "lead", "description": "Vị trí lãnh đạo, 7+ năm kinh nghiệm", "seniority_level": 5}
            ]
            
            response_data = {
                "job_id": job_id,
                "group": {"name": "General", "slug": "general"},
                "levels": default_levels,
                "total": len(default_levels),
                "is_default": True
            }
            
            # Cache default levels
            _set_cached_levels(job_id, response_data)
            
            elapsed = time.time() - start_time
            print(f"✅ Career levels (default) for {job_id}: {elapsed:.3f}s")
            
            return response_data
        
        levels = []
        group_info = None
        
        for row in result:
            if not group_info:
                group_info = {
                    "name": row.group_name,
                    "slug": row.group_slug
                }
            
            # Fix encoding issues
            name = row.name
            description = row.description or ""
            
            # Try to fix double-encoded UTF-8
            try:
                if isinstance(name, str):
                    # If it's already properly decoded, keep it
                    if 'Ã' in name or 'á»' in name:
                        # This looks like double-encoded UTF-8, try to fix
                        name = name.encode('latin1').decode('utf-8')
                if isinstance(description, str):
                    if 'Ã' in description or 'á»' in description:
                        description = description.encode('latin1').decode('utf-8')
            except (UnicodeDecodeError, UnicodeEncodeError):
                # If fixing fails, keep original
                pass
            
            levels.append({
                "id": row.id,
                "name": name,
                "slug": row.slug,
                "description": description,
                "seniority_level": row.seniority_level
            })
        
        # Fix group name encoding too
        group_name = group_info["name"] if group_info else ""
        try:
            if isinstance(group_name, str) and ('Ã' in group_name or 'á»' in group_name):
                group_info["name"] = group_name.encode('latin1').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass
        
        response_data = {
            "job_id": job_id,
            "group": group_info,
            "levels": levels,
            "total": len(levels),
            "is_default": False
        }
        
        # Cache the result
        _set_cached_levels(job_id, response_data)
        
        elapsed = time.time() - start_time
        print(f"✅ Career levels for {job_id}: {elapsed:.3f}s, {len(levels)} levels")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Error in get_career_levels ({elapsed:.3f}s): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy career levels: {str(e)}")


# ── Interview Assets (avatar & video by gender) ──────────────────

@router.get("/assets", summary="Lay avatar va video URL theo gender")
def get_interview_assets(
    gender: str = "female",
    db: Session = Depends(get_db),
):
    """
    Tra ve avatar_url va video_url cho AI interviewer theo gioi tinh.
    gender: 'male' | 'female'
    """
    from sqlalchemy import text as _t

    gender = gender.lower()
    if gender not in ("male", "female"):
        gender = "female"

    try:
        rows = db.execute(_t("""
            SELECT asset_type, url
            FROM interview.interview_assets
            WHERE gender = :g
        """), {"g": gender}).fetchall()
    except Exception:
        rows = []

    result = {"gender": gender, "avatar_url": None, "video_url": None}
    for row in rows:
        if row.asset_type == "avatar":
            result["avatar_url"] = row.url
        elif row.asset_type == "video":
            result["video_url"] = row.url

    # Hard-coded fallback if DB not seeded yet
    base = "https://pub-8df5715d271b42d6bf03e5ecd279f612.r2.dev"
    if not result["avatar_url"]:
        result["avatar_url"] = f"{base}/interview/avatars/anh{'Nam' if gender == 'male' else 'Nu'}.png"
    if not result["video_url"]:
        result["video_url"] = f"{base}/interview/videos/{'nam' if gender == 'male' else 'nu'}.mp4"

    return result


@router.patch("/sessions/{session_id}/gender", summary="Cap nhat gender cho phien phong van")
def update_session_gender(
    session_id: int,
    gender: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Cap nhat voice_type (gender) cho session: 'male' | 'female'"""
    from sqlalchemy import text as _t
    if gender not in ("male", "female"):
        raise HTTPException(400, "gender must be 'male' or 'female'")
    db.execute(_t("""
        UPDATE interview.interview_sessions
        SET voice_type = :g
        WHERE id = :sid AND user_id = :uid
    """), {"g": gender, "sid": session_id, "uid": current_user.id})
    db.commit()
    return {"session_id": session_id, "gender": gender}
