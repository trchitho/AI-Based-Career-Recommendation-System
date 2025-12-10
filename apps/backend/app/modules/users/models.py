# apps/backend/app/modules/users/models.py
# Import User from auth module to avoid duplicate definition
from app.modules.auth.models import User

__all__ = ["User"]
