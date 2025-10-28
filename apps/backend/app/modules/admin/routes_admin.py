from fastapi import APIRouter, Request, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..users.models import User
from ..assessments.models import AssessmentForm, AssessmentQuestion, Assessment
from ...core.db import engine
from sqlalchemy import text
from ..content.models import Career, CareerKSA, BlogPost, Comment
from ..system.models import AppSettings
from ...core.jwt import require_admin
from sqlalchemy.orm import registry
from sqlalchemy import Column, BigInteger, Integer, Text, TIMESTAMP

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


# ----- Dashboard & AI metrics -----
@router.get("/dashboard")
def dashboard_metrics(request: Request):
    _ = require_admin(request)
    session = _db(request)
    total_users = session.execute(select(func.count(User.id))).scalar() or 0
    total_assessments = session.execute(select(func.count(Assessment.id))).scalar() or 0
    # recent 7 days
    recent_assessments = session.execute(text("""
        SELECT COUNT(*) FROM core.assessments 
        WHERE created_at >= now() - interval '7 days'
    """)).scalar() or 0
    completed_assessments = total_assessments
    completion_rate = float((completed_assessments / total_users) * 100) if total_users else 0.0

    return {
        "totalUsers": total_users,
        "activeUsers": total_users,  # placeholder
        "completedAssessments": completed_assessments,
        "totalAssessments": total_assessments,
        "completionRate": round(completion_rate, 2),
        "usersWithRoadmaps": 0,
        "avgRoadmapProgress": 0,
        "recentAssessments": recent_assessments,
    }


@router.get("/ai-metrics")
def ai_metrics(_: Request):
    # allow only admin
    # using Request not necessary here, but keep signature consistent
    # We won't compute real metrics yet
    return {
        "totalRecommendations": 0,
        "avgRecommendationsPerAssessment": 0,
        "assessmentsWithEssay": 0,
        "avgProcessingTime": 0,
        "riasecDistribution": {
            "realistic": "0%",
            "investigative": "0%",
            "artistic": "0%",
            "social": "0%",
            "enterprising": "0%",
            "conventional": "0%",
        },
        "bigFiveDistribution": {
            "openness": "0%",
            "conscientiousness": "0%",
            "extraversion": "0%",
            "agreeableness": "0%",
            "neuroticism": "0%",
        },
    }


@router.get("/feedback")
def user_feedback(request: Request, startDate: str | None = None, endDate: str | None = None, minRating: int | None = None):
    _ = require_admin(request)
    session = _db(request)

    # Lightweight model mapping
    mapper_registry = registry()

    @mapper_registry.mapped
    class UserFeedback:
        __tablename__ = "user_feedback"
        __table_args__ = {"schema": "core"}
        id = Column(BigInteger, primary_key=True)
        user_id = Column(BigInteger)
        assessment_id = Column(BigInteger)
        rating = Column(Integer)
        comment = Column(Text)
        created_at = Column(TIMESTAMP(timezone=True))

    stmt = select(UserFeedback)
    if minRating is not None:
        stmt = stmt.where(UserFeedback.rating >= minRating)
    if startDate:
        stmt = stmt.where(UserFeedback.created_at >= text("CAST(:sd AS timestamp with time zone)")).params(sd=startDate)
    if endDate:
        stmt = stmt.where(UserFeedback.created_at <= text("CAST(:ed AS timestamp with time zone)")).params(ed=endDate)
    rows = session.execute(stmt.order_by(UserFeedback.created_at.desc()).limit(200)).scalars().all()
    return [
        {
            "id": str(x.id),
            "user_id": str(x.user_id),
            "assessment_id": str(x.assessment_id) if x.assessment_id else None,
            "rating": int(x.rating or 0),
            "comment": x.comment,
            "created_at": x.created_at.isoformat() if x.created_at else None,
        }
        for x in rows
    ]


# ----- App Settings (logo, title, app name, footer) -----
@router.get("/settings")
def get_settings(request: Request):
    _ = require_admin(request)
    session = _db(request)
    s = session.get(AppSettings, 1)
    if not s:
        s = AppSettings(id=1, app_title="CareerBridge AI", app_name="CareerBridge", footer_html="© 2025 CareerBridge AI")
        session.add(s)
        session.commit()
        session.refresh(s)
    return s.to_dict()


@router.put("/settings")
def update_settings(request: Request, payload: dict):
    admin_id = require_admin(request)
    session = _db(request)
    s = session.get(AppSettings, 1)
    if not s:
        s = AppSettings(id=1)
        session.add(s)
    for key in ("logo_url", "app_title", "app_name", "footer_html"):
        if key in payload:
            setattr(s, key, payload.get(key))
    s.updated_by = admin_id
    session.commit()
    session.refresh(s)
    return s.to_dict()


# ----- Careers CRUD -----
def _career_to_client(c: Career) -> dict:
    return {
        "id": str(c.id),
        "title": c.title,
        "description": c.content_md or c.short_desc or "",
        "required_skills": [],
        "salary_range": {"min": 0, "max": 0, "currency": "VND"},
        "industry_category": str(c.category_id or ""),
        "riasec_profile": {"realistic": 0, "investigative": 0, "artistic": 0, "social": 0, "enterprising": 0, "conventional": 0},
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/careers")
def list_careers(request: Request, industryCategory: str | None = Query(None)):
    _ = require_admin(request)
    session = _db(request)
    rows = session.execute(select(Career).order_by(Career.created_at.desc())).scalars().all()
    return [_career_to_client(c) for c in rows]


@router.get("/careers/{career_id}")
def get_career(request: Request, career_id: int):
    _ = require_admin(request)
    session = _db(request)
    c = session.get(Career, career_id)
    if not c:
        raise HTTPException(status_code=404, detail="Career not found")
    return _career_to_client(c)


@router.post("/careers")
def create_career(request: Request, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    title = (payload.get("title") or "").strip()
    description = payload.get("description") or ""
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    slug = "-".join(title.lower().split())[:100]
    c = Career(title=title, slug=slug, short_desc=description[:160], content_md=description)
    session.add(c)
    session.commit()
    session.refresh(c)
    return {"career": _career_to_client(c)}


@router.put("/careers/{career_id}")
def update_career(request: Request, career_id: int, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    c = session.get(Career, career_id)
    if not c:
        raise HTTPException(status_code=404, detail="Career not found")
    if "title" in payload and payload["title"]:
        c.title = payload["title"].strip()
    if "description" in payload:
        desc = payload.get("description") or ""
        c.short_desc = desc[:160]
        c.content_md = desc
    session.commit()
    session.refresh(c)
    return {"career": _career_to_client(c)}


@router.delete("/careers/{career_id}")
def delete_career(request: Request, career_id: int):
    _ = require_admin(request)
    session = _db(request)
    c = session.get(Career, career_id)
    if not c:
        raise HTTPException(status_code=404, detail="Career not found")
    session.delete(c)
    session.commit()
    return {"status": "ok"}


# ----- Skills CRUD (map to career_ksas) -----
def _ksa_to_client(s: CareerKSA) -> dict:
    return s.to_skill()


@router.get("/skills")
def list_skills(request: Request):
    _ = require_admin(request)
    session = _db(request)
    rows = session.execute(select(CareerKSA).order_by(CareerKSA.id.desc()).limit(200)).scalars().all()
    return [_ksa_to_client(x) for x in rows]


@router.get("/skills/{skill_id}")
def get_skill(request: Request, skill_id: int):
    _ = require_admin(request)
    session = _db(request)
    s = session.get(CareerKSA, skill_id)
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _ksa_to_client(s)


@router.post("/skills")
def create_skill(request: Request, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    name = (payload.get("name") or "").strip()
    category = payload.get("category") or ""
    description = payload.get("description") or ""
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    s = CareerKSA(onet_code="custom", ksa_type=category or "skill", name=name, category=description, level=None, importance=None, source="custom")
    session.add(s)
    session.commit()
    session.refresh(s)
    return {"skill": _ksa_to_client(s)}


@router.put("/skills/{skill_id}")
def update_skill(request: Request, skill_id: int, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    s = session.get(CareerKSA, skill_id)
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    if "name" in payload:
        s.name = payload.get("name") or s.name
    if "category" in payload:
        s.ksa_type = payload.get("category") or s.ksa_type
    if "description" in payload:
        s.category = payload.get("description") or s.category
    session.commit()
    session.refresh(s)
    return {"skill": _ksa_to_client(s)}


@router.delete("/skills/{skill_id}")
def delete_skill(request: Request, skill_id: int):
    _ = require_admin(request)
    session = _db(request)
    s = session.get(CareerKSA, skill_id)
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    session.delete(s)
    session.commit()
    return {"status": "ok"}


# ----- Questions CRUD -----
def _question_to_client(q: AssessmentQuestion, test_type: str) -> dict:
    return {
        "id": str(q.id),
        "text": q.prompt,
        "test_type": test_type,
        "dimension": q.question_key or "",
        "question_type": "multiple_choice" if q.options_json else "scale",
        "options": q.options_json or [],
        "scale_range": {"min": 1, "max": 5},
        "is_active": True,
        "created_at": q.created_at.isoformat() if q.created_at else None,
        "updated_at": q.created_at.isoformat() if q.created_at else None,
    }


@router.get("/questions")
def list_questions(request: Request, testType: str | None = Query(None), isActive: bool | None = Query(None)):
    _ = require_admin(request)
    session = _db(request)
    out: list[dict] = []
    forms = session.execute(
        select(AssessmentForm).where(AssessmentForm.form_type == testType) if testType else select(AssessmentForm)
    ).scalars().all()
    for f in forms:
        rows = session.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.form_id == f.id).order_by(AssessmentQuestion.question_no.asc())
        ).scalars().all()
        out.extend([_question_to_client(q, f.form_type) for q in rows])
    return out


@router.get("/questions/{question_id}")
def get_question(request: Request, question_id: int):
    _ = require_admin(request)
    session = _db(request)
    q = session.get(AssessmentQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    f = session.get(AssessmentForm, q.form_id) if q.form_id else None
    test_type = f.form_type if f else "RIASEC"
    return _question_to_client(q, test_type)


@router.post("/questions")
def create_question(request: Request, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    text = payload.get("text") or ""
    test_type = payload.get("testType") or "RIASEC"
    dimension = payload.get("dimension") or ""
    options = payload.get("options") or []
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    form = session.execute(select(AssessmentForm).where(AssessmentForm.form_type == test_type)).scalar_one_or_none()
    if not form:
        form = AssessmentForm(form_type=test_type, title=f"{test_type} form", code=f"{test_type}-default")
        session.add(form)
        session.flush()

    max_no = session.execute(
        select(func.coalesce(func.max(AssessmentQuestion.question_no), 0)).where(AssessmentQuestion.form_id == form.id)
    ).scalar() or 0
    q = AssessmentQuestion(form_id=form.id, question_no=max_no + 1, question_key=dimension, prompt=text, options_json=options or None, reverse_score=False)
    session.add(q)
    session.commit()
    session.refresh(q)
    return {"question": _question_to_client(q, form.form_type)}


@router.put("/questions/{question_id}")
def update_question(request: Request, question_id: int, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    q = session.get(AssessmentQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if "text" in payload:
        q.prompt = payload.get("text") or q.prompt
    if "dimension" in payload:
        q.question_key = payload.get("dimension") or q.question_key
    if "options" in payload:
        q.options_json = payload.get("options") or None
    session.commit()
    f = session.get(AssessmentForm, q.form_id) if q.form_id else None
    return {"question": _question_to_client(q, f.form_type if f else "RIASEC")}


@router.delete("/questions/{question_id}")
def delete_question(request: Request, question_id: int):
    _ = require_admin(request)
    session = _db(request)
    q = session.get(AssessmentQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    session.delete(q)
    session.commit()
    return {"status": "ok"}

# ----- Users Management -----


# ----- User Management (by admin) -----
@router.get("/users")
def list_users(request: Request):
    _ = require_admin(request)
    session = _db(request)
    rows = session.execute(select(User).order_by(User.created_at.desc())).scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_locked": u.is_locked,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]


@router.post("/users")
def create_user(request: Request, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    from ..users.models import User  # local import to avoid cycles
    from ...core.security import hash_password

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    full_name = payload.get("full_name") or ""
    role = (payload.get("role") or "user").strip().lower()
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")
    if role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    exists = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    u = User(email=email, password_hash=hash_password(password), full_name=full_name, role=role, is_locked=False)
    session.add(u)
    session.commit()
    session.refresh(u)
    return {
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_locked": u.is_locked,
    }


@router.patch("/users/{user_id}")
def update_user(request: Request, user_id: int, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    from ..users.models import User
    from ...core.security import hash_password
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if "full_name" in payload:
        u.full_name = payload.get("full_name") or u.full_name
    if "role" in payload:
        role = (payload.get("role") or "").strip().lower()
        if role not in {"admin", "user"}:
            raise HTTPException(status_code=400, detail="Invalid role")
        u.role = role
    if "is_locked" in payload:
        u.is_locked = bool(payload.get("is_locked"))
    if "password" in payload and payload.get("password"):
        u.password_hash = hash_password(payload.get("password"))
    session.commit()
    session.refresh(u)
    return {
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_locked": u.is_locked,
    }

# ----- Blog Management (CRUD) -----
@router.get("/blog")
def admin_list_posts(request: Request, limit: int = 50, offset: int = 0):
    _ = require_admin(request)
    session = _db(request)
    rows = session.execute(select(BlogPost).order_by(BlogPost.created_at.desc()).limit(limit).offset(offset)).scalars().all()
    return [p.to_dict() for p in rows]


@router.post("/blog")
def admin_create_post(request: Request, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    title = (payload.get("title") or "").strip()
    slug = (payload.get("slug") or "").strip() or "-".join(title.lower().split())
    content_md = payload.get("content_md") or ""
    status = payload.get("status") or "Draft"
    p = BlogPost(title=title, slug=slug, content_md=content_md, status=status)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p.to_dict()


@router.put("/blog/{post_id}")
def admin_update_post(request: Request, post_id: int, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    p = session.get(BlogPost, post_id)
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    for field in ("title", "slug", "content_md", "status"):
        if field in payload:
            setattr(p, field, payload[field])
    session.commit()
    session.refresh(p)
    return p.to_dict()


@router.delete("/blog/{post_id}")
def admin_delete_post(request: Request, post_id: int):
    _ = require_admin(request)
    session = _db(request)
    p = session.get(BlogPost, post_id)
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    session.delete(p)
    session.commit()
    return {"status": "ok"}


# ----- Comments Management (basic delete) -----
@router.get("/comments")
def admin_list_comments(request: Request, limit: int = 100, offset: int = 0):
    _ = require_admin(request)
    session = _db(request)
    rows = session.execute(select(Comment).order_by(Comment.created_at.desc()).limit(limit).offset(offset)).scalars().all()
    return [c.to_dict() for c in rows]


@router.delete("/comments/{comment_id}")
def admin_delete_comment(request: Request, comment_id: int):
    _ = require_admin(request)
    session = _db(request)
    c = session.get(Comment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    session.delete(c)
    session.commit()
    return {"status": "ok"}
