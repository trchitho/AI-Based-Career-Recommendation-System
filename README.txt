================================================================
THÔNG TIN NHÓM
================================================================
Mã nhóm   : C2SE.17
Tên đề tài: CareerVerse - Career Development Ecosystem Powered by AI Agents 

Thành viên:
  1. Phạm Tùng Dương
  2. Lê Thanh Thiện
  3. Nguyễn Công Thịnh
  4. Trần Chí Thọ
  5. Phạm Hoàng Thương

Mentor: Nguyễn Hải Minh 

================================================================
CÔNG NGHỆ SỬ DỤNG
================================================================
Backend  : Python 3.11+, FastAPI, SQLAlchemy
Frontend : Node.js 18+, ReactJS (Vite + TypeScript), TailwindCSS
Database : PostgreSQL (pgvector), Neo4j, Redis
AI/ML    : PyTorch, scikit-learn, FAISS, Sentence Transformers
Khác     : Docker, Docker Compose

================================================================
CÀI ĐẶT & CHẠY CHƯƠNG TRÌNH
================================================================

YÊU CẦU TRƯỚC KHI CÀI ĐẶT
---------------------------
  - Python 3.11 trở lên       : https://www.python.org/downloads/
  - Node.js 18 trở lên        : https://nodejs.org/
  - Docker & Docker Compose   : https://www.docker.com/
  - Git                       : https://git-scm.com/

BƯỚC 1 — Khởi động Database (PostgreSQL + Neo4j + Redis)
---------------------------------------------------------
  docker-compose up -d

  Chờ khoảng 30-60 giây để các service khởi động xong.

  Kiểm tra trạng thái:
    docker-compose ps

BƯỚC 2 — Cài đặt Backend
---------------------------------------------------------
  cd apps/backend

  Tạo môi trường ảo Python:
    python -m venv venv

  Kích hoạt môi trường ảo:
    Windows : venv\Scripts\activate
    Linux   : source venv/bin/activate

  Cài dependencies:
    pip install -r requirements.txt

  Cài Playwright (dùng cho crawl dữ liệu):
    playwright install chromium

  Tạo file cấu hình môi trường:
    Sao chép file .env.example thành .env và điền các thông tin cần thiết
    (API keys, database connection string, v.v.)

  Chạy backend:
    uvicorn app.main:app --reload --port 8000

  Backend chạy tại: http://localhost:8000
  API docs        : http://localhost:8000/docs

BƯỚC 3 — Cài đặt Frontend
---------------------------------------------------------
  cd apps/frontend

  Cài dependencies:
    npm install

  Chạy frontend (development):
    npm run dev

  Frontend chạy tại: http://localhost:5173

BƯỚC 4 — Truy cập hệ thống
---------------------------------------------------------
  Ứng dụng chính : http://localhost:5173
  API Backend    : http://localhost:8000/docs
  Neo4j Browser  : http://localhost:7474
  PostgreSQL     : localhost:5433

================================================================
CẤU TRÚC THƯ MỤC
================================================================
AI-Based-Career-Recommendation-System/
├── apps/
│   ├── backend/          # API server (FastAPI)
│   │   ├── app/
│   │   │   ├── api/      # Các router API
│   │   │   ├── core/     # Cấu hình, database, auth
│   │   │   ├── modules/  # Các module chức năng
│   │   │   ├── models/   # Database models
│   │   │   └── main.py   # Entry point
│   │   └── requirements.txt
│   └── frontend/         # Giao diện người dùng (React)
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── services/
│       │   └── main.tsx
│       └── package.json
└── packages/
    └── ai-core/          # Module AI & Machine Learning
        ├── src/          # Source code AI
        └── models/       # Model files đã train
================================================================