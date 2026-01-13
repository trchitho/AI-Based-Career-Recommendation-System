from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ...core.jwt import require_user
from ...core.subscription import SubscriptionService, require_feature_access
from . import service_careers as svc

router = APIRouter()


def _db(request: Request) -> Session:
    return request.state.db


@router.get("")
def list_careers(
    request: Request,
    q: str | None = Query(None, description="search by title/slug"),
    category_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    session = _db(request)
    return svc.list_careers(session, q, category_id, limit, offset)


@router.get("/{id_or_slug}")
def get_career(request: Request, id_or_slug: str):
    user_id = require_user(request)
    session = _db(request)
    
    # Get career data first
    obj = svc.get_career(session, id_or_slug)
    if not obj:
        raise HTTPException(status_code=404, detail="Career not found")
    
    # Check subscription status
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    is_premium = subscription["is_premium"]
    
    if is_premium:
        # Premium users get full access to all details
        return {
            **obj,
            "access_level": "full",
            "upgrade_required": False,
            "access_info": {"allowed": True, "level": "premium"}
        }
    else:
        # Free users get basic level access to all careers
        return {
            **obj,
            # Limit description to basic info only
            "description": (obj.get("description", "") or obj.get("short_desc", ""))[:200] + "..." if len(obj.get("description", "") or obj.get("short_desc", "")) > 200 else (obj.get("description", "") or obj.get("short_desc", "")),
            # Remove or limit advanced details
            "skills": [],  # Hide detailed skills
            "education_requirements": "🔒 Upgrade to view detailed education requirements",
            "salary_range": "🔒 Upgrade to view detailed salary information", 
            "job_outlook": "🔒 Upgrade to view detailed job outlook",
            "detailed_description": "🔒 Upgrade to view full description",
            "career_path": "🔒 Upgrade to view career development path",
            "work_environment": "🔒 Upgrade to view work environment details",
            # Add upgrade info
            "access_level": "basic",
            "upgrade_required": False,  # Can view but with limitations
            "premium_features_locked": True,
            "access_info": {
                "allowed": True,
                "level": "basic",
                "message": "You are viewing at basic level. Upgrade to Premium for full detailed information."
            }
        }


# ---- Roadmap (demo, không lưu DB) ----
@router.get("/{career_id}/roadmap")
def get_roadmap(request: Request, career_id: str):
    user_id = require_user(request)
    session = _db(request)
    
    # Get full roadmap data first
    data = svc.get_roadmap(session, user_id, career_id)
    if not data:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Check subscription for roadmap access
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    is_premium = subscription["is_premium"]
    max_level = subscription["limits"].get("roadmap_max_level", 1)
    
    # Convert milestones to levels (group milestones by level)
    milestones = data.get("milestones", [])
    levels = []
    
    # Group milestones into levels (assume each milestone is a level for now)
    for i, milestone in enumerate(milestones, 1):
        level_data = {
            "level": i,
            "title": milestone.get("skillName", f"Level {i}"),
            "description": milestone.get("description", ""),
            "milestones": [milestone],
            "locked": False,
            "upgrade_required": False
        }
        
        # Check if this level should be locked for free users
        if not is_premium and max_level != -1 and i > max_level:
            level_data.update({
                "description": f"🔒 Upgrade your account to unlock {milestone.get('skillName', f'Level {i}')}",
                "milestones": [],
                "locked": True,
                "upgrade_required": True
            })
        
        levels.append(level_data)
    
    # Add levels to data
    data["levels"] = levels
    data["upgrade_required"] = not is_premium and len(milestones) > max_level
    data["max_free_level"] = max_level if not is_premium else -1
    
    return data


@router.post("/{career_id}/roadmap/milestone/{milestone_id}/complete")
def complete_milestone(request: Request, career_id: str, milestone_id: int):
    user_id = require_user(request)
    session = _db(request)
    data = svc.complete_milestone(session, user_id, career_id, milestone_id)
    if not data:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return data
