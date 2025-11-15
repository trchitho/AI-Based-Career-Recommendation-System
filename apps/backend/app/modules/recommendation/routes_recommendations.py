from fastapi import APIRouter, Request
from sqlalchemy.orm import Session

from ...core.jwt import require_user
from . import service

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.post("/generate")
def generate_recommendations(request: Request, payload: dict):
    uid = require_user(request)
    session = _db(request)
    return service.generate(session, uid, payload.get("essay"))
