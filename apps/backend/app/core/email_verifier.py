import os
import smtplib
import socket
from typing import List, Tuple


def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


REQUIRE_DELIVERABLE = _bool_env("EMAIL_DELIVERABILITY_REQUIRED", True)
SMTP_PROBE_PORT = int(os.getenv("EMAIL_SMTP_PROBE_PORT", "25"))
SMTP_PROBE_TIMEOUT = float(os.getenv("EMAIL_SMTP_PROBE_TIMEOUT", "2"))


def _mx_hosts(domain: str) -> List[str]:
    """
    Resolve MX records for a domain. Fallback to the domain itself when
    MX lookup fails (some providers still accept mail on the apex host).
    """
    try:
        import dns.resolver  # type: ignore

        answers = dns.resolver.resolve(domain, "MX")
        hosts = [str(r.exchange).rstrip(".") for r in answers]
        # sort by preference if available
        if hasattr(answers, "rrset") and answers.rrset:
            hosts = [str(r.exchange).rstrip(".") for r in sorted(answers, key=lambda r: getattr(r, "preference", 0))]
        return hosts
    except Exception:
        return [domain]


def is_deliverable_email(email: str) -> Tuple[bool, str]:
    """
    Best-effort SMTP RCPT probe to detect throwaway/invalid emails.
    Returns (ok, reason).
    """
    if not REQUIRE_DELIVERABLE:
        return True, "deliverability check disabled"

    parts = email.split("@", 1)
    if len(parts) != 2 or not parts[1]:
        return False, "invalid email format"
    domain = parts[1].lower()

    hosts = _mx_hosts(domain)
    last_err = "unknown"
    for host in hosts[:3]:
        try:
            with smtplib.SMTP(host, SMTP_PROBE_PORT, timeout=SMTP_PROBE_TIMEOUT) as smtp:
                smtp.ehlo_or_helo_if_needed()
                # Some servers require MAIL before RCPT; use a neutral sender
                smtp.mail(f"validator@{socket.gethostname() or 'localhost'}")
                code, _ = smtp.rcpt(email)
                if code in (250, 251):
                    return True, f"accepted by {host}"
                last_err = f"rejected by {host} ({code})"
        except Exception as e:
            last_err = repr(e)
            continue

    return False, last_err
