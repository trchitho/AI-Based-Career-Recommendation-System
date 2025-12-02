# apps/backend/app/services/ai_client.py

import httpx
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings


class InferTraitsPayload(BaseModel):
    essay_text: str
    lang: str = "auto"
    user_id: Optional[int] = None
    essay_id: Optional[int] = None


class AIClient:
    BASE = settings.AI_SERVICE_URL or "http://localhost:9000"

    @staticmethod
    async def infer_user_traits(payload: InferTraitsPayload) -> dict:
        url = f"{AIClient.BASE}/ai/infer_user_traits"
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload.model_dump())
            resp.raise_for_status()
            return resp.json()
