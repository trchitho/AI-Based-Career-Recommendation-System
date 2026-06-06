"""
Centralized configuration for AI-core service calls.

Tất cả module trong backend gọi AI-core PHẢI dùng các hằng/getter từ file này
để đảm bảo:
  - Một nguồn sự thật cho URL và timeout.
  - Backward-compatible với env var cũ (AI_CORE_URL, AI_SERVICE_URL).
  - Dễ override khi triển khai (chỉ set 1 biến `AI_CORE_BASE_URL`).

Env vars (theo thứ tự ưu tiên):
  - AI_CORE_BASE_URL  (chính thức, ưu tiên cao nhất)
  - AI_CORE_URL       (legacy, backward compat)
  - AI_SERVICE_URL    (legacy, backward compat)
  - AI_CORE_BASE      (legacy, backward compat)
  Mặc định: http://localhost:9000

Enablement:
  - AI_CORE_ENABLED=true|false
  - On Render, localhost URLs are always disabled because they point back to
    the backend container, not to a separately deployed AI-core service.

Timeout (giây):
  - AI_CORE_CONNECT_TIMEOUT  (default 5)  — fail nhanh nếu service down
  - AI_CORE_READ_TIMEOUT     (default 30) — chờ pipeline cold path
                                            (pgvector + NeuMF + multi-signal)
"""

from __future__ import annotations

import os
from typing import Final, Tuple, Type

import httpx


def _resolve_base_url() -> str:
    """Resolve AI-core base URL theo thứ tự env var ưu tiên."""
    for var in ("AI_CORE_BASE_URL", "AI_CORE_URL", "AI_SERVICE_URL", "AI_CORE_BASE"):
        val = os.getenv(var)
        if val:
            return val.rstrip("/")
    return "http://localhost:9000"


AI_CORE_BASE_URL: Final[str] = _resolve_base_url()


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _is_local_url(url: str) -> bool:
    normalized = url.strip().lower()
    return normalized.startswith(
        ("http://localhost", "https://localhost", "http://127.0.0.1", "https://127.0.0.1")
    )


_RUNNING_ON_RENDER = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
AI_CORE_ENABLED: Final[bool] = (
    _env_bool("AI_CORE_ENABLED", not _RUNNING_ON_RENDER)
    and not (_RUNNING_ON_RENDER and _is_local_url(AI_CORE_BASE_URL))
)

# Connect timeout: thấp để fail nhanh nếu AI-core offline (tránh block API).
AI_CORE_CONNECT_TIMEOUT: Final[float] = float(
    os.getenv("AI_CORE_CONNECT_TIMEOUT", "5.0")
)

# Read timeout: phải đủ lớn cho cold path (pgvector retrieval + NeuMF inference
# trên 200 candidates + multi-signal blend). Cold path thực tế ~6-10s.
# Default 30s an toàn, có cache 10 phút ở AI-core nên request sau cache hit nhanh.
AI_CORE_READ_TIMEOUT: Final[float] = float(
    os.getenv("AI_CORE_READ_TIMEOUT", "30.0")
)


def httpx_timeout() -> httpx.Timeout:
    """
    Build httpx.Timeout cho mọi call tới AI-core.

    Hỗ trợ cả httpx >= 0.14 (dùng `connect=`, `read=`) và phiên bản cũ
    (dùng `connect_timeout=`, `read_timeout=`).
    """
    try:
        # httpx >= 0.14: tham số dạng `connect`, `read`, `write`, `pool`
        return httpx.Timeout(
            AI_CORE_READ_TIMEOUT,
            connect=AI_CORE_CONNECT_TIMEOUT,
        )
    except TypeError:
        # httpx <= 0.13: tham số dạng `connect_timeout`, `read_timeout`, ...
        return httpx.Timeout(
            connect_timeout=AI_CORE_CONNECT_TIMEOUT,
            read_timeout=AI_CORE_READ_TIMEOUT,
            write_timeout=AI_CORE_READ_TIMEOUT,
            pool_timeout=AI_CORE_CONNECT_TIMEOUT,
        )


def requests_timeout() -> tuple[float, float]:
    """Build (connect, read) tuple cho `requests` library."""
    return (AI_CORE_CONNECT_TIMEOUT, AI_CORE_READ_TIMEOUT)


def _safe_exc(name: str) -> Type[BaseException]:
    """
    Lấy exception class từ httpx một cách an toàn.

    httpx 0.13 thiếu một số class (vd: `ConnectError`, `TransportError`),
    httpx >= 0.14 có. Fallback về `Exception` nếu không có.
    """
    return getattr(httpx, name, Exception)


# Tuples exception class để dùng trong `except (...) as e:`.
# Đảm bảo hoạt động cả httpx 0.13 lẫn >= 0.14 mà không crash khi load module.
HTTPX_CONNECT_TIMEOUT: Final[Type[BaseException]] = httpx.ConnectTimeout
HTTPX_READ_TIMEOUT: Final[Type[BaseException]] = httpx.ReadTimeout

# Network/connect-level errors (KHÔNG phải timeout).
# - httpx >= 0.14: ConnectError, TransportError, NetworkError
# - httpx 0.13:    NetworkError
HTTPX_NETWORK_ERRORS: Final[Tuple[Type[BaseException], ...]] = tuple(
    {
        _safe_exc("ConnectError"),
        _safe_exc("TransportError"),
        _safe_exc("NetworkError"),
    }
    - {Exception}  # Bỏ Exception sentinel để không catch quá rộng
)


__all__ = [
    "AI_CORE_BASE_URL",
    "AI_CORE_ENABLED",
    "AI_CORE_CONNECT_TIMEOUT",
    "AI_CORE_READ_TIMEOUT",
    "HTTPX_CONNECT_TIMEOUT",
    "HTTPX_READ_TIMEOUT",
    "HTTPX_NETWORK_ERRORS",
    "httpx_timeout",
    "requests_timeout",
]
