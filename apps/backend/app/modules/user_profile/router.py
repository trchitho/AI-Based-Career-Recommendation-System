# app/modules/user_profile/router.py

from app.modules.assessments.routes_assessments import _current_user_id, _db
from app.modules.assessments.schemas import TraitSnapshot
from app.modules.assessments.service import get_user_traits
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["users"])


@router.get("/me/traits", response_model=TraitSnapshot)
def get_my_traits(
    db: Session = Depends(_db),
    current_user_id: int = Depends(_current_user_id),
):
    """
    Trả traits hiện tại của user:
    - Đọc ai.user_trait_fused nếu có;
    - Nếu chưa có essay → fallback test RIASEC/Big Five mới nhất.
    """
    traits = get_user_traits(db, current_user_id)
    return traits
