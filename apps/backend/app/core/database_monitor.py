"""
Database query performance monitoring
"""

import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

import psycopg
from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


class DatabaseQueryMonitor:
    """Enhanced database query performance monitoring"""

    def __init__(self):
        self.query_metrics = {
            "total_queries": 0,
            "total_time": 0,
            "slow_queries": deque(maxlen=100),
            "query_types": defaultdict(int),
            "error_count": 0,
            "connection_count": 0,
        }
        self.slow_query_threshold = 1.0  # 1 second
        self.very_slow_threshold = 5.0  # 5 seconds

        # Track query patterns
        self.query_patterns = defaultdict(
            lambda: {"count": 0, "total_time": 0, "avg_time": 0, "max_time": 0, "min_time": float("inf")}
        )

    def _extract_query_type(self, query: str) -> str:
        """Extract query type from SQL statement"""
        query_clean = query.strip().upper()

        if query_clean.startswith("SELECT"):
            return "SELECT"
        elif query_clean.startswith("INSERT"):
            return "INSERT"
        elif query_clean.startswith("UPDATE"):
            return "UPDATE"
        elif query_clean.startswith("DELETE"):
            return "DELETE"
        elif query_clean.startswith("CREATE"):
            return "CREATE"
        elif query_clean.startswith("ALTER"):
            return "ALTER"
        elif query_clean.startswith("DROP"):
            return "DROP"
        else:
            return "OTHER"

    def _normalize_query(self, query: str) -> str:
        """Normalize query for pattern matching (remove specific values)"""
        import re

        # Remove string literals
        normalized = re.sub(r"'[^']*'", "'?'", query)

        # Remove numeric literals
        normalized = re.sub(r"\b\d+\b", "?", normalized)

        # Remove IN clauses with multiple values
        normalized = re.sub(r"IN\s*\([^)]+\)", "IN (?)", normalized, flags=re.IGNORECASE)

        # Normalize whitespace
        normalized = " ".join(normalized.split())

        return normalized[:200]  # Limit length

    def log_query(self, query: str, execution_time: float, error: Optional[str] = None, connection_info: Dict = None):
        """Log a database query execution with detailed metrics"""

        self.query_metrics["total_queries"] += 1

        if error:
            self.query_metrics["error_count"] += 1
            logger.error(f"Database query error: {error} - Query: {query[:100]}...")
            return

        self.query_metrics["total_time"] += execution_time

        # Track query type
        query_type = self._extract_query_type(query)
        self.query_metrics["query_types"][query_type] += 1

        # Track query patterns
        pattern = self._normalize_query(query)
        pattern_stats = self.query_patterns[pattern]
        pattern_stats["count"] += 1
        pattern_stats["total_time"] += execution_time
        pattern_stats["avg_time"] = pattern_stats["total_time"] / pattern_stats["count"]
        pattern_stats["max_time"] = max(pattern_stats["max_time"], execution_time)
        pattern_stats["min_time"] = min(pattern_stats["min_time"], execution_time)

        # Log slow queries
        if execution_time > self.slow_query_threshold:
            slow_query = {
                "query": query[:300] + "..." if len(query) > 300 else query,
                "execution_time": execution_time,
                "timestamp": time.time(),
                "query_type": query_type,
                "pattern": pattern,
                "connection_info": connection_info or {},
            }
            self.query_metrics["slow_queries"].append(slow_query)

            # Log with appropriate level
            log_level = logging.ERROR if execution_time > self.very_slow_threshold else logging.WARNING
            logger.log(
                log_level,
                f"{'VERY ' if execution_time > self.very_slow_threshold else ''}SLOW QUERY: "
                f"{execution_time:.3f}s - {query_type} - {query[:100]}...",
            )

    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive database metrics"""
        total_queries = self.query_metrics["total_queries"]
        total_time = self.query_metrics["total_time"]

        avg_time = (total_time / total_queries) if total_queries > 0 else 0

        # Get top slow query patterns
        top_slow_patterns = sorted(
            [(pattern, stats) for pattern, stats in self.query_patterns.items()], key=lambda x: x[1]["avg_time"], reverse=True
        )[:10]

        return {
            "total_queries": total_queries,
            "total_time": round(total_time, 3),
            "average_time": round(avg_time, 3),
            "error_count": self.query_metrics["error_count"],
            "error_rate": round((self.query_metrics["error_count"] / total_queries * 100) if total_queries > 0 else 0, 2),
            "slow_queries_count": len(
                [q for q in self.query_metrics["slow_queries"] if q["execution_time"] > self.slow_query_threshold]
            ),
            "very_slow_queries_count": len(
                [q for q in self.query_metrics["slow_queries"] if q["execution_time"] > self.very_slow_threshold]
            ),
            "query_types": dict(self.query_metrics["query_types"]),
            "recent_slow_queries": list(self.query_metrics["slow_queries"])[-10:],
            "top_slow_patterns": [
                {
                    "pattern": pattern[:100] + "..." if len(pattern) > 100 else pattern,
                    "count": stats["count"],
                    "avg_time": round(stats["avg_time"], 3),
                    "max_time": round(stats["max_time"], 3),
                    "total_time": round(stats["total_time"], 3),
                }
                for pattern, stats in top_slow_patterns
            ],
        }

    def reset_metrics(self):
        """Reset all metrics (useful for testing or periodic resets)"""
        self.query_metrics = {
            "total_queries": 0,
            "total_time": 0,
            "slow_queries": deque(maxlen=100),
            "query_types": defaultdict(int),
            "error_count": 0,
            "connection_count": 0,
        }
        self.query_patterns.clear()


# Global database monitor
db_monitor = DatabaseQueryMonitor()


@asynccontextmanager
async def monitor_query(query: str, connection_info: Dict = None):
    """Context manager for monitoring individual queries"""
    start_time = time.time()
    error = None

    try:
        yield
    except Exception as e:
        error = str(e)
        raise
    finally:
        execution_time = time.time() - start_time
        db_monitor.log_query(query, execution_time, error, connection_info)


def monitor_psycopg_connection(conn: psycopg.Connection):
    """Add monitoring to a psycopg connection"""
    original_execute = conn.execute

    def monitored_execute(query, params=None):
        start_time = time.time()
        error = None

        try:
            result = original_execute(query, params)
            return result
        except Exception as e:
            error = str(e)
            raise
        finally:
            execution_time = time.time() - start_time
            db_monitor.log_query(
                str(query), execution_time, error, {"connection_id": id(conn), "params_count": len(params) if params else 0}
            )

    conn.execute = monitored_execute
    return conn


# SQLAlchemy event listeners for automatic monitoring
@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """SQLAlchemy event: before query execution"""
    context._query_start_time = time.time()
    context._query_statement = statement


@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """SQLAlchemy event: after successful query execution"""
    if hasattr(context, "_query_start_time"):
        execution_time = time.time() - context._query_start_time
        db_monitor.log_query(
            statement,
            execution_time,
            None,
            {"sqlalchemy": True, "executemany": executemany, "params_count": len(parameters) if parameters else 0},
        )


@event.listens_for(Engine, "handle_error")
def receive_handle_error(exception_context):
    """SQLAlchemy event: query execution error"""
    if hasattr(exception_context.execution_context, "_query_start_time"):
        execution_time = time.time() - exception_context.execution_context._query_start_time
        statement = getattr(exception_context.execution_context, "_query_statement", "Unknown")
        db_monitor.log_query(
            statement, execution_time, str(exception_context.original_exception), {"sqlalchemy": True, "error": True}
        )


def get_db_monitor():
    """Get the global database monitor instance"""
    return db_monitor


# Database health check with performance metrics
async def check_database_performance(database_url: str) -> Dict[str, Any]:
    """Comprehensive database performance check"""
    try:
        start_time = time.time()

        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                # Basic connectivity test
                cur.execute("SELECT 1")
                cur.fetchone()

                # Check active connections
                cur.execute(
                    """
                    SELECT count(*) as active_connections,
                           max(extract(epoch from now() - query_start)) as longest_query_time
                    FROM pg_stat_activity 
                    WHERE state = 'active' AND query != '<IDLE>'
                """
                )
                conn_stats = cur.fetchone()

                # Check database size
                cur.execute(
                    """
                    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
                           pg_database_size(current_database()) as db_size_bytes
                """
                )
                size_stats = cur.fetchone()

                # Check slow queries from pg_stat_statements if available
                try:
                    cur.execute(
                        """
                        SELECT query, calls, total_exec_time, mean_exec_time
                        FROM pg_stat_statements 
                        ORDER BY mean_exec_time DESC 
                        LIMIT 5
                    """
                    )
                    slow_queries = cur.fetchall()
                except Exception:
                    slow_queries = []

        response_time = time.time() - start_time

        return {
            "status": "healthy",
            "response_time": round(response_time, 3),
            "active_connections": conn_stats[0] if conn_stats else 0,
            "longest_query_time": round(conn_stats[1], 3) if conn_stats and conn_stats[1] else 0,
            "database_size": size_stats[0] if size_stats else "unknown",
            "database_size_bytes": size_stats[1] if size_stats else 0,
            "slow_queries_available": len(slow_queries) > 0,
            "performance_metrics": db_monitor.get_metrics(),
        }

    except Exception as e:
        return {"status": "unhealthy", "error": str(e), "performance_metrics": db_monitor.get_metrics()}
