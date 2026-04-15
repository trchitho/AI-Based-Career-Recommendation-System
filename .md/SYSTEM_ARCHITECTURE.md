# 🏗️ System Architecture - Skill Gap Analysis

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│                           ↓                                 │
│                    Navigation Menu                          │
│         Dashboard → Assessment → Skill Gap → Blog           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│  SkillGapPage.tsx                                          │
│    ├── CVUploadForm.tsx      (Upload CV)                   │
│    ├── SkillGapResult.tsx    (Display results)             │
│    └── SkillHeatmap.tsx      (Visualization)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         HTTP/REST API
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│  routes.py                                                  │
│    ├── POST /api/skill-gap/analyze                         │
│    ├── GET  /api/skill-gap/my-analyses                     │
│    ├── GET  /api/skill-gap/analysis/{id}                   │
│    ├── GET  /api/skill-gap/heatmap/{id}                    │
│    └── GET  /api/skill-gap/interview-prep/{id}             │
│                                                             │
│  service.py (Business Logic)                               │
│    ├── analyze_cv()                                         │
│    ├── get_user_analyses()                                 │
│    ├── get_analysis_by_id()                                │
│    └── generate_heatmap_data()                             │
│                                                             │
│  cv_parser.py (Skill Extraction)                           │
│    └── extract_skills() → List[Skill]                      │
│                                                             │
│  graph_analyzer.py (Gap Analysis)                          │
│    └── analyze_skill_gap() → GapResult                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   PostgreSQL Database    │  │   Neo4j (Optional)       │
│   Port: 5433             │  │   Graph Database         │
│                          │  │                          │
│   core.skill_gap_analyses│  │   Job → Skill → Weight   │
│   ├── id                 │  │   Relationships          │
│   ├── user_id            │  │                          │
│   ├── career_id          │  │   (Graceful fallback     │
│   ├── cv_skills          │  │    if not available)     │
│   ├── matched_skills     │  │                          │
│   ├── skill_gaps         │  │                          │
│   └── match_percentage   │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

---

## Data Flow

### 1. Upload & Analysis Flow

```
User uploads CV (PDF)
        ↓
CVUploadForm.tsx
        ↓
POST /api/skill-gap/analyze
        ↓
SkillGapService.analyze_cv()
        ↓
    ┌───┴───┐
    ↓       ↓
CVParser  GraphAnalyzer
    ↓       ↓
Extract   Compare with
Skills    Job Requirements
    ↓       ↓
    └───┬───┘
        ↓
Calculate Match %
Categorize Gaps
        ↓
Save to Database
        ↓
Return Analysis ID
        ↓
Navigate to Results
```

### 2. View Results Flow

```
User clicks analysis
        ↓
GET /api/skill-gap/analysis/{id}
        ↓
Fetch from Database
        ↓
SkillGapResult.tsx
        ↓
Display:
  - Match percentage
  - Matched skills
  - Skill gaps (Critical/Important/Nice-to-have)
  - Learning path
```

### 3. Heatmap Flow

```
Results page loads
        ↓
GET /api/skill-gap/heatmap/{id}
        ↓
Generate nodes & links
        ↓
SkillHeatmap.tsx
        ↓
Render SVG network diagram
  - Green nodes: Matched
  - Red nodes: Critical gaps
  - Orange nodes: Important gaps
  - Yellow nodes: Nice-to-have
```

---

## Component Hierarchy

```
App.tsx
  └── MainLayout.tsx
        ├── Navigation Menu
        │     └── "Skill Gap" link
        │
        └── SkillGapPage.tsx
              ├── CVUploadForm.tsx
              │     ├── File input (drag & drop)
              │     ├── Career selector
              │     └── Analyze button
              │
              └── (After analysis)
                    ├── SkillGapResult.tsx
                    │     ├── Match score card
                    │     ├── Statistics cards
                    │     ├── Matched skills badges
                    │     ├── Skill gaps badges
                    │     └── Learning path
                    │
                    └── SkillHeatmap.tsx
                          └── SVG network diagram
```

---

## Database Schema

```sql
CREATE TABLE core.skill_gap_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES core.users(id),
    career_id VARCHAR(100),
    
    -- CV data
    cv_filename VARCHAR(255),
    cv_text_preview TEXT,
    
    -- Analysis results (JSON)
    cv_skills JSONB,           -- Skills found in CV
    job_skills JSONB,          -- Required skills
    matched_skills JSONB,      -- Intersection
    skill_gaps JSONB,          -- Missing skills by category
    extra_skills JSONB,        -- Bonus skills
    
    -- Metrics
    match_percentage FLOAT,
    total_required_skills INTEGER,
    matched_skills_count INTEGER,
    missing_skills_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_skill_gap_user ON core.skill_gap_analyses(user_id);
CREATE INDEX idx_skill_gap_career ON core.skill_gap_analyses(career_id);
CREATE INDEX idx_skill_gap_created ON core.skill_gap_analyses(created_at DESC);
```

---

## API Request/Response Examples

### 1. Analyze CV

**Request**:
```http
POST /api/skill-gap/analyze
Content-Type: multipart/form-data

career_id: "software-engineer"
cv_file: [PDF file]
```

**Response**:
```json
{
  "success": true,
  "message": "CV analyzed successfully",
  "data": {
    "id": 123,
    "user_id": 456,
    "career_id": "software-engineer",
    "match_percentage": 75.5,
    "matched_skills": [
      {"name": "Python", "category": "Programming"},
      {"name": "React", "category": "Web"}
    ],
    "skill_gaps": {
      "critical": [
        {"name": "Docker", "category": "DevOps", "importance": 90}
      ],
      "important": [
        {"name": "AWS", "category": "Cloud", "importance": 70}
      ],
      "nice_to_have": [
        {"name": "GraphQL", "category": "Web", "importance": 40}
      ]
    }
  }
}
```

### 2. Get Heatmap Data

**Request**:
```http
GET /api/skill-gap/heatmap/123
```

**Response**:
```json
{
  "nodes": [
    {
      "id": "python",
      "name": "Python",
      "category": "Programming",
      "status": "matched",
      "color": "#10b981"
    },
    {
      "id": "docker",
      "name": "Docker",
      "category": "DevOps",
      "status": "critical_gap",
      "color": "#ef4444"
    }
  ],
  "links": [
    {
      "source": "software-engineer",
      "target": "python",
      "importance": 85
    }
  ]
}
```

---

## Technology Stack

### Frontend
- **Framework**: React 18.3.1
- **Router**: React Router 6.30.3
- **Language**: TypeScript
- **HTTP Client**: Fetch API
- **Styling**: CSS Modules
- **Visualization**: SVG + D3-like layout

### Backend
- **Framework**: FastAPI 0.124.4
- **Language**: Python 3.11.9
- **ORM**: SQLAlchemy 2.0.23
- **Validation**: Pydantic
- **PDF Parser**: PyPDF2 3.0.1
- **File Upload**: python-multipart 0.0.22

### Database
- **Primary**: PostgreSQL 14+
- **Port**: 5433
- **Schema**: core
- **Optional**: Neo4j (graph database)

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React)                       │
│  ├── Auth Token in localStorage         │
│  └── Include in Authorization header    │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  API Gateway (FastAPI)                  │
│  ├── CORS Middleware                    │
│  ├── Auth Middleware                    │
│  └── get_current_user() dependency      │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Protected Routes                       │
│  ├── Verify JWT token                   │
│  ├── Extract user_id                    │
│  └── Filter by user_id                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Database                               │
│  ├── Row-level security                 │
│  └── Foreign key constraints            │
└─────────────────────────────────────────┘
```

---

## Deployment Architecture

### Development
```
localhost:3000 (Frontend)
      ↓
localhost:8000 (Backend API)
      ↓
localhost:5433 (PostgreSQL)
```

### Production (Example)
```
https://app.example.com (Frontend - Vercel/Netlify)
      ↓
https://api.example.com (Backend - AWS/GCP/Azure)
      ↓
RDS/Cloud SQL (PostgreSQL)
```

---

## Performance Optimization

### Backend
- Database indexes on user_id, career_id, created_at
- JSON columns for flexible skill storage
- Connection pooling (SQLAlchemy)
- Async file processing

### Frontend
- Lazy loading components
- Memoized calculations
- Debounced search
- Optimized SVG rendering

---

## Monitoring & Logging

### Backend Logs
```python
# In service.py
logger.info(f"Analyzing CV for user {user_id}")
logger.info(f"Extracted {len(skills)} skills")
logger.info(f"Match percentage: {match_percentage}%")
```

### Frontend Logs
```typescript
// In SkillGapPage.tsx
console.log('Analysis complete:', analysis);
console.log('Heatmap data loaded:', heatmapData);
```

---

## Error Handling

```
User Action
    ↓
Try Operation
    ↓
    ├─ Success → Show results
    │
    └─ Error
        ↓
        ├─ Network Error → "Connection failed"
        ├─ Auth Error → Redirect to login
        ├─ Validation Error → Show field errors
        ├─ Server Error → "Something went wrong"
        └─ Not Found → "Analysis not found"
```

---

## Testing Strategy

### Unit Tests
- CV Parser: Extract skills correctly
- Graph Analyzer: Calculate gaps accurately
- Service: Business logic validation

### Integration Tests
- API endpoints: Request/response validation
- Database: CRUD operations
- Authentication: Token validation

### E2E Tests
- Upload CV → View results
- Navigate between pages
- Error scenarios

---

## Future Enhancements

### Phase 5: Advanced Features
```
Current System
    ↓
    ├─ DOCX support
    ├─ Multi-language CVs
    ├─ PDF export
    ├─ Email notifications
    └─ Learning platform integration
```

### Phase 6: AI Integration
```
Skill Gap Data
    ↓
AI Interview System
    ↓
    ├─ Generate questions
    ├─ Adaptive difficulty
    ├─ Real-time feedback
    └─ Progress tracking
```

---

**Architecture Status**: ✅ Production Ready
**Last Updated**: Context Transfer Complete
