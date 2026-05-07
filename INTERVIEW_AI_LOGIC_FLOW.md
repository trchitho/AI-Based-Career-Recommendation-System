# CHỨC NĂNG AI MOCK INTERVIEW — LOGIC CODE & LUỒNG CHẠY TỪ A-Z

> Phiên bản: Cập nhật theo source code thực tế (tháng 4/2026)

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Frontend (React + TypeScript)
        │  HTTP REST API
        ▼
FastAPI Backend (Python 3.10+)
        │
        ├── AIPipelineService   ← Xử lý chính toàn bộ luồng phỏng vấn
        ├── JDService           ← Parse & lưu Job Description
        ├── InterviewService    ← Fallback & lịch sử
        └── GeminiService       ← Gọi Gemini AI (multi-stream)
        │
        ├── PostgreSQL (schema: interview)   ← Lưu sessions, messages, scores
        ├── Neo4j                            ← Skills & job relationships
        └── Google Gemini API               ← Sinh câu hỏi & đánh giá
```

**File chính:**
```
apps/backend/app/modules/interview/
├── routes.py              # API endpoints (FastAPI)
├── ai_pipeline_service.py # Logic pipeline chính (~2700 dòng)
├── services.py            # GeminiService, Neo4jService, fallback
├── jd_service.py          # Parse JD bằng Gemini
├── context_builder.py     # Merge context (Neo4j + JD + Level)
├── models.py              # SQLAlchemy models
└── schemas.py             # Pydantic schemas

apps/frontend/src/
├── pages/InterviewPage.tsx          # Giao diện chat phỏng vấn
├── pages/InterviewSelectionPage.tsx # Chọn nghề nghiệp
├── pages/InterviewResultsPage.tsx   # Kết quả
└── services/interviewService.ts     # API client
```

---

## 2. DATABASE SCHEMA

### Schema: `interview` (PostgreSQL)

#### `interview_sessions`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | SERIAL PK | ID phiên |
| user_id | INTEGER | FK → core.users |
| job_id | VARCHAR | O*NET code (VD: "15-1252.00") |
| job_title | VARCHAR | Tên nghề nghiệp |
| question_count | INTEGER | Tổng số câu hỏi |
| question_distribution | JSONB | Phân bổ loại câu hỏi |
| status | VARCHAR | active / completed / abandoned |
| overall_score | FLOAT | Điểm tổng (0–10) |
| technical/communication/logic/experience/attitude_score | FLOAT | Điểm từng tiêu chí |
| recommendation | VARCHAR | PASS / CONDITIONAL_PASS / FAIL |
| skills_context | JSONB | Skills từ Neo4j + JD |
| market_context | JSONB | JD data, level, effective_level, has_jd |

#### `interview_messages`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | SERIAL PK | ID message |
| session_id | INTEGER | FK → interview_sessions |
| role | VARCHAR | interviewer / candidate |
| content | TEXT | Nội dung |
| question_type | VARCHAR | greeting / warm_up / jd_specific / technical / behavioral / situational / jd_qualification / closing / closing_response |
| question_number | INTEGER | Thứ tự câu hỏi |
| score | FLOAT | Điểm câu trả lời (NULL cho jd_qualification/closing) |
| detailed_scores | JSONB | {technical, logic, communication, experience, attitude} |
| feedback | TEXT | Nhận xét AI |

#### `job_descriptions`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | SERIAL PK | ID JD |
| user_id | INTEGER | FK → core.users |
| career_id | VARCHAR | O*NET code (nullable) |
| raw_text | TEXT | Nội dung JD gốc |
| extracted_data | JSONB | JSON đã parse + `skills_context` đã persist |
| source | VARCHAR | manual / pdf / docx |

---

## 3. HAI LUỒNG CHÍNH

Hệ thống hỗ trợ 2 luồng tùy theo user có upload JD hay không:

| | Có JD | Không có JD |
|---|---|---|
| jd_specific | Có (1–3 câu) | Không |
| jd_qualification | Có (1–3 câu) | Không |
| technical | Dùng JD Requirements | Dùng career hard skills |
| closing | Đề cập tên công ty từ JD | Generic, không đề cập công ty cụ thể |
| Total questions | base + jd_specific + jd_qualification + 1 | base + 1 |

---

## 4. LUỒNG CHẠY TỪ A-Z

### PHASE 0: Upload JD (Tùy chọn)

```
POST /api/interview/jd/upload?career_id=15-1252.00
POST /api/interview/jd/manual
```

1. Gemini parse JD → `extracted_data` (required_skills, tools, qualifications, company_name, benefits, training_program...)
2. `calc_jd_questions_count()` → số câu `jd_specific` (1–3)
3. Build `skills_context` = soft skills từ career + JD hard skills
4. **PERSIST** `skills_context` vào `jd.extracted_data["skills_context"]` trong DB
5. Trả về `JDResponse` với `jd_id`

---

### PHASE 1: Bắt đầu phỏng vấn

```
POST /api/interview/start
{
  "job_id": "15-1252.00",
  "question_count": 5,
  "jd_id": 128,        // nullable
  "level_slug": "fresher"
}
```

**`AIPipelineService.start_interview()`:**

1. **Idempotency check** — session active trong 30s gần nhất với cùng job/jd/level → trả về session cũ
2. **Career context** từ PostgreSQL (soft skills + hard skills)
3. **Level context** từ `_get_level_context(level_slug)`
4. **JD data** (nếu có `jd_id`):
   - Load `jd.extracted_data` từ DB (đã có `skills_context` persist)
   - `jd_questions_count` = `calc_jd_questions_count()`
   - `jd_qualification_count` = đếm skills có `skill_type == "JD Qualification"` trong `skills_context`
5. **Build context**: `build_interview_context(career, jd_data, level)` — Priority: Level > JD > Career
6. **Tính total questions**:
   - Có JD: `total = base + jd_specific + jd_qualification + 1`
   - Không JD: `total = base + 1`
7. **`_create_question_distribution()`** — tạo phân bổ câu hỏi
8. **Tạo `InterviewSession`** với `market_context` persist đầy đủ:
   ```json
   {
     "effective_level": "fresher",
     "has_jd": true,
     "jd_questions_count": 3,
     "jd_qualification_count": 3,
     "jd_data": {...},
     "level_context": {...}
   }
   ```
9. Gemini tạo greeting + warm_up question → lưu DB → trả về

---

### PHASE 2: Vòng lặp Q&A

```
POST /api/interview/answer
{ "session_id": 431, "answer": "..." }
```

**`AIPipelineService.submit_answer()`:**

1. Validate session (tồn tại, thuộc user, status=active)
2. Lấy `last_question` (message interviewer mới nhất)
3. **Routing:**
   - `last_question.question_type in ("closing", "closing_response")` → `_handle_closing_answer()`
   - Các loại khác → evaluate + continue

4. **Evaluate** (`_evaluate_answer_enhanced()`):
   - `jd_qualification` → không chấm điểm, Gemini tạo acknowledgment dựa trên JD context
   - Các loại khác → Gemini chấm điểm 1–10 theo 5 tiêu chí

5. **Lưu candidate message** (score=None cho jd_qualification/closing)

6. **Kiểm tra tiếp tục hay kết thúc:**
   ```python
   if question_count >= max_questions:
       _finish_interview_enhanced()
   else:
       result = _continue_interview_enhanced(...)
       # Chỉ set hr_acknowledgment khi last_question là jd_qualification
       if last_question.question_type == "jd_qualification":
           result["hr_acknowledgment"] = evaluation["feedback"]
       else:
           result.pop("hr_acknowledgment", None)
   ```

7. **Response trả về:**
   ```json
   {
     "status": "continue",
     "next_question": "...",
     "question_type": "jd_qualification",
     "question_number": 10,
     "hr_acknowledgment": "Cảm ơn bạn đã chia sẻ...",
     "evaluation": { "score": null, "feedback": "..." }
   }
   ```

---

### PHASE 2a: `_continue_interview_enhanced()`

Xác định loại câu hỏi từ `question_distribution` đã lưu trong DB:

```python
order = ['warm_up', 'jd_specific', 'technical', 'behavioral',
         'situational', 'jd_qualification', 'closing']
```

| Loại | Logic sinh câu hỏi |
|------|-------------------|
| `warm_up` | Gemini hỏi về động lực/hành trình nghề nghiệp |
| `jd_specific` | Gemini hỏi về required_skills/tools từ JD, theo skill index |
| `technical` | Có JD → dùng JD Requirements; Không JD → dùng career hard skills |
| `behavioral` | Gemini hỏi về soft skills (work activities) |
| `situational` | Gemini hỏi tình huống giả định |
| `jd_qualification` | `_generate_jd_qualification_question()` |
| `closing` | Có JD → đề cập tên công ty + gợi ý chủ đề từ JD; Không JD → generic |

**Tất cả return path đều truyền `hr_acknowledgment` từ `evaluation.feedback`** — đảm bảo câu jd_qualification cuối chuyển sang closing vẫn có acknowledgment.

---

### PHASE 2b: Logic `jd_qualification`

**`_generate_jd_qualification_question(session, jd_data)`:**

1. Lấy JD Qualification skills từ `session.skills_context`
2. Sắp xếp theo priority: Education (0) → Japanese (1) → English (2) → Others (3)
3. Đếm `qual_count` (số câu đã hỏi)
4. Lấy qualification tại index `qual_count`
5. Gemini tạo câu hỏi CỤ THỂ với FULL JD context
6. `qual_count >= len(qualifications)` → trả về `None` (đã hỏi hết → chuyển sang closing)

**Ví dụ JD FPT Software (3 qualifications):**
- Q9: Chuyên ngành CNTT (education)
- Q10: Tiếng Nhật N3 (japanese)
- Q11: TOEIC >650 (english)

---

### PHASE 2c: Logic `closing` — Hội thoại liên tục

**`_handle_closing_answer()`:**

1. Lưu câu trả lời (score=None)
2. `_candidate_has_question(answer)`:
   - Có `?`, keywords (lương, onboard, team, văn hóa...) → `True`
   - "không", "cảm ơn", câu ngắn → `False`

**Nếu CÓ câu hỏi:**
```python
hr_response = _generate_hr_response_to_candidate_question(answer, job_title, jd_data)
# Có JD → trả lời dựa trên benefits/training/culture từ JD
# Không JD → trả lời generic về vị trí

follow_up = _generate_closing_follow_up(job_title, jd_data)
# Hỏi ứng viên còn câu hỏi nào khác không

return {
  "status": "continue",
  "next_question": follow_up,
  "question_type": "closing",
  "hr_acknowledgment": hr_response
}
```

**Nếu KHÔNG có câu hỏi hoặc không trả lời:**
```python
→ _finish_interview_enhanced()
```

**Closing prompt theo context:**
- **Có JD**: đề cập tên công ty, gợi ý chủ đề từ JD (benefits, training, culture)
- **Không có JD**: generic — "Bạn có câu hỏi gì về vị trí hoặc môi trường làm việc không?"

---

### PHASE 3: Kết thúc phỏng vấn

**`_finish_interview_enhanced()`:**

1. Query candidate messages có `score IS NOT NULL`
2. `avg_score = sum(scores) / count`
3. Recommendation: `>= 7` → PASS, `>= 5` → CONDITIONAL_PASS, `< 5` → FAIL
4. Cập nhật session: status="completed", overall_score, recommendation, key_strengths/weaknesses
5. Trả về final summary

---

## 5. PHÂN BỔ CÂU HỎI

### Có JD (VD: base=5, jd_specific=3, jd_qualification=3)

| Loại | Số câu | Câu số |
|------|--------|--------|
| warm_up | 1 | Q1 |
| jd_specific | 3 | Q2, Q3, Q4 |
| technical | 2 | Q5, Q6 |
| behavioral | 1 | Q7 |
| situational | 1 | Q8 |
| jd_qualification | 3 | Q9, Q10, Q11 |
| closing | 1 | Q12 |
| **Tổng** | **12** | |

### Không có JD (VD: base=5)

| Loại | Số câu | Câu số |
|------|--------|--------|
| warm_up | 1 | Q1 |
| technical | 2 | Q2, Q3 |
| behavioral | 1 | Q4 |
| situational | 1 | Q5 |
| closing | 1 | Q6 |
| **Tổng** | **6** | |

---

## 6. HỆ THỐNG CHẤM ĐIỂM

| Tiêu chí | Mô tả |
|----------|-------|
| technical | Độ chính xác chuyên môn |
| logic | Tư duy, cấu trúc câu trả lời |
| communication | Khả năng diễn đạt |
| experience | Kinh nghiệm thực tế, ví dụ cụ thể |
| attitude | Thái độ, sự tự tin |

**Câu KHÔNG chấm điểm:** `jd_qualification`, `closing`, `closing_response` → score = NULL

**Recommendation:** `>= 7.0` → PASS | `>= 5.0` → CONDITIONAL_PASS | `< 5.0` → FAIL

---

## 7. TAGS UI (InterviewPage.tsx)

| `questionType` | Tag hiển thị | Màu |
|---|---|---|
| `greeting` | Chào hỏi | Blue |
| `warm_up` | Làm quen | Green |
| `technical` | Kỹ thuật | Red |
| `behavioral` | Hành vi | Purple |
| `situational` | Tình huống | Orange |
| `jd_specific` | Từ JD | Yellow |
| `jd_qualification` | Bằng cấp & Ngôn ngữ | Teal |
| `closing` | Kết thúc | Gray |
| `closing_response` | Câu trả lời | Gray nhạt |

**HR acknowledgment** (phản hồi sau jd_qualification hoặc closing) luôn dùng `questionType: 'closing_response'` → tag "Câu trả lời".

---

## 8. FRONTEND — XỬ LÝ RESPONSE

```typescript
const res = await interviewService.submitAnswer({...});

// 1. Cập nhật evaluation (chỉ khi có score)
if (res.evaluation?.score !== null && res.evaluation?.score !== undefined) {
  setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, score, feedback, ... } : m));
}

// 2. HR acknowledgment → hiển thị như HR message riêng (tag: "Câu trả lời")
if (res.hr_acknowledgment) {
  setMessages(prev => [...prev, {
    role: 'interviewer',
    content: res.hr_acknowledgment,
    questionType: 'closing_response'
  }]);
}

// 3. Câu hỏi tiếp theo
if (res.status === 'continue' && res.next_question !== res.hr_acknowledgment) {
  setMessages(prev => [...prev, {
    role: 'interviewer',
    content: res.next_question,
    questionType: res.question_type
  }]);
}

// 4. Kết thúc
if (res.status === 'completed') { /* navigate to results */ }
```

**`SubmitAnswerResponse` interface:**
```typescript
interface SubmitAnswerResponse {
  status: 'continue' | 'completed';
  evaluation?: { score: number | null; detailed_scores; feedback; strengths; weaknesses; suggestion };
  next_question?: string;
  question_number?: number;
  question_type?: string;
  final_summary?: {...};
  hr_acknowledgment?: string;  // HR phản hồi cho jd_qualification hoặc closing
  skills_tested?: string[];
  skills_details?: object[];
}
```

---

## 9. API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/interview/jd/manual` | Nhập JD thủ công |
| POST | `/api/interview/jd/upload` | Upload file JD (PDF/DOCX) |
| POST | `/api/interview/start` | Bắt đầu phỏng vấn |
| POST | `/api/interview/answer` | Gửi câu trả lời |
| POST | `/api/interview/force-skip` | Bỏ qua câu hỏi |
| GET | `/api/interview/session/{id}` | Lịch sử phiên |
| POST | `/api/interview/abandon/{id}` | Hủy phiên |
| GET | `/api/interview/my-interviews` | Danh sách phỏng vấn |
| POST | `/api/interview/feedback` | Gửi feedback |
| GET | `/api/interview/jobs/search` | Tìm kiếm nghề nghiệp |
| GET | `/api/interview/jobs/{id}` | Thông tin nghề nghiệp |
| GET | `/api/interview/jobs/{id}/levels` | Career levels |
| GET | `/api/interview/health` | Trạng thái hệ thống |

---

## 10. SƠ ĐỒ LUỒNG TỔNG QUAN

```
[Tùy chọn] Upload JD
    │ Gemini parse → extracted_data
    │ Build + PERSIST skills_context vào DB
    ▼
POST /start → start_interview()
    │ Career context (PostgreSQL)
    │ Level context
    │ JD data (nếu có) + tính jd_qualification_count
    │ build_interview_context() → merge
    │ _create_question_distribution()
    │ Tạo InterviewSession + market_context
    │ Gemini: greeting + warm_up
    ▼
POST /answer (lặp lại)
    │
    ├─ closing / closing_response?
    │       ▼
    │   _handle_closing_answer()
    │       ├─ has_question?
    │       │     ├─ Có JD → HR trả lời dựa trên JD context
    │       │     └─ Không JD → HR trả lời generic
    │       │     → follow_up + tiếp tục hội thoại
    │       └─ Không có câu hỏi → _finish_interview_enhanced()
    │
    └─ Các loại khác:
            ▼
        _evaluate_answer_enhanced()
            ├─ jd_qualification → acknowledgment (no score)
            └─ others → Gemini chấm điểm 1-10
            ▼
        Lưu candidate message
            ▼
        question_count >= max? → _finish_interview_enhanced()
            ▼
        _continue_interview_enhanced()
            ▼
        _determine_next_question_type_from_dist()
            ├─ jd_qualification → _generate_jd_qualification_question()
            │       └─ Hỏi từng qualification theo priority
            │          hr_acknowledgment = evaluation.feedback
            ├─ closing
            │       ├─ Có JD → prompt đề cập tên công ty + JD context
            │       └─ Không JD → prompt generic
            └─ others → Gemini tạo câu hỏi theo loại + level
```
