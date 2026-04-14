# app/modules/recommendation/service.py
from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Dict, List, Optional

import httpx
from app.core.logging import logger
from sqlalchemy import text
from sqlalchemy.orm import Session

AI_CORE_BASE_URL = os.getenv("AI_CORE_BASE_URL", "http://localhost:9000").rstrip("/")


class RecService:
    """
    BFF Recommendation service – assessment-based.

    Luồng:
    - FE truyền assessment_id.
    - BFF gọi AI-core /recs/top_careers với assessment_id.
    - AI-core dùng snapshot traits + embedding tại thời điểm làm bài để recommend.
    - BFF:
        + Join core.careers để lấy slug, title, desc, tags RIASEC.
        + Lọc theo RIASEC của chính assessment đó.
        + Chuẩn hoá display_match.
        + Log analytics vào analytics.career_events.
    """

    def get_onet_code_by_slug(self, db: Session, career_id_or_slug: str) -> Optional[str]:
        """
        Map slug <-> onet_code.
        Trả về onet_code nếu tìm được, ngược lại None.
        """
        row = db.execute(
            text(
                """
                SELECT onet_code
                FROM core.careers
                WHERE slug = :cid OR onet_code = :cid
                LIMIT 1
                """
            ),
            {"cid": career_id_or_slug},
        ).fetchone()

        if not row:
            return None
        return row[0]

    # ====================================================================== #
    # 1. Attach metadata & RIASEC tags
    # ====================================================================== #

    def _attach_career_meta(
        self,
        db: Session,
        items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Nhận list item từ AI-core:
        [
          {"career_id": "11-1011.00", "final_score": 0.92},
          ...
        ]

        - Map career_id (O*NET code) -> row trong core.careers + nhãn RIASEC.
        - Trả về list DTO thô cho FE.
        """
        dto_list: List[Dict[str, Any]] = []

        for raw in items:
            onet_code = raw.get("job_onet") or raw.get("career_id") or raw.get("job_id")
            if not onet_code:
                continue

            meta = self._load_career_meta(db, onet_code)
            if not meta:
                # chưa enrich metadata thì bỏ qua nghề này
                continue

            slug = meta.get("slug") or onet_code
            riasec_codes = meta.get("riasec_codes") or []

            score = raw.get("match_score") or raw.get("score") or raw.get("final_score") or 0.0

            dto = {
                "career_id": slug,  # FE dùng slug làm id
                "slug": slug,
                "job_onet": onet_code,  # giữ O*NET để log / debug
                "title_vi": meta.get("title_vi"),
                "title_en": meta.get("title_en"),
                "description": (meta.get("short_desc_en") or meta.get("short_desc_vn") or meta.get("description") or ""),
                "tags": riasec_codes,  # ["R", "RI", ...]
                "job_zone": meta.get("job_zone"),
                "match_score": float(score),
                "display_match": raw.get("display_match"),
                "position": raw.get("position", 0),
            }
            dto_list.append(dto)

        dto_list.sort(key=lambda x: x["match_score"], reverse=True)
        return dto_list

    # ====================================================================== #
    # 2. RIASEC filter (dựa trên Top 2 RIASEC dimensions - L1 & L2 ONLY)
    # ====================================================================== #

    def _filter_by_riasec_top2(
        self,
        jobs: List[Dict[str, Any]],
        riasec_scores: List[float],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """
        Filter nghề theo RIASEC với logic: CHỈ dùng L1 (top 1) và L2 (top 2).
        KHÔNG dùng top 3 RIASEC dimension.

        Args:
            jobs: List nghề từ AI-core (đã có tags, đã sort theo match_score)
            riasec_scores: Vector 6 điểm [R, I, A, S, E, C] - thang điểm bất kỳ
            top_k: Số nghề cần trả về (mặc định 5)

        Returns:
            List nghề đã filter, luôn cố gắng trả đủ top_k

        Logic ưu tiên (STRICT - chỉ L1 và L2):
            Bước 1: Lấy L1 (dimension có điểm cao nhất)
            Bước 2: Lấy L2 (dimension có điểm cao thứ 2)
            Bước 3: Filter jobs:
                - Ưu tiên: nghề có PRIMARY tag = L1 (first char of any tag)
                - Nếu không đủ: bổ sung nghề có PRIMARY tag = L2
                - Nếu vẫn thiếu: fill bằng nghề còn lại (theo match_score)

        QUAN TRỌNG:
            - Không dùng top 3 dimension
            - Deterministic 100% (không random)
            - Giữ nguyên thứ tự match_score trong mỗi bucket
            - Tag matching: CHỈ xét FIRST CHARACTER của tag (primary dimension)
              Ví dụ: "RC" → primary = "R", "AR" → primary = "A"
            - Tie-breaking: nếu 2 dimension có điểm bằng nhau, ưu tiên theo thứ tự R,I,A,S,E,C
        """
        if not jobs:
            logger.warning("No jobs to filter")
            return []

        if not riasec_scores or len(riasec_scores) != 6:
            logger.error("Invalid RIASEC scores, returning jobs by score only")
            return sorted(
                jobs,
                key=lambda x: (-x.get("match_score", 0.0), x.get("job_onet", "")),
            )[:top_k]

        # Tính L1 và L2 từ RIASEC scores
        # Tie-breaking rule: nếu điểm bằng nhau, ưu tiên theo thứ tự R,I,A,S,E,C (index nhỏ hơn)
        dims = ["R", "I", "A", "S", "E", "C"]

        # Sort với tie-breaker: (-score, index) để index nhỏ hơn được ưu tiên khi score bằng nhau
        sorted_indices = sorted(range(6), key=lambda i: (-float(riasec_scores[i] or 0.0), i))

        L1 = dims[sorted_indices[0]]
        L2 = dims[sorted_indices[1]]

        L1_score = float(riasec_scores[sorted_indices[0]] or 0.0)
        L2_score = float(riasec_scores[sorted_indices[1]] or 0.0)

        logger.debug(f"🎯 RIASEC Top 2: L1={L1} ({L1_score:.4f}), L2={L2} ({L2_score:.4f})")

        # Early return if jobs <= top_k
        if len(jobs) <= top_k:
            logger.warning(f"AI-core returned only {len(jobs)} careers, less than requested top_k={top_k}")
            return sorted(
                jobs,
                key=lambda x: (-x.get("match_score", 0.0), x.get("job_onet", "")),
            )[:top_k]

        # Helper: lấy PRIMARY dimension từ tag (first character)
        def get_primary_dim(tag: str) -> str:
            """
            Lấy primary dimension từ tag RIASEC.
            Tag format: "R", "RC", "RI", "AR", "SA", etc.
            Primary = first character.
            """
            tag = str(tag).strip().upper()
            if tag and tag[0] in dims:
                return tag[0]
            return ""

        # Phân loại jobs vào 3 buckets: L1, L2, others
        # CRITICAL: Chỉ xét PRIMARY dimension (first char) của tag
        bucket_L1: List[Dict[str, Any]] = []
        bucket_L2: List[Dict[str, Any]] = []
        bucket_others: List[Dict[str, Any]] = []

        for job in jobs:
            raw_tags = job.get("tags") or []

            # Lấy tất cả primary dimensions từ tags
            primary_dims = set()
            for tag in raw_tags:
                if tag is not None:
                    pd = get_primary_dim(tag)
                    if pd:
                        primary_dims.add(pd)

            # Check nếu primary dimension = L1 hoặc L2
            has_L1 = L1 in primary_dims
            has_L2 = L2 in primary_dims

            # Phân loại: ưu tiên L1 trước, nếu không có L1 thì xét L2
            if has_L1:
                bucket_L1.append(job)
            elif has_L2:
                bucket_L2.append(job)
            else:
                bucket_others.append(job)

        # Sort từng bucket theo match_score giảm dần với tie-breaker deterministic
        def sort_key(x):
            return (-x.get("match_score", 0.0), x.get("job_onet", ""))

        bucket_L1.sort(key=sort_key)
        bucket_L2.sort(key=sort_key)
        bucket_others.sort(key=sort_key)

        logger.debug(f"📊 Bucket sizes: L1({L1})={len(bucket_L1)}, L2({L2})={len(bucket_L2)}, others={len(bucket_others)}")

        # Ghép kết quả theo thứ tự: L1 → L2 → others
        result: List[Dict[str, Any]] = []

        # Bước 1: Lấy từ L1
        for job in bucket_L1:
            if len(result) >= top_k:
                break
            result.append(job)

        # Bước 2: Nếu chưa đủ, lấy từ L2
        if len(result) < top_k:
            for job in bucket_L2:
                if len(result) >= top_k:
                    break
                result.append(job)

        # Bước 3: Nếu vẫn chưa đủ, lấy từ others
        if len(result) < top_k:
            for job in bucket_others:
                if len(result) >= top_k:
                    break
                result.append(job)

        # Logging chi tiết (chỉ khi DEBUG)
        logger.debug(f"✅ Final {len(result)} careers after L1/L2 filter:")
        if logger.level <= logging.DEBUG:
            for i, job in enumerate(result[:top_k], 1):
                title = job.get("title_en") or job.get("title_vi") or "Unknown"
                tags = job.get("tags", [])
                score = job.get("match_score", 0.0)

                # Determine bucket based on primary dimension
                raw_tags = job.get("tags") or []
                primary_dims = set()
                for tag in raw_tags:
                    if tag is not None:
                        pd = get_primary_dim(tag)
                        if pd:
                            primary_dims.add(pd)

                bucket_name = "other"
                if L1 in primary_dims:
                    bucket_name = f"L1({L1})"
                elif L2 in primary_dims:
                    bucket_name = f"L2({L2})"

                logger.debug(f"  #{i} [{bucket_name:8}] {title[:35]:<35} | Tags: {str(tags):<15} | Score: {score:.4f}")

        # Warning nếu L1 bucket quá ít
        if len(bucket_L1) < top_k:
            l2_in_result = sum(1 for j in result if L2 in set(get_primary_dim(t) for t in (j.get("tags") or []) if t))
            others_in_result = len(result) - len(bucket_L1) - l2_in_result
            logger.warning(
                f"⚠️  Only {len(bucket_L1)}/{top_k} careers match L1={L1}. "
                f"Filled with L2={L2} ({l2_in_result}) and others ({others_in_result})"
            )

        return result

    # ====================================================================== #
    # 3. Public API – get_main_recommendations
    # ====================================================================== #

    def get_main_recommendations(
        self,
        db: Session,
        assessment_id: int,
        top_k: int = 20,
    ) -> Dict[str, Any]:
        # Lấy nhiều hơn để còn room cho join + filter
        # Tăng từ 4x lên 10x để đảm bảo đủ nghề khớp nhãn RIASEC
        internal_top_k = max(top_k * 10, 100)

        # 1) Map assessment -> user_id
        user_id = self._get_user_from_assessment(db, assessment_id)
        if user_id is None:
            raise RuntimeError(f"Assessment {assessment_id} not found or invalid")

        # 2) Gọi AI-core
        logger.debug(f"[get_main_recommendations] Calling AI-core for assessment {assessment_id}")
        scored = self._call_ai_core_top_careers(assessment_id, internal_top_k)
        logger.debug(f"[get_main_recommendations] AI-core returned {len(scored) if scored else 0} items")

        # 2.1) Nếu AI-core không trả về kết quả, thử lấy từ saved recommendations
        if not scored:
            logger.warning(f"AI-core returned no results, trying saved recommendations for assessment {assessment_id}")
            saved_items = self._get_saved_recommendations_from_db(db, assessment_id, top_k)
            if saved_items:
                logger.debug(f"Returning {len(saved_items)} saved recommendations")
                return {"request_id": None, "items": saved_items}
            logger.warning(f"No saved recommendations found for assessment {assessment_id}")
            return {"request_id": None, "items": []}

        # 3) Snapshot traits của **chính assessment này**
        traits = self._load_traits_snapshot(db, assessment_id)
        riasec_values = traits.get("riasec_values")
        top_dim = traits.get("riasec_top_dim")

        # STRICT: Bắt buộc phải có RIASEC values
        if not riasec_values or len(riasec_values) != 6:
            logger.error(f"Assessment {assessment_id}: Missing RIASEC values for user {user_id}")
            raise RuntimeError(f"Missing RIASEC traits for user {user_id}. User must complete RIASEC assessment first.")

        logger.debug(f"Assessment {assessment_id}: top_interest={top_dim}, AI-core returned {len(scored)} careers")

        # 4) Join meta để lấy slug/title/tags
        items_with_meta = self._attach_career_meta(db, scored)

        logger.debug(f"Assessment {assessment_id}: {len(items_with_meta)} careers after metadata join")

        # DEBUG: Log first 10 careers with tags (chỉ khi DEBUG)
        if logger.level <= logging.DEBUG:
            logger.debug("📋 First 10 careers with tags (before filter):")
            for i, item in enumerate(items_with_meta[:10], 1):
                title = item.get("title_en") or item.get("title_vi") or "Unknown"
                tags = item.get("tags", [])
                score = item.get("match_score", 0.0)
                logger.debug(f"  {i}. {title[:40]:<40} | Tags: {tags} | Score: {score:.3f}")

        # 5) Filter theo RIASEC L1/L2 (NEW LOGIC - chỉ dùng top 2 dimensions)
        items_filtered = self._filter_by_riasec_top2(
            jobs=items_with_meta,
            riasec_scores=riasec_values,
            top_k=top_k,
        )

        logger.debug(f"Assessment {assessment_id}: {len(items_filtered)} careers after L1/L2 filter")

        # 6) Chuẩn hoá display_match
        self._apply_display_match(items_filtered)

        # 7) Generate request_id + đánh position
        # NOTE: Impression logging đã chuyển sang FE để tránh double-count
        # FE sẽ gọi /api/analytics/career-event khi user mở tab Career Matches
        request_id = str(uuid.uuid4())

        for idx, it in enumerate(items_filtered, start=1):
            it["position"] = idx

        # 8) Save top 5 recommendations to core.career_recommendations table
        # Only save when fetching full recommendations (top_k >= 5), not for dashboard preview (top_k=3)
        if top_k >= 5:
            self._save_career_recommendations(db, user_id, assessment_id, items_filtered[:5])

        return {
            "request_id": request_id,
            "items": items_filtered,
        }

    def _save_career_recommendations(
        self,
        db: Session,
        user_id: int,
        assessment_id: int,
        items: List[Dict[str, Any]],
    ) -> None:
        """
        Save top career recommendations to core.career_recommendations table.
        This persists the recommendations for history tracking.
        """
        if not items:
            return

        try:
            # First, delete any existing recommendations for this assessment
            db.execute(
                text(
                    """
                    DELETE FROM core.career_recommendations
                    WHERE assessment_id = :assessment_id
                    """
                ),
                {"assessment_id": assessment_id},
            )

            # Insert new recommendations
            for item in items:
                # Get career_id from core.careers table using slug or onet_code
                career_id_result = db.execute(
                    text(
                        """
                        SELECT id FROM core.careers
                        WHERE slug = :slug OR onet_code = :onet_code
                        LIMIT 1
                        """
                    ),
                    {"slug": item.get("slug"), "onet_code": item.get("job_onet") or item.get("career_id")},
                ).fetchone()

                if career_id_result:
                    career_id = career_id_result[0]
                    db.execute(
                        text(
                            """
                            INSERT INTO core.career_recommendations
                                (user_id, assessment_id, career_id, score, rank)
                            VALUES
                                (:user_id, :assessment_id, :career_id, :score, :rank)
                            """
                        ),
                        {
                            "user_id": user_id,
                            "assessment_id": assessment_id,
                            "career_id": career_id,
                            "score": item.get("display_match") or item.get("match_score", 0.0),
                            "rank": item.get("position", 0),
                        },
                    )

            db.commit()
            logger.debug(f"Saved {len(items)} career recommendations for assessment {assessment_id}")

        except Exception as e:
            logger.error(f"Failed to save career recommendations: {e}")
            db.rollback()

    def _get_saved_recommendations_from_db(
        self,
        db: Session,
        assessment_id: int,
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """
        Get saved career recommendations from core.career_recommendations table.
        Used as fallback when AI-core is not available.
        """
        try:
            sql = text(
                """
                SELECT 
                    cr.career_id,
                    cr.score,
                    cr.rank,
                    c.slug,
                    c.onet_code,
                    c.title_vi,
                    c.title_en,
                    c.short_desc_en,
                    c.short_desc_vn,
                    COALESCE(
                        array_agg(rl.code) FILTER (WHERE rl.code IS NOT NULL),
                        '{}'
                    ) AS riasec_codes
                FROM core.career_recommendations cr
                JOIN core.careers c ON c.id = cr.career_id
                LEFT JOIN core.career_riasec_map m ON m.career_id = c.id
                LEFT JOIN core.riasec_labels rl ON rl.id = m.label_id
                WHERE cr.assessment_id = :assessment_id
                GROUP BY cr.career_id, cr.score, cr.rank, c.slug, c.onet_code,
                         c.title_vi, c.title_en, c.short_desc_en, c.short_desc_vn
                ORDER BY cr.rank ASC
                LIMIT :top_k
                """
            )

            rows = db.execute(sql, {"assessment_id": assessment_id, "top_k": top_k}).fetchall()

            items = []
            for row in rows:
                riasec_codes = row[9] if row[9] else []
                if isinstance(riasec_codes, (list, tuple)):
                    riasec_codes = [str(x) for x in riasec_codes if x is not None]

                items.append(
                    {
                        "career_id": row[3] or str(row[0]),  # slug or career_id
                        "slug": row[3],
                        "job_onet": row[4],
                        "title_vi": row[5],
                        "title_en": row[6],
                        "description": row[7] or row[8] or "",
                        "match_score": float(row[1]) if row[1] else 0.0,
                        "display_match": float(row[1]) if row[1] else 0.0,
                        "tags": riasec_codes,
                        "job_zone": None,
                        "position": row[2] or 0,
                    }
                )

            return items

        except Exception as e:
            logger.error(f"Failed to get saved recommendations: {e}")
            return []

    # ====================================================================== #
    # 4. AI-core integration
    # ====================================================================== #

    def _call_ai_core_top_careers(
        self,
        assessment_id: int,
        top_k: int,
    ) -> List[Dict[str, Any]]:
        url = f"{AI_CORE_BASE_URL}/recs/top_careers"
        payload = {"assessment_id": assessment_id, "top_k": top_k}

        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.post(url, json=payload)

            if resp.status_code != 200:
                print(f"AI-core error {resp.status_code}: {resp.text}")
                return []  # Return empty to trigger saved recommendations fallback

            data = resp.json()
            items = data.get("items", [])
            if not isinstance(items, list):
                print("AI-core returned invalid format")
                return []  # Return empty to trigger saved recommendations fallback

        except Exception as e:
            print(f"AI-core not reachable: {e}")
            return []  # Return empty to trigger saved recommendations fallback

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

        out.sort(key=lambda x: x["final_score"], reverse=True)
        return out

    # ====================================================================== #
    # 5. Postgres helpers
    # ====================================================================== #

    def _get_user_from_assessment(
        self,
        db: Session,
        assessment_id: int,
    ) -> Optional[int]:
        sql = text(
            """
            SELECT user_id
            FROM core.assessments
            WHERE id = :aid
            LIMIT 1
            """
        )
        row = db.execute(sql, {"aid": assessment_id}).mappings().first()
        if not row:
            return None
        uid = row.get("user_id")
        return int(uid) if uid is not None else None

    def _load_traits_snapshot(
        self,
        db: Session,
        assessment_id: int,
    ) -> Dict[str, Any]:
        """
        Lấy RIASEC scores từ assessment cùng session với assessment_id hiện tại.
        Nếu assessment_id là RIASEC thì dùng luôn scores của nó.
        Nếu không, tìm RIASEC assessment trong cùng session (cùng user, trong 5 phút).

        Đảm bảo:
        - Lấy RIASEC assessment từ CÙNG SESSION với assessment_id
        - Thứ tự R, I, A, S, E, C đúng
        - Điểm gốc thang 1-5 (chưa normalize)
        - Deterministic 100%
        - Mỗi bài test dùng RIASEC của chính session đó
        """
        # 1) Lấy user_id và session_id từ assessment
        sql = text(
            """
            SELECT user_id, session_id
            FROM core.assessments
            WHERE id = :aid
            LIMIT 1
            """
        )
        row = db.execute(sql, {"aid": assessment_id}).mappings().first()
        if not row:
            logger.error(f"Assessment {assessment_id} not found in DB")
            return {"riasec_top_dim": None, "riasec_values": None}

        user_id = row.get("user_id")
        session_id = row.get("session_id")
        if not user_id:
            logger.error(f"Assessment {assessment_id} has no user_id")
            return {"riasec_top_dim": None, "riasec_values": None}

        # 2) Lấy RIASEC scores từ assessment CÙNG SESSION (không phải mới nhất của user)
        riasec_row = None

        if session_id:
            # Lấy RIASEC assessment từ cùng session
            sql_riasec = text(
                """
                SELECT scores
                FROM core.assessments
                WHERE session_id = :sid AND a_type = 'RIASEC'
                LIMIT 1
                """
            )
            riasec_row = db.execute(sql_riasec, {"sid": session_id}).mappings().first()
            logger.debug(f"Assessment {assessment_id}: Looking for RIASEC in session {session_id}")

        # Fallback: nếu không có session_id hoặc không tìm thấy RIASEC trong session
        if not riasec_row or not riasec_row.get("scores"):
            # Nếu assessment_id chính là RIASEC, dùng luôn
            sql_check = text(
                """
                SELECT scores, a_type
                FROM core.assessments
                WHERE id = :aid
                LIMIT 1
                """
            )
            check_row = db.execute(sql_check, {"aid": assessment_id}).mappings().first()
            if check_row and check_row.get("a_type") == "RIASEC":
                riasec_row = check_row
                logger.debug(f"Assessment {assessment_id} is itself a RIASEC assessment")

        if not riasec_row or not riasec_row.get("scores"):
            logger.error(f"Assessment {assessment_id}: No RIASEC assessment found in session {session_id}")
            return {"riasec_top_dim": None, "riasec_values": None}

        # 4) Parse scores dict → vector theo thứ tự R, I, A, S, E, C
        dims = ["R", "I", "A", "S", "E", "C"]

        # Get scores from riasec_row
        scores_dict = riasec_row.get("scores")
        if not scores_dict or not isinstance(scores_dict, dict):
            logger.error(f"Assessment {assessment_id}: Invalid RIASEC scores format")
            return {"riasec_top_dim": None, "riasec_values": None}

        riasec_vec: List[float] = []
        for dim in dims:
            score = scores_dict.get(dim)
            if score is None:
                logger.error(f"User {user_id} missing RIASEC dimension {dim}")
                return {"riasec_top_dim": None, "riasec_values": None}
            riasec_vec.append(float(score))

        # 5) Tính top_dim với tie-breaking rule: R,I,A,S,E,C (index nhỏ hơn ưu tiên)
        # Sort với (-score, index) để đảm bảo deterministic khi có tie
        sorted_indices = sorted(range(6), key=lambda i: (-riasec_vec[i], i))
        top_dim = dims[sorted_indices[0]]

        # DEBUG: Log RIASEC scores (chỉ khi DEBUG)
        if logger.level <= logging.DEBUG:
            logger.debug(f"Assessment {assessment_id} (user {user_id}) RIASEC scores (1-5 scale):")
            for i, dim in enumerate(dims):
                marker = "👉" if i == sorted_indices[0] else "  "
                score = riasec_vec[i]
                logger.debug(f"  {marker} {dim}: {score:.3f}")

        logger.debug(f"🎯 Assessment {assessment_id} TOP INTEREST: {top_dim}")

        return {
            "riasec_top_dim": top_dim,
            "riasec_values": riasec_vec,  # Thang 1-5 gốc, thứ tự R,I,A,S,E,C
            "user_id": user_id,
        }

    def _load_career_meta(self, db: Session, onet_code: str) -> Dict[str, Any]:
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
                NULL::int AS job_zone,
                COALESCE(
                    array_agg(rl.code) FILTER (WHERE rl.code IS NOT NULL),
                    '{}'
                ) AS riasec_codes
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
        if isinstance(d.get("riasec_codes"), (list, tuple)):
            d["riasec_codes"] = [str(x) for x in d["riasec_codes"] if x is not None]
        else:
            d["riasec_codes"] = []

        return d

    def _get_fallback_recommendations(self, top_k: int) -> List[Dict[str, Any]]:
        """
        Fallback recommendations khi AI-core không available
        Trả về mock data với O*NET codes thực tế
        """
        fallback_careers = [
            {"career_id": "15-1252.00", "final_score": 0.92},  # Software Developers
            {"career_id": "11-3021.00", "final_score": 0.88},  # Computer and Information Systems Managers
            {"career_id": "15-1299.08", "final_score": 0.85},  # Web Developers
            {"career_id": "15-1244.00", "final_score": 0.82},  # Network and Computer Systems Administrators
            {"career_id": "15-1212.00", "final_score": 0.79},  # Information Security Analysts
            {"career_id": "11-1011.00", "final_score": 0.76},  # Chief Executives
            {"career_id": "13-1161.00", "final_score": 0.73},  # Market Research Analysts
            {"career_id": "25-1022.00", "final_score": 0.70},  # Mathematical Science Teachers
            {"career_id": "19-3051.00", "final_score": 0.67},  # Urban and Regional Planners
            {"career_id": "27-3031.00", "final_score": 0.64},  # Public Relations Specialists
        ]

        return fallback_careers[:top_k]

    # ====================================================================== #
    # 6. display_match + analytics
    # ====================================================================== #

    def _apply_display_match(self, items: List[Dict[str, Any]]) -> None:
        if not items:
            return

        scores = [float(it.get("match_score", 0.0)) for it in items]
        min_s = min(scores)
        max_s = max(scores)

        if max_s <= min_s:
            for it in items:
                it["display_match"] = 95.0
        else:
            for it in items:
                s = float(it.get("match_score", 0.0))
                normalized = (s - min_s) / (max_s - min_s)
                display = 70.0 + normalized * 25.0
                it["display_match"] = round(display, 1)

        for idx, it in enumerate(items, start=1):
            it["position"] = idx

    def _log_impressions(
        self,
        db: Session,
        user_id: int,
        items: List[Dict[str, Any]],
        request_id: str,
    ) -> None:
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
                    "rank_pos": it.get("position", 0),
                    "score_shown": float(it.get("match_score", 0.0)),
                    "source": "neumf",
                    "ref": request_id,
                },
            )
        db.commit()

    # ====================================================================== #
    # 7. Click logging
    # ====================================================================== #

    def _slug_to_onet(self, db: Session, career_id: str) -> str:
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
        return career_id


class CareerEventsService:
    """
    Service ghi lại các event CLICK cho recommendation
    (impression vẫn do RecService._log_impressions lo).
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def log_click(
        self,
        *,
        user_id: Optional[int],
        session_id: Optional[str],
        job_onet: str,
        rank_pos: Optional[int],
        score_shown: Optional[float],
        request_id: Optional[str],
    ) -> None:
        """
        Ghi 1 record 'click' vào analytics.career_events
        - job_onet: O*NET code (vd '49-9097.00')
        - rank_pos: vị trí trong list (#1, #2, #3…)
        - score_shown: % match / score hiển thị cho user
        - request_id: tracking id từ /api/recommendations
        """
        self.db.execute(
            text(
                """
                INSERT INTO analytics.career_events
                    (user_id, session_id, job_id, event_type,
                     rank_pos, score_shown, source, ref)
                VALUES
                    (:user_id,
                     :session_id,
                     :job_id,
                     'click',
                     :rank_pos,
                     :score,
                     'neumf',
                     :ref)
                """
            ),
            {
                "user_id": user_id,
                "session_id": session_id,  # uuid text, Postgres tự cast
                "job_id": job_onet,
                "rank_pos": rank_pos,
                "score": score_shown,
                "ref": request_id,
            },
        )
        self.db.commit()
