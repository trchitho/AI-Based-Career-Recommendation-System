"""
API Routes for Skill Gap Analysis
"""
from typing import Any, List

from app.core.serialization import dumps_str as _to_json, loads as _from_json
from app.core.db import get_db
from app.modules.graph.neo4j_client import get_driver
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from .schemas import HeatmapData, SkillGapAnalysisResponse
from .service import SkillGapService

router = APIRouter(tags=["Skill Gap Analysis"])


def _looks_like_pdf(file_content: bytes) -> bool:
    return file_content.lstrip(b"\xef\xbb\xbf\r\n\t ").startswith(b"%PDF-")


def get_neo4j_driver():
    """Get Neo4j driver"""
    return get_driver()


@router.post("/test-analyze", response_model=dict)
async def test_analyze_cv_skill_gap(
    career_id: str = Form(..., description="ID nghề nghiệp mục tiêu"),
    cv_file: UploadFile = File(..., description="File CV (PDF, JPG, PNG)"),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    TEST ENDPOINT - Upload CV và phân tích skill gap (KHÔNG CẦN AUTHENTICATION)
    
    - **career_id**: ID của nghề nghiệp mục tiêu
    - **cv_file**: File CV (PDF, JPG, PNG)
    
    Returns:
    - Kết quả phân tích chi tiết bao gồm:
        - Kỹ năng đã có (matched)
        - Lỗ hổng kỹ năng (gaps) phân loại theo mức độ quan trọng
        - Điểm phù hợp (match percentage)
    """
    # TC-CV-01: Validate file type
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx']
    
    # Sanitize filename to prevent path traversal
    import re
    safe_filename = re.sub(r'[^\w\s\-\.]', '_', cv_file.filename)
    safe_filename = safe_filename.replace('..', '_')
    
    # Extract extension safely
    file_ext = ''
    if '.' in safe_filename:
        file_ext = '.' + safe_filename.split('.')[-1].lower()
    
    if not file_ext or file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}. Got: {file_ext or 'no extension'}"
        )
    
    # TC-CV-02: Validate file size
    MAX_FILE_SIZE_MB = 5
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    MIN_FILE_SIZE_BYTES = 100  # Minimum 100 bytes
    
    # Read file content to check size
    file_content = await cv_file.read()
    file_size = len(file_content)
    
    # Reset file pointer for later processing
    await cv_file.seek(0)
    
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty (0 bytes). Please upload a valid CV file."
        )
    
    if file_size < MIN_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too small ({file_size} bytes). Minimum size: {MIN_FILE_SIZE_BYTES} bytes."
        )
    
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size / 1024 / 1024:.2f} MB). Maximum size: {MAX_FILE_SIZE_MB} MB."
        )

    if file_ext == '.pdf' and not _looks_like_pdf(file_content):
        raise HTTPException(
            status_code=422,
            detail="File có đuôi PDF nhưng nội dung không phải tài liệu PDF hợp lệ."
        )
    
    # TC-CV-03: Validate filename length
    MAX_FILENAME_LENGTH = 255
    if len(safe_filename) > MAX_FILENAME_LENGTH:
        safe_filename = safe_filename[:MAX_FILENAME_LENGTH]
    
    # Update cv_file filename with sanitized version
    cv_file.filename = safe_filename
    
    # Create service with test user ID
    service = SkillGapService(db, neo4j_driver)
    
    try:
        # Use test user ID = 1 (or create a test user)
        test_user_id = 1
        
        # Analyze CV
        result = await service.analyze_cv(
            user_id=test_user_id,
            cv_file=cv_file,
            career_id=career_id
        )
        
        # ── AUTO-CREATE/UPDATE MENTEE PROFILE FOR MENTOR MATCHING (ASYNC) ────
        # Run in background thread to not block response
        import threading
        def create_mentee_profile_async():
            try:
                from app.modules.mentor_matching.service import MentorMatchingService
                from app.core.db import SessionLocal
                
                # Create new DB session for background thread
                bg_db = SessionLocal()
                try:
                    mentor_service = MentorMatchingService(bg_db, neo4j_driver)
                    
                    # Try to create/update mentee profile from CV data
                    mentee_profile = mentor_service.create_mentee_profile_from_user_data(test_user_id)
                    print(f"[Mentor Matching] ✓ Auto-created/updated mentee profile for test user {test_user_id}")
                finally:
                    bg_db.close()
                    
            except Exception as mentor_err:
                # Don't fail the whole request if mentor profile creation fails
                print(f"[Mentor Matching] ✗ Failed to auto-create mentee profile: {mentor_err}")
        
        # Start background thread
        thread = threading.Thread(target=create_mentee_profile_async, daemon=True)
        thread.start()
        
        return {
            'success': True,
            'message': 'CV analyzed successfully (TEST MODE)',
            'test_user_id': test_user_id,
            'data': result
        }
    except ValueError as ve:
        # Handle validation errors (not CV, wrong format, etc.)
        error_msg = str(ve)
        print(f"[Validation Error] {error_msg}")
        raise HTTPException(
            status_code=422,  # Unprocessable Entity
            detail={
                'error': 'validation_failed',
                'message': error_msg,
                'message_en': 'File validation failed',
                'suggestions': [
                    'Đảm bảo file là CV/Resume thật sự',
                    'Không upload ảnh báo chí, menu, hóa đơn',
                    'CV cần có: tên, email, kỹ năng, kinh nghiệm',
                    'Định dạng hỗ trợ: PDF, JPG, PNG, DOCX'
                ]
            }
        )
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing CV: {str(e)}\n\n{traceback.format_exc()}"
        )


def _current_user_id(req: Request) -> int:
    """
    Lấy user_id từ request state hoặc JWT token
    Tương tự như assessment routes
    """
    # 1) req.state.user_id
    uid: Any = getattr(req.state, "user_id", None)
    
    # 2) req.state.user
    user_obj = getattr(req.state, "user", None)
    if uid is None and user_obj is not None:
        uid = getattr(user_obj, "id", None) or getattr(user_obj, "user_id", None)
    
    # 3) header X-User-Id
    if uid is None:
        hdr = req.headers.get("X-User-Id")
        if hdr:
            try:
                uid = int(hdr)
            except Exception:
                pass
    
    # 4) Decode JWT token (fallback)
    if uid is None:
        auth_header = req.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                import base64
                import json
                # Decode payload (không verify signature - chỉ để lấy user_id)
                parts = token.split(".")
                if len(parts) >= 2:
                    payload_b64 = parts[1]
                    # Thêm padding nếu cần
                    padding = 4 - len(payload_b64) % 4
                    if padding != 4:
                        payload_b64 += "=" * padding
                    payload_json = base64.urlsafe_b64decode(payload_b64)
                    payload = json.loads(payload_json)
                    uid = payload.get("sub") or payload.get("user_id")
                    if uid:
                        try:
                            uid = int(uid)
                        except Exception:
                            pass
            except Exception:
                pass
    
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return int(uid)


@router.post("/analyze", response_model=dict)
async def analyze_cv_skill_gap(
    career_id: str = Form(..., description="ID nghề nghiệp mục tiêu"),
    cv_file: UploadFile = File(..., description="File CV (PDF, JPG, PNG)"),
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    Upload CV và phân tích skill gap (YÊU CẦU THANH TOÁN)
    
    - **career_id**: ID của nghề nghiệp mục tiêu
    - **cv_file**: File CV (PDF, JPG, PNG)
    
    **LƯU Ý:** Chức năng này yêu cầu gói trả phí (Basic/Premium/Pro).
    Vui lòng nâng cấp tài khoản tại /pricing để sử dụng.
    
    Returns:
    - Kết quả phân tích chi tiết bao gồm:
        - Kỹ năng đã có (matched)
        - Lỗ hổng kỹ năng (gaps) phân loại theo mức độ quan trọng
        - Điểm phù hợp (match percentage)
    """
    
    # ============================================================
    # KIỂM TRA SUBSCRIPTION - YÊU CẦU GÓI TRẢ PHÍ
    # ============================================================
    from app.core.subscription import SubscriptionService
    
    try:
        subscription = SubscriptionService.get_user_subscription(user_id, db)
        plan_name = subscription.get("plan_name", "Free")
        
        # Chỉ cho phép Basic, Premium, Pro - KHÔNG cho phép Free
        if plan_name == "Free":
            raise HTTPException(
                status_code=402,  # Payment Required
                detail={
                    "error": "payment_required",
                    "message": "Chức năng Phân tích Skill Gap yêu cầu gói trả phí",
                    "message_en": "Skill Gap Analysis requires a paid subscription",
                    "current_plan": "Free",
                    "required_plans": ["Basic", "Premium", "Pro"],
                    "upgrade_url": "/pricing",
                    "features": {
                        "Basic": "Phân tích CV cơ bản, 20 lần/tháng",
                        "Premium": "Phân tích không giới hạn + Lộ trình học tập AI",
                        "Pro": "Tất cả tính năng Premium + Xuất PDF + AI Assistant"
                    }
                }
            )
        
        # Log usage cho paid plans
        print(f"[OK] User {user_id} ({plan_name}) accessing Skill Gap Analysis")
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"[WARN] Subscription check error: {e}")
        # Nếu có lỗi kiểm tra subscription, vẫn cho phép (fallback)
        pass
    # TC-CV-01: Validate file type
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.docx']
    
    # TC-CV-03: Sanitize filename to prevent path traversal
    import re
    safe_filename = re.sub(r'[^\w\s\-\.]', '_', cv_file.filename)
    safe_filename = safe_filename.replace('..', '_')
    
    # Extract extension safely
    file_ext = ''
    if '.' in safe_filename:
        file_ext = '.' + safe_filename.split('.')[-1].lower()
    
    if not file_ext or file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}. Got: {file_ext or 'no extension'}"
        )
    
    # TC-CV-02: Validate file size
    MAX_FILE_SIZE_MB = 5
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    MIN_FILE_SIZE_BYTES = 100  # Minimum 100 bytes
    
    # Read file content to check size
    file_content = await cv_file.read()
    file_size = len(file_content)
    
    # Reset file pointer for later processing
    await cv_file.seek(0)
    
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty (0 bytes). Please upload a valid CV file."
        )
    
    if file_size < MIN_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too small ({file_size} bytes). Minimum size: {MIN_FILE_SIZE_BYTES} bytes."
        )
    
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size / 1024 / 1024:.2f} MB). Maximum size: {MAX_FILE_SIZE_MB} MB."
        )

    if file_ext == '.pdf' and not _looks_like_pdf(file_content):
        raise HTTPException(
            status_code=422,
            detail="File có đuôi PDF nhưng nội dung không phải tài liệu PDF hợp lệ."
        )
    
    # TC-CV-03: Validate filename length
    MAX_FILENAME_LENGTH = 255
    if len(safe_filename) > MAX_FILENAME_LENGTH:
        safe_filename = safe_filename[:MAX_FILENAME_LENGTH]
    
    # Update cv_file filename with sanitized version
    cv_file.filename = safe_filename
    
    # Create service
    service = SkillGapService(db, neo4j_driver)
    
    try:
        # Analyze CV
        result = await service.analyze_cv(
            user_id=user_id,
            cv_file=cv_file,
            career_id=career_id
        )
        
        # ── AUTO-CREATE/UPDATE MENTEE PROFILE FOR MENTOR MATCHING (ASYNC) ────
        # Run in background thread to not block response
        import threading
        def create_mentee_profile_async():
            try:
                from app.modules.mentor_matching.service import MentorMatchingService
                from app.core.db import SessionLocal
                
                # Create new DB session for background thread
                bg_db = SessionLocal()
                try:
                    mentor_service = MentorMatchingService(bg_db, neo4j_driver)
                    
                    # Try to create/update mentee profile from CV data
                    mentee_profile = mentor_service.create_mentee_profile_from_user_data(user_id)
                    print(f"[Mentor Matching] ✓ Auto-created/updated mentee profile for user {user_id}")
                finally:
                    bg_db.close()
                    
            except Exception as mentor_err:
                # Don't fail the whole request if mentor profile creation fails
                print(f"[Mentor Matching] ✗ Failed to auto-create mentee profile: {mentor_err}")
        
        # Start background thread
        thread = threading.Thread(target=create_mentee_profile_async, daemon=True)
        thread.start()
        
        return {
            'success': True,
            'message': 'CV analyzed successfully',
            'data': result
        }
    except ValueError as ve:
        # Handle validation errors (not CV, wrong format, etc.)
        error_msg = str(ve)
        print(f"[Validation Error] {error_msg}")
        raise HTTPException(
            status_code=422,  # Unprocessable Entity
            detail={
                'error': 'validation_failed',
                'message': error_msg,
                'message_en': 'File validation failed',
                'suggestions': [
                    'Đảm bảo file là CV/Resume thật sự',
                    'Không upload ảnh báo chí, menu, hóa đơn',
                    'CV cần có: tên, email, kỹ năng, kinh nghiệm',
                    'Định dạng hỗ trợ: PDF, JPG, PNG, DOCX'
                ]
            }
        )
    except Exception as e:
        # Rollback any aborted transaction
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing CV: {str(e)}"
        )


@router.post("/analyze-images", response_model=dict)
async def analyze_cv_multi_image(
    career_id: str = Form(..., description="ID nghề nghiệp mục tiêu"),
    cv_images: List[UploadFile] = File(..., description="Các ảnh CV (JPG, PNG) theo thứ tự trang"),
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver),
):
    """
    TC-IMG-12 — Upload nhiều ảnh CV (các trang) cùng một lúc.

    - Chấp nhận 1–5 ảnh JPG/PNG.
    - Xử lý từng ảnh theo thứ tự trang (index 0, 1, ...).
    - Ghép nối văn bản từ tất cả trang theo đúng thứ tự.
    - TC-IMG-11: Nén ảnh lớn trước khi OCR để tránh timeout.
    - TC-IMG-13: Nếu không ảnh nào chứa text → 422.
    """
    MAX_IMAGES = 5
    ALLOWED_IMAGE_TYPES = {".jpg", ".jpeg", ".png"}
    MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024   # 20 MB per image (will be compressed)

    if not cv_images:
        raise HTTPException(status_code=400, detail="Cần ít nhất 1 ảnh CV.")

    if len(cv_images) > MAX_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Tối đa {MAX_IMAGES} ảnh mỗi lần. Đã nhận: {len(cv_images)}.",
        )

    image_contents: list[bytes] = []
    for i, img_file in enumerate(cv_images):
        import re as _re
        safe_name = _re.sub(r"[^\w\s\-\.]", "_", img_file.filename or "")
        ext = ""
        if "." in safe_name:
            ext = "." + safe_name.split(".")[-1].lower()

        if ext not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Ảnh {i + 1} ({img_file.filename}): định dạng không hỗ trợ. "
                       f"Chỉ chấp nhận: {', '.join(ALLOWED_IMAGE_TYPES)}.",
            )

        content = await img_file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail=f"Ảnh {i + 1} trống (0 bytes).")
        if len(content) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Ảnh {i + 1} quá lớn ({len(content) / 1024 / 1024:.1f} MB). "
                       f"Tối đa {MAX_IMAGE_SIZE_BYTES // 1024 // 1024} MB mỗi ảnh.",
            )
        image_contents.append(content)

    from .cv_parser_v2 import CVParserV2
    parser = CVParserV2(db_session=db)

    try:
        merged_text = parser.extract_text_from_multiple_images(image_contents)
    except ValueError as e:
        # TC-IMG-13: no text found in any image
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý ảnh: {e}")

    return {
        "success": True,
        "page_count": len(image_contents),
        "total_chars": len(merged_text),
        "merged_text_preview": merged_text[:500],
        "message": f"Đã ghép nối văn bản từ {len(image_contents)} ảnh.",
    }


@router.get("/my-analyses", response_model=List[SkillGapAnalysisResponse])
def get_my_analyses(
    limit: int = 10,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    Lấy danh sách các phân tích skill gap của user
    
    - **limit**: Số lượng kết quả tối đa (default: 10)
    """
    service = SkillGapService(db, neo4j_driver)
    analyses = service.get_user_analyses(user_id, limit)
    
    return analyses


@router.get("/analysis/{analysis_id}", response_model=SkillGapAnalysisResponse)
def get_analysis_detail(
    analysis_id: int,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    Lấy chi tiết một phân tích skill gap
    
    - **analysis_id**: ID của phân tích
    """
    service = SkillGapService(db, neo4j_driver)
    analysis = service.get_analysis_by_id(analysis_id, user_id)
    
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )
    
    return analysis


@router.get("/heatmap/{analysis_id}", response_model=HeatmapData)
def get_heatmap_data(
    analysis_id: int,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    Lấy dữ liệu để vẽ heatmap visualization
    
    - **analysis_id**: ID của phân tích
    
    Returns:
    - Dữ liệu nodes và links để vẽ network diagram
    - Màu sắc phân loại theo mức độ quan trọng:
        - Xanh: Kỹ năng đã có
        - Đỏ: Lỗ hổng quan trọng (Critical)
        - Cam: Lỗ hổng cần bổ sung (Important)
        - Vàng: Kỹ năng khuyến nghị (Nice-to-have)
    """
    service = SkillGapService(db, neo4j_driver)
    heatmap_data = service.generate_heatmap_data(analysis_id, user_id)
    
    if not heatmap_data:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )
    
    return heatmap_data


@router.get("/interview-prep/{analysis_id}")
def get_interview_prep_data(
    analysis_id: int,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    Lấy dữ liệu chuẩn bị cho AI phỏng vấn
    
    - **analysis_id**: ID của phân tích
    
    Returns:
    - Dữ liệu JSON chuẩn để đưa vào AI phỏng vấn:
        - Critical gaps: Các lỗ hổng quan trọng cần hỏi sâu
        - Matched skills: Kỹ năng đã có để verify
        - Suggested questions: Câu hỏi gợi ý
    """
    service = SkillGapService(db, neo4j_driver)
    analysis = service.get_analysis_by_id(analysis_id, user_id)
    
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )
    
    # Prepare data for AI interview
    critical_gaps = analysis.skill_gaps.get('critical', [])
    important_gaps = analysis.skill_gaps.get('important', [])
    matched_skills = analysis.matched_skills
    
    # Generate suggested questions for critical gaps
    suggested_questions = []
    for skill in critical_gaps[:5]:  # Top 5 critical gaps
        suggested_questions.append({
            'skill': skill['name'],
            'category': skill.get('category', 'Other'),
            'question_type': 'deep_dive',
            'sample_question': f"Can you explain your experience with {skill['name']}? What projects have you used it in?"
        })
    
    # Generate verification questions for matched skills
    for skill in matched_skills[:3]:  # Top 3 matched skills
        suggested_questions.append({
            'skill': skill['name'],
            'category': skill.get('category', 'Other'),
            'question_type': 'verification',
            'sample_question': f"I see you have {skill['name']} on your CV. Can you describe a challenging problem you solved using it?"
        })
    
    return {
        'analysis_id': analysis_id,
        'career_id': analysis.career_id,
        'match_percentage': analysis.match_percentage,
        'focus_areas': {
            'critical_gaps': critical_gaps,
            'important_gaps': important_gaps,
            'matched_skills': matched_skills
        },
        'suggested_questions': suggested_questions,
        'interview_strategy': {
            'focus': 'critical_gaps' if len(critical_gaps) > 0 else 'skill_verification',
            'difficulty_level': 'high' if analysis.match_percentage < 50 else 'medium',
            'estimated_duration': '30-45 minutes'
        }
    }


@router.get("/learning-plan/{analysis_id}")
async def get_learning_plan(
    analysis_id: int,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
    neo4j_driver = Depends(get_neo4j_driver)
):
    """
    Tạo lộ trình học tập chi tiết (AI-generated). Kết quả được cache vào DB —
    lần đầu gọi AI, các lần sau trả thẳng từ DB (không tốn token).
    """
    service = SkillGapService(db, neo4j_driver)
    analysis = service.get_analysis_by_id(analysis_id, user_id)

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # ── CACHE HIT: trả ngay nếu đã có ────────────────────────────
    if analysis.learning_plan_cache:
        print(f"[learning-plan] Cache hit for analysis {analysis_id} — skipping AI call")
        return {
            'success': True,
            'analysis_id': analysis_id,
            'career_id': analysis.career_id,
            'plan': analysis.learning_plan_cache,
            'from_cache': True,
        }

    # ── CACHE MISS: gọi AI ────────────────────────────────────────
    print(f"[learning-plan] Cache miss for analysis {analysis_id} — calling AI")

    critical = analysis.skill_gaps.get('critical', [])
    important = analysis.skill_gaps.get('important', [])
    nice_to_have = analysis.skill_gaps.get('nice_to_have', [])
    matched = analysis.matched_skills or []

    critical_names = [s['name'] for s in critical[:8]]
    important_names = [s['name'] for s in important[:6]]
    nice_names = [s['name'] for s in nice_to_have[:4]]
    matched_names = [s['name'] for s in matched[:6]]

    prompt = f"""Tạo lộ trình học tập chi tiết bằng tiếng Việt cho người dùng muốn trở thành {analysis.career_id}.

Kỹ năng đã có: {', '.join(matched_names) or 'Chưa có'}
Kỹ năng CRITICAL cần học: {', '.join(critical_names) or 'Không có'}
Kỹ năng IMPORTANT cần học: {', '.join(important_names) or 'Không có'}
Kỹ năng nice-to-have: {', '.join(nice_names) or 'Không có'}
Mức độ phù hợp hiện tại: {analysis.match_percentage:.0f}%

Trả về JSON (không có text ngoài JSON):
{{
  "total_weeks": <số>,
  "summary": "<tổng quan lộ trình 1-2 câu>",
  "phases": [
    {{
      "phase": 1,
      "title": "<tên giai đoạn>",
      "weeks": "<ví dụ: Tuần 1-4>",
      "focus": "<mục tiêu giai đoạn>",
      "skills": ["skill1", "skill2"],
      "resources": [
        {{"name": "<tên khoá/tài liệu>", "platform": "<Coursera/Udemy/YouTube/freeCodeCamp/docs>", "type": "<course/video/docs/practice>", "level": "<beginner/intermediate/advanced>", "free": <true/false>}}
      ]
    }}
  ],
  "milestones": [
    {{"week": <số>, "title": "<tiêu đề milestone>", "description": "<mô tả ngắn>"}}
  ]
}}
Tạo 3-4 phases, mỗi phase 2-4 resources cụ thể có tên thật."""

    def _save_cache(plan: dict):
        """Lưu kết quả AI vào DB để dùng lại sau.
        Phải dùng flag_modified vì SQLAlchemy không tự detect thay đổi JSONB.
        """
        try:
            from sqlalchemy.orm.attributes import flag_modified
            from sqlalchemy import text as _text
            db.execute(
                _text("UPDATE core.skill_gap_analyses SET learning_plan_cache = :plan WHERE id = :id"),
                {"plan": _to_json(plan), "id": analysis_id}   # orjson — faster
            )
            db.commit()
            analysis.learning_plan_cache = plan
            flag_modified(analysis, "learning_plan_cache")
            print(f"[learning-plan] Cache saved for analysis {analysis_id}")
        except Exception as e:
            print(f"[learning-plan] Failed to save cache: {e}")
            db.rollback()

    try:
        from app.core.gemini_manager import multi_stream_manager
        import re
        stream = multi_stream_manager.get_cv_stream()
        raw = stream.generate_content_with_retry(prompt, max_output_tokens=3000, temperature=0.4)

        if raw:
            cleaned = raw.strip()
            cleaned = re.sub(r'^```(?:json)?', '', cleaned).rstrip('`').strip()
            m = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if m:
                plan = _from_json(m.group())   # orjson parse
                _save_cache(plan)
                return {'success': True, 'analysis_id': analysis_id, 'career_id': analysis.career_id, 'plan': plan}
    except Exception as e:
        print(f"Learning plan AI error: {e}")

    # Local fallback
    phases = []
    if critical_names:
        phases.append({
            'phase': 1, 'title': 'Kỹ năng nền tảng (Critical)',
            'weeks': f'Tuần 1-{max(4, len(critical_names)*2)}',
            'focus': 'Xây dựng kỹ năng bắt buộc cho vị trí',
            'skills': critical_names[:4],
            'resources': [
                {'name': f'Khoá học {critical_names[0]}', 'platform': 'Coursera', 'type': 'course', 'level': 'beginner', 'free': False}
            ] if critical_names else []
        })
    if important_names:
        phases.append({
            'phase': 2, 'title': 'Kỹ năng quan trọng',
            'weeks': f'Tuần {max(4, len(critical_names)*2)+1}-{max(4, len(critical_names)*2)+len(important_names)*2}',
            'focus': 'Bổ sung kỹ năng để tăng cạnh tranh',
            'skills': important_names[:4],
            'resources': [
                {'name': f'Tài liệu {important_names[0]}', 'platform': 'YouTube', 'type': 'video', 'level': 'intermediate', 'free': True}
            ] if important_names else []
        })
    fallback_plan = {
        'total_weeks': 12,
        'summary': f'Lộ trình {12} tuần để đạt mục tiêu {analysis.career_id}.',
        'phases': phases,
        'milestones': [
            {'week': 4, 'title': 'Hoàn thành kỹ năng nền tảng', 'description': 'Nắm vững các kỹ năng Critical'},
            {'week': 8, 'title': 'Hoàn thành kỹ năng quan trọng', 'description': 'Sẵn sàng apply'},
            {'week': 12, 'title': 'Sẵn sàng phỏng vấn', 'description': 'Match rate > 80%'}
        ]
    }
    _save_cache(fallback_plan)
    return {
        'success': True, 'analysis_id': analysis_id,
        'career_id': analysis.career_id,
        'plan': fallback_plan,
    }


# ── Feedback endpoints (Thompson Sampling) ───────────────────────

from pydantic import BaseModel

class FeedbackPayload(BaseModel):
    item_type: str   # 'skill' | 'career' | 'job'
    item_name: str
    event_type: str  # 'click' | 'like' | 'dislike'
    analysis_id: int | None = None


@router.post("/feedback", summary="Ghi nhận click/like để điều chỉnh gợi ý (Thompson Sampling)")
def record_feedback(
    payload: FeedbackPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Người dùng click hoặc like một kỹ năng/nghề nghiệp được gợi ý.
    Thompson Sampling dùng signal này để cá nhân hoá gợi ý tiếp theo.
    """
    from app.core.auth_deps import get_current_user_from_token
    from app.modules.auth.models import User

    token = request.headers.get("authorization", "").replace("Bearer ", "")
    try:
        from app.core.jwt import decode_access_token
        payload_jwt = decode_access_token(token)
        user_id = int(payload_jwt.get("sub", 0))
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if payload.event_type not in ("click", "like", "dislike"):
        raise HTTPException(400, "event_type must be click | like | dislike")

    from .thompson_sampling import record_event, ensure_feedback_table
    ensure_feedback_table(db)
    record_event(
        db, user_id,
        payload.item_type,
        payload.item_name,
        payload.event_type,
        payload.analysis_id,
    )
    return {"recorded": True, "item": payload.item_name, "event": payload.event_type}


@router.get("/priority-skills/{analysis_id}", summary="Top kỹ năng ưu tiên sau NeuMF + Thompson Sampling")
def get_priority_skills(
    analysis_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Trả về danh sách kỹ năng ưu tiên được xếp hạng bởi NeuMF và
    điều chỉnh theo Thompson Sampling dựa trên feedback cá nhân.
    """
    from app.core.jwt import decode_access_token
    token = request.headers.get("authorization", "").replace("Bearer ", "")
    try:
        payload_jwt = decode_access_token(token)
        user_id = int(payload_jwt.get("sub", 0))
    except Exception:
        raise HTTPException(401, "Unauthorized")

    from .models import SkillGapAnalysis
    from sqlalchemy import text as _text

    analysis = db.query(SkillGapAnalysis).filter(
        SkillGapAnalysis.id == analysis_id,
        SkillGapAnalysis.user_id == user_id,
    ).first()
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    # Check if NeuMF already ran (stored in skill_gaps JSONB)
    gaps = analysis.skill_gaps or {}
    if isinstance(gaps, dict) and "neumf_priority" in gaps:
        priority = gaps["neumf_priority"]
        if isinstance(priority, str):
            import json
            priority = json.loads(priority)
    else:
        # Fallback: build from critical gaps
        critical = gaps.get("critical", []) if isinstance(gaps, dict) else []
        priority = [{"name": s.get("name", s) if isinstance(s, dict) else s, "score": 0.7} for s in critical[:10]]

    # Apply Thompson Sampling adjustment
    names = [p.get("name", "") for p in priority if p.get("name")]
    if names and user_id:
        from .thompson_sampling import rerank_with_thompson, ensure_feedback_table
        ensure_feedback_table(db)
        priority = rerank_with_thompson(db, user_id, "skill", priority, score_key="score", name_key="name")

    return {
        "analysis_id": analysis_id,
        "priority_skills": priority[:15],
        "ranking_method": "NeuMF + Thompson Sampling",
    }
