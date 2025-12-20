from typing import List
from pydantic import BaseModel


class TraitEvidenceDTO(BaseModel):
    scale: str
    items: List[str]
