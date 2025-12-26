"""
Career Goals API Routes - Pro Feature
Allows users to set and track career goals with AI-powered milestone generation
"""

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
import json
import logging
import os
import google.generativeai as genai

from ...core.jwt import require_user
from ...core.subscription import SubscriptionService

router = APIRouter()
logger = logging.getLogger(__name__)


def _db(request: Request) -> Session:
    return request.state.db


class CreateGoalRequest(BaseModel):
    career_id: Optional[str] = None
    career_name: Optional[str] = None
    goal_text: str
    goal_type: str = "short_term"  # short_term or long_term
    target_date: Optional[date] = None
    priority: int = 1
    notes: Optional[str] = None


class UpdateGoalRequest(BaseModel):
    goal_text: Optional[str] = None
    goal_type: Optional[str] = None
    target_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    notes: Optional[str] = None


class CreateMilestoneRequest(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    order_index: int = 0


@router.get("")
def get_user_goals(request: Request):
    """Get all goals for current user"""
    user_id = require_user(request)
    session = _db(request)
    
    # Check Pro subscription
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    if not subscription["is_premium"] or subscription["plan_name"] not in ["Pro", "Gói Pro"]:
        raise HTTPException(
            status_code=403, 
            detail="Career Goal Setting is a Pro feature. Please upgrade to Pro plan."
        )
    
    query = text("""
        SELECT 
            g.id, g.career_id, g.career_name, g.goal_text, g.goal_type,
            g.target_date, g.status, g.priority, g.notes,
            g.created_at, g.updated_at,
            (SELECT COUNT(*) FROM core.goal_milestones m WHERE m.goal_id = g.id) as milestone_count,
            (SELECT COUNT(*) FROM core.goal_milestones m WHERE m.goal_id = g.id AND m.status = 'completed') as completed_milestones
        FROM core.user_goals g
        WHERE g.user_id = :user_id
        ORDER BY g.priority DESC, g.created_at DESC
    """)
    
    result = session.execute(query, {"user_id": user_id}).fetchall()
    
    goals = []
    for row in result:
        goals.append({
            "id": row.id,
            "career_id": row.career_id,
            "career_name": row.career_name,
            "goal_text": row.goal_text,
            "goal_type": row.goal_type,
            "target_date": str(row.target_date) if row.target_date else None,
            "status": row.status,
            "priority": row.priority,
            "notes": row.notes,
            "created_at": str(row.created_at),
            "updated_at": str(row.updated_at) if row.updated_at else None,
            "milestone_count": row.milestone_count,
            "completed_milestones": row.completed_milestones,
            "progress": (row.completed_milestones / row.milestone_count * 100) if row.milestone_count > 0 else 0
        })
    
    return {"goals": goals, "total": len(goals)}


@router.post("")
def create_goal(request: Request, payload: CreateGoalRequest):
    """Create a new career goal"""
    user_id = require_user(request)
    session = _db(request)
    
    # Check Pro subscription
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    if not subscription["is_premium"] or subscription["plan_name"] not in ["Pro", "Gói Pro"]:
        raise HTTPException(
            status_code=403, 
            detail="Career Goal Setting is a Pro feature. Please upgrade to Pro plan."
        )
    
    query = text("""
        INSERT INTO core.user_goals 
        (user_id, career_id, career_name, goal_text, goal_type, target_date, priority, notes, status)
        VALUES (:user_id, :career_id, :career_name, :goal_text, :goal_type, :target_date, :priority, :notes, 'in_progress')
        RETURNING id
    """)
    
    result = session.execute(query, {
        "user_id": user_id,
        "career_id": payload.career_id,
        "career_name": payload.career_name,
        "goal_text": payload.goal_text,
        "goal_type": payload.goal_type,
        "target_date": payload.target_date,
        "priority": payload.priority,
        "notes": payload.notes
    })
    
    goal_id = result.fetchone()[0]
    session.commit()
    
    return {"success": True, "goal_id": goal_id, "message": "Goal created successfully"}


@router.get("/{goal_id}")
def get_goal_detail(request: Request, goal_id: int):
    """Get goal details with milestones"""
    user_id = require_user(request)
    session = _db(request)
    
    # Get goal
    goal_query = text("""
        SELECT 
            g.id, g.career_id, g.career_name, g.goal_text, g.goal_type,
            g.target_date, g.status, g.priority, g.notes,
            g.created_at, g.updated_at
        FROM core.user_goals g
        WHERE g.id = :goal_id AND g.user_id = :user_id
    """)
    
    goal_row = session.execute(goal_query, {"goal_id": goal_id, "user_id": user_id}).fetchone()
    
    if not goal_row:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Get milestones
    milestone_query = text("""
        SELECT id, title, description, target_date, status, order_index, created_at, completed_at
        FROM core.goal_milestones
        WHERE goal_id = :goal_id
        ORDER BY order_index ASC
    """)
    
    milestone_rows = session.execute(milestone_query, {"goal_id": goal_id}).fetchall()
    
    milestones = []
    for m in milestone_rows:
        milestones.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "target_date": str(m.target_date) if m.target_date else None,
            "status": m.status,
            "order_index": m.order_index,
            "created_at": str(m.created_at),
            "completed_at": str(m.completed_at) if m.completed_at else None
        })
    
    return {
        "goal": {
            "id": goal_row.id,
            "career_id": goal_row.career_id,
            "career_name": goal_row.career_name,
            "goal_text": goal_row.goal_text,
            "goal_type": goal_row.goal_type,
            "target_date": str(goal_row.target_date) if goal_row.target_date else None,
            "status": goal_row.status,
            "priority": goal_row.priority,
            "notes": goal_row.notes,
            "created_at": str(goal_row.created_at),
            "updated_at": str(goal_row.updated_at) if goal_row.updated_at else None
        },
        "milestones": milestones
    }


@router.put("/{goal_id}")
def update_goal(request: Request, goal_id: int, payload: UpdateGoalRequest):
    """Update a goal"""
    user_id = require_user(request)
    session = _db(request)
    
    # Build dynamic update query
    updates = []
    params = {"goal_id": goal_id, "user_id": user_id}
    
    if payload.goal_text is not None:
        updates.append("goal_text = :goal_text")
        params["goal_text"] = payload.goal_text
    if payload.goal_type is not None:
        updates.append("goal_type = :goal_type")
        params["goal_type"] = payload.goal_type
    if payload.target_date is not None:
        updates.append("target_date = :target_date")
        params["target_date"] = payload.target_date
    if payload.status is not None:
        updates.append("status = :status")
        params["status"] = payload.status
    if payload.priority is not None:
        updates.append("priority = :priority")
        params["priority"] = payload.priority
    if payload.notes is not None:
        updates.append("notes = :notes")
        params["notes"] = payload.notes
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    query = text(f"""
        UPDATE core.user_goals 
        SET {', '.join(updates)}
        WHERE id = :goal_id AND user_id = :user_id
        RETURNING id
    """)
    
    result = session.execute(query, params)
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Goal not found")
    
    session.commit()
    
    return {"success": True, "message": "Goal updated successfully"}


@router.delete("/{goal_id}")
def delete_goal(request: Request, goal_id: int):
    """Delete a goal"""
    user_id = require_user(request)
    session = _db(request)
    
    query = text("""
        DELETE FROM core.user_goals 
        WHERE id = :goal_id AND user_id = :user_id
        RETURNING id
    """)
    
    result = session.execute(query, {"goal_id": goal_id, "user_id": user_id})
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Goal not found")
    
    session.commit()
    
    return {"success": True, "message": "Goal deleted successfully"}


# Milestone endpoints
@router.post("/{goal_id}/milestones")
def create_milestone(request: Request, goal_id: int, payload: CreateMilestoneRequest):
    """Add a milestone to a goal"""
    user_id = require_user(request)
    session = _db(request)
    
    # Verify goal ownership
    check_query = text("SELECT id FROM core.user_goals WHERE id = :goal_id AND user_id = :user_id")
    if not session.execute(check_query, {"goal_id": goal_id, "user_id": user_id}).fetchone():
        raise HTTPException(status_code=404, detail="Goal not found")
    
    query = text("""
        INSERT INTO core.goal_milestones (goal_id, title, description, target_date, order_index)
        VALUES (:goal_id, :title, :description, :target_date, :order_index)
        RETURNING id
    """)
    
    result = session.execute(query, {
        "goal_id": goal_id,
        "title": payload.title,
        "description": payload.description,
        "target_date": payload.target_date,
        "order_index": payload.order_index
    })
    
    milestone_id = result.fetchone()[0]
    session.commit()
    
    return {"success": True, "milestone_id": milestone_id}


@router.put("/{goal_id}/milestones/{milestone_id}")
def update_milestone(request: Request, goal_id: int, milestone_id: int, payload: dict):
    """Update a milestone"""
    user_id = require_user(request)
    session = _db(request)
    
    # Verify goal ownership
    check_query = text("SELECT id FROM core.user_goals WHERE id = :goal_id AND user_id = :user_id")
    if not session.execute(check_query, {"goal_id": goal_id, "user_id": user_id}).fetchone():
        raise HTTPException(status_code=404, detail="Goal not found")
    
    updates = []
    params = {"milestone_id": milestone_id, "goal_id": goal_id}
    
    if "title" in payload:
        updates.append("title = :title")
        params["title"] = payload["title"]
    if "description" in payload:
        updates.append("description = :description")
        params["description"] = payload["description"]
    if "target_date" in payload:
        updates.append("target_date = :target_date")
        params["target_date"] = payload["target_date"]
    if "status" in payload:
        updates.append("status = :status")
        params["status"] = payload["status"]
        if payload["status"] == "completed":
            updates.append("completed_at = CURRENT_TIMESTAMP")
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    query = text(f"""
        UPDATE core.goal_milestones 
        SET {', '.join(updates)}
        WHERE id = :milestone_id AND goal_id = :goal_id
        RETURNING id
    """)
    
    result = session.execute(query, params)
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    session.commit()
    
    return {"success": True, "message": "Milestone updated successfully"}


@router.delete("/{goal_id}/milestones/{milestone_id}")
def delete_milestone(request: Request, goal_id: int, milestone_id: int):
    """Delete a milestone"""
    user_id = require_user(request)
    session = _db(request)
    
    # Verify goal ownership
    check_query = text("SELECT id FROM core.user_goals WHERE id = :goal_id AND user_id = :user_id")
    if not session.execute(check_query, {"goal_id": goal_id, "user_id": user_id}).fetchone():
        raise HTTPException(status_code=404, detail="Goal not found")
    
    query = text("""
        DELETE FROM core.goal_milestones 
        WHERE id = :milestone_id AND goal_id = :goal_id
        RETURNING id
    """)
    
    result = session.execute(query, {"milestone_id": milestone_id, "goal_id": goal_id})
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    session.commit()
    
    return {"success": True, "message": "Milestone deleted successfully"}


# ============================================================================
# AI Milestone Generation
# ============================================================================

class GenerateMilestonesRequest(BaseModel):
    target_months: int = 12  # User's desired timeline in months
    

def _get_gemini_models():
    """Get list of Gemini models to try"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    genai.configure(api_key=api_key)
    
    # Prioritize fast models - same as chatbot
    return [
        "models/gemma-3-4b-it",  # Free model, no rate limit
        "models/gemma-3-1b-it",
        "gemini-2.0-flash",
        "models/gemini-2.0-flash-lite",
        "gemini-1.5-flash-latest",
        "gemini-pro",
    ]


def _generate_with_fallback(prompt: str, max_tokens: int = 1000):
    """Generate content with fallback to multiple models"""
    models = _get_gemini_models()
    last_error = None
    
    for model_name in models:
        try:
            logger.info(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.5,
                )
            )
            logger.info(f"Success with model: {model_name}")
            return response.text.strip()
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")
            last_error = e
            continue
    
    raise last_error or Exception("All models failed")


def _get_roadmap_data(session: Session, career_id: str) -> dict:
    """Get roadmap data for a career"""
    # Try to find career by slug or onet_code
    career_query = text("""
        SELECT c.id, c.slug, c.title_vi, c.title_en, c.onet_code
        FROM core.careers c
        WHERE c.slug = :career_id OR c.onet_code = :career_id OR CAST(c.id AS TEXT) = :career_id
        LIMIT 1
    """)
    career_row = session.execute(career_query, {"career_id": career_id}).fetchone()
    
    if not career_row:
        return None
    
    career_db_id = career_row.id
    career_title = career_row.title_vi or career_row.title_en or career_row.slug
    
    # Get roadmap
    roadmap_query = text("""
        SELECT r.id, r.title
        FROM core.roadmaps r
        WHERE r.career_id = :career_id
        LIMIT 1
    """)
    roadmap_row = session.execute(roadmap_query, {"career_id": career_db_id}).fetchone()
    
    if not roadmap_row:
        return {
            "career_title": career_title,
            "milestones": []
        }
    
    # Get roadmap milestones
    milestones_query = text("""
        SELECT rm.order_no, rm.skill_name, rm.description, rm.estimated_duration, rm.resources_json
        FROM core.roadmap_milestones rm
        WHERE rm.roadmap_id = :roadmap_id
        ORDER BY rm.order_no ASC
    """)
    milestone_rows = session.execute(milestones_query, {"roadmap_id": roadmap_row.id}).fetchall()
    
    milestones = []
    for m in milestone_rows:
        milestones.append({
            "order": m.order_no or 0,
            "skill_name": m.skill_name,
            "description": m.description,
            "estimated_duration": m.estimated_duration,
            "resources": m.resources_json or []
        })
    
    return {
        "career_title": career_title,
        "milestones": milestones
    }


def _parse_duration_to_weeks(duration_str: str) -> int:
    """Parse duration string to weeks"""
    if not duration_str:
        return 2
    
    duration_lower = duration_str.lower()
    
    # Parse weeks
    if "week" in duration_lower or "tuần" in duration_lower:
        try:
            num = int(''.join(filter(str.isdigit, duration_str)))
            return max(1, num)
        except:
            return 2
    
    # Parse months
    if "month" in duration_lower or "tháng" in duration_lower:
        try:
            num = int(''.join(filter(str.isdigit, duration_str)))
            return max(1, num * 4)
        except:
            return 4
    
    # Parse days
    if "day" in duration_lower or "ngày" in duration_lower:
        try:
            num = int(''.join(filter(str.isdigit, duration_str)))
            return max(1, num // 7) or 1
        except:
            return 1
    
    return 2


@router.post("/{goal_id}/generate-milestones")
def generate_ai_milestones(request: Request, goal_id: int, payload: GenerateMilestonesRequest):
    """
    AI generates milestones based on career roadmap data.
    If user's target time is too short, AI will warn them.
    """
    user_id = require_user(request)
    session = _db(request)
    
    # Check Pro subscription
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    if not subscription["is_premium"] or subscription["plan_name"] not in ["Pro", "Gói Pro"]:
        raise HTTPException(
            status_code=403, 
            detail="AI Milestone Generation is a Pro feature."
        )
    
    # Get goal info
    goal_query = text("""
        SELECT id, career_id, career_name, goal_text
        FROM core.user_goals
        WHERE id = :goal_id AND user_id = :user_id
    """)
    goal_row = session.execute(goal_query, {"goal_id": goal_id, "user_id": user_id}).fetchone()
    
    if not goal_row:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    career_id = goal_row.career_id
    career_name = goal_row.career_name or "Unknown Career"
    goal_text = goal_row.goal_text
    
    # Get roadmap data
    roadmap_data = None
    if career_id:
        roadmap_data = _get_roadmap_data(session, career_id)
    
    # Calculate recommended time based on roadmap
    recommended_weeks = 0
    if roadmap_data and roadmap_data.get("milestones"):
        for m in roadmap_data["milestones"]:
            recommended_weeks += _parse_duration_to_weeks(m.get("estimated_duration", "2 weeks"))
    else:
        recommended_weeks = 52  # Default 1 year if no roadmap
    
    recommended_months = max(1, recommended_weeks // 4)
    target_months = payload.target_months
    
    # Check if time is too short
    time_warning = None
    if target_months < recommended_months * 0.5:
        time_warning = f"⚠️ Thời gian {target_months} tháng có thể quá ngắn. Khuyến nghị tối thiểu {recommended_months} tháng để hoàn thành đầy đủ lộ trình."
    elif target_months < recommended_months * 0.75:
        time_warning = f"⚡ Thời gian {target_months} tháng khá gấp. Bạn cần học tập chăm chỉ hơn bình thường."
    
    # Build prompt for AI - keep it short for faster response
    roadmap_info = ""
    if roadmap_data and roadmap_data.get("milestones"):
        roadmap_info = f"Lộ trình có sẵn: "
        skills = [m['skill_name'] for m in roadmap_data["milestones"][:5]]  # Limit to 5
        roadmap_info += ", ".join(skills)
    
    prompt = f"""Tạo 5 milestone cho mục tiêu "{goal_text}" ({career_name}) trong {target_months} tháng.

{roadmap_info}

Trả về JSON array:
[{{"title":"...","description":"...","estimated_weeks":4}}]

CHỈ JSON, không text khác."""

    try:
        # Use fallback function that tries multiple models
        response_text = _generate_with_fallback(prompt, max_tokens=1000)
        
        # Clean up response - extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        try:
            milestones_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to find JSON array in response
            import re
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                milestones_data = json.loads(json_match.group())
            else:
                raise HTTPException(status_code=500, detail="AI response format error")
        
        if not isinstance(milestones_data, list):
            raise HTTPException(status_code=500, detail="AI response format error")
        
        # Delete existing milestones for this goal
        delete_query = text("DELETE FROM core.goal_milestones WHERE goal_id = :goal_id")
        session.execute(delete_query, {"goal_id": goal_id})
        
        # Calculate target dates and insert milestones
        start_date = datetime.now().date()
        current_date = start_date
        created_milestones = []
        
        for idx, m in enumerate(milestones_data):
            title = m.get("title", f"Milestone {idx + 1}")
            description = m.get("description", "")
            estimated_weeks = m.get("estimated_weeks", 4)
            
            # Calculate target date
            target_date = current_date + timedelta(weeks=estimated_weeks)
            current_date = target_date
            
            insert_query = text("""
                INSERT INTO core.goal_milestones (goal_id, title, description, target_date, order_index, status)
                VALUES (:goal_id, :title, :description, :target_date, :order_index, 'pending')
                RETURNING id
            """)
            
            result = session.execute(insert_query, {
                "goal_id": goal_id,
                "title": title,
                "description": description,
                "target_date": target_date,
                "order_index": idx
            })
            
            milestone_id = result.fetchone()[0]
            created_milestones.append({
                "id": milestone_id,
                "title": title,
                "description": description,
                "target_date": str(target_date),
                "estimated_weeks": estimated_weeks,
                "order_index": idx
            })
        
        session.commit()
        
        # Update goal target_date to last milestone date
        if created_milestones:
            last_date = created_milestones[-1]["target_date"]
            update_goal_query = text("""
                UPDATE core.user_goals SET target_date = :target_date, updated_at = CURRENT_TIMESTAMP
                WHERE id = :goal_id
            """)
            session.execute(update_goal_query, {"goal_id": goal_id, "target_date": last_date})
            session.commit()
        
        return {
            "success": True,
            "milestones": created_milestones,
            "recommended_months": recommended_months,
            "target_months": target_months,
            "warning": time_warning,
            "message": f"Đã tạo {len(created_milestones)} milestone cho mục tiêu của bạn",
            "ai_generated": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI milestone generation error: {e}")
        # Fallback: create basic milestones without AI
        return _create_fallback_milestones(session, goal_id, career_name, target_months, recommended_months, time_warning)


def _create_fallback_milestones(session: Session, goal_id: int, career_name: str, target_months: int, recommended_months: int, time_warning: str):
    """Create smart milestones based on career type when AI is unavailable"""
    
    # Delete existing milestones
    delete_query = text("DELETE FROM core.goal_milestones WHERE goal_id = :goal_id")
    session.execute(delete_query, {"goal_id": goal_id})
    
    # Determine career type and create appropriate milestones
    career_lower = career_name.lower()
    
    # Tech/IT careers
    if any(word in career_lower for word in ['developer', 'engineer', 'programmer', 'software', 'data', 'web', 'mobile', 'devops', 'cloud', 'ai', 'machine learning']):
        basic_milestones = [
            {"title": "Học ngôn ngữ lập trình cơ bản", "description": f"Nắm vững ngôn ngữ lập trình chính cho {career_name}. Hoàn thành các bài tập cơ bản.", "weeks": 4},
            {"title": "Xây dựng kiến thức nền tảng", "description": "Học cấu trúc dữ liệu, thuật toán, và các khái niệm cốt lõi.", "weeks": 6},
            {"title": "Thực hành với dự án nhỏ", "description": "Xây dựng 2-3 dự án nhỏ để áp dụng kiến thức đã học.", "weeks": 6},
            {"title": "Học framework/công cụ chuyên sâu", "description": "Nắm vững các framework và công cụ phổ biến trong ngành.", "weeks": 8},
            {"title": "Xây dựng portfolio & tìm việc", "description": "Hoàn thiện portfolio với các dự án thực tế, chuẩn bị CV và phỏng vấn.", "weeks": 4},
        ]
    # Design careers
    elif any(word in career_lower for word in ['design', 'ui', 'ux', 'graphic', 'creative']):
        basic_milestones = [
            {"title": "Học công cụ thiết kế", "description": "Thành thạo Figma, Adobe XD hoặc các công cụ thiết kế chính.", "weeks": 4},
            {"title": "Nắm vững nguyên tắc thiết kế", "description": "Học về typography, color theory, layout và composition.", "weeks": 4},
            {"title": "Thực hành thiết kế", "description": "Redesign các ứng dụng/website có sẵn để luyện tập.", "weeks": 6},
            {"title": "Xây dựng case studies", "description": "Tạo 3-5 case studies chi tiết cho portfolio.", "weeks": 6},
            {"title": "Portfolio & networking", "description": "Hoàn thiện portfolio, tham gia cộng đồng design.", "weeks": 4},
        ]
    # Marketing careers
    elif any(word in career_lower for word in ['marketing', 'seo', 'content', 'social media', 'digital']):
        basic_milestones = [
            {"title": "Học nền tảng marketing", "description": "Nắm vững các khái niệm marketing cơ bản và digital marketing.", "weeks": 4},
            {"title": "Thành thạo công cụ", "description": "Học Google Analytics, Facebook Ads, Google Ads.", "weeks": 4},
            {"title": "Thực hành chiến dịch", "description": "Chạy các chiến dịch marketing thử nghiệm.", "weeks": 6},
            {"title": "Xây dựng case studies", "description": "Tổng hợp kết quả và tạo case studies.", "weeks": 4},
            {"title": "Tìm kiếm cơ hội", "description": "Chuẩn bị portfolio, CV và tìm việc.", "weeks": 4},
        ]
    # Default for other careers
    else:
        basic_milestones = [
            {"title": "Nghiên cứu ngành nghề", "description": f"Tìm hiểu sâu về {career_name}, các kỹ năng cần thiết và xu hướng ngành.", "weeks": 2},
            {"title": "Học kiến thức nền tảng", "description": "Hoàn thành các khóa học cơ bản và lấy chứng chỉ nếu cần.", "weeks": 6},
            {"title": "Phát triển kỹ năng thực hành", "description": "Thực hành qua các dự án, bài tập thực tế.", "weeks": 8},
            {"title": "Xây dựng kinh nghiệm", "description": "Tìm cơ hội thực tập, freelance hoặc dự án thực tế.", "weeks": 6},
            {"title": "Tìm việc chính thức", "description": "Chuẩn bị CV, portfolio và ứng tuyển.", "weeks": 4},
        ]
    
    # Scale milestones to fit target_months
    total_weeks = sum(m["weeks"] for m in basic_milestones)
    target_weeks = target_months * 4
    scale_factor = target_weeks / total_weeks if total_weeks > 0 else 1
    
    start_date = datetime.now().date()
    current_date = start_date
    created_milestones = []
    
    for idx, m in enumerate(basic_milestones):
        scaled_weeks = max(1, int(m["weeks"] * scale_factor))
        target_date = current_date + timedelta(weeks=scaled_weeks)
        current_date = target_date
        
        insert_query = text("""
            INSERT INTO core.goal_milestones (goal_id, title, description, target_date, order_index, status)
            VALUES (:goal_id, :title, :description, :target_date, :order_index, 'pending')
            RETURNING id
        """)
        
        result = session.execute(insert_query, {
            "goal_id": goal_id,
            "title": m["title"],
            "description": m["description"],
            "target_date": target_date,
            "order_index": idx
        })
        
        milestone_id = result.fetchone()[0]
        created_milestones.append({
            "id": milestone_id,
            "title": m["title"],
            "description": m["description"],
            "target_date": str(target_date),
            "estimated_weeks": scaled_weeks,
            "order_index": idx
        })
    
    session.commit()
    
    return {
        "success": True,
        "milestones": created_milestones,
        "recommended_months": recommended_months,
        "target_months": target_months,
        "warning": time_warning,
        "message": f"Đã tạo {len(created_milestones)} milestone cho mục tiêu của bạn",
        "ai_generated": False
    }
