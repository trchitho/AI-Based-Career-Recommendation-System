# -*- coding: utf-8 -*-
"""
Career Schemas - Pydantic models cho API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CareerGroupBase(BaseModel):
    name: str = Field(..., description="Tên nhóm ngành nghề")
    slug: str = Field(..., description="Slug cho URL")
    description: Optional[str] = Field(None, description="Mô tả nhóm ngành")
    onet_major_group: Optional[str] = Field(None, description="Mã nhóm O*NET")


class CareerGroupCreate(CareerGroupBase):
    pass


class CareerGroupOut(CareerGroupBase):
    id: int
    created_at: Optional[datetime] = None
    career_count: Optional[int] = Field(None, description="Số lượng nghề trong nhóm")
    level_count: Optional[int] = Field(None, description="Số lượng levels trong nhóm")
    
    class Config:
        from_attributes = True


class CareerGroupsResponse(BaseModel):
    """Response cho API /groups với pagination"""
    items: List[CareerGroupOut]
    total: int
    limit: int
    offset: int


class CareerGroupLevelBase(BaseModel):
    group_id: int = Field(..., description="ID nhóm ngành")
    level_order: int = Field(..., description="Thứ tự level")
    level_name_vi: str = Field(..., description="Tên level tiếng Việt")
    level_name_vn: Optional[str] = Field(None, description="Alias cho level_name_vi (backwards compat)")
    level_name_en: str = Field(..., description="Tên level tiếng Anh")
    level_slug: str = Field(..., description="Slug cho URL")
    min_exp_years: int = Field(..., description="Tối thiểu năm kinh nghiệm")
    max_exp_years: Optional[int] = Field(None, description="Tối đa năm kinh nghiệm")
    job_zone_mapping: Optional[str] = Field(None, description="Map với O*NET job zones")
    seniority_keywords: Optional[List[str]] = Field(None, description="Keywords trong job title")
    description_vi: Optional[str] = Field(None, description="Mô tả tiếng Việt")
    description_vn: Optional[str] = Field(None, description="Alias cho description_vi (backwards compat)")
    description_en: Optional[str] = Field(None, description="Mô tả tiếng Anh")


class CareerGroupLevelCreate(CareerGroupLevelBase):
    pass


class CareerGroupLevelOut(CareerGroupLevelBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CareerLevelMappingOut(BaseModel):
    id: int
    career_id: int
    group_level_id: int
    is_primary: bool
    confidence_score: float
    detection_method: Optional[str] = None
    notes: Optional[str] = None
    level: Optional[CareerGroupLevelOut] = None
    
    class Config:
        from_attributes = True


class CareerOut(BaseModel):
    """Career với thông tin group và level"""
    id: int
    slug: str
    title: str
    title_vn: Optional[str] = None
    title_en: Optional[str] = None
    short_desc: Optional[str] = None
    description_vn: Optional[str] = None
    onet_code: Optional[str] = None
    industry_category: Optional[str] = None
    group: Optional[CareerGroupOut] = None
    levels: Optional[List[CareerLevelMappingOut]] = Field(None, description="Các level phù hợp cho nghề này")
    
    class Config:
        from_attributes = True


class CareerGroupWithCareersOut(CareerGroupOut):
    """Career Group với danh sách careers"""
    careers: List[CareerOut] = []
    total_careers: Optional[int] = Field(None, description="Tổng số careers trong group (cho pagination)")


class CareerGroupWithLevelsOut(CareerGroupOut):
    """Career Group với danh sách levels"""
    levels: List[CareerGroupLevelOut] = []


class InterviewStartRequest(BaseModel):
    """Request để bắt đầu interview với level"""
    career_id: int = Field(..., description="ID của nghề nghiệp")
    level_slug: str = Field(..., description="Cấp bậc (slug)")
    jd_id: Optional[int] = Field(None, description="ID của Job Description (optional)")
    num_questions: int = Field(5, description="Số câu hỏi", ge=1, le=20)


class InterviewContextOut(BaseModel):
    """Context cho AI Interview"""
    career: str
    group: str
    level: str
    level_description: str
    skills: List[str] = []
    tasks: List[str] = []
    experience_range: str
    interview_focus: List[str] = []