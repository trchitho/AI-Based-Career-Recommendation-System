from typing import Dict

from sqlalchemy.orm import Session

from ...core.email_utils import build_verify_url, send_email
from .token_utils import issue_token, mark_all_tokens_used

DEFAULT_VERIFY_MINUTES = 60


def send_verification_email(session: Session, user, minutes: int = DEFAULT_VERIFY_MINUTES) -> Dict[str, object]:
    """
    Issue a verify_email token and send an email with both link + token.
    Returns dict: {"token": str, "verify_url": str, "sent": bool}
    Caller should reject the flow if sent is False (meaning SMTP failed).
    """
    mark_all_tokens_used(session, user.id, "verify_email")
    token = issue_token(session, user.id, "verify_email", minutes=minutes)
    verify_url = build_verify_url(token)

    name = getattr(user, "full_name", None) or "there"
    body = (
        f"Hi {name},\n\n"
        "Please verify your email to activate your CareerBridge AI account.\n\n"
        f"Verification link: {verify_url}\n"
        f"Verification code: {token}\n\n"
        "If you did not request this, you can ignore this email."
    )
    sent, err, dev_mode = send_email(user.email, "Verify your email", body)
    return {"token": token, "verify_url": verify_url, "sent": sent, "error": err, "dev_mode": dev_mode}
