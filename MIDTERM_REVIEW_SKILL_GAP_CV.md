# BÁO CÁO MIDTERM REVIEW - CHỨC NĂNG PHÂN TÍCH SKILL GAP (CV)

## 0. VẤN ĐỀ VÀ GIẢI PHÁP

### Vấn đề
- Ứng viên không biết kỹ năng nào còn thiếu để đạt được công việc mơ ước
- CV thường không được phân tích khách quan và chi tiết
- Thiếu roadmap học tập cụ thể để bù đắp skill gap
- Khó khăn trong việc so sánh kỹ năng hiện tại với yêu cầu công việc

### Giải pháp
- Xây dựng hệ thống AI phân tích CV đa định dạng (PDF, JPG, PNG, DOCX)
- Sử dụng OCR + Gemini Vision API để trích xuất thông tin
- So sánh skills từ CV với job requirements từ O*NET database
- Tạo learning plan và interview prep data tự động

## 1. LUỒNG CHẠY TỪ A-Z

### Bước 1: Upload và Validation CV
```
User upload CV file (PDF/Image/DOCX)
↓
Validate file type, size (max 5MB), filename
↓
Sanitize filename để tránh path traversal
↓
Check minimum file size (100 bytes)
```

### Bước 2: CV Parsing và OCR
```
Detect file type
↓
If PDF: Extract text directly + OCR for images
If Image: OCR with Tesseract + Gemini Vision
If DOCX: Extract text from document
↓
Combine all extracted text
```

### Bước 3: CV Validation
```
Send extracted text to Gemini
↓
Validate if content is actually a CV
↓
Check for personal info, experience, skills
↓
Reject if detected as textbook/test answers
```

### Bước 4: Skills Extraction
```
Use Gemini to extract skills from CV text
↓
Categorize skills: Technical, Soft, Tools, Languages
↓
Normalize skill names for matching
```

### Bước 5: Job Requirements Retrieval
```
Get target career from career_id parameter
↓
Query PostgreSQL for career KSAs
↓
Query Neo4j for related skills
↓
Merge and prioritize requirements
```

### Bước 6: Gap Analysis
```
Match CV skills with job requirements
↓
Calculate match percentage
↓
Identify gaps by importance level:
- Critical (importance > 4.0)
- Important (3.0 - 4.0)  
- Nice-to-have (< 3.0)
```

### Bước 7: Learning Plan Generation
```
Send gap analysis to Gemini
↓
Generate personalized learning roadmap
↓
Include courses, certifications, practice projects
↓
Estimate timeline for each skill
```

## 2. LOGIC CODE CHÍNH

### Core Service Logic
```python
class SkillGapService:
    def analyze_cv_skill_gap(self, career_id: str, cv_file: UploadFile, user_id: int = None):
        # 1. File validation
        self._validate_file(cv_file)
        
        # 2. Extract text from CV
        cv_text = self._extract_cv_text(cv_file)
        
        # 3. Validate CV content
        if not self._is_valid_cv(cv_text):
            raise ValueError("File không phải là CV hợp lệ")
        
        # 4. Extract skills
        cv_skills = self._extract_skills_from_cv(cv_text)
        
        # 5. Get job requirements
        job_requirements = self._get_job_requirements(career_id)
        
        # 6. Perform gap analysis
        analysis_result = self._perform_gap_analysis(cv_skills, job_requirements)
        
        # 7. Generate learning plan
        learning_plan = self._generate_learning_plan(analysis_result)
        
        # 8. Save to database
        return self._save_analysis_result(analysis_result, learning_plan, user_id)
```

### Multi-format CV Processing
```python
def _extract_cv_text(self, cv_file: UploadFile) -> str:
    file_ext = self._get_file_extension(cv_file.filename)
    
    if file_ext == '.pdf':
        return self._extract_from_pdf(cv_file)
    elif file_ext in ['.jpg', '.jpeg', '.png']:
        return self._extract_from_image(cv_file)
    elif file_ext == '.docx':
        return self._extract_from_docx(cv_file)
    else:
        raise ValueError(f"Unsupported file format: {file_ext}")

def _extract_from_pdf(self, cv_file: UploadFile) -> str:
    # Extract text using PyPDF2
    text_content = self._pdf_text_extraction(cv_file)
    
    # If PDF has images, use OCR
    if self._pdf_has_images(cv_file):
        ocr_content = self._pdf_ocr_extraction(cv_file)
        text_content += "\n" + ocr_content
    
    return text_content
```

### AI-Powered Skills Extraction
```python
def _extract_skills_from_cv(self, cv_text: str) -> List[dict]:
    prompt = f"""
    Phân tích CV sau và trích xuất tất cả kỹ năng:
    
    {cv_text}
    
    Trả về JSON format:
    {{
        "technical_skills": ["Python", "Java", ...],
        "soft_skills": ["Leadership", "Communication", ...],
        "tools": ["Excel", "Photoshop", ...],
        "languages": ["English", "Vietnamese", ...]
    }}
    """
    
    response = self.gemini_client.generate_content(prompt)
    return self._parse_skills_response(response)
```

### Gap Analysis Algorithm
```python
def _perform_gap_analysis(self, cv_skills: List[str], job_requirements: List[dict]) -> dict:
    matched_skills = []
    skill_gaps = {"critical": [], "important": [], "nice_to_have": []}
    
    for requirement in job_requirements:
        skill_name = requirement['skill_name']
        importance = requirement['importance']
        
        # Fuzzy matching for skill names
        match_score = self._fuzzy_match_skill(skill_name, cv_skills)
        
        if match_score > 0.8:  # High confidence match
            matched_skills.append({
                "skill": skill_name,
                "match_score": match_score,
                "importance": importance
            })
        else:
            # Categorize gaps by importance
            if importance >= 4.0:
                skill_gaps["critical"].append(requirement)
            elif importance >= 3.0:
                skill_gaps["important"].append(requirement)
            else:
                skill_gaps["nice_to_have"].append(requirement)
    
    # Calculate overall match percentage
    total_requirements = len(job_requirements)
    matched_count = len(matched_skills)
    match_percentage = (matched_count / total_requirements) * 100 if total_requirements > 0 else 0
    
    return {
        "matched_skills": matched_skills,
        "skill_gaps": skill_gaps,
        "match_percentage": match_percentage,
        "total_requirements": total_requirements,
        "matched_count": matched_count
    }
```

## 3. HOÀN THÀNH CÁC CHỨC NĂNG

### ✅ Đã hoàn thành
- **Multi-format CV Support**: PDF, JPG, PNG, DOCX parsing
- **OCR Integration**: Tesseract + Gemini Vision API
- **CV Validation**: Phát hiện file không phải CV
- **Skills Extraction**: AI-powered skill identification
- **Gap Analysis**: So sánh với job requirements
- **Match Percentage**: Tính toán độ phù hợp
- **Heatmap Visualization**: Biểu đồ skill gaps
- **Learning Plan Generation**: AI tạo roadmap học tập
- **Interview Prep Data**: Câu hỏi phỏng vấn dựa trên gaps
- **Multi-image Support**: Xử lý CV nhiều trang (ảnh)

### ✅ Frontend Components
- **SkillGapPage**: Giao diện chính phân tích CV
- **CVUploader**: Component upload file với validation
- **SkillGapResults**: Hiển thị kết quả phân tích
- **HeatmapVisualization**: Biểu đồ skill gaps
- **LearningPlanDisplay**: Hiển thị roadmap học tập

### ✅ API Endpoints
- `POST /api/skill-gap/analyze` - Phân tích CV (có auth)
- `POST /api/skill-gap/test-analyze` - Test endpoint (không auth)
- `POST /api/skill-gap/analyze-images` - Phân tích CV nhiều ảnh
- `GET /api/skill-gap/my-analyses` - Lịch sử phân tích
- `GET /api/skill-gap/analysis/{id}` - Chi tiết phân tích
- `GET /api/skill-gap/heatmap/{id}` - Dữ liệu heatmap
- `GET /api/skill-gap/learning-plan/{id}` - Learning plan
- `GET /api/skill-gap/interview-prep/{id}` - Interview prep data

### ✅ Subscription Integration
- **Free Tier**: Không được sử dụng
- **Basic+ Tier**: Full access với usage tracking
- **Premium Tier**: Unlimited usage

## 4. KHÓ KHĂN VÀ TEST CASES

### Khó khăn đã gặp
1. **OCR Accuracy**: Tesseract đôi khi đọc sai text từ ảnh
   - **Giải pháp**: Kết hợp Tesseract + Gemini Vision API

2. **CV Format Diversity**: CV có nhiều format khác nhau
   - **Giải pháp**: Multi-stage parsing với fallback methods

3. **Skills Normalization**: Tên kỹ năng không chuẩn hóa
   - **Giải pháp**: Fuzzy matching + AI normalization

4. **File Size Limits**: CV ảnh có thể rất lớn
   - **Giải pháp**: Compress ảnh trước khi xử lý

5. **Gemini Vision Quota**: API có giới hạn request
   - **Giải pháp**: Intelligent caching và batch processing

### Test Cases đã pass (100%)
- ✅ **TC-CV-01**: Upload PDF CV thành công
- ✅ **TC-CV-02**: Upload image CV với OCR
- ✅ **TC-CV-03**: Upload DOCX CV
- ✅ **TC-CV-04**: Validate file size limits (5MB)
- ✅ **TC-CV-05**: Reject non-CV files (textbooks)
- ✅ **TC-CV-06**: Skills extraction accuracy
- ✅ **TC-CV-07**: Gap analysis calculation
- ✅ **TC-CV-08**: Learning plan generation
- ✅ **TC-CV-09**: Multi-page image CV
- ✅ **TC-CV-10**: Subscription tier validation

### Test Cases khó đã pass
- ✅ **Corrupted PDF Test**: Xử lý file PDF bị lỗi
- ✅ **Low Quality Image Test**: OCR với ảnh chất lượng thấp
- ✅ **Mixed Language CV Test**: CV tiếng Việt + tiếng Anh
- ✅ **Large File Test**: CV 4.9MB gần giới hạn
- ✅ **Malicious File Test**: Phát hiện file độc hại
- ✅ **Edge Case Skills Test**: Kỹ năng hiếm hoặc mới

## 5. ĐIỂM KHÁC BIỆT VỚI THỊ TRƯỜNG

### So với các giải pháp hiện tại

#### **Resume.io, Zety, Canva Resume**
- **Họ**: Chỉ tạo CV đẹp, không phân tích skills
- **Chúng ta**: AI phân tích sâu skills và tạo learning plan

#### **LinkedIn Skills Assessment**
- **Họ**: Test skills riêng lẻ, không so sánh với job
- **Chúng ta**: Comprehensive gap analysis với job requirements

#### **Jobscan, Resume Worded**
- **Họ**: Chỉ optimize CV cho ATS, không có learning plan
- **Chúng ta**: Skill gap analysis + personalized roadmap

#### **HackerRank Skills Certification**
- **Họ**: Chỉ tech skills, không có soft skills
- **Chúng ta**: Comprehensive analysis (technical + soft + tools)

### Điểm mạnh độc đáo
1. **Multi-format Support**: Xử lý được mọi định dạng CV phổ biến
2. **Vietnamese OCR**: Tối ưu cho CV tiếng Việt
3. **O*NET Integration**: Sử dụng database nghề nghiệp chuẩn quốc tế
4. **AI Learning Plans**: Tự động tạo roadmap học tập cá nhân hóa
5. **Interview Prep Integration**: Kết nối với hệ thống phỏng vấn AI
6. **Subscription Model**: Kiểm soát usage theo tier

### Competitive Advantages
- **Accuracy**: Kết hợp multiple AI models cho độ chính xác cao
- **Comprehensive**: Không chỉ phân tích mà còn có action plan
- **Localized**: Hiểu context thị trường Việt Nam
- **Integrated**: Kết nối với toàn bộ career guidance ecosystem
- **Scalable**: Architecture cho phép xử lý hàng nghìn CV/ngày
- **Cost-effective**: Sử dụng Gemini thay vì các API đắt đỏ khác

### Innovation Points
1. **CV Validation**: Phát hiện file không phải CV (độc đáo)
2. **4-Level Gap Analysis**: Critical/Important/Nice-to-have categorization
3. **Heatmap Visualization**: Visual representation của skill gaps
4. **Interview Prep Data**: Tự động tạo câu hỏi phỏng vấn từ gaps
5. **Multi-image CV**: Xử lý CV scan nhiều trang

## KẾT LUẬN

Chức năng Skill Gap Analysis đã được triển khai hoàn chỉnh với khả năng xử lý đa định dạng CV và AI analysis mạnh mẽ. Hệ thống không chỉ phân tích gaps mà còn cung cấp actionable insights thông qua learning plans và interview prep data, tạo ra một giải pháp comprehensive cho career development.