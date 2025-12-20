"""
SQLAlchemy models for report tables.
- core.report_templates: Template configurations
- core.assessment_reports: Snapshot reports per assessment
- analytics.report_events: Report viewing analytics
"""

from sqlalchemy import Column, BigInteger, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from ...core.db import Base


class ReportTemplate(Base):
    """Template configuration for report generation."""
    __tablename__ = "report_templates"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True, index=True)
    template_key = Column(Text, nullable=False)  # 'big5_v1', 'riasec_v1'
    version = Column(Text, nullable=False)  # '1.0.0'
    locale = Column(Text, nullable=False, default='vi')  # 'vi' | 'en'
    title = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    config_json = Column(JSONB, nullable=False)  # weights, mapping rules, labels, text blocks
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AssessmentReport(Base):
    """Snapshot report for an assessment."""
    __tablename__ = "assessment_reports"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("core.users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(BigInteger, ForeignKey("core.assessment_sessions.id", ondelete="SET NULL"), nullable=True)
    assessment_id = Column(BigInteger, ForeignKey("core.assessments.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(BigInteger, ForeignKey("core.report_templates.id", ondelete="RESTRICT"), nullable=False)
    report_type = Column(Text, nullable=False)  # 'big5' | 'riasec'
    locale = Column(Text, nullable=False, default='vi')
    status = Column(Text, nullable=False, default='ready')  # 'ready'|'generating'|'failed'
    source_hash = Column(Text, nullable=True)  # hash of inputs to detect stale
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Layout version for tracking layout changes
    layout_version = Column(Text, nullable=False, default='print_v1')
    
    # SNAPSHOT payload - all fields have defaults to ensure never null
    cover_json = Column(JSONB, nullable=False, default={})
    narrative_json = Column(JSONB, nullable=False, default={})  # "Persuasive Idealist" + intro
    scores_json = Column(JSONB, nullable=False, default=[])  # OCEAN raw/percentile + labels
    facets_json = Column(JSONB, nullable=False, default=[])  # 6 facets × 4-quadrant percents
    strengths_json = Column(JSONB, nullable=False, default=[])  # array bullets
    challenges_json = Column(JSONB, nullable=False, default=[])  # array bullets
    pages_json = Column(JSONB, nullable=False, default=[])  # per-page structure

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ReportEvent(Base):
    """Analytics events for report viewing.
    
    Rules:
    - event_uuid: unique identifier for idempotent logging (skip if duplicate)
    - tab_switch: requires tab_key
    - page_view: requires page_no
    - meta_json: never null (defaults to {})
    """
    __tablename__ = "report_events"
    __table_args__ = {"schema": "analytics"}

    id = Column(BigInteger, primary_key=True, index=True)
    event_uuid = Column(Text, nullable=True, unique=True, index=True)  # For idempotent logging
    user_id = Column(BigInteger, ForeignKey("core.users.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(BigInteger, ForeignKey("core.assessments.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(BigInteger, ForeignKey("core.assessment_reports.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(Text, nullable=False)  # 'big5'|'riasec'
    event_type = Column(Text, nullable=False)  # 'open'|'tab_switch'|'page_view'|'scroll_depth'|'print'
    tab_key = Column(Text, nullable=True)  # 'big5'|'riasec'
    page_no = Column(Integer, nullable=True)  # 1..7 for Big5
    page_key = Column(Text, nullable=True)  # 'cover', 'summary', 'facets-1', etc.
    meta_json = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
