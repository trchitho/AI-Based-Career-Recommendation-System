================================================================================
                    HỆ THỐNG GỢI Ý NGHỀ NGHIỆP DỰA TRÊN AI
                        HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG
================================================================================

MÔ TẢ DỰ ÁN
================================================================================
Hệ thống gợi ý nghề nghiệp cá nhân hóa sử dụng trí tuệ nhân tạo, được xây dựng 
theo kiến trúc monorepo với Frontend (React/Vite), Backend (FastAPI) và AI-Core 
(PhoBERT, vi-SBERT, NeuMF).

YÊU CẦU HỆ THỐNG
================================================================================
Trước khi cài đặt, đảm bảo máy tính đã có các phần mềm sau:

1. Docker Desktop (BẮT BUỘC)
   - Windows: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
   - macOS: https://desktop.docker.com/mac/main/amd64/Docker.dmg
   - Linux: https://docs.docker.com/engine/install/
   - Kiểm tra: docker --version && docker compose --version

2. Python 3.11+ (BẮT BUỘC)
   - Windows: https://www.python.org/downloads/windows/
   - macOS: brew install python@3.11
   - Linux: sudo apt install python3.11 python3.11-venv python3-pip
   - Kiểm tra: python --version

3. Node.js 18+ (BẮT BUỘC)
   - Tất cả OS: https://nodejs.org/en/download/
   - Hoặc dùng nvm: nvm install 18 && nvm use 18
   - Kiểm tra: node --version && npm --version

4. Git (KHUYẾN NGHỊ)
   - Windows: https://git-scm.com/download/win
   - macOS: brew install git
   - Linux: sudo apt install git
   - Kiểm tra: git --version

5. Dung lượng ổ cứng: Tối thiểu 5GB, khuyến nghị 10GB+
6. RAM: Tối thiểu 8GB, khuyến nghị 16GB+

HƯỚNG DẪN CÀI ĐẶT
================================================================================

BƯỚC 1: KHỞI TẠO DATABASE
-------------------------
Mở terminal và chạy các lệnh sau:

cd AI-Based-Career-Recommendation-System
docker compose down -v
docker compose up -d

# Đá hết connection đang giữ DB
docker compose exec -T postgres psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='career_ai';"

# Xoá DB cũ và tạo mới
docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS career_ai;"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE career_ai;"

# Copy file dump vào container
docker compose cp db/backup/dev_snapshot_utf8.sql postgres:/tmp/dev_snapshot_utf8.sql

# Import vào DB
docker compose exec -T postgres psql -U postgres -d career_ai -v ON_ERROR_STOP=1 -f /tmp/dev_snapshot_utf8.sql

BƯỚC 2: CÀI ĐẶT VÀ CHẠY CÁC SERVICE
------------------------------------
Cần mở 3 terminal để chạy đồng thời 3 service:

TERMINAL 1: AI-Core Service (port 9000)
cd packages/ai-core
pip install sqlalchemy
pip install -r requirements.txt
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install uvicorn
pip install -e .
uvicorn src.api.main:app --reload --port 9000

TERMINAL 2: Backend (port 8000)
cd apps/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
pip install -e ../../packages/ai-core
uvicorn app.main:app --reload --port 8000

TERMINAL 3: Frontend (port 3000)
cd apps/frontend
npm install
npm run dev

BƯỚC 3: TRUY CẬP ỨNG DỤNG
-------------------------
Sau khi chạy xong tất cả service, truy cập:
http://localhost:3000


TEST THANH TOÁN
================================================================================

VNPAY SANDBOX:
- Ngân hàng: NCB
- Số thẻ: 9704198526191432198
- Tên chủ thẻ: NGUYEN VAN A
- Ngày phát hành: 07/15
- Mã OTP: 123456

ZALOPAY SANDBOX:
- Loại thẻ: Visa
- Số thẻ: 4111111111111111
- Tên chủ thẻ: NGUYEN VAN A
- Ngày hết hạn: 06/26
- Mã CVV: 123


CÔNG CỤ VÀ CÔNG NGHỆ SỬ DỤNG
================================================================================

FRONTEND TOOLS:
- React 18: Thư viện UI chính
- Vite: Build tool và dev server
- Tailwind CSS: Framework CSS utility-first
- React Router: Routing cho SPA
- Axios: HTTP client
- TypeScript: Type safety

BACKEND TOOLS:
- FastAPI: Python web framework
- SQLAlchemy: ORM cho database
- PostgreSQL: Cơ sở dữ liệu chính
- pgvector: Vector database extension
- JWT: Authentication
- Uvicorn: ASGI server
- Pydantic: Data validation

AI-CORE TOOLS:
- PhoBERT: Vietnamese BERT model
- vi-SBERT: Vietnamese Sentence-BERT
- NeuMF: Neural Matrix Factorization
- FAISS: Vector similarity search
- Transformers: Hugging Face library
- PyTorch: Deep learning framework

DATABASE TOOLS:
- PostgreSQL 15+: Main database
- pgvector: Vector similarity search
- Docker: Containerization

PAYMENT TOOLS:
- VNPay: Vietnamese payment gateway
- ZaloPay: Vietnamese e-wallet

DEVELOPMENT TOOLS:
- Docker Desktop: Container management
- Git: Version control
- Python 3.11+: Backend language
- Node.js 18+: Frontend runtime
- npm: Package manager



KIẾN TRÚC HỆ THỐNG
================================================================================
Frontend (React + Vite) → Backend (FastAPI BFF) → AI-Core (PhoBERT/vi-SBERT) → PostgreSQL + pgvector

LIÊN HỆ HỖ TRỢ
================================================================================
Email: tranchitho160704@gmail.com

GHI CHÚ QUAN TRỌNG
================================================================================
- Đảm bảo Docker Desktop đang chạy trước khi khởi động database
- Chạy đúng thứ tự: Database → AI-Core → Backend → Frontend
- Kiểm tra port không bị xung đột (3000, 8000, 9000, 5433)
- AI models cần thời gian tải lần đầu, hãy kiên nhẫn
- Nếu gặp lỗi, kiểm tra log trong terminal tương ứng

================================================================================
                            CHÚC BẠN SỬ DỤNG THÀNH CÔNG!
================================================================================