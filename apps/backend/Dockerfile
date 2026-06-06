FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/apps/backend:/app/packages/ai-core/src

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/backend/requirements.deploy.txt /tmp/backend-requirements.txt

RUN pip install --upgrade pip \
    && pip install -r /tmp/backend-requirements.txt

COPY apps/backend ./apps/backend
COPY packages/ai-core/src ./packages/ai-core/src

WORKDIR /app/apps/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
