"""
FastAPI routes for AI Mock Interview feature
"""

from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.auth_deps import get_current_user_from_token
from ...core.db import get_db
from ..auth.models import User
from .models import InterviewMessage, InterviewSession
from .schemas import (
    InterviewFeedbackRequest,
    InterviewHistoryResponse,
    InterviewStats,
    JobInfo,
    SkillContext,
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    UserInterviewsResponse,
)
from .services import InterviewService

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=4)


def get_interview_service(db: Session = Depends(get_db)) -> InterviewService:
    return InterviewService(db)


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    request: StartInterviewRequest,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Bắt đầu phiên phỏng vấn AI mới

    - **job_id**: O*NET code của nghề nghiệp (VD: "15-1252.00")
    - **question_count**: Số lượng câu hỏi (5, 7, 8, 10, 12)
    - Trả về session_id, lời chào và câu hỏi đầu tiên
    """
    try:
        session = service.start_interview(current_user.id, request.job_id, request.question_count)

        # Lấy messages đầu tiên (greeting + first question)
        messages = (
            service.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session.id)
            .order_by(InterviewMessage.timestamp)
            .all()
        )

        greeting = messages[0].content if len(messages) > 0 else "Xin chào!"
        first_question = messages[1].content if len(messages) > 1 else "Hãy giới thiệu về bản thân."

        return StartInterviewResponse(
            session_id=session.id,
            job_title=session.job_title,
            greeting=greeting,
            first_question=first_question,
            skills_context=session.skills_context or [],
            question_count=session.question_count,
            question_distribution=session.question_distribution or {},
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi bắt đầu phỏng vấn: {str(e)}")


@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Gửi câu trả lời và nhận câu hỏi tiếp theo hoặc kết quả cuối

    - **session_id**: ID của phiên phỏng vấn
    - **answer**: Câu trả lời của ứng viên (tối thiểu 10 ký tự)
    - **has_audio**: Có file audio kèm theo không
    - **audio_duration**: Thời lượng audio (giây)
    """
    try:
        # Kiểm tra quyền truy cập session
        session = (
            service.db.query(InterviewSession)
            .filter(InterviewSession.id == request.session_id, InterviewSession.user_id == current_user.id)
            .first()
        )

        if not session:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập phiên phỏng vấn này")

        result = service.submit_answer(
            request.session_id, request.answer, request.has_audio, request.audio_duration, request.is_skipped
        )

        if result["status"] == "continue":
            return SubmitAnswerResponse(
                status="continue",
                evaluation=result.get("evaluation"),
                next_question=result["question"],
                question_number=result["question_number"],
                question_type=result["question_type"],
            )
        else:
            return SubmitAnswerResponse(status="completed", evaluation=result.get("evaluation"), final_summary=result["summary"])

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi xử lý câu trả lời: {str(e)}")


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


@router.get("/my-interviews", response_model=UserInterviewsResponse)
async def get_my_interviews(
    limit: int = 10,
    current_user: User = Depends(get_current_user_from_token),
    service: InterviewService = Depends(get_interview_service),
):
    """
    Lấy danh sách phỏng vấn của user hiện tại

    - **limit**: Số lượng phỏng vấn tối đa trả về (mặc định 10)
    """
    try:
        interviews = service.get_user_interviews(current_user.id, limit)
        return UserInterviewsResponse(interviews=interviews, total=len(interviews))

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
                               COALESCE(j.description, 'Tìm hiểu về nghề ' + j.title + ' và các cơ hội phát triển sự nghiệp.') as description_vi
                        ORDER BY j.title LIMIT $limit
                        """
                        result = session.run(search_query, {"query": query, "limit": limit})
                        neo4j_jobs = [dict(r) for r in result]
                        if neo4j_jobs:
                            print(f"📊 Neo4j fallback: Retrieved {len(neo4j_jobs)} jobs")
                            return {"jobs": neo4j_jobs}
                except Exception as e:
                    print(f"⚠️ Neo4j search failed: {e}")

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

        # Step 1: PostgreSQL work activities
        soft_skills_raw = service._get_skills_from_postgres(job_id, 5)

        if not soft_skills_raw:
            # Step 2: Neo4j (without fallback)
            try:
                soft_skills_raw = service.neo4j.get_job_skills(job_id, 5, use_fallback=False)
            except Exception:
                soft_skills_raw = []

            if not soft_skills_raw:
                # Step 3: PostgreSQL career_ksas (abilities + knowledge)
                soft_skills_raw = service._get_ksas_from_postgres(job_id, 5)

                if not soft_skills_raw:
                    # Step 4: Fallback
                    try:
                        soft_skills_raw = service.neo4j._get_fallback_skills(job_id, 5)
                    except Exception:
                        soft_skills_raw = []

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
                skill_type="Kỹ năng chuyên ngành",
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
            SELECT task_en, task_vi, importance, task_type
            FROM core.career_tasks
            WHERE onet_code = :onet_code
            ORDER BY importance DESC
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
                SELECT task_id, task_en, task_vi, importance, task_type
                FROM core.career_tasks
                WHERE onet_code = :onet_code
                ORDER BY importance DESC
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


@router.get("/health")
async def health_check(service: InterviewService = Depends(get_interview_service)):
    """Health check endpoint for interview service"""
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

    # Test Gemini API
    try:
        if service.gemini.model:
            gemini_status = "configured"
        else:
            gemini_status = "not configured"
    except Exception as e:
        gemini_status = f"error: {str(e)}"

    return {"status": "ok", "services": {"postgres": postgres_status, "neo4j": neo4j_status, "gemini": gemini_status}}


# Import models để tránh circular import
# from .models import InterviewSession, InterviewMessage
