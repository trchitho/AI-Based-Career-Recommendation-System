"""
Pydantic schemas for report API.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


# ============ Request Schemas ============

class ReportEventCreate(BaseModel):
    """Request to log a report event.
    
    Rules:
    - event_uuid: unique identifier for idempotent logging
    - tab_switch: requires tab_key
    - page_view: requires page_no
    - meta: never null (defaults to {})
    """
    assessment_id: int
    report_id: int
    report_type: str  # 'big5' | 'riasec'
    event_type: str  # 'open' | 'tab_switch' | 'page_view' | 'scroll_depth' | 'print'
    event_uuid: Optional[str] = None  # For idempotent logging
    tab_key: Optional[str] = None
    page_no: Optional[int] = None
    page_key: Optional[str] = None  # 'cover', 'summary', 'facets-1', etc.
    meta: Optional[Dict[str, Any]] = None


# ============ Response Schemas ============

class FacetLabel(BaseModel):
    """A single label within a facet quadrant."""
    name: str
    percent: int
    description: str


class Facet(BaseModel):
    """A behavioral facet with 4 quadrant labels."""
    name: str
    title: str
    dominant: str
    dominant_percent: int
    labels: List[FacetLabel]


class CoverData(BaseModel):
    """Cover page data."""
    title: str
    subtitle: Optional[str] = None
    user_name: Optional[str] = None
    completed_at: Optional[str] = None
    intro_paragraphs: List[str] = []


class NarrativeData(BaseModel):
    """Personality type narrative."""
    type_name: str  # e.g., "Persuasive Idealist"
    type_description: str
    paragraphs: List[str] = []


class ScoreItem(BaseModel):
    """A single score with label."""
    trait: str
    score: float
    percentile_label: str  # 'Low' | 'Average' | 'High'


class ReportResponse(BaseModel):
    """Full report response for a single report type."""
    id: int
    assessment_id: int
    report_type: str
    locale: str
    status: str
    computed_at: datetime
    cover: CoverData
    narrative: NarrativeData
    scores: List[ScoreItem]
    facets: List[Facet]
    strengths: List[str]
    challenges: List[str]


class FullReportResponse(BaseModel):
    """Combined response with both Big5 and RIASEC reports."""
    assessment_id: int
    user_id: int
    big5: Optional[ReportResponse] = None
    riasec: Optional[ReportResponse] = None


class ReportEventResponse(BaseModel):
    """Response after logging an event."""
    success: bool
    event_id: Optional[int] = None
    message: Optional[str] = None
