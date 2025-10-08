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

## 🧭 Luồng FE ↔ BE ↔ AI-core

```mermaid
graph TD
A[Frontend (Next.js)] --> B[BFF (FastAPI)]
B --> C[Modules: nlu / retrieval / recommendation]
C --> D[AI-core (PhoBERT, NeuMF)]
B --> E[(PostgreSQL + pgvector)]
```

* FE chỉ gọi BFF, không gọi trực tiếp AI-core hay DB.
* BFF tổng hợp dữ liệu từ nhiều module và trả về đúng định dạng UI cần.

---

## 🧱 Mục tiêu của skeleton

* Tạo “khung FE” chuẩn để dễ mở rộng khi thêm feature.
* Tách biệt rõ UI, API, và business logic (theo domain).
* Hỗ trợ deploy dễ dàng qua CI/CD.
