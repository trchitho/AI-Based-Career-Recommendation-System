import os
import smtplib
from email.message import EmailMessage
from typing import Tuple


def _ensure_env_loaded() -> None:
    """
    Load .env manually if the process was started outside backend dir.
    """
    loaded = False
    here = os.path.dirname(__file__)
    env_path = os.path.abspath(os.path.join(here, "../../.env"))

    try:
        from dotenv import load_dotenv  # type: ignore

        if os.path.exists(env_path):
            loaded = load_dotenv(env_path)
    except Exception:
        # Ignore errors from dotenv loading; fallback manual loading is handled below.
        pass

    if not loaded and os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    if k and v and os.getenv(k) is None:
                        os.environ[k] = v
        except Exception as e:
            # Failed to load .env file manually; ignoring as environment may already be set.
            print(f"[email_utils] Could not load .env file: {type(e).__name__}: {e}")


def _bool_env(name: str, default: bool = True) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


def send_email(to_email: str, subject: str, body: str) -> Tuple[bool, str | None, bool]:
    """
    Lightweight SMTP sender.
    Returns (sent_ok, error_message_if_any, dev_mode_fallback).
    dev_mode_fallback is True only when SMTP is not configured AND the environment
    is explicitly set to development mode via ENVIRONMENT=development.
    """
    _ensure_env_loaded()
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    use_starttls = _bool_env("SMTP_STARTTLS", True)
    use_ssl = _bool_env("SMTP_SSL", False)
    sender = os.getenv("EMAIL_FROM") or user
    
    # Only allow dev mode if explicitly configured
    is_dev_environment = os.getenv("ENVIRONMENT", "").lower() in {"development", "dev"}

    if not host:
        msg = "[email] SMTP_HOST not set; skipping actual send."
        print(msg)
        if is_dev_environment:
            print(f"[email] To: {to_email}")
            print(f"[email] Subject: {subject}")
            print(f"[email] Body:\n{body}")
            return False, msg, True
        else:
            return False, msg, False

    message = EmailMessage()
    message["From"] = sender or "no-reply@example.com"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        smtp_cls = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with smtp_cls(host, port, timeout=10) as server:
            if use_starttls and not use_ssl:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.send_message(message)
        return True, None, False
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        print("[email] Failed to send email:", err)
        return False, err, False


def build_verify_url(token: str) -> str:
    """
    Construct a verify URL using FRONTEND_VERIFY_URL if provided.
    Accepts either a format string with {token} or a base URL that will
    receive ?token=<token>.
    """
    tmpl = os.getenv("FRONTEND_VERIFY_URL")
    if tmpl:
        if "{token}" in tmpl:
            return tmpl.format(token=token)
        base = tmpl.rstrip("/")
        sep = "&" if "?" in base else "?"
        return f"{base}{sep}token={token}"

    # Default local dev URL
    base = os.getenv("FRONTEND_BASE_URL") or "http://localhost:3000"
    return f"{base.rstrip('/')}/verify?token={token}"
