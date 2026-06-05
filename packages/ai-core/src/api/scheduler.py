"""
Background scheduler for AI-core periodic jobs.
Uses threading.Timer to avoid extra dependencies (no APScheduler/Celery).
"""
from __future__ import annotations

import logging
import os
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class FeatureRebuildScheduler:
    """
    Periodically rebuilds NeuMF user_feats.json + item_feats.json from DB.
    Ensures NeuMF is not stuck in cold-start mode for new users.
    """

    def __init__(
        self,
        interval_seconds: int = 6 * 3600,  # 6 hours
        db_url: Optional[str] = None,
        user_out: str = "data/processed/user_feats.json",
        item_out: str = "data/processed/item_feats.json",
        run_on_startup: bool = True,
    ) -> None:
        self.interval = interval_seconds
        self.db_url = db_url or os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:123456@localhost:5433/career_ai?sslmode=prefer&connect_timeout=10",
        )
        self.user_out = user_out
        self.item_out = item_out
        self.run_on_startup = run_on_startup
        self._timer: threading.Timer | None = None
        self._stopped = threading.Event()
        self._lock = threading.Lock()

    def _rebuild_once(self) -> None:
        """Run a single rebuild iteration. Catches all errors (must not crash scheduler)."""
        try:
            from ai_core.recsys.neumf.build_feats_from_db import build_features

            stats = build_features(
                db_url=self.db_url,
                user_out=self.user_out,
                item_out=self.item_out,
                item_id_mode="onet_code",  # MUST match retrieval_jobs_visbert.job_id format
                use_assessments=True,
            )
            logger.info(
                "[Scheduler] Rebuilt NeuMF features: users=%d, items=%d",
                stats["users"],
                stats["items"],
            )

            # Invalidate Ranker cache so next infer_scores reloads from disk
            try:
                from ai_core.recsys import service as _rk_service

                if _rk_service._rk is not None:
                    _rk_service._rk._user_feats = None  # type: ignore[attr-defined]
                    _rk_service._rk._item_feats = None  # type: ignore[attr-defined]
                    logger.info("[Scheduler] Invalidated NeuMF ranker cache")
            except Exception as e:
                logger.debug("[Scheduler] Could not invalidate ranker cache: %s", e)

            # Invalidate recs cache (recommendations may change after rebuild)
            try:
                from .cache import recs_cache

                recs_cache.clear()
                logger.info("[Scheduler] Cleared recs cache after rebuild")
            except Exception as e:
                logger.debug("[Scheduler] Could not clear recs cache: %s", e)

            # Update metrics
            try:
                from .metrics import metrics

                metrics.set_gauge("neumf_users_total", stats["users"])
                metrics.set_gauge("neumf_items_total", stats["items"])
                metrics.inc("neumf_rebuild_total", 1)
            except Exception:
                pass

        except Exception as e:
            logger.exception("[Scheduler] Feature rebuild failed: %s", e)

    def _schedule_next(self) -> None:
        if self._stopped.is_set():
            return
        with self._lock:
            self._timer = threading.Timer(self.interval, self._tick)
            self._timer.daemon = True
            self._timer.start()

    def _tick(self) -> None:
        self._rebuild_once()
        self._schedule_next()

    def start(self) -> None:
        """Start the scheduler. Optionally run an initial rebuild."""
        if self.run_on_startup:
            # Run first rebuild in background thread (don't block FastAPI startup)
            t = threading.Thread(target=self._rebuild_once, daemon=True, name="feature-rebuild-initial")
            t.start()
        self._schedule_next()
        logger.info(
            "[Scheduler] Feature rebuild scheduler started (interval=%ds, db=%s, user_out=%s)",
            self.interval,
            self.db_url.split("@")[-1] if "@" in self.db_url else "<hidden>",
            Path(self.user_out).name,
        )

    def stop(self) -> None:
        self._stopped.set()
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
        logger.info("[Scheduler] Feature rebuild scheduler stopped")

    def trigger_now(self) -> None:
        """Manually trigger a rebuild (e.g., when a new user submits assessment)."""
        t = threading.Thread(target=self._rebuild_once, daemon=True, name="feature-rebuild-manual")
        t.start()


# Singleton (initialized in main.py lifespan)
feature_scheduler: FeatureRebuildScheduler | None = None
