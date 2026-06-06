from __future__ import annotations

import importlib

from app.core import ai_core_config


def _reload(monkeypatch, **env):
    for name in (
        "AI_CORE_BASE_URL",
        "AI_CORE_URL",
        "AI_SERVICE_URL",
        "AI_CORE_BASE",
        "AI_CORE_ENABLED",
        "RENDER",
        "RENDER_SERVICE_ID",
    ):
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return importlib.reload(ai_core_config)


def test_render_disables_implicit_local_ai_core(monkeypatch):
    config = _reload(monkeypatch, RENDER="true")

    assert config.AI_CORE_BASE_URL == "http://localhost:9000"
    assert config.AI_CORE_ENABLED is False


def test_render_rejects_local_ai_core_even_when_enabled(monkeypatch):
    config = _reload(
        monkeypatch,
        RENDER="true",
        AI_CORE_ENABLED="true",
        AI_CORE_BASE_URL="http://localhost:9000",
    )

    assert config.AI_CORE_ENABLED is False


def test_render_allows_separately_deployed_ai_core(monkeypatch):
    config = _reload(
        monkeypatch,
        RENDER="true",
        AI_CORE_ENABLED="true",
        AI_CORE_BASE_URL="https://career-ai-core.example",
    )

    assert config.AI_CORE_ENABLED is True
