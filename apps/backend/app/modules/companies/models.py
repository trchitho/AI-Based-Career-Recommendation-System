"""
Company & Job Listing models
Stores companies recruiting per career group with their posting URLs.
"""
from sqlalchemy import (
    BigInteger, Boolean, Column, Integer, String, Text,
    TIMESTAMP, UniqueConstraint, func, Index
)
from sqlalchemy.dialects.postgresql import ARRAY
from app.core.db import Base


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("name", "career_group_slug", name="uq_company_group"),
        {"schema": "core"},
    )

    id              = Column(BigInteger, primary_key=True)
    # Career group reference (from career_groups.csv)
    career_group_id   = Column(Integer, nullable=False, index=True)
    career_group_slug = Column(String(80), nullable=False, index=True)
    career_group_name = Column(String(120), nullable=False)      # Vietnamese name
    onet_major_group  = Column(String(10))                       # e.g. "15" for IT

    # Company info
    name        = Column(String(200), nullable=False)
    name_vi     = Column(String(200))                            # Vietnamese name if different
    description = Column(Text)
    industry    = Column(String(120))                            # sector
    size        = Column(String(50))                             # startup / SME / large / enterprise
    location    = Column(String(200))                            # HCM / Hanoi / Da Nang / Remote / Nationwide

    # Job posting URLs
    careers_url     = Column(Text)       # company's own career page
    linkedin_url    = Column(Text)       # LinkedIn jobs
    vietnamworks_url = Column(Text)      # VietnamWorks
    topcv_url       = Column(Text)       # TopCV
    itviec_url      = Column(Text)       # ITViec (IT only)
    jobstreet_url   = Column(Text)       # JobStreet
    other_url       = Column(Text)       # any other job board

    # Meta
    is_active   = Column(Boolean, default=True)
    verified    = Column(Boolean, default=True)     # human-verified URL
    created_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at  = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Company {self.name} [{self.career_group_slug}]>"
