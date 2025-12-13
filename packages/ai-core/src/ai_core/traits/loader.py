# packages/ai-core/src/ai_core/traits/loader.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

import json
import ast

import numpy as np
from sqlalchemy import text

from ai_core.db import get_session


@dataclass
class AssessmentSnapshot:
    user_id: int
    traits: Dict[str, Any]
    embedding_vector: np.ndarray


def _normalize_embedding(raw) -> np.ndarray:
    """
    Chuẩn hoá mọi kiểu emb (pgvector, list, string JSON, ...) về np.ndarray(float32)
    """
    if raw is None:
        raise ValueError("Embedding is NULL")

    # pgvector hoặc đã là list/tuple/ndarray
    if isinstance(raw, np.ndarray):
        return raw.astype("float32")
    if isinstance(raw, (list, tuple)):
        return np.array(raw, dtype="float32")

    # nếu driver trả về bytes / memoryview (ít gặp)
    if isinstance(raw, (bytes, bytearray, memoryview)):
        return np.frombuffer(raw, dtype="float32")

    # trường hợp của bạn: string "[0.1, 0.2, ...]"
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            raise ValueError("Empty embedding string")

        try:
            try:
                arr = json.loads(s)  # ưu tiên JSON hợp lệ
            except json.JSONDecodeError:
                # fallback cho kiểu python list string
                arr = ast.literal_eval(s)
        except Exception as e:
            raise ValueError(f"Cannot parse embedding string: {e}")

        return np.array(arr, dtype="float32")

    raise ValueError(f"Unsupported embedding type: {type(raw)}")


def load_traits_and_embedding_for_assessment(
    assessment_id: int,
) -> AssessmentSnapshot:
    """
    - Lấy user_id + scores (RIASEC / BigFive) từ core.assessments
    - Lấy embedding essay gần nhất của user từ ai.user_embeddings (source='essay')
    """
    session = get_session()
    try:
        # 1) lấy assessment
        row = (
            session.execute(
                text(
                    """
                    SELECT a.id,
                           a.user_id,
                           a.a_type,
                           a.scores
                    FROM core.assessments AS a
                    WHERE a.id = :aid
                    LIMIT 1
                    """
                ),
                {"aid": assessment_id},
            )
            .mappings()
            .first()
        )

        if not row:
            raise ValueError(f"Assessment {assessment_id} not found")

        user_id = int(row["user_id"])
        traits = {
            "a_type": row["a_type"],
            "scores": row["scores"],
        }

        # 2) lấy embedding essay
        emb_row = session.execute(
            text(
                """
                SELECT emb
                FROM ai.user_embeddings
                WHERE user_id = :uid
                  AND source = 'essay'
                ORDER BY built_at DESC
                LIMIT 1
                """
            ),
            {"uid": user_id},
        ).first()

        if not emb_row or emb_row[0] is None:
            raise ValueError(f"No essay embedding for user {user_id}")

        emb = _normalize_embedding(emb_row[0])

        return AssessmentSnapshot(
            user_id=user_id,
            traits=traits,
            embedding_vector=emb,
        )
    finally:
        session.close()
