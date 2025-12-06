# app/modules/recommendation/service.py
from __future__ import annotations

import os
import uuid
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session


AI_CORE_BASE_URL = os.getenv("AI_CORE_BASE_URL", "http://localhost:9000").rstrip("/")


class RecService:
    """
    Backend BFF – Recommendation service.

    Nhiệm vụ:
    - Gọi AI-core /recs/top_careers để lấy (career_id = O*NET code, final_score).
    - Join core.careers để lấy slug, title_en, title_vi, short_desc_en, short_desc_vn
      + các nhãn RIASEC từ core.career_riasec_map.
    - Build DTO trả cho FE.
    - Log impression / click vào analytics.career_events.
    """

    # ====================================================================== #
    # 1. Core API
    # ====================================================================== #

    def get_main_recommendations(
        self,
        db: Session,
        user_id: int,
        top_k: int = 20,
    ) -> Dict[str, Any]:
        """
        Hàm chính BFF: chạy pipeline B3–B5 (qua AI-core) + join Postgres.

        Returns
        -------
        {
          "request_id": "...",
          "items": [
            {
              "career_id": "chief-executives-11-1011-00",  # slug, dùng cho FE
              "slug": "chief-executives-11-1011-00",
              "job_onet": "11-1011.00",                    # O*NET code dùng nội bộ
              "title_vi": "...",
              "title_en": "...",
              "description": "...",                        # short_desc_en ưu tiên
              "match_score": 0.92,
              "tags": ["R", "I"],                          # mã RIASEC
              "job_zone": null,
              "position": 1
            },
            ...
          ]
        }
        """
        # 1. Gọi AI-core
        ai_items = self._call_ai_core_top_careers(user_id=user_id, top_k=top_k)

        if not ai_items:
            return {"request_id": None, "items": []}

        # 2. Tạo request_id (1 id cho nguyên lần recommend này)
        request_id = str(uuid.uuid4())

        # 3. Join core.careers & build DTO
        dto_items: List[Dict[str, Any]] = []
        for idx, it in enumerate(ai_items, start=1):
            onet_code = it["career_id"]  # từ AI-core luôn là O*NET code
            final_score = float(it.get("final_score", 0.0))

            meta = self._load_career_meta(db, onet_code)

            # Nếu không tìm thấy meta thì bỏ qua để tránh 404 roadmap sau này
            if not meta:
                continue

            slug = meta.get("slug") or onet_code
            title_en = meta.get("title_en")
            title_vi = meta.get("title_vi")
            short_en = meta.get("short_desc_en")
            short_vi = meta.get("short_desc_vn")
            riasec_codes = meta.get("riasec_codes") or []

            dto = {
                # FE dùng slug để điều hướng /careers/{slug}/roadmap
                "career_id": slug,
                "slug": slug,
                # job_onet giữ nguyên O*NET cho logging / phân tích
                "job_onet": onet_code,
                "title_vi": title_vi,
                "title_en": title_en,
                # Mô tả: ưu tiên EN, thiếu thì fallback VN
                "description": short_en or short_vi,
                "match_score": final_score,
                # tạm thời tags = mã RIASEC (R, I, A, S, E, C, RI, RA,...)
                "tags": riasec_codes,
                "job_zone": meta.get("job_zone"),  # để None; sau join thêm overview
                "position": idx,
            }
            dto_items.append(dto)

        # 4. Log impression (log theo O*NET code, không phải slug)
        self._log_impressions(
            db=db,
            user_id=user_id,
            items=dto_items,
            request_id=request_id,
        )

        return {"request_id": request_id, "items": dto_items}

    # ====================================================================== #
    # 2. AI-core integration
    # ====================================================================== #

    def _call_ai_core_top_careers(
        self,
        user_id: int,
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """
        Gọi AI-core: POST /recs/top_careers
        Body: { "user_id": ..., "top_k": ... }
        Response: { "items": [ { "career_id": "11-1011.00", "final_score": ... }, ... ] }
        """
        url = f"{AI_CORE_BASE_URL}/recs/top_careers"
        payload = {"user_id": user_id, "top_k": top_k}

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
        except httpx.RequestError as e:
            raise RuntimeError(f"AI-core not reachable: {e}") from e

        if resp.status_code != 200:
            raise RuntimeError(f"AI-core error {resp.status_code}: {resp.text}")

        data = resp.json()
        items = data.get("items", [])
        if not isinstance(items, list):
            raise RuntimeError("AI-core returned invalid format (items must be list)")

        out: List[Dict[str, Any]] = []
        for it in items:
            cid = it.get("career_id")
            score = it.get("final_score")
            if cid is None or score is None:
                continue
            out.append(
                {
                    "career_id": str(cid),
                    "final_score": float(score),
                }
            )
        # đảm bảo sort desc theo score để FE tin tưởng
        out.sort(key=lambda x: x["final_score"], reverse=True)
        return out

    # ====================================================================== #
    # 3. Postgres – core.careers (+ RIASEC tags)
    # ====================================================================== #

    def _load_career_meta(self, db: Session, onet_code: str) -> Dict[str, Any]:
        """
        Lấy thông tin nghề từ core.careers qua onet_code.

        Đồng thời join core.career_riasec_map + core.riasec_labels
        để lấy danh sách mã RIASEC (R, I, A, S, E, C, RI, RA, ...).
        """
        sql = text(
            """
            SELECT
                c.id,
                c.slug,
                c.onet_code,
                c.title_vi,
                c.title_en,
                c.short_desc_vn,
                c.short_desc_en,
                -- sau này có thể thêm job_zone từ bảng khác
                NULL::int AS job_zone,
                COALESCE(array_agg(rl.code) FILTER (WHERE rl.code IS NOT NULL), '{}') AS riasec_codes
            FROM core.careers AS c
            LEFT JOIN core.career_riasec_map AS m
                ON m.career_id = c.id
            LEFT JOIN core.riasec_labels AS rl
                ON rl.id = m.label_id
            WHERE c.onet_code = :cid
            GROUP BY
                c.id, c.slug, c.onet_code,
                c.title_vi, c.title_en,
                c.short_desc_vn, c.short_desc_en
            LIMIT 1
            """
        )
        row = db.execute(sql, {"cid": onet_code}).mappings().first()
        if not row:
            return {}
        d = dict(row)
        # array_agg trả về list-like; đảm bảo là list[str]
        if isinstance(d.get("riasec_codes"), (list, tuple)):
            d["riasec_codes"] = [str(x) for x in d["riasec_codes"] if x is not None]
        else:
            d["riasec_codes"] = []
        return d

    # ====================================================================== #
    # 4. Analytics logging
    # ====================================================================== #

    def _log_impressions(
        self,
        db: Session,
        user_id: int,
        items: List[Dict[str, Any]],
        request_id: str,
    ) -> None:
        """
        Ghi 1 bản ghi/ job hiển thị vào analytics.career_events:
        - event_type = 'impression'
        - job_id     = job_onet (O*NET code)
        - rank_pos   = position
        - score_shown = match_score
        - source     = 'neumf'
        - ref        = request_id
        """
        if not items:
            return

        sql = text(
            """
            INSERT INTO analytics.career_events
                (user_id, job_id, event_type, rank_pos, score_shown, source, ref)
            VALUES
                (:user_id, :job_id, :event_type, :rank_pos, :score_shown, :source, :ref)
            """
        )

        for it in items:
            job_onet = it.get("job_onet") or it.get("career_id")
            db.execute(
                sql,
                {
                    "user_id": user_id,
                    "job_id": job_onet,
                    "event_type": "impression",
                    "rank_pos": it["position"],
                    "score_shown": float(it.get("match_score", 0.0)),
                    "source": "neumf",
                    "ref": request_id,
                },
            )
        db.commit()

    def _slug_to_onet(self, db: Session, career_id: str) -> str:
        """
        Map slug (hoặc onet_code) -> onet_code để log analytics.
        """
        sql = text(
            """
            SELECT
                CASE
                    WHEN c.onet_code = :cid THEN c.onet_code
                    WHEN c.slug = :cid THEN c.onet_code
                    ELSE NULL
                END AS onet_code
            FROM core.careers AS c
            WHERE c.slug = :cid OR c.onet_code = :cid
            LIMIT 1
            """
        )
        row = db.execute(sql, {"cid": career_id}).mappings().first()
        if row and row.get("onet_code"):
            return str(row["onet_code"])
        # fallback: dùng luôn career_id nếu không map được
        return career_id

    def log_click(
        self,
        db: Session,
        user_id: int,
        career_id: str,
        position: int,
        request_id: Optional[str] = None,
        match_score: Optional[float] = None,
    ) -> None:
        """
        Log event click.

        FE sẽ gửi career_id = slug (ví dụ "chief-executives-11-1011-00").
        Ở đây map sang onet_code trước khi lưu vào analytics.career_events.job_id.
        """
        job_onet = self._slug_to_onet(db, career_id)

        sql = text(
            """
            INSERT INTO analytics.career_events
                (user_id, job_id, event_type, rank_pos, score_shown, source, ref)
            VALUES
                (:user_id, :job_id, :event_type, :rank_pos, :score_shown, :source, :ref)
            """
        )
        db.execute(
            sql,
            {
                "user_id": user_id,
                "job_id": job_onet,
                "event_type": "click",
                "rank_pos": position,
                "score_shown": float(match_score) if match_score is not None else None,
                "source": "neumf",
                "ref": request_id,
            },
        )
        db.commit()
