"""
Performance monitoring and metrics collection
"""

import logging
import time
from collections import defaultdict, deque
from typing import Any, Dict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Module logger; leave root logging configuration to the application entrypoint.
logger = logging.getLogger(__name__)

# Import enhanced monitoring components
try:
    from .cache import cache_manager
    from .database_monitor import check_database_performance
except ImportError:
    cache_manager = None
    check_database_performance = None


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor API performance and collect metrics"""

    def __init__(self, app):
        super().__init__(app)
        # Store metrics in memory (in production, use Redis or proper metrics store)
        self.metrics = {
            "request_count": defaultdict(int),
            "response_times": defaultdict(list),
            "error_count": defaultdict(int),
            "slow_requests": deque(maxlen=100),  # Keep last 100 slow requests
        }
        self.slow_threshold = 2.0  # 2 seconds

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Extract route info
        method = request.method
        path = request.url.path
        route_key = f"{method} {path}"

        # Process request
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # Handle exceptions
            process_time = time.time() - start_time
            self.metrics["error_count"][route_key] += 1
            logger.error(f"Error in {route_key}: {str(e)} - {process_time:.3f}s")
            raise

        # Calculate response time
        process_time = time.time() - start_time

        # Update metrics
        self.metrics["request_count"][route_key] += 1
        self.metrics["response_times"][route_key].append(process_time)

        # Keep only last 100 response times per route
        if len(self.metrics["response_times"][route_key]) > 100:
            self.metrics["response_times"][route_key] = self.metrics["response_times"][route_key][-100:]

        # Track errors
        if status_code >= 400:
            self.metrics["error_count"][route_key] += 1

        # Track slow requests
        if process_time > self.slow_threshold:
            slow_request = {
                "route": route_key,
                "response_time": process_time,
                "timestamp": time.time(),
                "status_code": status_code,
                "user_agent": request.headers.get("user-agent", ""),
                "query_params": str(request.query_params),
            }
            self.metrics["slow_requests"].append(slow_request)

        # Log request
        log_level = logging.WARNING if process_time > self.slow_threshold else logging.INFO
        logger.log(log_level, f"{method} {path} - {status_code} - {process_time:.3f}s")

        # Add performance headers
        response.headers["X-Response-Time"] = f"{process_time:.3f}s"

        return response

    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        summary = {
            "total_requests": sum(self.metrics["request_count"].values()),
            "total_errors": sum(self.metrics["error_count"].values()),
            "routes": {},
        }

        for route, count in self.metrics["request_count"].items():
            response_times = self.metrics["response_times"][route]
            errors = self.metrics["error_count"][route]

            if response_times:
                avg_time = sum(response_times) / len(response_times)
                max_time = max(response_times)
                min_time = min(response_times)
                p95_time = sorted(response_times)[int(len(response_times) * 0.95)] if len(response_times) > 1 else avg_time
            else:
                avg_time = max_time = min_time = p95_time = 0

            summary["routes"][route] = {
                "request_count": count,
                "error_count": errors,
                "error_rate": (errors / count * 100) if count > 0 else 0,
                "avg_response_time": round(avg_time, 3),
                "max_response_time": round(max_time, 3),
                "min_response_time": round(min_time, 3),
                "p95_response_time": round(p95_time, 3),
            }

        # Add slow requests
        summary["slow_requests"] = list(self.metrics["slow_requests"])

        return summary


# Global instance
performance_monitor = None


def get_performance_monitor():
    """Get the global performance monitor instance"""
    global performance_monitor
    return performance_monitor


def set_performance_monitor(monitor):
    """Set the global performance monitor instance"""
    global performance_monitor
    performance_monitor = monitor


class DatabaseQueryMonitor:
    """Monitor database query performance"""

    def __init__(self):
        self.query_metrics = {
            "query_count": 0,
            "total_time": 0,
            "slow_queries": deque(maxlen=50),
            "query_types": defaultdict(int),
        }
        self.slow_query_threshold = 1.0  # 1 second

    def log_query(self, query: str, execution_time: float, query_type: str = "unknown"):
        """Log a database query execution"""
        self.query_metrics["query_count"] += 1
        self.query_metrics["total_time"] += execution_time
        self.query_metrics["query_types"][query_type] += 1

        if execution_time > self.slow_query_threshold:
            slow_query = {
                "query": query[:200] + "..." if len(query) > 200 else query,
                "execution_time": execution_time,
                "timestamp": time.time(),
                "query_type": query_type,
            }
            self.query_metrics["slow_queries"].append(slow_query)
            logger.warning(f"Slow query detected: {execution_time:.3f}s - {query_type}")

    def get_metrics(self) -> Dict[str, Any]:
        """Get database query metrics"""
        avg_time = (
            (self.query_metrics["total_time"] / self.query_metrics["query_count"]) if self.query_metrics["query_count"] > 0 else 0
        )

        return {
            "total_queries": self.query_metrics["query_count"],
            "total_time": round(self.query_metrics["total_time"], 3),
            "average_time": round(avg_time, 3),
            "slow_queries": list(self.query_metrics["slow_queries"]),
            "query_types": dict(self.query_metrics["query_types"]),
        }


# Global database monitor
db_monitor = DatabaseQueryMonitor()


def get_db_monitor():
    """Get the global database monitor instance"""
    return db_monitor


class HealthChecker:
    """System health monitoring"""

    def __init__(self):
        self.checks = {}

    async def check_database_health(self) -> Dict[str, Any]:
        """Check PostgreSQL database health with enhanced performance metrics"""
        try:
            import psycopg

            from ...core.config import settings

            # Use enhanced database performance check if available
            if check_database_performance:
                return await check_database_performance(settings.DATABASE_URL)

            # Fallback to basic check
            start_time = time.time()
            with psycopg.connect(settings.DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()

            response_time = time.time() - start_time

            return {"status": "healthy", "response_time": round(response_time, 3), "message": "Database connection successful"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "message": "Database connection failed"}

    async def check_neo4j_health(self) -> Dict[str, Any]:
        """Check Neo4j database health"""
        try:
            import os

            from neo4j import GraphDatabase

            start_time = time.time()
            driver = GraphDatabase.driver(
                os.getenv("NEO4J_URI", "bolt://localhost:7687"),
                auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password123456")),
            )

            with driver.session() as session:
                session.run("RETURN 1")

            driver.close()
            response_time = time.time() - start_time

            return {"status": "healthy", "response_time": round(response_time, 3), "message": "Neo4j connection successful"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "message": "Neo4j connection failed"}

    async def check_redis_health(self) -> Dict[str, Any]:
        """Check Redis health"""
        try:
            import os

            import redis.asyncio as redis_async

            start_time = time.time()
            redis_client = redis_async.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
            await redis_client.ping()
            await redis_client.close()

            response_time = time.time() - start_time

            return {"status": "healthy", "response_time": round(response_time, 3), "message": "Redis connection successful"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "message": "Redis connection failed"}

    async def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health check"""
        health_checks = {
            "database": await self.check_database_health(),
            "neo4j": await self.check_neo4j_health(),
            "redis": await self.check_redis_health(),
        }

        # Overall system status
        all_healthy = all(check["status"] == "healthy" for check in health_checks.values())

        # Get performance metrics if available
        monitor = get_performance_monitor()
        performance_metrics = monitor.get_metrics_summary() if monitor else {}

        # Get enhanced database metrics
        if db_monitor:
            db_metrics = db_monitor.get_metrics()
        else:
            db_metrics = {}

        # Get cache metrics if available
        cache_metrics = {}
        if cache_manager:
            cache_metrics = cache_manager.get_stats()

        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": time.time(),
            "services": health_checks,
            "performance": performance_metrics,
            "database_metrics": db_metrics,
            "cache_metrics": cache_metrics,
        }


# Global health checker
health_checker = HealthChecker()


def get_health_checker():
    """Get the global health checker instance"""
    return health_checker
