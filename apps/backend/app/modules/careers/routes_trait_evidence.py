# app/modules/careers/routes_trait_evidence.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.jwt import require_user

from .schema import TraitEvidenceDTO
from .service_trait_evidence import TraitEvidenceService

router = APIRouter(prefix="", tags=["careers"])


def _db(request: Request) -> Session:
    return request.state.db


@router.get("/{career_id}/trait-evidence", response_model=TraitEvidenceDTO)
def get_trait_evidence(
    request: Request,
    career_id: str,
):
    """
    Get trait evidence for a career based on user's RIASEC assessment.
    Requires authentication via JWT Bearer token.
    """
    db = _db(request)
    user_id = require_user(request)  # Raises 401 if no valid token

    svc = TraitEvidenceService(db=db)

    try:
        data = svc.get_trait_evidence(
            user_id=user_id,
            career_slug_or_onet=career_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    return data

