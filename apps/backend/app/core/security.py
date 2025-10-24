import base64
import hashlib
import hmac
import secrets
import time
from typing import Any, Dict, Optional


_ALG = "pbkdf2_sha256"
_ITERATIONS = 100_000


def hash_password(password: str, *, iterations: int = _ITERATIONS) -> str:
    if not isinstance(password, str) or not password:
        raise ValueError("Password must be a non-empty string")
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"{_ALG}${iterations}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(dk).decode()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        alg, iter_s, salt_b64, hash_b64 = hashed.split("$")
        if alg != _ALG:
            return False
        iterations = int(iter_s)
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(hash_b64.encode())
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_json(obj: Dict[str, Any]) -> str:
    import json

    return _b64url(json.dumps(obj, separators=(",", ":")).encode("utf-8"))


def create_jwt(payload: Dict[str, Any], secret: str, *, expires_in: int = 3600) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    body = {**payload, "iat": now, "exp": now + expires_in}
    header_b64 = _b64url_json(header)
    payload_b64 = _b64url_json(body)
    signing_input = f"{header_b64}.{payload_b64}".encode()
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url(sig)}"


def verify_jwt(token: str, secret: str) -> Optional[Dict[str, Any]]:
    import json

    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode()

        def _pad(s: str) -> str:
            return s + "=" * (-len(s) % 4)

        sig = base64.urlsafe_b64decode(_pad(sig_b64))
        expected = hmac.new(
            secret.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(_pad(payload_b64)).decode())
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
