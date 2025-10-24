🧠 Hệ Thống Gợi Ý Nghề Nghiệp Cá Nhân Hóa Bằng Trí Tuệ Nhân Tạo

### AI-Based Career Recommendation System (RIASEC + Big Five + NLP Essay Inference)

---

## 📘 Tổng Quan

Đề tài xây dựng **hệ thống gợi ý nghề nghiệp cá nhân hóa** dựa trên:

* 🎯 Kết quả trắc nghiệm **RIASEC** (sở thích nghề nghiệp)
* 🧩 Trắc nghiệm **Big Five** (đặc điểm tính cách)
* 📝 Phân tích bài viết tự luận bằng mô hình **PhoBERT / vi-SBERT**
* ⚙️ Thuật toán **gợi ý kết hợp** (Neural Matrix Factorization + Reinforcement Learning)

Dự án được phát triển dưới dạng **monorepo** gồm 4 phần chính:

| Thành phần   | Công nghệ                    | Mô tả                               |
| ------------ | ---------------------------- | ----------------------------------- |
| **Frontend** | Next.js 14 + TailwindCSS     | Giao diện người dùng (UI)           |
| **Backend**  | FastAPI (Python)             | API, BFF (Backend-for-Frontend)     |
| **AI-Core**  | PhoBERT, vi-SBERT, NeuMF, RL | Mô hình xử lý ngôn ngữ & gợi ý nghề |
| **Infra**    | Docker, Postgres + pgvector  | Hạ tầng lưu trữ, vector database    |

---

## 🧩 Kiến Trúc Hệ Thống

```
Frontend (Next.js)
    ↓
BFF (FastAPI)
    ↓
Modules (Assessment / NLU / Retrieval / Recommendation)
    ↓
AI-Core (PhoBERT / vi-SBERT / NeuMF / RL)
    ↓
PostgreSQL + pgvector
```

**Frontend** chỉ giao tiếp với **BFF (Backend-for-Frontend)**,
BFF chịu trách nhiệm gom dữ liệu từ các **module** và **AI-Core**,
đảm bảo hệ thống dễ bảo trì và mở rộng.

---

## 🚀 Hướng Dẫn Chạy Dự Án (Development)

### 1️⃣ Chuẩn Bị Môi Trường

```bash
git clone https://github.com/trchitho/AI-Based-Career-Recommendation-System.git
cd AI-Based-Career-Recommendation-System
```

Sao chép file môi trường:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

---

### 2️⃣ Khởi chạy CSDL (Postgres + pgvector + pgAdmin)

* Đọc lại file README.md trong nhánh Database_SetUp để setting

---

### 3️⃣ Chạy Backend (FastAPI)

```bash
cd apps/backend
python -m venv .venv && .\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Kiểm tra:

* API Docs → [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health check → [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 4️⃣ Chạy Frontend (Vite React)

```bash
cd apps/frontend
npm i
npm run dev
```

Truy cập → [http://localhost:3000](http://localhost:3000)

Ghi chú kết nối FE ↔ BE (dev):
- Frontend chạy trên cổng 3000.
- Backend chạy trên cổng 8000.
- FE gọi API trực tiếp tới BE qua `VITE_API_URL` (mặc định `http://localhost:8000`).

---

## 📂 Cấu Trúc Thư Mục Monorepo

```
AI-Based-Career-Recommendation-System/
├─ apps/
│  ├─ frontend/          # Next.js 14 + Tailwind (App Router)
│  └─ backend/           # FastAPI modular monolith (BFF + modules)
│
├─ packages/
│  └─ ai-core/           # AI models & inference (PhoBERT, NeuMF, RL)
│
├─ infra/                # Docker Compose + SQL init + K8s manifests (khi nào deploy hay chạy bản prod chính thức sẽ dùng, hiện tại chỉ cần dùng trong nhánh Database_SetUp)
│
├─ .github/workflows/    # CI/CD pipelines
│
├─ CONTRIBUTING.md       # Quy tắc & hướng dẫn nhóm
└─ README.md             
```

---

## ⚙️ Môi Trường Cấu Hình

### Frontend (`apps/frontend/.env.example`)

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Backend (`apps/backend/.env.example`)

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_MODELS_DIR=packages/ai-core/models
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🧠 Mô Tả Thành Phần

### 🖥️ Frontend (Next.js + Tailwind)

* Giao diện người dùng: đăng nhập, làm trắc nghiệm, xem kết quả, đọc lộ trình nghề.
* Tổ chức theo hướng **Domain-First**: mỗi chức năng (feature) là 1 module riêng.

**Thư mục chính:**

```
apps/frontend/
├─ app/              # Routing (App Router)
├─ src/features/     # Các tính năng (assessment, results, careers,…)
├─ src/services/     # axios clients, BFF fetchers
├─ src/components/   # UI tái sử dụng (Card, Modal, Button,…)
└─ src/hooks/, src/lib/, src/types/
```

---

### ⚙️ Backend (FastAPI Modular)

* Cung cấp API và BFF (Backend-for-Frontend) cho giao diện web.
* Kiến trúc module hóa theo **Clean Architecture**.

**Thư mục chính:**

```
apps/backend/app/
├─ main.py             # Mount routers, cấu hình CORS, OpenAPI
├─ bff/                # Endpoint tương ứng UI
├─ modules/            # assessment, nlu, retrieval, recommendation
├─ core/               # DB session, logging, settings
├─ repositories/       # Adapter: Postgres / Neo4j / Elastic
└─ services/, tasks/, tests/
```

---

### 🤖 AI-Core

Chứa toàn bộ mô hình và mã nguồn xử lý AI:

```
packages/ai-core/
├─ src/          # NLP, Retrieval, Recommendation, RL
├─ configs/      # encode.yaml, nlp.yaml, schema.yaml
├─ models/       # PhoBERT, NeuMF checkpoints
└─ notebooks/    # Thử nghiệm, huấn luyện
```

> BE import trực tiếp `packages/ai-core` bằng `pip install -e ./packages/ai-core`.

---

### 🧱 Infra (Hạ tầng)

* `docker-compose.dev.yml`: chạy Postgres + pgvector + pgAdmin + backend/frontend.
* `sql/`: chứa script khởi tạo bảng, index vector.
* `k8s/`: manifest cho Kubernetes (dự kiến triển khai sau MVP).

---

### 🔄 CI/CD

Tích hợp qua **GitHub Actions**:

| Workflow                 | Mục đích                             |
| ------------------------ | ------------------------------------ |
| `fe-ci.yml`              | Kiểm tra lint + build FE             |
| `be-ci.yml`              | Kiểm tra ruff + black + pytest BE    |
| `integration.yml`        | Kiểm tra contract FE ↔ BFF (OpenAPI) |
| `infra-ci.yml` (sắp tới) | Build & test Docker Compose          |

---

## 🌱 Quy Trình Phát Triển

### 1️⃣ Skeleton (hoàn tất)

* Nhánh `feat/fe-skeleton` → cấu trúc FE
* Nhánh `feat/be-skeleton` → cấu trúc BE
* Merge vào `main` theo kiểu **Squash & Merge**

### 2️⃣ Làm Tính Năng (Feature Branch)

```bash
git checkout main
git pull
git checkout -b feat/<tên-tính-năng>

# Code...
git add .
git commit -m "feat(fe): add assessment UI"
git push -u origin feat/<tên-tính-năng>
```

Sau đó tạo PR → review → merge ≤ 2–3 ngày/lần.

---

## 🧭 Luồng Hoạt Động Hệ Thống

1. **Người dùng** hoàn thành trắc nghiệm RIASEC và Big Five trên giao diện web.
2. **FE (Next.js)** gửi kết quả tới **BFF (FastAPI)**.
3. **BFF** gọi các module:

   * `assessment`: chấm điểm RIASEC + Big Five
   * `nlu`: phân tích bài luận bằng PhoBERT
   * `retrieval`: truy vấn vector nghề (pgvector)
   * `recommendation`: gợi ý nghề phù hợp (NeuMF / RL)
4. **Kết quả** được tổng hợp và trả lại FE để hiển thị biểu đồ + mô tả nghề.


---

## 🔐 Quản Lý Quyền (Admin vs User)

- Tạo admin lần đầu (không cần admin sẵn):
  - Đặt biến môi trường `ADMIN_SIGNUP_SECRET` trong `apps/backend/.env`.
  - Gọi API `POST /api/auth/register-admin` với payload:
    - `{ "email": "...", "password": "...", "full_name": "...", "admin_signup_secret": "<trùng ADMIN_SIGNUP_SECRET>" }`
  - Backend trả `access_token` role `admin`.

- Cấp/bỏ quyền admin cho tài khoản khác (chỉ admin được phép):
  - API: `PATCH /api/users/{user_id}/role` với body `{ "role": "admin" | "user" }`

- Bảo vệ API quản trị:
  - Các endpoint dưới `/api/admin/*` yêu cầu token có `role=admin`.
  - Nếu không phải admin → 403.

---

## 🗄️ DB Migration: app_settings

- Đã thêm migration tạo bảng `core.app_settings` để lưu thông tin thương hiệu (logo_url, app_title, app_name, footer_html).
- File: `db/AI-Based-Career-Recommendation-System/db/migrations/19-10-2025_create_table_app_settings.sql`
- Sau khi áp dụng, có thể cập nhật/đọc qua các API admin `/api/admin/settings`.

---

## 🧪 Postman Collection (Admin)

- Collection mẫu: `test/AI-Based-Career-Recommendation-System/postman/admin_api_collection.json`
- Biến sẵn có:
  - `baseUrl` mặc định `http://localhost:8000`
  - `token` (điền access_token của admin sau khi login)
- Bao gồm các request: đăng ký admin, login, users (list/create/update), settings (get/update), careers/questions CRUD.

---

## 🧰 Seed Dữ Liệu & Backup

- Seed lõi (forms/questions VI, careers mẫu, settings):
  - `db/AI-Based-Career-Recommendation-System/db/migrations/20-10-2025_seed_core_data.sql`
- Seed bổ sung bản EN cho RIASEC/Big Five:
  - `db/AI-Based-Career-Recommendation-System/db/migrations/20-10-2025_seed_assessments_en.sql`
- Import backup SQL vào DB (đặt search_path phù hợp):
  - `powershell -ExecutionPolicy Bypass -File db/AI-Based-Career-Recommendation-System/scripts/restore_backup.ps1 -File "<path-to-dump>.sql" -Schema core`
- Seed số lượng lớn từ JSON (careers/ksas/forms):
  - `python -m app.scripts.seed_bulk --careers data/careers.json --ksas data/ksas.json --form data/riasec_vi.json`

---

## 🔎 Search & Graph & Recommendation

- Search (ElasticSearch)
  - ENV: `ES_URL`, `ES_USER`, `ES_PASS` (tuỳ chọn)
  - Reindex: `POST /api/search/reindex`
  - Tìm kiếm: `GET /api/search/careers?q=...&limit=20`
  - Nếu ES chưa cấu hình, API fallback Postgres LIKE.

- Graph (Neo4j)
  - ENV: `NEO4J_URL`, `NEO4J_USER`, `NEO4J_PASS`
  - Đồng bộ Career nodes: `POST /api/graph/sync/careers`
  - Đồng bộ quan hệ Career–Skill từ KSAs: `POST /api/graph/sync/career-skills`

- Recommendation API (AI Layer)
  - ENV: `AI_SERVICE_URL` (ví dụ `http://localhost:9000`)
  - Gọi: `POST /api/recommendations/generate` → gửi scores/essay đến AI; fallback trả danh sách gợi ý giả lập nếu AI vắng mặt.

---

## 👥 Team Setup: Run Backend & Frontend

This is the shortest, proven path for any teammate to pull the repo and get the app running locally.

### 1) Requirements
- Windows 10/11 (PowerShell), Git
- Python 3.11+, Node.js 18+ (npm)
- PostgreSQL 14+ (local or Docker)

### 2) Clone the repo
```
git clone <repo>
cd AI-Based-Career-Recommendation-System
```

### 3) Database (PostgreSQL)
Option A — Local Postgres (recommended)
- Create a database UTF‑8 named `career_ai` (port 5433 in examples below)
- Apply migrations + seed core data:
```
powershell -ExecutionPolicy Bypass -File db/AI-Based-Career-Recommendation-System/scripts/apply_latest_migrations.ps1
```

Option B — Import backup (UTF‑8 safe)
```
powershell -ExecutionPolicy Bypass -File db/AI-Based-Career-Recommendation-System/scripts/restore_backup.ps1 -File "db/AI-Based-Career-Recommendation-System/db/backup/dev_snapshot.sql" -Schema core
```
The import script forces UTF‑8 so Vietnamese text is preserved.

### 4) Backend (FastAPI)
```
cd apps/backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
# Enable WebSocket realtime (required by /ws/notifications)
pip install "uvicorn[standard]"

# Create apps/backend/.env
# Example:
# DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
# ALLOWED_ORIGINS=http://localhost:3000
# ADMIN_SIGNUP_SECRET=dev-secret

uvicorn app.main:app --reload --port 8000
```
Health: http://127.0.0.1:8000/health

### 5) Frontend (Vite + React + TypeScript)
```
cd apps/frontend
npm i
npm run dev
```
Dev server: http://localhost:3000 (Vite proxies `/api` → http://localhost:8000)

Optional FE env (only if you want to bypass proxy):
```
# apps/frontend/.env
VITE_API_URL=http://localhost:8000
```

### 6) First admin account (same hashing as register)
Option A — Register via API (pbkdf2):
```
POST http://localhost:8000/api/auth/register-admin
{ "email":"admin@site.com", "password":"Admin12345", "full_name":"Administrator", "admin_signup_secret":"dev-secret" }
```
Option B — Script to set admin password (pbkdf2):
```
cd apps/backend
.\.venv\Scripts\python -m app.scripts.set_admin_password --email admin@site.com --password Admin12345 --create
```

### 7) Where to start in the app
- User (role user): `/assessment` to start the tests → `/results/:id`
- Essay: `/essay`, Recommendations: `/recommendations` (fallback if AI not configured)
- Admin (role admin): `/admin` → manage Users, Settings (logo/title/footer), Careers/Skills/Questions, Blog/Comments

---
## 🚀 Quick Start (Development)

1) Prerequisites
- Windows 10/11 (PowerShell), Git
- Python 3.11+, Node.js 18+ (npm), PostgreSQL 14+ (hoặc Docker)

2) Clone & cấu trúc
```
git clone <repo>
cd AI-Based-Career-Recommendation-System
```

3) Database (PostgreSQL)
- Tạo DB `career_ai` (UTF‑8). Hoặc dùng folder `db/AI-Based-Career-Recommendation-System/docker-compose.yml` (nếu có).
- Chạy migrations + seed:
```
powershell -ExecutionPolicy Bypass -File db/AI-Based-Career-Recommendation-System/scripts/apply_latest_migrations.ps1
```
- (Tuỳ chọn) Import backup UTF‑8:
```
powershell -ExecutionPolicy Bypass -File db/AI-Based-Career-Recommendation-System/scripts/restore_backup.ps1 -File "db/AI-Based-Career-Recommendation-System/db/backup/dev_snapshot.sql" -Schema core
```

4) Backend (FastAPI)
```
cd apps/backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
# Bật WebSocket backend để realtime hoạt động
pip install "uvicorn[standard]"
# ENV (apps/backend/.env) ví dụ:
# DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
# ALLOWED_ORIGINS=http://localhost:3000
uvicorn app.main:app --reload --port 8000
```

5) Frontend (Vite + React)
```
cd apps/frontend
npm i
npm run dev
# http://localhost:3000 (proxy API sang http://localhost:8000)
```

6) Tài khoản admin (pbkdf2 – giống đăng ký)
- Cách A: tạo bằng API `register-admin` (yêu cầu .env có `ADMIN_SIGNUP_SECRET`):
```
POST http://localhost:8000/api/auth/register-admin
{ "email":"admin@site.com", "password":"Admin12345", "full_name":"Administrator", "admin_signup_secret":"<secret>" }
```
- Cách B: script đặt mật khẩu bằng hàm hash của app:
```
cd apps/backend
.\.venv\Scripts\python -m app.scripts.set_admin_password --email admin@site.com --password Admin12345 --create
```

7) Làm bài test / Kết quả
- RIASEC/Big Five: `/assessment` → submit → `/results/:id`.
- Essay: `/essay` gửi bài luận; Recommendation: `/recommendations` (fallback nếu chưa có AI layer).

8) Admin UI (role=admin)
- `/admin` quản trị Users, Settings (logo/title/footer), Careers/Skills/Questions, Blog/Comments (API đã có; UI sẽ tiếp tục mở rộng).

---

## ⚙️ ENV Templates

- Backend `apps/backend/.env` ví dụ:
```
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
ALLOWED_ORIGINS=http://localhost:3000
ADMIN_SIGNUP_SECRET=dev-secret
ES_URL=
NEO4J_URL=
AI_SERVICE_URL=
```

- Frontend `apps/frontend/.env` (dev proxy Vite đã cấu hình, tuỳ chọn):
```
VITE_API_URL=http://localhost:8000
```

---

## 🧰 Troubleshooting

- WebSocket 404 / “No supported WebSocket library detected”: cài `pip install "uvicorn[standard]"` rồi khởi động lại backend.
- Login 403 sau khi seed SQL: nếu seed bằng bcrypt/pgcrypto → cài `pip install bcrypt` hoặc đặt lại mật khẩu bằng script `set_admin_password` để dùng pbkdf2.
- Tiếng Việt hiển thị sai: dùng script import UTF‑8 (`restore_backup.ps1`), DB `SERVER_ENCODING=UTF8`, `CLIENT_ENCODING=UTF8`. Nếu dữ liệu đã “??”, xoá và import lại UTF‑8.
- Assessments trả rỗng: seed forms/questions; DB dùng `form_type='RIASEC'` và `form_type='BigFive'` (API đã map `BIG_FIVE → BigFive`).


---

## 🖼️ FE: App Settings

- FE gọi `/api/app/settings` khi khởi động để hiển thị logo/title/footer.
- Context: `src/contexts/AppSettingsContext.tsx`
- Đã render trong header/footer: `src/components/layout/MainLayout.tsx`

---

> **Đề tài Nghiên cứu khoa học sinh viên – Đại học Duy Tân 2025**
> Hệ thống gợi ý nghề nghiệp cá nhân hóa bằng trí tuệ nhân tạo
> *(AI-Based Career Recommendation System)*

---
