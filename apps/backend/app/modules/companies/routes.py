"""
Company Job Listings API
GET  /api/companies                       → all (paginated)
GET  /api/companies/group/{slug}          → by career group slug
GET  /api/companies/onet/{code}           → by O*NET major group code
GET  /api/companies/search?q=             → search by name
GET  /api/companies/groups/summary        → count per group
GET  /api/companies/scheduler/status      → scheduler info
POST /api/companies/scheduler/trigger     → manual trigger (admin)
GET  /api/companies/update-logs           → update history
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from app.core.serialization import ORJSONResponse
from .models import Company

router = APIRouter(prefix="/api/companies", tags=["companies"])


def _to_dict(c: Company) -> dict:
    return {
        "id": c.id,
        "career_group_id":   c.career_group_id,
        "career_group_slug": c.career_group_slug,
        "career_group_name": c.career_group_name,
        "onet_major_group":  c.onet_major_group,
        "name":         c.name,
        "name_vn":      c.name_vn,
        "description":  c.description,
        "industry":     c.industry,
        "size":         c.size,
        "location":     c.location,
        "urls": {
            "careers":      c.careers_url,
            "linkedin":     c.linkedin_url,
            "vietnamworks": c.vietnamworks_url,
            "topcv":        c.topcv_url,
            "itviec":       c.itviec_url,
            "jobstreet":    c.jobstreet_url,
            "other":        c.other_url,
        },
        "verified": c.verified,
    }


@router.get("/")
def list_companies(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    rows = db.query(Company).filter(Company.is_active == True).offset(offset).limit(limit).all()
    total = db.query(Company).filter(Company.is_active == True).count()
    return ORJSONResponse({"total": total, "items": [_to_dict(c) for c in rows]})


@router.get("/group/{slug}")
def by_group(slug: str, db: Session = Depends(get_db)):
    rows = db.query(Company).filter(
        Company.career_group_slug == slug,
        Company.is_active == True,
    ).order_by(Company.name).all()
    return ORJSONResponse([_to_dict(c) for c in rows])


@router.get("/onet/{code}")
def by_onet(code: str, db: Session = Depends(get_db)):
    rows = db.query(Company).filter(
        Company.onet_major_group == code,
        Company.is_active == True,
    ).order_by(Company.name).all()
    return ORJSONResponse([_to_dict(c) for c in rows])


@router.get("/search")
def search(
    q: str = Query(..., min_length=2),
    group_slug: Optional[str] = None,
    db: Session = Depends(get_db),
):
    qry = db.query(Company).filter(
        Company.is_active == True,
        or_(
            Company.name.ilike(f"%{q}%"),
            Company.name_vn.ilike(f"%{q}%"),
            Company.description.ilike(f"%{q}%"),
        )
    )
    if group_slug:
        qry = qry.filter(Company.career_group_slug == group_slug)
    rows = qry.order_by(Company.name).limit(50).all()
    return ORJSONResponse([_to_dict(c) for c in rows])


@router.get("/groups/summary")
def groups_summary(db: Session = Depends(get_db)):
    """Count of companies per career group."""
    from sqlalchemy import func
    rows = (
        db.query(
            Company.career_group_id,
            Company.career_group_slug,
            Company.career_group_name,
            func.count(Company.id).label("count"),
        )
        .filter(Company.is_active == True)
        .group_by(Company.career_group_id, Company.career_group_slug, Company.career_group_name)
        .order_by(Company.career_group_id)
        .all()
    )
    return ORJSONResponse([
        {"group_id": r[0], "slug": r[1], "name": r[2], "company_count": r[3]}
        for r in rows
    ])


# ── Scheduler management ───────────────────────────────────────────
@router.get("/scheduler/status")
def scheduler_status():
    """Return scheduler state and next run times."""
    from .scheduler import get_scheduler_status
    return ORJSONResponse(get_scheduler_status())


@router.post("/scheduler/trigger")
def trigger_update(
    slugs: Optional[List[str]] = None,
    current_user: User = Depends(get_current_user_from_token),
):
    """
    Manually trigger a company update job (admin only).
    Pass slugs=null to update ALL groups.
    """
    if getattr(current_user, "role", "") != "admin":
        from fastapi import HTTPException
        raise HTTPException(403, "Admin only")
    from .scheduler import trigger_now
    result = trigger_now(slugs=slugs)
    return ORJSONResponse(result)


@router.get("/update-logs")
def update_logs(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Recent company update log entries."""
    try:
        from .updater import CompanyUpdateLog
        rows = (
            db.query(CompanyUpdateLog)
            .order_by(desc(CompanyUpdateLog.run_at))
            .limit(limit)
            .all()
        )
        return ORJSONResponse([
            {
                "id": r.id,
                "run_at": r.run_at.isoformat() if r.run_at else None,
                "group_slug": r.group_slug,
                "source": r.source,
                "inserted": r.inserted,
                "updated": r.updated,
                "skipped": r.skipped,
                "errors": r.errors,
                "detail": r.detail,
            }
            for r in rows
        ])
    except Exception as e:
        return ORJSONResponse({"error": str(e)})
