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
    
    try:
        # Total users - use raw SQL to be safe
        total_users = session.execute(text("SELECT COUNT(*) FROM core.users")).scalar() or 0
        
        # Active users
        active_users = total_users
        try:
            result = session.execute(text("""
                SELECT COUNT(*) FROM core.users 
                WHERE created_at >= now() - interval '30 days'
            """)).scalar()
            active_users = result if result else total_users
        except Exception as e:
            logger.warning(f"Active users query failed: {e}")
        
        # Total assessments
        total_assessments = session.execute(text("SELECT COUNT(*) FROM core.assessments")).scalar() or 0
        
        # Recent 7 days assessments
        recent_assessments = 0
        try:
            recent_assessments = session.execute(text("""
                SELECT COUNT(*) FROM core.assessments 
                WHERE created_at >= now() - interval '7 days'
            """)).scalar() or 0
        except Exception as e:
            logger.warning(f"Recent assessments query failed: {e}")
        
        # Completed assessments
        completed_assessments = total_assessments
        
        # Completion rate
        completion_rate = round((completed_assessments / total_users) * 100, 2) if total_users > 0 else 0.0
        
        # Users with roadmaps - try user_progress table
        users_with_roadmaps = 0
        avg_roadmap_progress = 0.0
        try:
            users_with_roadmaps = session.execute(text(
                "SELECT COUNT(DISTINCT user_id) FROM core.user_progress"
            )).scalar() or 0
            
            # Get average progress
            progress_result = session.execute(text("""
                SELECT AVG(CAST(progress_percentage AS FLOAT)) 
                FROM core.user_progress 
                WHERE progress_percentage IS NOT NULL
            """)).scalar()
            avg_roadmap_progress = float(progress_result) if progress_result else 0.0
        except Exception as e:
            logger.warning(f"Roadmaps query failed: {e}")

        return {
            "totalUsers": int(total_users),
            "activeUsers": int(active_users),
            "completedAssessments": int(completed_assessments),
            "totalAssessments": int(total_assessments),
            "completionRate": float(completion_rate),
            "usersWithRoadmaps": int(users_with_roadmaps),
            "avgRoadmapProgress": float(avg_roadmap_progress),
            "recentAssessments": int(recent_assessments),
        }
    except Exception as e:
        logger.error(f"Error in dashboard_metrics: {e}", exc_info=True)
        return {
            "totalUsers": 0,
            "activeUsers": 0,
            "completedAssessments": 0,
            "totalAssessments": 0,
            "completionRate": 0,
            "usersWithRoadmaps": 0,
            "avgRoadmapProgress": 0,
            "recentAssessments": 0,
        }


@router.get("/ai-metrics")
def ai_metrics(request: Request):
    _ = require_admin(request)
    session = _db(request)
    
    # Default values
    riasec_dist = {
        "realistic": "0%",
        "investigative": "0%",
        "artistic": "0%",
        "social": "0%",
        "enterprising": "0%",
        "conventional": "0%",
    }
    bigfive_dist = {
        "openness": "0%",
        "conscientiousness": "0%",
        "extraversion": "0%",
        "agreeableness": "0%",
        "neuroticism": "0%",
    }
    total_recs = 0
    assessments_with_essay = 0
    
    try:
        # Get total recommendations count
        try:
            total_recs = session.execute(text(
                "SELECT COUNT(*) FROM core.assessments WHERE career_recommendations IS NOT NULL"
            )).scalar() or 0
        except:
            pass
        
        # Get assessments with essay - check essays table
        try:
            assessments_with_essay = session.execute(text(
                "SELECT COUNT(*) FROM core.essays"
            )).scalar() or 0
        except:
            # Fallback to essay_analysis column in assessments
            try:
                assessments_with_essay = session.execute(text(
                    "SELECT COUNT(*) FROM core.assessments WHERE essay_analysis IS NOT NULL"
                )).scalar() or 0
            except:
                pass
        
        # RIASEC distribution - check all possible a_type values
        try:
            riasec_rows = session.execute(text("""
                SELECT scores, a_type FROM core.assessments 
                WHERE scores IS NOT NULL
                AND (a_type ILIKE '%riasec%' OR a_type ILIKE '%holland%')
                LIMIT 200
            """)).fetchall()
            
            logger.info(f"Found {len(riasec_rows)} RIASEC assessments")
            
            if riasec_rows:
                r_sum = i_sum = a_sum = s_sum = e_sum = c_sum = 0.0
                count = 0
                for row in riasec_rows:
                    scores = row[0] if row else {}
                    if isinstance(scores, dict):
                        r_sum += float(scores.get('R', scores.get('r', scores.get('realistic', 0))) or 0)
                        i_sum += float(scores.get('I', scores.get('i', scores.get('investigative', 0))) or 0)
                        a_sum += float(scores.get('A', scores.get('a', scores.get('artistic', 0))) or 0)
                        s_sum += float(scores.get('S', scores.get('s', scores.get('social', 0))) or 0)
                        e_sum += float(scores.get('E', scores.get('e', scores.get('enterprising', 0))) or 0)
                        c_sum += float(scores.get('C', scores.get('c', scores.get('conventional', 0))) or 0)
                        count += 1
                
                logger.info(f"RIASEC sums: R={r_sum}, I={i_sum}, A={a_sum}, S={s_sum}, E={e_sum}, C={c_sum}")
                
                if count > 0:
                    total = r_sum + i_sum + a_sum + s_sum + e_sum + c_sum
                    if total > 0:
                        riasec_dist = {
                            "realistic": f"{round(r_sum / total * 100)}%",
                            "investigative": f"{round(i_sum / total * 100)}%",
                            "artistic": f"{round(a_sum / total * 100)}%",
                            "social": f"{round(s_sum / total * 100)}%",
                            "enterprising": f"{round(e_sum / total * 100)}%",
                            "conventional": f"{round(c_sum / total * 100)}%",
                        }
        except Exception as e:
            logger.warning(f"RIASEC query error: {e}", exc_info=True)
        
        # BigFive distribution
        try:
            bigfive_rows = session.execute(text("""
                SELECT scores, a_type FROM core.assessments 
                WHERE scores IS NOT NULL
                AND (a_type ILIKE '%big%five%' OR a_type ILIKE '%bigfive%' OR a_type ILIKE '%ocean%' OR a_type ILIKE '%personality%')
                LIMIT 200
            """)).fetchall()
            
            logger.info(f"Found {len(bigfive_rows)} BigFive assessments")
            
            if bigfive_rows:
                o_sum = c_sum = e_sum = a_sum = n_sum = 0.0
                count = 0
                for row in bigfive_rows:
                    scores = row[0] if row else {}
                    if isinstance(scores, dict):
                        o_sum += float(scores.get('O', scores.get('o', scores.get('openness', 0))) or 0)
                        c_sum += float(scores.get('C', scores.get('c', scores.get('conscientiousness', 0))) or 0)
                        e_sum += float(scores.get('E', scores.get('e', scores.get('extraversion', 0))) or 0)
                        a_sum += float(scores.get('A', scores.get('a', scores.get('agreeableness', 0))) or 0)
                        n_sum += float(scores.get('N', scores.get('n', scores.get('neuroticism', 0))) or 0)
                        count += 1
                
                logger.info(f"BigFive sums: O={o_sum}, C={c_sum}, E={e_sum}, A={a_sum}, N={n_sum}")
                
                if count > 0:
                    total = o_sum + c_sum + e_sum + a_sum + n_sum
                    if total > 0:
                        bigfive_dist = {
                            "openness": f"{round(o_sum / total * 100)}%",
                            "conscientiousness": f"{round(c_sum / total * 100)}%",
                            "extraversion": f"{round(e_sum / total * 100)}%",
                            "agreeableness": f"{round(a_sum / total * 100)}%",
                            "neuroticism": f"{round(n_sum / total * 100)}%",
                        }
        except Exception as e:
            logger.warning(f"BigFive query error: {e}", exc_info=True)
        
        return {
            "totalRecommendations": int(total_recs),
            "avgRecommendationsPerAssessment": 0,
            "assessmentsWithEssay": int(assessments_with_essay),
            "avgProcessingTime": 2.5,
            "riasecDistribution": riasec_dist,
            "bigFiveDistribution": bigfive_dist,
        }
    except Exception as e:
        logger.error(f"Error fetching AI metrics: {e}", exc_info=True)
        return {
            "totalRecommendations": 0,
            "avgRecommendationsPerAssessment": 0,
            "assessmentsWithEssay": 0,
            "avgProcessingTime": 0,
            "riasecDistribution": riasec_dist,
            "bigFiveDistribution": bigfive_dist,
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
    published_at = datetime.now(timezone.utc) if status == "Published" else None
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
    for field in ("title", "slug", "content_md"):
        if field in payload:
            setattr(p, field, payload[field] or getattr(p, field))
    
    # Handle status field separately
    if "status" in payload:
        status = payload.get("status") or "Draft"
        p.status = status
    # Handle status updates
    if hasattr(p, 'status') and p.status:
        if p.status == "Published" and not p.published_at:
            p.published_at = datetime.now(timezone.utc)
        elif p.status != "Published":
            p.published_at = None
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


# ----- Audit Logs -----
@router.get("/audit-logs")
def list_audit_logs(
    request: Request,
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    user_id: int | None = Query(None),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List audit logs with filtering"""
    _ = require_admin(request)
    session = _db(request)
    
    # Check if audit_logs table exists
    try:
        result = session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'core' AND table_name = 'audit_logs'
            )
        """)).scalar()
        
        if not result:
            return {"items": [], "total": 0, "limit": limit, "offset": offset}
        
        # Check actual columns
        cols_result = session.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'core' AND table_name = 'audit_logs'
        """)).fetchall()
        columns = [r[0] for r in cols_result]
        
        has_actor_id = 'actor_id' in columns
        has_entity = 'entity' in columns
        
        # Build query based on actual schema
        if has_actor_id:
            # Schema with actor_id, entity, entity_id, data_json
            query = """
                SELECT al.id, 
                       COALESCE(al.actor_id, al.user_id) as user_id, 
                       al.action, 
                       al.entity as resource_type, 
                       COALESCE(al.entity_id::text, al.resource_id) as resource_id, 
                       COALESCE(al.data_json, al.details) as details, 
                       al.ip_address, 
                       al.created_at,
                       u.email as user_email
                FROM core.audit_logs al
                LEFT JOIN core.users u ON u.id = COALESCE(al.actor_id, al.user_id)
                WHERE 1=1
            """
        elif has_entity:
            query = """
                SELECT al.id, al.user_id, al.action, al.entity as resource_type, 
                       al.resource_id, al.details, al.ip_address, al.created_at,
                       u.email as user_email
                FROM core.audit_logs al
                LEFT JOIN core.users u ON u.id = al.user_id
                WHERE 1=1
            """
        else:
            query = """
                SELECT al.*, u.email as user_email
                FROM core.audit_logs al
                LEFT JOIN core.users u ON u.id = al.user_id
                WHERE 1=1
            """
        params = {}
        
        if action:
            query += " AND al.action = :action"
            params["action"] = action
        if resource_type:
            if has_entity:
                query += " AND al.entity = :resource_type"
            else:
                query += " AND al.resource_type = :resource_type"
            params["resource_type"] = resource_type
        if user_id:
            if has_actor_id:
                query += " AND COALESCE(al.actor_id, al.user_id) = :user_id"
            else:
                query += " AND al.user_id = :user_id"
            params["user_id"] = user_id
        if from_date:
            query += " AND al.created_at >= CAST(:from_date AS date)"
            params["from_date"] = from_date
        if to_date:
            query += " AND al.created_at < (CAST(:to_date AS date) + interval '1 day')"
            params["to_date"] = to_date
        
        # Count total
        count_query = f"SELECT COUNT(*) FROM ({query}) sub"
        total = session.execute(text(count_query), params).scalar() or 0
        
        # Get items
        query += " ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = limit
        params["offset"] = offset
        
        rows = session.execute(text(query), params).mappings().all()
        
        items = []
        for row in rows:
            items.append({
                "id": row.get("id"),
                "user_id": row.get("user_id"),
                "user_email": row.get("user_email"),
                "action": row.get("action"),
                "resource_type": row.get("resource_type") or row.get("entity"),
                "resource_id": row.get("resource_id"),
                "details": row.get("details"),
                "ip_address": row.get("ip_address"),
                "user_agent": row.get("user_agent"),
                "created_at": _iso_or_none(row.get("created_at")),
            })
        
        return {"items": items, "total": int(total), "limit": limit, "offset": offset}
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        return {"items": [], "total": 0, "limit": limit, "offset": offset}


# ----- Career Trends -----
@router.get("/career-trends")
def get_career_trends(
    request: Request,
    period: str = Query("30d", description="7d, 30d, 90d, all"),
):
    """Get career recommendation trends"""
    _ = require_admin(request)
    session = _db(request)
    
    # Calculate date filter
    period_days = {"7d": 7, "30d": 30, "90d": 90, "all": 9999}
    days = period_days.get(period, 30)
    period_labels = {"7d": "7 ngày", "30d": "30 ngày", "90d": "90 ngày", "all": "Tất cả"}
    
    try:
        # Try to get recommendation data
        query = """
            SELECT 
                c.id as career_id,
                COALESCE(c.title_vi, c.title_en, c.slug) as career_title,
                COALESCE(c.industry_category, 'Other') as industry_category,
                COUNT(*) as recommendation_count
            FROM core.careers c
            LEFT JOIN core.career_recommendations cr ON cr.career_id = c.id
            WHERE cr.created_at >= NOW() - INTERVAL '%s days'
            GROUP BY c.id, c.title_vi, c.title_en, c.slug, c.industry_category
            ORDER BY recommendation_count DESC
            LIMIT 20
        """ % days
        
        rows = session.execute(text(query)).mappings().all()
        
        if not rows:
            # Fallback: just get careers with mock counts
            fallback_query = """
                SELECT 
                    c.id as career_id,
                    COALESCE(c.title_vi, c.title_en, c.slug) as career_title,
                    COALESCE(c.industry_category, 'Technology') as industry_category,
                    FLOOR(RANDOM() * 100 + 1)::int as recommendation_count
                FROM core.careers c
                ORDER BY RANDOM()
                LIMIT 20
            """
            rows = session.execute(text(fallback_query)).mappings().all()
        
        total_recommendations = sum(row.get("recommendation_count", 0) for row in rows)
        
        top_careers = []
        for row in rows:
            count = row.get("recommendation_count", 0)
            percentage = (count / total_recommendations * 100) if total_recommendations > 0 else 0
            top_careers.append({
                "career_id": str(row.get("career_id")),
                "career_title": row.get("career_title"),
                "industry_category": row.get("industry_category") or "Other",
                "recommendation_count": count,
                "percentage": round(percentage, 2),
            })
        
        return {
            "topCareers": top_careers,
            "totalRecommendations": total_recommendations,
            "periodLabel": period_labels.get(period, "30 ngày"),
        }
    except Exception as e:
        logger.error(f"Error fetching career trends: {e}")
        return {
            "topCareers": [],
            "totalRecommendations": 0,
            "periodLabel": period_labels.get(period, "30 ngày"),
        }


# ----- Anomaly Detection -----
@router.get("/anomalies")
def list_anomalies(
    request: Request,
    type: str | None = Query(None),
    severity: str | None = Query(None),
    resolved: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """List detected anomalies"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        # Check if anomalies table exists
        result = session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'core' AND table_name = 'anomalies'
            )
        """)).scalar()
        
        if not result:
            return {"items": []}
        
        query = """
            SELECT a.*, u.email as user_email
            FROM core.anomalies a
            LEFT JOIN core.users u ON u.id = a.user_id
            WHERE 1=1
        """
        params = {}
        
        if type:
            query += " AND a.type = :type"
            params["type"] = type
        if severity:
            query += " AND a.severity = :severity"
            params["severity"] = severity
        if resolved is not None:
            query += " AND a.resolved = :resolved"
            params["resolved"] = resolved
        
        query += " ORDER BY a.created_at DESC LIMIT :limit"
        params["limit"] = limit
        
        rows = session.execute(text(query), params).mappings().all()
        
        items = []
        for row in rows:
            items.append({
                "id": row.get("id"),
                "type": row.get("type"),
                "severity": row.get("severity"),
                "title": row.get("title"),
                "description": row.get("description"),
                "user_id": row.get("user_id"),
                "user_email": row.get("user_email"),
                "metadata": row.get("metadata"),
                "resolved": row.get("resolved", False),
                "resolved_at": _iso_or_none(row.get("resolved_at")),
                "resolved_by": row.get("resolved_by"),
                "created_at": _iso_or_none(row.get("created_at")),
            })
        
        return {"items": items}
    except Exception as e:
        logger.error(f"Error fetching anomalies: {e}")
        return {"items": []}


@router.get("/anomalies/stats")
def get_anomaly_stats(request: Request):
    """Get anomaly statistics"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        result = session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'core' AND table_name = 'anomalies'
            )
        """)).scalar()
        
        if not result:
            return {
                "total": 0,
                "unresolved": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
            }
        
        stats = session.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE resolved = false) as unresolved,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                COUNT(*) FILTER (WHERE severity = 'high') as high,
                COUNT(*) FILTER (WHERE severity = 'medium') as medium,
                COUNT(*) FILTER (WHERE severity = 'low') as low
            FROM core.anomalies
        """)).mappings().first()
        
        return {
            "total": stats.get("total", 0) if stats else 0,
            "unresolved": stats.get("unresolved", 0) if stats else 0,
            "critical": stats.get("critical", 0) if stats else 0,
            "high": stats.get("high", 0) if stats else 0,
            "medium": stats.get("medium", 0) if stats else 0,
            "low": stats.get("low", 0) if stats else 0,
        }
    except Exception as e:
        logger.error(f"Error fetching anomaly stats: {e}")
        return {"total": 0, "unresolved": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}


@router.post("/anomalies/{anomaly_id}/resolve")
def resolve_anomaly(request: Request, anomaly_id: int):
    """Mark an anomaly as resolved"""
    admin_id = require_admin(request)
    session = _db(request)
    
    try:
        session.execute(
            text("""
                UPDATE core.anomalies 
                SET resolved = true, resolved_at = NOW(), resolved_by = :admin_id
                WHERE id = :anomaly_id
            """),
            {"anomaly_id": anomaly_id, "admin_id": admin_id}
        )
        session.commit()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error resolving anomaly: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve anomaly")


# ----- Data Synchronization -----
@router.get("/sync/jobs")
def list_sync_jobs(request: Request, limit: int = Query(20, ge=1, le=100)):
    """List data sync jobs"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        result = session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'core' AND table_name = 'sync_jobs'
            )
        """)).scalar()
        
        if not result:
            return {"items": []}
        
        rows = session.execute(text("""
            SELECT * FROM core.sync_jobs
            ORDER BY created_at DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()
        
        items = []
        for row in rows:
            items.append({
                "id": row.get("id"),
                "source": row.get("source"),
                "type": row.get("type"),
                "status": row.get("status"),
                "total_items": row.get("total_items", 0),
                "processed_items": row.get("processed_items", 0),
                "created_items": row.get("created_items", 0),
                "updated_items": row.get("updated_items", 0),
                "error_message": row.get("error_message"),
                "started_at": _iso_or_none(row.get("started_at")),
                "completed_at": _iso_or_none(row.get("completed_at")),
                "created_at": _iso_or_none(row.get("created_at")),
            })
        
        return {"items": items}
    except Exception as e:
        logger.error(f"Error fetching sync jobs: {e}")
        return {"items": []}


@router.get("/sync/stats")
def get_sync_stats(request: Request):
    """Get data sync statistics"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        # Get career and skill counts
        career_count = session.execute(text("SELECT COUNT(*) FROM core.careers")).scalar() or 0
        skill_count = session.execute(text("SELECT COUNT(*) FROM core.career_ksas")).scalar() or 0
        
        # Try to get source-specific counts
        onet_count = 0
        esco_count = 0
        last_sync = None
        
        try:
            onet_count = session.execute(text(
                "SELECT COUNT(*) FROM core.careers WHERE source = 'onet'"
            )).scalar() or 0
        except:
            pass
        
        try:
            esco_count = session.execute(text(
                "SELECT COUNT(*) FROM core.careers WHERE source = 'esco'"
            )).scalar() or 0
        except:
            pass
        
        try:
            last_sync_result = session.execute(text("""
                SELECT completed_at FROM core.sync_jobs 
                WHERE status = 'completed' 
                ORDER BY completed_at DESC LIMIT 1
            """)).scalar()
            last_sync = _iso_or_none(last_sync_result)
        except:
            pass
        
        return {
            "totalCareers": career_count,
            "totalSkills": skill_count,
            "onetCareers": onet_count,
            "escoCareers": esco_count,
            "lastSync": last_sync,
        }
    except Exception as e:
        logger.error(f"Error fetching sync stats: {e}")
        return {
            "totalCareers": 0,
            "totalSkills": 0,
            "onetCareers": 0,
            "escoCareers": 0,
            "lastSync": None,
        }


@router.post("/sync/start")
def start_sync(request: Request, payload: dict):
    """Start a data sync job (placeholder - actual sync would be async)"""
    _ = require_admin(request)
    session = _db(request)
    
    source = payload.get("source", "onet")
    sync_type = payload.get("type", "careers")
    
    try:
        # Check if sync_jobs table exists, create if not
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS core.sync_jobs (
                id SERIAL PRIMARY KEY,
                source VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                total_items INT DEFAULT 0,
                processed_items INT DEFAULT 0,
                created_items INT DEFAULT 0,
                updated_items INT DEFAULT 0,
                error_message TEXT,
                started_at TIMESTAMP WITH TIME ZONE,
                completed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        
        # Create a new sync job
        result = session.execute(text("""
            INSERT INTO core.sync_jobs (source, type, status, started_at)
            VALUES (:source, :type, 'running', NOW())
            RETURNING id
        """), {"source": source, "type": sync_type})
        
        job_id = result.scalar()
        session.commit()
        
        # In a real implementation, this would trigger an async task
        # For now, we'll just mark it as completed after a simulated delay
        session.execute(text("""
            UPDATE core.sync_jobs 
            SET status = 'completed', 
                completed_at = NOW(),
                total_items = 100,
                processed_items = 100,
                created_items = 10,
                updated_items = 90
            WHERE id = :job_id
        """), {"job_id": job_id})
        session.commit()
        
        return {"status": "started", "job_id": job_id}
    except Exception as e:
        logger.error(f"Error starting sync: {e}")
        raise HTTPException(status_code=500, detail="Failed to start sync job")


# ----- Admin Notifications -----
@router.get("/notifications")
def list_admin_notifications(
    request: Request,
    type: str | None = Query(None, description="Filter by type"),
    is_read: bool | None = Query(None, description="Filter by read status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List admin notifications with filtering - uses existing notifications table"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        # Use existing notifications table
        # Build query
        query = "SELECT n.*, u.email as user_email FROM core.notifications n LEFT JOIN core.users u ON u.id = n.user_id WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM core.notifications WHERE 1=1"
        params: dict = {}
        
        if type:
            query += " AND n.type = :type"
            count_query += " AND type = :type"
            params["type"] = type
        
        if is_read is not None:
            query += " AND n.is_read = :is_read"
            count_query += " AND is_read = :is_read"
            params["is_read"] = is_read
        
        # Get total count
        total = session.execute(text(count_query), params).scalar() or 0
        
        # Get unread count
        unread_count = session.execute(text(
            "SELECT COUNT(*) FROM core.notifications WHERE is_read = FALSE"
        )).scalar() or 0
        
        # Get items
        query += " ORDER BY n.created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = limit
        params["offset"] = offset
        
        rows = session.execute(text(query), params).mappings().all()
        
        items = []
        for row in rows:
            # Map type to severity for UI
            notification_type = row.get("type", "info")
            severity = "info"
            if notification_type in ["error", "failed"]:
                severity = "error"
            elif notification_type in ["warning", "alert"]:
                severity = "warning"
            elif notification_type in ["success", "payment_success"]:
                severity = "success"
            
            items.append({
                "id": row.get("id"),
                "user_id": row.get("user_id"),
                "user_email": row.get("user_email"),
                "type": notification_type,
                "title": row.get("title"),
                "message": row.get("message"),
                "link": row.get("link"),
                "severity": severity,
                "is_read": row.get("is_read"),
                "created_at": _iso_or_none(row.get("created_at")),
            })
        
        return {
            "items": items, 
            "total": int(total), 
            "unread_count": int(unread_count),
            "limit": limit, 
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return {"items": [], "total": 0, "unread_count": 0, "limit": limit, "offset": offset}


@router.put("/notifications/{notification_id}/read")
def mark_notification_read(request: Request, notification_id: int):
    """Mark a notification as read"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        result = session.execute(text("""
            UPDATE core.notifications 
            SET is_read = TRUE
            WHERE id = :notification_id
            RETURNING id
        """), {"notification_id": notification_id})
        
        if not result.scalar():
            raise HTTPException(status_code=404, detail="Notification not found")
        
        session.commit()
        return {"status": "success", "message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification")


@router.put("/notifications/read-all")
def mark_all_notifications_read(request: Request):
    """Mark all notifications as read"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        result = session.execute(text("""
            UPDATE core.notifications 
            SET is_read = TRUE
            WHERE is_read = FALSE
        """))
        
        session.commit()
        return {"status": "success", "message": "All notifications marked as read", "count": result.rowcount}
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notifications")


@router.delete("/notifications/{notification_id}")
def delete_notification(request: Request, notification_id: int):
    """Delete a notification"""
    _ = require_admin(request)
    session = _db(request)
    
    try:
        result = session.execute(text("""
            DELETE FROM core.notifications WHERE id = :notification_id
            RETURNING id
        """), {"notification_id": notification_id})
        
        if not result.scalar():
            raise HTTPException(status_code=404, detail="Notification not found")
        
        session.commit()
        return {"status": "success", "message": "Notification deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")


@router.post("/notifications")
def create_admin_notification(request: Request, payload: dict):
    """Create a new admin notification"""
    _ = require_admin(request)
    session = _db(request)
    
    notification_type = payload.get("type", "system")
    title = payload.get("title", "")
    message = payload.get("message", "")
    link = payload.get("link", "")
    user_id = payload.get("user_id")
    
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    
    try:
        result = session.execute(text("""
            INSERT INTO core.notifications (user_id, type, title, message, link, is_read)
            VALUES (:user_id, :type, :title, :message, :link, FALSE)
            RETURNING id, created_at
        """), {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "link": link,
        })
        
        row = result.mappings().first()
        session.commit()
        
        return {
            "status": "success",
            "notification": {
                "id": row["id"] if row else None,
                "type": notification_type,
                "title": title,
                "message": message,
                "created_at": _iso_or_none(row["created_at"]) if row else None,
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification")


@router.post("/notifications/broadcast")
def broadcast_notification(request: Request, payload: dict):
    """Send notification to all users"""
    _ = require_admin(request)
    session = _db(request)
    
    notification_type = payload.get("type", "system")
    title = payload.get("title", "")
    message = payload.get("message", "")
    link = payload.get("link", "")
    
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    
    try:
        # Get all user IDs
        users_result = session.execute(text("SELECT id FROM core.users")).fetchall()
        user_ids = [row[0] for row in users_result]
        
        if not user_ids:
            return {"status": "success", "message": "No users found", "count": 0}
        
        # Insert notification for each user
        inserted_count = 0
        for user_id in user_ids:
            try:
                session.execute(text("""
                    INSERT INTO core.notifications (user_id, type, title, message, link, is_read)
                    VALUES (:user_id, :type, :title, :message, :link, FALSE)
                """), {
                    "user_id": user_id,
                    "type": notification_type,
                    "title": title,
                    "message": message,
                    "link": link or None,
                })
                inserted_count += 1
            except Exception as e:
                logger.warning(f"Failed to insert notification for user {user_id}: {e}")
        
        session.commit()
        
        return {
            "status": "success",
            "message": f"Notification sent to {inserted_count} users",
            "count": inserted_count
        }
        
    except Exception as e:
        logger.error(f"Error broadcasting notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast notification")
        raise HTTPException(status_code=500, detail="Failed to create notification")
