"""
Pydantic schemas for Skill Gap API
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class SkillInfo(BaseModel):
    """Schema cho thông tin kỹ năng"""
    name: str
    category: str
    importance: Optional[float] = 0.5
    proficiency_level: Optional[str] = None


class SkillGapCategory(BaseModel):
    """Schema cho các loại skill gap"""
    critical: List[SkillInfo] = []
    important: List[SkillInfo] = []
    nice_to_have: List[SkillInfo] = []


class SkillGapAnalysisResult(BaseModel):
    """Schema cho kết quả phân tích"""
    career_id: str
    match_percentage: float
    total_required_skills: int
    matched_skills_count: int
    missing_skills_count: int
    matched_skills: List[SkillInfo]
    skill_gaps: SkillGapCategory
    extra_skills: List[Dict[str, str]]


class SkillGapAnalysisResponse(BaseModel):
    """Schema cho response API"""
    id: int
    user_id: int
    career_id: str
    cv_filename: Optional[str]
    cv_name: Optional[str] = None
    cv_email: Optional[str] = None
    cv_phone: Optional[str] = None
    match_percentage: float
    total_required_skills: int
    matched_skills_count: int
    missing_skills_count: int
    cv_skills: List[Dict]
    matched_skills: List[Dict]
    skill_gaps: Dict
    extra_skills: List[Dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CVUploadRequest(BaseModel):
    """Schema cho request upload CV"""
    career_id: str = Field(..., description="ID của nghề nghiệp mục tiêu")


class HeatmapData(BaseModel):
    """Schema cho dữ liệu heatmap visualization"""
    nodes: List[Dict] = Field(..., description="Danh sách nodes (skills)")
    links: List[Dict] = Field(..., description="Danh sách links (relationships)")
    match_percentage: float
    career_name: str
