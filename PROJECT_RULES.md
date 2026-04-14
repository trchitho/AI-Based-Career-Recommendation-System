# AI-Based Career Recommendation System (SRC) Coding Standards

**Version:** 1.2
**Last Updated:** 2026-01-26
**Architecture:** Modular Monolith (Monorepo)
**Team:** C1SE.29

---

## Quick Start

1. This file defines the coding standards for the **SRC Project**.
2. It covers both **Frontend (Next.js)** and **Backend (FastAPI)** workflows.
3. AI Agents (Kiro/Claude) must strictly follow these rules.

---

## Project Configuration

| Setting | Value | Options |
|---------|-------|---------|
| **Languages** | `TypeScript`, `Python 3.10+` | |
| **Package Managers** | `npm` (Frontend), `pip` (Backend) | |
| **Backend Framework** | `FastAPI` | |
| **Frontend Framework** | `Next.js 14` (React) | TailwindCSS |
| **Databases** | `PostgreSQL` (pgvector), `Neo4j` | |
| **ORM/Drivers** | `SQLAlchemy` (Python), `Neo4j Python Driver` | |
| **Testing** | `pytest` (Backend), `Jest/Vitest` (Frontend) | |
| **Linter/Formatter** | `ESLint + Prettier` (TS), `Ruff + Black` (Python) | |

---

## 1. Technology Selection Guidelines

- **Frontend:** Use **Next.js 14 (App Router)**. UI components must use **Tailwind CSS**. Avoid custom CSS files unless absolutely necessary.
- **Backend:** Use **FastAPI** for all services. Pydantic models are required for data validation.
- **AI Core:** Use **Python** packages stored in `packages/ai-core`. Use `langchain` or direct API calls for Gemini/PhoBERT.
- **Database:**
  - Structured Data (Users, Jobs, Test Results): **PostgreSQL**.
  - Vectors (Embeddings): **pgvector** extension.
  - Graph Data (Skill Roadmap, Mentor Matching): **Neo4j**.

---

## 2. Naming Conventions

### 2.1 TypeScript (Frontend)

- **Files/Folders:** `kebab-case` (e.g., `user-profile`, `career-card.tsx`).
- **Components:** `PascalCase` (e.g., `CareerSuggestionCard`).
- **Functions/Variables:** `camelCase` (e.g., `fetchCareerData`, `userId`).
- **Interfaces/Types:** `PascalCase` (e.g., `IUserProfile`, `JobListing`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`).

### 2.2 Python (Backend & AI)

- **Files/Modules:** `snake_case` (e.g., `interview_service.py`).
- **Classes:** `PascalCase` (e.g., `CareerRecommender`).
- **Functions/Variables:** `snake_case` (e.g., `calculate_similarity`, `db_session`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_EMBEDDING_MODEL`).

---

## 3. Directory Structure (Monorepo)

**All code must reside in the project root:**

```
{{PROJECT_ROOT}}/
├── apps/
│   ├── frontend/           # Next.js Application
│   │   ├── src/components/ # UI Components
│   │   ├── src/app/        # App Router Pages
│   │   └── ...
│   └── backend/            # FastAPI Application
│       ├── app/api/        # API Routes (BFF)
│       ├── app/services/   # Business Logic
│       └── ...
├── packages/
│   └── ai-core/            # Shared AI Logic (PhoBERT, NeuMF, Neo4j scripts)
├── setup/
│   └── database-env/       # Docker configurations (Postgres, Neo4j)
└── ...
```

---

## 4. Coding Standards

### 4.1 Frontend (React/Next.js)

- **Functional Components:** Use functional components with hooks. Avoid class components.
- **Strict Typing:** No `any`. Define interfaces for all props and API responses.
- **Server vs Client:** Explicitly use `'use client'` for interactive components.
- **Tailwind:** Use utility classes. For complex conditionals, use `clsx` or `tailwind-merge`.

### 4.2 Backend (Python/FastAPI)

- **Type Hints:** All function arguments and return values must be type-hinted.
- **Async/Await:** Use `async def` for all route handlers and I/O bound operations.
- **Error Handling:** Use `HTTPException` for API errors. Never return raw 500 errors to client.
- **Dependency Injection:** Use `Depends()` for database sessions and services.

### 4.3 Database Interactions

- **Postgres:** Use SQLAlchemy ORM for write operations. Raw SQL is permitted for complex read queries or pgvector search.
- **Neo4j:** Use parameterized Cypher queries to prevent injection. Always close driver sessions.

---

## 5. Testing & Quality Gates

- **Backend Tests:** Run `pytest` in `apps/backend`. Coverage must differ for Core Logic vs CRUD.
- **Frontend Tests:** Use `Jest` for unit tests of utility functions.
- **Linting:** Code must pass `ruff` (Python) and `eslint` (TS) before committing.

---

## Summary Checklist

### Before Committing

- [ ] Backend: `ruff check .` passes.
- [ ] Frontend: `npm run lint` passes.
- [ ] No hardcoded secrets (API Keys, DB Passwords).
- [ ] New endpoints have Pydantic schemas.

### Code Review Checklist

- [ ] Variable names are descriptive (no `x`, `data`, `temp`).
- [ ] Logic for "AI Recommendation" is isolated in `packages/ai-core` or `services`.
- [ ] Neo4j queries use parameters (e.g., `$job_id`) instead of f-strings.
- [ ] UI components are responsive (Mobile/Desktop).

---

**End of Document**
