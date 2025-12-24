import json
import logging
from datetime import date

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session, sessionmaker

from ...core.db import engine
from ...core.jwt import require_admin, require_user  # hàm decode JWT → trả user_id
from ..assessments.models import Assessment
from .models import User

router = APIRouter()

logger = logging.getLogger(__name__)

# Session factory for audit logs
_AuditSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _db(req: Request) -> Session:
    return req.state.db


def _log_audit(
    session: Session,
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None,
):
    """Ghi audit log vào database - dùng session riêng"""
    try:
        new_session = _AuditSessionLocal()
        try:
            details_json = json.dumps(details) if details else None
            entity_id_val = None
            if resource_id:
                try:
                    entity_id_val = int(resource_id)
                except (ValueError, TypeError):
                    entity_id_val = None

            new_session.execute(
                text("""
                INSERT INTO core.audit_logs 
                (actor_id, action, entity, entity_id, data_json, user_id, resource_type, resource_id, details, ip_address, created_at)
                VALUES 
                (:actor_id, :action, :entity, :entity_id, CAST(:data_json AS jsonb), :user_id, :resource_type, :resource_id, CAST(:details AS jsonb), :ip_address, NOW())
            """),
                {
                    "actor_id": user_id,
                    "action": action,
                    "entity": resource_type,
                    "entity_id": entity_id_val,
                    "data_json": details_json,
                    "user_id": user_id,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "details": details_json,
                    "ip_address": ip_address,
                },
            )
            new_session.commit()
        finally:
            new_session.close()
    except Exception as e:
        # Log audit failures but don't propagate to avoid breaking the main flow
        logger.error(f"Failed to log audit: {e}")


def _split_name(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return None, None
    parts = [p for p in (full_name or "").strip().split() if p]
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return " ".join(parts[:-1]), parts[-1]


def _profile_dict(u: User) -> dict:
    first, last = _split_name(u.full_name)
    d = u.to_dict()
    d.update(
        {
            "first_name": first,
            "last_name": last,
            "date_of_birth": u.date_of_birth.isoformat() if getattr(u, "date_of_birth", None) else None,
            "last_login_at": d.get("last_login"),
        }
    )
    return d


@router.get("/me")
def get_me(request: Request):
    session = _db(request)
    user_id = require_user(request)  # đọc từ Authorization: Bearer <token>
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _profile_dict(u)


@router.patch("/me")
def update_me(request: Request, payload: dict):
    session = _db(request)
    user_id = require_user(request)
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Track changes for audit log
    changes = {}

    # Map first/last name into full_name if provided
    first = payload.get("first_name")
    last = payload.get("last_name")
    if first is not None or last is not None:
        fn = (first or "").strip()
        ln = (last or "").strip()
        combined = (f"{fn} {ln}" if fn or ln else u.full_name) or None
        if u.full_name != combined:
            changes["full_name"] = {"old": u.full_name, "new": combined}
        u.full_name = combined
    if "full_name" in payload and payload.get("full_name"):
        if u.full_name != payload.get("full_name"):
            changes["full_name"] = {"old": u.full_name, "new": payload.get("full_name")}
        u.full_name = payload.get("full_name")
    if "avatar_url" in payload:
        if u.avatar_url != payload.get("avatar_url"):
            changes["avatar_url"] = {"old": u.avatar_url, "new": payload.get("avatar_url")}
        u.avatar_url = payload.get("avatar_url")
    if "date_of_birth" in payload:
        dob = payload.get("date_of_birth")
        if dob in (None, ""):
            if u.date_of_birth is not None:
                changes["date_of_birth"] = {"old": str(u.date_of_birth), "new": None}
            u.date_of_birth = None
        else:
            try:
                new_dob = date.fromisoformat(str(dob))
                if u.date_of_birth != new_dob:
                    changes["date_of_birth"] = {"old": str(u.date_of_birth) if u.date_of_birth else None, "new": str(new_dob)}
                u.date_of_birth = new_dob
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid date_of_birth (expected YYYY-MM-DD)")
    session.commit()
    session.refresh(u)

    # Ghi audit log cho profile update
    if changes:
        client_ip = request.client.host if request.client else None
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        _log_audit(
            session=session,
            user_id=user_id,
            action="profile_update",
            resource_type="user",
            resource_id=str(user_id),
            details={"changes": changes},
            ip_address=client_ip,
        )

    return _profile_dict(u)


# --- Additional endpoints to support FE screens ---
@router.get("/{user_id}/history")
def get_history(request: Request, user_id: int):
    session = _db(request)
    rows = (
        session.execute(select(Assessment).where(Assessment.user_id == user_id).order_by(Assessment.created_at.desc()))
        .scalars()
        .all()
    )

    def _map_riasec(s: dict | None) -> dict | None:
        if not isinstance(s, dict):
            return None
        # Accept either letters or verbose; normalize to verbose names expected by FE
        letter_to_name = {
            "R": "realistic",
            "I": "investigative",
            "A": "artistic",
            "S": "social",
            "E": "enterprising",
            "C": "conventional",
        }
        # If already verbose
        if all(k in s for k in letter_to_name.values()):
            return s
        out = {}
        for k, v in s.items():
            key = str(k).upper()
            name = letter_to_name.get(key)
            if name:
                try:
                    out[name] = float(v)
                except Exception:
                    out[name] = 0.0
        return out or None

    def _map_big5(s: dict | None) -> dict | None:
        if not isinstance(s, dict):
            return None
        letter_to_name = {
            "O": "openness",
            "C": "conscientiousness",
            "E": "extraversion",
            "A": "agreeableness",
            "N": "neuroticism",
        }
        if all(k in s for k in letter_to_name.values()):
            return s
        out = {}
        for k, v in s.items():
            key = str(k).upper()
            name = letter_to_name.get(key)
            if name:
                try:
                    out[name] = float(v)
                except Exception:
                    out[name] = 0.0
        return out or None

    history = []
    for a in rows:
        scores = a.scores or {}
        riasec_src = scores.get("riasec") if isinstance(scores, dict) else None
        big5_src = scores.get("big5") if isinstance(scores, dict) else None
        riasec_scores = _map_riasec(riasec_src)
        big5_scores = _map_big5(big5_src)
        test_types: list[str] = []
        if riasec_scores:
            test_types.append("RIASEC")
        if big5_scores:
            test_types.append("BIG_FIVE")
        if not test_types:
            test_types = [a.a_type]
        history.append(
            {
                "id": str(a.id),
                "completed_at": a.created_at.isoformat() if a.created_at else None,
                "test_types": test_types,
                "riasec_scores": riasec_scores,
                "big_five_scores": big5_scores,
            }
        )
    return history


@router.get("/{user_id}/progress")
def get_progress(request: Request, user_id: int):
    # Return demo progress data used by dashboard
    return [
        {
            "roadmap_id": "roadmap-frontend",
            "title": "Frontend Developer Roadmap",
            "completed_milestones": ["html-css-basics", "react-hooks"],
        },
        {
            "roadmap_id": "roadmap-data",
            "title": "Data Analyst Roadmap",
            "completed_milestones": ["python-basics"],
        },
    ]


@router.get("/progress")
def get_progress_current(request: Request):
    # Convenience endpoint (used by profile page best-effort)
    user_id = require_user(request)
    return get_progress(request, user_id)


@router.patch("/{user_id}/role")
def update_role(request: Request, user_id: int, payload: dict):
    # Only admin can change roles
    _ = require_admin(request)
    session = _db(request)
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    role = (payload.get("role") or "").strip().lower()
    if role not in {"admin", "user", "manager"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    u.role = role
    session.commit()
    session.refresh(u)
    return u.to_dict()
