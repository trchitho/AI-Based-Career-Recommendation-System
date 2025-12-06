# apps/backend/app/modules/auth/deps.py
from typing import Optional

from fastapi import Request

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
