# AI-Based Career Recommendation System

Hệ thống gợi ý nghề nghiệp cá nhân hóa sử dụng trí tuệ nhân tạo, được xây dựng theo kiến trúc monorepo với Frontend (React/Vite), Backend (FastAPI) và AI-Core (PhoBERT, vi-SBERT, NeuMF).

---

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Các gói dịch vụ](#các-gói-dịch-vụ)
3. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
4. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
5. [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
6. [Cấu hình môi trường](#cấu-hình-môi-trường)
7. [Hướng dẫn test thanh toán](#hướng-dẫn-test-thanh-toán)
8. [Công nghệ sử dụng](#công-nghệ-sử-dụng)

---

## Giới thiệu

Hệ thống phân tích đặc điểm tính cách người dùng thông qua các bài kiểm tra RIASEC, Big Five và phân tích văn bản (essay) để đưa ra gợi ý nghề nghiệp phù hợp. Các thuật toán AI được sử dụng bao gồm:

- Phân tích văn bản với PhoBERT và vi-SBERT
- Vector search với pgvector (768 chiều)
- Xếp hạng nghề nghiệp với NeuMF/MLP
- Tối ưu hóa gợi ý theo thời gian thực với Thompson Sampling

---

## Các gói dịch vụ

Hệ thống cung cấp 4 gói dịch vụ với các tính năng khác nhau:

**Free (Miễn phí)**
- Giới hạn 5 bài kiểm tra mỗi tháng
- Xem được 1 nghề nghiệp gợi ý
- Lộ trình học tập cấp độ 1
- Chatbot hỗ trợ cơ bản

**Basic (99.000đ)**
- Giới hạn 20 bài kiểm tra mỗi tháng
- Xem được 5 nghề nghiệp mỗi tháng
- Lộ trình học tập cấp độ 1-2
- Phân tích chi tiết RIASEC và Big Five

**Premium (199.000đ)**
- Không giới hạn bài kiểm tra
- Xem toàn bộ danh mục nghề nghiệp
- Lộ trình học tập đầy đủ tất cả cấp độ
- Báo cáo phân tích AI chi tiết

**Pro (299.000đ)**
- Bao gồm tất cả tính năng Premium
- Trợ lý AI hỗ trợ 24/7 (tích hợp Gemini API)
- Xuất báo cáo PDF chuyên sâu
- So sánh lịch sử phát triển cá nhân
- Nhập liệu bằng giọng nói và đọc văn bản
- Tạo bài viết blog từ cuộc trò chuyện

---

## Kiến trúc hệ thống

```
Frontend (React + Vite)
        |
        | HTTP Request qua /bff/*
        v
Backend (FastAPI BFF + Modules)
        |
        | Internal API Call
        v
AI-Core Service (PhoBERT, vi-SBERT, NeuMF)
        |
        v
PostgreSQL + pgvector
```

Frontend giao tiếp với Backend thông qua các endpoint BFF (Backend For Frontend). Backend điều phối các request đến AI-Core service và database.

---

## Cấu trúc thư mục

```
AI-Based-Career-Recommendation-System/
├── apps/
│   ├── backend/                    # FastAPI server
│   │   ├── app/
│   │   │   ├── main.py            # Entry point
│   │   │   ├── bff/               # Backend For Frontend endpoints
│   │   │   ├── core/              # Config, database, authentication
│   │   │   ├── modules/           # Các module nghiệp vụ
│   │   │   │   ├── auth/          # Authentication & authorization
│   │   │   │   ├── users/         # User management
│   │   │   │   ├── assessments/   # Bài test tâm lý (RIASEC, Big Five)
│   │   │   │   ├── payment/       # VNPay, ZaloPay integration
│   │   │   │   ├── recommendation/# AI recommendation engine
│   │   │   │   ├── chatbot/       # Gemini AI chatbot
│   │   │   │   ├── careers/       # Career catalog management
│   │   │   │   ├── content/       # Skills, roadmap content
│   │   │   │   └── reports/       # PDF reports generation
│   │   │   ├── services/          # External API clients
│   │   │   └── tests/             # Unit tests
│   │   ├── requirements.txt       # Python dependencies
│   │   └── .env.example          # Environment variables template
│   │
│   └── frontend/                  # React + Vite application
│       ├── src/
│       │   ├── components/        # Reusable UI components
│       │   ├── pages/            # Route pages
│       │   ├── services/         # API clients
│       │   ├── contexts/         # React contexts
│       │   ├── hooks/            # Custom React hooks
│       │   └── utils/            # Utility functions
│       ├── package.json          # Node.js dependencies
│       └── .env.example         # Frontend environment variables
│
├── packages/
│   └── ai-core/                   # AI service (port 9000)
│       ├── src/
│       │   ├── ai_core/
│       │   │   ├── nlp/          # PhoBERT, vi-SBERT processing
│       │   │   ├── retrieval/    # pgvector similarity search
│       │   │   └── recsys/       # NeuMF recommendation system
│       │   └── api/              # FastAPI endpoints
│       ├── models/               # Pre-trained AI models
│       ├── data/                 # Training datasets & embeddings
│       ├── tests/                # AI model tests
│       └── requirements.txt      # AI dependencies
│
├── db/
│   ├── init/                     # Database initialization scripts
│   └── backup/                   # Database backup files
│       └── dev_snapshot_utf8.sql # Full database dump
│
├── docker-compose.yml            # PostgreSQL + pgvector container
├── README.md                     # Project documentation
├── QUICK_START.md               # Quick setup guide
└── CONTRIBUTING.md              # Development guidelines
```

---

## Hướng dẫn cài đặt

### B1: Khởi tạo Database

**Terminal : Database**

```bash
cd AI-Based-Career-Recommendation-System
docker compose down -v ; docker compose up -d
```

```bash
# 1) Đá hết connection đang giữ DB
docker compose exec -T postgres psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='career_ai';"

# 2) Xoá DB cũ và tạo mới
docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS career_ai;"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE career_ai;"

# 3) Copy file dump vào container (nếu file nằm trên host)
docker compose cp db/backup/dev_snapshot_utf8.sql postgres:/tmp/dev_snapshot_utf8.sql

# 4) Import vào DB
docker compose exec -T postgres psql -U postgres -d career_ai -v ON_ERROR_STOP=1 -f /tmp/dev_snapshot_utf8.sql
```

### B2: Cài đặt thư viện và chạy dự án

Cần mở 3 terminal để chạy đồng thời 3 service.

**Terminal 1: AI-Core Service (port 9000)**

```bash
cd packages/ai-core
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 9000
```

**Terminal 2: Backend (port 8000)**

```bash
cd apps/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 3: Frontend (port 3000)**

```bash
cd apps/frontend
npm install
npm run dev
```

Sau khi chạy xong, truy cập http://localhost:3000 để sử dụng ứng dụng.

---

## Cấu hình môi trường

Tạo file .env trong thư mục apps/backend với nội dung sau:

```
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_CORE_BASE=http://localhost:9000
ALLOWED_ORIGINS=http://localhost:3000
SECRET_KEY=your_secret_key

VNPAY_TMN_CODE=CGXZLS0Z
VNPAY_HASH_SECRET=XNBCJFAKAZQSGTARRLGCHVZWCIOIGSHN

ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz

GEMINI_API_KEY=your_gemini_api_key
```

---

## Hướng dẫn test thanh toán

Hệ thống tích hợp 2 cổng thanh toán VNPay và ZaloPay ở chế độ sandbox để test.

**VNPay Sandbox**

VNPay sandbox chỉ hỗ trợ thẻ ATM nội địa ngân hàng NCB:
- Ngân hàng: NCB
- Số thẻ: 9704198526191432198
- Tên chủ thẻ: NGUYEN VAN A
- Ngày phát hành: 07/15
- Mã OTP: 123456

Lưu ý: Thẻ quốc tế (Visa/Mastercard) và các ngân hàng khác không hoạt động trên môi trường sandbox. Khi triển khai production sẽ hỗ trợ đầy đủ tất cả phương thức thanh toán.

**ZaloPay Sandbox**

ZaloPay sandbox hỗ trợ thanh toán qua QR code bằng app ZaloPay hoặc thẻ quốc tế:
- Loại thẻ: Visa
- Số thẻ: 4111111111111111
- Tên chủ thẻ: NGUYEN VAN A
- Ngày hết hạn: 06/26
- Mã CVV: 123

---

## Công nghệ sử dụng

**Frontend**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

**Backend**
- FastAPI
- SQLAlchemy
- PostgreSQL
- pgvector
- JWT Authentication

**AI-Core**
- PhoBERT
- vi-SBERT
- NeuMF
- FAISS

**Thanh toán**
- VNPay
- ZaloPay

---

## Liên hệ

Mọi thắc mắc về dự án vui lòng liên hệ qua email: tranchitho160704@gmail.com.
