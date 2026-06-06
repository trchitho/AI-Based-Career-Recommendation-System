from __future__ import annotations

from app.core.public_urls import backend_base_url, frontend_base_url, vnpay_return_url


def test_production_urls_prefer_explicit_environment(monkeypatch):
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://frontend.example/")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    monkeypatch.setenv("BACKEND_BASE_URL", "https://backend.example/")
    monkeypatch.delenv("VNPAY_RETURN_URL", raising=False)

    assert frontend_base_url() == "https://frontend.example"
    assert backend_base_url() == "https://backend.example"
    assert vnpay_return_url() == "https://backend.example/api/payment/vnpay/return"


def test_vnpay_return_url_allows_provider_override(monkeypatch):
    monkeypatch.setenv("VNPAY_RETURN_URL", "https://payments.example/vnpay/callback/")

    assert vnpay_return_url() == "https://payments.example/vnpay/callback"


def test_render_hostname_builds_https_backend_url(monkeypatch):
    monkeypatch.delenv("BACKEND_BASE_URL", raising=False)
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    monkeypatch.setenv("RENDER_EXTERNAL_HOSTNAME", "career-ai.example")

    assert backend_base_url() == "https://career-ai.example"
