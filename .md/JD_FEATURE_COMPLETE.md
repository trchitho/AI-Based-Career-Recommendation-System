    # Tính năng JD (Job Description) - Hoàn thành

    ## Vấn đề giải quyết

    Trước đây hệ thống chỉ dùng Neo4j (skill name tĩnh) → câu hỏi generic.
    Sau khi thêm JD: câu hỏi phản ánh đúng yêu cầu thực tế của công ty.

    **Ví dụ:**
    - Trước: *"Bạn có kinh nghiệm với Java không?"*
    - Sau (JD có "Training 3 tháng Java Web, Build REST API"): *"Trong 3 tháng training Java Web theo JD, bạn sẽ tổ chức việc học như thế nào để sẵn sàng tham gia dự án thực tế?"*

    ---

    ## Các file đã tạo/sửa

    | File | Thay đổi |
    |------|----------|
    | `models.py` | Thêm model `JobDescription` + SQL migration |
    | `jd_service.py` | Service mới: Gemini parse JD, extract PDF/DOCX |
    | `context_builder.py` | Merge Neo4j + JD context (augment, không replace) |
    | `schemas.py` | Thêm `JDManualRequest`, `JDResponse`, field `jd_id` vào `StartInterviewRequest` |
    | `routes.py` | Thêm `POST /jd/manual`, `POST /jd/upload`, cập nhật `/start` |
    | `ai_pipeline_service.py` | Tích hợp JD context, inject JD hints vào greeting/first question, xóa duplicate methods |
    | `test_jd_feature.py` | 8 test cases |

    ---

    ## API Endpoints mới

    ### POST /api/interview/jd/manual
    Nhập JD thủ công (text)
    ```json
    // Request
    { "career_id": "15-1252.00", "content": "Nội dung JD tối thiểu 50 ký tự..." }

    // Response
    { "jd_id": 1, "career_id": "15-1252.00", "extracted_data": {...}, "source": "manual", "created_at": "..." }
    ```

    ### POST /api/interview/jd/upload
    Upload file PDF hoặc DOCX
    - Form data: `file` (PDF/DOCX), `career_id` (optional query param)
    - Response: giống `/jd/manual`

    ### POST /api/interview/start (cập nhật)
    Thêm field `jd_id` optional:
    ```json
    { "job_id": "15-1252.00", "question_count": 7, "jd_id": 1 }
    ```

    ---

    ## Luồng xử lý

    ```
    [1] User nhập/upload JD
            ↓ POST /jd/manual hoặc /jd/upload
            ↓ JDService.parse_jd_text() → Gemini extract JSON
            ↓ Lưu vào interview.job_descriptions
            ↓ Trả về jd_id

    [2] User bắt đầu phỏng vấn với jd_id
            ↓ POST /start { job_id, jd_id }
            ↓ _get_career_context() → PostgreSQL/Neo4j
            ↓ build_interview_context(neo4j_ctx, jd_data) → merged context
            ↓ Greeting + câu hỏi đầu được tạo với JD hints
    ```

    ---

    ## Database Schema

    ```sql
    CREATE TABLE interview.job_descriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        career_id VARCHAR,                    -- onet_code, nullable
        raw_text TEXT NOT NULL,
        extracted_data JSONB,                 -- JSON từ Gemini parse
        source VARCHAR DEFAULT 'manual',      -- manual | pdf | docx
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

    ### extracted_data format
    ```json
    {
    "required_skills": ["Java", "Spring Boot"],
    "tools": ["MySQL", "Git"],
    "responsibilities": ["Training 3 tháng", "Build REST API"],
    "experience_level": "Fresher",
    "domain": "Web Backend",
    "company_culture": "",
    "benefits": []
    }
    ```

    ---

    ## Context Builder Logic

    ```
    Neo4j skills (tĩnh)  +  JD skills/tools (thực tế)
            ↓
    Merge: giữ nguyên Neo4j, thêm JD skills chưa có
            ↓
    Kết quả: context đầy đủ hơn, không mất dữ liệu cũ
    ```

    Các field bổ sung sau merge:
    - `jd_responsibilities` - nhiệm vụ từ JD
    - `jd_tools` - công cụ từ JD
    - `jd_level` - level từ JD (override nếu có)
    - `jd_domain` - lĩnh vực
    - `has_jd: true` - flag để biết có JD

    ---

    ## Test Cases (8 cases)

    | Test | Mô tả |
    |------|-------|
    | `test_parse_jd_fallback_returns_structure` | Gemini fail → fallback đúng cấu trúc |
    | `test_parse_jd_valid_json_response` | Gemini trả JSON hợp lệ → parse đúng |
    | `test_build_context_no_jd` | Không có JD → giữ nguyên Neo4j context |
    | `test_build_context_merges_new_skills` | JD skills mới được merge, không duplicate |
    | `test_build_context_preserves_neo4j_data` | Neo4j data không bị mất |
    | `test_extract_pdf_invalid_bytes_raises` | PDF không hợp lệ → raise exception |
    | `test_extract_docx_invalid_bytes_raises` | DOCX không hợp lệ → raise exception |
    | `test_save_jd_calls_parse_and_commits` | save_jd gọi parse và commit DB |

    Chạy test:
    ```bash
    cd apps/backend
    pytest app/tests/test_jd_feature.py -v
    ```

    ---

    ## Ghi chú

    - JD là **optional** — không có JD thì hệ thống hoạt động bình thường như cũ
    - File extraction dùng `pypdf` (PDF) và `python-docx` (DOCX) — cần cài nếu chưa có:
    ```bash
    pip install pypdf python-docx
    ```
    - JD được cache trong DB, không parse lại mỗi lần phỏng vấn
    - Đã xóa toàn bộ duplicate methods trong `ai_pipeline_service.py`
