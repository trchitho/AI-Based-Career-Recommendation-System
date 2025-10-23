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
python -m venv .venv ; .\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Kiểm tra:

* API Docs → [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health check → [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 4️⃣ Chạy Frontend (Next.js)

```bash
cd apps/frontend
npm i
npm run dev
```

Truy cập → [http://localhost:3000](http://localhost:3000)

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

### 🔄 CI/CD

Tích hợp qua **GitHub Actions**:

| Workflow                 | Mục đích                             |
| ------------------------ | ------------------------------------ |
| `fe-ci.yml`              | Kiểm tra lint + build FE             |
| `be-ci.yml`              | Kiểm tra ruff + black + pytest BE    |
| `integration.yml`        | Kiểm tra contract FE ↔ BFF (OpenAPI) |

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

> **Đề tài Nghiên cứu khoa học sinh viên – Đại học Duy Tân 2025**
> Hệ thống gợi ý nghề nghiệp cá nhân hóa bằng trí tuệ nhân tạo
> *(AI-Based Career Recommendation System)*

---
