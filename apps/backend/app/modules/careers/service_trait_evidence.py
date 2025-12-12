from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.logging import logger
from .schema import TraitEvidenceDTO


class TraitEvidenceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # 1. Get user's top RIASEC interest (using fused traits)
    # ------------------------------------------------------------------ #

    def _get_user_top_interest(self, user_id: int) -> Optional[str]:
        """
        Get user's top RIASEC interest (single letter: R/I/A/S/E/C).
        Uses the same logic as /api/assessments/{id}/results via get_user_traits.
        """
        try:
            from app.modules.assessments.service import get_user_traits

            traits = get_user_traits(self.db, user_id)

            # Prefer riasec_fused, fallback to riasec_test
            vec = traits.riasec_fused or traits.riasec_test

            if not vec or len(vec) != 6:
                logger.warning(f"User {user_id} has no valid RIASEC traits")
                return None

            dims = ["R", "I", "A", "S", "E", "C"]
            max_idx = max(range(6), key=lambda i: float(vec[i] or 0.0))
            top_dim = dims[max_idx]

            logger.info(f"User {user_id} top RIASEC interest: {top_dim}")
            return top_dim

        except Exception as e:
            logger.error(f"Failed to get user traits for user {user_id}: {e}")
            return None

    # ------------------------------------------------------------------ #
    # 2. Get career's RIASEC tags
    # ------------------------------------------------------------------ #

    def _get_career_tags(self, career_slug_or_onet: str) -> List[str]:
        """
        Get RIASEC tags for a career (e.g., ['S', 'SA']).
        """
        rows = self.db.execute(
            text(
                """
                SELECT rl.code
                FROM core.careers c
                JOIN core.career_riasec_map crm ON crm.career_id = c.id
                JOIN core.riasec_labels rl ON rl.id = crm.label_id
                WHERE c.slug = :cid OR c.onet_code = :cid
                """
            ),
            {"cid": career_slug_or_onet},
        ).fetchall()

        tags = [r[0] for r in rows if r[0]]

        if not tags:
            logger.warning(f"No RIASEC tags found for career: {career_slug_or_onet}")

        return tags

    # ------------------------------------------------------------------ #
    # 3. Select scale for trait evidence
    # ------------------------------------------------------------------ #

    def _select_scale_for_career(
        self,
        user_top_dim: Optional[str],
        career_tags: List[str],
    ) -> Optional[str]:
        """
        Select scale (single letter R/I/A/S/E/C) for trait evidence.

        Priority:
        1. If career has tag starting with user_top_dim → use user_top_dim
        2. Otherwise, use first letter of first career tag
        3. If no tags → None
        """
        if not career_tags:
            return None

        tags_upper = [t.upper() for t in career_tags]

        # Priority 1: Match user's top interest
        if user_top_dim:
            for tag in tags_upper:
                if tag.startswith(user_top_dim):
                    logger.info(
                        f"Scale selected: {user_top_dim} (matches user top interest)"
                    )
                    return user_top_dim

        # Priority 2: Use first letter of first tag
        first_tag = tags_upper[0]
        if first_tag and first_tag[0] in ["R", "I", "A", "S", "E", "C"]:
            scale = first_tag[0]
            logger.info(f"Scale selected: {scale} (from career tag {first_tag})")
            return scale

        return None

    # ------------------------------------------------------------------ #
    # 4. Get latest RIASEC assessment
    # ------------------------------------------------------------------ #

    def _get_latest_riasec_assessment(self, user_id: int) -> Optional[dict]:
        """
        Get latest RIASEC assessment for user.
        Returns dict with 'id' and 'session_id' or None.
        """
        row = self.db.execute(
            text(
                """
                SELECT id, session_id
                FROM core.assessments
                WHERE user_id = :uid
                  AND a_type = 'RIASEC'
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"uid": user_id},
        ).mappings().first()

        if not row:
            logger.warning(f"No RIASEC assessment found for user {user_id}")
            return None

        return dict(row)

    # ------------------------------------------------------------------ #
    # 5. Get RIASEC answers for scale
    # ------------------------------------------------------------------ #

    def _get_riasec_answers_for_scale(
        self,
        assessment_id: int,
        scale: str,
        limit: int = 5,
    ) -> List[str]:
        """
        Get top answers for a specific RIASEC scale.
        Returns list of formatted strings (question + answer).
        """
        # Try different question_key patterns
        patterns = [
            f"{scale}%",  # e.g., S1, S2, S_01
            f"RIASEC_{scale}_%",  # e.g., RIASEC_S_01
            f"{scale.lower()}%",  # e.g., s1, s2
        ]

        for pattern in patterns:
            rows = self.db.execute(
                text(
                    """
                    SELECT
                        q.prompt AS question_text,
                        r.answer_raw,
                        r.score_value
                    FROM core.assessment_responses r
                    JOIN core.assessment_questions q ON q.id = r.question_id
                    WHERE r.assessment_id = :aid
                      AND r.question_key LIKE :pattern
                    ORDER BY r.score_value DESC NULLS LAST, r.id ASC
                    LIMIT :limit
                    """
                ),
                {"aid": assessment_id, "pattern": pattern, "limit": limit},
            ).mappings().all()

            if rows:
                logger.info(
                    f"Found {len(rows)} answers for scale {scale} "
                    f"(assessment {assessment_id}, pattern {pattern})"
                )

                items = []
                for r in rows:
                    question = str(r["question_text"] or "").strip()
                    answer = str(r["answer_raw"] or "").strip()
                    
                    # Format as readable string
                    if question and answer:
                        items.append(f"{question} - {answer}")
                    elif question:
                        items.append(question)
                
                return items

        logger.warning(
            f"No answers found for scale {scale} (assessment {assessment_id})"
        )
        return []

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def get_trait_evidence(
        self,
        user_id: int,
        career_slug_or_onet: str,
    ) -> TraitEvidenceDTO:
        """
        Get trait evidence for a career based on user's RIASEC assessment.

        Returns:
            TraitEvidenceDTO with scale (single letter) and items (questions/answers)
        """
        # 1. Get user's top RIASEC interest
        top_dim = self._get_user_top_interest(user_id)

        # 2. Get career's RIASEC tags
        tags = self._get_career_tags(career_slug_or_onet)

        if not tags:
            logger.warning(
                f"No RIASEC tags for career {career_slug_or_onet}, "
                f"returning empty evidence"
            )
            return TraitEvidenceDTO(scale="", items=[])

        # 3. Select scale for evidence
        scale = self._select_scale_for_career(top_dim, tags)

        if not scale:
            logger.warning(
                f"Cannot determine scale for user {user_id}, "
                f"career {career_slug_or_onet}, top_dim={top_dim}, tags={tags}"
            )
            return TraitEvidenceDTO(scale="", items=[])

        # 4. Get latest RIASEC assessment
        latest = self._get_latest_riasec_assessment(user_id)

        if not latest:
            logger.warning(f"No RIASEC assessment for user {user_id}")
            return TraitEvidenceDTO(scale="", items=[])

        # 5. Get answers for scale
        answers = self._get_riasec_answers_for_scale(
            assessment_id=latest["id"],
            scale=scale,
            limit=5,
        )

        if not answers:
            logger.warning(
                f"No answers for scale {scale} "
                f"(user {user_id}, assessment {latest['id']})"
            )
            return TraitEvidenceDTO(scale="", items=[])

        logger.info(
            f"Trait evidence for user {user_id}, career {career_slug_or_onet}: "
            f"scale={scale}, {len(answers)} items"
        )

        return TraitEvidenceDTO(scale=scale, items=answers)
