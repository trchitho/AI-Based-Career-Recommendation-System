🧠 AI-Based Career Recommendation System

*(Hệ thống gợi ý nghề nghiệp cá nhân hóa bằng trí tuệ nhân tạo)*

## 1) Tổng quan

Hệ thống gợi ý nghề dựa trên:

* Kết quả trắc nghiệm **RIASEC** và **Big Five**,
* Phân tích **essay** bằng **PhoBERT / vi-SBERT**,
* **Gợi ý kết hợp** với **NeuMF** và **online bandit (RL)**.

**Kiến trúc:** Monorepo gồm Frontend (Next.js), Backend (FastAPI – BFF + modules), và AI-Core (mô hình, embed, ranking). Frontend chỉ gọi **BFF**; BFF điều phối giữa modules/AI-Core/DB để trả về DTO đúng UI.

---

## 2) Kiến trúc tổng thể

```
Frontend (Next.js + Tailwind)
    ↓ via /bff/*
Backend (FastAPI BFF)
    ↓
Modules: assessment · nlu · retrieval · recommendation · search · auth · content
    ↓
AI-Core: PhoBERT (RIASEC/BigFive) · vi-SBERT (retrieval) · NeuMF/MLP (ranking) · Bandit (RL)
    ↓
PostgreSQL + pgvector  ·  (Neo4j/ElasticSearch khi cần)
```

* **BFF** gom dữ liệu theo màn hình FE, giảm số call và ẩn phức tạp backend.
* **AI-Core** cung cấp: chuẩn hóa dữ liệu, train PhoBERT, sinh embedding vi-SBERT, nạp **pgvector**, rank bằng **NeuMF**, online re-rank bằng **Thompson Sampling**.

---

## 3) Cấu trúc monorepo hiện tại (không có `infra/`)

```
AI-Based-Career-Recommendation-System/
├─ apps/
│  ├─ backend/   # FastAPI (BFF + modules)
│  └─ frontend/  # Next.js (App/Pages + services)
├─ packages/
│  └─ ai-core/   # PhoBERT · vi-SBERT · NeuMF · RL · retrieval/pgvector
├─ .github/workflows/   # fe-ci.yml · be-ci.yml · integration.yml
└─ README.md / CONTRIBUTING.md
```

* Cấu trúc modules/routers BE và cây FE chi tiết bạn đã thiết kế (bên dưới).
* AI-Core chứa toàn bộ mã nguồn, dữ liệu, script encode, load **pgvector**, test.

> **Lưu ý:** Mọi thứ liên quan **DB/compose/scripts** đặt ở nhánh: `setup/database-env`. Xem:
> `https://github.com/trchitho/AI-Based-Career-Recommendation-System/tree/setup/database-env`

---

## 4) Thành phần chi tiết

### 4.1 Frontend (Next.js + Tailwind)

* **Tổ chức domain-first**: `components/`, `pages/`, `services/`, `types/`, `contexts/`.
* **Router**: hiện tại theo **pages**; có thể chuyển dần sang **App Router** khi ổn định.
* **Services** chia theo nghiệp vụ: `assessmentService.ts`, `careerService.ts`, `recommendationService.ts`, …

Các thư mục/chức năng đã có:

```
apps/frontend/src/
  components/(assessment|results|dashboard|roadmap|admin|layout)/*
  contexts/(Auth|Socket|Theme|AppSettings).tsx
  pages/(Home|Assessment|EssayInput|Results|Careers|CareerDetail|Profile|Recommendations|Roadmap|Admin/*)
  services/*.ts
  types/*.ts
```

→ Phần này map 1-1 với BFF endpoints và modules ở BE (bảng ở 4.2).

**ENV (FE)**

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

(Đặt trong `apps/frontend/.env.local` – ví dụ.)

---

### 4.2 Backend (FastAPI Modular + BFF)

Cây thư mục đã có:
`app/main.py`, `app/bff/{router.py,dto.py}`, `app/core/{config.py,db.py,jwt.py,security.py}`, `app/modules/*`…

**Các modules đang khai báo**

* `auth`, `users`, `assessments/assessment`, `content` (blog/careers/comments), `recommendation`, `search` (ES client), `graph` (Neo4j), `realtime` (WebSocket), `notifications`, `system`, `admin`, `nlu`, `retrieval` (khởi tạo).

**BFF endpoints (đề xuất/chuẩn hóa theo UI)**

* `POST /bff/assessment/submit` → chấm & lưu RIASEC/BigFive.
* `POST /bff/nlu/essay:analyze` → gọi AI-Core PhoBERT suy luận + (opt) essay_emb.
* `GET /bff/search/careers?q=&k=` → truy vấn **pgvector** trong Postgres.
* `POST /bff/recommend/rank` → NeuMF/MLP + (opt) bandit cho Top-K.
* `GET /bff/catalog/career/:id` → chi tiết nghề (DB + Neo4j).

**ENV (BE) – ví dụ**

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_MODELS_DIR=packages/ai-core/models
ALLOWED_ORIGINS=http://localhost:3000
```

(Các biến về DB/pgvector/Neo4j… theo hướng dẫn trong nhánh `setup/database-env`.)

**Tích hợp AI-Core**

```bash
pip install -e ./packages/ai-core   # BE import trực tiếp ai_core
```

* `modules/nlu` gọi PhoBERT; `modules/retrieval` gọi truy vấn **pgvector**; `modules/recommendation` gọi NeuMF/MLP.

---

## 5) Database schema & Retrieval (PostgreSQL + pgvector)

**Thiết kế**: 24 bảng `core` + 3 bảng `ai` (vector 768d), bám sát O*NET và nghiệp vụ hệ thống.

* `core.users`, `assessments`, `assessment_forms/questions/responses`, `essays`, `careers` (+ tags/ksas/tasks/technology/prep/wages/outlook/interests), `blog_posts/comments/reactions`, `audit_logs`…
* `ai.retrieval_jobs_visbert`, `ai.career_embeddings`, `ai.user_embeddings` (IVF + cosine).

**Lưu ý quan trọng**

* **pgvector** thay cho FAISS file-based: đồng nhất dữ liệu, dễ backup/restore, truy vấn bằng SQL, vẫn nhanh ở mức ms–tens-ms.
* Script **encode_jobs / pgvector_load / search_pgvector** nằm trong `packages/ai-core/src/...`.

> Toàn bộ **hướng dẫn cài DB, tạo EXTENSION, seed dữ liệu, chỉ mục vector** đã được đặt ở **nhánh** `setup/database-env` (README, compose, SQL init). Hãy theo nhánh này để dựng môi trường DB cục bộ.

---

## 6) AI-Core: Pipeline & mô-đun chính

* **Chuẩn hóa dữ liệu → silver labels** (kết hợp điểm test + centroid nghề).
* **Train PhoBERT (RIASEC/BigFive)** – regression head (masked MSE).
* **Sinh embeddings vi-SBERT** và **nạp pgvector**.
* **Ranking NeuMF/MLP** + **online bandit** cho re-rank theo CTR.
* **Neo4j** để sinh roadmap/kỹ năng/khóa học (explainability).

---

## 7) Hướng dẫn chạy (Dev)

### Bước 1 — Clone & ENV

```bash
git clone https://github.com/trchitho/AI-Based-Career-Recommendation-System.git
cd AI-Based-Career-Recommendation-System

# FE
cp apps/frontend/.env.example apps/frontend/.env.local
# BE
cp apps/backend/.env.example apps/backend/.env
```

(Điền biến DB theo nhánh `setup/database-env`.)

### Bước 2 — Dựng CSDL (tham khảo nhánh DB)

* Làm theo hướng dẫn tại:
  `setup/database-env` → cài Postgres, bật **pgvector**, tạo DB/schema, seed dữ liệu.

### Bước 3 — Chạy Backend

```bash
cd apps/backend
python -m venv .venv && source .venv/bin/activate  # (Windows: .\.venv\Scripts\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

* Docs: `http://127.0.0.1:8000/docs` (Swagger), health: `/health`.

### Bước 4 — Chạy Frontend

```bash
cd apps/frontend
npm i
npm run dev
```

* Mở: `http://localhost:3000`

---

## 8) CI/CD & Quy ước

* **GitHub Actions**: `fe-ci.yml` (eslint+build), `be-ci.yml` (ruff+black+pytest), `integration.yml` (contract FE↔BFF).
* **Branching**: `main` bảo vệ; làm việc trên feature branches ngắn; AI phát triển trên nhánh `AI` rồi gộp vào `packages/ai-core`.
* **Coding style**: FE (eslint+prettier), BE (ruff+black), chỉ commit `.env.example`.

---

## 9) Phụ lục: Cây mã nguồn chi tiết (đang có)

### Backend (từ `apps/backend/app`)

```
main.py
bff/{router.py,dto.py}
core/{config.py,db.py,jwt.py,security.py}
modules/
  admin/ routes_admin.py
  auth/  routes_google.py · routes_tokens.py · models.py
  users/ routers_users.py · router_auth.py · service.py · repository.py · models.py
  content/ routes_{blog,careers,comments}.py · service_careers.py · models.py
  assessments/ routes_assessments.py · service.py · models.py
  recommendation/ routes_recommendations.py · service.py
  search/ es_client.py · routes_search.py
  graph/ neo4j_client.py · routes_graph.py
  realtime/ ws_notifications.py
  notifications/ routes_notifications.py · models.py
  nlu/  (khởi tạo)      retrieval/ (khởi tạo)
system/ routes_public.py
scripts/ create_admin.py · seed_bulk.py
tests/  test_sample.py
```

### Frontend (từ `apps/frontend/src`)

```
components/(assessment|results|dashboard|roadmap|admin|layout)/*
contexts/(Auth|Socket|Theme|AppSettings).tsx
pages/(Home|Assessment|EssayInput|Results|Careers|CareerDetail|Profile|Recommendations|Roadmap|
       Login|Register|ForgotPassword|ResetPassword|VerifyEmail|OAuthCallback|
       Admin/* dashboards)
services/*.ts
types/*.ts
```

### AI-Core (rút gọn)

```
packages/ai-core/
  src/{nlp,retrieval,training,recsys,utils,api}
  data/{catalog,raw,processed,nlp,embeddings}
  models/{riasec_phobert,big5_phobert,vi_sbert}
  tests/*  tools/*  configs/*
```

---

## 10) DB design & dữ liệu mẫu

* ERD và ràng buộc 24 bảng `core` (users, assessments, essays, careers + nhóm O*NET, blog/comments/reactions…) và 3 bảng `ai` đã mô tả đầy đủ.
* Có **bộ dữ liệu mẫu** cho toàn bộ bảng để seed/dev test.

---
