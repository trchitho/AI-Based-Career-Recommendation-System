from __future__ import annotations

from typing import List, Sequence
from ai_core.recsys.neumf.infer import Ranker
from app.core.db import pool

# Lấy Top-N ứng viên từ pgvector bằng L2 order; log cosine để debug/giải thích
SQL_RETRIEVE = """
SELECT c.id::text AS career_id, c.title_vi, q.score
FROM (
   SELECT r.job_id,
          1 - (r.emb <=> %s) AS score,   -- cosine similarity (để log)
          row_number() OVER (ORDER BY r.emb <-> %s) AS rnk
   FROM ai.retrieval_jobs_visbert r
) q
JOIN core.careers c ON c.onet_code = q.job_id
WHERE q.rnk <= %s;
"""

class RecService:
    def __init__(
        self,
        model_path: str = "packages/ai-core/models/recsys_mlp/best.pt",
        user_feats: str = "packages/ai-core/data/processed/user_feats.json",
        item_feats: str = "packages/ai-core/data/processed/item_feats.json",
    ) -> None:
        self.ranker = Ranker(model_path=model_path, user_feats=user_feats, item_feats=item_feats)

    def retrieve_candidates(self, query_vec: Sequence[float], topn: int = 50) -> list[dict]:
        if not isinstance(query_vec, (list, tuple)) or len(query_vec) != 768:
            raise ValueError("query_emb must be a 768-dim vector")
        if not (1 <= topn <= 200):
            raise ValueError("topn must be in [1..200]")

        with pool.connection() as conn, conn.cursor() as cur:
            cur.execute(SQL_RETRIEVE, (list(query_vec), list(query_vec), topn))
            rows = cur.fetchall()  # [(career_id, title_vi, score_retr), ...]
        return [{"career_id": r[0], "title": r[1], "score_retr": float(r[2])} for r in rows]

    def rerank(self, user_id: str, cand_ids: List[str], topk: int = 10) -> list[dict]:
        if not cand_ids:
            return []
        if topk <= 0:
            topk = 10
        scored = self.ranker.infer_scores(user_id, cand_ids)  # [(id, score)]
        return [{"career_id": cid, "score": sc} for cid, sc in scored[:topk]]
