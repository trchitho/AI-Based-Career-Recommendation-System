# -*- coding: utf-8 -*-
"""
Career Models - Career Groups và Enhanced Career Levels
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, BigInteger, TIMESTAMP, ARRAY, Numeric, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from ...core.db import Base


class CareerGroup(Base):
    """Nhóm ngành nghề (Software & IT, Healthcare, Finance, etc.)"""
    __tablename__ = "career_groups"
    __table_args__ = {"schema": "core"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    onet_major_group: Mapped[Optional[str]] = mapped_column(Text)  # 2 ký tự đầu của onet_code
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "onet_major_group": self.onet_major_group,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CareerGroupLevel(Base):
    """Cấp bậc nghề nghiệp theo từng nhóm ngành (mỗi group có levels riêng)"""
    __tablename__ = "career_group_levels"
    __table_args__ = {"schema": "core"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.career_groups.id"), nullable=False)
    level_order: Mapped[int] = mapped_column(Integer, nullable=False)
    level_name_vi: Mapped[str] = mapped_column(Text, nullable=False)
    level_name_en: Mapped[str] = mapped_column(Text, nullable=False)
    level_slug: Mapped[str] = mapped_column(Text, nullable=False)
    min_exp_years: Mapped[int] = mapped_column(Integer, nullable=False)
    max_exp_years: Mapped[Optional[int]] = mapped_column(Integer)
    job_zone_mapping: Mapped[Optional[str]] = mapped_column(Text)
    seniority_keywords: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    description_vi: Mapped[Optional[str]] = mapped_column(Text)
    description_en: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "group_id": self.group_id,
            "level_order": self.level_order,
            "level_name_vi": self.level_name_vi,
            "level_name_vn": self.level_name_vi,   # backwards compat
            "level_name_en": self.level_name_en,
            "level_slug": self.level_slug,
            "min_exp_years": self.min_exp_years,
            "max_exp_years": self.max_exp_years,
            "job_zone_mapping": self.job_zone_mapping,
            "seniority_keywords": self.seniority_keywords or [],
            "description_vi": self.description_vi,
            "description_vn": self.description_vi,  # backwards compat
            "description_en": self.description_en,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CareerLevelMapping(Base):
    """Mapping giữa Career và CareerGroupLevel"""
    __tablename__ = "career_level_mapping"
    __table_args__ = {"schema": "core"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    career_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("core.careers.id"), nullable=False)
    group_level_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.career_group_levels.id"), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=1.0)
    detection_method: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "career_id": self.career_id,
            "group_level_id": self.group_level_id,
            "is_primary": self.is_primary,
            "confidence_score": float(self.confidence_score) if self.confidence_score else 1.0,
            "detection_method": self.detection_method,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CareerGroupMapping(Base):
    """Mapping giữa Career và CareerGroup"""
    __tablename__ = "career_group_mapping"
    __table_args__ = {"schema": "core"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    career_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("core.careers.id"), nullable=False)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.career_groups.id"), nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "career_id": self.career_id,
            "group_id": self.group_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }