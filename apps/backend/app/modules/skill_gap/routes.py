"""
API Routes for Skill Gap Analysis
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.db import get_db
from app.modules.users.models import User
from app.modules.graph.neo4j_client import get_driver

from .service import SkillGapService
from .schemas import (
    SkillGapAnalysisResponse,
    HeatmapData
)

router = APIRouter(tags=["Skill Gap Analysis"])


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
    # Validate file type
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt']
    file_ext = '.' + cv_file.filename.split('.')[-1].lower() if '.' in cv_file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF, image files (JPG, PNG), and text files are supported. Got: {file_ext}"
        )
    
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
        
        return {
            'success': True,
            'message': 'CV analyzed successfully (TEST MODE)',
            'test_user_id': test_user_id,
            'data': result
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing CV: {str(e)}\n\nDetails:\n{error_details}"
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
            except:
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
                        except:
                            pass
            except:
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
    Upload CV và phân tích skill gap
    
    - **career_id**: ID của nghề nghiệp mục tiêu
    - **cv_file**: File CV (PDF, JPG, PNG)
    
    Returns:
    - Kết quả phân tích chi tiết bao gồm:
        - Kỹ năng đã có (matched)
        - Lỗ hổng kỹ năng (gaps) phân loại theo mức độ quan trọng
        - Điểm phù hợp (match percentage)
    """
    # Validate file type
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    file_ext = '.' + cv_file.filename.split('.')[-1].lower() if '.' in cv_file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF and image files (JPG, PNG) are supported. Got: {file_ext}"
        )
    
    # Create service
    service = SkillGapService(db, neo4j_driver)
    
    try:
        # Analyze CV
        result = await service.analyze_cv(
            user_id=user_id,
            cv_file=cv_file,
            career_id=career_id
        )
        
        return {
            'success': True,
            'message': 'CV analyzed successfully',
            'data': result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing CV: {str(e)}"
        )


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
    Tạo lộ trình học tập chi tiết (AI-generated) dựa trên skill gap analysis.
    - Phân chia theo giai đoạn (phase)
    - Gợi ý khóa học, tài liệu cụ thể
    - Ước tính thời gian học
    """
    service = SkillGapService(db, neo4j_driver)
    analysis = service.get_analysis_by_id(analysis_id, user_id)

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Build skill gap summary for Gemini
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

    try:
        from app.core.gemini_manager import multi_stream_manager
        stream = multi_stream_manager.get_cv_stream()
        raw = stream.generate_content_with_retry(prompt, max_output_tokens=3000, temperature=0.4)

        if raw:
            import re, json as _json
            cleaned = raw.strip()
            cleaned = re.sub(r'^```(?:json)?', '', cleaned).rstrip('`').strip()
            m = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if m:
                plan = _json.loads(m.group())
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
    return {
        'success': True, 'analysis_id': analysis_id,
        'career_id': analysis.career_id,
        'plan': {
            'total_weeks': 12,
            'summary': f'Lộ trình {12} tuần để đạt mục tiêu {analysis.career_id}.',
            'phases': phases,
            'milestones': [
                {'week': 4, 'title': 'Hoàn thành kỹ năng nền tảng', 'description': 'Nắm vững các kỹ năng Critical'},
                {'week': 8, 'title': 'Hoàn thành kỹ năng quan trọng', 'description': 'Sẵn sàng apply'},
                {'week': 12, 'title': 'Sẵn sàng phỏng vấn', 'description': 'Match rate > 80%'}
            ]
        }
    }
