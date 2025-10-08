# apps/backend/app/bff/router.py
from fastapi import APIRouter

router = APIRouter(prefix="/bff")

@router.get("/health")
def health():
    return {"status": "ok"}
