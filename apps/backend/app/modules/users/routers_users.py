from datetime import date

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.jwt import require_admin, require_user  # hàm decode JWT → trả user_id
from ..assessments.models import Assessment
from .models import User

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


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
            "date_of_birth": (u.date_of_birth.isoformat() if getattr(u, "date_of_birth", None) else None),
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

    # Map first/last name into full_name if provided
    first = payload.get("first_name")
    last = payload.get("last_name")
    if first is not None or last is not None:
        fn = (first or "").strip()
        ln = (last or "").strip()
        combined = (f"{fn} {ln}" if fn or ln else u.full_name) or None
        u.full_name = combined
    if "full_name" in payload and payload.get("full_name"):
        u.full_name = payload.get("full_name")
    if "avatar_url" in payload:
        u.avatar_url = payload.get("avatar_url")
    if "date_of_birth" in payload:
        dob = payload.get("date_of_birth")
        if dob in (None, ""):
            u.date_of_birth = None
        else:
            try:
                u.date_of_birth = date.fromisoformat(str(dob))
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date_of_birth (expected YYYY-MM-DD)",
                )
    session.commit()
    session.refresh(u)
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
