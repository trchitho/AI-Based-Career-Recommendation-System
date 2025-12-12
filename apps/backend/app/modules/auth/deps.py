# apps/backend/app/modules/auth/deps.py
from typing import Optional

from fastapi import Request, HTTPException, status

from .models import User  # SQLAlchemy model của module auth


async def get_current_user_optional(request: Request) -> Optional[User]:
    """
    Dependency optional cho các endpoint không bắt buộc login (vd: tracking).
    Nếu middleware / router auth đã gắn user vào request.state.user
    thì trả về User, còn lại trả None.
    """
    user = getattr(request.state, "user", None)
    if isinstance(user, User):
        return user
    return None


async def get_current_user(request: Request) -> User:
    """
    Bản bắt buộc login.
    Nếu không có user trong request.state.user → 401 "Login required".
    Dùng cho các endpoint cần biết chắc user_id, ví dụ trait-evidence.
    """
    user = await get_current_user_optional(request)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login required",
        )
    return user
