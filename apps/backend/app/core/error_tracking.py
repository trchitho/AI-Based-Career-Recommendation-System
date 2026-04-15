"""
Error tracking and monitoring with Sentry integration
"""

import logging
import os
import time
import traceback
from functools import wraps
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Sentry integration (optional)
sentry_sdk = None
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False


class ErrorTracker:
    """Enhanced error tracking and monitoring"""

    def __init__(self):
        self.error_stats = {"total_errors": 0, "error_types": {}, "recent_errors": [], "critical_errors": 0}
        self.sentry_enabled = False
        self._setup_sentry()

    def _setup_sentry(self):
        """Setup Sentry error tracking if available and configured"""
        if not SENTRY_AVAILABLE:
            logger.info("Sentry not available, using local error tracking only")
            return

        sentry_dsn = os.getenv("SENTRY_DSN")
        if not sentry_dsn:
            logger.info("SENTRY_DSN not configured, using local error tracking only")
            return

        try:
            environment = os.getenv("ENVIRONMENT", "development")

            sentry_sdk.init(
                dsn=sentry_dsn,
                environment=environment,
                integrations=[
                    FastApiIntegration(auto_enabling_integrations=False),
                    SqlalchemyIntegration(),
                    RedisIntegration(),
                ],
                traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
                profiles_sample_rate=0.1,  # 10% for profiling
                attach_stacktrace=True,
                send_default_pii=False,  # Don't send personally identifiable information
                max_breadcrumbs=50,
                before_send=self._filter_sentry_events,
            )

            self.sentry_enabled = True
            logger.info(f"✅ Sentry error tracking enabled (env: {environment})")

        except Exception as e:
            logger.error(f"Failed to initialize Sentry: {e}")

    def _filter_sentry_events(self, event, hint):
        """Filter Sentry events to reduce noise"""
        # Don't send health check errors
        if "request" in event and event["request"].get("url", "").endswith("/health"):
            return None

        # Don't send rate limit errors (they're expected)
        if "exception" in event:
            for exc in event["exception"]["values"]:
                if "HTTPException" in exc.get("type", "") and "429" in exc.get("value", ""):
                    return None

        return event

    def track_error(self, error: Exception, context: Dict[str, Any] = None, level: str = "error", user_id: Optional[int] = None):
        """Track an error with context information"""

        # Update local stats
        self.error_stats["total_errors"] += 1
        error_type = type(error).__name__
        self.error_stats["error_types"][error_type] = self.error_stats["error_types"].get(error_type, 0) + 1

        if level == "critical":
            self.error_stats["critical_errors"] += 1

        # Store recent error
        error_info = {
            "timestamp": time.time(),
            "type": error_type,
            "message": str(error),
            "level": level,
            "context": context or {},
            "user_id": user_id,
            "traceback": traceback.format_exc(),
        }

        self.error_stats["recent_errors"].append(error_info)

        # Keep only last 100 errors
        if len(self.error_stats["recent_errors"]) > 100:
            self.error_stats["recent_errors"] = self.error_stats["recent_errors"][-100:]

        # Log locally
        log_level = getattr(logging, level.upper(), logging.ERROR)
        logger.log(log_level, f"{error_type}: {str(error)}", extra={"context": context, "user_id": user_id})

        # Send to Sentry if enabled
        if self.sentry_enabled and sentry_sdk:
            try:
                with sentry_sdk.push_scope() as scope:
                    # Add context
                    if context:
                        for key, value in context.items():
                            scope.set_tag(key, str(value))

                    # Add user info
                    if user_id:
                        scope.user = {"id": user_id}

                    # Set level
                    scope.level = level

                    # Capture exception
                    sentry_sdk.capture_exception(error)

            except Exception as e:
                logger.error(f"Failed to send error to Sentry: {e}")

    def track_performance_issue(self, operation: str, duration: float, threshold: float = 5.0, context: Dict[str, Any] = None):
        """Track performance issues (slow operations)"""
        if duration > threshold:
            self.track_error(
                Exception(f"Slow operation: {operation} took {duration:.3f}s"),
                context={"operation": operation, "duration": duration, "threshold": threshold, **(context or {})},
                level="warning",
            )

    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics"""
        return {
            "total_errors": self.error_stats["total_errors"],
            "critical_errors": self.error_stats["critical_errors"],
            "error_types": dict(self.error_stats["error_types"]),
            "recent_errors": self.error_stats["recent_errors"][-10:],  # Last 10 errors
            "sentry_enabled": self.sentry_enabled,
        }


# Global error tracker
error_tracker = ErrorTracker()


def track_errors(operation_name: str = None, level: str = "error", include_performance: bool = True):
    """
    Decorator for automatic error tracking

    Args:
        operation_name: Name of the operation for context
        level: Error level (error, warning, critical)
        include_performance: Whether to track performance issues
    """

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            op_name = operation_name or f"{func.__module__}.{func.__name__}"

            try:
                result = await func(*args, **kwargs)

                # Track performance if enabled
                if include_performance:
                    duration = time.time() - start_time
                    error_tracker.track_performance_issue(op_name, duration)

                return result

            except Exception as e:
                # Extract user context if available
                user_id = None
                context = {"operation": op_name}

                # Try to get user ID from request args
                for arg in args:
                    if hasattr(arg, "state") and hasattr(arg.state, "user_id"):
                        user_id = arg.state.user_id
                        break

                # Add function arguments to context (be careful with sensitive data)
                if kwargs:
                    safe_kwargs = {k: str(v)[:100] for k, v in kwargs.items() if k not in ["password", "token", "secret"]}
                    context.update(safe_kwargs)

                error_tracker.track_error(e, context, level, user_id)
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            op_name = operation_name or f"{func.__module__}.{func.__name__}"

            try:
                result = func(*args, **kwargs)

                # Track performance if enabled
                if include_performance:
                    duration = time.time() - start_time
                    error_tracker.track_performance_issue(op_name, duration)

                return result

            except Exception as e:
                context = {"operation": op_name}

                # Add function arguments to context (be careful with sensitive data)
                if kwargs:
                    safe_kwargs = {k: str(v)[:100] for k, v in kwargs.items() if k not in ["password", "token", "secret"]}
                    context.update(safe_kwargs)

                error_tracker.track_error(e, context, level)
                raise

        # Return appropriate wrapper based on function type
        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def get_error_tracker():
    """Get the global error tracker instance"""
    return error_tracker


# Context manager for tracking operations
class track_operation:
    """Context manager for tracking operations with automatic error handling"""

    def __init__(self, operation_name: str, user_id: Optional[int] = None, context: Dict[str, Any] = None):
        self.operation_name = operation_name
        self.user_id = user_id
        self.context = context or {}
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        if exc_type is not None:
            # An exception occurred
            context = {"operation": self.operation_name, "duration": duration, **self.context}
            error_tracker.track_error(exc_val, context, "error", self.user_id)
        else:
            # Track performance for successful operations
            error_tracker.track_performance_issue(self.operation_name, duration, context=self.context)

        return False  # Don't suppress exceptions
