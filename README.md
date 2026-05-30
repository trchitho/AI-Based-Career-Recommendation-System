# CareerVerse - Career Development Ecosystem Powered by AI Agents

Hệ thống gợi ý nghề nghiệp cá nhân hóa sử dụng trí tuệ nhân tạo, được xây dựng theo kiến trúc monorepo với Frontend (React/Vite), Backend (FastAPI) và AI-Core (PhoBERT, vi-SBERT, NeuMF).

---

## Thông tin nhóm

| Mục | Thông tin |
|---|---|
| **Mã nhóm** | C2SE.17 |
| **Tên đề tài** | CareerVerse - Career Development Ecosystem Powered by AI Agents |
| **Mentor** | Nguyễn Hải Minh |

**Thành viên:**

| STT | Họ và tên |
|---|---|
| 1 | Phạm Tùng Dương |
| 2 | Lê Thanh Thiện |
| 3 | Nguyễn Công Thịnh |
| 4 | Trần Chí Thọ |
| 5 | Phạm Hoàng Thương |

---

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Tính năng chính](#tính-năng-chính)
3. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
4. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
5. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
6. [Các gói dịch vụ](#các-gói-dịch-vụ)
7. [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
8. [Cấu hình môi trường](#cấu-hình-môi-trường)
9. [Hướng dẫn test thanh toán](#hướng-dẫn-test-thanh-toán)

---

## Giới thiệu

CareerVerse phân tích đặc điểm tính cách người dùng thông qua các bài kiểm tra **RIASEC** và **Big Five**, kết hợp phân tích văn bản (essay) để đưa ra gợi ý nghề nghiệp phù hợp. Hệ thống sử dụng nhiều thuật toán AI kết hợp:

- Phân tích văn bản với **PhoBERT** và **vi-SBERT** (768 chiều)
- Vector similarity search với **pgvector**
- Xếp hạng nghề nghiệp với **NeuMF/MLP** (Neural Matrix Factorization)
- Tối ưu hóa gợi ý theo thời gian thực với **Thompson Sampling**
- Trợ lý AI và phỏng vấn thử với **Gemini API**

---

## Tính năng chính

### Gợi ý nghề nghiệp AI
- Kết hợp 4 tín hiệu: Embedding similarity (20%) + RIASEC (45%) + Big Five (10%) + NeuMF (25%)
- Thompson Sampling tự động học từ phản hồi người dùng
- Cơ sở dữ liệu 900+ nghề nghiệp theo chuẩn O*NET

### Phỏng vấn thử (Mock Interview)
- **Text Mode**: Câu hỏi phỏng vấn do Gemini AI tạo ra, phân tích câu trả lời đa chiều
- **Voice Mode**: STT/TTS thời gian thực (Faster-Whisper + Edge TTS)
- Chấm điểm: kỹ thuật, giao tiếp, logic, kinh nghiệm, thái độ
- Phân tích chi tiết điểm mạnh, điểm yếu, gợi ý cải thiện

### Phân tích Skill Gap
- Upload CV (PDF, DOCX, JPG, PNG) và tự động trích xuất kỹ năng
- So sánh với yêu cầu của nghề nghiệp mục tiêu
- Phân loại khoảng cách kỹ năng: critical / important / nice-to-have
- Gợi ý khóa học từ Coursera, Udemy, edX

### Lộ trình học tập cá nhân hóa
- Tạo roadmap học tập dựa trên khoảng cách kỹ năng
- Theo dõi tiến độ và nhắc nhở qua email
- Tích hợp với catalog 1000+ khóa học

### Kết nối Mentor
- Ghép cặp mentor-mentee dựa trên similarity ngữ nghĩa
- Tương thích RIASEC giữa mentor và mentee
- Chat thời gian thực (WebSocket)

### Dữ liệu thị trường lao động
- Crawl tự động từ VietnamWorks, ITViec, TopCV mỗi 6 giờ
- Xu hướng nhu cầu tuyển dụng theo ngành nghề
- Thống kê mức lương theo kinh nghiệm

---

## Kiến trúc hệ thống

```
Frontend (React + Vite)
        │
        │ HTTP / WebSocket
        ▼
Backend (FastAPI - port 8000)
        │
        ├── PostgreSQL + pgvector   ← lưu trữ chính + vector search
        ├── Neo4j                   ← đồ thị kỹ năng - nghề nghiệp
        ├── Redis                   ← caching session
        │
        │ Internal HTTP Call
        ▼
AI-Core Service (FastAPI - port 9000)
        │
        ├── PhoBERT / vi-SBERT     ← NLP & embeddings
        ├── NeuMF MLP              ← collaborative filtering
        └── Thompson Sampling      ← bandit optimization
```

---

## Công nghệ sử dụng

### Frontend
- **React 18** + **TypeScript** — UI framework
- **Vite** — build tool
- **Tailwind CSS** — styling
- **React Router** — routing
- **React Query** — data fetching & caching
- **Axios** — HTTP client

### Backend
- **FastAPI** — web framework
- **SQLAlchemy** + **psycopg** — ORM & PostgreSQL driver
- **Pydantic** — data validation
- **APScheduler** — background job scheduling
- **Redis** — caching
- **JWT** — authentication

### Database
- **PostgreSQL 14+** với extension **pgvector** — lưu trữ vector 768 chiều
- **Neo4j 5** — đồ thị quan hệ nghề nghiệp - kỹ năng
- **Redis** — cache session & phiên làm việc

### AI / Machine Learning
- **PyTorch** — deep learning (NeuMF)
- **HuggingFace Transformers** — PhoBERT, vi-SBERT
- **FAISS** — vector similarity search
- **scikit-learn** — classical ML algorithms
- **Faster-Whisper** — Speech-to-Text thời gian thực
- **Edge TTS** — Text-to-Speech tự nhiên

### External APIs
- **Google Gemini API** — AI chatbot, tạo câu hỏi phỏng vấn, phân tích câu trả lời
- **Cloudflare R2** — lưu trữ file CV
- **ZaloPay / VNPay** — cổng thanh toán

### Infrastructure
- **Docker** + **Docker Compose** — containerization
- **Uvicorn** — ASGI server

---

## Cấu trúc thư mục

```
AI-Based-Career-Recommendation-System/
├── apps/
│   ├── backend/                    # FastAPI server (port 8000)
│   │   ├── app/
│   │   │   ├── main.py             # Entry point
│   │   │   ├── bff/                # Backend For Frontend layer
│   │   │   ├── core/               # Config, database, auth, cache
│   │   │   ├── modules/            # Các module nghiệp vụ
│   │   │   │   ├── auth/           # Đăng nhập, Google OAuth, JWT
│   │   │   │   ├── users/          # Quản lý người dùng
│   │   │   │   ├── assessments/    # Bài test RIASEC, Big Five
│   │   │   │   ├── careers/        # Danh mục nghề nghiệp
│   │   │   │   ├── recommendation/ # Engine gợi ý AI
│   │   │   │   ├── skill_gap/      # Phân tích CV, khoảng cách kỹ năng
│   │   │   │   ├── interview/      # Phỏng vấn thử AI
│   │   │   │   ├── learning_path/  # Lộ trình học tập
│   │   │   │   ├── mentor_matching/# Kết nối mentor
│   │   │   │   ├── chatbot/        # Gemini AI chatbot
│   │   │   │   ├── chat/           # Chat thời gian thực
│   │   │   │   ├── courses/        # Catalog khóa học
│   │   │   │   ├── jobs/           # Dữ liệu việc làm (crawl)
│   │   │   │   ├── payment/        # ZaloPay, VNPay
│   │   │   │   ├── subscription/   # Gói dịch vụ
│   │   │   │   ├── reports/        # Báo cáo PDF
│   │   │   │   ├── analytics/      # Tracking hành vi
│   │   │   │   ├── content/        # Blog, bài viết
│   │   │   │   └── trends/         # Xu hướng thị trường
│   │   │   ├── api/                # Các router bổ sung
│   │   │   ├── models/             # Database models
│   │   │   └── services/           # External API clients
│   │   └── requirements.txt
│   │
│   └── frontend/                   # React + Vite (port 5173)
│       ├── src/
│       │   ├── pages/              # 50+ trang của ứng dụng
│       │   ├── components/         # Reusable UI components
│       │   ├── services/           # API client functions
│       │   ├── contexts/           # React context providers
│       │   ├── hooks/              # Custom React hooks
│       │   ├── types/              # TypeScript type definitions
│       │   └── utils/              # Utility functions
│       ├── public/                 # Static assets
│       └── package.json
│
├── packages/
│   └── ai-core/                    # AI/ML service (port 9000)
│       ├── src/
│       │   ├── ai_core/
│       │   │   ├── nlp/            # PhoBERT, vi-SBERT, essay analysis
│       │   │   ├── retrieval/      # pgvector similarity search
│       │   │   └── recsys/         # NeuMF, Thompson Sampling
│       │   ├── api/                # FastAPI endpoints
│       │   └── interview/          # STT, TTS, interview AI pipeline
│       ├── models/                 # Pre-trained model weights
│       └── requirements.txt
│
├── db/                             # Database init scripts
├── docker-compose.yml              # PostgreSQL + Neo4j + Redis
└── README.md
```

---

## Các gói dịch vụ

| Tính năng | Free | Basic (99k) | Premium (199k) | Pro (299k) |
|---|:---:|:---:|:---:|:---:|
| Bài kiểm tra/tháng | 5 | 20 | Không giới hạn | Không giới hạn |
| Nghề nghiệp gợi ý | 1 | 5/tháng | Toàn bộ | Toàn bộ |
| Lộ trình học tập | Cấp 1 | Cấp 1-2 | Đầy đủ | Đầy đủ |
| Chatbot AI (Gemini) | — | — | — | 24/7 |
| Phỏng vấn bằng giọng nói | — | — | — | ✓ |
| Xuất báo cáo PDF | — | — | — | ✓ |
| Phân tích RIASEC + Big Five | — | ✓ | ✓ | ✓ |

---

## Hướng dẫn cài đặt

### Yêu cầu hệ thống

| Phần mềm | Phiên bản | Kiểm tra |
|---|---|---|
| **Docker Desktop** | Mới nhất | `docker --version` |
| **Python** | 3.11+ | `python --version` |
| **Node.js** | 18+ | `node --version` |

- RAM tối thiểu: **8GB** (khuyến nghị 16GB+)
- Dung lượng trống: **10GB+**

---

### Bước 1 — Khởi động Database

```bash
cd AI-Based-Career-Recommendation-System

# Khởi động PostgreSQL, Neo4j, Redis
docker compose --env-file apps/backend/.env up -d

# Kiểm tra trạng thái (chờ ~30 giây)
docker compose ps
```

**Import dữ liệu vào PostgreSQL:**

```bash
# Xóa DB cũ và tạo mới
docker compose exec -T postgres psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='career_ai';"
docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS career_ai;"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE career_ai;"

# Copy file dump vào container và import
docker compose cp db/backup/dev_snapshot_utf8.sql postgres:/tmp/dev_snapshot_utf8.sql
docker compose exec -T postgres psql -U postgres -d career_ai -v ON_ERROR_STOP=1 -f /tmp/dev_snapshot_utf8.sql

# Kiểm tra kết nối
docker compose exec redis redis-cli ping
curl http://localhost:7474
```

---

### Bước 2 — Chạy AI-Core Service (port 9000)

Mở **Terminal 1**:

```bash
cd packages/ai-core

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
pip install -e .

uvicorn src.api.main:app --reload --port 9000
```

---

### Bước 3 — Chạy Backend (port 8000)

Mở **Terminal 2**:

```bash
cd apps/backend

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
pip install -e ../../packages/ai-core
pip install sentence-transformers>=2.7.0 neo4j>=5.0.0
pip install beautifulsoup4 lxml fake-useragent
pip install PyPDF2==3.0.1 edge-tts

uvicorn app.main:app --reload --port 8000
```

---

### Bước 4 — Chạy Frontend (port 5173)

Mở **Terminal 3**:

```bash
cd apps/frontend

npm install
npm run dev
```

---

### Truy cập hệ thống

| Dịch vụ | URL |
|---|---|
| Ứng dụng chính | http://localhost:5173 |
| Backend API docs | http://localhost:8000/docs |
| AI-Core API docs | http://localhost:9000/docs |
| Neo4j Browser | http://localhost:7474 |
| PostgreSQL | localhost:5433 |

---

## Cấu hình môi trường

Tạo file `.env` trong thư mục `apps/backend/`:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_CORE_BASE=http://localhost:9000
ALLOWED_ORIGINS=http://localhost:5173
SECRET_KEY=your_secret_key

VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret

ZALOPAY_APP_ID=your_zalopay_app_id
ZALOPAY_KEY1=your_zalopay_key1
ZALOPAY_KEY2=your_zalopay_key2

GEMINI_API_KEY=your_gemini_api_key
```

---

## Hướng dẫn test thanh toán

Hệ thống tích hợp VNPay và ZaloPay ở chế độ **sandbox** để test.

### VNPay Sandbox (thẻ ATM nội địa NCB)

| Thông tin | Giá trị |
|---|---|
| Ngân hàng | NCB |
| Số thẻ | 9704198526191432198 |
| Tên chủ thẻ | NGUYEN VAN A |
| Ngày phát hành | 07/15 |
| Mã OTP | 123456 |

### ZaloPay Sandbox (thẻ Visa quốc tế)

| Thông tin | Giá trị |
|---|---|
| Số thẻ | 4111111111111111 |
| Tên chủ thẻ | NGUYEN VAN A |
| Ngày hết hạn | 06/26 |
| Mã CVV | 123 |

---

## Liên hệ

Mọi thắc mắc vui lòng liên hệ qua email: tranchitho160704@gmail.com