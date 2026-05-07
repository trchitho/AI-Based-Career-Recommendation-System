# Báo Cáo Chi Tiết: Hệ Thống Mentor-Mentee Matching

**Dự án:** AI-Based Career Recommendation System  
**Phiên bản:** 1.2  
**Ngày cập nhật:** 26/01/2026  
**Tác giả:** Team C1SE.29

---

## 📋 Tổng Quan Hệ Thống

Hệ thống Mentor-Mentee Matching là một module quan trọng trong AI-Based Career Recommendation System, cho phép kết nối người tìm việc (mentee) với các chuyên gia có kinh nghiệm (mentor) thông qua thuật toán AI matching thông minh.

### 🎯 Mục Tiêu Chính
- Kết nối mentee với mentor phù hợp dựa trên skills, career goals và personality
- Cung cấp hệ thống chat real-time cho mentor-mentee
- Quản lý yêu cầu mentorship và phản hồi
- Tự động tạo profile từ dữ liệu assessment và CV

---

## 🏗️ Kiến Trúc Hệ Thống

### Backend Architecture (FastAPI)
```
apps/backend/app/modules/mentor_matching/
├── models.py              # Database models
├── schemas.py             # Pydantic schemas
├── routes.py              # API endpoints
├── service.py             # Business logic
└── matching_algorithm.py  # AI matching algorithm
```

### Frontend Architecture (Next.js)
```
apps/frontend/src/services/
└── mentorMatchingService.ts  # API client service
```

### Database Schema
- **PostgreSQL**: Lưu trữ profiles, requests, messages
- **Neo4j**: Graph relationships (tương lai)
- **pgvector**: Vector embeddings cho semantic matching

---

## 📊 Database Models

### 1. MentorProfile Table
```sql
CREATE TABLE core.mentor_profiles (
    id INTEGER PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    current_position VARCHAR(200),
    company VARCHAR(200),
    bio TEXT,
    expertise_areas VARCHAR[],           -- Array of skills
    experience_years INTEGER,
    available_hours_per_week INTEGER,
    preferred_communication VARCHAR[],   -- ["video", "chat"]
    max_mentees INTEGER DEFAULT 5,
    current_mentees_count INTEGER DEFAULT 0,
    riasec_scores JSONB,                -- Personality scores
    big_five_scores JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2. MenteeProfile Table
```sql
CREATE TABLE core.mentee_profiles (
    id INTEGER PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    target_career VARCHAR(300),
    current_skills VARCHAR[],
    desired_skills VARCHAR[],
    learning_style VARCHAR(50),          -- "structured"/"flexible"/"project-based"
    preferred_mentor_experience VARCHAR(20), -- "junior"/"senior"/"executive"
    riasec_scores JSONB,
    big_five_scores JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 3. MentorshipRequest Table
```sql
CREATE TABLE core.mentorship_requests (
    id INTEGER PRIMARY KEY,
    mentee_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    compatibility_score DOUBLE PRECISION,
    matching_reasons JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- "pending"/"accepted"/"rejected"
    message TEXT,
    response_message TEXT,
    requested_at TIMESTAMP,
    responded_at TIMESTAMP
);
```

### 4. ChatMessage Table
```sql
CREATE TABLE core.chat_messages (
    id BIGINT PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,        -- Format: "{user1_id}_{user2_id}"
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🤖 AI Matching Algorithm

### Core Algorithm (`matching_algorithm.py`)

#### 1. Skill Matching
```python
def calculate_skill_match(desired_skills: List[str], mentor_expertise: List[str]) -> Tuple[float, List[str]]:
    """
    Tính toán độ phù hợp về skills
    - Sử dụng substring matching (case-insensitive)
    - Trả về: (match_ratio 0-1, danh sách skills trùng khớp)
    """
```

**Ví dụ:**
- Mentee desired_skills: ["Python", "Machine Learning", "Data Analysis"]
- Mentor expertise: ["Python Programming", "ML Engineering", "Statistics"]
- Kết quả: 66.7% match (2/3 skills)

#### 2. Career Matching
```python
def calculate_career_match(mentee_target_career: str, mentor_position: str, mentor_expertise: List[str]) -> float:
    """
    Tính toán độ phù hợp về career path
    - So sánh target career với current position của mentor
    - Tìm keywords chung trong expertise areas
    """
```

#### 3. Personality Similarity
```python
def calculate_personality_similarity(mentee_riasec: Dict, mentee_big5: Dict, mentor_riasec: Dict, mentor_big5: Dict) -> float:
    """
    Tính toán độ tương đồng personality
    - Sử dụng Cosine Similarity trên vector RIASEC + Big Five
    - Trả về 0.5 (neutral) nếu thiếu dữ liệu personality
    """
```

#### 4. Overall Compatibility Score
```python
def calculate_overall_compatibility(skill_match: float, career_match: float, personality_sim: float, has_personality_data: bool) -> float:
    """
    Tính điểm tổng thể với trọng số:
    - Skill match: 50% (hoặc 60% nếu không có personality data)
    - Career match: 30% (hoặc 40% nếu không có personality data)  
    - Personality: 20% (bỏ qua nếu không có data)
    """
```

### Matching Reasons Generation
Hệ thống tự động tạo lý do matching dựa trên:
- Số lượng skills trùng khớp
- Mức độ phù hợp về career
- Kinh nghiệm của mentor
- Độ tương đồng personality (nếu có)

---

## 🔌 API Endpoints

### Mentor Endpoints

#### 1. Tạo/Cập nhật Mentor Profile
```http
POST /api/mentor-matching/mentor/profile
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "full_name": "Nguyễn Văn A",
  "current_position": "Senior Software Engineer",
  "company": "Tech Corp",
  "bio": "5+ years experience in Python, ML",
  "expertise_areas": ["Python", "Machine Learning", "Data Science"],
  "experience_years": 5,
  "available_hours_per_week": 3,
  "preferred_communication": ["video", "chat"],
  "max_mentees": 3
}
```

#### 2. Lấy Mentor Profile
```http
GET /api/mentor-matching/mentor/profile
Authorization: Bearer {jwt_token}
```

#### 3. Xem Yêu Cầu Mentorship
```http
GET /api/mentor-matching/mentor/requests
Authorization: Bearer {jwt_token}
```

#### 4. Phản Hồi Yêu Cầu
```http
POST /api/mentor-matching/mentor/respond
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "request_id": 123,
  "action": "accepted",  // "accepted" hoặc "rejected"
  "response_message": "Tôi sẵn sàng hỗ trợ bạn!"
}
```

### Mentee Endpoints

#### 1. Tạo/Cập nhật Mentee Profile
```http
POST /api/mentor-matching/mentee/profile
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "full_name": "Trần Thị B",
  "target_career": "Data Scientist",
  "current_skills": ["Python", "SQL"],
  "desired_skills": ["Machine Learning", "Deep Learning", "Statistics"],
  "learning_style": "project-based",
  "preferred_mentor_experience": "senior"
}
```

#### 2. Tìm Mentor Phù Hợp
```http
GET /api/mentor-matching/mentee/find-mentors
Authorization: Bearer {jwt_token}
```

**Response:**
```json
[
  {
    "mentor_id": 1,
    "user_id": 10,
    "mentor_name": "Nguyễn Văn A",
    "current_position": "Senior Data Scientist",
    "company": "AI Corp",
    "bio": "Chuyên gia ML với 7 năm kinh nghiệm",
    "expertise_areas": ["Machine Learning", "Python", "Statistics"],
    "experience_years": 7,
    "available_hours_per_week": 3,
    "preferred_communication": ["video", "chat"],
    "compatibility_score": 85.5,
    "skill_match_score": 90.0,
    "career_match_score": 95.0,
    "personality_score": 72.3,
    "matching_skills": ["Machine Learning", "Python"],
    "matching_reasons": [
      "Có 2/3 skills bạn mong muốn",
      "Kinh nghiệm 7+ năm trong lĩnh vực Data Science",
      "Personality tương đồng 72%"
    ],
    "current_mentees_count": 1,
    "max_mentees": 3
  }
]
```

#### 3. Gửi Yêu Cầu Mentorship
```http
POST /api/mentor-matching/mentee/send-request
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "mentor_id": 1,
  "message": "Xin chào anh/chị, em muốn học ML từ anh/chị!"
}
```

---

## 💬 Hệ Thống Chat Real-time

### WebSocket Connection
```javascript
// Frontend connection
const ws = new WebSocket(`ws://localhost:8000/ws/chat/${roomId}?token=${jwt_token}`);
```

### Room ID Format
```python
def make_room_id(uid1: int, uid2: int) -> str:
    a, b = sorted([uid1, uid2])
    return f"{a}_{b}"
```

### Chat API
```http
POST /api/chat/{other_user_id}/send
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "content": "Xin chào! Tôi là mentee mới của bạn."
}
```

### WebSocket Events
```json
// Kết nối thành công
{"type": "connected", "room_id": "123_456"}

// Tin nhắn mới
{
  "type": "message",
  "id": 789,
  "sender_id": 123,
  "content": "Hello!",
  "created_at": "2026-01-26T10:30:00Z"
}

// Ping/Pong heartbeat
{"type": "ping"}
{"type": "pong"}
```

---

## 🔄 Business Logic Flow

### 1. Mentee Workflow
```mermaid
graph TD
    A[Đăng ký tài khoản] --> B[Làm Assessment RIASEC + Big Five]
    B --> C[Upload CV]
    C --> D[Tạo Mentee Profile]
    D --> E[Tìm kiếm Mentor]
    E --> F[Xem danh sách Mentor phù hợp]
    F --> G[Gửi yêu cầu Mentorship]
    G --> H[Chờ phản hồi từ Mentor]
    H --> I{Mentor chấp nhận?}
    I -->|Có| J[Bắt đầu chat với Mentor]
    I -->|Không| K[Tìm Mentor khác]
```

### 2. Mentor Workflow
```mermaid
graph TD
    A[Đăng ký tài khoản] --> B[Làm Assessment]
    B --> C[Tạo Mentor Profile]
    C --> D[Chờ yêu cầu từ Mentee]
    D --> E[Nhận thông báo yêu cầu mới]
    E --> F[Xem thông tin Mentee]
    F --> G{Chấp nhận yêu cầu?}
    G -->|Có| H[Gửi phản hồi chấp nhận]
    G -->|Không| I[Từ chối với lý do]
    H --> J[Bắt đầu chat với Mentee]
```

### 3. Auto Profile Creation
Hệ thống có thể tự động tạo profile từ dữ liệu có sẵn:

#### Auto Mentor Profile
```python
@router.post("/mentor/create-from-profile")
def create_mentor_from_profile(current_user: User, db: Session):
    """
    Tự động tạo Mentor Profile từ:
    - Assessment results (RIASEC + Big Five)
    - CV analysis (skills extraction)
    - User profile data
    """
```

#### Auto Mentee Profile  
```python
@router.post("/mentee/create-from-profile")
def create_mentee_from_profile(current_user: User, db: Session):
    """
    Tự động tạo Mentee Profile từ:
    - Career recommendations từ assessment
    - Skill gap analysis từ CV
    - Personality scores
    """
```

---

## 🎯 Matching Algorithm Details

### Threshold và Filtering
```python
MATCH_THRESHOLD = 0.10  # Điểm tối thiểu để hiển thị trong kết quả (10%)
```

### Active Mentor Filtering
```python
def get_active_mentors(self) -> List[MentorProfile]:
    return (
        self.db.query(MentorProfile)
        .filter(
            MentorProfile.is_active == True,
            MentorProfile.current_mentees_count < MentorProfile.max_mentees,
        )
        .all()
    )
```

### Skill Extraction từ CV/Assessment
```python
def _extract_skill_names(skills_json) -> List[str]:
    """
    Chuẩn hóa skills từ JSON thành list strings
    Hỗ trợ nhiều format:
    - List of strings: ["Python", "ML"]
    - List of objects: [{"name": "Python"}, {"skill": "ML"}]
    - Categorized: {"critical": [...], "important": [...]}
    """
```

### Career Title Extraction
```python
def _extract_career_title(career_recommendations) -> str:
    """
    Lấy career title từ assessment results
    Ưu tiên: title_en > title_vi > career_title > title
    """
```

---

## 📱 Frontend Integration

### Service Class (TypeScript)
```typescript
class MentorMatchingService {
  private base = '/api/mentor-matching';

  // Mentee methods
  async getMenteeProfile(): Promise<MenteeProfile>
  async createOrUpdateMenteeProfile(data: MenteeProfileCreate)
  async findMentors(): Promise<MentorMatch[]>
  async sendMentorshipRequest(mentorId: number, message: string)
  async getMenteeRequests(): Promise<MentorshipRequest[]>

  // Mentor methods  
  async getMentorProfile(): Promise<MentorProfile>
  async createOrUpdateMentorProfile(data: MentorProfileCreate)
  async getMentorRequests(): Promise<MentorshipRequest[]>
  async respondToRequest(requestId: number, action: 'accepted' | 'rejected', responseMessage?: string)

  // Auto-creation methods
  async createMentorFromProfile()
  async createMenteeFromProfile()
}
```

### TypeScript Interfaces
```typescript
interface MentorMatch {
  mentor_id: number;
  mentor_name: string;
  current_position: string;
  company: string;
  bio: string;
  expertise_areas: string[];
  experience_years: number;
  compatibility_score: number;      // 0-100
  skill_match_score: number;        // 0-100
  career_match_score: number;       // 0-100
  personality_score: number;        // 0-100
  matching_skills: string[];
  matching_reasons: string[];
}

interface MentorshipRequest {
  id: number;
  mentee_id: number;
  mentor_id: number;
  compatibility_score: number;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  response_message?: string;
  requested_at: string;
  responded_at?: string;
}
```

---

## 🔔 Real-time Notifications

### WebSocket Notification Manager
```python
class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket)
    def disconnect(self, user_id: int, websocket: WebSocket)
    async def send(self, user_id: int, message: dict)
```

### Notification Events
- **Yêu cầu mentorship mới**: Thông báo cho mentor
- **Phản hồi yêu cầu**: Thông báo cho mentee
- **Tin nhắn chat mới**: Real-time message delivery
- **Profile updates**: Thông báo thay đổi profile

---

## 🛡️ Security & Validation

### Authentication
- JWT token authentication cho tất cả endpoints
- WebSocket authentication qua query parameter
- User authorization check trong mọi operation

### Data Validation
```python
# Pydantic schemas validation
class MentorProfileCreate(BaseModel):
    full_name: str
    current_position: str
    company: str
    expertise_areas: List[str]
    experience_years: int
    available_hours_per_week: int = 2
    preferred_communication: List[str] = ["video", "chat"]
    max_mentees: int = 5
```

### Database Constraints
- Foreign key constraints
- Unique constraints trên user_id
- NOT NULL constraints trên required fields
- Index optimization cho performance

---

## 📈 Performance Optimization

### Database Indexing
```sql
-- Indexes for fast queries
CREATE INDEX ix_mentor_profiles_id ON core.mentor_profiles (id);
CREATE INDEX ix_mentee_profiles_id ON core.mentee_profiles (id);
CREATE INDEX ix_mentorship_requests_id ON core.mentorship_requests (id);
CREATE INDEX ix_chat_messages_room_id ON core.chat_messages (room_id);
```

### Caching Strategy
- Profile data caching
- Matching results caching (short-term)
- Active mentors list caching

### Query Optimization
- Efficient filtering cho active mentors
- Batch processing cho matching algorithm
- Pagination cho large result sets

---

## 🧪 Testing Strategy

### Unit Tests
- Matching algorithm functions
- Service layer methods
- Data validation schemas

### Integration Tests
- API endpoint testing
- Database operations
- WebSocket connections

### Performance Tests
- Matching algorithm với large datasets
- Concurrent WebSocket connections
- Database query performance

---

## 🚀 Deployment & Monitoring

### Environment Configuration
```python
# Backend environment variables
DATABASE_URL=postgresql://user:pass@localhost/db
JWT_SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
```

### Health Checks
- Database connectivity
- WebSocket server status
- Matching algorithm performance metrics

### Logging & Monitoring
- Request/response logging
- Error tracking
- Performance metrics
- User activity analytics

---

## 🔮 Future Enhancements

### 1. Advanced AI Features
- **Semantic Matching**: Sử dụng embeddings cho skill matching chính xác hơn
- **Learning Path Recommendation**: Gợi ý learning path dựa trên mentor expertise
- **Success Prediction**: Dự đoán khả năng thành công của mentorship

### 2. Enhanced User Experience
- **Video Call Integration**: Tích hợp video call trực tiếp
- **Calendar Integration**: Đặt lịch meeting với mentor
- **Progress Tracking**: Theo dõi tiến độ học tập của mentee

### 3. Analytics & Insights
- **Matching Success Rate**: Phân tích tỷ lệ thành công của matching
- **User Behavior Analytics**: Hiểu hành vi người dùng
- **Recommendation Improvement**: Cải thiện thuật toán dựa trên feedback

### 4. Scalability Improvements
- **Microservices Architecture**: Tách riêng matching service
- **Message Queue**: Xử lý async cho matching operations
- **CDN Integration**: Tối ưu tốc độ load profile images

---

## 📋 Checklist Triển Khai

### Backend Setup
- [ ] Database schema creation
- [ ] Environment variables configuration
- [ ] JWT authentication setup
- [ ] WebSocket server configuration
- [ ] API endpoint testing

### Frontend Integration
- [ ] Service class implementation
- [ ] TypeScript interfaces definition
- [ ] WebSocket client setup
- [ ] UI components development
- [ ] Error handling implementation

### Testing & QA
- [ ] Unit test coverage
- [ ] Integration test suite
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing

### Production Deployment
- [ ] Database migration
- [ ] Environment configuration
- [ ] SSL certificate setup
- [ ] Monitoring & logging
- [ ] Backup strategy

---

## 📞 Liên Hệ & Hỗ Trợ

**Team Development:** C1SE.29  
**Technical Lead:** [Tên Lead Developer]  
**Email:** team@c1se29.com  
**Documentation:** [Link to detailed docs]

---

*Báo cáo này được tạo tự động từ phân tích source code và sẽ được cập nhật theo phiên bản mới của hệ thống.*