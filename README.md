# 🧠 Frontend — AI-Based Career Recommendation System

Next.js 14 (App Router) + TailwindCSS skeleton  
Đây là phần **giao diện người dùng (UI)** của hệ thống gợi ý nghề nghiệp cá nhân hóa bằng trí tuệ nhân tạo (AI).

---

## 🚀 Tech Stack

- [Next.js 14](https://nextjs.org/docs/app) — React Framework  
- [TypeScript](https://www.typescriptlang.org/)  
- [Tailwind CSS](https://tailwindcss.com/)  
- [React Query](https://tanstack.com/query/latest) — Data fetching  
- [Axios](https://axios-http.com/) — HTTP client  
- [Zod](https://zod.dev/) — Schema validation  

---

## 📂 Cấu trúc thư mục

```

apps/frontend/
├─ app/                        # Routes, layouts, server actions
│  ├─ (auth)/signin/page.tsx
│  ├─ (auth)/signup/page.tsx
│  ├─ (assessment)/assessment/page.tsx
│  ├─ (essay)/essay/page.tsx
│  ├─ (results)/results/page.tsx
│  ├─ (careers)/careers/[id]/page.tsx
│  ├─ layout.tsx
│  └─ providers.tsx
├─ src/
│  ├─ components/              # UI components tái sử dụng (Button, Card, Modal,…)
│  ├─ features/                # Theo domain: assessment, results, careers, …
│  ├─ hooks/                   # Custom hooks (useAuth, useToast, useQuery,…)
│  ├─ lib/                     # Utils, constants, schema zod
│  ├─ services/                # axios clients, BFF fetchers
│  │  ├─ api.ts
│  │  └─ bff.client.ts
│  ├─ styles/                  # global.css, tailwind layers
│  └─ types/                   # Common type definitions (User, Career,…)
├─ public/                     # Ảnh, icon, logo
├─ .env.example
├─ package.json
└─ tailwind.config.ts

````

---

## ⚙️ Môi trường (`.env.example`)

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
````

---

## 🧑‍💻 Chạy cục bộ

### 1️⃣ Cài dependencies

```bash
npm install
```

### 2️⃣ Chạy server dev

```bash
npm run dev
```

> Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🧾 CI/CD (GitHub Actions)

Workflow tự động kiểm tra lint + build mỗi khi push hoặc mở PR.

File: `.github/workflows/fe-ci.yml`

```yaml
name: FE - CI
on:
  pull_request: { paths: ["apps/frontend/**"] }
  push:
    branches: [ main ]
    paths: ["apps/frontend/**"]
jobs:
  fe:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: apps/frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: apps/frontend/package-lock.json }
      - run: npm ci || npm i
      - run: npm run lint || echo "skip lint"
      - run: npm run build
```

---

## 🔗 Kết nối Backend (BFF)

FE gọi API qua layer trung gian BFF của BE:

```
http://localhost:8000/bff/...
```

→ Đảm bảo cấu trúc dữ liệu và endpoint thống nhất giữa UI và API.

---

### 🧭 Luồng FE ↔ BE ↔ AI-core

1. **Frontend (Next.js)**

   * Giao diện người dùng.
   * Gửi request (HTTP) đến **BFF API** qua `NEXT_PUBLIC_API_BASE` (ví dụ: `http://localhost:8000/bff/...`).
   * Không truy cập trực tiếp cơ sở dữ liệu hay mô hình AI.

2. **Backend (FastAPI – BFF Layer)**

   * Nhận request từ FE, tổng hợp dữ liệu từ nhiều nguồn:

     * Module **assessment** (RIASEC, Big Five).
     * Module **nlu** (phân tích bài luận với PhoBERT).
     * Module **retrieval** (truy vấn vector nghề nghiệp trong PostgreSQL + pgvector).
     * Module **recommendation** (NeuMF / Reinforcement Learning).
   * Chuẩn hóa dữ liệu và trả kết quả đã xử lý về cho FE.

3. **AI-core (packages/ai-core)**

   * Chứa toàn bộ mô hình AI: PhoBERT, vi-SBERT, NeuMF, RL bandit,…
   * Được import trực tiếp vào backend qua `pip install -e ./packages/ai-core`.
   * Cung cấp API nội bộ cho module `nlu`, `retrieval`, `recommendation`.

4. **Database (PostgreSQL + pgvector)**

   * Lưu trữ dữ liệu người dùng, kết quả trắc nghiệm, embedding nghề nghiệp, và các vector biểu diễn.
   * Module `retrieval` trong backend sử dụng truy vấn vector để tìm top nghề gần nhất với embedding người dùng.

---

### 🔄 Tóm tắt dòng chảy dữ liệu

| Bước | Thành phần                   | Hành động chính                                          |
| ---- | ---------------------------- | -------------------------------------------------------- |
| ①    | **FE (Next.js)**             | Gửi yêu cầu phân tích bài test hoặc bài luận             |
| ②    | **BE (FastAPI / BFF)**       | Nhận request, gọi module xử lý phù hợp                   |
| ③    | **AI-core**                  | Sinh embedding hoặc dự đoán nghề nghiệp                  |
| ④    | **DB (Postgres + pgvector)** | Truy vấn vector nghề nghiệp tương đồng                   |
| ⑤    | **BE → FE**                  | Trả kết quả nghề nghiệp và gợi ý lộ trình cho người dùng |


---

## 🧱 Mục tiêu của skeleton

* Tạo “khung FE” chuẩn để dễ mở rộng khi thêm feature.
* Tách biệt rõ UI, API, và business logic (theo domain).
* Hỗ trợ deploy dễ dàng qua CI/CD.
