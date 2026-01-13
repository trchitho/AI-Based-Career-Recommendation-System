"""
Report generation and storage service.
Computes Big5 facets and RIASEC patterns, stores snapshots in DB.
"""

import hashlib
import json
import math
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_

from .models import ReportTemplate, AssessmentReport, ReportEvent
from ..assessments.models import Assessment
from ..users.models import User


# ============ Heuristic Mapping Formulas ============
# Based on Truity's Career Personality Profiler
# Academic-quality descriptions for each behavioral label

FACET_FORMULAS = {
    "problemSolving": {
        "title": "How you think and solve problems",
        "labels": {
            "innovator": {
                "weights": {"O": 1, "C": -0.2},
                "description": "You approach problems with creativity and flexibility, seeking novel solutions and embracing unconventional methods."
            },
            "humanitarian": {
                "weights": {"A": 1, "O": 0.2},
                "description": "You prioritize collaborative problem-solving, considering the human impact and seeking solutions that benefit all stakeholders."
            },
            "caretaker": {
                "weights": {"C": 1, "O": -0.2},
                "description": "You prefer systematic, rule-based approaches to problems, valuing proven methods and organizational standards."
            },
            "pragmatist": {
                "weights": {"C": 0.3, "O": -1},
                "description": "You focus on practical, efficient solutions that maintain stability and deliver reliable, predictable outcomes."
            },
        }
    },
    "motivation": {
        "title": "How you get motivated",
        "labels": {
            "ambitious": {
                "weights": {"E": 1, "C": 1},
                "description": "You are driven by achievement and recognition, setting high goals and working persistently to accomplish them."
            },
            "dutiful": {
                "weights": {"C": 1, "N": -0.2},
                "description": "You find motivation in responsibility and commitment, deriving satisfaction from fulfilling obligations reliably."
            },
            "excitable": {
                "weights": {"E": 1, "N": 1},
                "description": "You are energized by enthusiasm and emotional engagement, thriving in dynamic environments with varied challenges."
            },
            "casual": {
                "weights": {"C": -1, "E": -0.2},
                "description": "You prefer a relaxed approach to work, valuing flexibility and work-life balance over rigid goal structures."
            },
        }
    },
    "interaction": {
        "title": "How you interact with others",
        "labels": {
            "gregarious": {
                "weights": {"E": 1},
                "description": "You naturally seek social connection, enjoying collaborative work and drawing energy from interpersonal interactions."
            },
            "dominant": {
                "weights": {"E": 1, "A": -1},
                "description": "You take charge in group settings, expressing opinions confidently and preferring leadership roles in interactions."
            },
            "supportive": {
                "weights": {"A": 1, "E": 0.2},
                "description": "You prioritize harmony and cooperation, actively supporting others and building positive relationships."
            },
            "independent": {
                "weights": {"E": -1, "A": -0.2},
                "description": "You prefer autonomous work, valuing self-reliance and maintaining professional boundaries in interactions."
            },
        }
    },
    "communication": {
        "title": "How you communicate",
        "labels": {
            "inspiring": {
                "weights": {"O": 1, "E": 1},
                "description": "You communicate with enthusiasm and creativity, using storytelling and vision to engage and motivate others."
            },
            "informative": {
                "weights": {"E": 1, "C": 1},
                "description": "You deliver information clearly and systematically, ensuring your message is well-organized and actionable."
            },
            "insightful": {
                "weights": {"O": 1, "E": -0.2},
                "description": "You communicate thoughtfully and reflectively, offering deep analysis and nuanced perspectives on topics."
            },
            "concise": {
                "weights": {"C": 1, "E": -1},
                "description": "You prefer direct, efficient communication, focusing on essential information without unnecessary elaboration."
            },
        }
    },
    "teamwork": {
        "title": "How you contribute to a team",
        "labels": {
            "cooperator": {
                "weights": {"A": 1},
                "description": "You prioritize team cohesion and consensus, working to maintain positive group dynamics and shared goals."
            },
            "taskmaster": {
                "weights": {"C": 1, "A": -0.2},
                "description": "You focus on deliverables and accountability, ensuring the team meets objectives and maintains high standards."
            },
            "empath": {
                "weights": {"A": 1, "O": 0.2},
                "description": "You attune to team members' needs and emotions, fostering an inclusive environment where everyone feels valued."
            },
            "improviser": {
                "weights": {"O": 1, "C": -1},
                "description": "You bring adaptability and creative thinking to teams, helping navigate unexpected challenges with flexibility."
            },
        }
    },
    "taskManagement": {
        "title": "How you manage tasks and projects",
        "labels": {
            "director": {
                "weights": {"C": 1, "E": 0.2},
                "description": "You take a structured leadership approach, organizing resources and guiding projects toward defined objectives."
            },
            "inspector": {
                "weights": {"C": 1, "O": -1},
                "description": "You excel at detailed oversight, ensuring quality through thorough review and adherence to established processes."
            },
            "visionary": {
                "weights": {"O": 1, "C": -0.2},
                "description": "You focus on strategic direction and innovation, identifying opportunities and setting ambitious project visions."
            },
            "responder": {
                "weights": {"C": -1, "E": 0.2},
                "description": "You adapt quickly to changing circumstances, handling emerging priorities with flexibility and responsiveness."
            },
        }
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
        result[max_key] += (100 - total)
    
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
            labels.append({
                "name": label_name,
                "percent": percentages.get(label_name, 0),
                "description": label_config["description"],
            })
        
        # Sort by percent descending
        labels.sort(key=lambda x: x["percent"], reverse=True)
        
        facets.append({
            "name": facet_name,
            "title": facet_config["title"],
            "dominant": dominant,
            "dominant_percent": dominant_percent,
            "labels": labels,
        })
    
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
        result.append({
            "trait": trait,
            "score": score,
            "percentile_label": get_percentile_label(score),
        })
    return result


def generate_narrative(big5_scores: Dict[str, float]) -> Dict[str, Any]:
    """Generate personality type narrative based on Big Five scores.
    
    Uses the comprehensive personality_types module with 50+ scientifically-based types.
    Each type is determined by the combination of High/Medium/Low levels across all 5 traits.
    """
    from .personality_types import get_personality_type, get_narrative_from_type
    
    personality_type = get_personality_type(big5_scores)
    return get_narrative_from_type(personality_type)


def generate_strengths(big5_scores: Dict[str, float]) -> List[str]:
    """Generate strengths based on Big Five scores using the personality_types module."""
    from .personality_types import get_personality_type, get_strengths_from_type
    
    personality_type = get_personality_type(big5_scores)
    return get_strengths_from_type(personality_type)


def generate_challenges(big5_scores: Dict[str, float]) -> List[str]:
    """Generate potential challenges based on Big Five scores using the personality_types module."""
    from .personality_types import get_personality_type, get_challenges_from_type
    
    personality_type = get_personality_type(big5_scores)
    return get_challenges_from_type(personality_type)


def generate_cover(user_name: Optional[str], completed_at: datetime, report_type: str) -> Dict[str, Any]:
    """Generate cover page data with academic-quality intro paragraphs."""
    if report_type == "big5":
        title = "Big Five Personality Report"
        subtitle = "Your Career Personality Profile"
        intro_paragraphs = [
            "This report presents a comprehensive analysis of your personality based on the Big Five "
            "model (also known as OCEAN), one of the most empirically validated frameworks in "
            "personality psychology. Decades of research have established the Big Five as a reliable "
            "predictor of workplace behavior and career outcomes.",
            "Your results are organized into six behavioral patterns that translate your core personality "
            "traits into practical workplace tendencies. Each pattern represents how your unique "
            "combination of Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism "
            "manifests in professional contexts.",
            "Understanding these patterns provides a foundation for informed career decision-making, "
            "effective self-presentation, and targeted professional development. Use this report as "
            "a tool for self-reflection and career exploration.",
        ]
    else:
        title = "RIASEC Career Interest Report"
        subtitle = "Your Career Interest Profile"
        intro_paragraphs = [
            "This report analyzes your career interests using Holland's RIASEC model, a widely "
            "validated framework that categorizes occupational interests into six types: Realistic, "
            "Investigative, Artistic, Social, Enterprising, and Conventional.",
            "Your interest profile indicates which work environments and activities are most likely "
            "to provide satisfaction and engagement. Research shows that career-interest alignment "
            "correlates with job satisfaction and performance.",
            "Use these insights to explore career paths that match your natural interests and to "
            "understand how your preferences compare across different occupational domains.",
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
        template = self.db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.template_key == template_key,
                ReportTemplate.locale == locale,
                ReportTemplate.is_active == True
            )
        ).first()
        
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
        return self.db.query(AssessmentReport).filter(
            and_(
                AssessmentReport.assessment_id == assessment_id,
                AssessmentReport.report_type == report_type,
                AssessmentReport.locale == locale,
            )
        ).first()
    
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
            existing = self.db.query(ReportEvent).filter(
                ReportEvent.event_uuid == event_uuid
            ).first()
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
