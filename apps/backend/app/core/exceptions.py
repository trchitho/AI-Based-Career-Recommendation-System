"""
app/core/exceptions.py
======================
Custom exception hierarchy cho toàn bộ backend.

Tại sao cần custom exceptions?
- Controller layer catch exception cụ thể → trả HTTP code đúng
- Error propagation rõ ràng, dễ trace
- Không lộ internal detail ra client

Update guide:
  - Thêm domain error mới  → subclass DomainError bên dưới
  - Đổi HTTP status        → sửa STATUS_MAP trong raise_http()
  - Thêm error code mới    → thêm vào STATUS_MAP
"""
from __future__ import annotations

from typing import Any


# ─────────────────────────────────────────────
#  Base
# ─────────────────────────────────────────────

class AppError(Exception):
    """Base class cho tất cả application errors."""

    def __init__(self, message: str, code: str = "APP_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


# ─────────────────────────────────────────────
#  Domain errors
# ─────────────────────────────────────────────

class ResourceNotFoundError(AppError):
    """DB record không tồn tại.

    @param resource: Tên resource, vd "MentorSession"
    @param identifier: ID hoặc slug đã dùng để tìm
    """
    def __init__(self, resource: str, identifier: Any = None) -> None:
        label = f" '{identifier}'" if identifier is not None else ""
        super().__init__(message=f"{resource}{label} not found", code="NOT_FOUND")
        self.resource = resource
        self.identifier = identifier


class NotFoundError(ResourceNotFoundError):
    """Alias tương thích ngược với code cũ."""
    def __init__(self, message: str = "Not found") -> None:
        super(AppError, self).__init__(message)
        self.message = message
        self.code = "NOT_FOUND"


class PermissionDeniedError(AppError):
    """User không có quyền thực hiện action này.

    @param action: Mô tả action bị từ chối, vd "delete this session"
    """
    def __init__(self, action: str = "perform this action") -> None:
        super().__init__(
            message=f"You do not have permission to {action}",
            code="FORBIDDEN",
        )


class BusinessRuleError(AppError):
    """Vi phạm quy tắc nghiệp vụ (không phải validation error).

    Ví dụ: đặt lịch trong quá khứ, mentor đã đầy slot.
    """
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="BUSINESS_RULE_VIOLATION")


class ValidationError(AppError):
    """Input data thất bại domain-level validation.

    @param field: Tên field thất bại
    @param reason: Lý do thất bại (human-readable)
    """
    def __init__(self, field: str, reason: str) -> None:
        super().__init__(
            message=f"Validation failed for '{field}': {reason}",
            code="VALIDATION_ERROR",
        )
        self.field = field
        self.reason = reason


class ExternalServiceError(AppError):
    """Third-party service (Gemini, Redis, R2…) bị lỗi.

    @param service: Tên service
    @param detail:  Chi tiết lỗi (không lộ ra client)
    """
    def __init__(self, service: str, detail: str = "") -> None:
        super().__init__(
            message=f"Service '{service}' temporarily unavailable",
            code="EXTERNAL_SERVICE_ERROR",
        )
        self.service = service
        self._detail = detail  # private — log internally, không expose


class DuplicateResourceError(AppError):
    """Resource đã tồn tại, không thể tạo thêm.

    Ví dụ: mentee gửi 2 request đến cùng mentor.
    """
    def __init__(self, resource: str) -> None:
        super().__init__(
            message=f"{resource} already exists",
            code="DUPLICATE_RESOURCE",
        )


# ─────────────────────────────────────────────
#  HTTP mapping helper (dùng trong Controller)
# ─────────────────────────────────────────────

_STATUS_MAP: dict[str, int] = {
    "NOT_FOUND":                404,
    "FORBIDDEN":                403,
    "BUSINESS_RULE_VIOLATION":  400,
    "VALIDATION_ERROR":         422,
    "EXTERNAL_SERVICE_ERROR":   503,
    "DUPLICATE_RESOURCE":       409,
    "APP_ERROR":                500,
}


def raise_http(error: AppError) -> None:
    """Convert AppError → FastAPI HTTPException với đúng status code.

    Dùng trong Controller để không để domain error lọt ra ngoài.

    @param error: Bất kỳ subclass nào của AppError
    @raises HTTPException: Luôn raise, không bao giờ return
    """
    from fastapi import HTTPException
    status_code = _STATUS_MAP.get(error.code, 500)
    raise HTTPException(status_code=status_code, detail=error.message)
