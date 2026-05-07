# Hướng Dẫn Implementation: Intelligent Mentor-Mentee Matching (PB19)

## 📋 Tổng Quan Chức Năng

Chức năng Intelligent Mentor-Mentee Matching giúp kết nối người dùng (Mentee) với các chuyên gia/cố vấn (Mentor) dựa trên:
- **Tương đồng chuyên môn**: Kỹ năng, định hướng nghề nghiệp
- **Tương đồng tính cách**: RIASEC & Big Five personality traits
- **Graph Database**: Sử dụng Neo4j để phân tích mối quan hệ phức tạp

## 🏗️ Kiến Trúc Hệ Thống

### 1. Cấu Trúc Module
```
apps/backend/app/modules/mentor_matching/
├── __init__.py
├── models.py              # Database models
├── schemas.py             # Pydantic schemas
├── routes.py              # FastAPI endpoints
├── service.py             # Business logic
├── matching_algorithm.py  # Core matching algorithm
├── graph_worker.py        # Background worker
├── neo4j_client.py        # Neo4j connection
└── utils.py               # Helper functions
```

### 2. Dependencies Cần Thêm
```toml
# pyproject.toml
[tool.poetry.dependencies]
neo4j = "^5.0.0"
scikit-learn = "^1.3.0"
celery = "^5.3.0"
redis = "^4.5.0"
numpy = "^1.24.0"
```

## 🔧 Bước 1: Cấu Hình Neo4j

### 1.1 Cập nhật .env
```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=careerverse

# Redis for Celery
REDIS_URL=redis://localhost:6379/0
```

### 1.2 Neo4j Client
```python
# apps/backend/app/modules/mentor_matching/neo4j_client.py
from neo4j import GraphDatabase
from typing import List, Dict, Any
import os

class Neo4jClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI"),
            auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
        )
    
    def close(self):
        self.driver.close()
    
    def execute_query(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict]:
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
    
    def create_user_node(self, user_id: str, user_type: str, properties: Dict):
        query = """
        MERGE (u:User {id: $user_id, type: $user_type})
        SET u += $properties
        RETURN u
        """
        return self.execute_query(query, {
            "user_id": user_id,
            "user_type": user_type,
            "properties": properties
        })
```

## 🗄️ Bước 2: Database Models

### 2.1 SQLAlchemy Models
```python
# apps/backend/app/modules/mentor_matching/models.py
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSON
from app.core.database import Base
from datetime import datetime

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Professional Info
    expertise_areas = Column(ARRAY(String))  # ["Python", "Data Science"]
    experience_years = Column(Integer)
    current_position = Column(String)
    company = Column(String)
    
    # Personality Scores (RIASEC + Big Five)
    riasec_scores = Column(JSON)  # {"R": 4.2, "I": 3.8, ...}
    big_five_scores = Column(JSON)  # {"openness": 4.1, ...}
    
    # Availability
    available_hours_per_week = Column(Integer)
    preferred_communication = Column(ARRAY(String))  # ["video", "chat", "email"]
    
    # Status
    is_active = Column(Boolean, default=True)
    max_mentees = Column(Integer, default=5)
    current_mentees_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MenteeProfile(Base):
    __tablename__ = "mentee_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Career Goals
    target_career = Column(String)
    current_skills = Column(ARRAY(String))
    desired_skills = Column(ARRAY(String))
    
    # Personality Scores
    riasec_scores = Column(JSON)
    big_five_scores = Column(JSON)
    
    # Preferences
    preferred_mentor_experience = Column(String)  # "junior", "senior", "executive"
    learning_style = Column(String)  # "structured", "flexible", "project-based"
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MentorshipRequest(Base):
    __tablename__ = "mentorship_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    mentee_id = Column(Integer, ForeignKey("mentee_profiles.id"))
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id"))
    
    # Matching Info
    compatibility_score = Column(Float)
    matching_reasons = Column(JSON)  # Lý do match
    
    # Request Status
    status = Column(String, default="pending")  # pending, accepted, rejected, expired
    message = Column(Text)
    
    # Timestamps
    requested_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime)

class MentorshipSession(Base):
    __tablename__ = "mentorship_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id"))
    mentee_id = Column(Integer, ForeignKey("mentee_profiles.id"))
    
    session_type = Column(String)  # "video", "chat", "email"
    scheduled_at = Column(DateTime)
    duration_minutes = Column(Integer)
    
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

## 📊 Bước 3: Pydantic Schemas

```python
# apps/backend/app/modules/mentor_matching/schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class PersonalityScores(BaseModel):
    riasec_scores: Dict[str, float] = Field(..., description="RIASEC scores (R,I,A,S,E,C)")
    big_five_scores: Dict[str, float] = Field(..., description="Big Five scores")

class MentorProfileCreate(BaseModel):
    expertise_areas: List[str]
    experience_years: int
    current_position: str
    company: str
    riasec_scores: Dict[str, float]
    big_five_scores: Dict[str, float]
    available_hours_per_week: int
    preferred_communication: List[str]
    max_mentees: int = 5

class MenteeProfileCreate(BaseModel):
    target_career: str
    current_skills: List[str]
    desired_skills: List[str]
    riasec_scores: Dict[str, float]
    big_five_scores: Dict[str, float]
    preferred_mentor_experience: str
    learning_style: str

class MatchingResult(BaseModel):
    mentor_id: int
    mentor_name: str
    mentor_position: str
    mentor_company: str
    compatibility_score: float
    matching_reasons: List[str]
    expertise_match: List[str]
    personality_similarity: float

class MentorshipRequestCreate(BaseModel):
    mentor_id: int
    message: Optional[str] = None

class MentorshipRequestResponse(BaseModel):
    request_id: int
    action: str  # "accept" or "reject"
    response_message: Optional[str] = None
```

## 🧠 Bước 4: Core Matching Algorithm

```python
# apps/backend/app/modules/mentor_matching/matching_algorithm.py
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
from .neo4j_client import Neo4jClient

class MentorMenteeMatchingAlgorithm:
    def __init__(self, neo4j_client: Neo4jClient):
        self.neo4j = neo4j_client
        
    def calculate_personality_similarity(
        self, 
        mentee_scores: Dict[str, float], 
        mentor_scores: Dict[str, float]
    ) -> float:
        """Tính độ tương đồng tính cách sử dụng Cosine Similarity"""
        
        # Combine RIASEC and Big Five scores
        mentee_vector = []
        mentor_vector = []
        
        # RIASEC scores
        riasec_keys = ['R', 'I', 'A', 'S', 'E', 'C']
        for key in riasec_keys:
            mentee_vector.append(mentee_scores.get('riasec_scores', {}).get(key, 0))
            mentor_vector.append(mentor_scores.get('riasec_scores', {}).get(key, 0))
        
        # Big Five scores
        big_five_keys = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
        for key in big_five_keys:
            mentee_vector.append(mentee_scores.get('big_five_scores', {}).get(key, 0))
            mentor_vector.append(mentor_scores.get('big_five_scores', {}).get(key, 0))
        
        # Calculate cosine similarity
        mentee_array = np.array(mentee_vector).reshape(1, -1)
        mentor_array = np.array(mentor_vector).reshape(1, -1)
        
        similarity = cosine_similarity(mentee_array, mentor_array)[0][0]
        return float(similarity)
    
    def calculate_skill_match(
        self, 
        mentee_desired_skills: List[str], 
        mentor_expertise: List[str]
    ) -> Tuple[float, List[str]]:
        """Tính độ phù hợp về kỹ năng"""
        
        if not mentee_desired_skills or not mentor_expertise:
            return 0.0, []
        
        # Convert to lowercase for comparison
        desired_lower = [skill.lower() for skill in mentee_desired_skills]
        expertise_lower = [skill.lower() for skill in mentor_expertise]
        
        # Find matching skills
        matching_skills = []
        for desired in desired_lower:
            for expertise in expertise_lower:
                if desired in expertise or expertise in desired:
                    matching_skills.append(desired)
                    break
        
        # Calculate match percentage
        match_score = len(matching_skills) / len(mentee_desired_skills)
        return match_score, matching_skills
    
    def find_career_path_mentors(
        self, 
        mentee_target_career: str, 
        mentor_ids: List[int]
    ) -> List[int]:
        """Tìm mentors đã thành công trong career path mong muốn"""
        
        query = """
        MATCH (m:User {type: 'mentor'})-[:WORKS_IN]->(career:Career)
        WHERE m.id IN $mentor_ids 
        AND (career.title CONTAINS $target_career OR career.category CONTAINS $target_career)
        RETURN m.id as mentor_id, career.title as career_title
        """
        
        results = self.neo4j.execute_query(query, {
            "mentor_ids": mentor_ids,
            "target_career": mentee_target_career
        })
        
        return [result['mentor_id'] for result in results]
    
    def calculate_overall_compatibility(
        self,
        personality_similarity: float,
        skill_match_score: float,
        career_path_bonus: bool = False
    ) -> float:
        """Tính điểm tương thích tổng thể"""
        
        # Weighted scoring
        personality_weight = 0.4
        skill_weight = 0.5
        career_path_weight = 0.1
        
        base_score = (
            personality_similarity * personality_weight +
            skill_match_score * skill_weight
        )
        
        if career_path_bonus:
            base_score += career_path_weight
        
        return min(base_score, 1.0)  # Cap at 1.0
```

## ⚙️ Bước 5: Background Worker

```python
# apps/backend/app/modules/mentor_matching/graph_worker.py
from celery import Celery
from typing import List, Dict
from .matching_algorithm import MentorMenteeMatchingAlgorithm
from .neo4j_client import Neo4jClient
from .service import MentorMatchingService

celery_app = Celery('mentor_matching')

@celery_app.task
def find_compatible_mentors_task(mentee_id: int) -> List[Dict]:
    """Background task để tìm mentors tương thích"""
    
    neo4j_client = Neo4jClient()
    algorithm = MentorMenteeMatchingAlgorithm(neo4j_client)
    service = MentorMatchingService()
    
    try:
        # Get mentee profile
        mentee_profile = service.get_mentee_profile(mentee_id)
        if not mentee_profile:
            return []
        
        # Get all available mentors
        available_mentors = service.get_available_mentors()
        
        results = []
        for mentor in available_mentors:
            # Calculate personality similarity
            personality_sim = algorithm.calculate_personality_similarity(
                mentee_profile.personality_scores,
                mentor.personality_scores
            )
            
            # Calculate skill match
            skill_match, matching_skills = algorithm.calculate_skill_match(
                mentee_profile.desired_skills,
                mentor.expertise_areas
            )
            
            # Check career path alignment
            career_path_mentors = algorithm.find_career_path_mentors(
                mentee_profile.target_career,
                [mentor.id]
            )
            career_bonus = mentor.id in career_path_mentors
            
            # Calculate overall compatibility
            compatibility = algorithm.calculate_overall_compatibility(
                personality_sim,
                skill_match,
                career_bonus
            )
            
            if compatibility > 0.3:  # Minimum threshold
                results.append({
                    'mentor_id': mentor.id,
                    'compatibility_score': compatibility,
                    'personality_similarity': personality_sim,
                    'skill_match_score': skill_match,
                    'matching_skills': matching_skills,
                    'career_path_match': career_bonus
                })
        
        # Sort by compatibility score
        results.sort(key=lambda x: x['compatibility_score'], reverse=True)
        return results[:10]  # Top 10 matches
        
    finally:
        neo4j_client.close()

@celery_app.task
def find_compatible_mentees_task(mentor_id: int) -> List[Dict]:
    """Background task để tìm mentees phù hợp cho mentor"""
    
    # Similar logic but reversed
    # Implementation here...
    pass
```

## 🔄 Bước 6: Service Layer

```python
# apps/backend/app/modules/mentor_matching/service.py
from sqlalchemy.orm import Session
from typing import List, Optional
from .models import MentorProfile, MenteeProfile, MentorshipRequest
from .schemas import MatchingResult, MentorshipRequestCreate
from .graph_worker import find_compatible_mentors_task

class MentorMatchingService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_mentor_profile(self, user_id: int, profile_data: dict) -> MentorProfile:
        """Tạo profile mentor"""
        mentor_profile = MentorProfile(
            user_id=user_id,
            **profile_data
        )
        self.db.add(mentor_profile)
        self.db.commit()
        self.db.refresh(mentor_profile)
        return mentor_profile
    
    def create_mentee_profile(self, user_id: int, profile_data: dict) -> MenteeProfile:
        """Tạo profile mentee"""
        mentee_profile = MenteeProfile(
            user_id=user_id,
            **profile_data
        )
        self.db.add(mentee_profile)
        self.db.commit()
        self.db.refresh(mentee_profile)
        return mentee_profile
    
    def find_mentors_for_mentee(self, mentee_id: int) -> List[MatchingResult]:
        """Tìm mentors phù hợp cho mentee (async)"""
        
        # Trigger background task
        task = find_compatible_mentors_task.delay(mentee_id)
        
        # For demo, return cached results if available
        # In production, you'd store task_id and poll for results
        return []
    
    def send_mentorship_request(
        self, 
        mentee_id: int, 
        request_data: MentorshipRequestCreate
    ) -> MentorshipRequest:
        """Gửi yêu cầu mentorship"""
        
        request = MentorshipRequest(
            mentee_id=mentee_id,
            mentor_id=request_data.mentor_id,
            message=request_data.message,
            status="pending"
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request
    
    def respond_to_request(
        self, 
        mentor_id: int, 
        request_id: int, 
        action: str, 
        message: str = None
    ) -> MentorshipRequest:
        """Mentor phản hồi yêu cầu"""
        
        request = self.db.query(MentorshipRequest).filter(
            MentorshipRequest.id == request_id,
            MentorshipRequest.mentor_id == mentor_id
        ).first()
        
        if not request:
            raise ValueError("Request not found")
        
        request.status = action  # "accepted" or "rejected"
        request.response_message = message
        request.responded_at = datetime.utcnow()
        
        self.db.commit()
        return request
```

## 🌐 Bước 7: API Endpoints

```python
# apps/backend/app/modules/mentor_matching/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from .service import MentorMatchingService
from .schemas import *

router = APIRouter(prefix="/api/mentor-matching", tags=["Mentor Matching"])

@router.post("/mentor/profile")
async def create_mentor_profile(
    profile_data: MentorProfileCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tạo profile mentor"""
    service = MentorMatchingService(db)
    profile = service.create_mentor_profile(current_user.id, profile_data.dict())
    return {"message": "Mentor profile created successfully", "profile_id": profile.id}

@router.post("/mentee/profile")
async def create_mentee_profile(
    profile_data: MenteeProfileCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tạo profile mentee"""
    service = MentorMatchingService(db)
    profile = service.create_mentee_profile(current_user.id, profile_data.dict())
    return {"message": "Mentee profile created successfully", "profile_id": profile.id}

@router.get("/mentee/find-mentors", response_model=List[MatchingResult])
async def find_mentors(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tìm mentors phù hợp cho mentee"""
    service = MentorMatchingService(db)
    
    # Get mentee profile
    mentee_profile = service.get_mentee_profile_by_user_id(current_user.id)
    if not mentee_profile:
        raise HTTPException(status_code=404, detail="Mentee profile not found")
    
    results = service.find_mentors_for_mentee(mentee_profile.id)
    return results

@router.post("/mentee/send-request")
async def send_mentorship_request(
    request_data: MentorshipRequestCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gửi yêu cầu mentorship"""
    service = MentorMatchingService(db)
    
    mentee_profile = service.get_mentee_profile_by_user_id(current_user.id)
    if not mentee_profile:
        raise HTTPException(status_code=404, detail="Mentee profile not found")
    
    request = service.send_mentorship_request(mentee_profile.id, request_data)
    return {"message": "Request sent successfully", "request_id": request.id}

@router.get("/mentor/requests")
async def get_mentorship_requests(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách yêu cầu mentorship cho mentor"""
    service = MentorMatchingService(db)
    
    mentor_profile = service.get_mentor_profile_by_user_id(current_user.id)
    if not mentor_profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    
    requests = service.get_pending_requests_for_mentor(mentor_profile.id)
    return requests

@router.post("/mentor/respond-request")
async def respond_to_mentorship_request(
    response_data: MentorshipRequestResponse,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mentor phản hồi yêu cầu mentorship"""
    service = MentorMatchingService(db)
    
    mentor_profile = service.get_mentor_profile_by_user_id(current_user.id)
    if not mentor_profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    
    request = service.respond_to_request(
        mentor_profile.id,
        response_data.request_id,
        response_data.action,
        response_data.response_message
    )
    
    return {"message": f"Request {response_data.action}ed successfully"}

@router.get("/mentor/suggested-mentees")
async def get_suggested_mentees(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách mentees được gợi ý cho mentor"""
    service = MentorMatchingService(db)
    
    mentor_profile = service.get_mentor_profile_by_user_id(current_user.id)
    if not mentor_profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    
    suggestions = service.find_mentees_for_mentor(mentor_profile.id)
    return suggestions
```

## 🚀 Bước 8: Integration & Testing

### 8.1 Thêm vào main router
```python
# apps/backend/app/main.py
from app.modules.mentor_matching.routes import router as mentor_matching_router

app.include_router(mentor_matching_router)
```

### 8.2 Database Migration
```bash
# Tạo migration
alembic revision --autogenerate -m "Add mentor matching tables"

# Apply migration
alembic upgrade head
```

### 8.3 Start Celery Worker
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Celery Worker
celery -A app.modules.mentor_matching.graph_worker worker --loglevel=info

# Terminal 3: Start FastAPI
uvicorn app.main:app --reload
```

## 📈 Bước 9: Performance Optimization

### 9.1 Neo4j Indexing
```cypher
// Create indexes for better performance
CREATE INDEX mentor_skills IF NOT EXISTS FOR (m:User) ON (m.expertise_areas);
CREATE INDEX career_paths IF NOT EXISTS FOR (c:Career) ON (c.title);
CREATE INDEX personality_scores IF NOT EXISTS FOR (u:User) ON (u.riasec_scores);
```

### 9.2 Caching Strategy
```python
# apps/backend/app/modules/mentor_matching/cache.py
import redis
import json
from typing import List, Dict

class MatchingCache:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"))
    
    def cache_matching_results(self, mentee_id: int, results: List[Dict], ttl: int = 3600):
        """Cache matching results for 1 hour"""
        key = f"matching_results:{mentee_id}"
        self.redis_client.setex(key, ttl, json.dumps(results))
    
    def get_cached_results(self, mentee_id: int) -> List[Dict]:
        """Get cached matching results"""
        key = f"matching_results:{mentee_id}"
        cached = self.redis_client.get(key)
        if cached:
            return json.loads(cached)
        return []
```

## 🎯 Bước 10: Frontend Integration

### 10.1 API Service
```typescript
// apps/frontend/src/services/mentorMatchingService.ts
export interface MentorMatch {
  mentor_id: number;
  mentor_name: string;
  mentor_position: string;
  compatibility_score: number;
  matching_reasons: string[];
}

export const mentorMatchingService = {
  async findMentors(): Promise<MentorMatch[]> {
    const response = await fetch('/api/mentor-matching/mentee/find-mentors');
    return response.json();
  },
  
  async sendRequest(mentorId: number, message: string) {
    const response = await fetch('/api/mentor-matching/mentee/send-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentor_id: mentorId, message })
    });
    return response.json();
  }
};
```

## 📝 Tóm Tắt Implementation

1. **Setup Neo4j & Redis** cho graph database và caching
2. **Tạo models** cho Mentor/Mentee profiles và requests
3. **Implement matching algorithm** với Cosine Similarity
4. **Setup background workers** với Celery
5. **Tạo API endpoints** cho cả Mentor và Mentee
6. **Optimize performance** với indexing và caching
7. **Integrate frontend** với TypeScript services

Chức năng này sẽ cung cấp hệ thống matching thông minh dựa trên cả yếu tố chuyên môn và tính cách, giúp tạo ra những kết nối Mentor-Mentee hiệu quả trong hệ sinh thái CareerVerse.