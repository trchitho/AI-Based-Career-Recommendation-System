from __future__ import annotations

import requests

from app.modules.nlp import service_nlp


class _FakeResponse:
    def __init__(self, *, error: bool):
        self.error = error

    def raise_for_status(self):
        if self.error:
            raise requests.HTTPError("429 Too Many Requests")

    def json(self):
        return {"embedding": {"values": [0.01] * 768}}


def test_embedding_rotates_to_backup_key(monkeypatch):
    monkeypatch.setenv("GEMINI_ASSESSMENT_API_KEY", "quota-exhausted")
    monkeypatch.setenv("GEMINI_ASSESSMENT_BACKUP_KEY", "backup-available")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY_1", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY_2", raising=False)
    monkeypatch.delenv("GEMINI_CHATBOT_BACKUP_KEY", raising=False)
    monkeypatch.setattr(service_nlp, "_gemini_embed_unavailable", False)

    attempted_keys: list[str] = []

    def fake_post(*args, **kwargs):
        key = kwargs["headers"]["x-goog-api-key"]
        attempted_keys.append(key)
        return _FakeResponse(error=key == "quota-exhausted")

    monkeypatch.setattr(service_nlp.requests, "post", fake_post)

    embedding = service_nlp.get_embedding("career test")

    assert attempted_keys == ["quota-exhausted", "backup-available"]
    assert len(embedding) == 768
