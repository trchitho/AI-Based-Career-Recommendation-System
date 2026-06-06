# Deployment Guide

Recommended free stack:

- Frontend: Cloudflare Pages
- Backend: Render Web Service, Docker runtime, free instance
- PostgreSQL + pgvector: Neon Free
- Redis: Upstash Redis Free
- Neo4j: Neo4j AuraDB Free
- File storage: existing Cloudflare R2 bucket

This split is stronger than putting everything on one free host: Cloudflare is best for static frontend delivery, Render can run the FastAPI container, Neon supports Postgres extensions for pgvector, Upstash provides managed Redis, and AuraDB provides a managed Neo4j free tier.

## 1. Rotate Secrets

The keys used for deployment must be entered only in provider dashboards, not committed to Git. If any real key was shared in chat or copied into a public place, rotate it before production use.

## 2. Backend on Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint from this repo, or create a Web Service manually.
3. If creating manually:
   - Runtime: Docker
   - Root directory: repository root
   - Dockerfile path: `./apps/backend/Dockerfile`
   - Health check path: `/health`
   - Plan: Free
4. Set environment variables in Render. Do not use `localhost` values in production.

Required backend variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require&client_encoding=utf8
REDIS_URL=redis://default:PASSWORD@HOST:PORT
ALLOWED_ORIGINS=https://your-frontend.pages.dev
FRONTEND_BASE_URL=https://your-frontend.pages.dev
FRONTEND_VERIFY_URL=https://your-frontend.pages.dev/verify?token={token}
FRONTEND_OAUTH_REDIRECT=https://your-frontend.pages.dev/oauth/callback
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/auth/google/callback
ZALOPAY_CALLBACK_URL=https://your-backend.onrender.com/api/payment/callback
ZALOPAY_REDIRECT_URL=https://your-frontend.pages.dev/payment/return
NEO4J_URL=neo4j+s://your-aura-host.databases.neo4j.io
NEO4J_URI=neo4j+s://your-aura-host.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASS=your_aura_password
NEO4J_PASSWORD=your_aura_password
AI_MODELS_DIR=
```

Also add the OAuth, SMTP, Gemini, O*NET, ZaloPay, and R2 variables from `apps/backend/.env.example` with your real values.

## 3. PostgreSQL on Neon

Create a Neon project, enable the vector extension, then import your database data.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS interview;
```

Use the pooled or direct Neon connection string as `DATABASE_URL`. If importing from local Docker, dump and restore with `pg_dump`/`psql` using the Neon URL.

## 4. Redis on Upstash

Create an Upstash Redis database and copy the Redis connection string into Render as `REDIS_URL`.

## 5. Neo4j on AuraDB

Create an AuraDB Free database and copy:

- URI into both `NEO4J_URL` and `NEO4J_URI`
- username into `NEO4J_USER`
- password into both `NEO4J_PASS` and `NEO4J_PASSWORD`

## 6. Frontend on Cloudflare Pages

Create a Pages project from the GitHub repo:

- Root directory: `apps/frontend`
- Build command: `npm install && npm run build`
- Build output directory: `dist`
- Node version: `22`

Set these frontend environment variables:

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_API_BASE=https://your-backend.onrender.com
```

The `apps/frontend/public/_redirects` file keeps React Router routes working after refresh.

## 7. Provider URL Updates

After first deploy, update these external dashboards:

- Google OAuth authorized redirect URI: `https://your-backend.onrender.com/api/auth/google/callback`
- Google OAuth authorized JavaScript origin: `https://your-frontend.pages.dev`
- ZaloPay callback URL: `https://your-backend.onrender.com/api/payment/callback`
- ZaloPay redirect URL: `https://your-frontend.pages.dev/payment/return`

## Free Tier Limits

Render free web services spin down after idle time, so the first request after inactivity can be slow. The 10 GB local model folder is intentionally not copied into the backend image; use Gemini fallback for the free online deployment or move models to a paid service/object storage later.

## 8. PostgreSQL Migration to Neon

The production database uses the five application schemas `core`, `ai`,
`analytics`, `chatbot`, and `interview`. The migration script also preserves
custom types and functions in `public`, then recreates the required extensions.

Set connection strings only in the current shell. Do not save them in the
repository:

```powershell
$env:SOURCE_DATABASE_URL = "postgresql://..."
$env:TARGET_DATABASE_URL = "postgresql://..."

.\scripts\migrate-postgres-to-neon.ps1 `
  -SourceDatabaseUrl $env:SOURCE_DATABASE_URL `
  -TargetDatabaseUrl $env:TARGET_DATABASE_URL `
  -CompactSource `
  -Force
```

The script checks the source size against the Neon Free 0.5 GB limit, creates
a rollback dump of the current target, performs fail-fast transactional
restores, and verifies table counts after migration.
