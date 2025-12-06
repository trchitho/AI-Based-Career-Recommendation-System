from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class TraitSnapshot(BaseModel):
    has_test_traits: bool
    has_essay_traits: bool
    has_fused_traits: bool

    riasec_test: Optional[List[float]] = None
    big5_test: Optional[List[float]] = None

    riasec_essay: Optional[List[float]] = None
    big5_essay: Optional[List[float]] = None

    riasec_fused: Optional[List[float]] = None
    big5_fused: Optional[List[float]] = None


class AssessmentResultsOut(BaseModel):
    assessment_id: int
    user_id: int

    riasec_scores: Dict[str, float]
    big_five_scores: Dict[str, float]

    traits: TraitSnapshot

    career_recommendations: List[str] = []
    career_recommendations_full: List[Dict[str, Any]] = []

    completed_at: Optional[str] = None


class EssaySubmitIn(BaseModel):
    essayText: str
    assessmentId: Optional[int] = None
    lang: Optional[str] = None
    promptId: Optional[int] = None
