# 📚 TÀI LIỆU DỰ ÁN: HỆ THỐNG GỢI Ý NGHỀ NGHIỆP DỰA TRÊN AI

## 📋 MỤC LỤC
1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
3. [Frontend Documentation](#3-frontend-documentation)
4. [Backend Documentation](#4-backend-documentation)
5. [Tính Năng Chi Tiết](#5-tính-năng-chi-tiết)
6. [Hệ Thống Subscription 4 Gói](#6-hệ-thống-subscription-4-gói)
7. [Kịch Bản Demo](#7-kịch-bản-demo)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Giới Thiệu
**AI-Based Career Recommendation System** (CareerBridge) là hệ thống gợi ý nghề nghiệp cá nhân hóa sử dụng trí tuệ nhân tạo, giúp người dùng khám phá con đường sự nghiệp phù hợp dựa trên:
- Bài test RIASEC (6 chiều hướng nghề nghiệp)
- Bài test Big Five (5 đặc điểm tính cách)
- Phân tích bài luận bằng AI (PhoBERT/vi-SBERT)
- Gợi ý nghề nghiệp thông minh với NeuMF ranking

### 1.2 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript + TailwindCSS |
| **Backend** | FastAPI (Python) - BFF Pattern |
| **AI Core** | PhoBERT, vi-SBERT, NeuMF, Thompson Sampling |
| **Database** | PostgreSQL + pgvector (768D embeddings) |
| **Payment** | ZaloPay Integration |
| **Chatbot** | Google Gemini API |

### 1.3 Luồng Xử Lý Tổng Quát
```
Frontend (React SPA) 
    ↓ via /api/*
Backend (FastAPI BFF)
    ↓
AI-Core API (PhoBERT · vi-SBERT · NeuMF)
    ↓
PostgreSQL + pgvector
```

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Cấu Trúc Monorepo
```
AI-Based-Career-Recommendation-System/
├── apps/
│   ├── backend/           # FastAPI Backend (Port 8000)
│   │   ├── app/
│   │   │   ├── main.py           # Entry point
│   │   │   ├── bff/              # BFF Router & DTO
│   │   │   ├── core/             # Config, DB, JWT, Security
│   │   │   ├── modules/          # Feature modules
│   │   │   │   ├── auth/         # Authentication
│   │   │   │   ├── users/        # User management
│   │   │   │   ├── assessments/  # Bài test RIASEC/Big Five
│   │   │   │   ├── careers/      # Nghề nghiệp
│   │   │   │   ├── chatbot/      # Gemini AI Chatbot
│   │   │   │   ├── payment/      # ZaloPay
│   │   │   │   ├── subscription/ # Quản lý gói
│   │   │   │   ├── goals/        # Career Goals
│   │   │   │   ├── reports/      # PDF Reports
│   │   │   │   └── ...
│   │   │   └── services/
│   │   └── requirements.txt
│   │
│   └── frontend/          # React Frontend (Port 5173)
│       ├── src/
│       │   ├── components/       # UI Components
│       │   │   ├── assessment/   # Test components
│       │   │   ├── chatbot/      # AI Chatbot
│       │   │   ├── dashboard/    # Dashboard cards
│       │   │   ├── payment/      # Payment UI
│       │   │   ├── subscription/ # Subscription UI
│       │   │   └── ...
│       │   ├── pages/            # Route pages
│       │   ├── services/         # API services
│       │   ├── hooks/            # Custom hooks
│       │   ├── contexts/         # React contexts
│       │   └── types/            # TypeScript types
│       └── package.json
│
├── packages/
│   └── ai-core/           # AI Service (Port 9000)
│
└── db/                    # Database scripts
```

---

## 3. FRONTEND DOCUMENTATION

### 3.1 Các Trang Chính (Pages)

| Route | Page | Mô Tả |
|-------|------|-------|
| `/home` | HomePage | Landing page với hero section |
| `/login` | LoginPage | Đăng nhập |
| `/register` | RegisterPage | Đăng ký tài khoản |
| `/dashboard` | DashboardPage | Tổng quan người dùng |
| `/assessment` | AssessmentPage | Làm bài test RIASEC/Big Five |
| `/results/:id` | ResultsPage | Xem kết quả bài test |
| `/careers` | CareersPage | Danh sách nghề nghiệp |
| `/careers/:id` | CareerDetailPage | Chi tiết nghề nghiệp |
| `/careers/:id/roadmap` | RoadmapPage | Lộ trình học tập |
| `/pricing` | PaymentPage | Bảng giá & thanh toán |
| `/chat` | ChatPage | AI Chatbot (Pro) |
| `/blog` | BlogPage | Blog chia sẻ |
| `/profile` | ProfilePage | Hồ sơ cá nhân |
| `/admin/*` | AdminDashboardPage | Quản trị hệ thống |

### 3.2 Services (API Calls)

```typescript
// assessmentService.ts - Quản lý bài test
- getQuestions(testType)      // Lấy câu hỏi
- submitAssessment(responses) // Nộp bài test
- submitEssay(payload)        // Nộp bài luận
- getResults(assessmentId)    // Lấy kết quả

// paymentService.ts - Thanh toán
- createPayment(amount, description) // Tạo đơn thanh toán
- getPaymentHistory()                // Lịch sử giao dịch
- checkPaymentStatus(orderId)        // Kiểm tra trạng thái

// subscriptionService.ts - Gói dịch vụ
- getSubscriptionStatus()     // Trạng thái subscription
- checkAssessmentLimit()      // Kiểm tra giới hạn test
- checkCareerViewLimit()      // Kiểm tra giới hạn xem nghề

// careerService.ts - Nghề nghiệp
- getCareers()                // Danh sách nghề
- getCareerDetail(id)         // Chi tiết nghề
- getRoadmap(careerId)        // Lộ trình học tập
```

### 3.3 Custom Hooks

```typescript
// useSubscription.ts
- subscriptionData    // Thông tin gói hiện tại
- isLoading          // Trạng thái loading
- refetch()          // Refresh data

// useFeatureAccess.ts
- hasFeature(feature) // Kiểm tra quyền truy cập tính năng
- canAccessChatbot   // Có quyền dùng chatbot không
- canExportPDF       // Có quyền xuất PDF không

// useUsageTracking.ts
- incrementUsage(feature) // Tăng số lần sử dụng
- getUsage(feature)       // Lấy số lần đã dùng
```

### 3.4 Components Quan Trọng

```
components/
├── assessment/
│   ├── CareerTestComponent.tsx    # Component làm bài test
│   ├── EssayModalComponent.tsx    # Modal nhập bài luận
│   └── LimitExceededModal.tsx     # Modal hết lượt test
│
├── chatbot/
│   ├── Chatbot.tsx               # Main chatbot component
│   ├── ChatbotWrapper.tsx        # Wrapper với auth check
│   └── PremiumFeaturePrompt.tsx  # Prompt nâng cấp Pro
│
├── dashboard/
│   ├── ProfileSummaryCard.tsx    # Card thông tin profile
│   ├── CareerSuggestionCard.tsx  # Card gợi ý nghề
│   └── ProgressMetricsCard.tsx   # Card tiến độ
│
├── payment/
│   ├── PaymentButton.tsx         # Nút thanh toán
│   └── PaymentReturn.tsx         # Xử lý callback
│
└── subscription/
    ├── UsageStatus.tsx           # Hiển thị usage
    └── SubscriptionExpiryCard.tsx # Thông tin hết hạn
```

---

## 4. BACKEND DOCUMENTATION

### 4.1 API Endpoints Chính

#### Authentication (`/api/auth`)
```
POST /api/auth/register     # Đăng ký
POST /api/auth/login        # Đăng nhập
POST /api/auth/refresh      # Refresh token
POST /api/auth/google       # Google OAuth
POST /api/auth/verify       # Xác thực email
POST /api/auth/reset        # Reset password
```

#### Assessments (`/api/assessments`)
```
GET  /api/assessments/questions/{type}  # Lấy câu hỏi
POST /api/assessments/submit            # Nộp bài test
POST /api/assessments/essay             # Nộp bài luận
GET  /api/assessments/{id}/results      # Lấy kết quả
GET  /api/assessments/user/sessions     # Lịch sử test
```

#### Careers (`/api/careers`)
```
GET  /api/careers                    # Danh sách nghề
GET  /api/careers/{id}               # Chi tiết nghề
GET  /api/careers/{id}/roadmap       # Lộ trình
GET  /api/careers/{id}/trait-evidence # Phân tích trait
```

#### Payment (`/api/payment`)
```
POST /api/payment/create             # Tạo đơn thanh toán
GET  /api/payment/history            # Lịch sử
POST /api/payment/callback           # ZaloPay callback
GET  /api/payment/status/{orderId}   # Kiểm tra trạng thái
```

#### Subscription (`/api/subscription`)
```
GET  /api/subscription/status        # Trạng thái gói
GET  /api/subscription/limits        # Giới hạn sử dụng
POST /api/subscription/force-sync    # Đồng bộ gói
```

#### Chatbot (`/api/chatbot`)
```
POST /api/chatbot/chat               # Gửi tin nhắn
GET  /api/chatbot/history            # Lịch sử chat
POST /api/chatbot/create-blog        # Tạo blog từ chat
```

### 4.2 Modules Backend

```python
modules/
├── auth/           # JWT, Google OAuth, Email verification
├── users/          # User CRUD, Profile
├── assessments/    # RIASEC, Big Five tests
├── careers/        # Career data, Trait evidence
├── chatbot/        # Gemini AI integration
├── payment/        # ZaloPay integration
├── subscription/   # Plan management, Usage tracking
├── goals/          # Career goals (Pro feature)
├── reports/        # PDF generation
├── content/        # Blog, Essays
├── recommendation/ # AI recommendations
├── analytics/      # Usage tracking
└── admin/          # Admin dashboard
```

### 4.3 Core Services

```python
core/
├── config.py       # Environment configuration
├── db.py           # Database connection
├── jwt.py          # JWT token handling
├── security.py     # Password hashing
├── subscription.py # Subscription logic
└── email_utils.py  # Email sending
```

---

## 5. TÍNH NĂNG CHI TIẾT

### 5.1 Bài Test Đánh Giá

#### RIASEC Test (6 Dimensions)
- **R**ealistic - Thực tế
- **I**nvestigative - Nghiên cứu
- **A**rtistic - Nghệ thuật
- **S**ocial - Xã hội
- **E**nterprising - Doanh nghiệp
- **C**onventional - Quy ước

#### Big Five Test (5 Traits)
- **O**penness - Cởi mở
- **C**onscientiousness - Tận tâm
- **E**xtraversion - Hướng ngoại
- **A**greeableness - Dễ chịu
- **N**euroticism - Nhạy cảm

### 5.2 AI Chatbot (Pro Feature)
- Tích hợp Google Gemini API
- Tư vấn nghề nghiệp 24/7
- Lưu lịch sử hội thoại
- Tạo blog từ cuộc trò chuyện
- Voice input & Text-to-speech

### 5.3 Roadmap Học Tập
- **Level 1**: Kiến thức cơ bản (Free)
- **Level 2**: Kỹ năng nâng cao (Basic+)
- **Level 3**: Chuyên môn sâu (Premium+)
- **Level 4**: Expert level (Premium+)

### 5.4 Thanh Toán ZaloPay
- Tích hợp ZaloPay Sandbox/Production
- Callback tự động cập nhật trạng thái
- Lịch sử giao dịch đầy đủ

---

## 6. HỆ THỐNG SUBSCRIPTION 4 GÓI

### 6.1 Bảng So Sánh Gói

| Tính Năng | 🆓 Free | 💙 Basic (99k) | 💚 Premium (299k) | 💜 Pro (499k) |
|-----------|---------|----------------|-------------------|---------------|
| Bài test/tháng | 5 | 20 | ∞ | ∞ |
| Xem nghề nghiệp | 1 | 5/tháng (max 25) | ∞ | ∞ |
| Roadmap Level | 1 | 1-2 | Full | Full |
| Phân tích RIASEC | ✓ | ✓ | ✓ | ✓ |
| Phân tích Big Five | ✓ | ✓ | ✓ | ✓ |
| View Full Report | ✗ | ✗ | ✓ | ✓ |
| AI Chatbot 24/7 | ✗ | ✗ | ✗ | ✓ |
| Xuất PDF | ✗ | ✗ | ✗ | ✓ |
| So sánh lịch sử | ✗ | ✗ | ✗ | ✓ |
| Voice input | ✗ | ✗ | ✗ | ✓ |

### 6.2 Logic Kiểm Tra Quyền

```typescript
// Frontend: useFeatureAccess.ts
const hasFeature = (feature: string): boolean => {
  const plan = subscriptionData?.plan || 'free';
  
  switch(feature) {
    case 'unlimited_assessments':
      return ['premium', 'pro'].includes(plan);
    case 'chatbot':
      return plan === 'pro';
    case 'pdf_export':
      return plan === 'pro';
    case 'full_roadmap':
      return ['premium', 'pro'].includes(plan);
    default:
      return true;
  }
};
```

```python
# Backend: subscription.py
def check_feature_access(user_id: int, feature: str) -> bool:
    subscription = get_user_subscription(user_id)
    plan = subscription.plan if subscription else 'free'
    
    feature_matrix = {
        'free': ['basic_assessment', 'view_1_career'],
        'basic': ['assessment_20', 'view_5_careers', 'roadmap_l2'],
        'premium': ['unlimited_assessment', 'unlimited_careers', 'full_roadmap'],
        'pro': ['all_premium', 'chatbot', 'pdf_export', 'voice_input']
    }
    
    return feature in feature_matrix.get(plan, [])
```

---

## 7. KỊCH BẢN DEMO

### 📋 CHUẨN BỊ TRƯỚC DEMO

#### Yêu Cầu Hệ Thống
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ với pgvector
- Terminal/Command Prompt

#### Khởi Động Hệ Thống (3 Terminal)

**Terminal 1 - Backend (Port 8000)**
```bash
cd apps/backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend (Port 5173)**
```bash
cd apps/frontend
npm install
npm run dev
```

**Terminal 3 - AI Core (Port 9000)** *(Optional)*
```bash
cd packages/ai-core
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 9000
```

#### Tài Khoản Test
| Email | Password | Gói |
|-------|----------|-----|
| `free@test.com` | test123 | Free |
| `basic@test.com` | test123 | Basic |
| `premium@test.com` | test123 | Premium |
| `pro@test.com` | test123 | Pro |
| `admin@test.com` | admin123 | Admin |

---

### 🎬 KỊCH BẢN DEMO CHI TIẾT

---

## DEMO 1: LUỒNG NGƯỜI DÙNG MỚI (15 phút)

### Bước 1: Giới Thiệu Landing Page (2 phút)
**Mục tiêu**: Giới thiệu giao diện và giá trị của hệ thống

1. Mở trình duyệt → `http://localhost:5173`
2. **Điểm nhấn**:
   - Hero section với animation đẹp mắt
   - Thống kê: "98% Success Rate", "10k+ Resumes Built"
   - Logo cloud các công ty lớn
   - Bento grid features
   - Testimonials carousel
   - FAQ accordion

**Script nói**:
> "Đây là CareerBridge - hệ thống gợi ý nghề nghiệp sử dụng AI. Giao diện được thiết kế hiện đại với các animation mượt mà. Người dùng có thể thấy ngay các tính năng chính: AI Resume Builder, Career Matching, và Skill Analysis."

### Bước 2: Đăng Ký Tài Khoản (2 phút)
**Mục tiêu**: Demo luồng đăng ký

1. Click **"Get Started"** hoặc **"Sign Up"**
2. Điền form đăng ký:
   - Email: `demo@example.com`
   - Password: `Demo@123`
   - Confirm Password
3. Click **"Register"**
4. *(Optional)* Demo Google OAuth

**Script nói**:
> "Người dùng có thể đăng ký bằng email hoặc Google OAuth. Hệ thống sẽ gửi email xác thực để đảm bảo tính bảo mật."

### Bước 3: Dashboard Overview (2 phút)
**Mục tiêu**: Giới thiệu dashboard

1. Sau đăng nhập → Redirect đến `/dashboard`
2. **Điểm nhấn**:
   - Profile Summary Card
   - "No Assessment" prompt (người dùng mới)
   - Giao diện responsive

**Script nói**:
> "Dashboard hiển thị tổng quan về profile người dùng. Với người dùng mới, hệ thống sẽ gợi ý làm bài test đầu tiên."

### Bước 4: Làm Bài Test RIASEC & Big Five (5 phút)
**Mục tiêu**: Demo core feature - Assessment

1. Click **"Start Assessment"**
2. **Intro Screen**:
   - Giới thiệu 2 loại test: RIASEC & Big Five
   - Thời gian: ~10 phút
   - Usage status (5/5 lượt cho Free)
3. **Làm bài test**:
   - 30 câu RIASEC (5 câu/dimension)
   - 30 câu Big Five (6 câu/trait)
   - Progress bar hiển thị tiến độ
4. **Essay Modal** (sau khi hoàn thành):
   - Nhập bài luận ngắn về bản thân
   - Hoặc Skip để xem kết quả ngay

**Script nói**:
> "Bài test gồm 60 câu hỏi chia làm 2 phần: RIASEC đánh giá sở thích nghề nghiệp và Big Five đánh giá tính cách. Người dùng có thể viết thêm bài luận để AI phân tích sâu hơn."

### Bước 5: Xem Kết Quả (3 phút)
**Mục tiêu**: Demo kết quả phân tích

1. Redirect đến `/results/{assessmentId}`
2. **Điểm nhấn**:
   - RIASEC Radar Chart
   - Big Five Bar Chart
   - Top 3 Career Recommendations
   - Match percentage cho mỗi nghề

**Script nói**:
> "Kết quả hiển thị dưới dạng biểu đồ trực quan. RIASEC cho thấy xu hướng nghề nghiệp, Big Five cho thấy đặc điểm tính cách. Hệ thống AI đã gợi ý 3 nghề nghiệp phù hợp nhất."

### Bước 6: Xem Chi Tiết Nghề Nghiệp (1 phút)
**Mục tiêu**: Demo career detail

1. Click vào một nghề nghiệp được gợi ý
2. **Điểm nhấn**:
   - Mô tả nghề nghiệp
   - Kỹ năng cần thiết
   - Mức lương tham khảo
   - Nút "View Roadmap"

**Script nói**:
> "Mỗi nghề nghiệp có thông tin chi tiết về yêu cầu, kỹ năng và mức lương. Người dùng Free chỉ xem được 1 nghề, cần nâng cấp để xem thêm."

---

## DEMO 2: HỆ THỐNG SUBSCRIPTION (10 phút)

### Bước 1: Giới Thiệu Pricing Page (2 phút)
**Mục tiêu**: Demo bảng giá

1. Navigate đến `/pricing`
2. **Điểm nhấn**:
   - 3 gói: Basic (99k), Premium (299k), Pro (499k)
   - So sánh tính năng
   - "Most Popular" badge cho Premium
   - Current plan indicator

**Script nói**:
> "Hệ thống có 4 gói dịch vụ. Gói Free mặc định với 5 bài test/tháng. Gói Basic phù hợp người mới, Premium cho người cần định hướng rõ ràng, và Pro với AI Chatbot 24/7."

### Bước 2: Demo Thanh Toán ZaloPay (3 phút)
**Mục tiêu**: Demo payment flow

1. Click **"Chọn Gói Này"** trên gói Premium
2. **Payment Flow**:
   - Redirect đến ZaloPay
   - *(Sandbox)* Nhập thông tin test
   - Xác nhận thanh toán
3. **Callback**:
   - Redirect về `/payment/return`
   - Hiển thị trạng thái: Success/Failed
   - Auto-update subscription

**Script nói**:
> "Thanh toán qua ZaloPay an toàn và nhanh chóng. Sau khi thanh toán thành công, gói dịch vụ được kích hoạt ngay lập tức."

### Bước 3: Demo Giới Hạn Sử Dụng (2 phút)
**Mục tiêu**: Demo usage limits

1. Đăng nhập với `free@test.com`
2. Vào `/assessment`
3. **Điểm nhấn**:
   - Usage status: "4/5 lượt còn lại"
   - Khi hết lượt → Modal "Limit Exceeded"
   - Nút "Nâng cấp ngay"

**Script nói**:
> "Hệ thống theo dõi số lượt sử dụng. Khi hết lượt, người dùng được gợi ý nâng cấp gói để tiếp tục."

### Bước 4: Demo Tính Năng Premium (3 phút)
**Mục tiêu**: So sánh Free vs Premium

1. Đăng nhập với `premium@test.com`
2. **Điểm nhấn**:
   - Unlimited assessments
   - Xem tất cả nghề nghiệp
   - Full Roadmap (4 levels)
   - View Full Report

**Script nói**:
> "Với gói Premium, người dùng có quyền truy cập không giới hạn. Roadmap đầy đủ 4 cấp độ giúp định hướng học tập rõ ràng."

---

## DEMO 3: AI CHATBOT - TÍNH NĂNG PRO (8 phút)

### Bước 1: Giới Thiệu Chatbot (1 phút)
**Mục tiêu**: Demo chatbot access

1. Đăng nhập với `pro@test.com`
2. Click icon chatbot (góc phải dưới)
3. **Điểm nhấn**:
   - Chatbot floating button
   - Chat window mở ra

**Script nói**:
> "AI Chatbot là tính năng độc quyền của gói Pro. Được tích hợp Google Gemini, chatbot có thể tư vấn nghề nghiệp 24/7."

### Bước 2: Demo Hội Thoại (4 phút)
**Mục tiêu**: Demo AI conversation

1. **Câu hỏi mẫu**:
   - "Tôi nên học gì để trở thành Data Scientist?"
   - "So sánh nghề Software Engineer và Product Manager"
   - "Lộ trình học Machine Learning trong 6 tháng"

2. **Điểm nhấn**:
   - Response nhanh và chính xác
   - Markdown formatting
   - Context-aware (nhớ lịch sử chat)

**Script nói**:
> "Chatbot hiểu ngữ cảnh và đưa ra lời khuyên cá nhân hóa. Có thể hỏi về lộ trình học tập, so sánh nghề nghiệp, hoặc xin tư vấn cụ thể."

### Bước 3: Demo Tạo Blog từ Chat (2 phút)
**Mục tiêu**: Demo blog creation

1. Sau cuộc hội thoại hay
2. Click **"Tạo Blog từ cuộc trò chuyện"**
3. **Điểm nhấn**:
   - AI tự động tóm tắt
   - Tạo bài blog với format đẹp
   - Publish lên Blog section

**Script nói**:
> "Tính năng độc đáo: biến cuộc trò chuyện thành bài blog để chia sẻ với cộng đồng. AI tự động format và tóm tắt nội dung."

### Bước 4: Demo Lịch Sử Chat (1 phút)
**Mục tiêu**: Demo chat history

1. Click **"Lịch sử"** trong chatbot
2. **Điểm nhấn**:
   - Danh sách các cuộc hội thoại
   - Có thể tiếp tục chat cũ
   - Xóa lịch sử

**Script nói**:
> "Tất cả cuộc hội thoại được lưu lại. Người dùng có thể xem lại hoặc tiếp tục từ cuộc chat trước."

---

## DEMO 4: ADMIN DASHBOARD (5 phút)

### Bước 1: Đăng Nhập Admin (1 phút)
1. Đăng nhập với `admin@test.com`
2. Navigate đến `/admin`

### Bước 2: Overview Dashboard (2 phút)
**Điểm nhấn**:
- Tổng số users
- Số bài test hoàn thành
- Doanh thu
- Charts thống kê

### Bước 3: Quản Lý Users (1 phút)
**Điểm nhấn**:
- Danh sách users
- Filter theo plan
- View user details
- Change user plan

### Bước 4: Quản Lý Content (1 phút)
**Điểm nhấn**:
- Quản lý câu hỏi test
- Quản lý nghề nghiệp
- Quản lý blog posts
- Approve/Reject content

---

## DEMO 5: ROADMAP & CAREER GOALS (5 phút)

### Bước 1: Xem Roadmap (2 phút)
1. Vào chi tiết một nghề nghiệp
2. Click **"View Roadmap"**
3. **Điểm nhấn**:
   - 4 Levels: Beginner → Expert
   - Mỗi level có các skills cần học
   - Resources và courses gợi ý
   - Progress tracking

### Bước 2: Career Goals (Pro) (3 phút)
1. Navigate đến `/career-goals`
2. **Điểm nhấn**:
   - Đặt mục tiêu nghề nghiệp
   - Timeline và milestones
   - Track progress
   - AI suggestions

---

## DEMO 6: RESPONSIVE & UX (3 phút)

### Mobile View
1. Mở DevTools → Toggle device toolbar
2. Chọn iPhone/Android
3. **Điểm nhấn**:
   - Navigation hamburger menu
   - Cards stack vertically
   - Touch-friendly buttons
   - Chatbot mobile-optimized

### Dark Mode
1. Click theme toggle (header)
2. **Điểm nhấn**:
   - Smooth transition
   - All components support dark mode
   - Eye-friendly colors

---

### 📝 CHECKLIST TRƯỚC DEMO

- [ ] Database đã seed data
- [ ] Backend running (port 8000)
- [ ] Frontend running (port 5173)
- [ ] AI Core running (port 9000) - optional
- [ ] Test accounts đã tạo
- [ ] ZaloPay sandbox configured
- [ ] Gemini API key configured
- [ ] Browser cache cleared
- [ ] DevTools closed (trừ khi demo responsive)

### 🎯 KEY MESSAGES

1. **AI-Powered**: Sử dụng AI tiên tiến (PhoBERT, Gemini) để phân tích và gợi ý
2. **Personalized**: Kết quả cá nhân hóa dựa trên RIASEC + Big Five + Essay
3. **Comprehensive**: Từ test → Results → Roadmap → Chatbot support
4. **Scalable**: 4-tier subscription phù hợp mọi nhu cầu
5. **Modern UX**: Giao diện đẹp, responsive, dark mode support

---

### 🔧 TROUBLESHOOTING

| Vấn đề | Giải pháp |
|--------|-----------|
| Backend không start | Check DATABASE_URL trong .env |
| Frontend lỗi CORS | Restart backend, check ALLOWED_ORIGINS |
| Payment không callback | Check ZaloPay credentials |
| Chatbot không response | Check GEMINI_API_KEY |
| Assessment limit không đúng | Run `/api/subscription/force-sync` |

---

*Tài liệu được tạo tự động bởi Kiro AI Assistant*
*Cập nhật: December 2024*
