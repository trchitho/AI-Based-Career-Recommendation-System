# apps/backend/app/core/security.py
from passlib.hash import pbkdf2_sha256
try:
    import bcrypt as pybcrypt  # python-bcrypt package
except Exception:  # pragma: no cover
    pybcrypt = None  # type: ignore


def hash_password(password: str) -> str:
    # Default to pbkdf2_sha256 for new hashes
    return pbkdf2_sha256.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against a hash.
    - pbkdf2_sha256 (default for app-created users)
    - bcrypt ($2a$/$2b$/$2y$) for users seeded via pgcrypto or legacy
    Avoids passlib's bcrypt backend to prevent version issues with bcrypt>=4.
    """
    try:
        if hashed.startswith(("$2a$", "$2b$", "$2y$")):
            if not pybcrypt:
                return False
            return pybcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        return pbkdf2_sha256.verify(password, hashed)
    except Exception:
        return False
