import csv
import importlib.util as _importlib_util
import json
import logging
import secrets
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any, Mapping

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import (
    TIMESTAMP,
    BigInteger,
    Column,
    Integer,
    Text,
    case,
    func,
    or_,
    select,
    text,
    Table,
    MetaData,
)
from sqlalchemy.orm import Session, registry

from ...core.jwt import require_admin
from ..assessments.models import Assessment, AssessmentForm, AssessmentQuestion
from ..content.models import BlogPost, Career, CareerKSA, Comment
from ..system.models import AppSettings
from ..users.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


# ----- Helpers -----
def _parse_date(date_str: str | None, field_name: str) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}. Use ISO 8601 format.")


def _enum_to_str(value):
    return value.value if hasattr(value, "value") else str(value)


def _iso_or_none(dt: Any) -> str | None:
    try:
        return dt.isoformat() if dt else None
    except Exception:
        return None


def _payment_to_dict(
    payment_row: Mapping[str, Any] | Any,
    email: str | None = None,
    full_name: str | None = None,
    include_callback: bool = False,
) -> dict:
    """
    Convert payment row (dict-like) to response shape.
    Uses `transaction_id` as order_id fallback for legacy schemas without order_id.
    """
    if hasattr(payment_row, "_mapping"):
        p: dict[str, Any] = dict(payment_row._mapping)  # type: ignore[attr-defined]
    elif isinstance(payment_row, dict):
        p = payment_row
    else:
        p = getattr(payment_row, "__dict__", {}) or {}
    amount_val = p.get("amount")
    try:
        amount_val = int(amount_val) if amount_val is not None else None
    except Exception:
        pass

    data = {
        "id": p.get("id"),
        "user_id": p.get("user_id"),
        "order_id": p.get("order_id") or p.get("app_trans_id"),
        "app_trans_id": p.get("app_trans_id"),
        "amount": amount_val,
        "currency": "VND",
        "description": p.get("description"),
        "payment_method": _enum_to_str(p.get("payment_method")),
        "status": _enum_to_str(p.get("status")),
        "order_url": p.get("order_url"),
        "zp_trans_token": p.get("zp_trans_token"),
        "created_at": _iso_or_none(p.get("created_at")),
        "paid_at": _iso_or_none(p.get("paid_at")),
        "updated_at": _iso_or_none(p.get("updated_at")),
        "user": {
            "id": p.get("user_id"),
            "email": email,
            "full_name": full_name,
        }
        if email or full_name
        else None,
    }

    if include_callback:
        parsed_callback = None
        raw_cb = p.get("callback_data") or p.get("payment_gateway_response")
        if raw_cb:
            try:
                parsed_callback = json.loads(raw_cb)
            except Exception:
                parsed_callback = raw_cb
        data["callback_data"] = parsed_callback
    return data


def _payments_table(session: Session) -> Table:
    """
    Reflect payments table (legacy-friendly) from DB.
    """
    metadata = MetaData()
    return Table("payments", metadata, schema="core", autoload_with=session.bind)


# ----- Dashboard & AI metrics -----
@router.get("/dashboard")
def dashboard_metrics(request: Request):
    _ = require_admin(request)
    session = _db(request)
    total_users = session.execute(select(func.count(User.id))).scalar() or 0
    total_assessments = session.execute(select(func.count(Assessment.id))).scalar() or 0
    # recent 7 days
    recent_assessments = (
        session.execute(
            text(
                """
        SELECT COUNT(*) FROM core.assessments 
        WHERE created_at >= now() - interval '7 days'
    """
            )
        ).scalar()
        or 0
    )
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
def ai_metrics(request: Request):
    _ = require_admin(request)
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


# ----- Transactions / Payments (admin) -----
@router.get("/transactions")
def list_transactions(
    request: Request,
    status: str | None = Query(None, description="pending/success/failed/cancelled"),
    paymentMethod: str | None = Query(None, description="zalopay/momo/vnpay"),
    search: str | None = Query(None, description="order id, app trans id, email"),
    userId: int | None = Query(None, ge=1),
    fromDate: str | None = Query(None, description="ISO start date"),
    toDate: str | None = Query(None, description="ISO end date"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    _ = require_admin(request)
    session = _db(request)

    start_dt = _parse_date(fromDate, "fromDate")
    end_dt = _parse_date(toDate, "toDate")

    payments = _payments_table(session)
    user_tbl = User.__table__
    payment_cols = set(payments.c.keys())

    filters = []
    if status:
        status_val = status.lower()
        filters.append(func.lower(payments.c.status) == status_val)
    if paymentMethod:
        filters.append(func.lower(payments.c.payment_method) == paymentMethod.lower())
    if userId:
        filters.append(payments.c.user_id == userId)
    if start_dt:
        filters.append(payments.c.created_at >= start_dt)
    if end_dt:
        filters.append(payments.c.created_at <= end_dt)
    if search:
        like = f"%{search.lower()}%"
        search_filters = [
            func.lower(func.coalesce(payments.c.app_trans_id, "")).like(like),
            func.lower(user_tbl.c.email).like(like),
            func.lower(func.coalesce(user_tbl.c.full_name, "")).like(like),
        ]
        if "order_id" in payment_cols:
            search_filters.append(func.lower(func.coalesce(payments.c.order_id, "")).like(like))
        if "app_trans_id" in payment_cols:
            search_filters.append(func.lower(func.coalesce(payments.c.app_trans_id, "")).like(like))
        if "description" in payment_cols:
            search_filters.append(func.lower(func.coalesce(payments.c.description, "")).like(like))
        filters.append(or_(*search_filters))

    base_stmt = select(
        payments,
        user_tbl.c.email.label("email"),
        user_tbl.c.full_name.label("full_name"),
    ).select_from(payments.join(user_tbl, user_tbl.c.id == payments.c.user_id))
    if filters:
        base_stmt = base_stmt.where(*filters)

    total = session.execute(select(func.count()).select_from(base_stmt.subquery())).scalar() or 0

    rows = session.execute(
        base_stmt.order_by(payments.c.created_at.desc()).limit(limit).offset(offset)
    ).all()

    items = []
    for row in rows:
        mapping = row._mapping
        payment_dict = {col.name: mapping[col.name] for col in payments.c if col.name in mapping}
        items.append(_payment_to_dict(payment_dict, email=mapping.get("email"), full_name=mapping.get("full_name")))

    summary_stmt = select(
        func.coalesce(func.sum(payments.c.amount), 0).label("total_amount"),
        func.coalesce(
            func.sum(case((func.lower(payments.c.status) == "success", payments.c.amount), else_=0)),
            0,
        ).label("success_amount"),
        func.coalesce(func.sum(case((func.lower(payments.c.status) == "success", 1), else_=0)), 0).label(
            "success_count"
        ),
        func.coalesce(func.sum(case((func.lower(payments.c.status) == "pending", 1), else_=0)), 0).label(
            "pending_count"
        ),
        func.coalesce(func.sum(case((func.lower(payments.c.status) == "failed", 1), else_=0)), 0).label(
            "failed_count"
        ),
        func.coalesce(func.sum(case((func.lower(payments.c.status) == "cancelled", 1), else_=0)), 0).label(
            "cancelled_count"
        ),
    ).select_from(payments.join(user_tbl, user_tbl.c.id == payments.c.user_id))

    if filters:
        summary_stmt = summary_stmt.where(*filters)

    summary_row = session.execute(summary_stmt).mappings().first() or {}

    return {
        "items": items,
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "summary": {
            "totalAmount": int(summary_row.get("total_amount") or 0),
            "successAmount": int(summary_row.get("success_amount") or 0),
            "successCount": int(summary_row.get("success_count") or 0),
            "pendingCount": int(summary_row.get("pending_count") or 0),
            "failedCount": int(summary_row.get("failed_count") or 0),
            "cancelledCount": int(summary_row.get("cancelled_count") or 0),
            "currency": "VND",
        },
    }


@router.get("/transactions/export")
def export_transactions(
    request: Request,
    status: str | None = Query(None),
    paymentMethod: str | None = Query(None),
    search: str | None = Query(None),
    userId: int | None = Query(None, ge=1),
    fromDate: str | None = Query(None),
    toDate: str | None = Query(None),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    _ = require_admin(request)
    session = _db(request)

    start_dt = _parse_date(fromDate, "fromDate")
    end_dt = _parse_date(toDate, "toDate")
    payments = _payments_table(session)
    user_tbl = User.__table__
    payment_cols = set(payments.c.keys())

    filters = []
    if status:
        filters.append(func.lower(payments.c.status) == status.lower())
    if paymentMethod:
        filters.append(func.lower(payments.c.payment_method) == paymentMethod.lower())
    if userId:
        filters.append(payments.c.user_id == userId)
    if start_dt:
        filters.append(payments.c.created_at >= start_dt)
    if end_dt:
        filters.append(payments.c.created_at <= end_dt)
    if search:
        like = f"%{search.lower()}%"
        search_filters = [
            func.lower(func.coalesce(payments.c.app_trans_id, "")).like(like),
            func.lower(user_tbl.c.email).like(like),
            func.lower(func.coalesce(user_tbl.c.full_name, "")).like(like),
        ]
        if "order_id" in payment_cols:
            search_filters.append(func.lower(func.coalesce(payments.c.order_id, "")).like(like))
        if "app_trans_id" in payment_cols:
            search_filters.append(func.lower(func.coalesce(payments.c.app_trans_id, "")).like(like))
        if "description" in payment_cols:
            search_filters.append(func.lower(func.coalesce(payments.c.description, "")).like(like))
        filters.append(or_(*search_filters))

    stmt = (
        select(payments, user_tbl.c.email.label("email"), user_tbl.c.full_name.label("full_name"))
        .join(user_tbl, user_tbl.c.id == payments.c.user_id)
        .order_by(payments.c.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if filters:
        stmt = stmt.where(*filters)

    rows = session.execute(stmt).all()

    csv_buffer = StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(
        [
            "app_trans_id",
            "user_email",
            "user_full_name",
            "amount",
            "currency",
            "status",
            "payment_method",
            "created_at",
            "updated_at",
            "payment_gateway_response",
        ]
    )

    for row in rows:
        mapping = row._mapping
        payment = {col.name: mapping[col.name] for col in payments.c if col.name in mapping}
        writer.writerow(
            [
                payment.get("app_trans_id") or payment.get("order_id") or "",
                mapping.get("email") or "",
                mapping.get("full_name") or "",
                payment.get("amount") or 0,
                "VND",
                _enum_to_str(payment.get("status")),
                _enum_to_str(payment.get("payment_method")),
                _iso_or_none(payment.get("created_at")) or "",
                _iso_or_none(payment.get("updated_at")) or "",
                (payment.get("callback_data") or ""),
            ]
        )

    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    csv_buffer.seek(0)
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/transactions/{order_id}")
def get_transaction(request: Request, order_id: str):
    _ = require_admin(request)
    session = _db(request)
    payments = _payments_table(session)
    user_tbl = User.__table__
    order_col = payments.c.get("order_id") if hasattr(payments.c, "get") else None
    app_col = payments.c.get("app_trans_id") if hasattr(payments.c, "get") else None
    filters = []
    if app_col is not None:
        filters.append(app_col == order_id)
    if order_col is not None:
        filters.append(order_col == order_id)
    stmt = (
        select(payments, user_tbl.c.email.label("email"), user_tbl.c.full_name.label("full_name"))
        .join(user_tbl, user_tbl.c.id == payments.c.user_id)
        .where(or_(*filters)) if filters else None
    )
    if stmt is None:
        raise HTTPException(status_code=400, detail="Payments schema missing identifier columns")
    stmt = stmt.limit(1)
    row = session.execute(stmt).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")
    payment = {col.name: row.get(col.name) for col in payments.c if col.name in row}
    return {"transaction": _payment_to_dict(payment, email=row.get("email"), full_name=row.get("full_name"), include_callback=True)}


@router.delete("/transactions/{order_id}")
def delete_transaction(request: Request, order_id: str):
    """
    Delete a transaction by transaction_id or order_id (legacy).
    """
    _ = require_admin(request)
    session = _db(request)
    payments = _payments_table(session)

    order_col = payments.c.get("order_id") if hasattr(payments.c, "get") else None
    txn_col = payments.c.get("app_trans_id") if hasattr(payments.c, "get") else None

    if txn_col is None and order_col is None:
        raise HTTPException(status_code=400, detail="Payments schema missing identifier columns")

    filters = []
    if txn_col is not None:
        filters.append(txn_col == order_id)
    if order_col is not None:
        filters.append(order_col == order_id)

    stmt = payments.delete().where(or_(*filters))
    result = session.execute(stmt)
    session.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "deleted", "deleted": int(result.rowcount)}



@router.get("/feedback")
def user_feedback(
    request: Request,
    startDate: str | None = None,
    endDate: str | None = None,
    minRating: int | None = None,
):
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
            "assessment_id": str(getattr(x, "assessment_id", None)) if getattr(x, "assessment_id", None) is not None else None,
            "rating": int(getattr(x, "rating", 0) or 0),
            "comment": x.comment,
            "created_at": _iso_or_none(getattr(x, "created_at", None)),
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
        s = AppSettings(
            id=1,
            app_title="CareerBridge AI",
            app_name="CareerBridge",
            footer_html="© 2025 CareerBridge AI",
        )
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
    s.updated_by = admin_id  # type: ignore[assignment]
    session.commit()
    session.refresh(s)
    return s.to_dict()


# ----- Careers CRUD -----
def _career_to_client(c: Career) -> dict:
    dto = c.to_dict()
    return {
        "id": str(c.id),
        "title": dto.get("title"),
        "description": dto.get("short_desc") or "",
        "required_skills": [],
        "salary_range": {"min": 0, "max": 0, "currency": "VND"},
        "industry_category": "",
        "riasec_profile": {
            "realistic": 0,
            "investigative": 0,
            "artistic": 0,
            "social": 0,
            "enterprising": 0,
            "conventional": 0,
        },
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/careers")
def list_careers(
    request: Request,
    industryCategory: str | None = Query(None),  # placeholder; not filtered in current schema
    q: str | None = Query(None, description="search by title/slug"),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    _ = require_admin(request)
    session = _db(request)
    from sqlalchemy import func as safunc
    from sqlalchemy import or_

    stmt = select(Career)
    if q:
        like = f"%{q.lower()}%"
        # title via dto columns
        from sqlalchemy import func

        title_expr = func.coalesce(Career.title_vi, Career.title_en)
        stmt = stmt.where(or_(title_expr.ilike(like), Career.slug.ilike(like)))

    total = session.execute(select(safunc.count(Career.id)).select_from(stmt.subquery())).scalar() or 0
    rows = session.execute(stmt.order_by(Career.created_at.desc()).limit(limit).offset(offset)).scalars().all()
    items = [_career_to_client(c) for c in rows]
    return {"items": items, "total": int(total), "limit": limit, "offset": offset}


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
    description = str(payload.get("description") or "")
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    slug = "-".join(title.lower().split())[:100]
    c = Career(title_vi=title, slug=slug, short_desc_vn=description[:160])
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
        c.title_vi = payload["title"].strip()
    if "description" in payload:
        desc = str(payload.get("description") or "")
        c.short_desc_vn = desc[:160]
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


_has_multipart = _importlib_util.find_spec("multipart") is not None

# ----- File Upload (admin only) -----
if _has_multipart:

    @router.post("/upload")
    def upload_media(request: Request, file: UploadFile = File(...)):
        _ = require_admin(request)
        content_type = (file.content_type or "").lower()
        allowed = {
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/webp",
            "image/svg+xml",
        }
        if content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported content_type: {content_type}")

        # Resolve static uploads directory: app/static/uploads
        base_dir = Path(__file__).resolve().parents[3] / "app" / "static" / "uploads"
        base_dir.mkdir(parents=True, exist_ok=True)

        # Safe filename
        ext = Path(file.filename or "").suffix.lower() or ".bin"
        rand = secrets.token_hex(8)
        fname = f"{rand}{ext}"
        target = base_dir / fname

        # Save
        with target.open("wb") as f:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

        # Build absolute URL using mounted static named 'static'
        try:
            url = request.url_for("static", path=f"uploads/{fname}")
        except Exception:
            # Fallback to base url + /static
            url = str(request.base_url) + f"static/uploads/{fname}"

        return {"url": str(url), "path": f"/static/uploads/{fname}", "filename": fname}

else:

    @router.post("/upload")
    def upload_media_unavailable(request: Request):
        _ = require_admin(request)
        raise HTTPException(status_code=500, detail="Upload disabled: install python-multipart on server")


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
    category = (payload.get("category") or "").strip()
    description = (payload.get("description") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    requested_onet = (payload.get("onet_code") or "GENERIC").strip() or "GENERIC"
    if requested_onet.upper() == "GENERIC":
        exists_career = session.execute(select(Career).where(Career.onet_code == "GENERIC")).scalar_one_or_none()
        if not exists_career:
            base_slug = "generic-skill"
            slug = base_slug
            i = 1
            while session.execute(select(Career).where(Career.slug == slug)).scalar_one_or_none() is not None:
                i += 1
                slug = f"{base_slug}-{i}"
            c = Career(
                slug=slug,
                onet_code="GENERIC",
                title_vi="Kỹ năng chung",
                title_en="Generic Skills",
                short_desc_vn="Nhóm kỹ năng tổng quát",
                short_desc_en="Generic skill bucket",
            )
            session.add(c)
            session.flush()
    try:
        s = CareerKSA(
            onet_code=requested_onet,
            ksa_type=category or "skill",
            name=name,
            category=description,
            level=None,
            importance=None,
            source="custom",
        )
        session.add(s)
        session.commit()
        session.refresh(s)
        return {"skill": _ksa_to_client(s)}
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to create skill: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to create skill")


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
    try:
        session.commit()
        session.refresh(s)
        return {"skill": _ksa_to_client(s)}
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to update skill {skill_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to update skill")


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
    opts = getattr(q, "options_json", None)
    opts = opts or []
    return {
        "id": str(q.id),
        "text": q.prompt,
        "test_type": test_type,
        "dimension": q.question_key or "",
        "question_type": "multiple_choice" if opts else "scale",
        "options": opts,
        "scale_range": {"min": 1, "max": 5},
        "is_active": True,
        "created_at": _iso_or_none(getattr(q, "created_at", None)),
        "updated_at": _iso_or_none(getattr(q, "created_at", None)),
    }


@router.get("/questions")
def list_questions(
    request: Request,
    testType: str | None = Query(None),
    isActive: bool | None = Query(None),  # placeholder; AssessmentQuestion chưa có cột is_active
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    _ = require_admin(request)
    session = _db(request)

    # Base query join form to get form_type
    base = select(AssessmentQuestion, AssessmentForm.form_type).join(
        AssessmentForm, AssessmentForm.id == AssessmentQuestion.form_id
    )
    if testType:
        base = base.where(AssessmentForm.form_type == testType)
    # isActive is not applied (no column); kept for forward compatibility

    total = session.execute(select(func.count()).select_from(base.subquery())).scalar() or 0

    rows = session.execute(
        base.order_by(AssessmentQuestion.form_id.asc(), AssessmentQuestion.question_no.asc()).limit(limit).offset(offset)
    ).all()

    items = [_question_to_client(q, str(ftype) if ftype is not None else "RIASEC") for (q, ftype) in rows]
    return {"items": items, "total": int(total), "limit": limit, "offset": offset}


@router.get("/questions/{question_id}")
def get_question(request: Request, question_id: int):
    _ = require_admin(request)
    session = _db(request)
    q = session.get(AssessmentQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    f = session.get(AssessmentForm, q.form_id) if q.form_id is not None else None
    test_type = str(f.form_type) if f and f.form_type is not None else "RIASEC"
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

    max_no = (
        session.execute(
            select(func.coalesce(func.max(AssessmentQuestion.question_no), 0)).where(AssessmentQuestion.form_id == form.id)
        ).scalar()
        or 0
    )
    q = AssessmentQuestion(
        form_id=form.id,
        question_no=max_no + 1,
        question_key=dimension,
        prompt=text,
        options_json=options or None,
        reverse_score=False,
    )
    session.add(q)
    session.commit()
    session.refresh(q)
    form_type = str(form.form_type) if form.form_type is not None else "RIASEC"
    return {"question": _question_to_client(q, form_type)}


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
        q.options_json = payload.get("options") or None  # type: ignore[assignment]
    session.commit()
    f = session.get(AssessmentForm, q.form_id) if q.form_id is not None else None
    form_type = str(f.form_type) if f and f.form_type is not None else "RIASEC"
    return {"question": _question_to_client(q, form_type)}


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
def list_users(
    request: Request,
    q: str | None = Query(None, description="search by email or full_name"),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    _ = require_admin(request)
    session = _db(request)
    stmt = select(User)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(User.email).like(like) | func.lower(User.full_name).like(like))
    total = session.execute(select(func.count(User.id)).select_from(stmt.subquery())).scalar() or 0
    rows = session.execute(stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)).scalars().all()
    items = []
    for u in rows:
        items.append(
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_locked": u.is_locked,
                "is_email_verified": getattr(u, "is_email_verified", False),
                "email_verified_at": _iso_or_none(getattr(u, "email_verified_at", None)),
                "created_at": _iso_or_none(getattr(u, "created_at", None)),
            }
        )
    return {"items": items, "total": int(total), "limit": limit, "offset": offset}


@router.post("/users")
def create_user(request: Request, payload: dict):
    _ = require_admin(request)
    session = _db(request)
    from ...core.security import hash_password
    from ..users.models import User  # local import to avoid cycles

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
        raise HTTPException(
            status_code=400,
            detail={"message": "Email already registered", "error_code": "EMAIL_ALREADY_REGISTERED"},
        )
    from ...core.email_verifier import is_deliverable_email

    ok, reason = is_deliverable_email(email)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={"message": f"Email is not deliverable: {reason}", "error_code": "EMAIL_NOT_DELIVERABLE"},
        )
    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role,
        is_locked=False,
        is_email_verified=True,
        email_verified_at=datetime.now(timezone.utc),
    )
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
    from ...core.security import hash_password
    from ..users.models import User

    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if "full_name" in payload:
        u.full_name = payload.get("full_name") or u.full_name  # type: ignore[assignment]
    if "role" in payload:
        role = (payload.get("role") or "").strip().lower()
        if role not in {"admin", "user"}:
            raise HTTPException(status_code=400, detail="Invalid role")
        u.role = role  # type: ignore[assignment]
    if "is_locked" in payload:
        u.is_locked = bool(payload.get("is_locked"))  # type: ignore[assignment]
    if "password" in payload and payload.get("password"):
        u.password_hash = hash_password(payload.get("password"))  # type: ignore[assignment]
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
    admin_id = require_admin(request)
    session = _db(request)
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    content_md = (payload.get("content_md") or payload.get("content") or "").strip()
    if not content_md:
        raise HTTPException(status_code=400, detail="content is required")
    slug = (payload.get("slug") or "").strip() or "-".join(title.lower().split())[:120]
    status = (payload.get("status") or "Draft").strip() or "Draft"
    published_at = datetime.now(timezone.utc) if status.lower() == "published" else None
    exists = session.execute(select(BlogPost).where(BlogPost.slug == slug)).scalar_one_or_none()
    if exists:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"
    p = BlogPost(
        author_id=admin_id,
        title=title,
        slug=slug,
        content_md=content_md,
        status=status,
        published_at=published_at,
    )
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
            setattr(p, field, payload[field] or getattr(p, field))
    status = (p.status or "").strip()
    if status.lower() == "published" and getattr(p, "published_at", None) is None:
        p.published_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    if status.lower() != "published":
        p.published_at = None  # type: ignore[assignment]
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
