import io
import json
import urllib.error
import urllib.parse

from app.modules.auth.routes_google import (
    _frontend_oauth_redirect,
    _read_google_error,
)


def test_frontend_redirect_parses_plain_and_legacy_encoded_state(monkeypatch):
    monkeypatch.setenv(
        "FRONTEND_OAUTH_REDIRECT",
        "https://frontend.example/oauth/callback",
    )
    payload = json.dumps({"redirect": "https://custom.example/oauth/callback"})

    assert _frontend_oauth_redirect(payload) == "https://custom.example/oauth/callback"
    assert (
        _frontend_oauth_redirect(urllib.parse.quote(payload))
        == "https://custom.example/oauth/callback"
    )


def test_google_http_error_body_is_extracted():
    error = urllib.error.HTTPError(
        "https://oauth2.googleapis.com/token",
        401,
        "Unauthorized",
        {},
        io.BytesIO(
            b'{"error":"invalid_client","error_description":"The OAuth client was not found."}'
        ),
    )

    assert _read_google_error(error) == "The OAuth client was not found."
