# Backend ↔ Frontend Integration Guide

This document maps the existing backend API (FastAPI) to the frontend (Vite + React) service calls, and notes the key environment, CORS, and proxy settings so the app works end-to-end in development.

## Overview

- Backend: `apps/backend` (FastAPI modular monolith)
- Frontend: `apps/frontend` (Vite + React)
- Dev URLs:
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8000`
- Vite dev proxy forwards `/api/*` to the backend (see `apps/frontend/vite.config.ts`).
- Auth: Bearer JWT access token via `Authorization: Bearer <token>` (managed by `src/lib/api.ts`).

## Run Locally

1) Backend

```
cd apps/backend
python -m venv .venv && .\.venv\Scripts\activate
pip install -r requirements.txt
set DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
uvicorn app.main:app --reload --port 8000
```

2) Frontend

```
cd apps/frontend
npm i
npm run dev
```

The frontend calls the backend through the proxy (no CORS issues). If you disable the proxy and call the backend directly, set `VITE_API_URL` to the backend base URL and ensure CORS is configured via `ALLOWED_ORIGINS` in the backend `.env`.

## Auth Flow (Frontend <-> Backend)

- Login: `POST /api/auth/login` → returns `{ access_token, refresh_token, user }`.
- Interceptor injects `Authorization` header with `access_token` on each call.
- On `401`, the interceptor calls `POST /api/auth/refresh` with `refresh_token` and retries the original request.
- Logout: `POST /api/auth/logout` (optional in UI), and the UI clears tokens from `localStorage`.

Related frontend file: `apps/frontend/src/lib/api.ts`.

## Frontend Services → Backend Endpoints

Below is a concise mapping of the frontend service methods to backend routes and expected payloads.

### Assessment

- Get questions
  - FE: `GET /api/assessments/questions/{testType}` where `testType` in `['RIASEC','BIG_FIVE']`
  - BE: `app/modules/assessments/routes_assessments.py@get_questions`
  - Returns normalized questions list. If DB seed is missing, returns `[]` instead of 500.

- Submit answers
  - FE: `POST /api/assessments/submit`
  - Body example:
    ```json
    {
      "testTypes": ["RIASEC"],
      "responses": [{"questionId":"Q1","answer":4}]
    }
    ```
  - BE: creates an `Assessment`, simple average score in `scores.avg`.
  - Returns: `{ "assessmentId": "<id>" }`.

- Submit essay
  - FE: `POST /api/assessments/essay`
  - Body: `{ "essayText": "..." }`
  - BE: stores as `content.Essay` and returns `{ status: "ok", essay_id }`.

- Get results
  - FE: `GET /api/assessments/{assessmentId}/results`
  - BE: returns demo structure `{ assessment_id, scores, career_recommendations }`.

### Recommendations (AI)

- Generate
  - FE: `POST /api/recommendations/generate` body: `{ essay?: string }`
  - BE: `modules/recommendation/routes_recommendations.py@generate_recommendations`
  - If `AI_SERVICE_URL` is set (e.g., `http://localhost:9000`), backend calls `/api/recommend` there; otherwise returns a fallback mock list.

### Users / Profile

- Get current profile
  - FE: `GET /api/users/me`
  - BE: `modules/users/routers_users.py@get_me` → returns extended profile fields for UI.

- Update current profile
  - FE: `PATCH /api/users/me` with either `full_name` or `first_name`/`last_name`, and optional `date_of_birth`.
  - BE: normalizes and updates safely; returns updated profile.

- History
  - FE: `GET /api/users/{userId}/history`
  - BE: returns latest assessments for that user.

- Progress
  - FE: `GET /api/users/{userId}/progress` and `GET /api/users/progress` (current user convenience)
  - BE: returns demo progress data suitable for dashboard UI.

### Careers

- List careers
  - FE: `GET /api/careers`
  - BE: public list with optional filters.

- Get career by id/slug
  - FE: `GET /api/careers/{idOrSlug}`
  - BE: resolves numeric id or slug.

- Roadmap per career (requires auth)
  - FE: `GET /api/careers/{careerId}/roadmap`
  - FE: `POST /api/careers/{careerId}/roadmap/milestone/{milestoneId}/complete`
  - BE: creates demo roadmap if missing; tracks `UserProgress` milestones.

### Notifications

- List
  - FE: `GET /api/notifications/{userId}` (must match the authenticated user)
  - BE: returns notifications for that user.

- Mark read / Mark all read
  - FE: `PUT /api/notifications/{notificationId}/read`
  - FE: `PUT /api/notifications/{userId}/read-all`
  - BE: updates flags; also supports `POST /api/notifications` to create a test notification for the current user.

### Admin

All routes require admin role (`require_admin`). The UI calls these for dashboard and CRUD.

- Dashboard metrics: `GET /api/admin/dashboard`
- AI metrics (placeholder): `GET /api/admin/ai-metrics`
- Feedback (placeholder): `GET /api/admin/feedback`
- App settings: `GET/PUT /api/admin/settings`
- Careers CRUD: `GET/POST/PUT/DELETE /api/admin/careers[/{id}]`
- Skills CRUD: `GET/POST/PUT/DELETE /api/admin/skills[/{id}]`
- Questions CRUD: `GET/POST/PUT/DELETE /api/admin/questions[/{id}]`
- Users management: `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/{user_id}`

## Environment and CORS

- Backend env (.env or OS env):
  - `DATABASE_URL` must be set. The app will warn if missing.
  - `ALLOWED_ORIGINS` defaults to `http://localhost:3000`.
  - Optional `AI_SERVICE_URL` for external AI inference service.

- Frontend env:
  - In dev, `vite.config.ts` proxies `/api` to `http://localhost:8000` so you usually don’t need to set `VITE_API_URL`.
  - In production builds, set `VITE_API_URL` to the backend base URL.

## Common Gotchas

- If you see 401s in the UI, ensure `accessToken` and `refreshToken` are in `localStorage` and that the backend time is correct (token expiry uses UTC).
- If the question list is empty, seed the DB or check `core.assessments_*` tables. The backend returns `[]` to keep the UI functional until data is seeded.
- For recommendations, if `AI_SERVICE_URL` isn’t set, the API returns mock recommendations so the UI can still render.

## Where To Extend Next

- Replace demo/fallback logic:
  - Assessments scoring → compute RIASEC/Big Five scores per dimension.
  - Recommendations → call AI-Core service and return ranked careers with scores.
- Add real feedback endpoints and persist ratings from the UI.
- Expand roadmap generation and progress tracking rules.
