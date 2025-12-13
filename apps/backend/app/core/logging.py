# app/core/logging.py
from __future__ import annotations

import logging
import os

# Tên logger chung cho backend
LOGGER_NAME = "career_backend"


def _configure_root_logger() -> logging.Logger:
    """
    Config logger mặc định:
    - Level lấy từ env LOG_LEVEL (default = INFO)
    - Format có time + level + module + message
    """
    logger = logging.getLogger(LOGGER_NAME)

    # Chỉ config nếu chưa có handler (tránh bị add trùng khi reload)
    if not logger.handlers:
        level_name = os.getenv("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)

        logger.setLevel(level)

        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)

        logger.addHandler(handler)
        logger.propagate = False  # tránh log trùng lên root

    return logger


# Logger dùng chung trong toàn bộ backend
logger: logging.Logger = _configure_root_logger()
logger.debug("Logger '%s' initialized.", LOGGER_NAME)
logger.debug("Log level set to %s.", logging.getLevelName(logger.level))