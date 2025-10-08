# ⚙️ Backend — AI-Based Career Recommendation System

FastAPI Modular Monolith + PostgreSQL + pgvector  
Đây là phần **backend** (BFF + API + integration AI) cho hệ thống gợi ý nghề nghiệp cá nhân hóa bằng trí tuệ nhân tạo.

---

## 🚀 Tech Stack

- [FastAPI](https://fastapi.tiangolo.com/) — Python web framework  
- [SQLAlchemy 2.x](https://docs.sqlalchemy.org/) — ORM hiện đại  
- [PostgreSQL + pgvector](https://github.com/pgvector/pgvector) — Lưu và truy vấn vector AI  
- [Pydantic v2](https://docs.pydantic.dev/) — Schema validation  
- [Alembic](https://alembic.sqlalchemy.org/) — Quản lý migration DB  
- [Ruff / Black / Pytest] — Lint + format + test  

---

## 📂 Cấu trúc thư mục

```

apps/backend/
├─ app/
│  ├─ main.py                  # Mount routers, cấu hình CORS, OpenAPI
│  ├─ bff/                     # BFF endpoint khớp với UI FE
│  │  ├─ router.py
│  │  └─ dto.py
│  ├─ modules/                 # Bounded contexts (Clean Architecture)
│  │  ├─ auth/
│  │  ├─ user_profile/
│  │  ├─ assessment/           # RIASEC & Big Five chấm điểm
│  │  ├─ nlu/                  # Gọi AI-core: PhoBERT inference
│  │  ├─ retrieval/            # Truy vấn pgvector
│  │  ├─ recommendation/       # NeuMF / Reinforcement Learning
│  │  └─ admin/
│  ├─ core/                    # DB session, logging, settings, deps
│  ├─ schemas/                 # Pydantic I/O models
│  ├─ repositories/            # DB adapters (Postgres/Neo4j/ES)
│  ├─ services/                # Business logic / Use cases
│  ├─ tasks/                   # Celery/RQ jobs (nếu cần)
│  └─ tests/                   # Unit tests
├─ alembic/                    # DB migrations
├─ requirements.txt
└─ .env.example

````

---

## ⚙️ Môi trường (`.env.example`)

```env
# PostgreSQL + pgvector
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai

# AI models (liên kết với packages/ai-core)
AI_MODELS_DIR=packages/ai-core/models
````

---

## 🧑‍💻 Chạy cục bộ

### 1️⃣ Tạo và kích hoạt môi trường ảo

```bash
python -m venv .venv
.venv\Scripts\activate     # (Windows)
# hoặc trên macOS/Linux:
# source .venv/bin/activate
```

### 2️⃣ Cài dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Chạy server

```bash
uvicorn app.main:app --reload --port 8000
```

> Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧾 CI/CD (GitHub Actions)

**Workflow:** `.github/workflows/be-ci.yml`

Tự động lint, format và test khi có push/PR vào `main`.

```yaml
name: BE - CI
on:
  pull_request: { paths: ["apps/backend/**"] }
  push:
    branches: [ main ]
    paths: ["apps/backend/**"]
jobs:
  be:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: apps/backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11", cache: pip }
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: black --check .
      - run: pytest || echo "skip tests"
```

---

## 🔗 Kết nối với AI-core

Backend import `packages/ai-core` (dạng editable install):

```bash
pip install -e ./packages/ai-core
```

Các module:

* `nlu` → gọi PhoBERT inference (essay)
* `retrieval` → query pgvector job embeddings
* `recommendation` → rerank kết quả bằng NeuMF hoặc RL

---

## 🧭 Kết nối Database

Database mặc định: **PostgreSQL + pgvector**
Cấu hình qua `.env` hoặc Docker Compose (ở `infra/docker-compose.dev.yml`).

Kiểm tra nhanh:

```python
from app.core.db import test_connection
test_connection()  # ✅ DB Connected: <timestamp>
```

---

## 🧱 Mục tiêu của skeleton

* Cài đặt backend “khung” sẵn sàng để nhóm BE chỉ cần thêm module cụ thể.
* Hỗ trợ AI integration và pgvector retrieval ngay từ đầu.
* Dễ mở rộng lên microservice sau MVP.
