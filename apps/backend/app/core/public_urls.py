from __future__ import annotations

import os


def _clean_url(value: str) -> str:
    return value.strip().rstrip("/")


def frontend_base_url() -> str:
    for name in ("FRONTEND_BASE_URL", "FRONTEND_URL"):
        value = os.getenv(name)
        if value:
            return _clean_url(value)
    return "http://localhost:3000"


def backend_base_url() -> str:
    for name in ("BACKEND_BASE_URL", "RENDER_EXTERNAL_URL"):
        value = os.getenv(name)
        if value:
            return _clean_url(value)

    render_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME")
    if render_hostname:
        return f"https://{render_hostname.strip().strip('/')}"

    return "http://localhost:8000"


def vnpay_return_url() -> str:
    configured = os.getenv("VNPAY_RETURN_URL")
    if configured:
        return _clean_url(configured)
    return f"{backend_base_url()}/api/payment/vnpay/return"
