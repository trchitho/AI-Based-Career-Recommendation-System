# apps/backend/app/core/security.py
from passlib.hash import pbkdf2_sha256

def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pbkdf2_sha256.verify(password, hashed)
