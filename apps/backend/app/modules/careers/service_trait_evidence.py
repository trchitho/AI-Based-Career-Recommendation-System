from typing import Any, Optional

from app.core.logging import logger
from sqlalchemy import text
from sqlalchemy.orm import Session

from .schema import TraitEvidenceDTO, TraitEvidenceGroupDTO, TraitEvidenceItemDTO


RIASEC_NAMES = {
    "R": "Thực tế",
    "I": "Nghiên cứu",
    "A": "Nghệ thuật",
    "S": "Xã hội",
    "E": "Quản lý và thuyết phục",
    "C": "Quy củ",
}

BIG_FIVE_NAMES = {
    "O": "Cởi mở với trải nghiệm",
    "C": "Tận tâm và kỷ luật",
    "E": "Hướng ngoại",
    "A": "Dễ hợp tác",
    "N": "Nhạy cảm cảm xúc",
}

RIASEC_ORDER = ["R", "I", "A", "S", "E", "C"]
BIG_FIVE_ORDER = ["O", "C", "E", "A", "N"]


class TraitEvidenceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _latest_riasec_assessment(self, user_id: int) -> Optional[dict[str, Any]]:
        row = (
            self.db.execute(
                text(
                    """
                    SELECT id, session_id, scores
                    FROM core.assessments
                    WHERE user_id = :uid
                      AND a_type = 'RIASEC'
                      AND scores IS NOT NULL
                    ORDER BY created_at DESC, id DESC
                    LIMIT 1
                    """
                ),
                {"uid": user_id},
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _paired_big_five_assessment(self, user_id: int, session_id: Optional[int]) -> Optional[dict[str, Any]]:
        if session_id is not None:
            row = (
                self.db.execute(
                    text(
                        """
                        SELECT id, session_id, scores
                        FROM core.assessments
                        WHERE user_id = :uid
                          AND a_type = 'BigFive'
                          AND session_id = :sid
                          AND scores IS NOT NULL
                        ORDER BY created_at DESC, id DESC
                        LIMIT 1
                        """
                    ),
                    {"uid": user_id, "sid": session_id},
                )
                .mappings()
                .first()
            )
            if row:
                return dict(row)

        row = (
            self.db.execute(
                text(
                    """
                    SELECT id, session_id, scores
                    FROM core.assessments
                    WHERE user_id = :uid
                      AND a_type = 'BigFive'
                      AND scores IS NOT NULL
                    ORDER BY created_at DESC, id DESC
                    LIMIT 1
                    """
                ),
                {"uid": user_id},
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _top_code(self, scores: Any, order: list[str]) -> Optional[str]:
        if not isinstance(scores, dict):
            return None

        best_code: Optional[str] = None
        best_score: Optional[float] = None
        for code in order:
            if code not in scores:
                continue
            try:
                score = float(scores[code])
            except (TypeError, ValueError):
                continue
            if best_score is None or score > best_score:
                best_code = code
                best_score = score
        return best_code

    def _score_for_code(self, scores: Any, code: Optional[str]) -> Optional[float]:
        if not code or not isinstance(scores, dict) or code not in scores:
            return None
        try:
            return round(float(scores[code]), 2)
        except (TypeError, ValueError):
            return None

    def _answers_for_code(self, assessment_id: int, code: str) -> list[TraitEvidenceItemDTO]:
        rows = (
            self.db.execute(
                text(
                    """
                    SELECT
                        COALESCE(q.prompt_vi, q.prompt_en) AS question_text,
                        r.question_key,
                        r.answer_raw,
                        r.score_value
                    FROM core.assessment_responses r
                    JOIN core.assessment_questions q ON q.id = r.question_id
                    WHERE r.assessment_id = :aid
                      AND upper(r.question_key) LIKE :pattern
                    ORDER BY r.question_key ASC, r.id ASC
                    """
                ),
                {"aid": assessment_id, "pattern": f"{code.upper()}%"},
            )
            .mappings()
            .all()
        )

        items: list[TraitEvidenceItemDTO] = []
        for row in rows:
            question = str(row.get("question_text") or "").strip()
            answer = str(row.get("answer_raw") or "").strip()
            question_key = str(row.get("question_key") or "").strip()
            score_raw = row.get("score_value")
            score: Optional[float] = None
            if score_raw is not None:
                try:
                    score = round(float(score_raw), 2)
                except (TypeError, ValueError):
                    score = None

            if question:
                items.append(
                    TraitEvidenceItemDTO(
                        question_key=question_key,
                        question=question,
                        answer=answer or "Đang cập nhật",
                        score=score,
                    )
                )

        return items

    def _build_group(
        self,
        *,
        kind: str,
        assessment: Optional[dict[str, Any]],
        code_order: list[str],
        names: dict[str, str],
    ) -> Optional[TraitEvidenceGroupDTO]:
        if not assessment:
            return None

        code = self._top_code(assessment.get("scores"), code_order)
        if not code:
            return None

        assessment_id = int(assessment["id"])
        return TraitEvidenceGroupDTO(
            kind=kind,
            code=code,
            name=names.get(code, code),
            score=self._score_for_code(assessment.get("scores"), code),
            assessment_id=assessment_id,
            items=self._answers_for_code(assessment_id, code),
        )

    def get_trait_evidence(
        self,
        user_id: int,
        career_slug_or_onet: str,
    ) -> TraitEvidenceDTO:
        """
        Return evidence from the user's latest completed assessment session.

        The roadmap UI needs to explain why the user's latest test results support
        this career exploration. We therefore show the top RIASEC dimension and
        the top OCEAN/Big Five trait, then list every answered question from that
        latest session whose key maps to those two labels.
        """
        riasec_assessment = self._latest_riasec_assessment(user_id)
        big_five_assessment = self._paired_big_five_assessment(
            user_id=user_id,
            session_id=riasec_assessment.get("session_id") if riasec_assessment else None,
        )

        riasec_group = self._build_group(
            kind="riasec",
            assessment=riasec_assessment,
            code_order=RIASEC_ORDER,
            names=RIASEC_NAMES,
        )
        big_five_group = self._build_group(
            kind="big_five",
            assessment=big_five_assessment,
            code_order=BIG_FIVE_ORDER,
            names=BIG_FIVE_NAMES,
        )

        items: list[str] = []
        scale_parts: list[str] = []
        for group in (riasec_group, big_five_group):
            if not group:
                continue
            scale_parts.append(group.code)
            items.extend([f"{item.question} - {item.answer}" for item in group.items])

        if not riasec_group and not big_five_group:
            logger.warning("No trait evidence found for user %s career %s", user_id, career_slug_or_onet)

        return TraitEvidenceDTO(
            scale="/".join(scale_parts),
            items=items,
            riasec=riasec_group,
            big_five=big_five_group,
        )
