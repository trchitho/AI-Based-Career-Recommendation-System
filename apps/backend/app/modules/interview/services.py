"""
AI Mock Interview Services
Tích hợp Gemini API, Neo4j và PostgreSQL
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

import google.generativeai as genai
from neo4j import GraphDatabase
from sqlalchemy.orm import Session

from .models import InterviewMessage, InterviewSession

# Cấu hình Gemini API
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)
    else:
        print("⚠️ GEMINI_API_KEY not found in environment variables")
except Exception as e:
    print(f"⚠️ Failed to configure Gemini API: {e}")


class Neo4jService:
    """Service để lấy thông tin từ Neo4j Graph Database"""

    def __init__(self):
        self._uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self._auth = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password123456"))
        self.driver = None
        self._last_connect_attempt = 0
        self._connect_cooldown = 30  # 30 seconds between reconnect attempts
        self._connect()

    def _connect(self):
        import time

        current_time = time.time()

        # Prevent too frequent reconnection attempts
        if current_time - self._last_connect_attempt < self._connect_cooldown:
            return

        self._last_connect_attempt = current_time

        try:
            if self.driver:
                try:
                    self.driver.close()
                except Exception:
                    pass

            # Create new driver with proper configuration
            self.driver = GraphDatabase.driver(
                self._uri,
                auth=self._auth,
                max_connection_lifetime=3600,  # 1 hour
                max_connection_pool_size=50,
                connection_acquisition_timeout=30,
                connection_timeout=30,
            )

            # Test connection
            with self.driver.session() as s:
                s.run("RETURN 1").consume()
            print("✅ Neo4j connection successful")
        except Exception as e:
            print(f"⚠️ Neo4j connection failed: {e}")
            self.driver = None

    def _get_session(self):
        """Get a Neo4j session with proper error handling"""
        try:
            if self.driver is None:
                self._connect()

            if self.driver is None:
                return None

            # Verify driver is still valid
            self.driver.verify_connectivity()
            return self.driver.session()

        except Exception as e:
            print(f"⚠️ Neo4j session error: {e}")
            # Mark driver as invalid and try to reconnect
            self.driver = None
            self._connect()

            if self.driver:
                try:
                    return self.driver.session()
                except Exception:
                    return None
            return None

    def get_job_skills(self, job_id: str, limit: int = 8, use_fallback: bool = True) -> List[Dict]:
        """Lấy top skills quan trọng nhất cho một nghề nghiệp từ Work Activities"""
        if not self.driver:
            print("⚠️ Neo4j driver not available")
            return self._get_fallback_skills(job_id, limit) if use_fallback else []

        try:
            neo4j_session = self._get_session()
            if not neo4j_session:
                print("⚠️ Neo4j session not available")
                return self._get_fallback_skills(job_id, limit) if use_fallback else []

            with neo4j_session as session:
                # Simplified query - just get top skills by importance
                result = session.run(
                    """
                    MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                    WHERE r.importance >= 3.5
                    RETURN s.name as skill_name, 
                           COALESCE(s.type, 'skill') as skill_type,
                           r.importance as importance, 
                           r.level as level,
                           COALESCE(r.activity_rank, 999) as rank,
                           COALESCE(r.combined_score, r.importance) as combined_score
                    ORDER BY r.importance DESC, r.level DESC
                    LIMIT $limit
                """,
                    job_id=job_id,
                    limit=limit,
                )

                skills = []
                for record in result:
                    skills.append(
                        {
                            "skill_name": record["skill_name"],
                            "skill_type": record["skill_type"],
                            "importance": float(record["importance"]) if record["importance"] else 3.0,
                            "level": float(record["level"]) if record["level"] else 3.0,
                            "rank": int(record["rank"]) if record["rank"] else 999,
                            "combined_score": float(record["combined_score"]) if record["combined_score"] else 3.0,
                        }
                    )

                print(f"✅ Neo4j returned {len(skills)} skills for job {job_id}")

                if skills:
                    return skills[:limit]

        except Exception as e:
            print(f"⚠️ Neo4j skills query failed: {e}")
            return self._get_fallback_skills(job_id, limit) if use_fallback else []

        print(f"⚠️ Neo4j returned no skills for job {job_id}")
        return self._get_fallback_skills(job_id, limit) if use_fallback else []

    def _get_fallback_skills(self, job_id: str, limit: int = 8) -> List[Dict]:
        """Fallback skills when Neo4j is not available"""
        # Generic skills based on job type
        fallback_skills = [
            {
                "skill_name": "Problem Solving",
                "skill_type": "skill",
                "importance": 4.5,
                "level": 4.0,
                "rank": 1,
                "combined_score": 4.25,
            },
            {
                "skill_name": "Communication",
                "skill_type": "skill",
                "importance": 4.0,
                "level": 4.0,
                "rank": 2,
                "combined_score": 4.0,
            },
            {"skill_name": "Teamwork", "skill_type": "skill", "importance": 4.0, "level": 3.5, "rank": 3, "combined_score": 3.75},
            {
                "skill_name": "Critical Thinking",
                "skill_type": "skill",
                "importance": 4.2,
                "level": 3.8,
                "rank": 4,
                "combined_score": 4.0,
            },
            {
                "skill_name": "Time Management",
                "skill_type": "skill",
                "importance": 3.8,
                "level": 3.5,
                "rank": 5,
                "combined_score": 3.65,
            },
        ]

        # Add job-specific skills based on job_id
        if "15-1252" in job_id:  # Software Developer
            fallback_skills.extend(
                [
                    {
                        "skill_name": "Programming",
                        "skill_type": "skill",
                        "importance": 5.0,
                        "level": 4.5,
                        "rank": 1,
                        "combined_score": 4.75,
                    },
                    {
                        "skill_name": "Software Development",
                        "skill_type": "skill",
                        "importance": 4.8,
                        "level": 4.2,
                        "rank": 2,
                        "combined_score": 4.5,
                    },
                    {
                        "skill_name": "Database Management",
                        "skill_type": "skill",
                        "importance": 4.0,
                        "level": 3.8,
                        "rank": 3,
                        "combined_score": 3.9,
                    },
                ]
            )

        return fallback_skills[:limit]

    def get_all_job_skills(self, job_id: str) -> List[Dict]:
        """Lấy tất cả skills quan trọng cho một nghề nghiệp (không giới hạn số lượng)"""
        if not self.driver:
            return self._get_fallback_skills(job_id, 20)

        # Query lấy tất cả skills có importance >= 2.5 hoặc level >= 3.5 hoặc có activity_rank
        query = """
        MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
        WHERE (r.activity_rank IS NOT NULL AND r.activity_rank <= 50) 
           OR (r.importance >= 2.5)
           OR (r.level >= 3.5)
        RETURN s.name as skill_name, 
               CASE 
                   WHEN s.type IN ['knowledge', 'ability', 'skill'] THEN 'skill'
                   ELSE 'skill'
               END as skill_type,
               r.importance as importance, 
               r.level as level,
               COALESCE(r.activity_rank, 999) as rank,
               COALESCE(r.combined_score, (r.importance + r.level) / 2) as combined_score
        ORDER BY rank ASC, combined_score DESC
        """

        try:
            session = self._get_session()
            if not session:
                return self._get_fallback_skills(job_id, 20)

            with session as neo4j_session:
                result = neo4j_session.run(query, job_id=job_id)
                skills = [dict(record) for record in result]
                if len(skills) < 5:
                    all_skills_query = """
                    MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                    RETURN s.name as skill_name, 'skill' as skill_type,
                           COALESCE(r.importance, 3.0) as importance, 
                           COALESCE(r.level, 3.0) as level,
                           999 as rank,
                           COALESCE(r.importance, 3.0) as combined_score
                    ORDER BY importance DESC, level DESC
                    """
                    result = neo4j_session.run(all_skills_query, job_id=job_id)
                    skills = [dict(record) for record in result]
                return skills
        except Exception as e:
            print(f"⚠️ Neo4j query failed: {e}")
            return self._get_fallback_skills(job_id, 20)

    def get_job_info(self, job_id: str) -> Optional[Dict]:
        """Lấy thông tin cơ bản về nghề nghiệp"""
        query = "MATCH (j:Job {id: $job_id}) RETURN j.title as title, j.id as id"
        try:
            session = self._get_session()
            if not session:
                return self._get_fallback_job_info(job_id)

            with session as neo4j_session:
                result = neo4j_session.run(query, job_id=job_id)
                record = result.single()
                return dict(record) if record else self._get_fallback_job_info(job_id)
        except Exception as e:
            print(f"⚠️ Neo4j query failed: {e}")
            return self._get_fallback_job_info(job_id)

    def _get_fallback_job_info(self, job_id: str) -> Dict:
        """Fallback job info when Neo4j is not available"""
        # Map common job IDs to titles
        job_titles = {
            "15-1252.00": "Software Developer",
            "35-3023.01": "Barista",
            "11-1021.00": "General Manager",
            "29-1141.00": "Registered Nurse",
            "25-2021.00": "Elementary School Teacher",
        }

        title = job_titles.get(job_id, f"Job {job_id}")
        return {"id": job_id, "title": title}

    def close(self):
        if self.driver:
            self.driver.close()


class GeminiService:
    """Service để tương tác với Gemini AI"""

    def __init__(self):
        try:
            model_name = os.getenv("GEMINI_MODEL", "models/gemma-3-12b-it")
            self.model = genai.GenerativeModel(model_name)
            self.model_name = model_name
            print(f"✅ Gemini AI model initialized: {model_name}")
        except Exception as e:
            print(f"⚠️ Failed to initialize Gemini model: {e}")
            self.model = None
            self.model_name = None

    def generate_interview_start(self, job_title: str, skills_context: List[Dict]) -> Dict:
        """Tạo lời chào và câu hỏi đầu tiên"""
        prompt = f"""Bạn là HR Manager phỏng vấn vị trí {job_title}.
Tạo lời chào ngắn gọn và câu hỏi mở đầu về động lực ứng tuyển.
Trả về JSON (chỉ JSON):
{{"greeting": "...", "first_question": "..."}}"""

        try:
            if self.model:
                response = self.model.generate_content(prompt)
                import re as _re

                match = _re.search(r"\{[\s\S]*\}", response.text)
                if match:
                    return json.loads(match.group())
        except Exception as e:
            print(f"⚠️ Gemini API failed: {e}")

        return {
            "greeting": f"Xin chào! Tôi là HR Manager và sẽ phỏng vấn bạn cho vị trí {job_title}. Buổi phỏng vấn khoảng 15-20 phút với 5 câu hỏi. Hãy thư giãn nhé!",
            "first_question": "Trước tiên, bạn có thể chia sẻ lý do tại sao bạn quan tâm đến vị trí này không?",
        }

    def generate_question(
        self, job_title: str, skills_context: List[Dict], question_history: List[str], question_type: str = "technical"
    ) -> str:
        """Tạo câu hỏi phỏng vấn dựa trên context"""
        skills_list = ", ".join([s["skill_name"] for s in skills_context[:5]])
        history_note = ""
        if question_history:
            history_note = f"\nCÁC CÂU HỎI ĐÃ HỎI: {'; '.join(question_history[-3:])}. Hãy đặt câu hỏi KHÁC."

        prompt = f"""Bạn là HR Manager phỏng vấn vị trí {job_title}.
Kỹ năng cần kiểm tra: {skills_list}
Loại câu hỏi: {question_type}{history_note}

Đặt 1 câu hỏi tình huống thực tế (không hỏi định nghĩa). Chỉ trả về câu hỏi, không giải thích."""

        # Thêm lịch sử câu hỏi để tránh lặp lại
        if question_history:
            prompt += f"\n\nCÁC CÂU HỎI ĐÃ HỎI: {'; '.join(question_history[-3:])}"
            prompt += "\nHãy đặt câu hỏi KHÁC, không lặp lại nội dung trên."

        try:
            if self.model:
                response = self.model.generate_content(prompt)
                return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini API failed: {e}")

        # Fallback: rotate through different question templates based on history length
        session_skills = skills_context[0]["skill_name"] if skills_context else "kỹ năng chuyên môn"

        # Fallback: rotate through different question templates based on history length
        fallback_questions = {
            "technical": [
                f"Bạn đã từng sử dụng công cụ hoặc phần mềm nào liên quan đến {session_skills} chưa? Hãy mô tả cách bạn sử dụng.",
                "Quy trình làm việc hàng ngày của bạn trong lĩnh vực này như thế nào?",
                f"Bạn tự đánh giá mức độ thành thạo của mình về {session_skills} như thế nào?",
            ],
            "behavioral": [
                "Hãy kể về một lần bạn phải làm việc nhóm để giải quyết vấn đề khó khăn.",
                "Bạn đã từng xử lý tình huống áp lực cao như thế nào? Kết quả ra sao?",
                "Kể về một lần bạn nhận được phản hồi tiêu cực và bạn đã phản ứng như thế nào.",
            ],
            "situational": [
                "Nếu bạn được giao một dự án mới mà bạn chưa có kinh nghiệm, bạn sẽ bắt đầu từ đâu?",
                "Nếu có xung đột với đồng nghiệp về cách tiếp cận công việc, bạn sẽ xử lý thế nào?",
                "Nếu deadline bị rút ngắn đột ngột, bạn sẽ ưu tiên công việc như thế nào?",
            ],
        }

        questions_for_type = fallback_questions.get(question_type, fallback_questions["behavioral"])
        # Pick based on history length to avoid repeats
        idx = len(question_history) % len(questions_for_type)
        return questions_for_type[idx]

    def evaluate_answer(
        self, question: str, user_answer: str, job_title: str, skills_tested: List[str] = None, question_type: str = None
    ) -> Dict:
        """Đánh giá câu trả lời với context kỹ năng cụ thể"""
        is_no_answer = user_answer.strip() in ["(Không trả lời)", ""]

        # Build skill context for evaluation
        skill_context = ""
        if skills_tested:
            skill_context = f"\nKỹ năng đang được đánh giá: {', '.join(skills_tested)}"

        question_context = ""
        if question_type:
            type_descriptions = {
                "technical": "câu hỏi kỹ thuật/chuyên môn",
                "behavioral": "câu hỏi hành vi/kinh nghiệm",
                "situational": "câu hỏi tình huống giả định",
                "warm_up": "câu hỏi làm quen/động lực",
            }
            question_context = f"\nLoại câu hỏi: {type_descriptions.get(question_type, question_type)}"

        prompt = f"""Bạn là HR Manager đang đánh giá câu trả lời phỏng vấn cho vị trí {job_title}.

Câu hỏi: {question}
Câu trả lời của ứng viên: {user_answer}{skill_context}{question_context}

{"LƯU Ý: Ứng viên không trả lời. Chấm điểm thấp nhưng vẫn đưa ra nhận xét mang tính xây dựng." if is_no_answer else ""}

Đánh giá theo 5 tiêu chí sau và trả về JSON (chỉ JSON thuần, không markdown):
{{
    "score": <điểm tổng 1-10, là trung bình có trọng số của 5 tiêu chí>,
    "detailed_scores": {{
        "technical": <1-10, Kỹ năng chuyên môn: mức độ hiểu biết kỹ thuật/chuyên ngành liên quan đến câu hỏi>,
        "logic": <1-10, Tư duy logic: khả năng lập luận, phân tích, cấu trúc câu trả lời>,
        "communication": <1-10, Giao tiếp: sự rõ ràng, mạch lạc, dễ hiểu trong diễn đạt>,
        "experience": <1-10, Kinh nghiệm thực tế: có ví dụ cụ thể, tình huống thực tế không>,
        "attitude": <1-10, Thái độ: sự tích cực, chủ động, tinh thần học hỏi>
    }},
    "score_reasoning": {{
        "technical": "<lý do chấm điểm kỹ năng chuyên môn>",
        "logic": "<lý do chấm điểm tư duy logic>",
        "communication": "<lý do chấm điểm giao tiếp>",
        "experience": "<lý do chấm điểm kinh nghiệm>",
        "attitude": "<lý do chấm điểm thái độ>"
    }},
    "feedback": "<nhận xét tổng thể 2-3 câu, cụ thể và có ích>",
    "strengths": ["<điểm mạnh cụ thể 1>", "<điểm mạnh cụ thể 2>"],
    "weaknesses": ["<điểm yếu cụ thể 1>"],
    "suggestion": "<gợi ý cải thiện cụ thể, có ví dụ>"
}}"""

        try:
            if self.gemini.model:
                response = self.gemini.model.generate_content(prompt)
                text = response.text.strip()
                # Extract JSON robustly - find outermost { }
                import re as _re

                match = _re.search(r"\{[\s\S]*\}", text)
                if not match:
                    raise ValueError("No JSON found in response")
                result = json.loads(match.group())
                result.pop("next_question", None)
                ds = result.get("detailed_scores", {})
                if ds:
                    result["score"] = round(sum(v for v in ds.values() if v) / len(ds), 1)
                return result
        except Exception as e:
            print(f"⚠️ Gemini API failed: {e}")

        # Fallback evaluation
        answer_len = len(user_answer.strip())
        if is_no_answer or answer_len < 5:
            base = 1.5
        elif answer_len < 20:
            base = 4.0
        elif answer_len < 50:
            base = 6.0
        else:
            base = 7.0

        return {
            "score": base,
            "detailed_scores": {
                "technical": base,
                "logic": base,
                "communication": round(base + 0.5, 1),
                "experience": round(base - 0.5, 1),
                "attitude": round(base + 0.5, 1),
            },
            "score_reasoning": {
                "technical": "Chưa thể đánh giá do câu trả lời quá ngắn.",
                "logic": "Chưa thể đánh giá do câu trả lời quá ngắn.",
                "communication": "Chưa thể đánh giá do câu trả lời quá ngắn.",
                "experience": "Không có ví dụ thực tế.",
                "attitude": "Cần thể hiện thái độ tích cực hơn.",
            },
            "feedback": "Câu trả lời cần chi tiết và cụ thể hơn. Hãy dùng phương pháp STAR để trả lời.",
            "strengths": ["Có tiềm năng phát triển"],
            "weaknesses": ["Thiếu ví dụ thực tế", "Cần trình bày chi tiết hơn"],
            "suggestion": "Dùng phương pháp STAR: Situation (tình huống) → Task (nhiệm vụ) → Action (hành động) → Result (kết quả).",
        }

    def generate_final_summary(self, interview_history: List[Dict], scores_history: List[float], job_title: str) -> Dict:
        """Tạo báo cáo tổng kết phỏng vấn"""
        avg_score = sum(scores_history) / len(scores_history) if scores_history else 5.0

        history_text = "\n".join(
            [f"Q: {msg['question']}\nA: {msg['answer']}\nScore: {msg['score']}" for msg in interview_history]
        )

        prompt = f"""Bạn là HR Manager tổng kết buổi phỏng vấn cho vị trí {job_title}.

Lịch sử phỏng vấn:
{history_text}

Điểm trung bình: {avg_score:.1f}/10

Trả về JSON (chỉ JSON, không có text khác):
{{
    "overall_score": {avg_score:.1f},
    "recommendation": "<PASS nếu >= 7.5, CONDITIONAL_PASS nếu >= 5.5, FAIL nếu < 5.5>",
    "summary": "<tóm tắt 2-3 câu về ứng viên>",
    "key_strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
    "key_weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>"],
    "skill_gaps": ["<kỹ năng cần bổ sung 1>", "<kỹ năng cần bổ sung 2>"],
    "learning_recommendations": [
        {{
            "skill": "<tên kỹ năng>",
            "priority": "<HIGH/MEDIUM/LOW>",
            "suggested_courses": ["<khóa học 1>"],
            "estimated_time": "<thời gian ước tính>"
        }}
    ]
}}"""

        try:
            if self.model:
                response = self.model.generate_content(prompt)
                import re as _re

                match = _re.search(r"\{[\s\S]*\}", response.text)
                if match:
                    result = json.loads(match.group())
                    result["overall_score"] = avg_score
                    return result
        except Exception as e:
            print(f"⚠️ Gemini API failed: {e}")

        # Fallback summary
        if avg_score >= 7.5:
            recommendation = "PASS"
        elif avg_score >= 5.5:
            recommendation = "CONDITIONAL_PASS"
        else:
            recommendation = "FAIL"

        return {
            "overall_score": avg_score,
            "recommendation": recommendation,
            "summary": f"Ứng viên đạt điểm trung bình {avg_score:.1f}/10 cho vị trí {job_title}. Cần cải thiện thêm để đáp ứng yêu cầu.",
            "key_strengths": ["Thái độ tích cực", "Giao tiếp cơ bản"],
            "key_weaknesses": ["Thiếu ví dụ thực tế", "Cần trình bày chi tiết hơn"],
            "skill_gaps": ["Kinh nghiệm thực tế", "Kỹ năng chuyên sâu"],
            "learning_recommendations": [
                {
                    "skill": "Kỹ năng thực hành",
                    "priority": "HIGH",
                    "suggested_courses": ["Khóa học online", "Thực hành dự án thực tế"],
                    "estimated_time": "3-6 tháng",
                }
            ],
        }


# Module-level cache để tránh gọi Gemini lặp lại cho cùng job_id
_task_selection_cache: Dict[str, List[Dict]] = {}

# Singleton instances - tránh tạo lại mỗi request
_neo4j_instance: Optional["Neo4jService"] = None
_gemini_instance: Optional["GeminiService"] = None


def get_neo4j_service() -> "Neo4jService":
    """Get or create Neo4j service singleton"""
    global _neo4j_instance
    if _neo4j_instance is None:
        _neo4j_instance = Neo4jService()
    return _neo4j_instance


def get_gemini_service() -> "GeminiService":
    """Get or create Gemini service singleton"""
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiService()
    return _gemini_instance


class InterviewService:
    """Service chính để quản lý phiên phỏng vấn"""

    def __init__(self, db: Session):
        self.db = db
        # Use singleton instances to prevent driver closure
        self.neo4j = get_neo4j_service()
        self.gemini = get_gemini_service()

    def _get_question_distribution(self, question_count: int) -> Dict[str, int]:
        """Tính toán phân bố loại câu hỏi dựa trên tổng số câu hỏi"""
        distributions = {
            5: {"warm_up": 1, "technical": 2, "behavioral": 1, "situational": 1},
            7: {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 1},
            8: {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 2},
            10: {"warm_up": 1, "technical": 4, "behavioral": 3, "situational": 2},
            12: {"warm_up": 1, "technical": 5, "behavioral": 3, "situational": 3},
        }

        # Fallback for other counts - proportional distribution
        if question_count not in distributions:
            warm_up = 1
            remaining = question_count - 1
            technical = max(2, remaining // 2)  # At least 2 technical
            behavioral = max(1, remaining // 3)  # At least 1 behavioral
            situational = remaining - technical - behavioral
            return {"warm_up": warm_up, "technical": technical, "behavioral": behavioral, "situational": situational}

        return distributions[question_count]

    # ── Postgres-based skill lookup ────────────────────────────────────────────
    def _get_skills_from_postgres(self, job_id: str, limit: int = 8) -> List[Dict]:
        """Lấy skills từ core.career_work_activity_summary JOIN career_work_activities_master"""
        try:
            sql = """
                SELECT
                    m.element_name_vi  AS skill_name,
                    m.activity_category_vi AS skill_type,
                    s.importance_score AS importance,
                    s.level_score      AS level,
                    s.activity_rank    AS rank,
                    s.combined_score   AS combined_score
                FROM core.career_work_activity_summary s
                JOIN core.career_work_activities_master m ON m.element_id = s.element_id
                WHERE s.onet_code = :onet_code
                  AND s.is_top_activity = true
                ORDER BY s.activity_rank ASC, s.combined_score DESC
                LIMIT :limit
            """
            from sqlalchemy import text

            rows = self.db.execute(text(sql), {"onet_code": job_id, "limit": limit}).fetchall()
            if rows:
                return [
                    {
                        "skill_name": r.skill_name,
                        "skill_type": r.skill_type or "Kỹ năng",
                        "importance": float(r.importance) if r.importance else 0.0,
                        "level": float(r.level) if r.level else 0.0,
                        "rank": r.rank or 999,
                        "combined_score": float(r.combined_score) if r.combined_score else 0.0,
                    }
                    for r in rows
                ]
        except Exception as e:
            print(f"⚠️ Postgres skills query failed: {e}")
        return []

    def _get_ksas_from_postgres(self, job_id: str, limit: int = 5) -> List[Dict]:
        """Lấy top abilities và knowledge từ core.career_ksas (không lấy skills)"""
        try:
            sql = """
                SELECT
                    COALESCE(name_vi, name) AS skill_name,
                    CASE 
                        WHEN ksa_type = 'ability' THEN 'Khả năng'
                        WHEN ksa_type = 'knowledge' THEN 'Kiến thức'
                        ELSE ksa_type
                    END AS skill_type,
                    importance,
                    level,
                    ksa_type
                FROM core.career_ksas
                WHERE onet_code = :onet_code
                  AND ksa_type IN ('ability', 'knowledge')
                  AND level IS NOT NULL
                  AND importance IS NOT NULL
                ORDER BY level DESC, importance DESC
                LIMIT :limit
            """
            from sqlalchemy import text

            rows = self.db.execute(text(sql), {"onet_code": job_id, "limit": limit}).fetchall()
            if rows:
                print(f"✅ PostgreSQL KSAs returned {len(rows)} abilities/knowledge for job {job_id}")
                return [
                    {
                        "skill_name": r.skill_name,
                        "skill_type": r.skill_type,
                        "importance": float(r.level),  # Hiển thị level thay vì importance
                        "level": float(r.level) if r.level else 0.0,
                        "rank": i + 1,
                        "combined_score": float(r.level) if r.level else 0.0,
                        "source": "career_ksas",
                    }
                    for i, r in enumerate(rows)
                ]
            else:
                print(f"⚠️ PostgreSQL KSAs returned 0 abilities/knowledge for job {job_id}")
        except Exception as e:
            print(f"⚠️ Postgres KSAs query failed: {e}")
        return []

    def _get_job_title_from_postgres(self, job_id: str) -> Optional[str]:
        """Lấy tên nghề từ core.careers"""
        try:
            from sqlalchemy import text

            row = self.db.execute(
                text("SELECT title_vi FROM core.careers WHERE onet_code = :code LIMIT 1"), {"code": job_id}
            ).fetchone()
            if row:
                return row.title_vi
        except Exception as e:
            print(f"⚠️ Postgres job title query failed: {e}")
        return None

    def _get_hard_skills_fast(self, job_id: str) -> tuple:
        """Lấy top 5 hard skills nhanh nhất - không gọi Gemini, chỉ importance sort + cache"""
        global _task_selection_cache
        if job_id in _task_selection_cache:
            cached = _task_selection_cache[job_id]
            return cached, cached

        try:
            from sqlalchemy import text

            rows = self.db.execute(
                text(
                    """
                SELECT task_en, task_vi, importance
                FROM core.career_tasks
                WHERE onet_code = :onet_code
                ORDER BY importance DESC LIMIT 5
            """
                ),
                {"onet_code": job_id},
            ).fetchall()

            if rows:
                all_tasks = [{"task_en": r.task_en, "task_vi": r.task_vi, "importance": float(r.importance or 0)} for r in rows]
            else:
                rows2 = self.db.execute(
                    text(
                        """
                    SELECT DISTINCT dwa_title, dwa_title_vi
                    FROM core.career_dwas
                    WHERE onet_code = :onet_code LIMIT 5
                """
                    ),
                    {"onet_code": job_id},
                ).fetchall()
                all_tasks = [{"task_en": r.dwa_title, "task_vi": r.dwa_title_vi or r.dwa_title, "importance": 3.5} for r in rows2]

            def skill_name(t):
                vi = t.get("task_vi", "")
                if vi and vi != t.get("task_en") and not vi.startswith("Thực hiện các nhiệm vụ"):
                    return vi
                return t.get("task_en", "")

            top5 = [
                {
                    "skill_name": skill_name(t),
                    "skill_type": "Kỹ năng chuyên ngành",
                    "importance": t["importance"],
                    "level": t["importance"],
                    "rank": i + 1,
                    "combined_score": t["importance"],
                    "is_hard_skill": True,
                }
                for i, t in enumerate(all_tasks[:5])
            ]

            _task_selection_cache[job_id] = top5
            return top5, all_tasks
        except Exception as e:
            print(f"⚠️ _get_hard_skills_fast failed: {e}")
            return [], []

    def _gemini_select_top_tasks(self, tasks: List[Dict], job_id: str) -> List[Dict]:
        """Dùng Gemini chọn 5 task quan trọng nhất - module-level cache + silent fallback"""
        global _task_selection_cache
        if job_id in _task_selection_cache:
            return _task_selection_cache[job_id]

        result = sorted(tasks, key=lambda x: -x.get("importance", 0))[:5]
        try:
            if self.gemini.model:
                task_list = "\n".join([f"{i + 1}. {t['task_en']}" for i, t in enumerate(tasks[:20])])
                prompt = f"""You are selecting the 5 most important tasks for occupation code {job_id}.
From this list, pick the 5 most distinctive and important ones.
List:
{task_list}

Respond with ONLY a JSON object, no explanation:
{{"selected_indices": [1, 2, 3, 4, 5]}}"""

                response = self.gemini.model.generate_content(prompt)
                text = response.text.strip()
                # Extract JSON robustly
                import json as _json
                import re as _re

                match = _re.search(r'\{[^{}]*"selected_indices"[^{}]*\}', text, _re.DOTALL)
                if match:
                    indices = _json.loads(match.group()).get("selected_indices", [])[:5]
                    selected = [tasks[i - 1] for i in indices if 1 <= i <= len(tasks)]
                    if len(selected) >= 3:
                        result = selected[:5]
        except Exception:
            pass

        _task_selection_cache[job_id] = result
        return result

    def start_interview(self, user_id: int, job_id: str, question_count: int = 5) -> InterviewSession:
        """Bắt đầu phiên phỏng vấn mới với số lượng câu hỏi tùy chỉnh"""
        # Validate question count
        if question_count not in [5, 7, 8, 10, 12]:
            question_count = 5  # Default fallback

        # Get question distribution
        question_distribution = self._get_question_distribution(question_count)

        # Lấy thông tin job - Postgres trước, Neo4j fallback
        job_title = self._get_job_title_from_postgres(job_id)
        if not job_title:
            job_info = self.neo4j.get_job_info(job_id)
            if not job_info:
                raise ValueError(f"Không tìm thấy nghề nghiệp với ID: {job_id}")
            job_title = job_info["title"]

        # LUỒNG MỚI: 4 bước xử lý soft skills
        soft_skills_context = []

        # Bước 1: PostgreSQL work activities
        print(f"🔍 Step 1: Checking PostgreSQL work activities for job {job_id}")
        soft_skills_context = self._get_skills_from_postgres(job_id, limit=8)

        if not soft_skills_context:
            # Bước 2: Neo4j (without fallback)
            print(f"🔍 Step 2: PostgreSQL empty, calling Neo4j for job {job_id}")
            soft_skills_context = self.neo4j.get_job_skills(job_id, use_fallback=False)
            print(f"🔍 Neo4j returned {len(soft_skills_context)} skills for job {job_id}")

            if not soft_skills_context:
                # Bước 3: PostgreSQL career_ksas (abilities + knowledge)
                print(f"🔍 Step 3: Neo4j empty, calling PostgreSQL KSAs for job {job_id}")
                soft_skills_context = self._get_ksas_from_postgres(job_id, limit=5)
                print(f"🔍 PostgreSQL KSAs returned {len(soft_skills_context)} abilities/knowledge for job {job_id}")

                if not soft_skills_context:
                    # Bước 4: Fallback
                    print(f"🔍 Step 4: All sources empty, using fallback for job {job_id}")
                    soft_skills_context = self.neo4j._get_fallback_skills(job_id, 8)
                else:
                    print(f"🔍 Using PostgreSQL KSAs (abilities + knowledge) for job {job_id}")
            else:
                print(f"🔍 Using Neo4j skills for job {job_id}")
        else:
            print(f"🔍 Using PostgreSQL work activities for job {job_id}")

        # Get hard skills (tasks) for technical questions
        hard_skills_context, _ = self._get_hard_skills_fast(job_id)

        # Combine skills context with type indicators
        all_skills_context = []
        for skill in soft_skills_context:
            skill_copy = skill.copy()
            skill_copy["is_soft_skill"] = True
            all_skills_context.append(skill_copy)

        for skill in hard_skills_context[:5]:  # Limit hard skills
            skill_copy = skill.copy()
            skill_copy["is_soft_skill"] = False
            all_skills_context.append(skill_copy)

        # Tạo session mới
        session = InterviewSession(
            user_id=user_id,
            job_id=job_id,
            job_title=job_title,
            skills_context=all_skills_context,
            status="active",
            question_count=question_count,
            question_distribution=question_distribution,
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        # Tạo lời chào và câu hỏi đầu tiên
        start_content = self.gemini.generate_interview_start(job_title, soft_skills_context)

        # Lưu lời chào
        greeting_msg = InterviewMessage(
            session_id=session.id,
            role="interviewer",
            content=start_content["greeting"],
            question_type="greeting",
            question_number=0,
        )
        self.db.add(greeting_msg)

        # Lưu câu hỏi đầu tiên
        first_question = InterviewMessage(
            session_id=session.id,
            role="interviewer",
            content=start_content["first_question"],
            question_type="warm_up",
            question_number=1,
            skills_tested=["communication", "motivation"],
        )
        self.db.add(first_question)

        self.db.commit()

        return session

    def submit_answer(
        self, session_id: int, user_answer: str, has_audio: bool = False, audio_duration: float = None, is_skipped: bool = False
    ) -> Dict:
        """Gửi câu trả lời và nhận câu hỏi tiếp theo"""
        session = self.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session or session.status != "active":
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

        is_skipped = is_skipped or user_answer.strip() == ""

        if is_skipped:
            # Dùng Gemini tạo gợi ý thực sự cho câu hỏi bị bỏ qua
            suggestion = "Hãy cố gắng trả lời câu hỏi này trong lần phỏng vấn tiếp theo."
            try:
                if self.gemini.model:
                    hint_prompt = f"""Ứng viên bỏ qua câu hỏi phỏng vấn sau cho vị trí {session.job_title}:
"{last_question.content}"

Hãy đưa ra gợi ý ngắn gọn (2-3 câu) về cách trả lời câu hỏi này hiệu quả. Chỉ trả về gợi ý, không giải thích thêm."""
                    resp = self.gemini.model.generate_content(hint_prompt)
                    if resp.text.strip():
                        suggestion = resp.text.strip()
            except Exception:
                pass

            answer_msg = InterviewMessage(
                session_id=session_id,
                role="candidate",
                content="",
                question_type=f"answer_{last_question.question_type}" if last_question.question_type else "answer",
                question_number=last_question.question_number,
                score=None,
                detailed_scores=None,
                feedback=None,
                strengths=None,
                weaknesses=None,
                suggestion=suggestion,
                has_audio=False,
                audio_duration=None,
            )
            evaluation = {
                "score": None,
                "detailed_scores": None,
                "feedback": None,
                "strengths": None,
                "weaknesses": None,
                "suggestion": suggestion,
            }
        else:
            # Đánh giá câu trả lời bình thường với context kỹ năng
            evaluation = self.gemini.evaluate_answer(
                last_question.content,
                user_answer,
                session.job_title,
                skills_tested=last_question.skills_tested,
                question_type=last_question.question_type,
            )
            answer_msg = InterviewMessage(
                session_id=session_id,
                role="candidate",
                content=user_answer,
                question_type=f"answer_{last_question.question_type}" if last_question.question_type else "answer",
                question_number=last_question.question_number,
                score=evaluation.get("score"),
                detailed_scores=evaluation.get("detailed_scores"),
                feedback=evaluation.get("feedback"),
                strengths=evaluation.get("strengths"),
                weaknesses=evaluation.get("weaknesses"),
                suggestion=evaluation.get("suggestion"),
                has_audio=has_audio,
                audio_duration=audio_duration,
            )
        self.db.add(answer_msg)

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

        # Use session's question_count instead of hardcoded value
        max_questions = session.question_count or 5

        if question_count >= max_questions:
            # Kết thúc phỏng vấn
            finish_result = self._finish_interview(session)
            finish_result["evaluation"] = evaluation
            return finish_result
        else:
            # Tạo câu hỏi tiếp theo
            next_result = self._generate_next_question(session)
            next_result["evaluation"] = evaluation
            return next_result

    def _generate_next_question(self, session: InterviewSession, suggested_question: str = None) -> Dict:
        """Tạo câu hỏi tiếp theo dựa trên phân bố động"""
        # Lấy lịch sử câu hỏi
        previous_questions = (
            self.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session.id, InterviewMessage.role == "interviewer")
            .all()
        )

        question_history = [q.content for q in previous_questions]
        question_number = len([q for q in previous_questions if q.question_type != "greeting"]) + 1

        # Xác định loại câu hỏi dựa trên phân bố
        question_type = self._get_next_question_type(session, question_number)

        # Chọn skills phù hợp với loại câu hỏi
        skills_context = session.skills_context or []
        skills_for_question = self._select_skills_for_question(skills_context, question_type, question_number)

        # Generate câu hỏi từ Gemini
        next_question = self.gemini.generate_question(session.job_title, skills_for_question, question_history, question_type)

        # Lưu câu hỏi mới
        question_msg = InterviewMessage(
            session_id=session.id,
            role="interviewer",
            content=next_question,
            question_type=question_type,
            question_number=question_number,
            skills_tested=[s.get("skill_name", "") for s in skills_for_question[:3]],
        )
        self.db.add(question_msg)
        self.db.commit()

        return {
            "status": "continue",
            "question": next_question,
            "question_number": question_number,
            "question_type": question_type,
        }

    def _get_next_question_type(self, session: InterviewSession, question_number: int) -> str:
        """Xác định loại câu hỏi tiếp theo dựa trên phân bố"""
        distribution = session.question_distribution or self._get_question_distribution(session.question_count or 5)

        # Count existing questions by type (excluding greeting)
        existing_questions = (
            self.db.query(InterviewMessage)
            .filter(
                InterviewMessage.session_id == session.id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_type != "greeting",
            )
            .all()
        )

        type_counts = {}
        for q in existing_questions:
            qtype = q.question_type or "technical"
            type_counts[qtype] = type_counts.get(qtype, 0) + 1

        # Determine next type based on what's needed
        for qtype in ["warm_up", "technical", "behavioral", "situational"]:
            needed = distribution.get(qtype, 0)
            current = type_counts.get(qtype, 0)
            if current < needed:
                return qtype

        # Fallback to technical if all quotas are met
        return "technical"

    def _select_skills_for_question(self, skills_context: List[Dict], question_type: str, question_number: int) -> List[Dict]:
        """Chọn skills phù hợp cho từng loại câu hỏi"""
        if not skills_context:
            return []

        # Separate soft and hard skills
        soft_skills = [s for s in skills_context if s.get("is_soft_skill", True)]
        hard_skills = [s for s in skills_context if not s.get("is_soft_skill", True)]

        if question_type == "technical":
            # Technical questions focus on hard skills (tasks)
            return hard_skills[:3] if hard_skills else soft_skills[:3]
        elif question_type in ["behavioral", "situational"]:
            # Behavioral/situational questions focus on soft skills
            return soft_skills[:3] if soft_skills else []
        else:
            # Warm-up questions use general skills
            return (soft_skills + hard_skills)[:2]

    def _finish_interview(self, session: InterviewSession) -> Dict:
        """Kết thúc phỏng vấn và tạo báo cáo"""
        # Lấy tất cả câu trả lời và điểm số
        messages = (
            self.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session.id)
            .order_by(InterviewMessage.timestamp)
            .all()
        )

        # Tạo lịch sử phỏng vấn
        interview_history = []
        scores_history = []

        for i in range(0, len(messages), 2):  # Mỗi cặp question-answer
            if i + 1 < len(messages):
                question = messages[i]
                answer = messages[i + 1]
                if question.role == "interviewer" and answer.role == "candidate":
                    interview_history.append({"question": question.content, "answer": answer.content, "score": answer.score or 0})
                    if answer.score:
                        scores_history.append(answer.score)

        # Tạo báo cáo tổng kết
        summary = self.gemini.generate_final_summary(interview_history, scores_history, session.job_title)

        # Cập nhật session
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        session.overall_score = summary["overall_score"]
        session.recommendation = summary["recommendation"]
        session.summary = summary["summary"]
        session.key_strengths = summary["key_strengths"]
        session.key_weaknesses = summary["key_weaknesses"]
        session.skill_gaps = summary["skill_gaps"]
        session.learning_recommendations = summary["learning_recommendations"]

        # Tính điểm chi tiết từ detailed_scores của từng câu trả lời
        candidate_messages = [m for m in messages if m.role == "candidate" and m.detailed_scores]
        if candidate_messages:

            def avg_dim(dim):
                vals = [m.detailed_scores.get(dim, 0) for m in candidate_messages if m.detailed_scores.get(dim) is not None]
                return sum(vals) / len(vals) if vals else None

            session.technical_score = avg_dim("technical")
            session.communication_score = avg_dim("communication")
            session.logic_score = avg_dim("logic")
            session.experience_score = avg_dim("experience")
            session.attitude_score = avg_dim("attitude")

        self.db.commit()

        return {"status": "completed", "summary": summary, "session_id": session.id}

    def get_session_history(self, session_id: int) -> Dict:
        """Lấy lịch sử phiên phỏng vấn"""
        session = self.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            raise ValueError("Không tìm thấy phiên phỏng vấn")

        messages = (
            self.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session_id)
            .order_by(InterviewMessage.timestamp)
            .all()
        )

        return {
            "session": {
                "id": session.id,
                "job_title": session.job_title,
                "status": session.status,
                "started_at": session.started_at.isoformat(),
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
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
                "skills_context": session.skills_context,
            },
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "score": msg.score,
                    "detailed_scores": msg.detailed_scores or {},
                    "feedback": msg.feedback or "",
                    "strengths": msg.strengths or [],
                    "weaknesses": msg.weaknesses or [],
                    "suggestion": msg.suggestion or "",
                    "question_type": msg.question_type or "",
                    "question_number": msg.question_number,
                    "skills_tested": msg.skills_tested or [],
                    "has_audio": msg.has_audio or False,
                    "audio_duration": msg.audio_duration,
                }
                for msg in messages
            ],
        }

    def get_user_interviews(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Lấy danh sách phỏng vấn của user"""
        sessions = (
            self.db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.started_at.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": s.id,
                "job_title": s.job_title,
                "status": s.status,
                "started_at": s.started_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "overall_score": s.overall_score,
                "recommendation": s.recommendation,
            }
            for s in sessions
        ]

    def __del__(self):
        """Cleanup khi service bị destroy"""
        if hasattr(self, "neo4j") and self.neo4j:
            self.neo4j.close()
