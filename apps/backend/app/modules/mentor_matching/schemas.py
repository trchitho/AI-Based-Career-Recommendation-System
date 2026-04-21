from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime


class MentorProfileCreate(BaseModel):
    full_name: str
    current_position: str
    company: str
    bio: Optional[str] = ""
    expertise_areas: List[str]
    experience_years: int
    available_hours_per_week: int = 2
    preferred_communication: List[str] = ["video", "chat"]
    max_mentees: int = 5
    riasec_scores: Optional[Dict[str, float]] = {}
    big_five_scores: Optional[Dict[str, float]] = {}


class MentorProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    current_position: Optional[str]
    company: Optional[str]
    bio: Optional[str]
    expertise_areas: Optional[List[str]]
    experience_years: Optional[int]
    available_hours_per_week: Optional[int]
    preferred_communication: Optional[List[str]]
    max_mentees: Optional[int]
    current_mentees_count: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


class MenteeProfileCreate(BaseModel):
    full_name: str
    target_career: str
    current_skills: List[str] = []
    desired_skills: List[str]
    learning_style: str = "flexible"
    preferred_mentor_experience: str = "senior"
    riasec_scores: Optional[Dict[str, float]] = {}
    big_five_scores: Optional[Dict[str, float]] = {}


class MenteeProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    target_career: Optional[str]
    current_skills: Optional[List[str]]
    desired_skills: Optional[List[str]]

    class Config:
        from_attributes = True


class MatchingResult(BaseModel):
    mentor_id: int
    user_id: int
    mentor_name: str
    current_position: str
    company: str
    bio: Optional[str]
    expertise_areas: List[str]
    experience_years: int
    available_hours_per_week: int
    preferred_communication: List[str]
    compatibility_score: float          # 0-100
    skill_match_score: float            # 0-100
    career_match_score: float           # 0-100
    personality_score: float            # 0-100
    matching_skills: List[str]
    matching_reasons: List[str]
    current_mentees_count: int
    max_mentees: int


class MentorshipRequestCreate(BaseModel):
    mentor_id: int
    message: Optional[str] = ""


class MentorshipRequestOut(BaseModel):
    id: int
    mentor_id: int
    mentee_id: int
    compatibility_score: float
    status: str
    message: Optional[str]
    response_message: Optional[str]
    requested_at: datetime
    responded_at: Optional[datetime]

    # Joined info
    mentor_name: Optional[str] = None
    mentor_position: Optional[str] = None
    mentor_company: Optional[str] = None
    mentee_name: Optional[str] = None

    class Config:
        from_attributes = True


class RequestResponseAction(BaseModel):
    request_id: int
    action: str  # "accepted" or "rejected"
    response_message: Optional[str] = ""
