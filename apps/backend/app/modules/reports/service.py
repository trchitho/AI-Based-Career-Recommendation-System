"""
Report generation and storage service.
Computes Big5 facets and RIASEC patterns, stores snapshots in DB.
"""

import hashlib
import json
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from .models import AssessmentReport, ReportEvent, ReportTemplate

# ============ Heuristic Mapping Formulas ============
# Based on Truity's Career Personality Profiler
# Academic-quality descriptions for each behavioral label

FACET_FORMULAS = {
    "problemSolving": {
        "title": "Cách bạn tư duy và giải quyết vấn đề",
        "labels": {
            "innovator": {
                "weights": {"O": 1, "C": -0.2},
                "description": "Bạn tiếp cận vấn đề với sự sáng tạo và linh hoạt, tìm kiếm giải pháp mới lạ và chấp nhận phương pháp phi truyền thống.",
            },
            "humanitarian": {
                "weights": {"A": 1, "O": 0.2},
                "description": "Bạn ưu tiên giải quyết vấn đề theo hướng hợp tác, cân nhắc tác động đến con người và tìm giải pháp có lợi cho tất cả các bên.",
            },
            "caretaker": {
                "weights": {"C": 1, "O": -0.2},
                "description": "Bạn thích cách tiếp cận có hệ thống, dựa trên quy tắc, coi trọng phương pháp đã được chứng minh và tiêu chuẩn tổ chức.",
            },
            "pragmatist": {
                "weights": {"C": 0.3, "O": -1},
                "description": "Bạn tập trung vào giải pháp thực tế, hiệu quả nhằm duy trì sự ổn định và mang lại kết quả đáng tin cậy, có thể dự đoán.",
            },
        },
    },
    "motivation": {
        "title": "Điều gì thúc đẩy bạn",
        "labels": {
            "ambitious": {
                "weights": {"E": 1, "C": 1},
                "description": "Bạn được thúc đẩy bởi thành tích và sự công nhận, đặt mục tiêu cao và làm việc kiên trì để đạt được chúng.",
            },
            "dutiful": {
                "weights": {"C": 1, "N": -0.2},
                "description": "Bạn tìm thấy động lực trong trách nhiệm và cam kết, cảm thấy hài lòng khi hoàn thành nghĩa vụ một cách đáng tin cậy.",
            },
            "excitable": {
                "weights": {"E": 1, "N": 1},
                "description": "Bạn được tiếp thêm năng lượng bởi sự nhiệt huyết và gắn kết cảm xúc, phát triển mạnh trong môi trường năng động với nhiều thử thách.",
            },
            "casual": {
                "weights": {"C": -1, "E": -0.2},
                "description": "Bạn thích cách tiếp cận thoải mái trong công việc, coi trọng sự linh hoạt và cân bằng cuộc sống hơn cấu trúc mục tiêu cứng nhắc.",
            },
        },
    },
    "interaction": {
        "title": "Cách bạn tương tác với người khác",
        "labels": {
            "gregarious": {
                "weights": {"E": 1},
                "description": "Bạn tự nhiên tìm kiếm kết nối xã hội, thích làm việc hợp tác và lấy năng lượng từ các tương tác giữa người với người.",
            },
            "dominant": {
                "weights": {"E": 1, "A": -1},
                "description": "Bạn nắm quyền chủ động trong nhóm, thể hiện ý kiến tự tin và thích vai trò lãnh đạo trong các tương tác.",
            },
            "supportive": {
                "weights": {"A": 1, "E": 0.2},
                "description": "Bạn ưu tiên sự hài hòa và hợp tác, tích cực hỗ trợ người khác và xây dựng các mối quan hệ tích cực.",
            },
            "independent": {
                "weights": {"E": -1, "A": -0.2},
                "description": "Bạn thích làm việc tự chủ, coi trọng sự tự lực và duy trì ranh giới chuyên nghiệp trong các tương tác.",
            },
        },
    },
    "communication": {
        "title": "Cách bạn giao tiếp",
        "labels": {
            "inspiring": {
                "weights": {"O": 1, "E": 1},
                "description": "Bạn giao tiếp với sự nhiệt huyết và sáng tạo, sử dụng kể chuyện và tầm nhìn để thu hút và truyền cảm hứng cho người khác.",
            },
            "informative": {
                "weights": {"E": 1, "C": 1},
                "description": "Bạn truyền đạt thông tin rõ ràng và có hệ thống, đảm bảo thông điệp được tổ chức tốt và có thể hành động.",
            },
            "insightful": {
                "weights": {"O": 1, "E": -0.2},
                "description": "Bạn giao tiếp một cách sâu sắc và chiêm nghiệm, đưa ra phân tích chuyên sâu và góc nhìn tinh tế về các chủ đề.",
            },
            "concise": {
                "weights": {"C": 1, "E": -1},
                "description": "Bạn thích giao tiếp trực tiếp, hiệu quả, tập trung vào thông tin thiết yếu mà không cần diễn giải dài dòng.",
            },
        },
    },
    "teamwork": {
        "title": "Cách bạn đóng góp trong nhóm",
        "labels": {
            "cooperator": {
                "weights": {"A": 1},
                "description": "Bạn ưu tiên sự gắn kết và đồng thuận trong nhóm, làm việc để duy trì động lực nhóm tích cực và mục tiêu chung.",
            },
            "taskmaster": {
                "weights": {"C": 1, "A": -0.2},
                "description": "Bạn tập trung vào kết quả và trách nhiệm giải trình, đảm bảo nhóm đạt mục tiêu và duy trì tiêu chuẩn cao.",
            },
            "empath": {
                "weights": {"A": 1, "O": 0.2},
                "description": "Bạn đồng cảm với nhu cầu và cảm xúc của thành viên nhóm, tạo môi trường hòa nhập nơi mọi người đều được trân trọng.",
            },
            "improviser": {
                "weights": {"O": 1, "C": -1},
                "description": "Bạn mang đến khả năng thích ứng và tư duy sáng tạo cho nhóm, giúp vượt qua thử thách bất ngờ một cách linh hoạt.",
            },
        },
    },
    "taskManagement": {
        "title": "Cách bạn quản lý công việc và dự án",
        "labels": {
            "director": {
                "weights": {"C": 1, "E": 0.2},
                "description": "Bạn áp dụng cách tiếp cận lãnh đạo có cấu trúc, tổ chức nguồn lực và hướng dẫn dự án đến mục tiêu đã xác định.",
            },
            "inspector": {
                "weights": {"C": 1, "O": -1},
                "description": "Bạn xuất sắc trong giám sát chi tiết, đảm bảo chất lượng thông qua đánh giá kỹ lưỡng và tuân thủ quy trình đã thiết lập.",
            },
            "visionary": {
                "weights": {"O": 1, "C": -0.2},
                "description": "Bạn tập trung vào định hướng chiến lược và đổi mới, xác định cơ hội và đặt tầm nhìn dự án đầy tham vọng.",
            },
            "responder": {
                "weights": {"C": -1, "E": 0.2},
                "description": "Bạn thích ứng nhanh với hoàn cảnh thay đổi, xử lý các ưu tiên mới nổi với sự linh hoạt và khả năng phản hồi.",
            },
        },
    },
}

TRAIT_MAP = {
    "O": "openness",
    "C": "conscientiousness",
    "E": "extraversion",
    "A": "agreeableness",
    "N": "neuroticism",
}


def _normalize_scores(scores: Dict[str, float]) -> Dict[str, float]:
    """Normalize Big Five scores to 0-1 range."""
    return {k: v / 100.0 for k, v in scores.items()}


def _compute_label_raw_score(normalized: Dict[str, float], weights: Dict[str, float]) -> float:
    """Compute raw score for a label using weights."""
    score = 0.0
    for trait_letter, weight in weights.items():
        trait_key = TRAIT_MAP.get(trait_letter)
        if trait_key and trait_key in normalized:
            score += normalized[trait_key] * weight
    return score


def _softmax_normalize(raw_scores: Dict[str, float]) -> Dict[str, int]:
    """Apply softmax to convert raw scores to percentages summing to 100."""
    if not raw_scores:
        return {}

    max_score = max(raw_scores.values())
    exp_scores = {k: math.exp(v - max_score) for k, v in raw_scores.items()}
    sum_exp = sum(exp_scores.values())

    result = {}
    for k, exp_val in exp_scores.items():
        result[k] = round((exp_val / sum_exp) * 100)

    # Adjust to ensure sum is exactly 100
    total = sum(result.values())
    if total != 100 and result:
        max_key = max(result, key=result.get)
        result[max_key] += 100 - total

    return result


def compute_facets(big5_scores: Dict[str, float]) -> List[Dict[str, Any]]:
    """Compute 6 facets with 4-quadrant percentages from Big Five scores."""
    normalized = _normalize_scores(big5_scores)
    facets = []

    for facet_name, facet_config in FACET_FORMULAS.items():
        raw_scores = {}
        for label_name, label_config in facet_config["labels"].items():
            raw_scores[label_name] = _compute_label_raw_score(normalized, label_config["weights"])

        percentages = _softmax_normalize(raw_scores)

        # Find dominant
        dominant = max(percentages, key=percentages.get)
        dominant_percent = percentages[dominant]

        labels = []
        for label_name, label_config in facet_config["labels"].items():
            labels.append(
                {
                    "name": label_name,
                    "percent": percentages.get(label_name, 0),
                    "description": label_config["description"],
                }
            )

        # Sort by percent descending
        labels.sort(key=lambda x: x["percent"], reverse=True)

        facets.append(
            {
                "name": facet_name,
                "title": facet_config["title"],
                "dominant": dominant,
                "dominant_percent": dominant_percent,
                "labels": labels,
            }
        )

    return facets


def get_percentile_label(score: float) -> str:
    """Get percentile label for a score."""
    if score <= 30:
        return "Low"
    elif score <= 70:
        return "Average"
    else:
        return "High"


def compute_scores_json(big5_scores: Dict[str, float]) -> List[Dict[str, Any]]:
    """Compute scores with percentile labels."""
    result = []
    for trait, score in big5_scores.items():
        result.append(
            {
                "trait": trait,
                "score": score,
                "percentile_label": get_percentile_label(score),
            }
        )
    return result


def generate_narrative(big5_scores: Dict[str, float]) -> Dict[str, Any]:
    """Generate personality type narrative based on Big Five scores.

    Uses the comprehensive personality_types module with 50+ scientifically-based types.
    Each type is determined by the combination of High/Medium/Low levels across all 5 traits.
    """
    from .personality_types import get_narrative_from_type, get_personality_type

    personality_type = get_personality_type(big5_scores)
    return get_narrative_from_type(personality_type)


def generate_strengths(big5_scores: Dict[str, float]) -> List[str]:
    """Generate strengths based on Big Five scores using the personality_types module."""
    from .personality_types import get_personality_type, get_strengths_from_type

    personality_type = get_personality_type(big5_scores)
    return get_strengths_from_type(personality_type)


def generate_challenges(big5_scores: Dict[str, float]) -> List[str]:
    """Generate potential challenges based on Big Five scores using the personality_types module."""
    from .personality_types import get_challenges_from_type, get_personality_type

    personality_type = get_personality_type(big5_scores)
    return get_challenges_from_type(personality_type)


def generate_cover(user_name: Optional[str], completed_at: datetime, report_type: str) -> Dict[str, Any]:
    """Generate cover page data with academic-quality intro paragraphs."""
    if report_type == "big5":
        title = "Báo Cáo Tính Cách Big Five"
        subtitle = "Hồ Sơ Tính Cách Nghề Nghiệp Của Bạn"
        intro_paragraphs = [
            "Báo cáo này trình bày phân tích toàn diện về tính cách của bạn dựa trên mô hình Big Five "
            "(còn gọi là OCEAN), một trong những khung lý thuyết được kiểm chứng thực nghiệm nhiều nhất "
            "trong tâm lý học tính cách. Hàng thập kỷ nghiên cứu đã xác lập Big Five là công cụ dự đoán "
            "đáng tin cậy về hành vi nơi làm việc và kết quả nghề nghiệp.",
            "Kết quả của bạn được tổ chức thành sáu mẫu hành vi, chuyển đổi các đặc điểm tính cách cốt lõi "
            "thành xu hướng thực tế tại nơi làm việc. Mỗi mẫu thể hiện cách kết hợp độc đáo của Cởi Mở (Openness), "
            "Tận Tâm (Conscientiousness), Hướng Ngoại (Extraversion), Dễ Chịu (Agreeableness) và "
            "Nhạy Cảm (Neuroticism) biểu hiện trong bối cảnh chuyên nghiệp.",
            "Hiểu các mẫu hành vi này cung cấp nền tảng cho việc ra quyết định nghề nghiệp sáng suốt, "
            "tự giới thiệu bản thân hiệu quả và phát triển chuyên môn có mục tiêu. Hãy sử dụng báo cáo này "
            "như công cụ tự phản ánh và khám phá nghề nghiệp.",
        ]
    else:
        title = "Báo Cáo Sở Thích Nghề Nghiệp RIASEC"
        subtitle = "Hồ Sơ Sở Thích Nghề Nghiệp Của Bạn"
        intro_paragraphs = [
            "Báo cáo này phân tích sở thích nghề nghiệp của bạn sử dụng mô hình RIASEC của Holland, "
            "một khung lý thuyết được kiểm chứng rộng rãi phân loại sở thích nghề nghiệp thành sáu loại: "
            "Kỹ Thuật (Realistic), Nghiên Cứu (Investigative), Nghệ Thuật (Artistic), Xã Hội (Social), "
            "Kinh Doanh (Enterprising) và Nghiệp Vụ (Conventional).",
            "Hồ sơ sở thích của bạn cho biết môi trường làm việc và hoạt động nào có khả năng mang lại "
            "sự hài lòng và gắn kết nhất. Nghiên cứu cho thấy sự phù hợp giữa sở thích và nghề nghiệp "
            "có tương quan với mức độ hài lòng và hiệu suất công việc.",
            "Hãy sử dụng những hiểu biết này để khám phá con đường nghề nghiệp phù hợp với sở thích "
            "tự nhiên của bạn và hiểu cách sở thích của bạn so sánh giữa các lĩnh vực nghề nghiệp khác nhau.",
        ]

    return {
        "title": title,
        "subtitle": subtitle,
        "user_name": user_name,
        "completed_at": completed_at.isoformat() if completed_at else None,
        "intro_paragraphs": intro_paragraphs,
    }


def compute_source_hash(scores: Dict[str, float]) -> str:
    """Compute hash of input scores to detect stale reports.

    Includes a version string to force regeneration when formulas change.
    """
    # Version bump this when formulas or logic changes to force regeneration
    VERSION = "v2_dynamic_facets"
    data = json.dumps({"version": VERSION, "scores": scores}, sort_keys=True)
    return hashlib.md5(data.encode()).hexdigest()


class ReportService:
    """Service for generating and retrieving reports."""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_template(self, template_key: str, locale: str = "en") -> Optional[ReportTemplate]:
        """Get active template or create default if not exists."""
        template = (
            self.db.query(ReportTemplate)
            .filter(and_(ReportTemplate.template_key == template_key, ReportTemplate.locale == locale, ReportTemplate.is_active))
            .first()
        )

        if not template:
            # Create default template
            template = ReportTemplate(
                template_key=template_key,
                version="1.0.0",
                locale=locale,
                title=f"Default {template_key} template",
                config_json={"version": "1.0.0", "formulas": FACET_FORMULAS if "big5" in template_key else {}},
                is_active=True,
            )
            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)

        return template

    def get_report(self, assessment_id: int, report_type: str, locale: str = "en") -> Optional[AssessmentReport]:
        """Get existing report for assessment."""
        return (
            self.db.query(AssessmentReport)
            .filter(
                and_(
                    AssessmentReport.assessment_id == assessment_id,
                    AssessmentReport.report_type == report_type,
                    AssessmentReport.locale == locale,
                )
            )
            .first()
        )

    def get_or_create_report(
        self,
        user_id: int,
        assessment_id: int,
        report_type: str,
        scores: Dict[str, float],
        user_name: Optional[str] = None,
        completed_at: Optional[datetime] = None,
        session_id: Optional[int] = None,
        locale: str = "en",
    ) -> AssessmentReport:
        """Get existing report or create new one."""
        # Check for existing report
        existing = self.get_report(assessment_id, report_type, locale)

        # Check if scores changed (stale check)
        source_hash = compute_source_hash(scores)
        if existing and existing.source_hash == source_hash:
            return existing

        # Get or create template
        template_key = "big5_v1" if report_type == "big5" else "riasec_v1"
        template = self.get_or_create_template(template_key, locale)

        if not template:
            raise ValueError(f"No template found for {template_key}")

        # Compute report data
        if report_type == "big5":
            facets = compute_facets(scores)
            scores_json = compute_scores_json(scores)
            narrative = generate_narrative(scores)
            strengths = generate_strengths(scores)
            challenges = generate_challenges(scores)
        else:
            # RIASEC - simpler structure
            facets = []
            scores_json = [{"trait": k, "score": v, "percentile_label": get_percentile_label(v)} for k, v in scores.items()]
            narrative = {"type_name": "RIASEC Profile", "type_description": "Your career interest profile", "paragraphs": []}
            strengths = []
            challenges = []

        cover = generate_cover(user_name, completed_at or datetime.utcnow(), report_type)

        if existing:
            # Generate pages_json for update
            pages_json = []
            if report_type == "big5":
                pages_json = [
                    {"page_no": 1, "page_key": "cover", "title": "Cover"},
                    {"page_no": 2, "page_key": "summary", "title": "Behavioral Patterns Summary"},
                    {"page_no": 3, "page_key": "facets-1", "title": "Thinking & Motivation"},
                    {"page_no": 4, "page_key": "facets-2", "title": "Interaction & Communication"},
                    {"page_no": 5, "page_key": "facets-3", "title": "Teamwork & Task Management"},
                    {"page_no": 6, "page_key": "strengths", "title": "Strengths & Challenges"},
                    {"page_no": 7, "page_key": "closing", "title": "Closing"},
                ]
            elif report_type == "riasec":
                pages_json = [
                    {"page_no": 1, "page_key": "riasec-cover", "title": "Cover"},
                    {"page_no": 2, "page_key": "riasec-content", "title": "Interest Pattern & Scores"},
                ]

            # Update existing report
            existing.source_hash = source_hash
            existing.computed_at = datetime.utcnow()
            existing.layout_version = "print_v1"
            existing.cover_json = cover
            existing.narrative_json = narrative
            existing.scores_json = scores_json
            existing.facets_json = facets
            existing.strengths_json = strengths
            existing.challenges_json = challenges
            existing.pages_json = pages_json
            existing.status = "ready"
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Generate pages_json for Big5 report
            pages_json = []
            if report_type == "big5":
                pages_json = [
                    {"page_no": 1, "page_key": "cover", "title": "Cover"},
                    {"page_no": 2, "page_key": "summary", "title": "Behavioral Patterns Summary"},
                    {"page_no": 3, "page_key": "facets-1", "title": "Thinking & Motivation"},
                    {"page_no": 4, "page_key": "facets-2", "title": "Interaction & Communication"},
                    {"page_no": 5, "page_key": "facets-3", "title": "Teamwork & Task Management"},
                    {"page_no": 6, "page_key": "strengths", "title": "Strengths & Challenges"},
                    {"page_no": 7, "page_key": "closing", "title": "Closing"},
                ]
            elif report_type == "riasec":
                pages_json = [
                    {"page_no": 1, "page_key": "riasec-cover", "title": "Cover"},
                    {"page_no": 2, "page_key": "riasec-content", "title": "Interest Pattern & Scores"},
                ]

            # Create new report
            report = AssessmentReport(
                user_id=user_id,
                session_id=session_id,
                assessment_id=assessment_id,
                template_id=template.id,
                report_type=report_type,
                locale=locale,
                status="ready",
                source_hash=source_hash,
                layout_version="print_v1",
                cover_json=cover,
                narrative_json=narrative,
                scores_json=scores_json,
                facets_json=facets,
                strengths_json=strengths,
                challenges_json=challenges,
                pages_json=pages_json,
            )
            self.db.add(report)
            self.db.commit()
            self.db.refresh(report)
            return report

    def log_event(
        self,
        user_id: int,
        assessment_id: int,
        report_id: int,
        report_type: str,
        event_type: str,
        event_uuid: Optional[str] = None,
        tab_key: Optional[str] = None,
        page_no: Optional[int] = None,
        page_key: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> Optional[ReportEvent]:
        """Log a report viewing event.

        Idempotent: if event_uuid already exists, skip insert and return None.

        Args:
            user_id: User ID
            assessment_id: Assessment ID
            report_id: Report ID
            report_type: 'big5' or 'riasec'
            event_type: 'open', 'tab_switch', 'page_view', 'scroll_depth', 'print'
            event_uuid: Unique identifier for idempotent logging
            tab_key: Tab key for tab_switch events
            page_no: Page number for page_view events
            page_key: Page key (e.g., 'cover', 'summary', 'facets-1')
            meta: Additional metadata (never null)

        Returns:
            ReportEvent if created, None if duplicate event_uuid
        """
        # Check for duplicate event_uuid
        if event_uuid:
            existing = self.db.query(ReportEvent).filter(ReportEvent.event_uuid == event_uuid).first()
            if existing:
                return None  # Skip duplicate

        event = ReportEvent(
            event_uuid=event_uuid,
            user_id=user_id,
            assessment_id=assessment_id,
            report_id=report_id,
            report_type=report_type,
            event_type=event_type,
            tab_key=tab_key,
            page_no=page_no,
            page_key=page_key,
            meta_json=meta or {},  # Ensure never null
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event
