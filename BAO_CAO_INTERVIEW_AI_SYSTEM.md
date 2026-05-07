# BÁO CÁO HỆ THỐNG INTERVIEW AI - LUỒNG CHẠY VÀ LOGIC XỬ LÝ

**Dự án:** AI-Based Career Recommendation System (SRC)  
**Ngày tạo:** 21/04/2026  
**Phiên bản:** 1.0  
**Tác giả:** Phân tích từ source code  

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục đích
Hệ thống Interview AI là một module phỏng vấn thử nghiệm thông minh, sử dụng AI để:
- Tạo câu hỏi phỏng vấn tự động dựa trên nghề nghiệp và JD
- Đánh giá câu trả lời của ứng viên theo nhiều tiêu chí
- Cung cấp feedback chi tiết và gợi ý cải thiện
- Hỗ trợ nhiều cấp độ kinh nghiệm (Fresher, Junior, Middle, Senior, Lead)

### 1.2 Kiến trúc tổng thể
```
Frontend (Next.js) ↔ FastAPI Backend ↔ AI Services (Gemini) ↔ Databases (PostgreSQL + Neo4j)
```

### 1.3 Công nghệ sử dụng
- **Backend:** FastAPI (Python 3.10+)
- **AI Engine:** Google Gemini API với Multi-Stream Manager
- **Database chính:** PostgreSQL (lưu sessions, messages, scores)
- **Graph Database:** Neo4j (lưu skills, job relationships)
- **File Processing:** PyPDF2, python-docx (xử lý JD files)

---

## 2. CẤU TRÚC MODULE VÀ THÀNH PHẦN

### 2.1 Cấu trúc thư mục
```
apps/backend/app/modules/interview/
├── models.py              # Database models (SQLAlchemy)
├── schemas.py             # Pydantic schemas (API contracts)
├── routes.py              # FastAPI endpoints
├── services.py            # Core interview logic
├── ai_pipeline_service.py # AI pipeline integration
├── jd_service.py          # Job Description processing
├── context_builder.py     # Context merging logic
└── __init__.py
```

### 2.2 Database Models chính

#### InterviewSession
```python
- id: Primary key
- user_id: ID người dùng
- job_id: O*NET code nghề nghiệp
- job_title: Tên nghề nghiệp
- question_count: Số câu hỏi (5-12)
- status: active/completed/abandoned
- overall_score: Điểm tổng (0-10)
- technical_score, communication_score, logic_score, etc.
- recommendation: PASS/CONDITIONAL_PASS/FAIL
- skills_context: JSON context từ Neo4j
```

#### InterviewMessage
```python
- id: Primary key
- session_id: FK to InterviewSession
- role: interviewer/candidate
- content: Nội dung tin nhắn
- question_type: greeting/technical/behavioral/etc.
- question_number: Thứ tự câu hỏi
- score: Điểm câu trả lời (0-10)
- detailed_scores: JSON chi tiết
- feedback: Nhận xét AI
```

#### JobDescription
```python
- id: Primary key
- user_id: ID người dùng
- career_id: ID nghề nghiệp
- raw_content: Nội dung JD gốc
- extracted_data: JSON đã parse
- source: manual/pdf/docx
```

---

## 3. LUỒNG CHẠY CHI TIẾT TỪ A-Z

### 3.1 Phase 1: Chuẩn bị JD (Tùy chọn)

#### Endpoint: `/jd/manual` hoặc `/jd/upload`

**Luồng xử lý JD thủ công:**
1. User gửi POST request với `career_id` và `content`
2. `JDService.save_jd()` được gọi
3. `parse_jd_text()` sử dụng Gemini để parse JD thành JSON:
   ```json
   {
     "required_skills": ["Python", "FastAPI", "PostgreSQL"],
     "tools": ["Docker", "Git", "VS Code"],
     "responsibilities": ["Phát triển API", "Tối ưu database"],
     "experience_level": "Junior",
     "domain": "Backend Development",
     "company_name": "Tech Corp",
     "training_program": ["Onboarding", "Mentoring"]
   }
   ```
4. `calc_jd_questions_count()` tính số câu hỏi JD (1-3 câu)
5. Lưu vào database và trả về `JDResponse`

**Luồng xử lý JD file:**
1. User upload PDF/DOCX file
2. `extract_pdf_text()` hoặc `extract_docx_text()` trích xuất text
3. Tiếp tục như luồng manual

### 3.2 Phase 2: Bắt đầu phỏng vấn

#### Endpoint: `/start`

**Input:**
```json
{
  "job_id": "15-1252.00",
  "question_count": 7,
  "jd_id": 123,
  "level_slug": "junior"
}
```

**Luồng xử lý:**

1. **Lấy context từ Neo4j:**
   ```python
   career_context = neo4j_service.get_job_skills(job_id)
   # Trả về: job title, skills list, work activities
   ```

2. **Lấy Career Level context:**
   ```python
   level_context = {
     "level": "Junior",
     "experience_range": "1-3 năm",
     "interview_focus": ["Kiến thức cơ bản", "Khả năng học hỏi"],
     "group": "Technology"
   }
   ```

3. **Merge contexts với priority:**
   ```
   Level Context > JD Data > Neo4j Context
   ```
   - `build_interview_context()` kết hợp tất cả data
   - Xác định `effective_level` cuối cùng

4. **Tạo InterviewSession:**
   ```python
   session = InterviewSession(
     user_id=user_id,
     job_id=job_id,
     job_title=career_context['title'],
     question_count=total_questions,
     skills_context=career_context
   )
   ```

5. **Generate greeting và first question:**
   ```python
   greeting = _generate_enhanced_greeting(job_title, skills)
   first_question = _generate_enhanced_first_question(context, level)
   ```

6. **Lưu messages và trả về:**
   ```json
   {
     "session_id": 456,
     "job_title": "Software Developer",
     "greeting": "Xin chào! Tôi là AI interviewer...",
     "first_question": "Hãy giới thiệu về bản thân...",
     "skills_context": [...],
     "question_count": 7
   }
   ```

### 3.3 Phase 3: Vòng lặp Q&A

#### Endpoint: `/submit-answer`

**Input:**
```json
{
  "session_id": 456,
  "answer": "Tôi có 2 năm kinh nghiệm Python...",
  "has_audio": false,
  "is_skipped": false
}
```

**Luồng xử lý:**

1. **Validate session:**
   ```python
   session = db.query(InterviewSession).filter(
     InterviewSession.id == session_id,
     InterviewSession.status == "active"
   ).first()
   ```

2. **Lưu câu trả lời:**
   ```python
   answer_msg = InterviewMessage(
     session_id=session_id,
     role="candidate",
     content=answer,
     question_type=f"answer_{current_question_number}"
   )
   ```

3. **Đánh giá câu trả lời bằng AI:**
   ```python
   evaluation = _evaluate_answer_with_ai(
     question=current_question,
     answer=answer,
     context=session.skills_context,
     question_type=question_type
   )
   ```

4. **Cập nhật scores:**
   ```python
   answer_msg.score = evaluation['overall_score']
   answer_msg.detailed_scores = {
     'technical': evaluation['technical'],
     'communication': evaluation['communication'],
     'logic': evaluation['logic']
   }
   answer_msg.feedback = evaluation['feedback']
   ```

5. **Generate câu hỏi tiếp theo:**
   - Kiểm tra `current_question_number < question_count`
   - Xác định loại câu hỏi tiếp theo (technical/behavioral/situational)
   - Sử dụng AI để tạo câu hỏi phù hợp với context

6. **Trả về response:**
   ```json
   {
     "next_question": "Bạn có thể giải thích về...",
     "question_type": "technical",
     "question_number": 3,
     "is_final": false,
     "evaluation": {
       "score": 7.5,
       "feedback": "Câu trả lời tốt...",
       "strengths": ["Kinh nghiệm thực tế"],
       "suggestions": ["Nên chi tiết hơn về..."]
     }
   }
   ```

### 3.4 Phase 4: Kết thúc và tổng kết

#### Endpoint: `/submit-answer` (câu cuối)

**Khi `question_number >= question_count`:**

1. **Tính toán điểm tổng thể:**
   ```python
   all_scores = [msg.score for msg in messages if msg.score]
   overall_score = sum(all_scores) / len(all_scores)
   
   # Tính điểm theo từng category
   technical_scores = [msg.detailed_scores.get('technical') 
                      for msg in technical_messages]
   technical_score = sum(technical_scores) / len(technical_scores)
   ```

2. **Xác định recommendation:**
   ```python
   if overall_score >= 8.0:
       recommendation = "PASS"
   elif overall_score >= 6.0:
       recommendation = "CONDITIONAL_PASS"
   else:
       recommendation = "FAIL"
   ```

3. **Generate summary và insights:**
   ```python
   summary = _generate_interview_summary(
     messages=all_messages,
     scores=all_scores,
     skills_context=session.skills_context
   )
   ```

4. **Cập nhật session:**
   ```python
   session.status = "completed"
   session.completed_at = datetime.utcnow()
   session.overall_score = overall_score
   session.recommendation = recommendation
   session.summary = summary['summary']
   session.key_strengths = summary['strengths']
   session.key_weaknesses = summary['weaknesses']
   session.learning_recommendations = summary['learning_recs']
   ```

5. **Trả về kết quả cuối:**
   ```json
   {
     "is_completed": true,
     "overall_score": 7.2,
     "recommendation": "CONDITIONAL_PASS",
     "summary": "Ứng viên thể hiện kiến thức cơ bản tốt...",
     "detailed_scores": {
       "technical": 7.0,
       "communication": 8.0,
       "logic": 6.5,
       "experience": 7.5,
       "attitude": 8.5
     },
     "key_strengths": ["Giao tiếp tốt", "Thái độ tích cực"],
     "key_weaknesses": ["Thiếu kinh nghiệm thực tế"],
     "learning_recommendations": [
       {
         "skill": "Advanced Python",
         "priority": "HIGH",
         "suggested_courses": ["Python Advanced Course"],
         "estimated_time": "2-3 tháng"
       }
     ]
   }
   ```

---

## 4. LOGIC XỬ LÝ AI VÀ PROMPT ENGINEERING

### 4.1 Gemini Multi-Stream Manager

**Cấu hình:**
```python
multi_stream_manager = GeminiMultiStreamManager(
    api_keys=[key1, key2, key3],  # Multiple API keys for load balancing
    max_retries=3,
    retry_delay=1.0,
    rate_limit_delay=2.0
)
```

**Các stream chính:**
- **Stream 1:** Question Generation
- **Stream 2:** Answer Evaluation  
- **Stream 3:** Context Analysis
- **Stream 4:** Summary Generation

### 4.2 Prompt Templates chính

#### 4.2.1 Greeting Generation
```python
def _generate_enhanced_greeting(job_title: str, skills: List[Dict]) -> str:
    top_skills = [s['skill_name'] for s in skills[:3]]
    prompt = f"""
    Tạo lời chào chuyên nghiệp cho phỏng vấn vị trí {job_title}.
    Kỹ năng chính: {', '.join(top_skills)}
    
    Yêu cầu:
    - Thân thiện, chuyên nghiệp
    - Giới thiệu vai trò AI interviewer
    - Đề cập đến vị trí và kỹ năng chính
    - Khuyến khích ứng viên tự tin
    - Độ dài: 2-3 câu
    """
```

#### 4.2.2 Question Generation
```python
def _generate_enhanced_first_question(context: Dict, level: str) -> str:
    prompt = f"""
    Tạo câu hỏi mở đầu cho phỏng vấn vị trí {context['title']} cấp độ {level}.
    
    Context:
    - Kỹ năng chính: {context['skills'][:5]}
    - Cấp độ: {level}
    - Kinh nghiệm: {context.get('experience_range', 'Không xác định')}
    
    Yêu cầu:
    - Câu hỏi mở, cho phép ứng viên giới thiệu
    - Phù hợp với cấp độ kinh nghiệm
    - Tạo không khí thoải mái
    - Có thể đánh giá được communication skills
    """
```

#### 4.2.3 Answer Evaluation
```python
def _evaluate_answer_with_ai(question: str, answer: str, context: Dict, question_type: str) -> Dict:
    prompt = f"""
    Đánh giá câu trả lời phỏng vấn sau:
    
    QUESTION: {question}
    ANSWER: {answer}
    QUESTION_TYPE: {question_type}
    JOB_CONTEXT: {json.dumps(context, ensure_ascii=False)}
    
    Đánh giá theo 5 tiêu chí (thang điểm 0-10):
    1. TECHNICAL: Độ chính xác kỹ thuật
    2. COMMUNICATION: Khả năng diễn đạt
    3. LOGIC: Tư duy logic, cấu trúc câu trả lời
    4. EXPERIENCE: Thể hiện kinh nghiệm thực tế
    5. ATTITUDE: Thái độ, sự tự tin
    
    Trả về JSON:
    {{
      "overall_score": 7.5,
      "technical": 8.0,
      "communication": 7.0,
      "logic": 7.5,
      "experience": 7.0,
      "attitude": 8.0,
      "feedback": "Câu trả lời thể hiện...",
      "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
      "weaknesses": ["Điểm yếu 1"],
      "suggestions": ["Gợi ý cải thiện 1", "Gợi ý 2"],
      "skills_demonstrated": ["Skill 1", "Skill 2"]
    }}
    """
```

### 4.3 Question Type Distribution

**Logic phân bổ câu hỏi:**
```python
def _calculate_question_distribution(total_questions: int, has_jd: bool, jd_questions: int) -> Dict:
    base_questions = total_questions - jd_questions
    
    distribution = {
        "greeting": 1,
        "warm_up": 1,
        "technical": max(2, base_questions // 3),
        "behavioral": max(1, base_questions // 4),
        "situational": max(1, base_questions // 5),
        "closing": 1
    }
    
    if has_jd:
        distribution["jd_specific"] = jd_questions
    
    return distribution
```

### 4.4 Adaptive Question Generation

**Logic thích ứng theo performance:**
```python
def _get_next_question_type(current_scores: List[float], question_number: int) -> str:
    avg_score = sum(current_scores) / len(current_scores) if current_scores else 5.0
    
    if avg_score < 5.0:
        # Ứng viên yếu -> câu hỏi cơ bản hơn
        return "warm_up" if question_number < 4 else "behavioral"
    elif avg_score > 8.0:
        # Ứng viên mạnh -> câu hỏi khó hơn
        return "technical" if question_number < 6 else "situational"
    else:
        # Cân bằng
        return ["technical", "behavioral", "situational"][question_number % 3]
```

---

## 5. CHẤM ĐIỂM VÀ ĐÁNH GIÁ

### 5.1 Hệ thống chấm điểm đa chiều

**5 tiêu chí chính (thang điểm 0-10):**

1. **TECHNICAL (Kỹ thuật):**
   - Độ chính xác kiến thức chuyên môn
   - Sử dụng thuật ngữ đúng
   - Hiểu biết về tools/technologies
   - Khả năng giải quyết vấn đề kỹ thuật

2. **COMMUNICATION (Giao tiếp):**
   - Khả năng diễn đạt rõ ràng
   - Cấu trúc câu trả lời logic
   - Sử dụng ngôn ngữ phù hợp
   - Khả năng giải thích phức tạp đơn giản

3. **LOGIC (Tư duy):**
   - Tư duy phân tích
   - Khả năng reasoning
   - Cấu trúc giải quyết vấn đề
   - Tính nhất quán trong lập luận

4. **EXPERIENCE (Kinh nghiệm):**
   - Thể hiện kinh nghiệm thực tế
   - Ví dụ cụ thể từ dự án
   - Lessons learned
   - Khả năng áp dụng kiến thức

5. **ATTITUDE (Thái độ):**
   - Sự tự tin
   - Thái độ học hỏi
   - Khả năng làm việc nhóm
   - Motivation và passion

### 5.2 Thuật toán tính điểm tổng thể

```python
def calculate_overall_score(detailed_scores: List[Dict]) -> Dict:
    # Trọng số theo loại câu hỏi
    weights = {
        "technical": 0.35,
        "behavioral": 0.25,
        "situational": 0.20,
        "warm_up": 0.10,
        "jd_specific": 0.10
    }
    
    weighted_scores = []
    for score_data in detailed_scores:
        question_type = score_data['question_type']
        weight = weights.get(question_type, 0.20)
        weighted_score = score_data['overall_score'] * weight
        weighted_scores.append(weighted_score)
    
    overall_score = sum(weighted_scores) / sum(weights.values())
    
    # Tính điểm từng category
    category_scores = {}
    for category in ['technical', 'communication', 'logic', 'experience', 'attitude']:
        category_values = [s[category] for s in detailed_scores if s.get(category)]
        category_scores[category] = sum(category_values) / len(category_values) if category_values else 0
    
    return {
        "overall_score": round(overall_score, 1),
        "category_scores": category_scores
    }
```

### 5.3 Logic xác định Recommendation

```python
def determine_recommendation(overall_score: float, category_scores: Dict) -> str:
    # Rule-based recommendation
    if overall_score >= 8.0:
        return "PASS"
    
    if overall_score >= 6.0:
        # Kiểm tra điểm technical có quá thấp không
        if category_scores.get('technical', 0) < 5.0:
            return "FAIL"  # Technical quá yếu
        
        # Kiểm tra có ít nhất 3/5 category >= 6.0
        good_categories = sum(1 for score in category_scores.values() if score >= 6.0)
        if good_categories >= 3:
            return "CONDITIONAL_PASS"
        else:
            return "FAIL"
    
    return "FAIL"
```

---

## 6. TÍCH HỢP VÀ LUỒNG DỮ LIỆU

### 6.1 Tích hợp với Neo4j Graph Database

**Lấy skills context:**
```cypher
MATCH (j:Job {onet_code: $job_id})-[:REQUIRES_SKILL]->(s:Skill)
OPTIONAL MATCH (j)-[:HAS_WORK_ACTIVITY]->(wa:WorkActivity)
RETURN j.title as job_title,
       collect(DISTINCT {
         skill_name: s.name,
         skill_type: s.type,
         importance: r.importance,
         level: r.level
       }) as skills,
       collect(DISTINCT wa.description) as work_activities
LIMIT 20
```

**Fallback mechanism:**
```python
def get_job_skills(self, job_id: str, use_fallback: bool = True) -> List[Dict]:
    try:
        # Try Neo4j first
        return self._query_neo4j_skills(job_id)
    except Exception as e:
        if use_fallback:
            # Use hardcoded skills for common jobs
            return self._get_fallback_skills(job_id)
        return []
```

### 6.2 Context Building Pipeline

**Priority-based merging:**
```python
def build_interview_context(neo4j_context: Dict, jd_data: Optional[Dict], level_context: Optional[Dict]) -> Dict:
    # Start with Neo4j base
    context = dict(neo4j_context)
    
    # Layer 2: JD data
    if jd_data:
        context = merge_jd_context(context, jd_data)
    
    # Layer 3: Career level (highest priority)
    if level_context:
        context = merge_level_context(context, level_context)
    
    return context
```

### 6.3 Error Handling và Resilience

**Multi-level fallback:**
1. **Neo4j failure** → Use cached skills data
2. **Gemini API failure** → Use backup API keys
3. **Complete AI failure** → Use template-based questions
4. **Database failure** → Return graceful error messages

**Retry mechanisms:**
```python
@retry(max_attempts=3, delay=1.0, exponential_backoff=True)
def generate_content_with_retry(self, prompt: str) -> str:
    try:
        return self.gemini_client.generate_content(prompt)
    except RateLimitError:
        time.sleep(self.rate_limit_delay)
        raise
    except Exception as e:
        logger.warning(f"Gemini API error: {e}")
        raise
```

---

## 7. PERFORMANCE VÀ TỐI ƯU HÓA

### 7.1 Caching Strategy

**Redis caching cho:**
- Neo4j query results (TTL: 1 hour)
- JD parsing results (TTL: 24 hours)  
- Common question templates (TTL: 1 week)

### 7.2 Async Processing

**ThreadPoolExecutor cho:**
- File processing (PDF/DOCX)
- Multiple AI API calls
- Database batch operations

### 7.3 Rate Limiting

**Gemini API management:**
- Multiple API keys rotation
- Request rate limiting (60 RPM per key)
- Exponential backoff on failures
- Circuit breaker pattern

---

## 8. MONITORING VÀ LOGGING

### 8.1 Key Metrics

**Business metrics:**
- Interview completion rate
- Average session duration
- Score distribution
- User satisfaction ratings

**Technical metrics:**
- API response times
- AI generation latency
- Database query performance
- Error rates by component

### 8.2 Logging Strategy

**Structured logging:**
```python
logger.info("Interview started", extra={
    "user_id": user_id,
    "job_id": job_id,
    "session_id": session.id,
    "question_count": question_count,
    "has_jd": bool(jd_id),
    "level": level_slug
})
```

---

## 9. SECURITY VÀ COMPLIANCE

### 9.1 Data Protection

**Sensitive data handling:**
- User answers encrypted at rest
- PII masking in logs
- Session data retention policy (90 days)
- GDPR compliance for data deletion

### 9.2 API Security

**Authentication & Authorization:**
- JWT token validation
- User session verification
- Rate limiting per user
- Input sanitization

---

## 10. FUTURE ENHANCEMENTS

### 10.1 Planned Features

1. **Voice Interview Support:**
   - Speech-to-text integration
   - Voice analysis for confidence/stress
   - Real-time transcription

2. **Advanced AI Pipeline:**
   - TypeScript-based question chains
   - Multi-modal evaluation (text + voice)
   - Personalized question adaptation

3. **Enhanced Analytics:**
   - Interview performance trends
   - Skill gap analysis
   - Industry benchmarking

### 10.2 Technical Improvements

1. **Microservices Architecture:**
   - Separate AI service
   - Dedicated evaluation service
   - Event-driven communication

2. **Real-time Features:**
   - WebSocket for live interviews
   - Real-time feedback
   - Live coaching suggestions

---

## 11. KẾT LUẬN

Hệ thống Interview AI là một giải pháp toàn diện cho phỏng vấn thử nghiệm, kết hợp:

**Điểm mạnh:**
- ✅ AI-powered question generation và evaluation
- ✅ Multi-dimensional scoring system
- ✅ Flexible context building (Neo4j + JD + Career Level)
- ✅ Robust error handling và fallback mechanisms
- ✅ Scalable architecture với async processing

**Thách thức:**
- ⚠️ Dependency on external AI services
- ⚠️ Complex context merging logic
- ⚠️ Performance optimization for real-time responses

**Tổng kết:** Hệ thống đã được thiết kế với kiến trúc modular, có khả năng mở rộng và tích hợp tốt với các component khác trong dự án SRC. Logic AI được tối ưu hóa cho trải nghiệm người dùng tự nhiên và đánh giá chính xác.

---

**Tài liệu này được tạo tự động từ phân tích source code vào ngày 21/04/2026**