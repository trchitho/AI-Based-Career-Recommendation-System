# app/core/logging.py
from __future__ import annotations

import logging
import os

# Tên logger chung cho backend
LOGGER_NAME = "career_backend"


def _configure_root_logger() -> logging.Logger:
    """
    Config logger mặc định:
    - Level lấy từ env LOG_LEVEL (default = WARNING)
    - Format ngắn gọn cho production
    """
    logger = logging.getLogger(LOGGER_NAME)

    # Chỉ config nếu chưa có handler (tránh bị add trùng khi reload)
    if not logger.handlers:
        level_name = os.getenv("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)

        logger.setLevel(level)

        handler = logging.StreamHandler()

        # Format ngắn gọn hơn cho production
        if level <= logging.INFO:
            # Detailed format for DEBUG/INFO
            formatter = logging.Formatter(
                fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                datefmt="%H:%M:%S",
            )
        else:
            # Concise format for WARNING/ERROR
            formatter = logging.Formatter(fmt="%(levelname)s | %(message)s")

        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False  # tránh log trùng lên root

    return logger


# Logger dùng chung trong toàn bộ backend
logger: logging.Logger = _configure_root_logger()

# Chỉ log debug messages khi LOG_LEVEL là DEBUG
if logger.level <= logging.DEBUG:
    logger.debug("Logger '%s' initialized.", LOGGER_NAME)
    logger.debug("Log level set to %s.", logging.getLevelName(logger.level))
