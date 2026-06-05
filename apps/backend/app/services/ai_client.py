# apps/backend/app/services/ai_client.py
"""
Client gọi AI-core service.

Sử dụng `app.core.ai_core_config` để có URL + timeout đồng nhất với các module
khác (recommendation, assessments, nlp).
"""

from __future__ import annotations

from typing import Optional

import httpx
import requests
from app.core.ai_core_config import (
    AI_CORE_BASE_URL,
    httpx_timeout,
    requests_timeout,
)
from pydantic import BaseModel


class InferTraitsPayload(BaseModel):
    essay_text: str
    lang: str = "vi"
    user_id: Optional[int] = None
    essay_id: Optional[int] = None


class AIClient:
    BASE = AI_CORE_BASE_URL

    @staticmethod
    async def infer_user_traits(payload: InferTraitsPayload) -> dict:
        url = f"{AIClient.BASE}/ai/infer_user_traits"
        essay_text = (payload.essay_text or "").strip()
        if len(essay_text) < 5:
            return {
                "detected_lang": "vi",
                "used_lang": "vi",
                "essay_original": essay_text,
                "essay_used": essay_text,
                "riasec": [],
                "big5": [],
                "embedding_dim": 0,
                "embedding": [],
                "skipped": True,
                "reason": "Bài luận quá ngắn để phân tích.",
            }
        body = {"essay_text": essay_text, "lang": payload.lang or "vi"}
        async with httpx.AsyncClient(timeout=httpx_timeout()) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def recommend_top_careers_sync(user_id: int, top_k: int = 20) -> dict:
        url = f"{AIClient.BASE}/recs/top_careers"
        resp = requests.post(
            url,
            json={"user_id": user_id, "top_k": top_k},
            timeout=requests_timeout(),
        )
        resp.raise_for_status()
        return resp.json()
