"""
JWT Authentication Middleware
"""

import logging
from typing import Optional

import jwt
from fastapi import Request
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Middleware to parse JWT token and set request.state.user"""

    def __init__(self, app, secret_key: str, algorithm: str = "HS256"):
        super().__init__(app)
        self.secret_key = secret_key
        self.algorithm = algorithm

    async def dispatch(self, request: Request, call_next):
        # Skip auth for certain paths
        skip_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/health/detailed",
            "/metrics",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/google",
            "/api/auth/verify-email",
            "/api/auth/reset-password",
            "/static/",
        ]

        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)

        # Extract token from Authorization header
        token = self._extract_token(request)

        if token:
            try:
                # Decode JWT token
                payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
                user_id = payload.get("sub")

                if user_id:
                    # Store user_id in request state for later use
                    request.state.auth_user_id = int(user_id)
                    logger.debug(f"Token validated for user: {user_id}")

            except jwt.ExpiredSignatureError:
                logger.debug("JWT token expired")
            except jwt.InvalidTokenError as e:
                logger.debug(f"Invalid JWT token: {e}")
            except Exception as e:
                logger.debug(f"JWT auth error: {e}")

        # Continue to next middleware/handler
        response = await call_next(request)

        # After DB middleware has run, try to load the user
        if hasattr(request.state, "auth_user_id") and hasattr(request.state, "db"):
            try:
                user = self._get_user_by_id(request, request.state.auth_user_id)
                if user:
                    request.state.user = user
                    request.state.user_id = user.id
                    logger.debug(f"User loaded: {user.id}")
            except Exception as e:
                logger.debug(f"Error loading user: {e}")

        return response

    def _extract_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from Authorization header"""
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:]  # Remove "Bearer " prefix
        return None

    def _get_user_by_id(self, request: Request, user_id: int):
        """Get user from database by ID"""
        try:
            # Get database session from request state (set by db middleware)
            db: Session = getattr(request.state, "db", None)
            if not db:
                logger.debug("No database session available")
                return None

            # Import User model
            from ..modules.auth.models import User

            user = db.query(User).filter(User.id == user_id).first()
            return user

        except Exception as e:
            logger.debug(f"Error getting user from database: {e}")
            return None
