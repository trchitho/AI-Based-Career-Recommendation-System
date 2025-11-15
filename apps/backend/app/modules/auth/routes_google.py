import json
import os
import secrets
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.jwt import create_access_token, refresh_expiry_dt
from ..auth.models import RefreshToken
from ..users.models import User

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


def _env(name: str, default: str | None = None) -> str:
    v = os.getenv(name)
    if v:
        return v
    if default is None:
        raise HTTPException(status_code=500, detail=f"Missing env: {name}")
    return default


def _backend_callback_url(request: Request) -> str:
    return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")


@router.get("/google/login")
def google_login(request: Request, redirect: str | None = None):
    client_id = _env("GOOGLE_CLIENT_ID")
    callback = _backend_callback_url(request)
    state_payload = {"redirect": redirect or os.getenv("FRONTEND_OAUTH_REDIRECT", "http://localhost:3000/oauth/callback")}
    state = urllib.parse.quote(json.dumps(state_payload))

    params = {
        "client_id": client_id,
        "redirect_uri": callback,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(request: Request, code: str | None = None, state: str | None = None):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    client_id = _env("GOOGLE_CLIENT_ID")
    client_secret = _env("GOOGLE_CLIENT_SECRET")
    callback = _backend_callback_url(request)

    data = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": callback,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        token_payload = json.loads(resp.read().decode("utf-8"))

    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to exchange token")

    # Fetch userinfo
    ui_req = urllib.request.Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(ui_req, timeout=10) as r2:
        ui = json.loads(r2.read().decode("utf-8"))

    email = (ui.get("email") or "").strip().lower()
    full_name = ui.get("name") or None
    avatar = ui.get("picture") or None
    if not email:
        raise HTTPException(status_code=400, detail="Email not available from Google")

    session: Session = _db(request)
    from datetime import datetime

    from ...core.security import hash_password

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        # Create a new user with random password (OAuth-only)
        u = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            full_name=full_name,
            avatar_url=avatar,
            role="user",
            is_locked=False,
        )
        try:
            session.add(u)
            session.commit()
            session.refresh(u)
        except IntegrityError:
            # In case the sequence for core.users is out of sync, fix it and retry once
            session.rollback()
            session.execute(
                text(
                    """
                    SELECT setval(
                        pg_get_serial_sequence('core.users', 'id'),
                        COALESCE((SELECT MAX(id) FROM core.users) + 1, 1),
                        false
                    )
                    """
                )
            )
            session.commit()
            session.add(u)
            session.commit()
            session.refresh(u)
    else:
        # Update avatar/name best-effort
        changed = False
        if full_name and u.full_name != full_name:
            u.full_name = full_name
            changed = True
        if avatar and u.avatar_url != avatar:
            u.avatar_url = avatar
            changed = True
        # Always update last_login on Google auth
        from datetime import datetime, timezone

        u.last_login = datetime.now(timezone.utc)
        changed = True
        try:
            if changed:
                session.commit()
        except Exception:
            session.rollback()

    # Issue app tokens
    access = create_access_token({"sub": str(u.id), "role": u.role})
    rt = RefreshToken(user_id=u.id, token=secrets.token_urlsafe(48), expires_at=refresh_expiry_dt(), revoked=False)
    session.add(rt)
    session.commit()

    # Redirect back to FE with tokens in query (dev-friendly)
    try:
        st = json.loads(urllib.parse.unquote(state or "")) if state else {}
    except Exception:
        st = {}
    fe_redirect = st.get("redirect") or os.getenv("FRONTEND_OAUTH_REDIRECT", "http://localhost:3000/oauth/callback")
    loc = f"{fe_redirect}?access_token={urllib.parse.quote(access)}&refresh_token={urllib.parse.quote(rt.token)}"
    return RedirectResponse(loc)
