# Product Backlog - AI-Based Career Recommendation System

## 1. Product Backlog Specification

### Priority Convention
- **5 – Must have (Core)** - Tính năng cốt lõi, bắt buộc phải có
- **4 – Should have (Important)** - Tính năng quan trọng, nên có
- **3 – Nice to have (Optional/Enhancement)** - Tính năng bổ sung, tùy chọn

---

## 2. Product Backlog Table

### 2.1. User Features

| ID | Theme | As a/an | I want to | So that | Priority | Status |
|----|-------|---------|-----------|---------|----------|--------|
| PB01 | Account & Authentication | User | Đăng ký và đăng nhập bằng email với xác thực JWT | Tôi có thể truy cập hệ thống và kết quả đánh giá một cách an toàn | 5 | ✅ Implemented |
| PB02 | Session Management | User | Đăng xuất khỏi tài khoản một cách an toàn | Phiên làm việc được kết thúc đúng cách và dữ liệu được bảo vệ | 5 | ✅ Implemented |
| PB03 | Password Recovery | User | Khôi phục mật khẩu qua xác minh email | Tôi có thể lấy lại quyền truy cập nếu quên mật khẩu | 4 | ✅ Implemented |
| PB04 | Personality & Interest Tests | User | Làm bài test RIASEC và Big Five | Tôi có thể hiểu rõ sở thích và đặc điểm tính cách của mình | 5 | ✅ Implemented |
| PB05 | Essay Submission (NLP Input) | User | Gửi bài essay mô tả sở thích và mục tiêu | AI có thể phân tích văn bản để suy luận các đặc điểm tiềm ẩn | 5 | ✅ Implemented |
| PB06 | Career Recommendation | User | Nhận danh sách nghề nghiệp được xếp hạng phù hợp | Tôi có thể xác định các nghề nghiệp phù hợp với hồ sơ của mình | 5 | ✅ Implemented |
| PB07 | Skill Roadmap | User | Xem các kỹ năng cần thiết và lộ trình học tập cho một nghề | Tôi có thể lập kế hoạch phát triển cá nhân | 4 | ✅ Implemented |
| PB08 | Assessment History | User | Xem lịch sử kết quả test và recommendations | Tôi có thể theo dõi tiến trình theo thời gian | 4 | ✅ Implemented |
| PB09 | Recommendation Feedback | User | Đánh giá các career recommendations | Hệ thống có thể cải thiện độ chính xác cá nhân hóa | 4 | ⚠️ STUB (logging only) |
| PB10 | PDF Export | User | Xuất kết quả dưới dạng báo cáo PDF | Tôi có thể lưu hoặc chia sẻ hồ sơ nghề nghiệp | 3 | ❌ Not Implemented |
| PB11 | Payment/Subscription | User | Thanh toán để nâng cấp gói dịch vụ | Tôi có thể truy cập các tính năng premium | 4 | ✅ Implemented (ZaloPay) |
| PB12 | **AI Chatbot** | User | **Trò chuyện với AI chatbot để được tư vấn nghề nghiệp** | **Tôi có thể nhận tư vấn cá nhân hóa theo thời gian thực** | 5 | ✅ Implemented |
| PB13 | **Career Advice via Chatbot** | User | **Yêu cầu tư vấn nghề nghiệp dựa trên profile** | **Tôi nhận được lời khuyên chi tiết về con đường sự nghiệp** | 4 | ✅ Implemented |
| PB14 | **Skill Development Plan** | User | **Yêu cầu kế hoạch phát triển kỹ năng cho nghề mục tiêu** | **Tôi có lộ trình học tập cụ thể** | 4 | ✅ Implemented |
| PB15 | **Job Market Analysis** | User | **Yêu cầu phân tích thị trường việc làm** | **Tôi hiểu rõ xu hướng và cơ hội nghề nghiệp** | 4 | ✅ Implemented |
| PB16 | **Chat History** | User | **Xem lại lịch sử các cuộc trò chuyện với chatbot** | **Tôi có thể tham khảo lại các tư vấn trước đó** | 3 | ✅ Implemented |
| PB17 | Career Goals Setting | User | Đặt mục tiêu nghề nghiệp và theo dõi tiến độ | Tôi có thể định hướng rõ ràng cho sự nghiệp | 4 | ✅ Implemented |
| PB18 | Multi-language Support | User | Sử dụng hệ thống bằng tiếng Việt hoặc tiếng Anh | Tôi có thể sử dụng ngôn ngữ quen thuộc | 4 | ✅ Implemented (i18n) |

---

### 2.2. Administrator Features

| ID | Theme | As a/an | I want to | So that | Priority | Status |
|----|-------|---------|-----------|---------|----------|--------|
| PB20 | Admin Authentication | Admin | Đăng nhập vào admin console | Tôi có thể quản lý tài nguyên hệ thống một cách an toàn | 5 | ✅ Implemented |
| PB21 | User Management | Admin | Quản lý tài khoản người dùng (xem, cập nhật, khóa) | Tôi có thể kiểm soát quyền truy cập và đảm bảo tính toàn vẹn hệ thống | 5 | ✅ Implemented |
| PB22 | Career Catalog Management | Admin | Quản lý nghề nghiệp, kỹ năng và metadata | AI recommendations luôn chính xác và cập nhật | 5 | ✅ Implemented |
| PB23 | Assessment Management | Admin | Cập nhật câu hỏi và phiên bản bài test | Các bài test luôn phù hợp và có giá trị khoa học | 4 | ✅ Implemented |
| PB24 | AI Monitoring | Admin | Giám sát hiệu suất AI và logs | Tôi có thể phát hiện lỗi và vấn đề hiệu suất sớm | 4 | ⚠️ Partial (basic logging) |
| PB25 | Admin Dashboard | Admin | Xem thống kê và phân tích sử dụng hệ thống | Tôi có thể đánh giá mức độ áp dụng và hiệu quả hệ thống | 4 | ✅ Implemented |
| PB26 | Data Import/Export | Admin | Import/Export dữ liệu careers, users (CSV/JSON) | Tôi có thể quản lý dữ liệu hàng loạt | 4 | ✅ Implemented |
| PB27 | Subscription Management | Admin | Quản lý các gói subscription và thanh toán | Tôi có thể kiểm soát doanh thu và quyền truy cập premium | 4 | ✅ Implemented |
| PB28 | Blog/Content Management | Admin | Quản lý bài viết blog về nghề nghiệp | Tôi có thể cung cấp nội dung hữu ích cho users | 3 | ✅ Implemented |

---

### 2.3. External Services Integration

| ID | Theme | As a/an | I want to | So that | Priority | Status |
|----|-------|---------|-----------|---------|----------|--------|
| PB30 | **Google Gemini API Integration** | System | **Kết nối với Google Gemini API cho chatbot** | **Users có thể trò chuyện với AI thông minh** | 5 | ✅ Implemented |
| PB31 | O*NET Data Sync | System | Đồng bộ dữ liệu nghề nghiệp từ O*NET | Hệ thống có thông tin nghề nghiệp chuẩn quốc tế | 5 | ✅ Implemented |
| PB32 | PhoBERT NLP Integration | System | Sử dụng PhoBERT để phân tích essay tiếng Việt | AI có thể hiểu và phân tích văn bản tiếng Việt | 5 | ✅ Implemented |
| PB33 | vi-SBERT Embedding | System | Tạo embeddings cho semantic search | Hệ thống có thể tìm kiếm nghề nghiệp theo ngữ nghĩa | 5 | ✅ Implemented |
| PB34 | pgvector Search | System | Sử dụng pgvector cho vector similarity search | Tìm kiếm nghề nghiệp nhanh và chính xác | 5 | ✅ Implemented |
| PB35 | ZaloPay Integration | System | Tích hợp thanh toán qua ZaloPay | Users có thể thanh toán dễ dàng | 4 | ✅ Implemented |
| PB36 | LinkedIn Integration | System | Tích hợp với LinkedIn để import profile | Users có thể import thông tin từ LinkedIn | 3 | ❌ Not Implemented |
| PB37 | Coursera Integration | System | Tích hợp với Coursera để gợi ý khóa học | Users có thể xem khóa học phù hợp | 3 | ❌ Not Implemented |
| PB38 | OAuth 2.0 External | System | Đăng nhập qua Google/Facebook OAuth | Authentication dễ dàng và an toàn hơn | 3 | ❌ Not Implemented |

---

## 3. Product Backlog Summary

### 3.1. Implementation Status

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION STATUS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ✅ Implemented:     28 items (74%)                            │
│   ⚠️ Partial/STUB:    2 items  (5%)                             │
│   ❌ Not Implemented:  8 items (21%)                            │
│                                                                  │
│   ████████████████████████████░░░░░░░░  74%                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Priority Distribution

| Priority | Description | Count | Implemented |
|----------|-------------|-------|-------------|
| 5 - Must Have | Core features | 14 | 13 (93%) |
| 4 - Should Have | Important features | 16 | 13 (81%) |
| 3 - Nice to Have | Optional features | 8 | 4 (50%) |

### 3.3. Features by Actor

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEATURES BY ACTOR                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   👤 User Features:           18 items                          │
│      ✅ Implemented: 15  ⚠️ Partial: 1  ❌ Not: 2               │
│                                                                  │
│   👨‍💼 Admin Features:          9 items                           │
│      ✅ Implemented: 8   ⚠️ Partial: 1  ❌ Not: 0               │
│                                                                  │
│   🔌 External Services:        9 items                          │
│      ✅ Implemented: 5   ⚠️ Partial: 0  ❌ Not: 4               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Mapping với System Context Diagram

### 4.1. User ↔ System Interactions

| System Context Interaction | Related PB Items |
|---------------------------|------------------|
| Do RIASEC / Big Five tests | PB04 |
| Submit profile, interests, goals | PB01, PB17 |
| Upload essay for NLP | PB05 |
| **Chat with AI Chatbot** | **PB12, PB13, PB14, PB15, PB16** |
| Receive career recommendations | PB06 |
| Receive analysis results, scores | PB04, PB08 |
| View skill roadmap | PB07 |
| Feedback logging | PB09 |
| Payment | PB11 |

### 4.2. Administrator ↔ System Interactions

| System Context Interaction | Related PB Items |
|---------------------------|------------------|
| Manage jobs, skills, standards | PB22, PB23 |
| Manage accounts, roles | PB20, PB21 |
| Access dashboard | PB25 |
| Get alerts | PB24 |
| Data I/O (CSV/JSON) | PB26 |

### 4.3. Data Providers ↔ System Interactions

| System Context Interaction | Related PB Items |
|---------------------------|------------------|
| Career catalog sync (O*NET) | PB31 |
| RIASEC mappings | PB31 |
| Skill requirements | PB31 |

### 4.4. Google Gemini API ↔ System Interactions

| System Context Interaction | Related PB Items |
|---------------------------|------------------|
| Chat request | PB12 |
| Career advice request | PB13 |
| Skill development plan | PB14 |
| Job market analysis | PB15 |
| AI response | PB12, PB13, PB14, PB15 |

### 4.5. AI Service (Internal) ↔ System Interactions

| System Context Interaction | Related PB Items |
|---------------------------|------------------|
| Essay NLP, trait extraction | PB05, PB32 |
| RIASEC + Big Five fusion | PB04, PB32 |
| Career ranking inference | PB06, PB33, PB34 |
| AI results | PB06 |

---

## 5. New Features (Added based on actual implementation)

Các tính năng mới được thêm vào dựa trên code thực tế:

### 5.1. AI Chatbot Features (PB12-PB16)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI CHATBOT FEATURES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   PB12: AI Chatbot                                              │
│   └── POST /api/chatbot/chat                                    │
│       • Chat tự do với Gemini AI                                │
│       • Fallback responses khi API unavailable                  │
│                                                                  │
│   PB13: Career Advice via Chatbot                               │
│   └── POST /api/chatbot/career-advice                           │
│       • Input: skills, interests, experience, education         │
│       • Output: 3-5 suitable careers, roadmap, salary info      │
│                                                                  │
│   PB14: Skill Development Plan                                  │
│   └── POST /api/chatbot/skill-development                       │
│       • Input: current_skills, target_job                       │
│       • Output: skill gap analysis, 6-12 month roadmap          │
│                                                                  │
│   PB15: Job Market Analysis                                     │
│   └── POST /api/chatbot/job-market-analysis                     │
│       • Input: job_title, location                              │
│       • Output: demand, salary, trends, tips                    │
│                                                                  │
│   PB16: Chat History                                            │
│   └── GET /api/chatbot/sessions                                 │
│       • View past conversations                                 │
│       • Manage chat sessions                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2. Removed/Modified Features

| Original PB | Change | Reason |
|-------------|--------|--------|
| PB01 (OAuth Google) | Modified → JWT only | OAuth external không implement |
| PB20 (OAuth Integration) | Removed | Không có trong code |
| PB21 (Career Data Sync - ESCO) | Modified → O*NET only | Chỉ dùng O*NET |
| PB22 (Learning Platform - Coursera) | Moved to Nice-to-have | Chưa implement |
| PB23 (Analytics Export) | Partial | Basic logging only |
| PB24 (External OAuth Services) | Removed | Dùng JWT internal |

---

## 6. Technical Implementation Details

### 6.1. AI Chatbot Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| API | Google Generative AI | Gemini models |
| Models | gemini-2.5-flash, gemma-3-4b-it | Primary + fallback |
| Backend | FastAPI + Python | API endpoints |
| Database | PostgreSQL (chatbot schema) | Chat history |
| Frontend | React + TypeScript | Chatbot UI |

### 6.2. NLP/AI Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Essay Analysis | PhoBERT (vinai/phobert-base) | RIASEC/Big5 prediction |
| Embeddings | vi-SBERT | 768D semantic vectors |
| Vector Search | pgvector | Similarity search |
| Ranking | NeuMF/MLP | Career ranking |

### 6.3. Database Schema (Related to PB)

```sql
-- User Features (PB01-PB11)
core.users              -- PB01, PB02, PB03
core.assessments        -- PB04, PB08
core.essays             -- PB05
core.recommendations    -- PB06, PB09
core.roadmaps           -- PB07
core.subscriptions      -- PB11
core.career_goals       -- PB17

-- Chatbot Features (PB12-PB16)
chatbot.chat_sessions   -- PB12, PB16
chatbot.chat_messages   -- PB12, PB13, PB14, PB15

-- Admin Features (PB20-PB28)
core.careers            -- PB22
core.skills             -- PB22
core.questions          -- PB23
core.blogs              -- PB28

-- AI Features (PB30-PB35)
ai.user_embeddings      -- PB33
ai.user_trait_preds     -- PB32
ai.career_embeddings    -- PB34
```

---

## 7. Conclusion

Product Backlog đã được cập nhật để phản ánh:

1. ✅ **Thêm AI Chatbot features** (PB12-PB16) - Tính năng mới với Google Gemini API
2. ✅ **Cập nhật status** - Phản ánh đúng tình trạng implement
3. ✅ **Mapping với System Context** - Liên kết rõ ràng với sơ đồ ngữ cảnh
4. ✅ **Loại bỏ features không implement** - OAuth external, LinkedIn, Coursera
5. ✅ **Thêm technical details** - Stack công nghệ và database schema

**Key Changes:**
- OAuth Google → JWT Authentication (internal)
- External Systems → Data Providers (O*NET only)
- NEW: Google Gemini API integration for chatbot
- NEW: Chat history management
- STUB: Feedback loop (logging only, no online learning)
