# 🧠 AI-Based Career Recommendation System

### *(Hệ thống gợi ý nghề nghiệp cá nhân hóa bằng trí tuệ nhân tạo)*

Monorepo gồm **Frontend (React/Vite)**, **Backend (FastAPI – BFF)** và **AI-Core (PhoBERT · vi-SBERT · NeuMF · Bandit)**.
Backend chỉ giao tiếp với Frontend qua **BFF**; mọi logic AI tách ra thành **AI-Core service riêng**.

---

# 1) Tổng quan

Hệ thống gợi ý nghề nghiệp dựa trên nhiều nguồn dữ liệu:

* **RIASEC** & **Big Five** (từ bài test)
* **Essay analysis** (PhoBERT/vi-SBERT)
* **Career embeddings** (pgvector 768D)
* **Ranking** bằng **NeuMF/MLP**
* **Online re-ranking** bằng **Thompson Sampling (Bandit)**

**Luồng xử lý tổng quát**

```
Frontend (React + Vite SPA)
        ↓ via /bff/*
Backend (FastAPI BFF + Modules)
        ↓
AI-Core API (PhoBERT · vi-SBERT · NeuMF · RL)
        ↓
PostgreSQL + pgvector + (Neo4j optional)
```

---

# 2) Kiến trúc monorepo

```
AI-Based-Career-Recommendation-System/
├─ apps/
│  ├─ backend/          # FastAPI (BFF + modules)
│  └─ frontend/         # React + Vite SPA (components, pages, services)
├─ packages/
│  └─ ai-core/          # AI service (API riêng port 9000)
├─ .github/workflows/   # FE / BE / AI CI pipelines
└─ README.md
```

**Nhánh `chore/ai-core-merge`** hợp nhất toàn bộ mã nguồn AI-core cũ → `packages/ai-core`.

---

# 3) Thành phần chi tiết

## 3.1 Frontend (React + Vite + Tailwind)

* SPA dùng **React Router**
* Các service gọi API qua `src/services/*`
* Components chia domain: `assessment`, `results`, `dashboard`, `profile`, `roadmap`, `admin`
* Contexts: Auth, Theme, Settings, Socket
* Các trang (pages) map 1–1 với BFF

**ENV (FE)**

```
VITE_API_BASE=http://localhost:8000
```

---

## 3.2 Backend (FastAPI Modular + BFF)

**Cấu trúc BE**

```
apps/backend/app/
├─ main.py
├─ bff/
│   ├─ router.py    # endpoint theo màn hình FE
│   └─ dto.py       # kiểu trả về cho FE
├─ core/
│   config.py · db.py · jwt.py · security.py
├─ modules/
│   auth/ users/ assessments/ content/
│   recommendation/ search/ graph/ nlu/ retrieval/
│   realtime/ notifications/ admin/ system/
├─ scripts/
│   create_admin.py · seed_bulk.py
└─ tests/
```

**Backend xử lý:**

* Validate & chuẩn hóa dữ liệu
* Điều phối AI-Core
* Gọi pgvector search
* Trả DTO gọn cho FE

**ENV (BE)**

```
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_CORE_BASE=http://localhost:9000
ALLOWED_ORIGINS=http://localhost:5173
```

---

## 3.3 AI-Core (API Service)

AI-Core chạy độc lập như một **service riêng** (port 9000):

```
packages/ai-core/
├─ src/ai_core/
│   ├─ nlp/              # PhoBERT/essay_infer
│   ├─ retrieval/        # pgvector + FAISS
│   ├─ recsys/neumf/     # train/infer ranking
│   ├─ training/         # dataset + regression
│   ├─ utils/
│   └─ ...
└─ src/api/
    ├─ main.py           # API FastAPI
    ├─ routes_traits.py
    ├─ routes_retrieval.py
    └─ config.py
```

**AI-Core cung cấp:**

* `/traits/infer` → RIASEC / BigFive từ essay
* `/retrieval/search_vec` → cosine search pgvector
* `/rank/infer` → điểm NeuMF
* Hỗ trợ training, encode corpus, seed dữ liệu

---

# 4) Database (PostgreSQL + pgvector)

**Các nhóm bảng chính**

* `core.users`, `core.assessments`, `core.essays`
* `core.careers` + 20 bảng phụ (tags/ksas/tasks/etc.)
* `ai.career_embeddings` (vector 768D)
* `ai.user_embeddings`
* `ai.retrieval_jobs_visbert`

**pgvector**

* cosine distance
* IVF index (tùy chọn)
* stored embeddings

---

# 5) Hướng dẫn chạy (3 terminal – bản chuẩn nhánh `chore/ai-core-merge`)

## 🖥 **Terminal 1 – AI-Core Service (port 9000)**

```bash
cd packages/ai-core
pip install -r requirements.txt
python -m venv .venv
. .venv/Scripts/activate
pip install uvicorn
uvicorn src.api.main:app --reload --port 9000
```

---

## 🖥 **Terminal 2 – Backend FastAPI (port 8000)**

```bash
cd apps/backend
python -m venv .venv
. .venv/Scripts/activate

pip install -r requirements.txt

# nếu cần development mode cho AI-core
pip install -e ../../packages/ai-core

uvicorn app.main:app --reload --port 8000
```

---

## 🖥 **Terminal 3 – Frontend (port 5173)**

```bash
cd apps/frontend
npm install
npm run dev
```

---

# 6) CI / Code style

**FE:** eslint + prettier
**BE:** ruff + black + pytest
**AI-Core:** python-ci workflow

---

# 7) Ghi chú quan trọng cho nhánh `chore/ai-core-merge`

* Đây là **nhánh hợp nhất AI-core vào monorepo** (theo subtree workflow).
* AI không còn phát triển ở nhánh `AI` cũ → mọi code AI nằm ở `packages/ai-core`.
* Backend và Frontend được cập nhật để gọi AI-Core API qua `http://localhost:9000`.
* Đảm bảo đồng bộ:

  * `apps/backend/app/services/ai_client.py`
  * `apps/frontend/src/services/traitsService.ts`
  * `apps/frontend/src/services/retrievalService.ts` (nếu có)

---

# 8) Định hướng tiếp theo

* Hoàn thiện **Bandit Online**
* Tích hợp **Neo4j explainability**
* Chuẩn hóa BFF contract
* Kết nối frontend App Router (nếu cần)
* Tối ưu pipeline encode + pgvector refresh

---
