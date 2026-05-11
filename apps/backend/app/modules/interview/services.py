"""
AI Mock Interview Services
Tích hợp Gemini API, Neo4j và PostgreSQL với 4-Stream System
"""

import json
import os
import re
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session
from neo4j import GraphDatabase

from ...core.gemini_manager import multi_stream_manager
from .models import InterviewMessage, InterviewSession


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
            print("[OK] Neo4j connection successful")
        except Exception as e:
            print(f"[WARN] Neo4j connection failed: {e}")
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
            print(f"[WARN] Neo4j session error: {e}")
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
            print("[WARN] Neo4j driver not available")
            return self._get_fallback_skills(job_id, limit) if use_fallback else []

        try:
            neo4j_session = self._get_session()
            if not neo4j_session:
                print("[WARN] Neo4j session not available")
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
                            "skill_name": record.get("skill_name", ""),
                            "skill_type": record.get("skill_type", "Kỹ năng"),
                            "importance": float(record.get("importance", 0)) if record.get("importance") else 3.0,
                            "level": float(record.get("level", 0)) if record.get("level") else 3.0,
                            "rank": int(record.get("rank", 999)) if record.get("rank") else 999,
                            "combined_score": float(record.get("combined_score", 0)) if record.get("combined_score") else 3.0,
                        }
                    )

                print(f"[OK] Neo4j returned {len(skills)} skills for job {job_id}")

                if skills:
                    return skills[:limit]

        except Exception as e:
            print(f"[WARN] Neo4j skills query failed: {e}")
            return self._get_fallback_skills(job_id, limit) if use_fallback else []

        print(f"[WARN] Neo4j returned no skills for job {job_id}")
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
            print(f"[WARN] Neo4j query failed: {e}")
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
            print(f"[WARN] Neo4j query failed: {e}")
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
    """Service để tương tác với Gemini AI sử dụng Interview Stream"""

    def __init__(self):
        self.stream_manager = multi_stream_manager.get_interview_stream()
        print(f"[OK] Interview Gemini service initialized with stream: {self.stream_manager.stream_type.value}")

    def generate_interview_start(self, job_title: str, skills_context: List[Dict], level_context: Optional[Dict] = None) -> Dict:
        """Tạo lời chào và câu hỏi đầu tiên với prompt cải tiến - dài hơn và chuyên nghiệp hơn"""
        # Thêm level context vào prompt
        level_info = ""
        if level_context:
            level_info = f" cho cấp bậc {level_context['name']} ({level_context['experience']})"
        
        # Prompt cải tiến - dài hơn, chuyên nghiệp và thân thiện hơn
        prompt = f"""Bạn là một HR Manager chuyên nghiệp và giàu kinh nghiệm đang thực hiện buổi phỏng vấn quan trọng cho vị trí {job_title}{level_info}. 

Hãy tạo ra một lời chào ấm áp, chuyên nghiệp và một câu hỏi mở đầu thú vị để tạo không khí thoải mái cho ứng viên. Lời chào nên thể hiện sự chào đón, giới thiệu bản thân và tạo cảm giác thoải mái. Câu hỏi đầu tiên nên khuyến khích ứng viên chia sẻ về động lực và mục tiêu nghề nghiệp của họ.

{f"Lưu ý: Đây là vị trí {level_context['name']} với {level_context['focus']}. Câu hỏi nên phù hợp với level này." if level_context else ""}

Yêu cầu:
- Lời chào: 3-4 câu, ấm áp và chuyên nghiệp, giới thiệu vai trò HR Manager
- Câu hỏi: Thú vị, mở, khuyến khích chia sẻ về động lực và hành trình nghề nghiệp
- Tông điệu: Thân thiện nhưng chuyên nghiệp, tạo cảm giác thoải mái

Trả về JSON chính xác:
{{"greeting": "Lời chào ấm áp và chuyên nghiệp (3-4 câu)", "first_question": "Câu hỏi mở đầu thú vị về động lực và hành trình nghề nghiệp"}}"""

        try:
            response_text = self.stream_manager.generate_content_with_retry(
                prompt, 
                max_output_tokens=250,  # Tăng lên để có câu văn dài hơn và chuyên nghiệp hơn
                temperature=0.4  # Tăng creativity một chút
            )
            if response_text:
                import re as _re
                match = _re.search(r"\{[\s\S]*\}", response_text)
                if match:
                    return json.loads(match.group())
        except Exception as e:
            print(f"[WARN] Interview Gemini API failed: {e}")

        return {
            "greeting": f"Xin chào và chào mừng bạn đến với buổi phỏng vấn hôm nay! Tôi là HR Manager và rất vui được gặp gỡ bạn. Chúng ta sẽ có một cuộc trò chuyện thú vị và thoải mái khoảng 15-20 phút về vị trí {job_title}. Tôi hy vọng bạn sẽ cảm thấy thoải mái để chia sẻ những kinh nghiệm và suy nghĩ của mình một cách tự nhiên nhất. Hãy coi đây như một cuộc trò chuyện giữa hai người bạn về nghề nghiệp nhé!",
            "first_question": "Để bắt đầu cuộc trò chuyện, tôi rất tò mò về câu chuyện nghề nghiệp của bạn. Điều gì đã khiến bạn quan tâm và quyết định ứng tuyển vào vị trí này? Hãy chia sẻ với tôi về hành trình, động lực và những mong đợi của bạn đối với cơ hội này.",
        }

    def generate_question(
        self, job_title: str, skills_context: List[Dict], question_history: List[str], question_type: str = "technical", 
        session_context: Optional[Dict] = None
    ) -> str:
        """Tạo câu hỏi phỏng vấn với prompt cải tiến - hỗ trợ JD và level"""
        skills_list = ", ".join([s.get("skill_name", "") for s in skills_context[:3] if isinstance(s, dict) and s.get("skill_name")])  # Giới hạn 3 skills
        
        # Xử lý JD questions
        if question_type == "jd_specific" and session_context:
            jd_data = session_context.get("jd_data")
            if jd_data:
                return self._generate_jd_question(job_title, jd_data, question_history)
        
        # Lấy level context
        level_context = session_context.get("level_context") if session_context else None
        level_info = ""
        difficulty_info = ""
        if level_context:
            level_info = f" cho cấp bậc {level_context['name']} ({level_context['experience']})"
            difficulty_info = f"Độ khó: {level_context['difficulty']}. Tập trung vào: {level_context['focus']}."
        
        # Prompt cải tiến - dài hơn, chi tiết hơn và chuyên nghiệp hơn
        prompt = f"""Bạn là một HR Manager chuyên nghiệp và giàu kinh nghiệm đang thực hiện buổi phỏng vấn cho vị trí {job_title}{level_info}.

Thông tin ngữ cảnh:
- Kỹ năng cần đánh giá: {skills_list}
- Loại câu hỏi cần tạo: {question_type}
- {difficulty_info}
- Các câu hỏi đã được hỏi trước đó: {'; '.join(question_history[-2:]) if question_history else 'Chưa có câu hỏi nào'}

Yêu cầu tạo câu hỏi:
1. Tạo một câu hỏi {question_type} thú vị, thực tế và có chiều sâu
2. Câu hỏi nên tập trung vào tình huống cụ thể thay vì lý thuyết suông
3. Khuyến khích ứng viên chia sẻ kinh nghiệm thực tế và suy nghĩ của họ
4. Phù hợp với vị trí {job_title} và các kỹ năng cần đánh giá
5. Tạo cơ hội để ứng viên thể hiện năng lực và kinh nghiệm
{f"6. Độ khó phù hợp với level {level_context['name']}" if level_context else ""}

Lưu ý:
- Câu hỏi nên rõ ràng, dễ hiểu và không quá phức tạp
- Tránh câu hỏi trùng lặp với những câu đã hỏi
- Tạo không khí thoải mái và khuyến khích chia sẻ

Chỉ trả về câu hỏi, không cần giải thích thêm."""

        try:
            response_text = self.stream_manager.generate_content_with_retry(
                prompt, 
                max_output_tokens=150,  # Tăng lên để có câu hỏi dài hơn và chi tiết hơn
                temperature=0.5  # Tăng creativity
            )
            if response_text:
                return response_text.strip()
        except Exception as e:
            print(f"[WARN] Interview Gemini API failed: {e}")

        # Fallback questions cải tiến - dài hơn và chuyên nghiệp hơn
        session_skills = (skills_context[0].get("skill_name", "kỹ năng chuyên môn") 
                         if skills_context and len(skills_context) > 0 and isinstance(skills_context[0], dict) 
                         else "kỹ năng chuyên môn")

        fallback_questions = {
            "technical": [
                f"Hãy mô tả một dự án hoặc tình huống thực tế mà bạn đã áp dụng {session_skills}. Bạn đã gặp những thách thức cụ thể nào trong quá trình thực hiện và đã giải quyết chúng như thế nào? Kết quả cuối cùng ra sao?",
                f"Trong kinh nghiệm làm việc của bạn, công cụ, phương pháp hoặc kỹ thuật nào liên quan đến {session_skills} mà bạn thấy hiệu quả nhất? Hãy chia sẻ một ví dụ cụ thể về cách bạn đã sử dụng nó và tại sao bạn cho rằng nó hiệu quả.",
                f"Nếu bạn phải hướng dẫn một đồng nghiệp mới về {session_skills}, bạn sẽ tiếp cận như thế nào? Hãy chia sẻ những kinh nghiệm thực tế và bài học quan trọng mà bạn muốn truyền đạt.",
            ],
            "behavioral": [
                "Hãy kể về một lần bạn phải làm việc với một đồng nghiệp có quan điểm hoặc phong cách làm việc khác biệt hoàn toàn so với bạn. Bạn đã xử lý tình huống đó như thế nào, học được gì từ trải nghiệm này và kết quả cuối cùng ra sao?",
                "Mô tả một tình huống mà bạn phải đưa ra quyết định quan trọng dưới áp lực thời gian và thông tin hạn chế. Quá trình suy nghĩ của bạn diễn ra như thế nào, bạn đã cân nhắc những yếu tố gì và kết quả cuối cùng có đáp ứng kỳ vọng không?",
                "Kể về một lần bạn nhận được phản hồi tiêu cực hoặc chỉ trích từ cấp trên, khách hàng hoặc đồng nghiệp. Bạn đã phản ứng như thế nào trong lúc đó, và sau đó đã thực hiện những hành động gì để cải thiện tình hình?",
            ],
            "situational": [
                f"Giả sử bạn được giao một dự án {job_title} hoàn toàn mới mà bạn chưa có kinh nghiệm trước đó. Bạn sẽ lập kế hoạch và tiếp cận như thế nào trong 30 ngày đầu tiên? Hãy chia sẻ các bước cụ thể và cách bạn sẽ đảm bảo thành công.",
                "Nếu bạn phát hiện ra một sai sót nghiêm trọng trong công việc của đồng nghiệp ngay trước một deadline quan trọng, bạn sẽ xử lý tình huống này như thế nào? Hãy mô tả từng bước và lý do đằng sau quyết định của bạn.",
                f"Trong vai trò {job_title}, nếu bạn phải thuyết phục một khách hàng khó tính chấp nhận giải pháp của bạn trong khi họ có những lo ngại cụ thể, chiến lược và cách tiếp cận của bạn sẽ là gì?",
            ],
        }

        questions_for_type = fallback_questions.get(question_type, fallback_questions["behavioral"])
        idx = len(question_history) % len(questions_for_type)
        return questions_for_type[idx]

    def _generate_jd_question(self, job_title: str, jd_data: Dict, question_history: List[str]) -> str:
        """Tạo câu hỏi dựa trên Job Description"""
        # Lấy thông tin quan trọng từ JD
        required_skills = jd_data.get("required_skills", [])[:5]
        tools = jd_data.get("tools", [])[:3]
        responsibilities = jd_data.get("responsibilities", [])[:3]
        experience_level = jd_data.get("experience_level", "Junior")
        
        skills_text = ", ".join(required_skills) if required_skills else "các kỹ năng được yêu cầu"
        tools_text = ", ".join(tools) if tools else "các công cụ cần thiết"
        
        prompt = f"""Bạn là HR Manager đang phỏng vấn cho vị trí {job_title} cấp độ {experience_level}.

Dựa trên Job Description, hãy tạo một câu hỏi cụ thể về:
- Kỹ năng yêu cầu: {skills_text}
- Công cụ/Công nghệ: {tools_text}
- Trách nhiệm công việc: {'; '.join(responsibilities) if responsibilities else 'các nhiệm vụ chính'}

Yêu cầu:
1. Câu hỏi phải liên quan trực tiếp đến JD này
2. Tập trung vào kinh nghiệm thực tế với các công nghệ/kỹ năng cụ thể
3. Phù hợp với level {experience_level}
4. Khuyến khích chia sẻ ví dụ cụ thể

Chỉ trả về câu hỏi, không giải thích."""

        try:
            response_text = self.stream_manager.generate_content_with_retry(
                prompt, 
                max_output_tokens=150,
                temperature=0.4
            )
            if response_text:
                return response_text.strip()
        except Exception as e:
            print(f"⚠️ JD question generation failed: {e}")

        # Fallback JD questions
        fallback_jd_questions = [
            f"Trong JD có đề cập đến {skills_text}. Bạn có kinh nghiệm thực tế nào với những kỹ năng này? Hãy chia sẻ một dự án cụ thể.",
            f"JD yêu cầu sử dụng {tools_text}. Bạn đã từng làm việc với những công cụ này chưa? Mức độ thành thạo của bạn như thế nào?",
            f"Một trong những trách nhiệm chính là {responsibilities[0] if responsibilities else 'thực hiện các nhiệm vụ được giao'}. Bạn có kinh nghiệm tương tự không? Hãy mô tả cách bạn sẽ tiếp cận.",
        ]
        
        idx = len(question_history) % len(fallback_jd_questions)
        return fallback_jd_questions[idx]

    def evaluate_answer(
        self, question: str, user_answer: str, job_title: str, skills_tested: List[str] = None, question_type: str = None
    ) -> Dict:
        """Đánh giá câu trả lời với logic chặt chẽ và tiết kiệm token"""
        is_no_answer = user_answer.strip() in ["(Không trả lời)", "", "skip", "bỏ qua"]
        
        # Kiểm tra nếu copy câu hỏi (similarity > 80%)
        is_copy_question = self._is_copying_question(question, user_answer)
        
        # Nếu không trả lời hoặc copy câu hỏi -> trả về điểm thấp ngay
        if is_no_answer or is_copy_question:
            return self._get_low_score_result(is_no_answer, is_copy_question, question)
        
        # Đánh giá nhanh với prompt ngắn gọn
        prompt = f"""Đánh giá câu trả lời phỏng vấn {job_title}:
Q: {question[:100]}...
A: {user_answer[:200]}...

Chấm điểm 1-10 theo 3 tiêu chí:
- Kỹ thuật: Hiểu biết chuyên môn
- Logic: Tư duy rõ ràng  
- Thực tế: Có ví dụ cụ thể

JSON:
{{"score": <1-10>, "technical": <1-10>, "logic": <1-10>, "experience": <1-10>, "feedback": "<ngắn gọn>"}}"""

        try:
            response_text = self.stream_manager.generate_content_with_retry(
                prompt, 
                max_output_tokens=150,  # Giới hạn token output
                temperature=0.3  # Giảm creativity để ổn định
            )
            if response_text:
                import re as _re
                match = _re.search(r"\{[\s\S]*\}", response_text)
                if match:
                    result = json.loads(match.group())
                    # Chuẩn hóa format
                    return self._normalize_evaluation_result(result)
                return result
        except Exception as e:
            print(f"[WARN] Interview Gemini API failed: {e}")

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
            response_text = self.stream_manager.generate_content_with_retry(prompt)
            if response_text:
                import re as _re
                match = _re.search(r"\{[\s\S]*\}", response_text)
                if match:
                    result = json.loads(match.group())
                    result["overall_score"] = avg_score
                    return result
        except Exception as e:
            print(f"[WARN] Interview Gemini API failed: {e}")

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

    def _is_copying_question(self, question: str, answer: str) -> bool:
        """Kiểm tra xem có copy câu hỏi không"""
        if not answer or len(answer) < 10:
            return False
            
        # Chuyển về lowercase và loại bỏ dấu câu
        q_clean = ''.join(c.lower() for c in question if c.isalnum() or c.isspace())
        a_clean = ''.join(c.lower() for c in answer if c.isalnum() or c.isspace())
        
        # Tách từ
        q_words = set(q_clean.split())
        a_words = set(a_clean.split())
        
        # Nếu > 70% từ trong câu trả lời có trong câu hỏi -> copy
        if len(a_words) > 0:
            overlap = len(q_words.intersection(a_words))
            similarity = overlap / len(a_words)
            return similarity > 0.7
        return False
    
    def _get_low_score_result(self, is_no_answer: bool, is_copy: bool, question: str) -> Dict:
        """Trả về kết quả điểm thấp cho trường hợp không trả lời hoặc copy"""
        if is_no_answer:
            return {
                "score": 1.0,
                "detailed_scores": {"technical": 1, "logic": 1, "experience": 1},
                "feedback": "Bạn chưa trả lời câu hỏi này. Hãy thử chia sẻ suy nghĩ của mình.",
                "strengths": [],
                "weaknesses": ["Chưa có câu trả lời"],
                "suggestion": "Hãy thử trả lời dù chỉ là ý kiến cá nhân của bạn."
            }
        elif is_copy:
            return {
                "score": 2.0,
                "detailed_scores": {"technical": 2, "logic": 2, "experience": 2},
                "feedback": "Câu trả lời có vẻ như đang lặp lại câu hỏi. Hãy chia sẻ kinh nghiệm thực tế của bạn.",
                "strengths": [],
                "weaknesses": ["Chưa thể hiện được kinh nghiệm cá nhân"],
                "suggestion": "Hãy kể về tình huống cụ thể bạn đã trải qua."
            }
    
    def _get_fallback_evaluation(self, answer: str, question: str) -> Dict:
        """Đánh giá fallback đơn giản dựa trên độ dài và từ khóa"""
        answer_len = len(answer.strip())
        
        # Điểm dựa trên độ dài
        if answer_len < 20:
            score = 3.0
            feedback = "Câu trả lời còn ngắn. Hãy mở rộng thêm với ví dụ cụ thể."
        elif answer_len < 50:
            score = 5.0
            feedback = "Câu trả lời ổn. Có thể bổ sung thêm chi tiết về kinh nghiệm."
        else:
            score = 7.0
            feedback = "Câu trả lời khá chi tiết. Tốt!"
        
        return {
            "score": score,
            "detailed_scores": {"technical": score, "logic": score, "experience": score},
            "feedback": feedback,
            "strengths": ["Có cố gắng trả lời"],
            "weaknesses": ["Cần thêm chi tiết"],
            "suggestion": "Hãy kể về kinh nghiệm thực tế của bạn."
        }
    
    def _normalize_evaluation_result(self, result: Dict) -> Dict:
        """Chuẩn hóa kết quả đánh giá"""
        # Đảm bảo có đủ các field cần thiết
        normalized = {
            "score": result.get("score", 5.0),
            "detailed_scores": result.get("detailed_scores", {}),
            "feedback": result.get("feedback", "Cảm ơn bạn đã trả lời."),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
            "suggestion": result.get("suggestion", "Tiếp tục phát huy.")
        }
        
        # Đảm bảo detailed_scores có đủ 3 tiêu chí chính
        ds = normalized["detailed_scores"]
        if not ds:
            score = normalized["score"]
            ds = {"technical": score, "logic": score, "experience": score}
            normalized["detailed_scores"] = ds
        
        return normalized


# Module-level cache để tránh gọi Gemini lặp lại cho cùng job_id
_task_selection_cache: Dict[str, List[Dict]] = {}

def clear_task_cache():
    """Clear task selection cache - for testing"""
    global _task_selection_cache
    _task_selection_cache.clear()
    print("🧹 Task cache cleared")

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

    def _get_question_distribution(self, question_count: int, jd_questions_count: int = 0) -> Dict[str, int]:
        """Tính toán phân bố loại câu hỏi. Luôn thêm 1 câu closing ở cuối."""
        # Validate inputs
        question_count = max(1, question_count)
        jd_questions_count = max(0, min(jd_questions_count, 3))
        
        if jd_questions_count >= question_count:
            jd_questions_count = max(0, question_count - 1)
        
        base_question_count = question_count - jd_questions_count
        
        # Base distributions (không tính closing - sẽ thêm sau)
        base_distributions = {
            5: {"warm_up": 1, "technical": 2, "behavioral": 1, "situational": 1},
            7: {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 1},
            8: {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 2},
            10: {"warm_up": 1, "technical": 4, "behavioral": 3, "situational": 2},
            12: {"warm_up": 1, "technical": 5, "behavioral": 3, "situational": 3},
        }

        if base_question_count not in base_distributions:
            if base_question_count <= 1:
                distribution = {"warm_up": 1}
            elif base_question_count == 2:
                distribution = {"warm_up": 1, "technical": 1}
            elif base_question_count == 3:
                distribution = {"warm_up": 1, "technical": 1, "behavioral": 1}
            else:
                remaining = base_question_count - 1
                technical = max(1, remaining // 2)
                behavioral = max(1, remaining // 3)
                situational = max(0, remaining - technical - behavioral)
                distribution = {"warm_up": 1, "technical": technical, "behavioral": behavioral, "situational": situational}
        else:
            distribution = base_distributions[base_question_count].copy()

        if jd_questions_count > 0:
            distribution["jd_specific"] = jd_questions_count

        # Luôn thêm 1 câu closing ở cuối
        distribution["closing"] = 1

        return {k: v for k, v in distribution.items() if v > 0}

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
            print(f"[WARN] Postgres skills query failed: {e}")
        return []

    def _get_soft_skills_total_count(self, job_id: str) -> int:
        """Lấy tổng số soft skills có sẵn trong DB"""
        try:
            from sqlalchemy import text
            
            # Đếm từ PostgreSQL work activities
            count_sql = """
                SELECT COUNT(*)
                FROM core.career_work_activity_summary s
                JOIN core.career_work_activities_master m ON m.element_id = s.element_id
                WHERE s.onet_code = :onet_code
                  AND s.is_top_activity = true
            """
            
            result = self.db.execute(text(count_sql), {"onet_code": job_id}).scalar()
            if result and result > 0:
                return int(result)
                
            # Fallback: đếm từ career_ksas
            fallback_sql = """
                SELECT COUNT(*)
                FROM core.career_ksas
                WHERE onet_code = :onet_code
                  AND ksa_type IN ('ability', 'knowledge')
                  AND level IS NOT NULL
                  AND importance IS NOT NULL
            """
            
            result = self.db.execute(text(fallback_sql), {"onet_code": job_id}).scalar()
            return int(result) if result else 0
            
        except Exception as e:
            print(f"⚠️ Get soft skills total count failed: {e}")
            return 0

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
                print(f"[OK] PostgreSQL KSAs returned {len(rows)} abilities/knowledge for job {job_id}")
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
                print(f"[WARN] PostgreSQL KSAs returned 0 abilities/knowledge for job {job_id}")
        except Exception as e:
            print(f"[WARN] Postgres KSAs query failed: {e}")
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
            print(f"[WARN] Postgres job title query failed: {e}")
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
                SELECT task_en, task_vi, importance, task_type, incumbents_responding, task_id
                FROM core.career_tasks
                WHERE onet_code = :onet_code
                ORDER BY importance DESC, incumbents_responding DESC, task_id ASC
                LIMIT 5
            """
                ),
                {"onet_code": job_id},
            ).fetchall()

            if rows:
                all_tasks = [
                    {
                        "task_en": r.task_en, 
                        "task_vi": r.task_vi, 
                        "importance": float(r.importance or 0), 
                        "task_type": r.task_type or "Kỹ năng chuyên ngành",  # Sử dụng task_type từ DB
                        "incumbents_responding": r.incumbents_responding or 0, 
                        "task_id": r.task_id
                    } for r in rows
                ]
            else:
                rows2 = self.db.execute(
                    text(
                        """
                    SELECT DISTINCT dwa_title_en, dwa_title_vn
                    FROM core.career_dwas
                    WHERE onet_code = :onet_code LIMIT 5
                """
                    ),
                    {"onet_code": job_id},
                ).fetchall()
                all_tasks = [
                    {
                        "task_en": r.dwa_title_en,
                        "task_vi": r.dwa_title_vn or r.dwa_title_en,
                        "importance": 3.5,
                        "task_type": "Kỹ năng chuyên ngành"  # Fallback default
                    } for r in rows2
                ]

            def skill_name(t):
                vi = t.get("task_vi", "")
                en = t.get("task_en", "")
                
                # Kiểm tra nếu task_vi có trộn lẫn tiếng Anh (có từ tiếng Anh dài)
                if vi:
                    # Nếu task_vi chứa nhiều từ tiếng Anh, ưu tiên task_en
                    english_words = ['and', 'or', 'with', 'the', 'to', 'of', 'in', 'on', 'for', 'by', 'from', 'into', 'onto', 'under', 'after', 'before', 'during', 'using', 'providing']
                    english_count = sum(1 for word in english_words if word in vi.lower())
                    
                    # Nếu có quá nhiều từ tiếng Anh (>2), dùng task_en
                    if english_count > 2:
                        return en if en else vi
                    
                    # Nếu task_vi không bắt đầu bằng "Thực hiện các nhiệm vụ" và khác task_en
                    if vi != en and not vi.startswith("Thực hiện các nhiệm vụ"):
                        return vi
                
                # Fallback to English
                return en if en else vi

            top5 = [
                {
                    "skill_name": skill_name(t),
                    "skill_type": t.get("task_type", "Kỹ năng chuyên ngành"),  # Sử dụng task_type từ data
                    "importance": t.get("importance", 3.0),
                    "level": t.get("importance", 3.0),
                    "rank": i + 1,
                    "combined_score": t.get("importance", 3.0),
                    "is_hard_skill": True,
                }
                for i, t in enumerate(all_tasks[:5])
            ]

            _task_selection_cache[job_id] = top5
            return top5, all_tasks
        except Exception as e:
            print(f"[WARN] _get_hard_skills_fast failed: {e}")
            return [], []

    def _gemini_select_top_tasks(self, tasks: List[Dict], job_id: str) -> List[Dict]:
        """Dùng Gemini chọn 5 task quan trọng nhất - module-level cache + silent fallback"""
        global _task_selection_cache
        if job_id in _task_selection_cache:
            return _task_selection_cache[job_id]

        result = sorted(tasks, key=lambda x: -x.get("importance", 0))[:5]
        try:
            task_list = "\n".join([f"{i + 1}. {t['task_en']}" for i, t in enumerate(tasks[:20])])
            prompt = f"""You are selecting the 5 most important tasks for occupation code {job_id}.
From this list, pick the 5 most distinctive and important ones.
List:
{task_list}

Respond with ONLY a JSON object, no explanation:
{{"selected_indices": [1, 2, 3, 4, 5]}}"""

            response_text = self.gemini.stream_manager.generate_content_with_retry(prompt)
            if response_text:
                # Extract JSON robustly
                import json as _json
                import re as _re

                match = _re.search(r'\{[^{}]*"selected_indices"[^{}]*\}', response_text, _re.DOTALL)
                if match:
                    indices = _json.loads(match.group()).get("selected_indices", [])[:5]
                    selected = [tasks[i - 1] for i in indices if 1 <= i <= len(tasks)]
                    if len(selected) >= 3:
                        result = selected[:5]
        except Exception:
            pass

        _task_selection_cache[job_id] = result
        return result

    def start_interview(self, user_id: int, job_id: str, question_count: int = 5, jd_id: Optional[int] = None, level_slug: Optional[str] = None) -> InterviewSession:
        """Bắt đầu phiên phỏng vấn mới với số lượng câu hỏi tùy chỉnh, JD và level"""
        # Validate question count
        if question_count not in [5, 7, 8, 10, 12]:
            question_count = 5  # Default fallback

        # Xử lý JD nếu có
        jd_questions_count = 0
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
                    print(f"✅ JD loaded: {jd_questions_count} JD questions will be added")
            except Exception as e:
                print(f"⚠️ JD loading failed: {e}")

        # CRITICAL FIX: Tính total questions = sum của distribution (bao gồm closing)
        question_distribution = self._get_question_distribution(question_count, jd_questions_count)
        total_questions = sum(question_distribution.values())
        print(f"✅ InterviewService total questions: {question_count} base + {jd_questions_count} JD + 1 closing = {total_questions}")

        # Get question distribution (bao gồm cả JD questions)
        question_distribution = self._get_question_distribution(total_questions, jd_questions_count)

        # Lấy thông tin job - Postgres trước, Neo4j fallback
        job_title = self._get_job_title_from_postgres(job_id)
        if not job_title:
            job_info = self.neo4j.get_job_info(job_id)
            if not job_info:
                raise ValueError(f"Không tìm thấy nghề nghiệp với ID: {job_id}")
            job_title = job_info.get("title", f"Job {job_id}")

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

        # Combine skills context with type indicators - CHUẨN HÓA thứ tự field
        all_skills_context = []
        for skill in soft_skills_context:
            all_skills_context.append({
                "skill_name": skill.get("skill_name", ""),
                "skill_type": skill.get("skill_type", "Kỹ năng mềm"),
                "importance": skill.get("importance", 0.0),
                "level": skill.get("level", 0.0),
                "is_hard_skill": False,
                "source": "career"
            })

        for skill in hard_skills_context[:5]:  # Limit hard skills
            all_skills_context.append({
                "skill_name": skill.get("skill_name", ""),
                "skill_type": skill.get("skill_type", "Kỹ năng chuyên ngành"),
                "importance": skill.get("importance", 0.0),
                "level": skill.get("level", 0.0),
                "is_hard_skill": True,
                "source": "career"
            })

        # Tạo session mới với thông tin JD và level
        session = InterviewSession(
            user_id=user_id,
            job_id=job_id,
            job_title=job_title,
            skills_context=all_skills_context,
            status="active",
            question_count=total_questions,  # Tổng số câu hỏi bao gồm JD
            question_distribution=question_distribution,
            market_context={  # Lưu thông tin JD và level
                "jd_data": jd_data,
                "jd_questions_count": jd_questions_count,
                "level_slug": level_slug,
                "has_jd": jd_data is not None,
                "has_level": level_slug is not None
            }
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        # Tạo lời chào và câu hỏi đầu tiên với level context
        level_context = self._get_level_context(level_slug) if level_slug else None
        start_content = self.gemini.generate_interview_start(job_title, soft_skills_context, level_context)

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

    def _validate_answer_relevance(self, question: str, answer: str, job_title: str, question_type: str) -> Dict:
        """Validate if answer is relevant to the question and provide guidance if not"""
        if not answer or len(answer.strip()) < 3:
            return {"is_relevant": False, "reason": "empty", "guidance": None}
        
        # Check for obviously irrelevant answers
        irrelevant_patterns = [
            r'^\d+\s*(giờ|h|pm|am|:\d+)',  # Time patterns like "6 giờ", "6h", "6:30"
            r'^(ok|okay|yes|no|không|có|được|good|bad|maybe|hmm|wow|cool|nice)$',  # Single word responses
            r'^[^\w\s]*$',  # Only punctuation/symbols
            r'^\d+$',  # Only numbers
            r'^(haha|hehe|lol|:D|:P|\.\.\.)$',  # Casual expressions
        ]
        
        answer_clean = answer.strip().lower()
        
        # Check patterns
        for pattern in irrelevant_patterns:
            if re.match(pattern, answer_clean):
                return {
                    "is_relevant": False, 
                    "reason": "pattern_match",
                    "guidance": self._generate_guidance_for_irrelevant_answer(question, question_type, job_title)
                }
        
        # Use AI to check relevance for more complex cases
        try:
            relevance_prompt = f"""Đánh giá câu trả lời có liên quan đến câu hỏi phỏng vấn không:

Câu hỏi: {question}
Câu trả lời: {answer}
Vị trí: {job_title}

Trả về JSON (chỉ JSON):
{{"is_relevant": true/false, "confidence": 0.0-1.0, "reason": "lý do ngắn gọn"}}"""

            response_text = self.gemini.stream_manager.generate_content_with_retry(relevance_prompt)
            if response_text:
                import json as _json
                import re as _re
                match = _re.search(r'\{[^{}]*"is_relevant"[^{}]*\}', response_text)
                if match:
                    result = _json.loads(match.group())
                    if not result.get("is_relevant", True) and result.get("confidence", 0) > 0.7:
                        return {
                            "is_relevant": False,
                            "reason": "ai_detected", 
                            "guidance": self._generate_guidance_for_irrelevant_answer(question, question_type, job_title)
                        }
        except Exception:
            pass
        
        return {"is_relevant": True, "reason": "relevant", "guidance": None}

    def _generate_guidance_for_irrelevant_answer(self, question: str, question_type: str, job_title: str) -> str:
        """Generate guidance for irrelevant answers"""
        guidance_templates = {
            "warm_up": f"Hãy chia sẻ về động lực và mục tiêu của bạn khi ứng tuyển vị trí {job_title}. Câu trả lời nên thể hiện sự hiểu biết về công việc và lý do bạn phù hợp.",
            "technical": f"Đây là câu hỏi kỹ thuật về {job_title}. Hãy chia sẻ kinh nghiệm, kỹ năng hoặc công cụ cụ thể mà bạn đã sử dụng. Nếu chưa có kinh nghiệm, hãy nói về cách bạn sẽ học hỏi.",
            "behavioral": f"Câu hỏi này yêu cầu bạn chia sẻ kinh nghiệm thực tế từ quá khứ cho vị trí {job_title}. Hãy sử dụng phương pháp STAR: Tình huống (S) → Nhiệm vụ (T) → Hành động (A) → Kết quả (R).",
            "situational": f"Đây là câu hỏi tình huống giả định cho vị trí {job_title}. Hãy mô tả cách bạn sẽ xử lý tình huống này, bao gồm các bước cụ thể và lý do đằng sau quyết định của bạn."
        }
        
        return guidance_templates.get(question_type, f"Hãy trả lời câu hỏi một cách cụ thể và liên quan đến vị trí {job_title}. Câu trả lời nên thể hiện kỹ năng và kinh nghiệm của bạn.")

    def submit_answer(
        self, session_id: int, user_answer: str, has_audio: bool = False, audio_duration: float = None, is_skipped: bool = False
    ) -> Dict:
        """Gửi câu trả lời và nhận câu hỏi tiếp theo với intelligent validation"""
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

        # Enhanced skip detection - CHỈ skip khi user chủ động muốn skip
        is_skipped = is_skipped or user_answer.strip().lower() in ["skip", "bỏ qua", "next"]
        
        # Nếu answer rỗng, KHÔNG tự động skip mà vẫn đánh giá bình thường
        if user_answer.strip() == "":
            user_answer = "(Không trả lời)"  # Đánh dấu nhưng vẫn tiếp tục
        
        # Validate answer relevance if not skipped
        if not is_skipped:
            relevance_check = self._validate_answer_relevance(
                last_question.content, 
                user_answer, 
                session.job_title, 
                last_question.question_type or "general"
            )
            
            # If answer is irrelevant, provide guidance and ask for clarification
            if not relevance_check["is_relevant"]:
                return {
                    "status": "guidance_needed",
                    "message": "Câu trả lời chưa liên quan đến câu hỏi",
                    "guidance": relevance_check["guidance"],
                    "original_question": last_question.content,
                    "question_type": last_question.question_type,
                    "question_number": last_question.question_number,
                    "reason": relevance_check["reason"]
                }

        if is_skipped:
            # Enhanced skip handling with better guidance
            return self._handle_skipped_question(session, last_question)

        # Đánh giá câu trả lời bình thường với context kỹ năng
        evaluation = self.gemini.evaluate_answer(
            last_question.content,
            user_answer,
            session.job_title,
            skills_tested=last_question.skills_tested,
            question_type=last_question.question_type,
        )
        
        # Validate evaluation data to prevent database errors
        safe_evaluation = {
            "score": float(evaluation.get("score", 0)) if evaluation.get("score") is not None else 0.0,
            "detailed_scores": evaluation.get("detailed_scores") if isinstance(evaluation.get("detailed_scores"), dict) else {},
            "feedback": str(evaluation.get("feedback", "")) if evaluation.get("feedback") else "",
            "strengths": evaluation.get("strengths") if isinstance(evaluation.get("strengths"), list) else [],
            "weaknesses": evaluation.get("weaknesses") if isinstance(evaluation.get("weaknesses"), list) else [],
            "suggestion": str(evaluation.get("suggestion", "")) if evaluation.get("suggestion") else "",
        }
        
        answer_msg = InterviewMessage(
            session_id=session_id,
            role="candidate",
            content=user_answer,
            question_type=f"answer_{last_question.question_type}" if last_question.question_type else "answer",
            question_number=last_question.question_number,
            score=safe_evaluation["score"],
            detailed_scores=safe_evaluation["detailed_scores"],
            feedback=safe_evaluation["feedback"],
            strengths=safe_evaluation["strengths"],
            weaknesses=safe_evaluation["weaknesses"],
            suggestion=safe_evaluation["suggestion"],
            has_audio=has_audio,
            audio_duration=audio_duration,
        )
        self.db.add(answer_msg)
        self.db.flush()  # Flush để answer_msg có ID và visible trong session, nhưng chưa commit

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
            # Kết thúc phỏng vấn - commit answer trước rồi mới finish
            self.db.commit()
            finish_result = self._finish_interview(session)
            finish_result["evaluation"] = evaluation
            return finish_result
        else:
            # Tạo câu hỏi tiếp theo
            self.db.commit()
            next_result = self._generate_next_question(session)
            next_result["evaluation"] = evaluation
            return next_result

    def _handle_skipped_question(self, session: InterviewSession, last_question: InterviewMessage) -> Dict:
        """Handle skipped questions with enhanced guidance and no progression"""
        
        # Generate contextual guidance for the skipped question
        try:
            guidance_prompt = f"""Ứng viên bỏ qua câu hỏi phỏng vấn cho vị trí {session.job_title}:
"{last_question.content}"

Loại câu hỏi: {last_question.question_type}
Kỹ năng đang test: {', '.join(last_question.skills_tested or [])}

Hãy tạo:
1. Lời khuyên cụ thể về cách trả lời (2-3 câu)
2. Ví dụ câu trả lời mẫu ngắn gọn
3. Lý do tại sao câu hỏi này quan trọng

Trả về JSON:
{{"advice": "...", "example": "...", "importance": "..."}}"""

            response_text = self.gemini.stream_manager.generate_content_with_retry(guidance_prompt)
            guidance_data = {"advice": "Hãy cố gắng trả lời câu hỏi để thể hiện năng lực của bạn.", "example": "", "importance": ""}
            
            if response_text:
                import json as _json
                import re as _re
                match = _re.search(r'\{[\s\S]*\}', response_text)
                if match:
                    try:
                        guidance_data = _json.loads(match.group())
                    except:
                        pass
        except Exception:
            guidance_data = {
                "advice": "Hãy cố gắng trả lời câu hỏi để thể hiện năng lực của bạn.",
                "example": "Ví dụ: Chia sẻ kinh nghiệm cụ thể hoặc cách bạn sẽ xử lý tình huống.",
                "importance": "Câu hỏi này giúp đánh giá kỹ năng quan trọng cho vị trí này."
            }

        # Return guidance without progressing to next question
        guidance_text = f"{guidance_data.get('advice', '')} {guidance_data.get('example', '')} {guidance_data.get('importance', '')}"
        return {
            "status": "skipped_guidance",
            "message": "Bạn đã bỏ qua câu hỏi này",
            "guidance": guidance_text.strip(),
            "original_question": last_question.content,
            "question_type": last_question.question_type,
            "question_number": last_question.question_number,
            "skills_tested": last_question.skills_tested or [],
            "can_retry": True,
            "skip_count": self._get_skip_count(session.id)
        }

    def force_skip_question(self, session_id: int) -> Dict:
        """Force skip current question and move to next (when user confirms skip)"""
        session = self.db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session or session.status != "active":
            raise ValueError("Phiên phỏng vấn không hợp lệ hoặc đã kết thúc")

        # Get last question
        last_question = (
            self.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session_id, InterviewMessage.role == "interviewer")
            .order_by(InterviewMessage.timestamp.desc())
            .first()
        )

        if not last_question:
            raise ValueError("Không tìm thấy câu hỏi để bỏ qua")

        # Save skipped answer
        answer_msg = InterviewMessage(
            session_id=session_id,
            role="candidate",
            content="(Đã bỏ qua)",
            question_type=f"answer_{last_question.question_type}" if last_question.question_type else "answer",
            question_number=last_question.question_number,
            score=0,  # Low score for skipped
            detailed_scores={"technical": 0, "logic": 0, "communication": 0, "experience": 0, "attitude": 0},
            feedback="Câu hỏi đã được bỏ qua. Hãy cố gắng trả lời đầy đủ các câu hỏi tiếp theo.",
            strengths=[],
            weaknesses=["Bỏ qua câu hỏi"],
            suggestion="Trong các câu hỏi tiếp theo, hãy cố gắng trả lời đầy đủ để thể hiện năng lực.",
            has_audio=False,
            audio_duration=None,
        )
        self.db.add(answer_msg)

        # Check if interview should continue
        question_count = (
            self.db.query(InterviewMessage)
            .filter(
                InterviewMessage.session_id == session_id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_type != "greeting",
            )
            .count()
        )

        max_questions = session.question_count or 5

        if question_count >= max_questions:
            # End interview
            finish_result = self._finish_interview(session)
            finish_result["evaluation"] = {
                "score": 0,
                "feedback": "Câu hỏi đã được bỏ qua",
                "suggestion": "Hãy chuẩn bị tốt hơn cho lần phỏng vấn tiếp theo"
            }
            return finish_result
        else:
            # Generate next question
            next_result = self._generate_next_question(session)
            next_result["evaluation"] = {
                "score": 0,
                "feedback": "Câu hỏi đã được bỏ qua",
                "suggestion": "Hãy cố gắng trả lời câu hỏi tiếp theo đầy đủ"
            }
            return next_result

    def _get_skip_count(self, session_id: int) -> int:
        """Get number of skipped questions in this session"""
        return self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session_id,
            InterviewMessage.role == "candidate",
            InterviewMessage.content == ""
        ).count()

    def _generate_next_question(self, session: InterviewSession, suggested_question: str = None) -> Dict:
        """Tạo câu hỏi tiếp theo dựa trên phân bố động với JD và level support"""
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
        skills_for_question = self._select_skills_for_question(skills_context, question_type, question_number, session.id)

        # Chuẩn bị session context cho Gemini với null safety
        market_context = session.market_context or {}
        level_slug = market_context.get("level_slug")
        jd_data = market_context.get("jd_data")
        
        # Đảm bảo không null
        session_context = {
            "jd_data": jd_data if jd_data else None,
            "level_context": self._get_level_context(level_slug) if level_slug else None
        }

        # Generate câu hỏi từ Gemini với context
        if question_type == "closing":
            # Generate closing question
            next_question = f"Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay! Bạn có câu hỏi nào muốn hỏi về vị trí {session.job_title} hoặc công ty không?"
        else:
            next_question = self.gemini.generate_question(
                session.job_title, 
                skills_for_question, 
                question_history, 
                question_type,
                session_context
            )

        # Lưu câu hỏi mới
        question_msg = InterviewMessage(
            session_id=session.id,
            role="interviewer",
            content=next_question,
            question_type=question_type,
            question_number=question_number,
            skills_tested=[s.get("skill_name", "") for s in skills_for_question if s.get("skill_name")] if question_type != "closing" else [],
        )
        self.db.add(question_msg)
        self.db.commit()

        return {
            "status": "continue",
            "question": next_question,  # Changed from "next_question" to "question"
            "next_question": next_question,  # Keep both for compatibility
            "question_number": question_number,
            "question_type": question_type,
            "skills_tested": [s.get("skill_name", "") for s in skills_for_question if s.get("skill_name")],
            "skills_details": skills_for_question,
        }

    def _get_next_question_type(self, session: InterviewSession, question_number: int) -> str:
        """Xác định loại câu hỏi tiếp theo dựa trên distribution - nhất quán với ai_pipeline_service"""
        distribution = session.question_distribution or self._get_question_distribution(session.question_count or 5, 0)

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

        type_counts: dict = {}
        for q in existing_questions:
            qtype = q.question_type or "technical"
            type_counts[qtype] = type_counts.get(qtype, 0) + 1

        # Dùng distribution-based logic: theo thứ tự warm_up → jd_specific → technical → behavioral → situational → closing
        # Đảm bảo nhất quán với _create_question_distribution trong ai_pipeline_service
        order = ["warm_up", "jd_specific", "technical", "behavioral", "situational", "closing"]
        for qtype in order:
            needed = distribution.get(qtype, 0)
            current = type_counts.get(qtype, 0)
            if current < needed:
                return qtype

        # Fallback
        return "technical"

    def _select_skills_for_question(self, skills_context: List[Dict], question_type: str, question_number: int, session_id: int = None) -> List[Dict]:
        """
        Chọn skills phù hợp cho từng loại câu hỏi theo độ ưu tiên.
        Mỗi câu hỏi trả đúng 1 skill.
        - technical   → career hard skills (source != 'jd'), rotate by DB count
        - jd_specific → JD skills (source == 'jd'), rotate by DB count
        - behavioral  → soft skills, rotate by DB count
        - situational → soft skills, rotate with offset +1 vs behavioral
        - warm_up     → soft[0] or hard[0] fallback
        - closing     → []
        """
        if not skills_context:
            return []

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
                if value in (float('inf'), float('-inf')) or value != value:
                    return 0
                return value
            except (ValueError, TypeError):
                return 0

        soft_skills = sorted(
            [s for s in skills_context if not is_hard_skill_safe(s)],
            key=safe_importance, reverse=True
        )
        hard_skills = sorted(
            [s for s in skills_context if is_hard_skill_safe(s) and s.get("source") != "jd"],
            key=safe_importance, reverse=True
        )

        def db_count(qtype: str) -> int:
            if session_id is None:
                return 0
            return self.db.query(InterviewMessage).filter(
                InterviewMessage.session_id == session_id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_type == qtype
            ).count()

        if question_type == "technical":
            if not hard_skills:
                return []
            idx = db_count("technical") % len(hard_skills)
            return [hard_skills[idx]]

        elif question_type == "jd_specific":
            jd_skills = sorted(
                [s for s in skills_context if s.get("source") == "jd"],
                key=safe_importance, reverse=True
            )
            if not jd_skills:
                return []
            idx = db_count("jd_specific") % len(jd_skills)
            return [jd_skills[idx]]

        elif question_type == "behavioral":
            if not soft_skills:
                return []
            idx = db_count("behavioral") % len(soft_skills)
            return [soft_skills[idx]]

        elif question_type == "situational":
            if not soft_skills:
                return []
            sit_count = db_count("situational")
            offset = 1 if len(soft_skills) >= 2 else 0
            idx = (sit_count + offset) % len(soft_skills)
            return [soft_skills[idx]]

        elif question_type == "closing":
            return []

        else:  # warm_up
            return soft_skills[:1] if soft_skills else hard_skills[:1]

    def _finish_interview(self, session: InterviewSession) -> Dict:
        """Kết thúc phỏng vấn và tạo báo cáo - chỉ mark completed khi có closing question"""
        # Lấy tất cả messages
        messages = (
            self.db.query(InterviewMessage)
            .filter(InterviewMessage.session_id == session.id)
            .order_by(InterviewMessage.timestamp)
            .all()
        )

        # Check if there's a closing question - this determines true completion
        has_closing = any(
            m.question_type == 'closing' and m.role == 'interviewer'
            for m in messages
        )

        # Tạo lịch sử phỏng vấn - ghép đúng cặp question/answer theo question_number
        interview_history = []
        scores_history = []

        # Lấy tất cả interviewer questions (không phải greeting)
        questions = [m for m in messages if m.role == 'interviewer' and m.question_type != 'greeting']
        # Lấy tất cả candidate answers
        answers = [m for m in messages if m.role == 'candidate']

        for q in questions:
            # Tìm answer tương ứng theo question_number
            matching_answer = next(
                (a for a in answers if a.question_number == q.question_number),
                None
            )
            if matching_answer:
                interview_history.append({
                    "question": q.content,
                    "answer": matching_answer.content,
                    "score": matching_answer.score or 0
                })
                if matching_answer.score:
                    scores_history.append(matching_answer.score)

        # Tạo báo cáo tổng kết
        summary = self.gemini.generate_final_summary(interview_history, scores_history, session.job_title)

        # Cập nhật session - chỉ mark completed nếu có closing question
        session.status = "completed" if has_closing else "abandoned"
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
                "question_count": session.question_count,
                "question_distribution": session.question_distribution,
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

    def abandon_interview(self, session_id: int, user_id: int) -> bool:
        """Mark interview session as abandoned"""
        try:
            session = (
                self.db.query(InterviewSession)
                .filter(InterviewSession.id == session_id)
                .filter(InterviewSession.user_id == user_id)
                .first()
            )
            
            if not session:
                return False
                
            session.status = 'abandoned'
            session.completed_at = datetime.utcnow()
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e

    def get_user_interviews(self, user_id: int, limit: int = 20, offset: int = 0) -> Dict:
        """Lấy danh sách phỏng vấn của user với pagination."""
        from sqlalchemy import text as _sql

        # Step 1: mark stale active sessions (>2h old) as abandoned via raw SQL
        try:
            self.db.execute(_sql(
                "UPDATE interview.interview_sessions "
                "SET status = 'abandoned' "
                "WHERE user_id = :uid AND status = 'active' "
                "AND started_at < NOW() - INTERVAL '2 hours'"
            ), {"uid": user_id})
            self.db.commit()
        except Exception:
            self.db.rollback()

        # Step 2: fetch all non-active sessions
        sessions = (
            self.db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .filter(InterviewSession.status != 'active')
            .order_by(InterviewSession.started_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        total_count = (
            self.db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .filter(InterviewSession.status != 'active')
            .count()
        )

        interviews = []
        for s in sessions:
            interviews.append({
                "id": s.id,
                "job_title": s.job_title,
                "status": s.status,
                "started_at": s.started_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "overall_score": s.overall_score,
                "recommendation": s.recommendation,
                "question_count": s.question_count,
            })

        return {
            "interviews": interviews,
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total_count
        }

    def _get_level_context(self, level_slug: str) -> Optional[Dict]:
        """Lấy thông tin về cấp bậc nghề nghiệp"""
        if not level_slug:
            return None
            
        level_mapping = {
            "fresher": {
                "name": "Fresher",
                "experience": "0-1 năm",
                "difficulty": "cơ bản",
                "focus": "kiến thức nền tảng, thái độ học hỏi, tiềm năng phát triển"
            },
            "junior": {
                "name": "Junior", 
                "experience": "1-3 năm",
                "difficulty": "trung bình",
                "focus": "kỹ năng thực hành, kinh nghiệm dự án, khả năng làm việc nhóm"
            },
            "middle": {
                "name": "Middle",
                "experience": "3-5 năm", 
                "difficulty": "trung bình khá",
                "focus": "giải quyết vấn đề phức tạp, mentoring, thiết kế hệ thống"
            },
            "senior": {
                "name": "Senior",
                "experience": "5+ năm",
                "difficulty": "khó",
                "focus": "kiến trúc hệ thống, leadership, ra quyết định kỹ thuật"
            },
            "lead": {
                "name": "Lead",
                "experience": "7+ năm",
                "difficulty": "rất khó", 
                "focus": "quản lý team, chiến lược kỹ thuật, mentoring nhiều người"
            }
        }
        
        return level_mapping.get(level_slug.lower())

    def __del__(self):
        """Cleanup khi service bị destroy"""
        try:
            if hasattr(self, "neo4j") and self.neo4j:
                self.neo4j.close()
        except Exception:
            pass
