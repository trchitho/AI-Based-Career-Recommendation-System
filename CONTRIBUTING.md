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

## 5 Quy tắc Pull Request

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

## 6 Feature Merge Flow

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

## 7 Sau khi merge

```bash
git checkout main
git pull
git branch -d feat/new-feature
```

---

## 8 Reporting Bugs

Tạo issue dạng:

```
[BUG] <Mô tả>
Reproduce:
Expected:
Screenshot:
```

---

## 9 Security

- Không commit secret/token.
- Không push `.env`, `.pem`, `.key`.
- Review kỹ khi thay đổi AI model hoặc DB config.
