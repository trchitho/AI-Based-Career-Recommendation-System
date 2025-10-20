# 🧩 NCKH – AI-Based Career Recommendation System

**Contribution Guidelines**

## 1️⃣ Branching Strategy

- **Main branch** (`main`) được bảo vệ, không commit trực tiếp.
- Mỗi task tạo 1 nhánh mới từ `main`:
  - `feat/<tính-năng>` – tính năng mới
  - `fix/<vấn-đề>` – sửa lỗi
  - `chore/<việc-phụ>` – cấu hình, tài liệu, CI/CD

### Ví dụ:

```bash
git checkout main
git pull
git checkout -b feat/assessment-ui
```

---

## 2️⃣ Commit Convention

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

| Loại        | Ví dụ                                    | Mục đích      |
| ----------- | ---------------------------------------- | ------------- |
| `feat:`     | `feat(be): add pgvector retrieval`       | Tính năng mới |
| `fix:`      | `fix(api): resolve 500 error`            | Sửa lỗi       |
| `chore:`    | `chore(ci): update workflow`             | Việc phụ      |
| `docs:`     | `docs(readme): update setup guide`       | Tài liệu      |
| `refactor:` | `refactor(nlu): simplify infer pipeline` | Tối ưu code   |

---

## 3️⃣ Code Style & Lint

| Môi trường   | Linter   | Format     | Kiểm tra                        |
| ------------ | -------- | ---------- | ------------------------------- |
| **Frontend** | `eslint` | `prettier` | `npm run lint`                  |
| **Backend**  | `ruff`   | `black`    | `ruff check && black --check .` |

**Hook tự động:**

```bash
pip install pre-commit
pre-commit install
```

Hoặc frontend:

```bash
npm i && npx simple-git-hooks
```

---

## 4️⃣ Chạy môi trường Dev

### Frontend

```bash
cd apps/frontend
cp .env.example .env
npm i
npm run dev
```

### Backend

```bash
cd apps/backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 5️⃣ Docker Dev (nếu cần toàn bộ stack)

```bash
cd infra
docker compose -f docker-compose.dev.yml up -d
```

---

## 6️⃣ Quy tắc Pull Request

- PR nhỏ, sống ≤ 3 ngày.
- Phải pass CI: **FE - CI**, **BE - CI**, **Integration**.
- Tối thiểu **2 reviewer approve**.
- Resolve hết comment trước khi merge.
- Merge kiểu **Squash & Merge**.

**PR Checklist:**

- [ ] Lint/test pass
- [ ] Không leak secret
- [ ] Có update docs nếu đổi API
- [ ] Build chạy được local

---

## 7️⃣ Test & Integration

### FE

```bash
npm run build && npm run typecheck
```

### BE

```bash
pytest
```

### Integration (Contract FE↔BFF)

Chạy tự động qua `.github/workflows/integration.yml`:

- BE export OpenAPI
- FE generate types, `tsc --noEmit` để verify schema khớp.

---

## 8️⃣ Environment Files

### FE `.env.example`

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### BE `.env.example`

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
AI_MODELS_DIR=packages/ai-core/models
```

---

## 9️⃣ Review Rules

| Module           | Reviewer chính                   | Phụ trách                  |
| ---------------- | -------------------------------- | -------------------------- |
| **FE (Next.js)** | Thuong, Thien, Tho, Thinh, Duong | UI/UX, React Query         |
| **BE (FastAPI)** | Thuong, Thien, Tho, Thinh, Duong | API, pgvector, BFF         |
| **AI-core**      | Tho, Thinh                       | NLP, PhoBERT, NeuMF        |
| **CI/CD**        | Tho                              | GitHub Actions, Deployment |

---

## 🔟 Feature Merge Flow

```bash
git checkout main
git pull
git checkout -b feat/new-feature
# ...code...
git add .
git commit -m "feat: <mô tả>"
git push -u origin feat/new-feature
# mở PR trên GitHub → review → merge (Squash)
```

---

## 11️⃣ Sau khi merge

```bash
git checkout main
git pull
git branch -d feat/new-feature
```

---

## 12️⃣ Reporting Bugs

Tạo issue dạng:

```
[BUG] <Mô tả>
Reproduce:
Expected:
Screenshot:
```

---

## 13️⃣ Security

- Không commit secret/token.
- Không push `.env`, `.pem`, `.key`.
- Review kỹ khi thay đổi AI model hoặc DB config.

---

## 🧠 Quy ước đường dẫn chuẩn

```
apps/
  frontend/
  backend/
packages/
  ai-core/
infra/
.github/workflows/
README.md
CONTRIBUTING.md
```
