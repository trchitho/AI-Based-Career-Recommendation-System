# app/modules/assessments/schemas.py

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class TraitSnapshot(BaseModel):
    has_test_traits: bool
    has_essay_traits: bool
    has_fused_traits: bool

    # vector 6 chiều / 5 chiều, [0,1]
    riasec_test: Optional[List[float]] = None
    big5_test: Optional[List[float]] = None

    riasec_essay: Optional[List[float]] = None
    big5_essay: Optional[List[float]] = None

    riasec_fused: Optional[List[float]] = None
    big5_fused: Optional[List[float]] = None


class AssessmentResultsOut(BaseModel):
    assessment_id: int
    user_id: int

    # Điểm đã được BE chuẩn hoá cho chart (0–100, theo key FE đang dùng)
    riasec_scores: Dict[str, float]
    big_five_scores: Dict[str, float]

    # Snapshot đầy đủ, FE có thể dùng tab “chi tiết”
    traits: TraitSnapshot

    # Gợi ý nghề (để ResultsPage dùng luôn)
    career_recommendations: List[str] = []
    career_recommendations_full: List[Dict[str, Any]] = []

    completed_at: Optional[str] = None
