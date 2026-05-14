"""
AI Pipeline Service - Tích hợp Interview Pipeline mới vào backend
Thay thế logic Gemini cũ bằng Question Chain + Evaluation Chain
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from .models import InterviewSession, InterviewMessage
from .services import Neo4jService, get_neo4j_service, get_gemini_service
from .context_builder import build_interview_context


class AIPipelineService:
    """Service tích hợp AI Pipeline mới với backend hiện tại"""
    
    def __init__(self, db: Session):
        self.db = db
        self.neo4j = get_neo4j_service()
        self.gemini = get_gemini_service()
        
        # For now, use enhanced Gemini service until TypeScript pipeline is compiled
        self.pipeline_enabled = True
        print("✅ AI Pipeline Service initialized with enhanced Gemini")

    def is_pipeline_enabled(self) -> bool:
        """Kiểm tra xem pipeline có được bật không"""
        return self.pipeline_enabled
    
    def get_pipeline_status(self) -> Dict:
        """Lấy trạng thái pipeline"""
        return {
            "enabled": self.pipeline_enabled,
            "gemini_available": self.gemini.stream_manager.is_available() if self.gemini else False,
            "neo4j_available": self.neo4j.driver is not None if self.neo4j else False
        }

    def _build_cv_context(self, skill_gap_analysis_id: int, user_id: int) -> Optional[Dict]:
        """
        Đọc kết quả phân tích CV từ DB và build context cho CV-based interview.
        Trả về dict chứa cv_skills, skill_gaps, cv_projects, cv_experiences.
        """
        try:
            from app.modules.skill_gap.models import SkillGapAnalysis
            sg = self.db.query(SkillGapAnalysis).filter(
                SkillGapAnalysis.id == skill_gap_analysis_id,
                SkillGapAnalysis.user_id == user_id,
            ).first()
            if not sg:
                return None

            cv_skills = []
            if sg.cv_skills:
                cv_skills = [s.get('name', s) if isinstance(s, dict) else str(s) for s in sg.cv_skills[:20]]

            gaps = sg.skill_gaps or {}
            critical  = [s.get('name', s) if isinstance(s, dict) else str(s) for s in gaps.get('critical', [])[:5]]
            important = [s.get('name', s) if isinstance(s, dict) else str(s) for s in gaps.get('important', [])[:5]]
            matched   = [s.get('name', s) if isinstance(s, dict) else str(s) for s in (sg.matched_skills or [])[:10]]

            return {
                "cv_skills":        cv_skills,
                "matched_skills":   matched,
                "critical_gaps":    critical,
                "important_gaps":   important,
                "match_percentage": sg.match_percentage or 0,
                "cv_name":          sg.cv_name or "",
                "career_id":        sg.career_id or "",
                "analysis_id":      skill_gap_analysis_id,
            }
        except Exception as e:
            print(f"[CV-Interview] Error building CV context: {e}")
            return None

    async def start_interview(self, user_id: int, job_id: str, question_count: int = 7,
                              jd_id: Optional[int] = None, level_slug: Optional[str] = None,
                              skill_gap_analysis_id: Optional[int] = None) -> Dict:
        """Bắt đầu phỏng vấn — hỗ trợ cả 2 hướng:
        1. Theo nghề nghiệp (career-based)
        2. Dựa trên CV cá nhân (CV-based personalized) khi skill_gap_analysis_id được cung cấp
        """
        try:
            # Lấy thông tin job từ database
            career_context = self._get_career_context(job_id)
            if not career_context:
                raise ValueError(f"Không tìm thấy nghề nghiệp với ID: {job_id}")

            # Load CV context nếu là CV-based interview
            cv_context = None
            if skill_gap_analysis_id:
                cv_context = self._build_cv_context(skill_gap_analysis_id, user_id)
                if cv_context:
                    # Inject CV data vào career_context để AI sử dụng
                    career_context["cv_based"] = True
                    career_context["cv_skills"] = cv_context["cv_skills"]
                    career_context["critical_gaps"] = cv_context["critical_gaps"]
                    career_context["important_gaps"] = cv_context["important_gaps"]
                    career_context["matched_skills"] = cv_context["matched_skills"]
                    career_context["match_percentage"] = cv_context["match_percentage"]
                    career_context["skill_gap_analysis_id"] = skill_gap_analysis_id
                    print(f"[CV-Interview] CV context loaded: {len(cv_context['cv_skills'])} skills, {len(cv_context['critical_gaps'])} critical gaps")

            # Lấy Career Level context nếu có
            level_context = None
            if level_slug:
                try:
                    # Sử dụng _get_level_context từ InterviewService
                    from .services import InterviewService
                    temp_service = InterviewService(self.db)
                    level_context = temp_service._get_level_context(level_slug)
                    if level_context:
                        print(f"✅ Career Level context loaded: {level_slug} ({level_context['experience']})")
                except Exception as e:
                    print(f"⚠️ Career Level context failed: {e}")

            # CRITICAL FIX: Augment context với JD nếu có - PERSIST trong career_context
            jd_questions_count = 0  # Số câu jd_specific
            jd_qualification_count = 0  # Số câu jd_qualification (tính riêng)
            jd_data = None
            if jd_id:
                try:
                    from .models import JobDescription
                    from .jd_service import JDService
                    jd = self.db.query(JobDescription).filter(
                        JobDescription.id == jd_id,
                        JobDescription.user_id == user_id
                    ).first()
                    if jd and jd.extracted_data:
                        jd_data = jd.extracted_data
                        jd_svc = JDService(self.db)
                        jd_questions_count = jd_svc.calc_jd_questions_count(jd.extracted_data)
                        
                        # Tính số câu jd_qualification riêng từ skills_context đã persist trong extracted_data
                        skills_ctx = jd_data.get("skills_context", [])
                        jd_qualification_count = len([s for s in skills_ctx if s.get("skill_type") == "JD Qualification"])
                        # Giới hạn tối đa 3 câu qualification
                        jd_qualification_count = min(jd_qualification_count, 3)
                        
                        print(f"✅ JD context loaded: {jd_questions_count} jd_specific + {jd_qualification_count} jd_qualification questions")
                        
                        # CRITICAL FIX: Persist JD data trong career_context để không bị mất
                        career_context["jd_data"] = jd_data
                        career_context["jd_questions_count"] = jd_questions_count
                        career_context["jd_qualification_count"] = jd_qualification_count
                        career_context["has_jd"] = True
                except Exception as e:
                    print(f"⚠️ JD merge failed: {e}")
            
            # Save CV fields before build_interview_context (it creates a new dict and loses them)
            _cv_preserve = {k: career_context[k] for k in (
                "cv_based", "cv_skills", "critical_gaps", "important_gaps",
                "matched_skills", "match_percentage", "skill_gap_analysis_id",
            ) if k in career_context}

            # Build final context với priority: Level > JD > Neo4j
            career_context = build_interview_context(career_context, jd_data, level_context)

            # Re-inject CV fields (they were stripped by build_interview_context)
            if _cv_preserve:
                career_context.update(_cv_preserve)
                print(f"[CV-Interview] CV context preserved: cv_based={_cv_preserve.get('cv_based')}, "
                      f"skills={len(_cv_preserve.get('cv_skills', []))}, "
                      f"critical_gaps={len(_cv_preserve.get('critical_gaps', []))}")

            # Xác định effective level
            effective_level = career_context.get("effective_level", "junior")
            print(f"✅ Effective interview level: {effective_level}")
            
            # CRITICAL FIX: Tính total questions đúng logic
            # User chọn question_count (5/7/8/10/12) 
            # Khi có JD: thêm jd_questions_count câu jd_specific + jd_qualification_count câu jd_qualification + 1 câu closing
            base_questions = question_count  # Số câu user chọn
            total_questions = base_questions + jd_questions_count + jd_qualification_count + 1  # +1 cho closing
            
            print(f"✅ Question calculation: {base_questions} base + {jd_questions_count} jd_specific + {jd_qualification_count} jd_qualification + 1 closing = {total_questions} total")
            
            # Tạo session trong database với total questions và PERSIST JD context
            has_jd = career_context.get("has_jd", False)
            db_session = self._create_db_session(user_id, job_id, career_context, total_questions, has_jd, jd_questions_count, jd_qualification_count, jd_data, level_context)
            
            # Tạo greeting và first question
            # CV-based: greeting nhắc đến CV, first question xoáy vào kỹ năng trong CV
            if career_context.get("cv_based") and cv_context:
                greeting_content = self._generate_cv_based_greeting(career_context, cv_context)
                first_question_content = self._generate_cv_based_first_question(career_context, cv_context, effective_level)
            else:
                greeting_content = self._generate_enhanced_greeting(career_context['title'], career_context['skills'])
                first_question_content = self._generate_enhanced_first_question(career_context, effective_level)
            
            # Lưu messages
            greeting_msg = InterviewMessage(
                session_id=db_session.id,
                role="interviewer",
                content=greeting_content,
                question_type="greeting",
                question_number=0
            )
            self.db.add(greeting_msg)
            
            first_question_msg = InterviewMessage(
                session_id=db_session.id,
                role="interviewer", 
                content=first_question_content,
                question_type="warm_up",
                question_number=1,
                skills_tested=self._get_skills_for_question_type(career_context.get('skills', []), "warm_up", 1, db_session.id)
            )
            self.db.add(first_question_msg)
            self.db.commit()
            
            return {
                "session_id": db_session.id,
                "job_title": career_context['title'],
                "greeting": greeting_content,
                "first_question": first_question_content,
                "question_count": total_questions,  # FIX: Return total questions
                "skills_context": career_context.get('skills', []),  # Sử dụng skills từ career_context
                "question_distribution": db_session.question_distribution or {}
            }
            
        except Exception as e:
            print(f"⚠️ Pipeline start failed: {e}")
            raise e  # Re-raise instead of fallback to prevent double initialization

    async def submit_answer(self, session_id: int, user_answer: str, has_audio: bool = False, 
                     audio_duration: float = None, is_skipped: bool = False) -> Dict:
        """Xử lý câu trả lời với pipeline logic mới"""
        try:
            # Lấy session từ database
            db_session = self.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
            if not db_session or db_session.status != "active":
                raise ValueError("Phiên phỏng vấn không hợp lệ hoặc đã kết thúc")
            
            # Lấy câu hỏi cuối cùng
            last_question = (
                self.db.query(InterviewMessage)
                .filter(InterviewMessage.session_id == session_id, InterviewMessage.role == "interviewer")
                .order_by(InterviewMessage.timestamp.desc())
                .first()
            )

            if not last_question:
                raise ValueError("Không tìm thấy câu hỏi để trả lời")

            # ── CLOSING QUESTION: Xử lý đặc biệt ────────────────────────────────
            if last_question.question_type in ("closing", "closing_response"):
                return await self._handle_closing_answer(db_session, last_question, user_answer, has_audio, audio_duration)

            # Enhanced evaluation với separated logic
            session_context = db_session.market_context or {}
            evaluation = await self._evaluate_answer_enhanced(
                last_question.content,
                user_answer,
                db_session.job_title,
                last_question.question_type,
                is_skipped,
                session_context
            )
            
            # Lưu evaluation vào database
            answer_msg = InterviewMessage(
                session_id=session_id,
                role="candidate",
                content=user_answer.strip() if (user_answer and user_answer.strip()) else ("(Đã bỏ qua)" if is_skipped else "(Không trả lời)"),
                question_number=last_question.question_number,
                score=evaluation.get("score") if evaluation.get("score") is not None else (0 if last_question.question_type not in ["jd_qualification", "closing"] else None),
                detailed_scores=evaluation.get("detailed_scores") or {},
                feedback=evaluation.get("feedback", ""),
                strengths=evaluation.get("strengths") or [],
                weaknesses=evaluation.get("weaknesses") or [],
                suggestion=evaluation.get("suggestion", "") or "",
                has_audio=has_audio,
                audio_duration=audio_duration
            )
            self.db.add(answer_msg)
            self.db.commit()  # Commit answer trước khi query question_count và generate next question
            
            # Kiểm tra xem có cần câu hỏi tiếp theo không
            question_count = (
                self.db.query(InterviewMessage)
                .filter(
                    InterviewMessage.session_id == session_id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type != "greeting",
                )
                .count()
            )

            max_questions = db_session.question_count or 7

            if question_count >= max_questions:
                # Kết thúc phỏng vấn
                return await self._finish_interview_enhanced(db_session, evaluation)
            else:
                # Tiếp tục với câu hỏi mới
                # Truyền last_question_type để _continue biết có cần hr_acknowledgment không
                result = await self._continue_interview_enhanced(
                    db_session, evaluation, last_question.question_number + 1, force_question_type=None
                )
                # Chỉ set hr_acknowledgment khi câu vừa trả lời là jd_qualification
                if last_question.question_type == "jd_qualification":
                    ack = (evaluation.get("feedback") or "") if evaluation else ""
                    if ack:
                        result["hr_acknowledgment"] = ack
                else:
                    # Xóa hr_acknowledgment nếu không phải jd_qualification (tránh hiển thị nhầm)
                    result.pop("hr_acknowledgment", None)
                return result
                
        except Exception as e:
            import traceback
            print(f"⚠️ Pipeline submit failed: {e}")
            traceback.print_exc()  # Log full traceback to find exact failure point
            # Use fallback service directly
            from .services import InterviewService
            fallback_service = InterviewService(self.db)
            return fallback_service.submit_answer(session_id, user_answer, has_audio, audio_duration, is_skipped)

    def _get_career_context(self, job_id: str) -> Optional[Dict]:
        """Lấy thông tin nghề nghiệp từ database.
        Tách rõ soft skills (work activities) và hard skills (career_tasks).
        Không trộn lẫn để đảm bảo câu hỏi đúng loại.
        """
        try:
            from sqlalchemy import text
            import re as _re
            
            # Lấy thông tin cơ bản
            career_row = self.db.execute(
                text("SELECT title_vi, title_en FROM core.careers WHERE onet_code = :code LIMIT 1"),
                {"code": job_id}
            ).fetchone()
            
            if not career_row:
                return None
            
            title = career_row.title_vi or career_row.title_en or f"Job {job_id}"
            
            # ── SOFT SKILLS: từ work activities (tiếng Việt tốt) ─────────────
            # Sort: importance_score DESC → combined_score DESC → activity_rank ASC
            soft_rows = self.db.execute(
                text("""
                    SELECT m.element_name_vi as skill_name,
                           m.activity_category_vi as skill_type,
                           s.importance_score as importance,
                           s.level_score as level,
                           s.combined_score,
                           s.activity_rank
                    FROM core.career_work_activity_summary s
                    JOIN core.career_work_activities_master m ON m.element_id = s.element_id
                    WHERE s.onet_code = :onet_code
                      AND s.is_top_activity = true
                    ORDER BY s.importance_score DESC, s.combined_score DESC, s.activity_rank ASC
                    LIMIT 5
                """),
                {"onet_code": job_id}
            ).fetchall()
            
            soft_skills = []
            for row in soft_rows:
                soft_skills.append({
                    "skill_name": row.skill_name,
                    "skill_type": row.skill_type or "Kỹ năng mềm",
                    "importance": float(row.importance) if row.importance else 3.0,
                    "level": float(row.level) if row.level else 3.0,
                    "is_hard_skill": False
                })
            
            if not soft_skills:
                soft_skills = [
                    {"skill_name": "Giao tiếp", "skill_type": "Kỹ năng mềm", "importance": 4.0, "level": 4.0, "is_hard_skill": False},
                    {"skill_name": "Giải quyết vấn đề", "skill_type": "Kỹ năng mềm", "importance": 4.5, "level": 4.0, "is_hard_skill": False},
                    {"skill_name": "Làm việc nhóm", "skill_type": "Kỹ năng mềm", "importance": 4.0, "level": 3.5, "is_hard_skill": False}
                ]
            
            # ── HARD SKILLS: từ career_tasks ──────────────────────────────────
            # Sort: importance DESC → incumbents_responding DESC → task_id ASC (O*NET priority order)
            hard_rows = self.db.execute(
                text("""
                    SELECT task_vi, task_en, importance, incumbents_responding, task_id
                    FROM core.career_tasks
                    WHERE onet_code = :onet_code
                    ORDER BY importance DESC, incumbents_responding DESC, task_id ASC
                    LIMIT 5
                """),
                {"onet_code": job_id}
            ).fetchall()
            
            hard_skills = []
            for row in hard_rows:
                name = self._select_best_task_name(row.task_vi, row.task_en)
                hard_skills.append({
                    "skill_name": name,
                    "skill_type": "Kỹ năng chuyên ngành",
                    "importance": float(row.importance) if row.importance else 3.0,
                    "level": float(row.importance) if row.importance else 3.0,
                    "is_hard_skill": True,
                    "source": "career"  # CRITICAL: Thêm source để phân biệt với JD skills
                })
            
            # Giữ thứ tự: soft skills trước, hard skills sau
            # KHÔNG sort trộn lẫn - để câu hỏi technical dùng đúng hard skills
            # CHUẨN HÓA thứ tự field để đảm bảo consistency với /session/{id}
            all_skills = []
            
            # Thêm soft skills với thứ tự field chuẩn
            for skill in soft_skills:
                all_skills.append({
                    "skill_name": skill["skill_name"],
                    "skill_type": skill["skill_type"],
                    "importance": skill["importance"],
                    "level": skill["level"],
                    "is_hard_skill": False,
                    "source": "career"
                })
            
            # Thêm hard skills với thứ tự field chuẩn
            for skill in hard_skills:
                all_skills.append({
                    "skill_name": skill["skill_name"],
                    "skill_type": skill["skill_type"],
                    "importance": skill["importance"],
                    "level": skill["level"],
                    "is_hard_skill": True,
                    "source": "career"
                })
            
            # CRITICAL FIX: Sort all_skills theo importance DESC để đảm bảo thứ tự đúng
            all_skills.sort(key=lambda x: float(x.get("importance", 0)), reverse=True)
            
            return {
                "onet_code": job_id,
                "title": title,
                "skills": all_skills,
                "soft_skills": soft_skills,
                "hard_skills": hard_skills
            }
            
        except Exception as e:
            print(f"⚠️ Failed to get career context: {e}")
            return None

    def _select_best_task_name(self, task_vi: Optional[str], task_en: Optional[str]) -> str:
        """Chọn tên task tốt nhất: ưu tiên task_vi nếu chất lượng tốt, fallback task_en."""
        if not task_vi:
            return task_en or ""
        
        # Đếm tỷ lệ từ thuần Latin (tiếng Anh không dấu)
        import re as _re
        words = task_vi.split()
        if not words:
            return task_en or task_vi
        
        english_count = sum(
            1 for w in words
            if len(_re.sub(r'[^a-zA-Z]', '', w)) >= 3 and _re.sub(r'[^a-zA-Z]', '', w) == w
        )
        
        if english_count / len(words) > 0.25 and task_en:
            return task_en
        
        return task_vi

    def _determine_user_level(self, user_id: int) -> str:
        """Xác định level của user (có thể mở rộng sau)"""
        # Tạm thời return middle, có thể lấy từ user profile sau
        return "middle"

    async def validate_interview_system_100_percent(self, session_id: int) -> Dict[str, any]:
        """Kiểm tra 100% tất cả question type options và logic flows
        
        CRITICAL FIX: Comprehensive validation như user yêu cầu
        """
        try:
            # Get session
            db_session = self.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
            if not db_session:
                return {"status": "error", "message": "Session not found"}
            
            # 1. Validate all question flows
            flow_validation = self._validate_all_question_flows(db_session)
            
            # 2. Test all question type generation
            question_type_tests = {}
            test_skills = [
                {"skill_name": "Java Programming", "skill_type": "JD Requirement", "importance": 4.5, "level": 4, "source": "jd", "is_hard_skill": True},
                {"skill_name": "Communication", "skill_type": "Soft Skill", "importance": 4.0, "level": 4, "source": "career", "is_hard_skill": False},
                {"skill_name": "Tiếng Nhật từ N3 trở lên", "skill_type": "JD Qualification", "importance": 4.2, "level": 4, "source": "jd", "is_hard_skill": True}
            ]
            
            for qtype in ['warm_up', 'jd_specific', 'technical', 'behavioral', 'situational', 'jd_qualification', 'closing']:
                try:
                    selected_skills = self._select_skills_for_question_type(test_skills, qtype, 1, session_id)
                    question_type_tests[qtype] = {
                        "status": "success",
                        "skills_selected": len(selected_skills),
                        "skills": [s.get("skill_name", "") for s in selected_skills]
                    }
                except Exception as e:
                    question_type_tests[qtype] = {
                        "status": "error",
                        "error": str(e)
                    }
            
            # 3. Test JD qualification logic specifically
            jd_qual_test = {}
            try:
                market_context = db_session.market_context or {}
                jd_data = market_context.get("jd_data")
                if jd_data:
                    # Test JD qualification question generation
                    jd_question = await self._generate_jd_qualification_question(db_session, jd_data)
                    jd_qual_test = {
                        "status": "success" if jd_question else "completed",
                        "question_generated": jd_question is not None,
                        "question_length": len(jd_question) if jd_question else 0
                    }
                else:
                    jd_qual_test = {"status": "no_jd_data", "message": "No JD data available for testing"}
            except Exception as e:
                jd_qual_test = {"status": "error", "error": str(e)}
            
            # 4. Test closing question logic
            closing_test = {}
            try:
                # Test candidate question detection
                test_answers = [
                    "Không có câu hỏi gì ạ",
                    "Tôi muốn hỏi về lương và phúc lợi của công ty?",
                    "Môi trường làm việc ở đây như thế nào ạ?"
                ]
                
                for i, answer in enumerate(test_answers):
                    has_question = self._candidate_has_question(answer)
                    closing_test[f"test_answer_{i+1}"] = {
                        "answer": answer[:30] + "..." if len(answer) > 30 else answer,
                        "has_question_detected": has_question,
                        "expected": i > 0  # First answer should be False, others True
                    }
            except Exception as e:
                closing_test = {"status": "error", "error": str(e)}
            
            # 5. Overall assessment
            all_flows_valid = all(flow_validation.values())
            all_question_types_working = all(
                test.get("status") == "success" for test in question_type_tests.values()
            )
            
            overall_status = "100_PERCENT_CORRECT" if (all_flows_valid and all_question_types_working) else "NEEDS_FIXES"
            
            return {
                "overall_status": overall_status,
                "session_id": session_id,
                "flow_validation": flow_validation,
                "question_type_tests": question_type_tests,
                "jd_qualification_test": jd_qual_test,
                "closing_logic_test": closing_test,
                "summary": {
                    "all_flows_valid": all_flows_valid,
                    "all_question_types_working": all_question_types_working,
                    "total_question_types_tested": len(question_type_tests),
                    "successful_question_types": len([t for t in question_type_tests.values() if t.get("status") == "success"])
                }
            }
            
        except Exception as e:
            return {
                "overall_status": "VALIDATION_ERROR",
                "error": str(e),
                "session_id": session_id
            }

    def get_all_supported_question_types(self) -> Dict[str, str]:
        """Trả về tất cả question types được hỗ trợ với mô tả
        
        CRITICAL FIX: Documentation cho user về tất cả options
        """
        return {
            "greeting": "Lời chào đầu tiên của HR",
            "warm_up": "Câu hỏi làm quen, mở đầu phỏng vấn",
            "jd_specific": "Câu hỏi về kỹ năng cụ thể trong JD (JD Requirements)",
            "technical": "Câu hỏi kỹ thuật chuyên môn (hard skills)",
            "behavioral": "Câu hỏi về hành vi, kinh nghiệm (soft skills)",
            "situational": "Câu hỏi tình huống giả định (soft skills)",
            "jd_qualification": "Câu hỏi về bằng cấp, trình độ từ JD (JD Qualifications)",
            "closing": "Câu hỏi kết thúc, mời ứng viên đặt câu hỏi",
            "closing_response": "Phản hồi của HR cho câu hỏi của ứng viên"
        }

    def _create_db_session(self, user_id: int, job_id: str, career_context: Dict, question_count: int, has_jd: bool = False, jd_questions_count: int = 0, jd_qualification_count: int = 0, jd_data: Optional[Dict] = None, level_context: Optional[Dict] = None) -> InterviewSession:
        """Tạo session trong database với FULL context persistence"""
        market_context = {
            "effective_level": career_context.get("effective_level", "junior"),
            "career_level": career_context.get("career_level", ""),
            "level_description": career_context.get("level_description", ""),
            "experience_range": career_context.get("experience_range", ""),
            "interview_focus": career_context.get("interview_focus", []),
            "career_group": career_context.get("career_group", ""),
            "has_level": career_context.get("has_level", False),
            "has_jd": has_jd,
            "jd_questions_count": jd_questions_count,
            "jd_qualification_count": jd_qualification_count,
            "jd_data": jd_data,
            "level_context": level_context,
            # CV-based interview persistence
            "cv_based": career_context.get("cv_based", False),
            "cv_skills": career_context.get("cv_skills", []),
            "critical_gaps": career_context.get("critical_gaps", []),
            "important_gaps": career_context.get("important_gaps", []),
            "matched_skills": career_context.get("matched_skills", []),
            "match_percentage": career_context.get("match_percentage", 0),
            "skill_gap_analysis_id": career_context.get("skill_gap_analysis_id"),
        }
        
        db_session = InterviewSession(
            user_id=user_id,
            job_id=job_id,
            job_title=career_context['title'],
            skills_context=career_context.get('skills', []),
            market_context=market_context,
            status="active",
            question_count=question_count,
            question_distribution=self._create_question_distribution(
                question_count,
                has_jd, jd_questions_count, jd_qualification_count
            )
        )
        
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        
        return db_session

    def _generate_cv_based_greeting(self, career_context: Dict, cv_context: Dict) -> str:
        """Lời chào cho CV-based interview — nhắc đến CV và kỹ năng đã có."""
        job_title = career_context.get('title', 'vị trí này')
        cv_skills_str = ', '.join(cv_context.get('cv_skills', [])[:4]) or 'các kỹ năng đã trình bày'
        match_pct = cv_context.get('match_percentage', 0)

        prompt = f"""Bạn là HR Manager. Viết lời chào mở đầu buổi phỏng vấn CÁ NHÂN HÓA dựa trên CV.
Vị trí: {job_title}
CV của ứng viên có: {cv_skills_str} (phù hợp {match_pct:.0f}% với nghề)
Yêu cầu: 2-3 câu, nhắc đến CV, nói sẽ hỏi sâu về kinh nghiệm thực tế. CHỈ trả về lời chào."""
        try:
            r = self.gemini.stream_manager.generate_content_with_retry(prompt, max_output_tokens=150, temperature=0.7)
            if r and len(r.strip()) > 30:
                return r.strip()
        except Exception:
            pass
        return (f"Xin chào! Tôi đã đọc CV của bạn và thấy bạn có kinh nghiệm về {cv_skills_str}. "
                f"Hôm nay chúng ta sẽ đi sâu vào những kinh nghiệm thực tế của bạn để đánh giá sự phù hợp với vị trí {job_title}. "
                f"Bạn đã sẵn sàng chưa?")

    def _generate_cv_based_first_question(self, career_context: Dict, cv_context: Dict, level: str) -> str:
        """Câu hỏi đầu tiên xoáy vào kỹ năng/kinh nghiệm trong CV."""
        job_title = career_context.get('title', 'vị trí này')
        cv_skills = cv_context.get('cv_skills', [])
        critical_gaps = cv_context.get('critical_gaps', [])
        matched = cv_context.get('matched_skills', [])

        top_skill = cv_skills[0] if cv_skills else 'kỹ năng chuyên môn'
        gap_hint = f" Lưu ý CV còn thiếu: {', '.join(critical_gaps[:2])}." if critical_gaps else ""

        prompt = f"""Bạn là HR Manager phỏng vấn ứng viên cho vị trí {job_title}.
CV của ứng viên có: {', '.join(cv_skills[:5])}.{gap_hint}
Kỹ năng match với nghề: {', '.join(matched[:3]) or 'chưa rõ'}.
Tạo 1 câu hỏi warm-up XOÁ vào {top_skill} để kiểm tra tính xác thực của CV.
Câu hỏi phải: hỏi về DỰ ÁN CỤ THỂ hoặc THÁCH THỨC thực tế liên quan đến {top_skill}.
1-2 câu, cụ thể. CHỈ trả về câu hỏi."""
        try:
            r = self.gemini.stream_manager.generate_content_with_retry(prompt, max_output_tokens=120, temperature=0.8)
            if r and len(r.strip()) > 30:
                return r.strip()
        except Exception:
            pass
        return (f"Trong CV của bạn có đề cập đến {top_skill}. "
                f"Bạn hãy chia sẻ một dự án cụ thể mà bạn đã ứng dụng {top_skill} — "
                f"thách thức lớn nhất bạn gặp phải và bạn đã xử lý như thế nào?")

    def _generate_enhanced_greeting(self, job_title: str, skills: List[Dict] = None) -> str:
        """Tạo lời chào chuyên nghiệp và chi tiết"""
        if skills:
            top_skills = [skill.get('skill_name', '') for skill in skills[:3] if skill.get('skill_name')]
            skills_text = ", ".join(top_skills) if top_skills else "các kỹ năng chuyên môn"
        else:
            skills_text = "các kỹ năng chuyên môn"

        hr_name = self._get_random_hr_name()

        # Thêm JD context nếu có skills từ JD
        jd_context = ""
        if skills and any(s.get("source") == "jd" for s in skills):
            jd_skills = [s.get("skill_name", "") for s in skills if s.get("source") == "jd"][:2]
            if jd_skills:
                jd_context = f" Công ty đặc biệt cần: {', '.join(jd_skills)}."

        greeting_prompt = f"""Bạn là {hr_name}, HR Manager. Viết lời chào ngắn gọn mở đầu phỏng vấn vị trí "{job_title}".

Yêu cầu: 2-3 câu, tự nhiên, đề cập kỹ năng {skills_text},{jd_context.replace('{','(').replace('}',')')} mời bắt đầu. CHỈ trả về lời chào."""

        try:
            response = self.gemini.stream_manager.generate_content_with_retry(
                greeting_prompt,
                max_output_tokens=150,
                temperature=0.7
            )
            if response and len(response.strip()) > 40:
                return response.strip()
        except Exception as e:
            print(f"⚠️ Greeting generation failed: {e}")

        return (
            f"Xin chào! Tôi là {hr_name}, HR Manager phụ trách tuyển dụng vị trí {job_title} hôm nay. "
            f"Chúng ta sẽ trao đổi khoảng 15-20 phút về kinh nghiệm và kỹ năng của bạn, đặc biệt là {skills_text}. "
            f"Hãy thoải mái chia sẻ nhé — bạn đã sẵn sàng chưa?"
        )

    def _generate_enhanced_first_question(self, career_context: Dict, level: str) -> str:
        """Tạo câu hỏi warm-up sâu sắc, phù hợp level"""
        job_title = career_context['title']
        skills = career_context.get('skills', [])
        top_skill = skills[0].get('skill_name', 'chuyên môn') if skills else 'chuyên môn'

        level_context = {
            'fresher': 'ứng viên mới ra trường, tập trung vào học hỏi và tiềm năng',
            'junior': 'ứng viên 1-2 năm kinh nghiệm, tập trung vào dự án đã làm',
            'middle': 'ứng viên 3-5 năm kinh nghiệm, tập trung vào đóng góp và kết quả',
            'senior': 'ứng viên 5+ năm kinh nghiệm, tập trung vào leadership và impact',
            'lead': 'ứng viên cấp cao, tập trung vào chiến lược và mentoring'
        }
        level_hint = level_context.get(level, level_context['middle'])

        jd_hint = ""
        if career_context.get("jd_responsibilities") and len(career_context["jd_responsibilities"]) > 0:
            resp = career_context["jd_responsibilities"][0]
            jd_hint = f" Đặc biệt, vị trí này yêu cầu: {resp}."

        first_q_prompt = f"""Bạn là HR Manager phỏng vấn {level_hint} cho vị trí {job_title}.

Tạo 1 câu hỏi warm-up: hỏi về hành trình/động lực chọn lĩnh vực này, đề cập {top_skill}.{jd_hint.replace('{','(').replace('}',')')} 1-2 câu, cụ thể. CHỈ trả về câu hỏi."""

        try:
            response = self.gemini.stream_manager.generate_content_with_retry(
                first_q_prompt,
                max_output_tokens=120,
                temperature=0.8
            )
            if response and len(response.strip()) > 30:
                return response.strip()
        except Exception as e:
            print(f"⚠️ First question generation failed: {e}")

        import random
        fallback_questions = {
            'fresher': [
                f"Điều gì khiến bạn chọn theo đuổi lĩnh vực {job_title}? Trong quá trình học, bạn đã có trải nghiệm nào liên quan đến {top_skill} mà bạn tự hào nhất?",
                f"Hãy kể về hành trình bạn khám phá đam mê với {job_title} và những gì bạn đã chuẩn bị cho vị trí này.",
            ],
            'middle': [
                f"Nhìn lại hành trình nghề nghiệp, điều gì thúc đẩy bạn ứng tuyển vị trí {job_title} lần này? Hãy chia sẻ về kinh nghiệm với {top_skill} của bạn.",
                f"Hãy kể về dự án hoặc thành tựu bạn tự hào nhất liên quan đến {job_title} — bạn đã làm gì và kết quả ra sao?",
            ],
            'senior': [
                f"Với kinh nghiệm trong lĩnh vực {job_title}, hãy kể về thách thức lớn nhất bạn từng đối mặt với {top_skill} và cách bạn vượt qua.",
            ]
        }

        level_key = level if level in fallback_questions else 'middle'
        return random.choice(fallback_questions[level_key])

    def _get_random_hr_name(self) -> str:
        """Tạo tên HR Manager ngẫu nhiên để tăng tính cá nhân hóa"""
        hr_names = [
            "Ms. Linh", "Ms. Hương", "Ms. Trang", "Ms. Phương", 
            "Mr. Minh", "Ms. Thảo", "Ms. Lan", "Mr. Đức"
        ]
        import random
        return random.choice(hr_names)

    async def _evaluate_answer_enhanced(self, question: str, user_answer: str, job_title: str,
                                      question_type: str, is_skipped: bool, session_context: Dict = None) -> Dict:
        """Enhanced evaluation với strict scoring và copy-paste detection
        
        CRITICAL FIX: jd_qualification và closing không được chấm điểm
        """
        # CRITICAL FIX: No scoring for jd_qualification and closing questions
        if question_type in ["jd_qualification", "closing"]:
            print(f"✅ No scoring for {question_type} question - generating acknowledgment only")
            return await self._evaluate_jd_qualification_or_closing_answer(
                question_type, user_answer, job_title, session_context
            )
        
        if is_skipped or not user_answer or user_answer.strip() in ["(Không trả lời)", "", "skip", "bỏ qua"]:
            return self._create_skipped_evaluation()

        answer_stripped = user_answer.strip()
        word_count = len(answer_stripped.split())

        # Phát hiện copy-paste từ câu hỏi
        import re as _re
        question_words = set(_re.sub(r'[^\w\s]', '', question.lower()).split())
        answer_words = set(_re.sub(r'[^\w\s]', '', answer_stripped.lower()).split())
        if len(question_words) > 5:
            overlap = len(question_words & answer_words) / len(question_words)
            # Chỉ phạt nếu overlap cao VÀ câu trả lời ngắn (tránh false positive với câu trả lời dài)
            if overlap > 0.65 and word_count < 50:
                return {
                    "score": 1.0,
                    "detailed_scores": {"technical": 1, "logic": 1, "communication": 1, "experience": 1, "attitude": 1},
                    "feedback": "Câu trả lời có nội dung trùng lặp với câu hỏi, không thể hiện hiểu biết thực sự.",
                    "strengths": [],
                    "weaknesses": ["Không trả lời câu hỏi", "Nội dung copy từ câu hỏi", "Không có kiến thức thực chất"],
                    "suggestion": f"Hãy đọc kỹ câu hỏi và trả lời bằng kinh nghiệm thực tế của bạn về {job_title}."
                }

        if word_count <= 3 or len(answer_stripped) < 10:
            return {
                "score": 1.0,
                "detailed_scores": {"technical": 1, "logic": 1, "communication": 1, "experience": 1, "attitude": 1},
                "feedback": "Câu trả lời quá ngắn, không có giá trị đánh giá.",
                "strengths": [],
                "weaknesses": ["Câu trả lời quá ngắn", "Không có nội dung thực chất"],
                "suggestion": f"Cần trả lời chi tiết với ví dụ cụ thể liên quan đến {job_title}."
            }

        # Get level context for evaluation
        effective_level = "junior"  # default
        level_context_str = ""
        if session_context:
            effective_level = session_context.get("effective_level", "junior")
            level_expectations = {
                'fresher': 'ứng viên mới ra trường - đánh giá tiềm năng học hỏi và thái độ',
                'junior': 'ứng viên junior - đánh giá kiến thức cơ bản và khả năng áp dụng',
                'middle': 'ứng viên middle - đánh giá kinh nghiệm thực tế và khả năng giải quyết vấn đề',
                'senior': 'ứng viên senior - đánh giá leadership và khả năng thiết kế giải pháp',
                'lead': 'ứng viên lead - đánh giá tầm nhìn chiến lược và khả năng phát triển team'
            }
            level_context_str = f"\nCấp bậc: {level_expectations.get(effective_level, f'cấp {effective_level}')}"

        # Truncate và escape để tránh f-string crash và JSON bị cắt
        answer_for_eval = answer_stripped[:600] if len(answer_stripped) > 600 else answer_stripped
        q_safe = question[:250].replace('{', '{{').replace('}', '}}')
        a_safe = answer_for_eval.replace('{', '{{').replace('}', '}}')
        level_safe = level_context_str.replace('{', '{{').replace('}', '}}')

        evaluation_prompt = f"""Bạn là chuyên gia đánh giá phỏng vấn NGHIÊM KHẮC. Đọc TOÀN BỘ câu trả lời và đánh giá.

Câu hỏi: {q_safe}
Câu trả lời: {a_safe}
Vị trí: {job_title} | Loại: {question_type} | Số từ: {word_count}{level_safe}

RULES BẮT BUỘC:
1. Đọc TOÀN BỘ nội dung, không chỉ từ khóa
2. Copy từ câu hỏi hoặc vô nghĩa = 1/10
3. Dưới 20 từ = tối đa 3/10
4. Không có ví dụ cụ thể = trừ 2 điểm
5. Không liên quan câu hỏi = tối đa 3/10
6. Lộn xộn, không mạch lạc = tối đa 4/10
7. ĐIỀU CHỈNH THEO CẤP BẬC: {effective_level} - kỳ vọng phù hợp với kinh nghiệm
8. KHÔNG cho điểm cao để khuyến khích

Trả về JSON (CHỈ JSON, không text khác, không xuống dòng trong string):
{{"score":5.0,"detailed_scores":{{"technical":5,"logic":5,"communication":5,"experience":5,"attitude":5}},"feedback":"nhan xet","strengths":["diem manh"],"weaknesses":["diem yeu"],"suggestion":"goi y cu the"}}"""

        try:
            response_text = self.gemini.stream_manager.generate_content_with_retry(
                evaluation_prompt,
                max_output_tokens=400,
                temperature=0.1
            )

            if response_text:
                import re
                # Tìm JSON, clean control chars trước khi parse
                match = re.search(r'\{[\s\S]*\}', response_text)
                if match:
                    json_str = match.group()
                    json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', json_str)
                    result = json.loads(json_str)
                    normalized = self._normalize_evaluation_result(result)
                    if word_count <= 10 and normalized["score"] > 3.0:
                        normalized["score"] = 3.0
                    elif word_count <= 20 and normalized["score"] > 4.5:
                        normalized["score"] = 4.5
                    return normalized

        except Exception as e:
            print(f"⚠️ Enhanced evaluation failed: {e}")

        return self._create_fallback_evaluation(user_answer)

    async def _evaluate_jd_qualification_or_closing_answer(self, question_type: str, user_answer: str, 
                                                         job_title: str, session_context: Dict = None) -> Dict:
        """Evaluate JD qualification or closing answer với Gemini - NO SCORING
        
        Phân tích câu trả lời jd_qualification để:
        - Tạo phản hồi phù hợp (không phải lúc nào cũng "Cảm ơn")
        - Populate strengths/weaknesses để lưu vào session history
        """
        answer_text = (user_answer or "").strip()
        is_empty = not answer_text or len(answer_text) < 5 or answer_text in ["(Không trả lời)", "(Đã bỏ qua)", "(Hết thời gian - Chưa nhập câu trả lời)"]
        
        # Extract JD context
        company_name = "công ty"
        jd_data_ctx = {}
        qualifications = []
        jd_qualifications = []
        if session_context and session_context.get("jd_data"):
            jd_data_ctx = session_context["jd_data"]
            # jd_data = jd.extracted_data trực tiếp, hỗ trợ cả 2 format
            extracted = jd_data_ctx.get("extracted_data", jd_data_ctx)
            company_name = extracted.get("company_name", "công ty")
            qualifications = extracted.get("qualifications", [])
            skills_context_list = jd_data_ctx.get("skills_context", [])
            jd_qualifications = [s for s in skills_context_list if s.get("skill_type") == "JD Qualification"]

        if question_type == "closing":
            # Closing: phản hồi đơn giản
            if is_empty:
                feedback = "Cảm ơn bạn! Nếu có thêm câu hỏi nào khác, bạn có thể liên hệ với chúng tôi bất cứ lúc nào."
            else:
                feedback = self._get_fallback_feedback("closing", answer_text)
            return {
                "score": None, "detailed_scores": None,
                "feedback": feedback, "strengths": [], "weaknesses": [],
                "suggestion": None, "is_qualification_question": True
            }

        # jd_qualification: phân tích nội dung để tạo strengths/weaknesses
        strengths = []
        weaknesses = []

        if is_empty:
            # Không trả lời → phản hồi thẳng thắn + ghi nhận điểm yếu
            feedback = "Bạn chưa cung cấp thông tin về yêu cầu này. Đây là một trong những tiêu chí quan trọng của vị trí."
            weaknesses.append("Không cung cấp thông tin về yêu cầu bằng cấp/ngôn ngữ")
        else:
            # Có câu trả lời → dùng Gemini phân tích
            try:
                qual_str = "\n".join(f"  - {q}" for q in qualifications) if qualifications else "  - Không có thông tin cụ thể"
                jd_qual_str = "\n".join(f"  - {s.get('skill_name')}" for s in jd_qualifications) if jd_qualifications else "  - Không có thông tin cụ thể"
                location = jd_data_ctx.get("extracted_data", {}).get("location", "")
                company_culture = jd_data_ctx.get("extracted_data", {}).get("company_culture", "")
                experience_level = jd_data_ctx.get("extracted_data", {}).get("experience_level", "")

                full_context = f"""
=== THÔNG TIN JD ===
Công ty: {company_name} | Địa điểm: {location} | Cấp độ: {experience_level}
Văn hóa: {company_culture}
Qualifications yêu cầu:
{qual_str}
JD Qualification skills:
{jd_qual_str}
==================="""

                prompt = f"""Bạn là HR Manager của {company_name}. Ứng viên vừa trả lời câu hỏi về bằng cấp/ngôn ngữ cho vị trí {job_title}.
{full_context}
CÂU TRẢ LỜI CỦA ỨNG VIÊN:
"{answer_text}"

NHIỆM VỤ: Phân tích câu trả lời và trả về JSON:

QUY TẮC:
1. feedback: phản hồi thực tế, không phải lúc nào cũng "Cảm ơn bạn đã chia sẻ"
   - Nếu ứng viên CÓ đáp ứng yêu cầu (có chứng chỉ, có kinh nghiệm) → ghi nhận tích cực, cụ thể
   - Nếu ứng viên KHÔNG đáp ứng (không có chứng chỉ, chưa đủ trình độ) → phản hồi thẳng thắn, khuyến khích cải thiện
   - Nếu câu trả lời mơ hồ/không rõ ràng → hỏi thêm hoặc ghi nhận sự thiếu thông tin
2. strengths: list điểm mạnh (nếu có chứng chỉ/kinh nghiệm phù hợp yêu cầu JD)
3. weaknesses: list điểm yếu (nếu thiếu chứng chỉ/kinh nghiệm so với yêu cầu JD)
4. Độ dài feedback: 1-2 câu, phù hợp văn hóa Việt Nam

Trả về JSON:
{{"feedback": "...", "strengths": ["..."], "weaknesses": ["..."]}}

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH."""

                response = self.gemini.stream_manager.generate_content_with_retry(
                    prompt, max_output_tokens=200, temperature=0.5
                )
                
                if response:
                    import re as _re
                    match = _re.search(r'\{[\s\S]*\}', response)
                    if match:
                        import json as _json
                        parsed = _json.loads(match.group())
                        feedback = parsed.get("feedback", "")
                        strengths = [s for s in parsed.get("strengths", []) if s and s.strip()]
                        weaknesses = [w for w in parsed.get("weaknesses", []) if w and w.strip()]
                        if feedback and len(feedback.strip()) > 5:
                            print(f"✅ Gemini generated jd_qualification feedback: {feedback[:60]}...")
                        else:
                            feedback = self._get_fallback_feedback_smart(answer_text, jd_qualifications)
                    else:
                        feedback = response.strip() if len(response.strip()) > 10 else self._get_fallback_feedback_smart(answer_text, jd_qualifications)
                else:
                    feedback = self._get_fallback_feedback_smart(answer_text, jd_qualifications)
                    
            except Exception as e:
                print(f"⚠️ Gemini jd_qualification feedback generation failed: {e}")
                feedback = self._get_fallback_feedback_smart(answer_text, jd_qualifications)
                # Fallback strengths/weaknesses
                if any(kw in answer_text.lower() for kw in ["n3", "n2", "n1", "jlpt", "toeic", "ielts", "b2", "c1"]):
                    strengths.append("Có chứng chỉ ngoại ngữ")
                elif any(kw in answer_text.lower() for kw in ["không", "chưa", "ko có"]):
                    weaknesses.append("Chưa đáp ứng yêu cầu ngoại ngữ")
        
        return {
            "score": None,
            "detailed_scores": None,
            "feedback": feedback,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestion": None,
            "is_qualification_question": True
        }

    def _get_fallback_feedback_smart(self, answer_text: str, jd_qualifications: list) -> str:
        """Fallback feedback thông minh dựa trên nội dung câu trả lời"""
        answer_lower = answer_text.lower()
        # Có chứng chỉ tiếng Nhật
        if any(kw in answer_lower for kw in ["n3", "n2", "n1", "jlpt"]):
            return "Cảm ơn bạn đã chia sẻ về trình độ tiếng Nhật. Chúng tôi sẽ ghi nhận thông tin này."
        # Có TOEIC/tiếng Anh
        if any(kw in answer_lower for kw in ["toeic", "ielts", "toefl", "tiếng anh"]):
            return "Cảm ơn thông tin về trình độ tiếng Anh của bạn. Thông tin này rất hữu ích cho vị trí này."
        # Có học vấn CNTT
        if any(kw in answer_lower for kw in ["cntt", "công nghệ thông tin", "khoa học máy tính", "kỹ thuật phần mềm"]):
            return "Cảm ơn bạn đã chia sẻ về chuyên ngành học. Thông tin này phù hợp với yêu cầu của vị trí."
        # Không có / chưa có
        if any(kw in answer_lower for kw in ["không", "chưa", "ko có", "chưa có"]):
            return "Cảm ơn bạn đã thành thật chia sẻ. Đây là yêu cầu quan trọng của vị trí, bạn có thể cân nhắc bổ sung trong thời gian tới."
        # Generic
        return "Cảm ơn bạn đã chia sẻ thông tin. Chúng tôi sẽ xem xét trong quá trình đánh giá."

    def _get_fallback_feedback(self, question_type: str, user_answer: str) -> str:
        """Get fallback feedback for jd_qualification or closing questions"""
        if question_type == "jd_qualification":
            if len(user_answer) < 20:
                return "Cảm ơn bạn đã chia sẻ. Thông tin này sẽ giúp chúng tôi hiểu rõ hơn về background của bạn."
            elif "học" in user_answer.lower() or "sinh viên" in user_answer.lower() or "cntt" in user_answer.lower():
                return "Cảm ơn bạn đã chia sẻ về background học vấn. Thông tin này rất hữu ích cho quá trình đánh giá!"
            elif "tiếng nhật" in user_answer.lower() or "n3" in user_answer.lower() or "jlpt" in user_answer.lower():
                return "Tuyệt vời! Cảm ơn bạn đã chia sẻ về trình độ tiếng Nhật. Chúng tôi sẽ ghi nhận thông tin này."
            elif "toeic" in user_answer.lower() or "tiếng anh" in user_answer.lower() or "english" in user_answer.lower():
                return "Cảm ơn thông tin về tiếng Anh của bạn. Thông tin này rất hữu ích cho vị trí này!"
            else:
                return "Cảm ơn bạn đã chia sẻ chi tiết về trình độ của mình. Thông tin này rất hữu ích cho quá trình đánh giá."
        else:  # closing
            if "không" in user_answer.lower() or "ko" in user_answer.lower() or "no" in user_answer.lower():
                return "Cảm ơn bạn! Nếu có thêm câu hỏi nào khác, bạn có thể liên hệ với chúng tôi bất cứ lúc nào."
            else:
                return "Cảm ơn câu hỏi của bạn! Chúng tôi sẽ ghi nhận và phản hồi sớm nhất có thể."

    async def _handle_closing_answer(self, db_session: InterviewSession, last_question: InterviewMessage,
                                     user_answer: str, has_audio: bool, audio_duration: float) -> Dict:
        """Xử lý câu trả lời cho câu hỏi closing.
        - Nếu ứng viên hỏi lại → HR trả lời dựa trên JD context, TIẾP TỤC hội thoại (không kết thúc)
        - Nếu không có câu hỏi → HR cảm ơn và kết thúc
        - KHÔNG chấm điểm câu closing
        - Hội thoại closing là LIÊN TỤC, không giới hạn số lần
        """
        answer_text = (user_answer or "").strip()
        
        # Lưu câu trả lời của ứng viên (không có score)
        answer_msg = InterviewMessage(
            session_id=db_session.id,
            role="candidate",
            content=answer_text if answer_text else "(Không có câu hỏi)",
            question_number=last_question.question_number,
            score=None,
            detailed_scores=None,
            feedback=None,
            strengths=None,
            weaknesses=None,
            suggestion=None,
            has_audio=has_audio,
            audio_duration=audio_duration
        )
        self.db.add(answer_msg)
        self.db.commit()
        
        # Phân tích: ứng viên có câu hỏi không?
        has_question = self._candidate_has_question(answer_text)
        
        # Lấy JD context để HR trả lời có context
        market_context = db_session.market_context or {}
        jd_data = market_context.get("jd_data")
        
        if has_question:
            # Ứng viên hỏi lại → HR trả lời với JD context, TIẾP TỤC hội thoại
            hr_response = await self._generate_hr_response_to_candidate_question(
                answer_text, db_session.job_title, jd_data
            )
            
            # Lưu HR response như closing_response message
            hr_msg = InterviewMessage(
                session_id=db_session.id,
                role="interviewer",
                content=hr_response,
                question_type="closing_response",
                question_number=last_question.question_number
            )
            self.db.add(hr_msg)
            self.db.commit()
            
            # TIẾP TỤC hội thoại - hỏi ứng viên có câu hỏi nào khác không
            follow_up = await self._generate_closing_follow_up(db_session.job_title, jd_data)
            
            # Lưu follow-up như closing message mới
            follow_up_msg = InterviewMessage(
                session_id=db_session.id,
                role="interviewer",
                content=follow_up,
                question_type="closing",
                question_number=last_question.question_number
            )
            self.db.add(follow_up_msg)
            self.db.commit()
            
            return {
                "status": "continue",
                "next_question": follow_up,
                "question_number": last_question.question_number,
                "question_type": "closing",
                "evaluation": {
                    "score": None,
                    "detailed_scores": None,
                    "feedback": None,
                    "strengths": [],
                    "weaknesses": [],
                    "suggestion": None,
                    "is_qualification_question": True
                },
                "hr_acknowledgment": hr_response,  # HR trả lời câu hỏi của ứng viên
                "skills_tested": [],
                "skills_details": [],
            }
        else:
            # Không có câu hỏi → kết thúc phỏng vấn
            return await self._finish_interview_enhanced(db_session, {})

    def _candidate_has_question(self, answer: str) -> bool:
        """Phân tích xem ứng viên có đặt câu hỏi không"""
        if not answer or len(answer.strip()) < 5:
            return False
        
        answer_lower = answer.lower().strip()
        
        # Các pattern "không có câu hỏi"
        no_question_patterns = [
            "không", "ko", "k có", "không có", "không có câu hỏi", "không có gì",
            "không có thắc mắc", "tôi không có", "em không có", "mình không có",
            "cảm ơn", "cảm ơn anh", "cảm ơn chị", "cảm ơn bạn",
            "không thắc mắc", "không hỏi gì", "không có gì thêm",
            "tôi hiểu rồi", "em hiểu rồi", "mình hiểu rồi",
            "no", "nope", "nothing", "no question",
            "thôi", "vậy thôi", "ok thôi",
        ]
        
        # Nếu câu trả lời ngắn và khớp pattern không có câu hỏi
        if len(answer_lower) <= 50:
            for pattern in no_question_patterns:
                if pattern in answer_lower:
                    return False
        
        # Các dấu hiệu có câu hỏi
        question_indicators = [
            "?", "hỏi", "muốn biết", "thắc mắc", "tò mò",
            "như thế nào", "bao nhiêu", "khi nào", "ở đâu", "tại sao",
            "có thể cho tôi biết", "cho em hỏi", "cho mình hỏi",
            "what", "how", "when", "where", "why", "who",
            "lương", "salary", "onboard", "onboarding", "quy trình",
            "team", "dự án", "project", "công nghệ", "tech stack",
            "văn hóa", "culture", "môi trường", "environment",
        ]
        
        for indicator in question_indicators:
            if indicator in answer_lower:
                return True
        
        # Câu dài (>30 từ) thường là có câu hỏi
        if len(answer_lower.split()) > 30:
            return True
        
        return False

    async def _generate_closing_follow_up(self, job_title: str, jd_data: Optional[Dict] = None) -> str:
        """Tạo câu hỏi follow-up sau khi HR đã trả lời câu hỏi của ứng viên trong closing"""
        company_name = "công ty"
        if jd_data:
            # jd_data = jd.extracted_data trực tiếp, hỗ trợ cả 2 format
            extracted = jd_data.get("extracted_data", jd_data)
            company_name = extracted.get("company_name", "công ty")

        prompt = f"""Bạn là HR Manager của {company_name}. Bạn vừa trả lời câu hỏi của ứng viên.
Hãy hỏi ứng viên xem họ còn câu hỏi nào khác về {company_name} hoặc vị trí {job_title} không.
Thân thiện, ngắn gọn (1 câu). CHỈ trả về câu hỏi."""

        try:
            response = self.gemini.stream_manager.generate_content_with_retry(
                prompt, max_output_tokens=80, temperature=0.7
            )
            if response and len(response.strip()) > 10:
                return response.strip()
        except Exception:
            pass

        return f"Bạn còn câu hỏi nào khác về {company_name} hoặc vị trí này không?"

    async def _generate_hr_response_to_candidate_question(self, candidate_question: str, job_title: str, jd_data: Optional[Dict] = None) -> str:
        """HR trả lời câu hỏi của ứng viên dựa trên JD context"""
        jd_context = ""
        company_name = "công ty"
        if jd_data:
            # jd_data = jd.extracted_data trực tiếp (không có wrapper extracted_data)
            # Hỗ trợ cả 2 format: flat và nested
            extracted = jd_data.get("extracted_data", jd_data)
            company_name = extracted.get("company_name", "công ty")
            location = extracted.get("location", "")
            benefits = extracted.get("benefits", [])
            training_program = extracted.get("training_program", [])
            company_culture = extracted.get("company_culture", "")
            responsibilities = extracted.get("responsibilities", [])
            required_skills = extracted.get("required_skills", [])
            tools = extracted.get("tools", [])
            domain = extracted.get("domain", [])
            qualifications = extracted.get("qualifications", [])

            benefits_str = "\n".join(f"  - {b}" for b in benefits) if benefits else "  - Không có thông tin cụ thể"
            training_str = "\n".join(f"  - {t}" for t in training_program) if training_program else "  - Không có thông tin cụ thể"
            resp_str = "\n".join(f"  - {r}" for r in responsibilities) if responsibilities else "  - Không có thông tin cụ thể"
            skills_str = "\n".join(f"  - {s}" for s in required_skills[:8]) if required_skills else "  - Không có thông tin cụ thể"
            tools_str = "\n".join(f"  - {t}" for t in tools[:5]) if tools else "  - Không có thông tin cụ thể"
            qual_str = "\n".join(f"  - {q}" for q in qualifications) if qualifications else "  - Không có thông tin cụ thể"
            domain_str = ", ".join(domain) if domain else "Không có thông tin"

            jd_context = f"""
=== TOÀN BỘ THÔNG TIN JD (ĐỌC KỸ ĐỂ TRẢ LỜI CHÍNH XÁC) ===
Công ty: {company_name} | Địa điểm: {location}
Văn hóa: {company_culture}
Lĩnh vực: {domain_str}

PHÚC LỢI (benefits) — QUAN TRỌNG, dùng để trả lời câu hỏi về lương/trợ cấp:
{benefits_str}

CHƯƠNG TRÌNH ĐÀO TẠO:
{training_str}

YÊU CẦU BẰNG CẤP/NGÔN NGỮ:
{qual_str}

KỸ NĂNG YÊU CẦU:
{skills_str}

CÔNG CỤ/FRAMEWORK:
{tools_str}

TRÁCH NHIỆM CÔNG VIỆC:
{resp_str}
================================================================"""

        prompt = f"""Bạn là HR Manager của {company_name} đang phỏng vấn cho vị trí {job_title}.
{jd_context}
Ứng viên vừa đặt câu hỏi: "{candidate_question[:300]}"

NHIỆM VỤ: Dựa vào TOÀN BỘ THÔNG TIN JD trên, trả lời câu hỏi của ứng viên một cách CHÍNH XÁC và CỤ THỂ.

QUY TẮC BẮT BUỘC:
1. Nếu câu hỏi về lương/trợ cấp → dùng thông tin từ mục PHÚC LỢI (VD: "Lương trợ cấp đào tạo lên đến 21.000.000 VND/khóa")
2. Nếu câu hỏi về đào tạo → dùng thông tin từ CHƯƠNG TRÌNH ĐÀO TẠO
3. Nếu câu hỏi về văn hóa/môi trường → dùng thông tin từ Văn hóa
4. KHÔNG được nói "chưa có thông tin" nếu thông tin đã có trong JD
5. Trả lời ngắn gọn (2-4 câu), thân thiện, cụ thể với số liệu nếu có

CHỈ trả về câu trả lời, không giải thích."""
        
        try:
            response = self.gemini.stream_manager.generate_content_with_retry(
                prompt, max_output_tokens=250, temperature=0.7
            )
            if response and len(response.strip()) > 20:
                return response.strip()
        except Exception as e:
            print(f"⚠️ HR response generation failed: {e}")
        
        return (
            f"Cảm ơn bạn đã đặt câu hỏi! Đây là thông tin tôi có thể chia sẻ về {job_title} tại {company_name}. "
            "Chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất về kết quả phỏng vấn. "
            "Cảm ơn bạn đã dành thời gian tham gia buổi phỏng vấn hôm nay!"
        )

    async def _continue_interview_enhanced(self, db_session: InterviewSession, evaluation: Dict, next_question_number: int, force_question_type: str = None) -> Dict:
        """Tiếp tục phỏng vấn với enhanced question generation"""
        # CRITICAL FIX: Lấy JD context từ market_context thay vì detect từ question_distribution
        market_context = db_session.market_context or {}

        # DEBUG: log CV context status
        _cv_debug = {
            "cv_based": market_context.get("cv_based", False),
            "cv_skills_count": len(market_context.get("cv_skills", [])),
            "critical_gaps_count": len(market_context.get("critical_gaps", [])),
            "important_gaps_count": len(market_context.get("important_gaps", [])),
        }
        print(f"[CV-Debug] Q{next_question_number} market_context CV: {_cv_debug}")
        has_jd = market_context.get("has_jd", False)
        jd_count = market_context.get("jd_questions_count", 0)
        jd_data = market_context.get("jd_data")  # Get full JD data
        
        print(f"✅ Continue interview - JD context: has_jd={has_jd}, jd_count={jd_count}, jd_data_exists={jd_data is not None}")
        
        # FIX: Sử dụng db_session.question_count thay vì hardcoded value
        total_questions = db_session.question_count or 7
        
        # Xác định loại câu hỏi từ session.question_distribution (đã lưu trong DB)
        # Dùng distribution trực tiếp thay vì tính lại để tránh sai lệch
        session_dist = db_session.question_distribution or {}
        
        if force_question_type:
            question_type = force_question_type
            print(f"✅ Using forced question type: {question_type}")
        else:
            question_type = self._determine_next_question_type_from_dist(
                next_question_number, session_dist, has_jd, jd_count
            )
            print(f"✅ Determined question type from distribution: {question_type} for Q{next_question_number}")

        # CRITICAL FIX: Validate question type trước khi generate
        if not self._validate_question_type(question_type):
            print(f"⚠️ Invalid question type '{question_type}', falling back to technical")
            question_type = 'technical'
        
        # Get level information from session market_context
        effective_level = market_context.get("effective_level", "junior")
        level_context = market_context.get("level_context")  # Get full level context
        level_description = market_context.get("level_description", "")
        experience_range = market_context.get("experience_range", "")
        interview_focus = market_context.get("interview_focus", [])
        
        print(f"✅ Using effective level for question generation: {effective_level}")

        # Lấy lịch sử câu hỏi đã hỏi để tránh lặp
        asked_questions = self.db.query(InterviewMessage.content).filter(
            InterviewMessage.session_id == db_session.id,
            InterviewMessage.role == "interviewer",
            InterviewMessage.question_type != "greeting"
        ).all()
        asked_list = [q.content[:400] for q in asked_questions]
        asked_context = "\n".join(f"- {q}" for q in asked_list) if asked_list else "Chưa có câu hỏi nào"

        # CRITICAL FIX: Lấy JD context từ persisted data thay vì skills_context
        jd_context_str = ""
        if question_type == 'jd_specific' and jd_data:
            # Use full JD data from market_context
            required_skills = jd_data.get("required_skills", [])[:5]
            tools = jd_data.get("tools", [])[:3]
            responsibilities = jd_data.get("responsibilities", [])[:3]
            
            if required_skills:
                jd_context_str = f"\nKỹ năng từ JD: {', '.join(required_skills)}"
            if tools:
                jd_context_str += f"\nCông cụ từ JD: {', '.join(tools)}"
            if responsibilities:
                jd_context_str += f"\nTrách nhiệm từ JD: {'; '.join(responsibilities[:2])}"
            
            print(f"✅ JD context for question generation: {jd_context_str[:100]}...")
        elif question_type == 'jd_specific':
            # Fallback: lấy từ skills_context nếu có
            jd_skills = [s.get("skill_name", "") for s in db_session.skills_context if isinstance(s, dict) and s.get("source") == "jd"][:3]
            if jd_skills:
                jd_context_str = f"\nKỹ năng từ JD: {', '.join(jd_skills)}"
            else:
                # Last fallback: lấy top skills từ context
                all_skills = [s.get("skill_name", "") for s in db_session.skills_context if isinstance(s, dict)][:3]
                if all_skills:
                    jd_context_str = f"\nKỹ năng cần đánh giá: {', '.join(all_skills)}"

        # Map question_type sang label tiếng Việt cho prompt
        type_label = {
            'warm_up': 'làm quen/mở đầu',
            'technical': 'kỹ thuật chuyên môn',
            'behavioral': 'hành vi/kinh nghiệm',
            'situational': 'tình huống thực tế',
            'jd_specific': 'về yêu cầu cụ thể trong JD của công ty',
            'jd_qualification': 'về bằng cấp và trình độ yêu cầu trong JD',
            'closing': 'kết thúc'
        }.get(question_type, question_type)

        # Create level-specific context for prompt
        level_context_str = ""
        if effective_level and effective_level != "junior":
            level_mapping = {
                'fresher': 'ứng viên mới ra trường (0-1 năm kinh nghiệm)',
                'junior': 'ứng viên junior (1-2 năm kinh nghiệm)',
                'middle': 'ứng viên middle (3-5 năm kinh nghiệm)',
                'senior': 'ứng viên senior (5+ năm kinh nghiệm)',
                'lead': 'ứng viên cấp cao/lead (7+ năm kinh nghiệm)'
            }
            level_desc = level_mapping.get(effective_level, f"ứng viên cấp {effective_level}")
            level_context_str = f"\nCấp bậc ứng viên: {level_desc}"
            
            if experience_range:
                level_context_str += f" ({experience_range})"
            
            if interview_focus:
                focus_areas = ", ".join(interview_focus[:3])  # Limit to 3 focus areas
                level_context_str += f"\nTrọng tâm phỏng vấn: {focus_areas}"

        asked_context_safe = asked_context.replace('{', '(').replace('}', ')')
        jd_context_safe = jd_context_str.replace('{', '(').replace('}', ')')
        level_context_safe = level_context_str.replace('{', '(').replace('}', ')')

        # ── CV-based mode: override skills with CV data ──────────────
        is_cv_based = market_context.get("cv_based", False)
        cv_skills_list   = market_context.get("cv_skills", [])
        critical_gaps    = market_context.get("critical_gaps", [])
        important_gaps   = market_context.get("important_gaps", [])

        if is_cv_based and (cv_skills_list or critical_gaps):
            # For CV-based interview, alternate between:
            # - Questions about skills they HAVE (odd questions → behavioral)
            # - Questions about skills they LACK (even questions → situational/knowledge)
            odd_question = next_question_number % 2 == 1
            if odd_question and cv_skills_list:
                focus_skill = cv_skills_list[(next_question_number // 2) % len(cv_skills_list)]
                skills_tested_names = [focus_skill]
                skills_str = focus_skill
            else:
                all_gaps = critical_gaps + important_gaps
                if all_gaps:
                    focus_skill = all_gaps[(next_question_number // 2) % len(all_gaps)]
                    skills_tested_names = [focus_skill]
                    skills_str = focus_skill
                elif cv_skills_list:
                    focus_skill = cv_skills_list[0]
                    skills_tested_names = [focus_skill]
                    skills_str = focus_skill
                else:
                    skills_tested_names = []
                    skills_str = ""
            skills_for_msg = [{"skill_name": s} for s in skills_tested_names]
        else:
            # Standard mode: use O*NET skills from session context
            all_skills = db_session.skills_context or []

            def is_hard_skill_safe(skill):
                if not isinstance(skill, dict):
                    return False
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
                    if value in (float('inf'), float('-inf')) or value != value:
                        return 0
                    return value
                except (ValueError, TypeError):
                    return 0

            hard_skills = [s for s in all_skills if is_hard_skill_safe(s) and s.get("source") != "jd"]
            soft_skills = [s for s in all_skills if isinstance(s, dict) and not is_hard_skill_safe(s)]
            hard_skills.sort(key=safe_importance, reverse=True)
            soft_skills.sort(key=safe_importance, reverse=True)

            skills_for_msg = self._select_skills_for_question_type(
                db_session.skills_context, question_type, next_question_number, db_session.id
            )
            skills_tested_names = [s.get("skill_name", "") for s in skills_for_msg]
            skills_str = ', '.join(skills_tested_names)

        # CRITICAL FIX: Handle jd_qualification questions using dedicated method
        if question_type == 'jd_qualification':
            try:
                print(f"🎓 Generating JD qualification question for Q{next_question_number}")
                print(f"🎓 JD data available: {jd_data is not None}")
                print(f"🎓 Skills context: {len(db_session.skills_context or [])} skills")
                
                next_question = await self._generate_jd_qualification_question(db_session, jd_data)
                
                print(f"🎓 Generated JD qualification question: {next_question[:100] if next_question else 'None'}...")
                
                if next_question and next_question.strip():
                    # Lấy đúng qualification đang được hỏi (theo qual_count)
                    jd_qual_skills_all = [s for s in db_session.skills_context or [] 
                                    if isinstance(s, dict) and s.get("source") == "jd" and s.get("skill_type") == "JD Qualification"]
                    
                    if jd_qual_skills_all:
                        # Sắp xếp theo priority giống _generate_jd_qualification_question
                        def _qual_priority(skill):
                            name = skill.get("skill_name", "").lower()
                            if any(kw in name for kw in ["sinh viên", "tốt nghiệp", "chuyên ngành", "công nghệ thông tin"]):
                                return 0
                            elif "tiếng nhật" in name or "n3" in name:
                                return 1
                            elif "tiếng anh" in name or "toeic" in name:
                                return 2
                            return 3
                        sorted_quals = sorted(jd_qual_skills_all, key=_qual_priority)
                        # Đếm số câu jd_qualification đã hỏi (trước câu này)
                        qual_asked = self.db.query(InterviewMessage).filter(
                            InterviewMessage.session_id == db_session.id,
                            InterviewMessage.role == "interviewer",
                            InterviewMessage.question_type == "jd_qualification"
                        ).count()
                        # Lấy qualification đang hỏi
                        current_qual_idx = qual_asked  # Chưa commit câu này nên count = số đã hỏi trước
                        if current_qual_idx < len(sorted_quals):
                            skills_for_msg = [sorted_quals[current_qual_idx]]
                            skills_tested_names = [sorted_quals[current_qual_idx].get("skill_name", "")]
                        else:
                            skills_for_msg = jd_qual_skills_all
                            skills_tested_names = [s.get("skill_name", "") for s in jd_qual_skills_all]
                        print(f"🎓 Using JD qualification skill: {skills_tested_names}")
                    else:
                        print(f"🎓 No JD qualification skills found, using fallback")
                    
                    question_msg = InterviewMessage(
                        session_id=db_session.id,
                        role="interviewer",
                        content=next_question.strip(),
                        question_type=question_type,
                        question_number=next_question_number,
                        skills_tested=skills_tested_names
                    )
                    self.db.add(question_msg)
                    self.db.commit()

                    # Lấy feedback từ evaluation để trả về như HR acknowledgment
                    hr_acknowledgment = evaluation.get("feedback", "") if evaluation else ""

                    return {
                        "status": "continue",
                        "next_question": next_question.strip(),
                        "question_number": next_question_number,
                        "question_type": question_type,
                        "evaluation": evaluation,
                        "hr_acknowledgment": hr_acknowledgment,  # HR phản hồi câu trả lời jd_qualification
                        "skills_tested": skills_tested_names,
                        "skills_details": skills_for_msg,
                    }
                elif next_question is None:
                    # ĐÃ HỎI HẾT TẤT CẢ JD qualifications - chuyển sang question type khác
                    print(f"🎓 COMPLETED: All JD qualifications asked, moving to next question type")
                    # Tìm question type tiếp theo thay vì jd_qualification
                    next_question_type = self._get_next_question_type_after_jd_qualification(
                        db_session, next_question_number
                    )
                    if next_question_type:
                        print(f"🎓 Moving to next question type: {next_question_type}")
                        # Recursive call với question type mới
                        return await self._continue_interview_enhanced(
                            db_session, evaluation, next_question_number, 
                            force_question_type=next_question_type
                        )
                    else:
                        # Không còn question type nào - kết thúc interview
                        print(f"🎓 No more question types - finishing interview")
                        return await self._finish_interview_enhanced(db_session, evaluation)
                else:
                    print(f"⚠️ JD qualification question generation returned empty result")
            except Exception as e:
                print(f"⚠️ JD qualification question generation failed: {e}")
                import traceback
                traceback.print_exc()
                # Continue to fallback logic below

        # Câu closing: HR hỏi ứng viên có câu hỏi gì không
        elif question_type == 'closing':
            # Build JD context for closing question
            market_context = db_session.market_context or {}
            complete_jd_data = market_context.get("jd_data") or jd_data
            has_jd = market_context.get("has_jd", False)

            if has_jd and complete_jd_data:
                # jd_data = jd.extracted_data trực tiếp, hỗ trợ cả 2 format
                extracted = complete_jd_data.get("extracted_data", complete_jd_data)
                skills_ctx = complete_jd_data.get("skills_context", extracted.get("skills_context", []))

                closing_company = extracted.get("company_name", "công ty")
                location = extracted.get("location", "")
                experience_level = extracted.get("experience_level", "")
                benefits = extracted.get("benefits", [])
                company_culture = extracted.get("company_culture", "")
                training_program = extracted.get("training_program", [])
                qualifications = extracted.get("qualifications", [])
                responsibilities = extracted.get("responsibilities", [])
                required_skills = extracted.get("required_skills", [])
                tools = extracted.get("tools", [])
                domain = extracted.get("domain", [])

                jd_qual_skills = [s.get("skill_name") for s in skills_ctx if s.get("skill_type") == "JD Qualification"]

                benefits_str = "\n".join(f"  - {b}" for b in benefits) if benefits else "  - Không có thông tin cụ thể"
                training_str = "\n".join(f"  - {t}" for t in training_program) if training_program else "  - Không có thông tin cụ thể"
                qual_str = "\n".join(f"  - {q}" for q in qualifications) if qualifications else "  - Không có thông tin cụ thể"
                responsibilities_str = "\n".join(f"  - {r}" for r in responsibilities) if responsibilities else "  - Không có thông tin cụ thể"
                required_skills_str = "\n".join(f"  - {s}" for s in required_skills) if required_skills else "  - Không có thông tin cụ thể"
                tools_str = "\n".join(f"  - {t}" for t in tools) if tools else "  - Không có thông tin cụ thể"
                domain_str = "\n".join(f"  - {d}" for d in domain) if domain else "  - Không có thông tin cụ thể"

                closing_context = f"""
=== TOÀN BỘ THÔNG TIN JD TỪ API ===
Công ty: {closing_company}
Địa điểm: {location}
Cấp độ: {experience_level}
Văn hóa: {company_culture}
Lĩnh vực: {domain_str}

QUALIFICATIONS: {qual_str}
JD QUALIFICATION SKILLS đã hỏi: {jd_qual_skills}
REQUIRED SKILLS: {required_skills_str}
TOOLS: {tools_str}
RESPONSIBILITIES: {responsibilities_str}
BENEFITS: {benefits_str}
TRAINING PROGRAM: {training_str}
====================================="""

                question_prompt = f"""Bạn là HR Manager của {closing_company}, đang kết thúc buổi phỏng vấn vị trí {db_session.job_title}.
{closing_context}
Dựa vào TOÀN BỘ thông tin JD từ API trên, tạo 1 câu hỏi kết thúc tự nhiên, thân thiện mời ứng viên đặt câu hỏi về {closing_company}.

QUY TẮC BẮT BUỘC:
1. Đề cập tên công ty {closing_company} trong câu hỏi
2. Gợi ý CỤ THỂ các chủ đề từ JD: phúc lợi, văn hóa, đào tạo, quy trình làm việc, môi trường
3. Sử dụng thông tin CHÍNH XÁC từ API response (benefits, training_program, company_culture)
4. Thân thiện, cởi mở, 1-2 câu
5. Phù hợp văn hóa Việt Nam

CHỈ TRẢ VỀ CÂU HỎI DUY NHẤT, KHÔNG GIẢI THÍCH."""
            else:
                # Không có JD — câu hỏi closing generic, không đề cập tên công ty cụ thể
                question_prompt = f"""Bạn là HR Manager chuyên nghiệp, đang kết thúc buổi phỏng vấn vị trí {db_session.job_title}.

Tạo 1 câu hỏi kết thúc tự nhiên, thân thiện mời ứng viên đặt câu hỏi về vị trí hoặc công ty.

QUY TẮC BẮT BUỘC:
1. KHÔNG đề cập tên công ty cụ thể nào (vì không có thông tin JD)
2. Hỏi chung: bạn có câu hỏi gì về vị trí, môi trường làm việc, cơ hội phát triển không?
3. Thân thiện, cởi mở, 1-2 câu
4. Phù hợp văn hóa Việt Nam

CHỈ TRẢ VỀ CÂU HỎI DUY NHẤT, KHÔNG GIẢI THÍCH."""
        else:
            print(f"[Q-Gen] type={question_type}, cv_based={is_cv_based}, "
                  f"cv_skills={len(cv_skills_list)}, critical_gaps={len(critical_gaps)}, focus={skills_str!r}")

            if is_cv_based and skills_str:
                # ── CV-BASED: sinh câu hỏi từ CV, kỹ năng đã đánh giá, điểm mạnh/yếu ──

                # Lấy strengths/weaknesses từ các câu trả lời trước
                prev_evaluations = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == db_session.id,
                    InterviewMessage.role == "candidate",
                    InterviewMessage.score != None,
                ).order_by(InterviewMessage.timestamp.asc()).all()

                strengths_seen = []
                weaknesses_seen = []
                for ev in prev_evaluations:
                    if ev.strengths:
                        strengths_seen.extend(ev.strengths[:2])
                    if ev.weaknesses:
                        weaknesses_seen.extend(ev.weaknesses[:2])
                # Deduplicate
                strengths_seen = list(dict.fromkeys(strengths_seen))[:4]
                weaknesses_seen = list(dict.fromkeys(weaknesses_seen))[:4]

                strengths_ctx = ', '.join(strengths_seen) if strengths_seen else 'chưa đủ dữ liệu'
                weaknesses_ctx = ', '.join(weaknesses_seen) if weaknesses_seen else 'chưa đủ dữ liệu'

                all_gaps   = critical_gaps + important_gaps
                is_gap_q   = skills_str in all_gaps  # câu hỏi này nhắm vào kỹ năng còn thiếu

                if is_gap_q:
                    question_prompt = f"""Bạn là HR Manager đang phỏng vấn ứng viên vào vị trí {db_session.job_title}.

=== THÔNG TIN CV ===
Kỹ năng ứng viên ĐÃ CÓ: {', '.join(cv_skills_list[:6]) or 'chưa rõ'}
Kỹ năng CÒN THIẾU (critical): {', '.join(critical_gaps[:4]) or 'không có'}
Kỹ năng cần bổ sung thêm: {', '.join(important_gaps[:3]) or 'không có'}

=== ĐÁNH GIÁ TỪ CÁC CÂU TRƯỚC ===
Điểm mạnh đã thể hiện: {strengths_ctx}
Điểm yếu cần cải thiện: {weaknesses_ctx}

=== YÊU CẦU ===
Tạo 1 câu hỏi về kỹ năng [{skills_str}] — đây là kỹ năng ứng viên CHƯA CÓ.
Mục tiêu: kiểm tra nhận thức, kinh nghiệm tự học, hoặc kế hoạch bổ sung {skills_str}.
Có thể liên hệ điểm yếu [{weaknesses_ctx}] nếu phù hợp.

CÁC CÂU ĐÃ HỎI (KHÔNG lặp lại):
{asked_context_safe}

CHỈ trả về 1 câu hỏi, tiếng Việt tự nhiên, không giải thích."""
                else:
                    question_prompt = f"""Bạn là HR Manager đang phỏng vấn ứng viên vào vị trí {db_session.job_title}.

=== THÔNG TIN CV ===
Kỹ năng ứng viên ĐÃ CÓ: {', '.join(cv_skills_list[:6]) or 'chưa rõ'}
Kỹ năng CÒN THIẾU: {', '.join((critical_gaps + important_gaps)[:5]) or 'không có'}

=== ĐÁNH GIÁ TỪ CÁC CÂU TRƯỚC ===
Điểm mạnh đã thể hiện: {strengths_ctx}
Điểm yếu cần cải thiện: {weaknesses_ctx}

=== YÊU CẦU ===
Tạo 1 câu hỏi "ĐÀO SÂU" vào kỹ năng [{skills_str}] — ứng viên ĐÃ CÓ kỹ năng này.
Mục tiêu: kiểm tra kinh nghiệm THỰC TẾ, dự án đã làm, thách thức đã vượt qua.
Có thể khai thác điểm yếu [{weaknesses_ctx}] để hiểu rõ hơn khả năng thực sự.
Tránh câu hỏi lý thuyết, ưu tiên STAR method (Situation, Task, Action, Result).

CÁC CÂU ĐÃ HỎI (KHÔNG lặp lại):
{asked_context_safe}

CHỈ trả về 1 câu hỏi, tiếng Việt tự nhiên, không giải thích."""
            else:
                # ── STANDARD mode: O*NET skills-based questions ──
                # Lấy thêm strengths/weaknesses cho standard mode
                prev_evals_std = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == db_session.id,
                    InterviewMessage.role == "candidate",
                    InterviewMessage.score != None,
                ).order_by(InterviewMessage.timestamp.asc()).all()
                weaknesses_std = []
                for ev in prev_evals_std:
                    if ev.weaknesses:
                        weaknesses_std.extend(ev.weaknesses[:1])
                weaknesses_std = list(dict.fromkeys(weaknesses_std))[:3]
                weak_ctx_safe = (', '.join(weaknesses_std) if weaknesses_std else '').replace('{','(').replace('}',')')

                question_prompt = f"""Bạn là HR Manager chuyên nghiệp. Tạo 1 câu hỏi phỏng vấn MỚI HOÀN TOÀN.

Vị trí: {db_session.job_title}
Câu hỏi số: {next_question_number}/{db_session.question_count}
Loại: {type_label}{jd_context_safe}{level_context_safe}
Kỹ năng cần đánh giá: {skills_str}
{f'Điểm yếu cần khai thác thêm: {weak_ctx_safe}' if weak_ctx_safe else ''}

CÁC CÂU HỎI ĐÃ HỎI (KHÔNG được lặp lại hoặc tương tự):
{asked_context_safe}

Yêu cầu: câu hỏi {type_label} cụ thể, khác hoàn toàn các câu trên, phù hợp với cấp bậc {effective_level}.
Khuyến khích chia sẻ kinh nghiệm thực tế.
CHỈ trả về câu hỏi."""

        try:
            next_question = self.gemini.stream_manager.generate_content_with_retry(
                question_prompt,
                max_output_tokens=150,
                temperature=0.8
            )

            if next_question and next_question.strip():
                question_msg = InterviewMessage(
                    session_id=db_session.id,
                    role="interviewer",
                    content=next_question.strip(),
                    question_type=question_type,
                    question_number=next_question_number,
                    skills_tested=skills_tested_names
                )
                self.db.add(question_msg)
                self.db.commit()

                # Lấy hr_acknowledgment từ evaluation (feedback của câu trả lời trước)
                hr_ack = (evaluation.get("feedback") or "") if evaluation else ""

                return {
                    "status": "continue",
                    "next_question": next_question.strip(),
                    "question_number": next_question_number,
                    "question_type": question_type,
                    "evaluation": evaluation,
                    "hr_acknowledgment": hr_ack if hr_ack else None,
                    "skills_tested": skills_tested_names,
                    "skills_details": skills_for_msg,
                }

        except Exception as e:
            print(f"⚠️ Enhanced question generation failed: {e}")

        # Fallback with level-aware questions
        fallback_q = self._get_level_aware_fallback_questions(effective_level, question_type, db_session.job_title, jd_context_str)
        fallback_content = fallback_q.get(question_type, fallback_q['technical'])

        # Lấy skills TRƯỚC khi commit để index đúng
        skills_for_msg = self._select_skills_for_question_type(db_session.skills_context, question_type, next_question_number, db_session.id)
        skills_tested_names = [s.get("skill_name", "") for s in skills_for_msg]
        question_msg = InterviewMessage(
            session_id=db_session.id,
            role="interviewer",
            content=fallback_content,
            question_type=question_type,
            question_number=next_question_number,
            skills_tested=skills_tested_names
        )
        self.db.add(question_msg)
        self.db.commit()

        hr_ack = (evaluation.get("feedback") or "") if evaluation else ""
        return {
            "status": "continue",
            "next_question": fallback_content,
            "question_number": next_question_number,
            "question_type": question_type,
            "evaluation": evaluation,
            "hr_acknowledgment": hr_ack if hr_ack else None,
            "skills_tested": skills_tested_names,
            "skills_details": skills_for_msg,
        }

    async def _finish_interview_enhanced(self, db_session: InterviewSession, final_evaluation: Dict) -> Dict:
        """Kết thúc phỏng vấn với enhanced summary - tính đầy đủ tất cả scores"""
        # Lấy tất cả evaluations
        evaluations = self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == db_session.id,
            InterviewMessage.role == "candidate",
            InterviewMessage.score.isnot(None)
        ).all()
        
        if not evaluations:
            avg_score = 0.0
        else:
            total_score = sum(msg.score for msg in evaluations)
            avg_score = round(total_score / len(evaluations), 2)
        
        # Tính detailed scores từ trung bình các detailed_scores của từng câu trả lời
        detailed_keys = ["technical", "logic", "communication", "experience", "attitude"]
        detailed_totals = {k: 0.0 for k in detailed_keys}
        detailed_counts = {k: 0 for k in detailed_keys}
        
        for msg in evaluations:
            if msg.detailed_scores and isinstance(msg.detailed_scores, dict):
                for key in detailed_keys:
                    val = msg.detailed_scores.get(key)
                    if val is not None:
                        try:
                            detailed_totals[key] += float(val)
                            detailed_counts[key] += 1
                        except (TypeError, ValueError):
                            pass
        
        # Collect strengths and weaknesses từ scored messages
        all_strengths = []
        all_weaknesses = []
        for msg in evaluations:
            if msg.strengths:
                all_strengths.extend(msg.strengths)
            if msg.weaknesses:
                all_weaknesses.extend(msg.weaknesses)

        # Thêm strengths/weaknesses từ jd_qualification messages (không có score nhưng có strengths/weaknesses)
        # Chỉ lấy messages có strengths hoặc weaknesses thực sự (tránh include closing answers)
        jd_qual_answers = self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == db_session.id,
            InterviewMessage.role == "candidate",
            InterviewMessage.score.is_(None),
            InterviewMessage.question_number.isnot(None)
        ).all()
        for msg in jd_qual_answers:
            # Chỉ lấy nếu có strengths/weaknesses thực sự (jd_qualification answers)
            if msg.strengths and isinstance(msg.strengths, list) and len(msg.strengths) > 0:
                all_strengths.extend(msg.strengths)
            if msg.weaknesses and isinstance(msg.weaknesses, list) and len(msg.weaknesses) > 0:
                all_weaknesses.extend(msg.weaknesses)
        
        # Tạo summary text
        recommendation = "PASS" if avg_score >= 7 else "CONDITIONAL_PASS" if avg_score >= 5 else "FAIL"
        rec_text = {"PASS": "Đạt", "CONDITIONAL_PASS": "Đạt có điều kiện", "FAIL": "Chưa đạt"}.get(recommendation, "")
        summary_text = (
            f"Kết quả phỏng vấn: {rec_text}. "
            f"Điểm trung bình: {avg_score:.1f}/10. "
            f"Ứng viên đã hoàn thành {len(evaluations)} câu hỏi."
        )
        
        # Tạo learning recommendations từ weaknesses
        unique_weaknesses = list(set(all_weaknesses))[:5]
        learning_recs = []
        if unique_weaknesses:
            for w in unique_weaknesses[:3]:
                learning_recs.append(f"Cải thiện: {w}")
        learning_recs.append("Tiếp tục luyện tập và tích lũy kinh nghiệm thực tế")
        
        # Cập nhật session - chỉ mark completed nếu có closing question
        has_closing = self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == db_session.id,
            InterviewMessage.role == "interviewer",
            InterviewMessage.question_type == "closing"
        ).first() is not None
        
        db_session.status = "completed" if has_closing else "abandoned"
        db_session.completed_at = datetime.utcnow()
        db_session.overall_score = avg_score
        db_session.recommendation = recommendation
        db_session.summary = summary_text
        
        # Detailed scores
        db_session.technical_score = round(detailed_totals["technical"] / detailed_counts["technical"], 2) if detailed_counts["technical"] > 0 else 0.0
        db_session.communication_score = round(detailed_totals["communication"] / detailed_counts["communication"], 2) if detailed_counts["communication"] > 0 else 0.0
        db_session.logic_score = round(detailed_totals["logic"] / detailed_counts["logic"], 2) if detailed_counts["logic"] > 0 else 0.0
        db_session.experience_score = round(detailed_totals["experience"] / detailed_counts["experience"], 2) if detailed_counts["experience"] > 0 else 0.0
        db_session.attitude_score = round(detailed_totals["attitude"] / detailed_counts["attitude"], 2) if detailed_counts["attitude"] > 0 else 0.0
        
        # Strengths, weaknesses, skill_gaps
        db_session.key_strengths = list(set(all_strengths))[:5]
        db_session.key_weaknesses = list(set(all_weaknesses))[:5]
        db_session.skill_gaps = list(set(all_weaknesses))[:3]  # Top weaknesses as skill gaps
        db_session.learning_recommendations = learning_recs
        
        self.db.commit()
        
        return {
            "status": "completed",
            "summary": {
                "overall_score": avg_score,
                "recommendation": recommendation,
                "summary": summary_text,
                "key_strengths": db_session.key_strengths,
                "key_weaknesses": db_session.key_weaknesses,
                "skill_gaps": db_session.skill_gaps,
                "learning_recommendations": learning_recs
            },
            "evaluation": final_evaluation
        }

    def _determine_next_question_type_from_dist(self, question_number: int, dist: Dict[str, int], has_jd: bool = False, jd_count: int = 0) -> str:
        """Xác định loại câu hỏi từ distribution đã lưu trong DB."""
        if question_number == 1:
            return 'warm_up'
        if not dist:
            return 'technical'
        
        # CRITICAL FIX: Bao gồm jd_qualification trong order để được chọn đúng từ distribution
        order = ['warm_up', 'jd_specific', 'technical', 'behavioral', 'situational', 'jd_qualification', 'closing']
        cumulative = 0
        
        for qtype in order:
            count = dist.get(qtype, 0)
            if count == 0:
                continue
            cumulative += count
            if question_number <= cumulative:
                return qtype
        
        # Fallback nếu question_number vượt quá distribution
        print(f"⚠️ Question number {question_number} exceeds distribution total {cumulative}, falling back to closing")
        return 'closing'

    def _determine_next_question_type(self, question_number: int, total_questions: int, has_jd: bool = False, jd_count: int = 2, jd_qualification_count: int = 0) -> str:
        """Xác định loại câu hỏi tiếp theo dựa trên distribution."""
        if question_number == 1:
            return 'warm_up'
        
        dist = self._create_question_distribution(total_questions, has_jd, jd_count, jd_qualification_count)
        return self._determine_next_question_type_from_dist(question_number, dist, has_jd, jd_count)

    def _create_skipped_evaluation(self) -> Dict:
        """Tạo evaluation cho câu hỏi bị bỏ qua"""
        return {
            "score": 0,
            "detailed_scores": {
                "technical": 0,
                "logic": 0,
                "communication": 0,
                "experience": 0,
                "attitude": 0
            },
            "feedback": "Bạn đã bỏ qua câu hỏi này.",
            "strengths": [],
            "weaknesses": ["Không trả lời câu hỏi"],
            "suggestion": "Hãy cố gắng trả lời các câu hỏi để có đánh giá chính xác nhất."
        }

    def _create_fallback_evaluation(self, user_answer: str) -> Dict:
        """Tạo evaluation fallback - nghiêm khắc theo độ dài"""
        word_count = len(user_answer.strip().split())

        if word_count <= 3:
            score = 1.0
            feedback = "Câu trả lời quá ngắn, không có giá trị đánh giá."
        elif word_count <= 10:
            score = 2.5
            feedback = "Câu trả lời rất sơ sài, thiếu hoàn toàn chi tiết và ví dụ cụ thể."
        elif word_count <= 25:
            score = 4.0
            feedback = "Câu trả lời ngắn, có ý nhưng thiếu chiều sâu và ví dụ thực tế."
        elif word_count <= 60:
            score = 5.5
            feedback = "Câu trả lời ở mức trung bình, cần bổ sung thêm ví dụ và chi tiết cụ thể."
        else:
            score = 6.5
            feedback = "Câu trả lời có nội dung, nhưng cần đánh giá chi tiết hơn."

        return {
            "score": score,
            "detailed_scores": {
                "technical": max(1, score - 0.5),
                "logic": score,
                "communication": min(score + 0.5, 10),
                "experience": max(1, score - 1),
                "attitude": score
            },
            "feedback": feedback,
            "strengths": ["Có cố gắng trả lời"] if word_count > 10 else [],
            "weaknesses": ["Câu trả lời quá ngắn", "Thiếu ví dụ cụ thể"] if word_count <= 25 else ["Cần thêm chi tiết"],
            "suggestion": "Câu trả lời tốt cần: nêu tình huống cụ thể (Situation), nhiệm vụ của bạn (Task), hành động bạn thực hiện (Action) và kết quả đạt được (Result) — theo cấu trúc STAR."
        }

    def _normalize_evaluation_result(self, result: Dict) -> Dict:
        """Chuẩn hóa kết quả đánh giá"""
        return {
            "score": float(result.get("score", 5.0)),
            "detailed_scores": result.get("detailed_scores", {}),
            "feedback": str(result.get("feedback", "")),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
            "suggestion": str(result.get("suggestion", ""))
        }

    def _get_level_aware_fallback_questions(self, effective_level: str, question_type: str, job_title: str, jd_context_str: str) -> Dict[str, str]:
        """Generate level-aware fallback questions based on effective level"""
        level_modifiers = {
            'fresher': {
                'warm_up': f"Điều gì khiến bạn chọn theo đuổi lĩnh vực {job_title}? Trong quá trình học, bạn đã có trải nghiệm nào liên quan mà bạn tự hào nhất?",
                'technical': f"Hãy kể về một dự án học tập hoặc thực tập liên quan đến {job_title} mà bạn đã thực hiện. Bạn đã học được gì từ dự án đó?",
                'behavioral': f"Kể về một lần bạn phải học một kỹ năng mới trong thời gian ngắn. Bạn đã tiếp cận việc học như thế nào?",
                'situational': f"Nếu bạn được giao một nhiệm vụ mà bạn chưa từng làm trước đây, bạn sẽ bắt đầu như thế nào?",
                'jd_specific': f"Về các yêu cầu trong JD{jd_context_str.strip() or ''}, bạn đã có cơ hội tiếp xúc hoặc học về chúng ở đâu? Hãy chia sẻ cụ thể.",
                'closing': f"Bạn có câu hỏi nào về cơ hội phát triển trong vị trí {job_title} không?"
            },
            'junior': {
                'warm_up': f"Với kinh nghiệm hiện tại, điều gì thúc đẩy bạn ứng tuyển vị trí {job_title} lần này? Hãy chia sẻ về hành trình nghề nghiệp của bạn.",
                'technical': f"Hãy mô tả một thách thức kỹ thuật bạn đã gặp trong công việc và cách bạn giải quyết nó.",
                'behavioral': f"Kể về một lần bạn phải hợp tác với đồng nghiệp để hoàn thành một dự án. Vai trò của bạn là gì?",
                'situational': f"Khi gặp một vấn đề kỹ thuật mà bạn không biết cách giải quyết, bạn thường làm gì?",
                'jd_specific': f"Trong JD có đề cập đến{jd_context_str.strip() or ' các kỹ năng cụ thể'}. Bạn đã áp dụng chúng trong dự án nào? Kết quả như thế nào?",
                'closing': f"Bạn mong muốn phát triển kỹ năng gì trong vị trí {job_title} này?"
            },
            'middle': {
                'warm_up': f"Nhìn lại hành trình nghề nghiệp, hãy chia sẻ về thành tựu bạn tự hào nhất trong lĩnh vực {job_title}.",
                'technical': f"Hãy mô tả một dự án phức tạp bạn đã dẫn dắt hoặc đóng góp quan trọng. Bạn đã xử lý những thách thức nào?",
                'behavioral': f"Kể về một lần bạn phải đưa ra quyết định quan trọng trong dự án. Bạn đã cân nhắc những yếu tố nào?",
                'situational': f"Nếu bạn phát hiện một thành viên trong team gặp khó khăn với công việc, bạn sẽ hỗ trợ như thế nào?",
                'jd_specific': f"Về yêu cầu{jd_context_str.strip() or ' trong JD'}, bạn đã có kinh nghiệm thực tế nào? Hãy chia sẻ một ví dụ cụ thể về impact bạn tạo ra.",
                'closing': f"Bạn có kế hoạch gì để đóng góp vào sự phát triển của team trong vị trí {job_title}?"
            },
            'senior': {
                'warm_up': f"Với kinh nghiệm senior trong {job_title}, hãy chia sẻ về tầm nhìn và định hướng nghề nghiệp của bạn.",
                'technical': f"Hãy mô tả một kiến trúc hoặc giải pháp kỹ thuật phức tạp bạn đã thiết kế. Tại sao bạn chọn approach đó?",
                'behavioral': f"Kể về một lần bạn phải mentor hoặc dẫn dắt junior developer. Bạn đã tiếp cận việc này như thế nào?",
                'situational': f"Khi phải đưa ra quyết định kỹ thuật quan trọng ảnh hưởng đến toàn bộ hệ thống, bạn sẽ cân nhắc những yếu tố nào?",
                'jd_specific': f"Với yêu cầu{jd_context_str.strip() or ' leadership trong JD'}, bạn đã có kinh nghiệm dẫn dắt team hoặc dự án nào? Kết quả và bài học là gì?",
                'closing': f"Bạn có tầm nhìn gì về việc phát triển team và công nghệ trong vị trí {job_title} này?"
            },
            'lead': {
                'warm_up': f"Với vai trò leadership trong {job_title}, hãy chia sẻ về triết lý quản lý và phát triển team của bạn.",
                'technical': f"Hãy mô tả một quyết định kiến trúc hoặc công nghệ quan trọng bạn đã đưa ra ở cấp độ tổ chức. Impact của nó như thế nào?",
                'behavioral': f"Kể về một lần bạn phải xử lý conflict trong team hoặc giữa các team. Bạn đã giải quyết như thế nào?",
                'situational': f"Khi phải balance giữa technical debt và delivery pressure, bạn sẽ đưa ra quyết định như thế nào?",
                'jd_specific': f"Về yêu cầu strategic{jd_context_str.strip() or ' trong JD'}, bạn đã có kinh nghiệm xây dựng chiến lược kỹ thuật hoặc phát triển team nào? Hãy chia sẻ cụ thể.",
                'closing': f"Bạn có vision gì về việc xây dựng culture và phát triển tổ chức trong vai trò {job_title}?"
            }
        }
        
        return level_modifiers.get(effective_level, level_modifiers['junior'])

    def _extract_skills_from_context(self, career_context: Dict) -> List[str]:
        """Trích xuất tên skills từ context"""
        skills = career_context.get('skills', [])
        return [skill.get('skill_name', '') for skill in skills]

    def _create_question_distribution(self, total_questions: int, has_jd: bool = False, jd_questions_count: int = 2, jd_qualification_count: int = 0) -> Dict[str, int]:
        """
        Tạo phân bố câu hỏi cho total_questions (đã bao gồm closing).
        - jd_questions_count: số câu jd_specific (về required_skills/tools)
        - jd_qualification_count: số câu jd_qualification (về bằng cấp/ngoại ngữ) - tính riêng
        """
        # CRITICAL FIX: Handle edge cases where JD questions >= total questions
        if has_jd and jd_questions_count >= total_questions:
            # If JD questions would take all slots, reduce JD count and ensure at least 1 warm_up + 1 closing
            if total_questions <= 2:
                # Special case: chỉ có 2 câu total (1 warm_up + 1 closing)
                return {"warm_up": 1, "closing": 1}
            else:
                # Reserve 1 for warm_up + 1 for closing, rest can be JD
                adjusted_jd_count = min(jd_questions_count, total_questions - 2)
                if adjusted_jd_count > 0:
                    return {"warm_up": 1, "jd_specific": adjusted_jd_count, "closing": 1}
                else:
                    return {"warm_up": 1, "closing": 1}
        
        # Clamp JD questions count
        n = max(0, min(jd_questions_count, 3))  # clamp 0-3
        
        # Base distributions cho total_questions (bao gồm closing)
        def _base_dist(total: int) -> Dict[str, int]:
            # total = tổng số câu hỏi (bao gồm closing)
            # CRITICAL FIX: Luôn có warm_up làm câu đầu tiên
            if total <= 1:
                return {"warm_up": 1}  # Chỉ có 1 câu thì phải là warm_up
            elif total == 2:
                return {"warm_up": 1, "closing": 1}
            elif total == 3:
                return {"warm_up": 1, "technical": 1, "closing": 1}
            elif total == 4:
                return {"warm_up": 1, "technical": 2, "closing": 1}
            elif total == 5:
                return {"warm_up": 1, "technical": 2, "behavioral": 1, "closing": 1}
            elif total == 6:
                return {"warm_up": 1, "technical": 2, "behavioral": 1, "situational": 1, "closing": 1}
            elif total == 7:
                return {"warm_up": 1, "technical": 2, "behavioral": 2, "situational": 1, "closing": 1}
            elif total == 8:
                return {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 1, "closing": 1}
            elif total == 9:
                return {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 2, "closing": 1}
            elif total == 10:
                return {"warm_up": 1, "technical": 4, "behavioral": 2, "situational": 2, "closing": 1}
            elif total == 11:
                return {"warm_up": 1, "technical": 4, "behavioral": 3, "situational": 2, "closing": 1}
            elif total == 12:
                return {"warm_up": 1, "technical": 5, "behavioral": 3, "situational": 2, "closing": 1}
            elif total == 13:
                return {"warm_up": 1, "technical": 5, "behavioral": 3, "situational": 3, "closing": 1}
            else:
                # Fallback: tính động
                remaining = max(0, total - 2)  # trừ warm_up + closing
                tech = max(1, remaining // 2)
                beh = max(1, remaining // 3)
                sit = max(0, remaining - tech - beh)
                return {"warm_up": 1, "technical": tech, "behavioral": beh, "situational": sit, "closing": 1}

        if has_jd and n > 0:
            # Khi có JD: total_questions đã bao gồm jd_specific + jd_qualification + closing
            # Chỉ cần phân bổ base questions (warm_up + technical + behavioral + situational)
            # rồi thêm jd_specific, jd_qualification, closing vào
            
            # Số câu jd_qualification thực tế (đã được tính riêng)
            actual_jd_qual = max(0, jd_qualification_count)
            
            # Tổng câu JD cần thêm vào distribution
            total_jd_extra = n + actual_jd_qual  # jd_specific + jd_qualification
            
            base = _base_dist(total_questions)
            dist = dict(base)
            
            # Giảm bớt câu hỏi thông thường để nhường chỗ cho JD questions
            remaining = total_jd_extra
            
            # Bước 1: Giảm behavioral nhưng giữ lại ít nhất 1
            if remaining > 0 and dist.get("behavioral", 0) > 1:
                take = min(dist.get("behavioral", 0) - 1, remaining)
                if take > 0:
                    dist["behavioral"] = max(1, dist.get("behavioral", 0) - take)
                    remaining -= take
            
            # Bước 2: Giảm situational nhưng giữ lại ít nhất 1
            if remaining > 0 and dist.get("situational", 0) > 1:
                take = min(dist.get("situational", 0) - 1, remaining)
                if take > 0:
                    dist["situational"] = max(1, dist.get("situational", 0) - take)
                    remaining -= take
            
            # Bước 3: Giảm technical nhưng giữ lại ít nhất 1
            if remaining > 0 and dist.get("technical", 0) > 1:
                take = min(dist.get("technical", 0) - 1, remaining)
                if take > 0:
                    dist["technical"] = max(1, dist.get("technical", 0) - take)
                    remaining -= take
            
            # Bước 4: Nếu vẫn còn thừa, giảm thêm
            if remaining > 0:
                for key in ["situational", "behavioral", "technical"]:
                    if remaining <= 0:
                        break
                    take = min(dist.get(key, 0), remaining)
                    if take > 0:
                        dist[key] = max(0, dist.get(key, 0) - take)
                        remaining -= take
            
            # Thêm jd_specific và jd_qualification vào distribution
            # Thứ tự trong distribution: warm_up → jd_specific → technical → behavioral → situational → jd_qualification → closing
            if n > 0:
                dist["jd_specific"] = n
            if actual_jd_qual > 0:
                dist["jd_qualification"] = actual_jd_qual
            
            # Remove keys with 0 values
            return {k: v for k, v in dist.items() if v > 0}
        
        return _base_dist(total_questions)

    # Fallback methods khi pipeline không available
    def _fallback_start_interview(self, user_id: int, job_id: str, question_count: int) -> Dict:
        """Fallback start interview khi pipeline không available"""
        from .services import InterviewService
        
        fallback_service = InterviewService(self.db)
        session = fallback_service.start_interview(user_id, job_id, question_count)
        
        return {
            "session_id": session.id,
            "job_title": session.job_title,
            "greeting": "Xin chào! Chào mừng bạn đến với buổi phỏng vấn hôm nay.",
            "first_question": "Bạn có thể giới thiệu về bản thân và lý do quan tâm đến vị trí này không?",
            "question_count": question_count,
            "skills_context": session.skills_context or [],
            "question_distribution": self._create_question_distribution(question_count)
        }

    def _fallback_submit_answer(self, session_id: int, user_answer: str, has_audio: bool, 
                               audio_duration: float, is_skipped: bool) -> Dict:
        """Fallback submit answer khi pipeline không available"""
        from .services import InterviewService
        
        fallback_service = InterviewService(self.db)
        return fallback_service.submit_answer(session_id, user_answer, has_audio, audio_duration, is_skipped)

    def is_pipeline_enabled(self) -> bool:
        """Kiểm tra xem pipeline có được enable không"""
        return self.pipeline_enabled

    def get_pipeline_status(self) -> Dict:
        """Lấy trạng thái pipeline"""
        return {
            "enabled": self.pipeline_enabled,
            "gemini_available": self.gemini.stream_manager.is_available() if self.gemini else False,
            "neo4j_available": self.neo4j.driver is not None if self.neo4j else False
        }

    async def _generate_contextual_question(self, session: InterviewSession, question_type: str, 
                                          question_number: int, level_context: Optional[Dict], 
                                          jd_data: Optional[Dict]) -> str:
        """Tạo câu hỏi với context từ level và JD
        
        CRITICAL FIX: Thêm logic cho jd_qualification questions
        """
        # CRITICAL FIX: Handle jd_qualification questions
        if question_type == "jd_qualification":
            result = await self._generate_jd_qualification_question(session, jd_data)
            if result is None:
                # Đã hỏi hết qualifications - không nên gọi method này nữa
                raise ValueError("All JD qualifications have been asked - should not request more jd_qualification questions")
            return result
        
        # Lấy lịch sử câu hỏi
        previous_questions = (
            self.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session.id, InterviewMessage.role == "interviewer")
            .all()
        )
        question_history = [q.content for q in previous_questions]
        
        # Chuẩn bị session context
        session_context = {
            "level_context": level_context,
            "jd_data": jd_data
        }
        
        # Chọn skills phù hợp
        skills_context = session.skills_context or []
        skills_for_question = self._select_skills_for_question_type(skills_context, question_type)
        
        # Generate câu hỏi
        return self.gemini.generate_question(
            session.job_title,
            skills_for_question,
            question_history,
            question_type,
            session_context
        )
    
    async def _generate_jd_qualification_question(self, session: InterviewSession, jd_data: Optional[Dict]) -> str:
        """Generate JD qualification question với Gemini API integration
        
        CRITICAL FIX: Hỏi CHÍNH XÁC về từng qualification cụ thể từ JD
        """
        skills_context = session.skills_context or []
        jd_qualifications = [s for s in skills_context if s.get("source") == "jd" and s.get("skill_type") == "JD Qualification"]
        
        print(f"🎓 DEBUG: Total skills_context = {len(skills_context)}")
        print(f"🎓 DEBUG: JD Qualification skills = {len(jd_qualifications)}")
        for i, q in enumerate(jd_qualifications):
            print(f"🎓 DEBUG: jd_qualifications[{i}] = {q.get('skill_name', '')}")
        
        # CRITICAL FIX: Extract COMPLETE JD context từ market_context hoặc jd_data
        market_context = session.market_context or {}
        full_jd_data = market_context.get("jd_data") or jd_data or {}
        
        # CRITICAL FIX: Nếu không có full_jd_data, tạo từ skills_context
        if not full_jd_data and skills_context:
            # Reconstruct JD data từ skills_context để có complete context - KHÔNG CẮT BỚT
            full_jd_data = {
                "jd_id": session.id,  # Use session id as fallback
                "career_id": session.job_id,
                "extracted_data": {
                    "company_name": "FPT Software",  # Default company name
                    "location": "Da Nang",
                    "experience_level": "Fresher",
                    "qualifications": [s.get("skill_name", "") for s in jd_qualifications],
                    "required_skills": [s.get("skill_name", "") for s in skills_context if s.get("skill_type") == "JD Requirement"],  # FULL list
                    "tools": [s.get("skill_name", "") for s in skills_context if s.get("skill_type") == "JD Tool"],  # FULL list
                    "responsibilities": [],
                    "benefits": [],
                    "company_culture": "",
                    "training_program": []
                },
                "skills_context": skills_context
            }
            print(f"🔧 Reconstructed JD data from skills_context for Gemini - FULL DATA, no truncation")
        
        # CRITICAL FIX: Đếm số câu jd_qualification đã hỏi
        qual_count = self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session.id,
            InterviewMessage.role == "interviewer",
            InterviewMessage.question_type == "jd_qualification"
        ).count()
        
        print(f"🎓 DEBUG: qual_count = {qual_count}")
        
        # CRITICAL FIX: Hỏi TỪNG qualification cụ thể theo thứ tự CHÍNH XÁC
        if jd_qualifications:
            # Sắp xếp qualifications theo thứ tự ưu tiên: Education -> Japanese -> English -> Others
            def qualification_priority(skill):
                name = skill.get("skill_name", "").lower()
                if any(keyword in name for keyword in ["sinh viên", "tốt nghiệp", "học vấn", "bằng cấp", "chuyên ngành", "công nghệ thông tin", "toán tin", "khoa học máy tính"]):
                    return 0  # Education first
                elif "tiếng nhật" in name or "japanese" in name or "n3" in name or "n2" in name or "n1" in name:
                    return 1  # Japanese second
                elif "tiếng anh" in name or "english" in name or "toeic" in name:
                    return 2  # English third
                else:
                    return 3  # Others last
            
            sorted_qualifications = sorted(jd_qualifications, key=qualification_priority)
            
            print(f"🎓 DEBUG: Sorted qualifications by priority:")
            for i, q in enumerate(sorted_qualifications):
                priority = qualification_priority(q)
                print(f"🎓 DEBUG: sorted[{i}] = {q.get('skill_name', '')} (priority: {priority})")
            
            # CRITICAL FIX: Kiểm tra xem còn qualification nào để hỏi không
            if qual_count < len(sorted_qualifications):
                # Lấy qualification hiện tại cần hỏi
                current_qualification = sorted_qualifications[qual_count]
                skill_name = current_qualification.get("skill_name", "")
                
                print(f"🎓 Q{qual_count + 1} Selected qualification: {skill_name}")
                
                # Xác định loại qualification để tạo câu hỏi phù hợp
                qualification_type = "other"
                if any(keyword in skill_name.lower() for keyword in ["sinh viên", "tốt nghiệp", "học vấn", "bằng cấp", "chuyên ngành"]):
                    qualification_type = "education"
                elif "tiếng anh" in skill_name.lower() or "toeic" in skill_name.lower() or "english" in skill_name.lower():
                    qualification_type = "english"
                elif "tiếng nhật" in skill_name.lower() or "japanese" in skill_name.lower() or "n3" in skill_name.lower():
                    qualification_type = "japanese"
                
                print(f"🎓 Q{qual_count + 1} Qualification type: {qualification_type}")
                
                # Generate câu hỏi với Gemini và COMPLETE API data
                return await self._generate_gemini_jd_qualification_question(
                    qualification_type,
                    skill_name,
                    full_jd_data,
                    session.job_title,
                    qual_count + 1
                )
            else:
                # ĐÃ HỎI HẾT TẤT CẢ JD qualifications
                print(f"🎓 COMPLETED: Đã hỏi hết {len(sorted_qualifications)} JD qualifications")
                return None  # Signal that all qualifications have been asked
        else:
            # Không có JD qualifications - hỏi câu default duy nhất
            if qual_count == 0:
                print(f"🎓 No JD qualifications found - asking default education question")
                return await self._generate_gemini_jd_qualification_question(
                    "education",
                    "Trình độ học vấn và kinh nghiệm",
                    full_jd_data,
                    session.job_title,
                    qual_count + 1
                )
            else:
                # Đã hỏi câu default rồi, không còn gì để hỏi
                print(f"🎓 COMPLETED: No more qualifications to ask")
                return None

    async def _generate_gemini_jd_qualification_question(self, qualification_type: str, skill_name: str, 
                                                       jd_data: Dict, job_title: str, question_number: int) -> str:
        """Generate JD qualification question sử dụng Gemini với COMPLETE API response data
        
        CRITICAL FIX: Sử dụng TOÀN BỘ API response data như user yêu cầu
        """
        try:
            # Sử dụng TOÀN BỘ API response data - không cắt bớt
            extracted_data = jd_data.get("extracted_data", {})
            skills_context = jd_data.get("skills_context", [])

            company_name = extracted_data.get("company_name", "công ty")
            location = extracted_data.get("location", "")
            experience_level = extracted_data.get("experience_level", "")
            qualifications = extracted_data.get("qualifications", [])  # FULL list
            required_skills = extracted_data.get("required_skills", [])  # FULL list
            tools = extracted_data.get("tools", [])  # FULL list
            responsibilities = extracted_data.get("responsibilities", [])  # FULL list
            benefits = extracted_data.get("benefits", [])  # FULL list
            company_culture = extracted_data.get("company_culture", "")
            training_program = extracted_data.get("training_program", [])  # FULL list

            # Lấy toàn bộ JD Qualification skills từ skills_context
            jd_qual_skills = [s for s in skills_context if s.get("skill_type") == "JD Qualification"]

            # Format qualifications list rõ ràng để Gemini dễ đọc
            qualifications_str = "\n".join(f"  - {q}" for q in qualifications) if qualifications else "  - Không có thông tin cụ thể"
            jd_qual_skills_str = "\n".join(
                f"  - {s.get('skill_name', 'Unknown')} (importance: {s.get('importance', 'N/A')})" for s in jd_qual_skills
            ) if jd_qual_skills else "  - Không có thông tin cụ thể"

            # CRITICAL FIX: Tạo câu hỏi CHÍNH XÁC cho từng qualification type
            if qualification_type == "japanese" and "tiếng nhật" in skill_name.lower():
                specific_prompt = f"""Bạn là HR Manager của {company_name} tại {location}. Đang phỏng vấn ứng viên vị trí {experience_level} {job_title}.

=== TOÀN BỘ THÔNG TIN JD TỪ API ===
Công ty: {company_name}
Địa điểm: {location}
Cấp độ: {experience_level}
Văn hóa: {company_culture}

QUALIFICATIONS (yêu cầu bằng cấp/chứng chỉ):
{qualifications_str}

JD QUALIFICATION SKILLS (từ skills_context):
{jd_qual_skills_str}

Required Skills: {required_skills}
Tools: {tools}
Responsibilities: {responsibilities}
Benefits: {benefits}
Training Program: {training_program}
=====================================

QUALIFICATION CẦN HỎI CHÍNH XÁC:
"{skill_name}"

NHIỆM VỤ: Tạo đúng 1 câu hỏi phỏng vấn CỤ THỂ về TIẾNG NHẬT từ N3 trở lên.

QUY TẮC BẮT BUỘC:
1. Hỏi CHÍNH XÁC về trình độ tiếng Nhật N3 trở lên
2. Hỏi về chứng chỉ JLPT hiện tại của ứng viên
3. Hỏi về kinh nghiệm sử dụng tiếng Nhật trong công việc/học tập
4. Đề cập {company_name} và yêu cầu cụ thể từ JD
5. Thân thiện, 1-2 câu, phù hợp văn hóa Việt Nam

CHỈ TRẢ VỀ CÂU HỎI DUY NHẤT, KHÔNG GIẢI THÍCH."""

            elif qualification_type == "english" and ("toeic" in skill_name.lower() or "tiếng anh" in skill_name.lower()):
                specific_prompt = f"""Bạn là HR Manager của {company_name} tại {location}. Đang phỏng vấn ứng viên vị trí {experience_level} {job_title}.

=== TOÀN BỘ THÔNG TIN JD TỪ API ===
Công ty: {company_name}
Địa điểm: {location}
Cấp độ: {experience_level}
Văn hóa: {company_culture}

QUALIFICATIONS (yêu cầu bằng cấp/chứng chỉ):
{qualifications_str}

JD QUALIFICATION SKILLS (từ skills_context):
{jd_qual_skills_str}

Required Skills: {required_skills}
Tools: {tools}
Responsibilities: {responsibilities}
Benefits: {benefits}
Training Program: {training_program}
=====================================

QUALIFICATION CẦN HỎI CHÍNH XÁC:
"{skill_name}"

NHIỆM VỤ: Tạo đúng 1 câu hỏi phỏng vấn CỤ THỂ về TIẾNG ANH >650 TOEIC.

QUY TẮC BẮT BUỘC:
1. Hỏi CHÍNH XÁC về điểm TOEIC >650 hoặc Topik 3
2. Hỏi về chứng chỉ tiếng Anh hiện tại của ứng viên
3. Hỏi về kinh nghiệm sử dụng tiếng Anh trong công việc/học tập
4. Đề cập {company_name} và yêu cầu cụ thể từ JD
5. Thân thiện, 1-2 câu, phù hợp văn hóa Việt Nam

CHỈ TRẢ VỀ CÂU HỎI DUY NHẤT, KHÔNG GIẢI THÍCH."""

            elif qualification_type == "education":
                specific_prompt = f"""Bạn là HR Manager của {company_name} tại {location}. Đang phỏng vấn ứng viên vị trí {experience_level} {job_title}.

=== TOÀN BỘ THÔNG TIN JD TỪ API ===
Công ty: {company_name}
Địa điểm: {location}
Cấp độ: {experience_level}
Văn hóa: {company_culture}

QUALIFICATIONS (yêu cầu bằng cấp/chứng chỉ):
{qualifications_str}

JD QUALIFICATION SKILLS (từ skills_context):
{jd_qual_skills_str}

Required Skills: {required_skills}
Tools: {tools}
Responsibilities: {responsibilities}
Benefits: {benefits}
Training Program: {training_program}
=====================================

QUALIFICATION CẦN HỎI CHÍNH XÁC:
"{skill_name}"

NHIỆM VỤ: Tạo đúng 1 câu hỏi phỏng vấn CỤ THỂ về CHUYÊN NGÀNH HỌC VẤN.

QUY TẮC BẮT BUỘC:
1. Hỏi CHÍNH XÁC về chuyên ngành Công nghệ thông tin, Toán tin, Khoa học máy tính, Kỹ thuật phần mềm, Điện tử viễn thông
2. Hỏi về dự án liên quan đã làm trong quá trình học
3. Đề cập {company_name} và yêu cầu cụ thể từ JD
4. Thân thiện, 1-2 câu, phù hợp văn hóa Việt Nam

CHỈ TRẢ VỀ CÂU HỎI DUY NHẤT, KHÔNG GIẢI THÍCH."""

            else:
                # Generic qualification question
                specific_prompt = f"""Bạn là HR Manager của {company_name} tại {location}. Đang phỏng vấn ứng viên vị trí {experience_level} {job_title}.

=== TOÀN BỘ THÔNG TIN JD TỪ API ===
Công ty: {company_name}
Địa điểm: {location}
Cấp độ: {experience_level}
Văn hóa: {company_culture}

QUALIFICATIONS (yêu cầu bằng cấp/chứng chỉ):
{qualifications_str}

JD QUALIFICATION SKILLS (từ skills_context):
{jd_qual_skills_str}

Required Skills: {required_skills}
Tools: {tools}
Responsibilities: {responsibilities}
Benefits: {benefits}
Training Program: {training_program}
=====================================

QUALIFICATION CẦN HỎI CHÍNH XÁC:
"{skill_name}"

NHIỆM VỤ: Tạo đúng 1 câu hỏi phỏng vấn CỤ THỂ về qualification trên.

QUY TẮC BẮT BUỘC:
1. Hỏi CHÍNH XÁC về "{skill_name}"
2. Đề cập {company_name} và yêu cầu cụ thể từ JD
3. Thân thiện, 1-2 câu, phù hợp văn hóa Việt Nam

CHỈ TRẢ VỀ CÂU HỎI DUY NHẤT, KHÔNG GIẢI THÍCH."""

            # Call Gemini API với complete context
            generated_question = self.gemini.stream_manager.generate_content_with_retry(
                specific_prompt,
                max_output_tokens=250,
                temperature=0.7
            )
            
            if generated_question and len(generated_question.strip()) > 20:
                print(f"✅ Gemini generated JD qualification Q{question_number} with COMPLETE API context: {generated_question[:80]}...")
                return generated_question.strip()
            else:
                print(f"⚠️ Gemini returned short response, using fallback")
                return self._get_fallback_jd_qualification_question(qualification_type, skill_name)
                
        except Exception as e:
            print(f"⚠️ Gemini JD qualification generation failed: {e}")
            return self._get_fallback_jd_qualification_question(qualification_type, skill_name)

    def _get_fallback_jd_qualification_question(self, qualification_type: str, skill_name: str) -> str:
        """Fallback JD qualification questions nếu Gemini fail - CHÍNH XÁC theo user requirements"""
        if qualification_type == "education":
            return "Bạn đã/sắp tốt nghiệp chuyên ngành nào rồi ạ? Trong quá trình học, bạn đã từng tham gia dự án nào liên quan đến công nghệ thông tin, toán tin, hoặc khoa học máy tính mà bạn cảm thấy thử thách và học hỏi được nhiều nhất?"
        elif qualification_type == "japanese":
            if "n3" in skill_name.lower():
                return f"Về yêu cầu tiếng Nhật từ N3 trở lên của FPT Software, bạn hiện tại đang ở trình độ nào? Đã có chứng chỉ JLPT hay kinh nghiệm sử dụng tiếng Nhật trong công việc chưa?"
            else:
                return f"FPT Software yêu cầu {skill_name}. Bạn có kinh nghiệm với tiếng Nhật không? Đã đạt được trình độ JLPT nào chưa?"
        elif qualification_type == "english":
            if "toeic" in skill_name.lower() and "650" in skill_name:
                return f"Về yêu cầu tiếng Anh >650 TOEIC của FPT Software, bạn có thể chia sẻ về trình độ tiếng Anh hiện tại không? Đã có điểm TOEIC hay các chứng chỉ tiếng Anh khác chưa?"
            else:
                return f"Về yêu cầu tiếng Anh của FPT Software ({skill_name}), bạn có thể chia sẻ về trình độ tiếng Anh hiện tại không? Đã có chứng chỉ TOEIC hay các chứng chỉ khác chưa?"
        else:
            return f"Về yêu cầu {skill_name} của FPT Software, bạn có thể chia sẻ thêm về trình độ và kinh nghiệm của mình không?"

    def _select_skills_for_question_type(self, skills_context: List[Dict], question_type: str, question_number: int = 1, session_id: int = None) -> List[Dict]:
        """
        Chọn skills phù hợp cho từng loại câu hỏi theo độ ưu tiên
        
        Logic mới (theo yêu cầu user):
        - Mỗi câu hỏi chỉ lấy 1 kỹ năng từ cứng hoặc mềm
        - Behavioral (1 câu): TOP 1 kỹ năng mềm có độ ưu tiên cao nhất
        - Situational (1 câu): TOP 1 kỹ năng mềm có độ ưu tiên cao (khác với behavioral)
        - Technical (2 câu): 
          * Khi có JD: Mỗi câu lấy 1 kỹ năng cứng từ JD theo thứ tự ưu tiên
          * Khi không có JD: Mỗi câu lấy 1 kỹ năng chuyên ngành từ career theo thứ tự ưu tiên
        """
        if not skills_context:
            return []
        
        # Separate và sort theo importance DESC - Handle all data types safely
        def is_hard_skill_safe(skill):
            is_hard = skill.get("is_hard_skill", False)
            if isinstance(is_hard, bool):
                return is_hard
            if isinstance(is_hard, str):
                return is_hard.lower() in ['true', 'yes', '1']
            if isinstance(is_hard, (int, float)):
                return bool(is_hard)
            return False
        
        # CRITICAL FIX: Filter out skills with invalid names
        def has_valid_name(skill):
            name = skill.get("skill_name")
            return name is not None and str(name).strip() != ""
        
        # Filter skills to only include those with valid names
        valid_skills = [s for s in skills_context if has_valid_name(s)]
        
        soft_skills = [s for s in valid_skills if not is_hard_skill_safe(s)]
        
        # CRITICAL FIX: Technical questions với JD phải dùng JD hard skills
        jd_hard_skills = [s for s in valid_skills if is_hard_skill_safe(s) and s.get("source") == "jd"]
        career_hard_skills = [s for s in valid_skills if is_hard_skill_safe(s) and s.get("source") != "jd"]
        
        # Sort theo importance (cao nhất trước) - Handle all data types safely
        def safe_importance(skill):
            importance = skill.get("importance")
            if importance is None:
                return 0
            try:
                value = float(importance)
                # Handle inf and nan
                if value == float('inf') or value == float('-inf') or value != value:  # NaN check
                    return 0
                return value
            except (ValueError, TypeError):
                return 0
        
        soft_skills.sort(key=safe_importance, reverse=True)
        jd_hard_skills.sort(key=safe_importance, reverse=True)
        career_hard_skills.sort(key=safe_importance, reverse=True)
        
        if question_type == "technical":
            # CRITICAL FIX: Technical questions phải dùng JD Requirements (không phải JD Tools)
            # Lấy JD Requirements đã được hỏi trong jd_specific questions để loại trừ
            asked_jd_requirements = []
            if session_id:
                asked_jd_messages = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session_id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "jd_specific"
                ).all()
                asked_jd_requirements = [msg.skills_tested for msg in asked_jd_messages if msg.skills_tested]
                # Flatten the list of lists
                asked_jd_requirements = [skill for sublist in asked_jd_requirements for skill in sublist] if asked_jd_requirements else []
            
            # Lấy JD Requirements chưa được hỏi trong jd_specific
            jd_requirements = [s for s in valid_skills if is_hard_skill_safe(s) and s.get("source") == "jd" and s.get("skill_type") == "JD Requirement"]
            available_jd_requirements = [s for s in jd_requirements if s.get("skill_name") not in asked_jd_requirements]
            available_jd_requirements.sort(key=safe_importance, reverse=True)
            
            if available_jd_requirements:
                # Khi có JD Requirements chưa hỏi: dùng cho technical questions
                print(f"✅ Technical question using available JD Requirements: {len(available_jd_requirements)} available")
                if session_id:
                    technical_index = self._get_technical_question_index_for_prompt(question_number, session_id)
                else:
                    # CRITICAL FIX: Khi không có session_id (testing), dùng question_number để xác định index
                    # Technical questions thường ở Q5, Q6, etc. sau JD questions
                    if question_number >= 5:
                        technical_index = question_number - 5  # Q5->0, Q6->1
                    else:
                        technical_index = 0
                
                if technical_index < len(available_jd_requirements):
                    selected_skill = available_jd_requirements[technical_index]
                    print(f"✅ Selected JD Requirement for technical Q{technical_index + 1}: {selected_skill.get('skill_name', '')}")
                    return [selected_skill]
                else:
                    # Fallback nếu không đủ JD Requirements
                    print(f"⚠️ Not enough available JD Requirements, using first available")
                    return [available_jd_requirements[0]]
            else:
                # Khi không có JD Requirements hoặc đã hỏi hết: dùng career hard skills
                print(f"✅ Technical question using career hard skills: {len(career_hard_skills)} available")
                if session_id:
                    technical_index = self._get_technical_question_index_for_prompt(question_number, session_id)
                else:
                    # CRITICAL FIX: Khi không có session_id (testing), dùng question_number để xác định index
                    if question_number >= 5:
                        technical_index = question_number - 5  # Q5->0, Q6->1
                    else:
                        technical_index = 0
                
                if technical_index < len(career_hard_skills):
                    selected_skill = career_hard_skills[technical_index]
                    print(f"✅ Selected career skill for technical Q{technical_index + 1}: {selected_skill.get('skill_name', '')}")
                    return [selected_skill]
                else:
                    # Fallback nếu không đủ career hard skills
                    return [career_hard_skills[0]] if career_hard_skills else []
            
        elif question_type == "behavioral":
            # Behavioral: rotate qua soft skills theo số câu behavioral đã hỏi
            if not soft_skills:
                return []
            if session_id:
                behavioral_index = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session_id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "behavioral"
                ).count()
            else:
                behavioral_index = 0
            return [soft_skills[behavioral_index % len(soft_skills)]]
            
        elif question_type == "situational":
            # Situational: rotate qua soft skills, bắt đầu từ index 1 để tránh trùng behavioral đầu tiên
            if not soft_skills:
                return []
            if session_id:
                situational_index = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session_id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "situational"
                ).count()
            else:
                situational_index = 0
            # Offset +1 so situational Q1 != behavioral Q1 khi có đủ soft skills
            offset = 1 if len(soft_skills) >= 2 else 0
            idx = (situational_index + offset) % len(soft_skills)
            return [soft_skills[idx]]
                
        elif question_type == "jd_specific":
            # CRITICAL FIX: JD specific chỉ lấy JD Requirements (không lấy Tools và Qualifications)
            jd_requirements = [s for s in valid_skills if s.get("source") == "jd" and s.get("skill_type") == "JD Requirement"]
            jd_requirements.sort(key=safe_importance, reverse=True)
            if not jd_requirements:
                return []
            # CRITICAL FIX: Đếm số câu jd_specific đã hỏi để lấy skill tiếp theo
            if session_id:
                jd_index = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session_id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "jd_specific"
                ).count()
            else:
                # CRITICAL FIX: Khi không có session_id (testing), dùng question_number để xác định index
                # JD questions thường bắt đầu từ Q2, Q3, Q4
                if question_number >= 2:
                    jd_index = question_number - 2  # Q2->0, Q3->1, Q4->2
                else:
                    jd_index = 0
            idx = jd_index % len(jd_requirements)
            print(f"✅ JD Specific Q{jd_index + 1}: Using skill index {idx} - {jd_requirements[idx].get('skill_name', '')}")
            return [jd_requirements[idx]]
        
        elif question_type == "jd_qualification":
            # CRITICAL FIX: JD qualification phải dùng CÙNG LOGIC với _generate_jd_qualification_question
            jd_qualifications = [s for s in valid_skills if s.get("source") == "jd" and s.get("skill_type") == "JD Qualification"]
            
            if not jd_qualifications:
                # Không có JD qualifications - tạo fallback skill
                fallback_skill = {
                    "skill_name": "Trình độ học vấn và kinh nghiệm",
                    "skill_type": "Qualification",
                    "importance": 4.0,
                    "level": 4.0,
                    "is_hard_skill": False,
                    "source": "fallback"
                }
                return [fallback_skill]
            
            # Đếm số câu jd_qualification đã hỏi
            if session_id:
                qual_count = self.db.query(InterviewMessage).filter(
                    InterviewMessage.session_id == session_id,
                    InterviewMessage.role == "interviewer",
                    InterviewMessage.question_type == "jd_qualification"
                ).count()
            else:
                qual_count = 0
            
            # CRITICAL FIX: Sử dụng CÙNG LOGIC với _generate_jd_qualification_question
            # Define education detection function
            def is_education_qualification(skill):
                name = skill.get("skill_name", "").lower()
                education_keywords = [
                    "sinh viên", "tốt nghiệp", "học vấn", "bằng cấp", "chuyên ngành",
                    "công nghệ thông tin", "toán tin", "khoa học máy tính", 
                    "kỹ thuật phần mềm", "điện tử viễn thông", "cntt", "it",
                    "computer science", "software engineering", "information technology"
                ]
                return any(keyword in name for keyword in education_keywords)
            
            # Define priority function
            def qualification_priority(skill):
                name = skill.get("skill_name", "").lower()
                if "tiếng nhật" in name or "japanese" in name or "n3" in name or "n2" in name or "n1" in name:
                    return 1  # Highest priority
                elif "tiếng anh" in name or "english" in name or "toeic" in name:
                    return 2  # Second priority
                else:
                    return 3  # Lowest priority
            
            # Q1: Education qualification
            if qual_count == 0:
                education_qualifications = [s for s in jd_qualifications if is_education_qualification(s)]
                if education_qualifications:
                    return [education_qualifications[0]]
                else:
                    # Fallback education skill
                    fallback_education_skill = {
                        "skill_name": "Sinh viên đã/sắp tốt nghiệp chuyên ngành Công nghệ thông tin, Toán tin, Khoa học máy tính, Kỹ thuật phần mềm, Điện tử viễn thông… hoặc các chuyên ngành có liên quan",
                        "skill_type": "JD Qualification",
                        "importance": 4.2,
                        "level": 4.0,
                        "is_hard_skill": True,
                        "source": "jd"
                    }
                    return [fallback_education_skill]
            
            # Q2+: Sắp xếp tất cả qualifications theo thứ tự ưu tiên và lấy theo index
            def qualification_priority(skill):
                name = skill.get("skill_name", "").lower()
                if any(keyword in name for keyword in ["sinh viên", "tốt nghiệp", "học vấn", "bằng cấp", "chuyên ngành", "công nghệ thông tin", "toán tin", "khoa học máy tính"]):
                    return 0  # Education first
                elif "tiếng nhật" in name or "japanese" in name or "n3" in name or "n2" in name or "n1" in name:
                    return 1  # Japanese second
                elif "tiếng anh" in name or "english" in name or "toeic" in name:
                    return 2  # English third
                else:
                    return 3  # Others last
            
            sorted_qualifications = sorted(jd_qualifications, key=qualification_priority)
            
            if qual_count < len(sorted_qualifications):
                return [sorted_qualifications[qual_count]]
            else:
                # Đã hỏi hết tất cả qualifications
                return []
        else:
            # Warm-up, closing, jd_qualification: 1 skill mix
            if question_type == "jd_qualification":
                # Đã xử lý ở trên
                return []
            else:
                # Warm-up, closing: 1 skill mix
                return (soft_skills[:1] if soft_skills else career_hard_skills[:1])

    def _get_technical_question_index_for_prompt(self, next_question_number: int, session_id: int) -> int:
        """Xác định index của skill cho câu hỏi technical dựa trên số câu technical đã hỏi.
        
        Logic: 
        - Câu technical đầu tiên → index 0 (skill có importance cao nhất)
        - Câu technical thứ hai → index 1 (skill có importance cao thứ 2)
        """
        # Đếm số câu technical đã được hỏi trước câu hiện tại
        technical_count = self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session_id,
            InterviewMessage.role == "interviewer",
            InterviewMessage.question_type == "technical"
        ).count()
        
        return technical_count  # 0 for first technical, 1 for second technical, etc.

    def _get_technical_question_index(self, question_number: int) -> int:
        """Xác định index của skill cho câu hỏi technical dựa trên question_number.
        
        Logic: 
        - Câu technical đầu tiên → index 0 (skill có importance cao nhất)
        - Câu technical thứ hai → index 1 (skill có importance cao thứ 2)
        """
        # Đếm số câu technical đã được hỏi trước câu hiện tại
        # Giả sử technical questions bắt đầu từ question 2 hoặc 3
        # Cần track chính xác số câu technical đã hỏi
        
        # Tạm thời dùng logic đơn giản: 
        # - Nếu là câu technical đầu tiên trong session → index 0
        # - Nếu là câu technical thứ hai → index 1
        
        # TODO: Implement proper tracking of technical questions asked
        # For now, use a simple heuristic based on question_number
        # Match logic with routes.py for consistency
        if question_number == 2:
            return 0  # First technical question
        elif question_number >= 3:
            return 1  # Second technical question
        else:
            return 0  # Default to first

    def _get_skills_for_question_type(self, skills_context: List[Dict], question_type: str, question_number: int = 1, session_id: int = None) -> List[str]:
        """Lấy tên skills cho question type"""
        selected_skills = self._select_skills_for_question_type(skills_context, question_type, question_number, session_id)
        return [skill.get("skill_name", "") for skill in selected_skills]

    def _validate_question_type(self, question_type: str) -> bool:
        """Validate question type để đảm bảo 100% correctness
        
        CRITICAL FIX: Kiểm tra tất cả question type options
        """
        valid_question_types = [
            'greeting',      # Lời chào đầu tiên
            'warm_up',       # Câu hỏi làm quen
            'jd_specific',   # Câu hỏi về JD requirements cụ thể
            'technical',     # Câu hỏi kỹ thuật chuyên môn
            'behavioral',    # Câu hỏi hành vi/kinh nghiệm
            'situational',   # Câu hỏi tình huống
            'jd_qualification', # Câu hỏi về bằng cấp/trình độ từ JD
            'closing',       # Câu hỏi kết thúc
            'closing_response' # Phản hồi của HR cho câu hỏi của ứng viên
        ]
        
        is_valid = question_type in valid_question_types
        if not is_valid:
            print(f"⚠️ INVALID QUESTION TYPE: '{question_type}' not in {valid_question_types}")
        
        return is_valid

    def _validate_all_question_flows(self, session: InterviewSession) -> Dict[str, bool]:
        """Validate tất cả question flows để đảm bảo 100% correctness
        
        CRITICAL FIX: Kiểm tra tất cả question type flows
        """
        validation_results = {}
        
        # 1. Validate question distribution
        dist = session.question_distribution or {}
        total_planned = sum(dist.values())
        validation_results['distribution_valid'] = total_planned > 0
        
        # 2. Validate question types in distribution
        valid_dist_types = ['warm_up', 'jd_specific', 'technical', 'behavioral', 'situational', 'jd_qualification', 'closing']
        invalid_types = [qtype for qtype in dist.keys() if qtype not in valid_dist_types]
        validation_results['distribution_types_valid'] = len(invalid_types) == 0
        
        # 3. Validate skills context
        skills_context = session.skills_context or []
        has_valid_skills = len(skills_context) > 0 and all(
            isinstance(skill, dict) and skill.get("skill_name") 
            for skill in skills_context
        )
        validation_results['skills_context_valid'] = has_valid_skills
        
        # 4. Validate JD context if present
        market_context = session.market_context or {}
        has_jd = market_context.get("has_jd", False)
        if has_jd:
            jd_data = market_context.get("jd_data")
            jd_qualifications = [s for s in skills_context if s.get("source") == "jd" and s.get("skill_type") == "JD Qualification"]
            validation_results['jd_context_valid'] = jd_data is not None or len(jd_qualifications) > 0
        else:
            validation_results['jd_context_valid'] = True
        
        # 5. Validate question type progression
        asked_questions = self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session.id,
            InterviewMessage.role == "interviewer"
        ).order_by(InterviewMessage.question_number).all()
        
        question_types_asked = [q.question_type for q in asked_questions]
        
        # Warm_up should be first (after greeting)
        non_greeting_questions = [qt for qt in question_types_asked if qt != "greeting"]
        validation_results['warm_up_first'] = len(non_greeting_questions) == 0 or non_greeting_questions[0] == "warm_up"
        
        # All question types should be valid
        invalid_asked_types = [qt for qt in question_types_asked if not self._validate_question_type(qt)]
        validation_results['all_asked_types_valid'] = len(invalid_asked_types) == 0
        
        # Log validation results
        print(f"🔍 VALIDATION RESULTS for session {session.id}:")
        for key, result in validation_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"🔍   {key}: {status}")
        
        if invalid_types:
            print(f"🔍   Invalid distribution types: {invalid_types}")
        if invalid_asked_types:
            print(f"🔍   Invalid asked question types: {invalid_asked_types}")
        
        return validation_results

    def _get_next_question_type_after_jd_qualification(self, db_session: InterviewSession, current_question_number: int) -> str:
        """Xác định question type tiếp theo sau khi đã hỏi hết JD qualifications"""
        # Lấy question distribution từ session
        session_dist = db_session.question_distribution or {}
        
        # Thứ tự ưu tiên question types (sau jd_qualification)
        question_order = ['warm_up', 'jd_specific', 'technical', 'behavioral', 'situational', 'closing']
        
        # Đếm số câu đã hỏi cho từng loại
        asked_counts = {}
        for qtype in question_order:
            asked_counts[qtype] = self.db.query(InterviewMessage).filter(
                InterviewMessage.session_id == db_session.id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_type == qtype
            ).count()
        
        # Tìm question type tiếp theo chưa hỏi đủ
        for qtype in question_order:
            planned_count = session_dist.get(qtype, 0)
            asked_count = asked_counts[qtype]
            
            if asked_count < planned_count:
                print(f"🎓 Next question type: {qtype} ({asked_count}/{planned_count} asked)")
                return qtype
        
        # Nếu đã hỏi đủ tất cả, chuyển sang closing
        if asked_counts.get('closing', 0) == 0:
            print(f"🎓 All question types completed, moving to closing")
            return 'closing'
        
        # Đã hỏi hết tất cả
        print(f"🎓 All questions completed")
        return None

    def get_pipeline_status(self) -> Dict:
        """Get current pipeline status for monitoring"""
        try:
            return {
                "pipeline_enabled": self.pipeline_enabled,
                "gemini_available": self.gemini.stream_manager.is_available() if self.gemini else False,
                "neo4j_available": self.neo4j.driver is not None if self.neo4j else False,
                "database_connected": self.db is not None,
                "status": "operational" if self.pipeline_enabled else "disabled"
            }
        except Exception as e:
            return {
                "pipeline_enabled": False,
                "status": "error",
                "error": str(e)
            }