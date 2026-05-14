from typing import List, Optional

from pydantic import BaseModel, Field


class TraitEvidenceItemDTO(BaseModel):
    question_key: str
    question: str
    answer: str
    score: Optional[float] = None


class TraitEvidenceGroupDTO(BaseModel):
    kind: str
    code: str
    name: str
    score: Optional[float] = None
    assessment_id: Optional[int] = None
    items: List[TraitEvidenceItemDTO] = Field(default_factory=list)


class TraitEvidenceDTO(BaseModel):
    scale: str
    items: List[str] = Field(default_factory=list)
    riasec: Optional[TraitEvidenceGroupDTO] = None
    big_five: Optional[TraitEvidenceGroupDTO] = None
