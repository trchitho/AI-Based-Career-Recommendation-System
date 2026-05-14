from pydantic import BaseModel
from typing import Optional


class CourseOut(BaseModel):
    id: int
    external_id: str
    title: str
    description: Optional[str]
    url: Optional[str]
    platform: str
    instructor: Optional[str]
    rating: float
    num_reviews: int
    price: float
    is_free: bool
    level: Optional[str]
    duration_hrs: Optional[float]
    thumbnail: Optional[str]
    language: str
    tags: list[str]

    model_config = {"from_attributes": True}


class CourseRecommendation(BaseModel):
    course: CourseOut
    skill_name: str
    similarity_score: float
    relevance_label: str   # "Highly Relevant" | "Relevant" | "Related"
    priority_group: Optional[str] = None  # "critical" | "important" | "nice_to_have"
    priority_label: Optional[str] = None
    reason: Optional[str] = None
    source_quality: Optional[str] = None


class CourseRecommendationsResponse(BaseModel):
    missing_skills: list[str]
    recommendations: list[CourseRecommendation]
    total: int
    source: str   # "neo4j" | "postgresql" | "fallback" | "gemini" | "cache"
    grouped_counts: dict[str, int] = {}


class SeedStatus(BaseModel):
    total_courses: int
    embedded_courses: int
    total_mappings: int
    neo4j_synced: bool
