from __future__ import annotations

from typing import List, Dict, Any

from sqlalchemy import text
from sqlalchemy.orm import Session


class RecService:
    """
    MVP: dùng SQL trực tiếp trên core.careers.
    Không còn phụ thuộc ai_core / NeuMF để tránh ImportError.
    """

    def generate_for_user(
        self,
        session: Session,
        user_id: str | None = None,
        topk: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Gợi ý đơn giản: lấy top nghề từ core.careers theo id tăng dần.
        Sau này thay bằng NeuMF/Bandit.
        """
        sql = text(
            """
            SELECT id,
                   onet_code,
                   title_vi,
                   short_desc_vn
            FROM core.careers
            ORDER BY id
            LIMIT :k
            """
        )
        rows = session.execute(sql, {"k": topk}).mappings().all()

        results: List[Dict[str, Any]] = []
        for r in rows:
            results.append(
                {
                    "career_id": r["onet_code"] or str(r["id"]),
                    "title_vi": r["title_vi"],
                    "short_desc_vi": r["short_desc_vn"],  # map về field FE đang dùng
                    "score": 1.0,  # placeholder
                }
            )
        return results

    def retrieve_candidates(
        self,
        session: Session,
        query_emb: List[float],
        topn: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Dùng bảng ai.retrieval_jobs_visbert + vector_cosine_ops.
        Hiện chưa dùng trong FE, chỉ chuẩn bị trước.
        """
        if not query_emb:
            raise ValueError("query_emb is empty")

        dim = len(query_emb)
        if dim != 768:
            raise ValueError(f"Expected 768-dim embedding, got {dim}")

        emb_literal = "[" + ",".join(str(float(x)) for x in query_emb) + "]"

        sql = text(
            """
            SELECT job_id AS career_id,
                   title_vi,
                   description_vi,
                   1 - (embedding <=> :emb::vector) AS score
            FROM ai.retrieval_jobs_visbert
            ORDER BY embedding <=> :emb::vector
            LIMIT :n
            """
        )
        rows = session.execute(sql, {"emb": emb_literal, "n": topn}).mappings().all()

        return [
            {
                "career_id": r["career_id"],
                "title_vi": r["title_vi"],
                "description_vi": r["description_vi"],
                "score": float(r["score"]),
            }
            for r in rows
        ]
