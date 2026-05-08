# PB19 — Intelligent Mentor–Mentee Matching

## Mục tiêu
Kết nối Mentee với Mentor dựa trên:
- Cosine similarity giữa vector tính cách (RIASEC 6 chiều + Big Five 5 chiều)
- Graph traversal tìm Mentor đã đi qua lộ trình nghề nghiệp mà Mentee muốn hướng tới
- Kỹ năng còn thiếu từ CV Parser

**MVP scope**: Gửi yêu cầu kết nối, nhắn tin, đặt lịch. **Không có video call.**

---

## 1. Cấu trúc thư mục cần tạo

```
apps/backend/app/modules/mentor/
├── __init__.py
├── router.py          ← FastAPI routes
├── service.py         ← Business logic + Neo4j queries
├── schemas.py         ← Pydantic models
└── models.py          ← SQLAlchemy ORM (PostgreSQL)

apps/backend/app/api/
└── mentor_router.py   ← thin import wrapper (như các module khác)

apps/frontend/src/
├── pages/MentorPage.tsx            ← danh sách mentor gợi ý
├── pages/MentorProfilePage.tsx     ← hồ sơ chi tiết mentor
├── pages/MentorDashboardPage.tsx   ← Mentor quản lý yêu cầu
└── services/mentorService.ts       ← API calls
```

---

## 2. PostgreSQL Schema (SQLAlchemy)

File: `app/modules/mentor/models.py`

```python
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.db import Base

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"
    __table_args__ = {"schema": "core"}

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("core.users.id"), unique=True, nullable=False)
    bio           = Column(Text)
    expertise     = Column(ARRAY(String))   # ["Python", "Data Science", ...]
    career_path   = Column(ARRAY(String))   # ["Junior Dev", "Senior Dev", "Lead"]
    years_exp     = Column(Integer, default=0)
    availability  = Column(JSONB)           # {"mon": ["9:00","10:00"], "tue": [...]}
    is_active     = Column(Boolean, default=True)
    rating        = Column(Float, default=0.0)
    total_mentees = Column(Integer, default=0)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

class MentorRequest(Base):
    __tablename__ = "mentor_requests"
    __table_args__ = {"schema": "core"}

    id          = Column(Integer, primary_key=True, index=True)
    mentee_id   = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    mentor_id   = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    status      = Column(String, default="pending")  # pending/accepted/rejected
    message     = Column(Text)
    score       = Column(Float)   # compatibility score từ algorithm
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

class MentorSession(Base):
    __tablename__ = "mentor_sessions"
    __table_args__ = {"schema": "core"}

    id           = Column(Integer, primary_key=True, index=True)
    request_id   = Column(Integer, ForeignKey("core.mentor_requests.id"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_min = Column(Integer, default=60)
    notes        = Column(Text)
    status       = Column(String, default="scheduled")  # scheduled/completed/cancelled
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
```

---

## 3. Neo4j Schema (Cypher — chạy 1 lần khi khởi tạo)

File: `apps/backend/app/modules/mentor/neo4j_setup.cypher`  
Hoặc chạy trong `scripts/neo4j_mentor_seed.py`

```cypher
// ── Constraints & Indexes ──────────────────────────────────────────
CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (c:CareerNode) REQUIRE c.title IS UNIQUE;

// ── Node: User (Mentor / Mentee) ───────────────────────────────────
// Tạo khi user đăng ký mentor hoặc có assessment
// MERGE (u:User {user_id: $user_id})
// SET u.riasec = $riasec_vector,   // [R, I, A, S, E, C]  float[6]
//     u.bigfive = $bigfive_vector, // [O, C, E, A, N]      float[5]
//     u.role = "mentor"            // hoặc "mentee"

// ── Relationship: Mentor đã trải qua Career node ───────────────────
// (:User {role:"mentor"})-[:WORKED_AS {years: 2}]->(:CareerNode)

// ── Relationship: Mentee muốn hướng tới Career node ───────────────
// (:User {role:"mentee"})-[:TARGETS]->(:CareerNode)

// ── Relationship: User có Skill ───────────────────────────────────
// (:User)-[:HAS_SKILL {level: 3}]->(:Skill)

// ── Relationship: Mentor–Mentee đang kết nối ──────────────────────
// (:User {role:"mentee"})-[:CONNECTED_TO {status:"accepted"}]->(:User {role:"mentor"})
```

---

## 4. Thuật toán Matching (service.py)

File: `app/modules/mentor/service.py`

### 4.1 — Cosine Similarity (tính cách)

```python
import math
from neo4j import AsyncGraphDatabase
import os

async def get_driver():
    url  = os.getenv("NEO4J_URL")
    user = os.getenv("NEO4J_USER")
    pwd  = os.getenv("NEO4J_PASS")
    if not url:
        return None
    return AsyncGraphDatabase.driver(url, auth=(user, pwd))

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    dot   = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
```

### 4.2 — Query Neo4j lấy Top Mentors

```python
async def find_top_mentors(
    mentee_user_id: int,
    riasec: list[float],       # [R,I,A,S,E,C] từ assessment
    bigfive: list[float],      # [O,C,E,A,N]
    target_career: str,        # từ user profile
    missing_skills: list[str], # từ CV parser / skill gap
    top_k: int = 10,
) -> list[dict]:
    driver = await get_driver()
    if driver is None:
        return []

    async with driver.session() as session:
        # Bước 1: Lấy tất cả mentor đã đi qua target_career
        result = await session.run(
            """
            MATCH (mentor:User {role: 'mentor'})
                  -[:WORKED_AS]->(c:CareerNode {title: $career})
            RETURN mentor.user_id   AS user_id,
                   mentor.riasec    AS riasec,
                   mentor.bigfive   AS bigfive,
                   mentor.skills    AS skills
            LIMIT 100
            """,
            career=target_career,
        )
        mentors = await result.data()

    scores = []
    for m in mentors:
        if not m["riasec"] or not m["bigfive"]:
            continue

        # Tính personality score (trọng số 60% RIASEC + 40% Big Five)
        riasec_sim = cosine_similarity(riasec, m["riasec"])
        bigfive_sim = cosine_similarity(bigfive, m["bigfive"])
        personality_score = 0.6 * riasec_sim + 0.4 * bigfive_sim

        # Tính skill coverage score
        mentor_skills = set(m["skills"] or [])
        coverage = len(set(missing_skills) & mentor_skills) / max(len(missing_skills), 1)
        skill_score = coverage

        # Final score
        final = 0.7 * personality_score + 0.3 * skill_score

        scores.append({
            "user_id": m["user_id"],
            "personality_score": round(personality_score, 4),
            "skill_score": round(skill_score, 4),
            "compatibility_score": round(final, 4),
        })

    # Sort & return top K
    scores.sort(key=lambda x: x["compatibility_score"], reverse=True)
    return scores[:top_k]
```

### 4.3 — Sync user vào Neo4j (gọi sau khi assessment xong)

```python
async def sync_user_to_neo4j(
    user_id: int,
    role: str,           # "mentor" | "mentee"
    riasec: list[float],
    bigfive: list[float],
    skills: list[str],
    career_path: list[str] | None = None,
    target_career: str | None = None,
):
    driver = await get_driver()
    if driver is None:
        return

    async with driver.session() as session:
        # Upsert User node
        await session.run(
            """
            MERGE (u:User {user_id: $uid})
            SET u.role   = $role,
                u.riasec  = $riasec,
                u.bigfive = $bigfive,
                u.skills  = $skills
            """,
            uid=user_id, role=role,
            riasec=riasec, bigfive=bigfive, skills=skills,
        )

        # Tạo HAS_SKILL relationships
        for skill in skills:
            await session.run(
                """
                MERGE (s:Skill {name: $skill})
                WITH s
                MATCH (u:User {user_id: $uid})
                MERGE (u)-[:HAS_SKILL]->(s)
                """,
                skill=skill, uid=user_id,
            )

        # Mentor: WORKED_AS career nodes
        if role == "mentor" and career_path:
            for career in career_path:
                await session.run(
                    """
                    MERGE (c:CareerNode {title: $career})
                    WITH c
                    MATCH (u:User {user_id: $uid})
                    MERGE (u)-[:WORKED_AS]->(c)
                    """,
                    career=career, uid=user_id,
                )

        # Mentee: TARGETS career node
        if role == "mentee" and target_career:
            await session.run(
                """
                MERGE (c:CareerNode {title: $career})
                WITH c
                MATCH (u:User {user_id: $uid})
                MERGE (u)-[:TARGETS]->(c)
                """,
                career=target_career, uid=user_id,
            )
```

---

## 5. Pydantic Schemas

File: `app/modules/mentor/schemas.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MentorProfileCreate(BaseModel):
    bio: Optional[str]
    expertise: list[str]
    career_path: list[str]
    years_exp: int = 0
    availability: Optional[dict] = {}

class MentorProfileOut(BaseModel):
    id: int
    user_id: int
    bio: Optional[str]
    expertise: list[str]
    career_path: list[str]
    years_exp: int
    availability: Optional[dict]
    is_active: bool
    rating: float
    total_mentees: int
    # Thêm từ join users
    user_email: Optional[str]
    user_name: Optional[str]

    class Config:
        from_attributes = True

class MentorMatchResult(BaseModel):
    user_id: int
    compatibility_score: float
    personality_score: float
    skill_score: float
    profile: Optional[MentorProfileOut]

class MentorRequestCreate(BaseModel):
    mentor_id: int
    message: Optional[str]

class MentorRequestOut(BaseModel):
    id: int
    mentee_id: int
    mentor_id: int
    status: str
    message: Optional[str]
    score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    request_id: int
    scheduled_at: datetime
    duration_min: int = 60
    notes: Optional[str]
```

---

## 6. FastAPI Router

File: `app/modules/mentor/router.py`

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth import get_current_user
from . import service, schemas

router = APIRouter()

# ── Mentor: Đăng ký hồ sơ ─────────────────────────────────────────
@router.post("/profile", response_model=schemas.MentorProfileOut)
async def create_mentor_profile(
    data: schemas.MentorProfileCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return await service.create_or_update_mentor_profile(
        db, current_user.id, data
    )

@router.get("/profile/me", response_model=schemas.MentorProfileOut)
async def get_my_mentor_profile(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    profile = await service.get_mentor_profile(db, current_user.id)
    if not profile:
        raise HTTPException(404, "Mentor profile not found")
    return profile

# ── Mentee: Tìm mentor phù hợp (Background task) ─────────────────
@router.get("/match", response_model=list[schemas.MentorMatchResult])
async def get_mentor_matches(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Trả về Top 10 mentor phù hợp nhất dựa trên:
    - RIASEC + Big Five cosine similarity
    - Career path graph traversal
    - Skill gap coverage
    """
    results = await service.get_matches_for_mentee(db, current_user.id)
    return results

# ── Mentee: Gửi yêu cầu kết nối ──────────────────────────────────
@router.post("/request", response_model=schemas.MentorRequestOut)
async def send_mentor_request(
    data: schemas.MentorRequestCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return await service.send_request(db, current_user.id, data)

# ── Mentor: Xem yêu cầu nhận được ────────────────────────────────
@router.get("/requests/incoming", response_model=list[schemas.MentorRequestOut])
async def get_incoming_requests(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return await service.get_incoming_requests(db, current_user.id)

# ── Mentor: Chấp nhận / Từ chối ──────────────────────────────────
@router.patch("/request/{request_id}/status")
async def update_request_status(
    request_id: int,
    status: str,  # "accepted" | "rejected"
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if status not in ("accepted", "rejected"):
        raise HTTPException(400, "Invalid status")
    return await service.update_request_status(
        db, request_id, current_user.id, status
    )

# ── Đặt lịch họp ─────────────────────────────────────────────────
@router.post("/session", response_model=dict)
async def book_session(
    data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return await service.book_session(db, current_user.id, data)

# ── Sync user vào Neo4j (gọi từ assessment module sau khi xong) ──
@router.post("/sync-neo4j", include_in_schema=False)
async def sync_neo4j(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    background_tasks.add_task(
        service.sync_current_user_to_neo4j, db, current_user.id
    )
    return {"status": "syncing"}
```

---

## 7. Đăng ký Router vào main.py

```python
# Thêm vào app/main.py cùng pattern với các module khác:
from app.modules.mentor.router import router as mentor_router

# Trong hàm create_app():
app.include_router(mentor_router, prefix="/api/mentor", tags=["mentor"])
```

---

## 8. Frontend — Service

File: `apps/frontend/src/services/mentorService.ts`

```typescript
import api from "../lib/api";

export interface MentorMatchResult {
  user_id: number;
  compatibility_score: number;
  personality_score: number;
  skill_score: number;
  profile: {
    id: number;
    user_id: number;
    bio?: string;
    expertise: string[];
    career_path: string[];
    years_exp: number;
    user_name?: string;
    user_email?: string;
    rating: number;
    total_mentees: number;
  } | null;
}

export interface MentorProfileCreate {
  bio?: string;
  expertise: string[];
  career_path: string[];
  years_exp: number;
  availability?: Record<string, string[]>;
}

export interface MentorRequestCreate {
  mentor_id: number;
  message?: string;
}

const mentorService = {
  // Mentee: lấy danh sách mentor phù hợp
  getMatches: async (): Promise<MentorMatchResult[]> => {
    const res = await api.get("/api/mentor/match");
    return res.data;
  },

  // Mentee: gửi yêu cầu kết nối
  sendRequest: async (data: MentorRequestCreate) => {
    const res = await api.post("/api/mentor/request", data);
    return res.data;
  },

  // Mentor: tạo / cập nhật hồ sơ
  createProfile: async (data: MentorProfileCreate) => {
    const res = await api.post("/api/mentor/profile", data);
    return res.data;
  },

  getMyProfile: async () => {
    const res = await api.get("/api/mentor/profile/me");
    return res.data;
  },

  // Mentor: xem yêu cầu nhận được
  getIncomingRequests: async () => {
    const res = await api.get("/api/mentor/requests/incoming");
    return res.data;
  },

  // Mentor: chấp nhận / từ chối
  updateRequestStatus: async (requestId: number, status: "accepted" | "rejected") => {
    const res = await api.patch(`/api/mentor/request/${requestId}/status`, null, {
      params: { status },
    });
    return res.data;
  },

  // Đặt lịch
  bookSession: async (data: { request_id: number; scheduled_at: string; duration_min: number; notes?: string }) => {
    const res = await api.post("/api/mentor/session", data);
    return res.data;
  },
};

export default mentorService;
```

---

## 9. Frontend — Pages

### MentorPage.tsx (Mentee tìm mentor)

```tsx
import { useEffect, useState } from "react";
import mentorService, { MentorMatchResult } from "../services/mentorService";

const MentorPage = () => {
  const [mentors, setMentors] = useState<MentorMatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mentorService.getMatches()
      .then(setMentors)
      .finally(() => setLoading(false));
  }, []);

  const sendRequest = async (mentorUserId: number) => {
    await mentorService.sendRequest({ mentor_id: mentorUserId, message: "Xin chào, tôi muốn kết nối!" });
    alert("Yêu cầu đã được gửi!");
  };

  return (
    <div className="p-6 bg-[#F8F9FA] dark:bg-gray-900 min-h-screen space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Mentor phù hợp với bạn
      </h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((m) => (
            <div
              key={m.user_id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 font-bold">
                  {m.profile?.user_name?.[0]?.toUpperCase() ?? "M"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {m.profile?.user_name ?? `User #${m.user_id}`}
                  </p>
                  <p className="text-xs text-gray-500">{m.profile?.years_exp} năm kinh nghiệm</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Độ phù hợp</span>
                  <span className="font-semibold text-green-600">
                    {(m.compatibility_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${m.compatibility_score * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {m.profile?.expertise.slice(0, 3).map((e) => (
                  <span key={e} className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                    {e}
                  </span>
                ))}
              </div>

              <button
                onClick={() => sendRequest(m.user_id)}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Gửi yêu cầu kết nối
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentorPage;
```

---

## 10. Migration SQL (chạy 1 lần)

File: `apps/backend/app/scripts/migrate_mentor.sql`

```sql
CREATE TABLE IF NOT EXISTS core.mentor_profiles (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER UNIQUE NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    bio           TEXT,
    expertise     TEXT[] DEFAULT '{}',
    career_path   TEXT[] DEFAULT '{}',
    years_exp     INTEGER DEFAULT 0,
    availability  JSONB DEFAULT '{}',
    is_active     BOOLEAN DEFAULT TRUE,
    rating        FLOAT DEFAULT 0.0,
    total_mentees INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.mentor_requests (
    id          SERIAL PRIMARY KEY,
    mentee_id   INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    mentor_id   INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    status      VARCHAR(20) DEFAULT 'pending',
    message     TEXT,
    score       FLOAT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentee_id, mentor_id)
);

CREATE TABLE IF NOT EXISTS core.mentor_sessions (
    id           SERIAL PRIMARY KEY,
    request_id   INTEGER NOT NULL REFERENCES core.mentor_requests(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_min INTEGER DEFAULT 60,
    notes        TEXT,
    status       VARCHAR(20) DEFAULT 'scheduled',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentee ON core.mentor_requests(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor ON core.mentor_requests(mentor_id);
```

---

## 11. Luồng hoàn chỉnh

```
[User hoàn thành Assessment]
        ↓
POST /api/mentor/sync-neo4j  (background task)
  → sync RIASEC, BigFive, Skills vào Neo4j node
        ↓
[Mentee vào trang /mentor]
        ↓
GET /api/mentor/match
  → service.get_matches_for_mentee()
  → Đọc scores từ PostgreSQL (user profile)
  → Query Neo4j: tìm mentor WORKED_AS target_career
  → Tính cosine_similarity(riasec), cosine_similarity(bigfive)
  → Tính skill_coverage(missing_skills ∩ mentor_skills)
  → Final = 0.7 * personality + 0.3 * skill_coverage
  → Sort, top 10
  → Join PostgreSQL lấy mentor_profiles
  → Trả về MentorMatchResult[]
        ↓
[Mentee bấm "Gửi yêu cầu"]
        ↓
POST /api/mentor/request
  → Tạo MentorRequest (status=pending)
  → Gửi notification cho Mentor
        ↓
[Mentor vào dashboard]
        ↓
GET /api/mentor/requests/incoming
PATCH /api/mentor/request/{id}/status → "accepted"
  → Neo4j: MERGE (:Mentee)-[:CONNECTED_TO]->(:Mentor)
        ↓
[Đặt lịch]
POST /api/mentor/session
```

---

## 12. Caching (tối ưu performance)

Neo4j query nặng → cache kết quả 30 phút:

```python
import hashlib, json
from app.core.cache import redis_client  # nếu đã có Redis

async def get_matches_for_mentee(db, user_id: int):
    cache_key = f"mentor_match:{user_id}"

    # Check cache
    if redis_client:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

    # Compute
    results = await _compute_matches(db, user_id)

    # Store cache 30 phút
    if redis_client:
        await redis_client.setex(cache_key, 1800, json.dumps(results))

    return results
```

Invalidate cache khi:
- User cập nhật profile
- User hoàn thành assessment mới
- User cập nhật career target

---

## 13. .env cần thêm

```env
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=your_password
```

---

## 14. Thứ tự code

1. Tạo `models.py` → chạy `migrate_mentor.sql`
2. Tạo `schemas.py`
3. Tạo `service.py` (Neo4j sync + cosine matching)
4. Tạo `router.py`
5. Đăng ký vào `main.py`
6. Tạo `mentorService.ts`
7. Tạo `MentorPage.tsx` + `MentorDashboardPage.tsx`
8. Thêm route vào `App.tsx` / router config frontend

---

## 15. Course Recommendation (Neo4j + Embedding — Cap 2)

### Neo4j Schema cho Course

```cypher
// Nodes
(:Course {id, title, url, description, platform, embedding: float[]})
(:Skill  {name})

// Relationships
(:Course)-[:TEACHES {score: float}]->(:Skill)
(:User)  -[:NEEDS]  ->(:Skill)     // từ skill gap
```

### Pipeline

```python
# Step 1: Embed courses (chạy 1 lần, lưu vào Neo4j)
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")

for course in courses:
    emb = model.encode(course["description"]).tolist()
    # MERGE (:Course {id: course.id}) SET c.embedding = emb

# Step 2: Match course → skill
for skill in skills:
    skill_emb = model.encode(skill["name"]).tolist()
    # Tính cosine với tất cả course embeddings
    # Nếu score > 0.6: MERGE (:Course)-[:TEACHES {score}]->(:Skill)

# Step 3: Query cho user
# MATCH (u:User {user_id: $uid})-[:NEEDS]->(s:Skill)
# MATCH (c:Course)-[t:TEACHES]->(s)
# RETURN c, sum(t.score) AS total ORDER BY total DESC LIMIT 10
```

Kết nối với PB19: Sau khi ghép Mentor–Mentee, lấy `missing_skills` của Mentee →  
truy vấn Neo4j tìm `Course TEACHES Skill` → gợi ý khóa học ngay trên trang Mentor.
