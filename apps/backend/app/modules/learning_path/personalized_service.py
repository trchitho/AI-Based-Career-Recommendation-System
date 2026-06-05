"""
Personalized Learning Roadmap Service — production-grade.

Sinh lộ trình học tập cá nhân hóa bằng Gemini AI dùng stream riêng (LEARNING_PATH).
Bám sát 100% các options của user, validate nhiều layer, không bịa data.

Module này chứa:
- TRUSTED_SOURCES: 6 nguồn khóa học uy tín
- DURATION_RULES: 12 mức thời gian (1-12 tháng) với giới hạn giờ/ngày
- LEVEL_PROMPTS: 8 cấp bậc nghề (intern → director)
- GOAL_PROMPTS: 6 mục tiêu học (career_switch, job_promotion, ...)
- EXPERIENCE_PROMPTS: 4 mức kinh nghiệm hiện tại
- PROJECT_PROMPTS: 3 cường độ dự án
- COMPANY_PROMPTS: 5 loại công ty mục tiêu
- STYLE_PROMPTS: 4 phong cách học
- DIFFICULTY_PROMPTS: 4 mức cường độ AI
- validate_personalization_input(): validate đầy đủ
- build_roadmap_prompt(): tạo prompt với hàng trăm rules
- generate_personalized_roadmap(): orchestrator chính

Kiến trúc post-validation:
1. Pattern validation (input)
2. AI generation (Gemini stream LEARNING_PATH)
3. JSON parse + ID injection
4. Course count + skill coverage validation
5. URL validation 4 layers (course_url_validator)
6. Persist DB
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from ...core.gemini_manager import multi_stream_manager

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ════════════════════════════════════════════════════════════════════════════

# ─── 6 nguồn khóa học uy tín ──────────────────────────────────────────────────
TRUSTED_SOURCES: List[Dict[str, str]] = [
    {
        "id": "coursera",
        "name": "Coursera",
        "url": "https://coursera.org",
        "strength": "Khóa học từ đại học hàng đầu thế giới (Stanford, Yale, Google), có chứng chỉ uy tín, có chế độ Audit miễn phí",
    },
    {
        "id": "udemy",
        "name": "Udemy",
        "url": "https://udemy.com",
        "strength": "Đa dạng chủ đề, giá phải chăng (200k-500k VND/khóa), thực hành nhanh, rất nhiều khóa Việt Nam",
    },
    {
        "id": "edx",
        "name": "edX",
        "url": "https://edx.org",
        "strength": "Học thuật chất lượng cao từ Harvard/MIT, MicroMasters chuyên sâu, chứng chỉ Verified được chấp nhận rộng rãi",
    },
    {
        "id": "linkedin_learning",
        "name": "LinkedIn Learning",
        "url": "https://linkedin.com/learning",
        "strength": "Kỹ năng nghề nghiệp thực dụng, chứng chỉ tự động hiển thị trên LinkedIn profile, ngắn gọn 1-3h/khóa",
    },
    {
        "id": "freecodecamp",
        "name": "freeCodeCamp",
        "url": "https://freecodecamp.org",
        "strength": "Hoàn toàn miễn phí 100%, hands-on heavy với projects, chứng chỉ free cho lập trình & data",
    },
    {
        "id": "pluralsight",
        "name": "Pluralsight",
        "url": "https://pluralsight.com",
        "strength": "Chuyên sâu về tech (DevOps, Cloud, Security), có Skill Assessment để đánh giá cấp độ chính xác",
    },
]


# ─── Rules thời gian học (12 mức từ 1 đến 12 tháng) ──────────────────────────
DURATION_RULES: Dict[int, Dict[str, Any]] = {
    1: {
        "min_hours": 4, "max_hours": 8,
        "desc": "Bootcamp tập trung cường độ cực cao",
        "intensity": "extreme", "phases_per_month": 4, "weekly_breaks": 0,
    },
    2: {
        "min_hours": 3, "max_hours": 6,
        "desc": "Cường độ rất cao, nhịp bootcamp",
        "intensity": "intensive", "phases_per_month": 4, "weekly_breaks": 0,
    },
    3: {
        "min_hours": 2.5, "max_hours": 5,
        "desc": "Cường độ cao, học liên tục",
        "intensity": "intensive", "phases_per_month": 4, "weekly_breaks": 1,
    },
    4: {
        "min_hours": 2, "max_hours": 4.5,
        "desc": "Nhịp độ chuyên nghiệp, đều đặn",
        "intensity": "standard", "phases_per_month": 4, "weekly_breaks": 1,
    },
    5: {
        "min_hours": 1.5, "max_hours": 4,
        "desc": "Nhịp độ ổn định, có break",
        "intensity": "standard", "phases_per_month": 4, "weekly_breaks": 1,
    },
    6: {
        "min_hours": 1.5, "max_hours": 3.5,
        "desc": "Nhịp độ bền vững (đề xuất cho người đi làm)",
        "intensity": "standard", "phases_per_month": 4, "weekly_breaks": 2,
    },
    7: {
        "min_hours": 1, "max_hours": 3,
        "desc": "Học đều đặn, vừa sức",
        "intensity": "gentle", "phases_per_month": 4, "weekly_breaks": 2,
    },
    8: {
        "min_hours": 1, "max_hours": 3,
        "desc": "Thoải mái, ổn định, có thời gian nghỉ",
        "intensity": "gentle", "phases_per_month": 4, "weekly_breaks": 2,
    },
    9: {
        "min_hours": 1, "max_hours": 2.5,
        "desc": "Học song song với công việc/học tập chính",
        "intensity": "gentle", "phases_per_month": 4, "weekly_breaks": 2,
    },
    10: {
        "min_hours": 1, "max_hours": 2.5,
        "desc": "Nhịp độ chậm rãi, không áp lực",
        "intensity": "gentle", "phases_per_month": 4, "weekly_breaks": 2,
    },
    11: {
        "min_hours": 1, "max_hours": 2,
        "desc": "Học bền vững dài hạn",
        "intensity": "gentle", "phases_per_month": 4, "weekly_breaks": 3,
    },
    12: {
        "min_hours": 1, "max_hours": 2,
        "desc": "Lộ trình toàn diện 1 năm, học chậm mà chắc",
        "intensity": "gentle", "phases_per_month": 4, "weekly_breaks": 3,
    },
}


# ─── Rules theo cấp bậc nghề nghiệp (8 levels) ───────────────────────────────
LEVEL_PROMPTS: Dict[str, Dict[str, str]] = {
    "intern": {
        "label": "Thực tập sinh",
        "focus": "Kiến thức nền tảng, làm quen công cụ cơ bản, hiểu workflow công ty",
        "depth": "Khái niệm cốt lõi, thực hành đơn giản, không yêu cầu thiết kế hệ thống",
        "rule": "Tránh các topic nâng cao như architecture/system design. Ưu tiên 'Hello World' projects. "
                "Bao gồm soft skills: cách báo cáo, đặt câu hỏi, làm việc nhóm trong môi trường thực tế.",
    },
    "fresher": {
        "label": "Mới ra trường",
        "focus": "Kỹ năng entry-level, build portfolio cơ bản, prep phỏng vấn",
        "depth": "Đầy đủ basics, 2-3 dự án portfolio nhỏ, kỹ năng phỏng vấn thực tế",
        "rule": "Bao gồm soft skills phỏng vấn (behavioral + technical). Mỗi tháng có 1 portfolio project. "
                "Cuối lộ trình phải có CV + LinkedIn + GitHub sẵn sàng apply.",
    },
    "junior": {
        "label": "Chuyên viên (Junior)",
        "focus": "Đào sâu kỹ năng, thực hành dự án thực tế, học best practices",
        "depth": "Trung cấp với best practices, design patterns cơ bản, code review, debug skills",
        "rule": "Ít nhất 1 dự án phức tạp/tháng. Học code review & git workflow chuẩn. "
                "Bao gồm Agile/Scrum basics, cách làm việc trong sprint.",
    },
    "mid": {
        "label": "Chuyên viên cấp cao (Mid)",
        "focus": "Mastery kỹ năng + system thinking + mentoring junior",
        "depth": "Nâng cao với architecture, performance optimization, scalability, debug phức tạp",
        "rule": "Bao gồm system design, leadership skills, mentoring junior. Có capstone project thực sự. "
                "Học cách viết technical documentation, RFC.",
    },
    "senior": {
        "label": "Chuyên gia (Senior)",
        "focus": "Architecture, lãnh đạo kỹ thuật, ra quyết định chiến lược",
        "depth": "Rất nâng cao - distributed systems, trade-offs, technical leadership, hiring",
        "rule": "Tập trung architecture decisions, technical writing, thuyết trình kỹ thuật. "
                "Bao gồm hiring/interview, mentoring multi-level, viết blog/talk.",
    },
    "lead": {
        "label": "Trưởng nhóm (Lead)",
        "focus": "Cross-team collaboration, technical strategy, hiring & onboarding",
        "depth": "Strategic - team management, technical roadmap, cross-functional work",
        "rule": "Bao gồm leadership courses, hiring playbooks, conflict resolution, OKRs. "
                "Học cách balance technical work vs people work, set team direction.",
    },
    "manager": {
        "label": "Quản lý",
        "focus": "People management, business alignment, hiring & firing, team growth",
        "depth": "Quản lý đội nhóm, ngân sách, KPI, stakeholder management",
        "rule": "Ít technical hơn, nhiều management/leadership. EQ và communication là core. "
                "Bao gồm 1-on-1 mastery, performance reviews, career laddering.",
    },
    "director": {
        "label": "Giám đốc",
        "focus": "Strategy, organization design, executive presence, board communication",
        "depth": "Chiến lược, vision, organizational design, ngân sách lớn, M&A awareness",
        "rule": "MBA-level content. Strategy frameworks (Porter, BCG), financial literacy, "
                "executive leadership, board governance, P&L responsibility.",
    },
}


# ─── Rules theo mục tiêu học (6 goals) ────────────────────────────────────────
GOAL_PROMPTS: Dict[str, Dict[str, str]] = {
    "career_switch": {
        "label": "Chuyển ngành",
        "rule": "PHẢI bắt đầu từ basics dù user có experience cũ ở ngành khác. "
                "Ưu tiên fundamentals trước, rồi mới đến chuyên sâu. "
                "Bao gồm 1-2 portfolio projects để chứng minh kỹ năng mới. "
                "Thêm tip về cách 'kể câu chuyện chuyển ngành' khi phỏng vấn — "
                "biến kinh nghiệm cũ thành lợi thế (transferable skills).",
    },
    "job_promotion": {
        "label": "Thăng chức",
        "rule": "Dựa trên kỹ năng đã có, tập trung vào kỹ năng cấp cao hơn. "
                "Bao gồm leadership, system design, mentoring. "
                "Mỗi phase phải có 1 deliverable demonstrate được cho cấp trên thấy "
                "(viết RFC, lead 1 initiative, mentor junior).",
    },
    "skill_upgrade": {
        "label": "Nâng cấp kỹ năng",
        "rule": "Tập trung vào kỹ năng cụ thể. Sâu hơn rộng. "
                "Mỗi phase đào sâu 1 chủ đề. Có thể bỏ qua basics nếu user đã thành thạo. "
                "Bao gồm advanced patterns, edge cases, performance tuning.",
    },
    "first_job": {
        "label": "Tìm việc đầu tiên",
        "rule": "Bao gồm: kỹ năng technical + soft skills phỏng vấn + cách viết CV + portfolio. "
                "Tháng cuối phải có mock interview, networking trên LinkedIn, apply chiến lược. "
                "Học cách chuẩn bị behavioral questions (STAR method), system design cơ bản.",
    },
    "freelance": {
        "label": "Làm freelance",
        "rule": "Bao gồm kỹ năng business: pricing, contract, client communication, marketing. "
                "Khóa học về platforms (Upwork, Fiverr, Toptal). "
                "Project portfolio là PRIORITY. Học cách viết proposal, "
                "quản lý nhiều client cùng lúc, time tracking.",
    },
    "side_project": {
        "label": "Dự án cá nhân",
        "rule": "Hands-on heavy. Mỗi tháng 1 mini-project. "
                "Ít theory, nhiều thực hành. Không cần certification. "
                "Tập trung MVP mindset, ship fast, iterate. "
                "Bao gồm cách deploy, monetize side project nếu cần.",
    },
}


# ─── Rules theo kinh nghiệm hiện có (4 levels) ───────────────────────────────
EXPERIENCE_PROMPTS: Dict[str, Dict[str, str]] = {
    "none": {
        "label": "Chưa có kinh nghiệm",
        "rule": "Bắt đầu từ ZERO. Giải thích cả thuật ngữ cơ bản. "
                "Ưu tiên video > đọc. Dùng analogies dễ hiểu. "
                "KHÔNG assume bất kỳ kiến thức nào. "
                "Mỗi khái niệm mới cần được giới thiệu kỹ với ví dụ thực tế.",
    },
    "beginner": {
        "label": "Người mới (0-1 năm)",
        "rule": "Đã biết basics. Có thể skip 'hello world'. "
                "Tập trung vào practical skills và 1-2 dự án thực tế. "
                "Thêm best practices, code style guidelines. "
                "Bắt đầu giới thiệu design patterns đơn giản.",
    },
    "intermediate": {
        "label": "Trung cấp (1-3 năm)",
        "rule": "Đã thành thạo basics. Tập trung intermediate-advanced topics. "
                "Bao gồm design patterns, performance, debugging phức tạp. "
                "Skip introductory courses. Đi sâu vào architecture decisions, "
                "trade-offs giữa các approach.",
    },
    "advanced": {
        "label": "Nâng cao (3+ năm)",
        "rule": "Chỉ recommend khóa học advanced/expert level. "
                "Ưu tiên architecture, system design, niche topics, expert content. "
                "Có thể là conference talks, advanced books, papers. "
                "KHÔNG recommend Udemy beginner courses. Tập trung leadership + thought leadership.",
    },
}


# ─── Rules theo cường độ dự án (3 levels) ─────────────────────────────────────
PROJECT_PROMPTS: Dict[str, str] = {
    "minimal": "Tập trung học lý thuyết & courses (~85% thời gian). "
               "Mỗi 3 tháng có 1 dự án nhỏ tổng kết kiến thức. "
               "Dự án đơn giản, chủ yếu để củng cố lý thuyết.",
    "balanced": "50% courses + 50% projects (mỗi tháng phân bổ ~70% courses + 30% projects). "
                "Mỗi tháng 1 mini project, mỗi 3 tháng 1 capstone project lớn. "
                "Cân bằng theory và practice.",
    "project_heavy": "70% projects + 30% courses (mỗi tháng phân bổ ~40% courses + 60% projects). "
                     "Mỗi tháng 1-2 dự án lớn. "
                     "Học để build, không học để biết. Output là các dự án có thể đưa vào portfolio.",
}


# ─── Rules theo loại công ty mục tiêu (5 types) ──────────────────────────────
COMPANY_PROMPTS: Dict[str, str] = {
    "startup": "Ưu tiên kỹ năng fullstack/multi-skill, agility, ownership mindset. "
               "Tránh quá chuyên sâu 1 mảng. "
               "Bao gồm product thinking, MVP mindset, growth hacking, "
               "khả năng wear many hats. Học cách làm việc trong môi trường thay đổi nhanh.",
    "enterprise": "Ưu tiên kỹ năng làm việc trong môi trường lớn: process, compliance, scalable patterns. "
                  "Bao gồm code review formal, documentation chuẩn, architecture review board. "
                  "Học cách navigate organizational politics, work with multiple stakeholders.",
    "agency": "Ưu tiên kỹ năng giao tiếp với khách hàng, multi-project management, presentation. "
              "Học cách viết proposal, scope management, client communication. "
              "Bao gồm time tracking, billable hours mindset.",
    "remote": "Ưu tiên async communication, self-management, async tools (Slack/Notion/Loom). "
              "Học cách viết documentation rõ ràng để giảm meeting. "
              "Bao gồm timezone management, deep work practices.",
    "any": "Cân bằng - vừa fullstack vừa có specialization. "
           "Soft skills universal: communication, collaboration, problem-solving. "
           "Học cách thích nghi với nhiều môi trường khác nhau.",
}


# ─── Rules theo phong cách học (4 styles) ─────────────────────────────────────
STYLE_PROMPTS: Dict[str, str] = {
    "video": "90% là video courses. Ít text/blog. "
             "Khuyến nghị tốc độ video 1.25x-1.5x để tiết kiệm thời gian. "
             "Bao gồm note-taking method (Cornell, mind map) khi xem video.",
    "reading": "Ưu tiên sách kinh điển, documentation, technical blogs (Martin Fowler, Joel Spolsky). "
               "Bao gồm các must-read books của lĩnh vực. "
               "Khuyến nghị active reading method (highlight + summary).",
    "practice": "Mỗi week ít nhất 1 practical exercise. "
                "LeetCode/HackerRank/Kaggle khi phù hợp. "
                "Mọi concept đều phải có hands-on ngay sau khi học. "
                "Khuyến nghị pair programming nếu có thể.",
    "mixed": "Cân bằng cả 3: 40% video, 30% reading, 30% practice/project. "
             "Học theo Feynman technique: học → giải thích → fix gap → review. "
             "Linh hoạt theo sở thích từng topic.",
}


# ─── Rules theo cường độ AI (4 levels) ────────────────────────────────────────
DIFFICULTY_PROMPTS: Dict[str, str] = {
    "gentle": "Easy pace. Mỗi tuần break 1 ngày. "
              "Mỗi tháng có 1 'review week' để củng cố. "
              "Không stress, không deadline cứng. "
              "Phù hợp cho người vừa đi làm vừa học.",
    "standard": "Pace bình thường, có challenge nhưng manageable. "
                "Recommend mỗi tuần break 1 ngày để recharge. "
                "Có deadline mềm, theo dõi tiến độ hàng tuần. "
                "Phù hợp cho đại đa số user.",
    "intensive": "High pace, ít break. Push limits. "
                 "Yêu cầu commitment cao 5-6 ngày/tuần. "
                 "Đánh giá hàng tuần. Có deadline cứng. "
                 "Phù hợp cho người muốn tăng tốc nhanh.",
    "extreme": "Bootcamp mode. Học 6-7 ngày/tuần, mỗi ngày 4-8 giờ. "
               "Mỗi ngày có deliverable. Yêu cầu cực kỳ commitment. "
               "Phù hợp khi user nghỉ ngắn để focus 100% vào học. "
               "Cảnh báo về burnout, cần plan nghỉ ngơi sau bootcamp.",
}


# ─── Mapping & helpers ────────────────────────────────────────────────────────
SLUG_TO_LEVEL_KEY: Dict[str, str] = {
    "intern": "intern", "thuc-tap-sinh": "intern",
    "fresher": "fresher", "moi-ra-truong": "fresher",
    "junior": "junior", "chuyen-vien": "junior", "tro-ly": "junior",
    "mid": "mid", "middle": "mid", "chuyen-vien-cap-cao": "mid",
    "senior": "senior", "chuyen-gia": "senior",
    "lead": "lead", "team-lead": "lead", "truong-nhom": "lead",
    "manager": "manager", "quan-ly": "manager",
    "director": "director", "giam-doc": "director",
}


# ════════════════════════════════════════════════════════════════════════════
# PUBLIC API — exports for routes.py
# ════════════════════════════════════════════════════════════════════════════

def get_duration_rules() -> Dict[int, Dict[str, Any]]:
    """Trả về toàn bộ rules thời gian học để frontend hiển thị options."""
    return DURATION_RULES


def get_trusted_sources() -> List[Dict[str, str]]:
    """Trả về 6 nguồn khóa học uy tín để frontend hiển thị checkbox."""
    return TRUSTED_SOURCES


def get_personalization_options() -> Dict[str, Any]:
    """Trả về toàn bộ options cho frontend hiển thị form."""
    return {
        "learning_goals": [
            {"value": k, "label": v["label"]} for k, v in GOAL_PROMPTS.items()
        ],
        "prior_experiences": [
            {"value": k, "label": v["label"]} for k, v in EXPERIENCE_PROMPTS.items()
        ],
        "weekly_patterns": [
            {"value": "daily", "label": "Mỗi ngày", "desc": "Học đều đặn 7 ngày/tuần"},
            {"value": "weekdays", "label": "Trong tuần", "desc": "Thứ 2 - Thứ 6"},
            {"value": "weekends", "label": "Cuối tuần", "desc": "Thứ 7 - Chủ nhật"},
            {"value": "flexible", "label": "Linh hoạt", "desc": "AI sẽ tối ưu lịch học"},
        ],
        "project_intensities": [
            {"value": "minimal", "label": "Tối thiểu", "desc": "Ít dự án, nhiều lý thuyết"},
            {"value": "balanced", "label": "Cân bằng", "desc": "50% học + 50% thực hành"},
            {"value": "project_heavy", "label": "Nặng dự án", "desc": "70% là dự án thực tế"},
        ],
        "target_company_types": [
            {"value": "startup", "label": "Startup", "desc": "Linh hoạt, đa kỹ năng"},
            {"value": "enterprise", "label": "Tập đoàn", "desc": "Quy trình bài bản"},
            {"value": "agency", "label": "Agency", "desc": "Làm việc với nhiều khách hàng"},
            {"value": "remote", "label": "Remote", "desc": "Làm việc từ xa"},
            {"value": "any", "label": "Linh hoạt", "desc": "Mọi loại công ty"},
        ],
        "ai_difficulty_levels": [
            {"value": "gentle", "label": "Nhẹ nhàng", "desc": "Có break, không áp lực"},
            {"value": "standard", "label": "Tiêu chuẩn", "desc": "Pace bình thường"},
            {"value": "intensive", "label": "Cường độ cao", "desc": "Ít break, push limits"},
            {"value": "extreme", "label": "Cực đại", "desc": "Bootcamp mode, full commit"},
        ],
    }


def get_career_levels_for_analysis(db: Session, career_id: str) -> List[Dict[str, Any]]:
    """Lấy levels từ DB dựa trên career_id (slug hoặc onet_code)."""
    query = text("""
        SELECT DISTINCT
            cgl.id, cgl.level_name_vi, cgl.level_slug, cgl.level_order,
            cgl.description_vi, cgl.min_exp_years, cgl.max_exp_years
        FROM core.career_group_levels cgl
        JOIN core.career_groups cg ON cgl.group_id = cg.id
        JOIN core.career_group_mapping cgm ON cg.id = cgm.group_id
        JOIN core.careers c ON c.id = cgm.career_id
        WHERE c.slug = :career_id OR c.onet_code = :career_id
        ORDER BY cgl.level_order ASC
    """)
    rows = db.execute(query, {"career_id": career_id}).mappings().all()
    return [
        {
            "id": row["id"],
            "name": row["level_name_vi"],
            "slug": row["level_slug"],
            "order": row["level_order"],
            "description": row["description_vi"],
            "min_exp": row["min_exp_years"],
            "max_exp": row["max_exp_years"],
        }
        for row in rows
    ]


def _slug_to_level_key(level_slug: str) -> str:
    """Map level_slug từ DB sang key của LEVEL_PROMPTS."""
    slug_lower = (level_slug or "").lower()
    for key, val in SLUG_TO_LEVEL_KEY.items():
        if key in slug_lower:
            return val
    return "junior"  # default an toàn


# ════════════════════════════════════════════════════════════════════════════
# VALIDATION
# ════════════════════════════════════════════════════════════════════════════

def validate_personalization_input(
    duration_months: int,
    daily_hours: float,
    preferred_sources: List[str],
    missing_skills_count: int,
    budget_type: str = "mixed",
    learning_style: str = "mixed",
    preferred_language: str = "vi",
    max_budget: Optional[float] = None,
    weekly_pattern: Optional[str] = None,
    project_intensity: Optional[str] = None,
    prior_experience: Optional[str] = None,
    learning_goal: Optional[str] = None,
    target_company_type: Optional[str] = None,
    ai_difficulty_level: Optional[str] = None,
) -> Optional[str]:
    """Validate input. Trả về error message tiếng Việt nếu invalid, None nếu OK.

    Validation chia thành nhiều layer:
    1. Range check (duration, hours)
    2. Cross-validation (giờ/ngày phù hợp với duration)
    3. Sources check (≥3, đều thuộc TRUSTED_SOURCES)
    4. Enum check (budget_type, learning_style, ...)
    5. Budget logic (mixed + max_budget < 300k)
    6. Coverage check (đủ giờ học cho skills count)
    """
    # Layer 1: Range check
    if duration_months < 1 or duration_months > 12:
        return "Thời gian lộ trình phải từ 1 đến 12 tháng."

    rules = DURATION_RULES.get(duration_months)
    if not rules:
        return "Thời gian không hợp lệ."

    if daily_hours < 0.5 or daily_hours > 10:
        return "Giờ học mỗi ngày phải từ 0.5 đến 10 giờ."

    # Layer 2: Cross-validation
    if daily_hours < rules["min_hours"]:
        return (
            f"Với lộ trình {duration_months} tháng, cần tối thiểu {rules['min_hours']} giờ/ngày "
            f"để đủ thời gian cover các kỹ năng."
        )

    if daily_hours > rules["max_hours"]:
        return (
            f"Với lộ trình {duration_months} tháng, tối đa {rules['max_hours']} giờ/ngày "
            f"để tránh burnout. Hãy giảm thời gian/ngày hoặc rút ngắn lộ trình."
        )

    # Layer 3: Sources check
    if len(preferred_sources) < 3:
        return "Vui lòng chọn ít nhất 3 nguồn khóa học để AI có đủ lựa chọn."

    valid_source_ids = {s["id"] for s in TRUSTED_SOURCES}
    for src in preferred_sources:
        if src not in valid_source_ids:
            return f"Nguồn '{src}' không hợp lệ. Chỉ được chọn: {', '.join(valid_source_ids)}."

    # Layer 4: Enum check
    if budget_type not in ("free", "paid", "mixed", "budget"):
        return "Loại ngân sách không hợp lệ. Chọn: Miễn phí / Trả phí / Kết hợp."

    if learning_style not in ("video", "reading", "practice", "mixed"):
        return "Phong cách học không hợp lệ. Chọn: Video / Đọc / Thực hành / Kết hợp."

    if preferred_language not in ("vi", "en"):
        return "Ngôn ngữ không hợp lệ. Chọn: Tiếng Việt / Tiếng Anh."

    # Layer 5: Budget logic
    if budget_type == "budget":
        if max_budget is None or max_budget <= 0:
            return "Vui lòng nhập ngân sách hợp lệ."
        if max_budget < 300000:
            return "Ngân sách tối thiểu là 300,000đ khi đặt giới hạn."
        if max_budget > 100_000_000:
            return "Ngân sách tối đa 100,000,000đ. Liên hệ admin nếu cần cao hơn."

    # Layer 5b: Optional enums
    if weekly_pattern is not None and weekly_pattern not in ("daily", "weekdays", "weekends", "flexible"):
        return "Pattern học theo tuần không hợp lệ."

    if project_intensity is not None and project_intensity not in ("minimal", "balanced", "project_heavy"):
        return "Cường độ dự án không hợp lệ."

    if prior_experience is not None and prior_experience not in EXPERIENCE_PROMPTS:
        return "Kinh nghiệm hiện có không hợp lệ."

    if learning_goal is not None and learning_goal not in GOAL_PROMPTS:
        return "Mục tiêu học không hợp lệ."

    if target_company_type is not None and target_company_type not in COMPANY_PROMPTS:
        return "Loại công ty mục tiêu không hợp lệ."

    if ai_difficulty_level is not None and ai_difficulty_level not in DIFFICULTY_PROMPTS:
        return "Mức độ khó không hợp lệ."

    # Layer 6: Coverage check (tính cả ngày break)
    breaks = rules.get("weekly_breaks", 1)
    active_days_per_week = max(7 - breaks, 1)
    effective_days = int(duration_months * 30 * (active_days_per_week / 7))
    total_hours = effective_days * daily_hours
    hours_per_skill = total_hours / max(missing_skills_count, 1)
    if hours_per_skill < 5:
        return (
            f"Với {missing_skills_count} kỹ năng cần học, thời gian {duration_months} tháng × "
            f"{daily_hours} giờ/ngày = {total_hours:.0f} giờ chưa đủ "
            f"(chỉ {hours_per_skill:.1f} giờ/kỹ năng). Hãy tăng thời gian hoặc giờ học."
        )

    return None


# ════════════════════════════════════════════════════════════════════════════
# COURSE COUNT MATH — tính số khóa học tối thiểu/phase theo options
# ════════════════════════════════════════════════════════════════════════════

def _compute_course_targets(
    duration_months: int,
    daily_hours: float,
    project_intensity: Optional[str],
    total_skills: int,
) -> Dict[str, Any]:
    """Tính targets cho số khóa học/phase và toàn lộ trình.

    Logic:
    - Tổng giờ active/phase = daily_hours × effective_days_per_phase
    - Trừ thời gian dự án theo project_intensity
    - Chia 12-15h/khóa average
    - Min total = max(duration × min_per_phase, total_skills / 2)
    """
    rules = DURATION_RULES[duration_months]
    breaks = rules.get("weekly_breaks", 1)
    effective_days_per_phase = 30 * (7 - breaks) / 7
    total_hours_per_phase = daily_hours * effective_days_per_phase

    project_factor_map = {
        "project_heavy": 0.40,
        "minimal": 0.85,
        "balanced": 0.70,
    }
    project_factor = project_factor_map.get(project_intensity or "balanced", 0.70)
    study_hours_per_phase = total_hours_per_phase * project_factor

    avg_course_hours = 12  # average course length
    min_courses_per_phase = max(2, int(study_hours_per_phase / 15))
    rec_courses_per_phase = max(3, int(study_hours_per_phase / avg_course_hours))

    min_total_courses = max(
        duration_months * min_courses_per_phase,
        total_skills // 2,
    )

    return {
        "effective_days_per_phase": int(effective_days_per_phase),
        "total_hours_per_phase": round(total_hours_per_phase, 1),
        "study_hours_per_phase": round(study_hours_per_phase, 1),
        "min_courses_per_phase": min_courses_per_phase,
        "rec_courses_per_phase": rec_courses_per_phase,
        "min_total_courses": min_total_courses,
        "avg_course_hours": avg_course_hours,
    }


# ════════════════════════════════════════════════════════════════════════════
# PROMPT BUILDER
# ════════════════════════════════════════════════════════════════════════════

def build_roadmap_prompt(
    career_title: str,
    level_slug: str,
    level_name: str,
    critical_skills: List[str],
    important_skills: List[str],
    existing_skills: List[str],
    duration_months: int,
    daily_hours: float,
    weekly_pattern: str,
    preferred_sources: List[str],
    budget_type: str,
    max_budget: Optional[float],
    learning_style: str,
    project_intensity: str,
    preferred_language: str,
    prior_experience: str,
    learning_goal: str,
    target_company_type: str,
    ai_difficulty_level: str,
    certification_priority: bool,
    current_position: Optional[str],
    target_salary_range: Optional[str],
    user_notes: Optional[str],
    study_time: Optional[str] = None,
    email_reminder: bool = False,
) -> str:
    """Tạo prompt rất chi tiết với rules layered theo nhiều dimensions."""

    rules = DURATION_RULES[duration_months]
    level_key = _slug_to_level_key(level_slug)
    level_prompt = LEVEL_PROMPTS.get(level_key, LEVEL_PROMPTS["junior"])
    goal_prompt = GOAL_PROMPTS.get(learning_goal or "skill_upgrade", GOAL_PROMPTS["skill_upgrade"])
    exp_prompt = EXPERIENCE_PROMPTS.get(prior_experience or "intermediate", EXPERIENCE_PROMPTS["intermediate"])
    project_rule = PROJECT_PROMPTS.get(project_intensity or "balanced", PROJECT_PROMPTS["balanced"])
    company_rule = COMPANY_PROMPTS.get(target_company_type or "any", COMPANY_PROMPTS["any"])
    style_rule = STYLE_PROMPTS.get(learning_style, STYLE_PROMPTS["mixed"])
    diff_rule = DIFFICULTY_PROMPTS.get(ai_difficulty_level or rules["intensity"], DIFFICULTY_PROMPTS["standard"])

    source_names = [s["name"] for s in TRUSTED_SOURCES if s["id"] in preferred_sources]

    budget_desc = {
        "free": "CHỈ recommend khóa học MIỄN PHÍ. Bao gồm Coursera audit mode, freeCodeCamp, YouTube. "
                "Không được recommend khóa trả phí dù chất lượng cao hơn.",
        "paid": "Ưu tiên khóa học TRẢ PHÍ chất lượng cao. Bao gồm khóa học có chứng chỉ Verified. "
                "Có thể có vài khóa free bổ trợ nhưng phần chính là paid.",
        "mixed": "Kết hợp 50/50 free và paid. Ưu tiên free khi chất lượng tương đương. "
                 "Paid chỉ khi free không đủ chất lượng hoặc thiếu cert.",
        "budget": f"Tổng chi phí KHÔNG VƯỢT QUÁ {int(max_budget or 0):,}đ. "
                  f"Tính toán cẩn thận, ưu tiên free + 1-2 khóa paid quan trọng nhất. "
                  f"Cộng dồn `price_vnd` của tất cả khóa phải ≤ {int(max_budget or 0):,}đ.",
    }.get(budget_type, "Kết hợp")

    cert_rule = (
        "BẮT BUỘC ưu tiên khóa học có chứng chỉ (Coursera Cert, edX Verified, LinkedIn Learning Cert). "
        "Mỗi tháng phải có ít nhất 1 khóa có cert. "
        "Các khóa cert giúp user thêm vào CV/LinkedIn để tăng tín dụng."
        if certification_priority
        else "Chứng chỉ là optional. Không cần ưu tiên đặc biệt. "
             "Tập trung vào nội dung chứ không phải bằng cấp."
    )

    pattern_rule = {
        "daily": "Học mỗi ngày 7/7. Lịch học đều, không có ngày off. "
                 "Phù hợp người không có công việc khác chiếm thời gian.",
        "weekdays": "Học thứ 2-6 (5 ngày/tuần). Cuối tuần off để rest. "
                    "Phù hợp người có công việc/học chính vào weekday.",
        "weekends": "Chỉ học thứ 7 + CN. Mỗi ngày học DÀI hơn để bù 5 ngày off. "
                    "Phù hợp người đi làm full-time bận rộn weekday.",
        "flexible": "Linh hoạt. AI chia đều thành 5-6 ngày/tuần với 1-2 ngày off. "
                    "Adapt theo schedule cá nhân.",
    }.get(weekly_pattern or "flexible", "Linh hoạt")

    extra_context_section = ""
    extra_lines = []
    if current_position:
        extra_lines.append(f"- Vị trí hiện tại: {current_position}")
    if target_salary_range:
        extra_lines.append(f"- Mức lương mong muốn: {target_salary_range}")
    if user_notes:
        extra_lines.append(f"- Ghi chú thêm từ user: {user_notes}")
    if extra_lines:
        extra_context_section = "\n## BỐI CẢNH CÁ NHÂN:\n" + "\n".join(extra_lines)

    # ─── Tính course targets cho RULE 11 ─────────────────────────────────
    total_skills = len(critical_skills) + len(important_skills)
    targets = _compute_course_targets(
        duration_months=duration_months,
        daily_hours=daily_hours,
        project_intensity=project_intensity,
        total_skills=total_skills,
    )

    # ─── Build the comprehensive prompt ──────────────────────────────────
    prompt = f"""Bạn là chuyên gia tư vấn lộ trình học tập nghề nghiệp HÀNG ĐẦU. Hãy tạo lộ trình CHI TIẾT, THỰC TẾ, ĐƯỢC CÁ NHÂN HÓA SÂU bằng tiếng Việt.

# ════════════════════ THÔNG TIN CƠ BẢN ════════════════════
- **Nghề mục tiêu**: {career_title}
- **Cấp bậc nhắm tới**: {level_name} ({level_prompt['label']})
- **Kinh nghiệm hiện tại**: {exp_prompt['label']}
- **Mục tiêu học**: {goal_prompt['label']}
- **Loại công ty mục tiêu**: {target_company_type}
- **Thời gian**: {duration_months} tháng × {daily_hours} giờ/ngày = {duration_months * 30 * daily_hours:.0f} giờ tổng
- **Pattern học**: {pattern_rule}
- **Ngôn ngữ ưu tiên**: {'Tiếng Việt' if preferred_language == 'vi' else 'Tiếng Anh'}
- **Giờ học cố định**: {study_time or '(linh hoạt, AI tự đề xuất)'}
- **Email reminder**: {'BẬT' if email_reminder else 'TẮT'}
{extra_context_section}

# ════════════════════ KỸ NĂNG CẦN HỌC ════════════════════
**ƯU TIÊN 1 - QUAN TRỌNG (Critical) — {len(critical_skills)} kỹ năng - PHẢI HỌC TRƯỚC**:
{', '.join(critical_skills[:30]) or '(không có)'}

**ƯU TIÊN 2 - NÊN CÓ (Important) — {len(important_skills)} kỹ năng - HỌC SAU CRITICAL**:
{', '.join(important_skills[:30]) or '(không có)'}

**KỸ NĂNG ĐÃ CÓ (KHÔNG dạy lại)**:
{', '.join(existing_skills[:30]) or '(không có)'}

**TỔNG SKILLS CẦN COVER**: {total_skills}

# ════════════════════ RULES NGHIÊM NGẶT ════════════════════

## RULE 1 - Theo cấp bậc {level_prompt['label']}:
- Trọng tâm: {level_prompt['focus']}
- Độ sâu: {level_prompt['depth']}
- Đặc thù: {level_prompt['rule']}

## RULE 2 - Theo mục tiêu {goal_prompt['label']}:
{goal_prompt['rule']}

## RULE 3 - Theo kinh nghiệm {exp_prompt['label']}:
{exp_prompt['rule']}

## RULE 4 - Cường độ dự án ({project_intensity or 'balanced'}):
{project_rule}

## RULE 5 - Phong cách học ({learning_style}):
{style_rule}

## RULE 6 - Loại công ty {target_company_type}:
{company_rule}

## RULE 7 - Mức độ khó AI ({ai_difficulty_level or rules['intensity']}):
{diff_rule}

## RULE 8 - Ngân sách:
{budget_desc}

## RULE 9 - Chứng chỉ:
{cert_rule}

## RULE 10 - Nguồn khóa học (CHỈ dùng các nguồn này):
{', '.join(source_names)}
- Mỗi khóa học PHẢI có thật trên các nền tảng đó
- Tên khóa học, instructor, URL phải chính xác (search được trên Google)
- KHÔNG bịa khóa học không tồn tại

## RULE 11 - THỜI LƯỢNG NGHIÊM NGẶT (BẮT BUỘC TUÂN THỦ):
- Tổng phases = {duration_months} tháng (1 phase/tháng)
- **Tổng giờ học mỗi phase** = {daily_hours} giờ/ngày × {targets['effective_days_per_phase']} ngày active = {targets['total_hours_per_phase']} giờ
- **Trừ thời gian dự án** ({project_intensity or 'balanced'}): còn lại {targets['study_hours_per_phase']} giờ cho khóa học/phase
- **SỐ KHÓA HỌC TỐI THIỂU mỗi phase**: **{targets['min_courses_per_phase']} khóa**
- **SỐ KHÓA HỌC ĐỀ XUẤT mỗi phase**: **{targets['rec_courses_per_phase']} khóa**
- **TỔNG KHÓA HỌC TOÀN LỘ TRÌNH**: tối thiểu **{targets['min_total_courses']} khóa**
- KHÔNG được ít hơn số này. Mỗi khóa duration_hours nên là 8-20 giờ.
- Nếu khóa Coursera specialization quá dài (>30h), chia thành các module riêng

## RULE 11.5 - PHỦ KỸ NĂNG (CRITICAL - bắt buộc):
- Tổng có **{total_skills} skills** cần cover ({len(critical_skills)} critical + {len(important_skills)} important)
- **MỖI SKILL phải có ít nhất 1 khóa CỤ THỂ dạy nó** (không phải khóa generic)
- Phase 1-{(duration_months + 1) // 2}: cover hết CRITICAL skills
- Phase {(duration_months + 1) // 2 + 1}-{duration_months}: cover IMPORTANT skills + advanced
- Trong từng phase, list `skills` PHẢI ghi rõ skills nào được dạy bởi khóa nào
- Output `course.key_takeaways` PHẢI bao gồm tên skills cụ thể đó

## RULE 12 - Tiến độ & milestones:
- Mỗi phase PHẢI có milestone đo lường được (build cái gì, học xong cái gì)
- ĐIỀU KIỆN qua phase: hoàn thành tất cả courses + 1 mini-project + tự kiểm tra checklist
- Milestone cuối cùng: capstone project + portfolio sẵn sàng apply
- `completion_criteria` PHẢI là numbered list "1. ... 2. ... 3. ..." (tách rõ từng tiêu chí)

## RULE 13 - Sắp xếp logic theo skills:
- Phase 1: 2-3 critical skills nền tảng (xây foundation)
- Phase 2-{max(duration_months - 1, 1)}: critical skills intermediate + tích lũy important skills
- Phase cuối ({duration_months}): polish portfolio + interview prep + advanced topics
- Mỗi khóa phải MAP RÕ tới 1-3 skills cụ thể trong `skills` array của phase đó

## RULE 14 - Practice projects:
- Mỗi phase có 1-2 dự án thực hành áp dụng skills đã học
- Dự án phải REALISTIC (không phải toy project), có thể đưa lên GitHub
- Mỗi dự án có description, tech stack, deliverables, learning_outcomes

## RULE 15 - LỊCH HỌC THEO TUẦN (BẮT BUỘC):
- `weekly_schedule` là object có 7 keys: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- Pattern '{weekly_pattern or 'flexible'}' quyết định những ngày nào có học:
  + 'daily': cả 7 ngày đều học, mỗi ngày {daily_hours}h
  + 'weekdays': chỉ Thứ 2-Thứ 6 (5 ngày), mỗi ngày {daily_hours}h, T7+CN nghỉ
  + 'weekends': chỉ T7+CN (2 ngày), mỗi ngày phải DÀI HƠN để bù
  + 'flexible': 5-6 ngày/tuần, AI tự sắp xếp
- Mỗi key giá trị là object {{ "time_slot": "HH:MM-HH:MM", "activity": "nội dung học cụ thể" }}
- Nếu ngày OFF: {{ "time_slot": "off", "activity": "Nghỉ" }}
- Giờ bắt đầu nên dựa vào `study_time` user đặt: {study_time or '(linh hoạt)'} (nếu không đặt thì AI chọn giờ hợp lý)
- Khung giờ trong 1 ngày active = ĐÚNG {daily_hours}h liên tục (vd: 19:30-22:00 cho 2.5h)
- Nội dung activity phải KHÁC NHAU mỗi ngày trong tuần (đa dạng: học khóa, thực hành, project, review, networking)
- KHÔNG được lặp lại nội dung giữa các ngày

VÍ DỤ cho user 2.5h/ngày, study_time='19:30', pattern='daily':
{{
  "monday": {{ "time_slot": "19:30-22:00", "activity": "Học video bài giảng modul 1 của khóa X (90 phút) + take notes (40 phút) + review (20 phút)" }},
  "tuesday": {{ "time_slot": "19:30-22:00", "activity": "Thực hành coding theo bài đã học T2 (120 phút) + ghi nhật ký lỗi (30 phút)" }},
  "wednesday": {{ "time_slot": "19:30-22:00", "activity": "Học modul 2 của khóa X (100 phút) + làm quiz (30 phút) + đọc tài liệu mở rộng (20 phút)" }},
  "thursday": {{ "time_slot": "19:30-22:00", "activity": "Build mini project áp dụng kiến thức (130 phút) + commit lên GitHub (20 phút)" }},
  "friday": {{ "time_slot": "19:30-22:00", "activity": "Học modul 3 (80 phút) + thực hành code lab (60 phút) + tổng hợp tuần (10 phút)" }},
  "saturday": {{ "time_slot": "19:30-22:00", "activity": "Capstone project tuần (130 phút) + viết documentation (20 phút)" }},
  "sunday": {{ "time_slot": "19:30-22:00", "activity": "Review tuần (60 phút) + tự đánh giá tiến độ (40 phút) + plan tuần sau (50 phút)" }}
}}

VÍ DỤ cho pattern='weekdays' (T2-T6 học, T7+CN nghỉ):
{{
  "monday": {{ "time_slot": "19:30-22:00", "activity": "..." }},
  "tuesday": {{ "time_slot": "19:30-22:00", "activity": "..." }},
  "wednesday": {{ "time_slot": "19:30-22:00", "activity": "..." }},
  "thursday": {{ "time_slot": "19:30-22:00", "activity": "..." }},
  "friday": {{ "time_slot": "19:30-22:00", "activity": "..." }},
  "saturday": {{ "time_slot": "off", "activity": "Nghỉ ngơi" }},
  "sunday": {{ "time_slot": "off", "activity": "Nghỉ ngơi" }}
}}

# ════════════════════ OUTPUT (JSON) ════════════════════
Trả về DUY NHẤT 1 JSON object, KHÔNG có markdown ```, KHÔNG có giải thích:

{{
  "summary": "Tóm tắt lộ trình DÀI 8-12 CÂU bằng tiếng Việt. PHẢI nêu RÕ và CỤ THỂ: (1) Bối cảnh user là ai - dựa trên current_position '{current_position or '(không khai báo)'}' và prior_experience '{exp_prompt['label']}', (2) Tại sao chọn cấp bậc {level_prompt['label']} - giải thích phù hợp ra sao với background, (3) Mục tiêu cụ thể '{goal_prompt['label']}' và cách lộ trình hỗ trợ, (4) Approach học - kết hợp giữa phong cách '{learning_style}' và cường độ dự án '{project_intensity or 'balanced'}', (5) Thời gian {duration_months} tháng × {daily_hours}h/ngày phân bổ ra sao theo pattern '{weekly_pattern or 'flexible'}', (6) Loại công ty mục tiêu {target_company_type} và kỹ năng được ưu tiên, (7) Ngân sách {budget_type} với {'giới hạn ' + str(int(max_budget or 0)) + 'đ' if max_budget else 'không giới hạn'}, (8) Kết quả kỳ vọng cuối lộ trình. KHÔNG bịa thông tin user không khai báo.",
  "summary_bullets": [
    "Điểm 1 ngắn gọn 1-2 câu: Bối cảnh user (vị trí hiện tại + kinh nghiệm)",
    "Điểm 2 ngắn gọn 1-2 câu: Cấp bậc nhắm tới và lý do phù hợp",
    "Điểm 3 ngắn gọn 1-2 câu: Mục tiêu học và cách lộ trình hỗ trợ",
    "Điểm 4 ngắn gọn 1-2 câu: Approach học (phong cách + cường độ dự án)",
    "Điểm 5 ngắn gọn 1-2 câu: Phân bổ thời gian (tháng × giờ/ngày × pattern)",
    "Điểm 6 ngắn gọn 1-2 câu: Loại công ty mục tiêu và kỹ năng ưu tiên",
    "Điểm 7 ngắn gọn 1-2 câu: Ngân sách và cách chọn khóa học",
    "Điểm 8 ngắn gọn 1-2 câu: Kết quả kỳ vọng cuối lộ trình"
  ],
  "total_weeks": {duration_months * 4},
  "total_courses": <số ≥ {targets['min_total_courses']}>,
  "estimated_cost_vnd": <số tiền tổng>,
  "personalization_highlights": [
    "<Mỗi điểm 2-3 CÂU CHI TIẾT, giải thích cụ thể>",
    "<Điểm 1: Cấp bậc {level_prompt['label']} - phân tích depth/scope phù hợp với current_position và prior_experience>",
    "<Điểm 2: Mục tiêu {goal_prompt['label']} - lộ trình tập trung gì>",
    "<Điểm 3: Kinh nghiệm {exp_prompt['label']} - lộ trình bắt đầu từ đâu, skip gì>",
    "<Điểm 4: Loại công ty {target_company_type} - kỹ năng ưu tiên, văn hóa làm việc>",
    "<Điểm 5: Pattern '{weekly_pattern or 'flexible'}' và {duration_months} tháng × {daily_hours}h/ngày>",
    "<Điểm 6: Cường độ '{ai_difficulty_level or 'standard'}' - mức áp lực, break, deliverable>",
    "<Điểm 7: Phong cách '{learning_style}' - tỷ lệ video/đọc/thực hành cụ thể>",
    "<Điểm 8: Cường độ dự án '{project_intensity or 'balanced'}' - số dự án/tháng>",
    "<Điểm 9: Ngân sách {budget_type} {'với giới hạn ' + str(int(max_budget or 0)) + 'đ' if max_budget else ''} - cách phân bổ chi phí>",
    "<Điểm 10: Chứng chỉ {'BẮT BUỘC' if certification_priority else 'không bắt buộc'} - lý do và lợi ích>",
    "<Điểm 11: Email reminder {'BẬT' if email_reminder else 'tắt'}, study_time '{study_time or '(chưa đặt)'}' - hỗ trợ duy trì routine>",
    "<Nếu user_notes='{user_notes or ''}' hãy thêm điểm 12+ giải thích>",
    "<Nếu target_salary_range='{target_salary_range or ''}' phân tích kỹ năng để đạt mức lương đó>"
  ],
  "phases": [
    {{
      "phase": 1,
      "phase_id": "phase-1-<slug-tieng-anh>",
      "month": 1,
      "title": "Tên giai đoạn (VN, mô tả rõ ràng, 5-10 từ)",
      "weeks": "Tuần 1-4",
      "focus": "Trọng tâm phase này - VIẾT 6-10 CÂU bằng tiếng Việt, GIẢI THÍCH SÂU",
      "focus_bullets": [
        "Bối cảnh: Tại sao bắt đầu phase này, liên hệ background user (1-2 câu)",
        "Kỹ năng nền tảng: Cần xây gì trước và lý do (1-2 câu)",
        "Kết quả cuối phase: Output cụ thể có thể đo lường (1-2 câu)",
        "Liên kết phase sau: Phase này chuẩn bị gì cho phase tiếp theo (1-2 câu)",
        "Áp dụng thực tế: Dự án mini trong phase (1-2 câu)",
        "Lưu ý đặc biệt: Dựa trên kinh nghiệm và mục tiêu của user (1-2 câu)",
        "Khi gặp khó khăn: Hướng tháo gỡ cụ thể (1-2 câu)",
        "Cường độ học: Tuần đầu vs tuần cuối phase khác nhau ra sao (1-2 câu)"
      ],
      "skills": ["skill1", "skill2"],
      "skills_explanation": "VIẾT 4-6 CÂU bằng tiếng Việt giải thích tại sao chọn các skill này",
      "daily_schedule": "DEPRECATED - dùng weekly_schedule ở dưới thay thế",
      "weekly_schedule": {{
        "monday": {{ "time_slot": "HH:MM-HH:MM hoặc 'off'", "activity": "nội dung học CỤ THỂ với phút phân bổ rõ ràng" }},
        "tuesday": {{ "time_slot": "...", "activity": "..." }},
        "wednesday": {{ "time_slot": "...", "activity": "..." }},
        "thursday": {{ "time_slot": "...", "activity": "..." }},
        "friday": {{ "time_slot": "...", "activity": "..." }},
        "saturday": {{ "time_slot": "...", "activity": "..." }},
        "sunday": {{ "time_slot": "...", "activity": "..." }}
      }},
      "milestone": "Mốc cần đạt cuối phase - VIẾT 4-5 CÂU bằng tiếng Việt",
      "completion_criteria": "Điều kiện qua phase - LIỆT KÊ 5-7 yêu cầu numbered list: '1. ... 2. ... 3. ...'",
      "courses": [
        {{
          "course_id": "course-<phase>-<index>-<slug>",
          "name": "Tên khóa học GỐC chính xác (giữ tiếng Anh nếu khóa là EN, VD: 'Foundations of Teaching for Learning')",
          "name_vi": "Bản dịch tiếng Việt của tên khóa học (VD: 'Nền tảng Giảng dạy để Học tập'). NẾU khóa đã là tiếng Việt thì copy y hệt name. ĐÂY LÀ FIELD HIỂN THỊ CHO USER.",
          "platform": "Coursera|Udemy|edX|...",
          "instructor": "Tên instructor",
          "url": "URL chính xác trên platform",
          "duration_hours": <số 8-20>,
          "is_free": true,
          "price_vnd": 0,
          "level": "beginner|intermediate|advanced",
          "language": "vi|en",
          "has_certificate": true,
          "description": "Mô tả 3-4 câu CHI TIẾT bằng tiếng Việt",
          "why_recommend": "Lý do CHI TIẾT 3-4 câu tại sao recommend cho user CỤ THỂ NÀY",
          "covers_skills": ["skill1", "skill2"],
          "key_takeaways": [
            "Điểm chính 1 - 1-2 câu chi tiết",
            "Điểm 2",
            "Điểm 3",
            "Điểm 4"
          ]
        }}
      ],
      "practice_projects": [
        {{
          "project_id": "proj-<phase>-<index>",
          "title": "Tên dự án",
          "description": "Mô tả CHI TIẾT 5-7 câu",
          "tech_stack": ["tech1", "tech2"],
          "estimated_hours": <số>,
          "difficulty": "easy|medium|hard",
          "deliverables": ["Sản phẩm 1", "Sản phẩm 2", "Sản phẩm 3"],
          "learning_outcomes": ["Sẽ học được 1", "Sẽ học được 2"],
          "github_template": "URL template (nếu có)"
        }}
      ],
      "tips": [
        "Tip 1 cụ thể với HÀNH ĐỘNG (3-4 câu)",
        "Tip 2",
        "Tip 3",
        "Tip 4"
      ],
      "common_mistakes": [
        "Lỗi 1 và CÁCH TRÁNH (2-3 câu)",
        "Lỗi 2 và cách tránh",
        "Lỗi 3 và cách tránh"
      ]
    }}
  ],
  "milestones": [
    {{
      "week": 4,
      "title": "Mốc quan trọng (VN)",
      "description": "Chi tiết (VN, 2-3 câu)",
      "skills_acquired": ["skill1", "skill2"],
      "deliverable": "Sản phẩm cụ thể demo được"
    }}
  ],
  "interview_prep": {{
    "tips": [
      "Tip phỏng vấn 1 chi tiết (VN, 2 câu)",
      "Tip 2", "Tip 3", "Tip 4", "Tip 5"
    ],
    "common_questions": [
      "Câu hỏi phỏng vấn 1 thường gặp",
      "Câu 2", "Câu 3", "Câu 4", "Câu 5"
    ],
    "portfolio_advice": "Lời khuyên CHI TIẾT về portfolio (4-5 câu, mỗi câu kết bằng dấu chấm)"
  }},
  "completion_criteria": "Tiêu chí hoàn thành toàn bộ lộ trình - 4-5 yêu cầu numbered list: '1. ... 2. ...'",
  "next_steps_after_completion": [
    "Bước 1 - chi tiết",
    "Bước 2", "Bước 3", "Bước 4"
  ]
}}

# ════════════════════ CHẤT LƯỢNG ════════════════════
1. TẤT CẢ TEXT HIỂN THỊ BẰNG TIẾNG VIỆT 100%.
   - Tên khóa học GỐC giữ nguyên trong field `name` để search trên platform
   - Field `name_vi` PHẢI dịch sang tiếng Việt (VD: 'Foundations of Teaching for Learning' → 'Nền tảng Giảng dạy để Học tập')
   - Skills hiển thị dùng tiếng Việt nếu có sẵn (VD: 'Critical Thinking' → 'Tư duy phản biện'), giữ EN cho thuật ngữ chuyên ngành đặc biệt (Python, React, AWS, ...)
2. Khóa học PHẢI CÓ THẬT - không bịa.
3. SỐ KHÓA TỐI THIỂU = {targets['min_total_courses']} cho cả lộ trình. Phải tuân thủ.
4. Mỗi phase phải logic, kế thừa phase trước.
5. JSON valid, không markdown wrap, không trailing comma.
6. Số trong JSON là number, không phải string.
7. course_id và phase_id phải UNIQUE và có format slug.
8. personalization_highlights phải nêu ÍT NHẤT 8 điểm cụ thể, mỗi điểm 1-2 câu giải thích rõ ràng dựa trên TỪNG OPTION user đã chọn.
9. Mỗi khóa course PHẢI có covers_skills mapping rõ tới skills nào trong critical/important.
10. completion_criteria là numbered list, weekly_schedule là object 7 ngày Thứ 2-CN với time_slot và activity riêng cho từng ngày, KHÔNG lặp content giữa các ngày.
"""
    return prompt


# ════════════════════════════════════════════════════════════════════════════
# POST-VALIDATION (sau khi AI return roadmap_data)
# ════════════════════════════════════════════════════════════════════════════

def _validate_roadmap_structure(
    roadmap_data: Dict[str, Any],
    duration_months: int,
    daily_hours: float,
    project_intensity: Optional[str],
    critical_skills: List[str],
    important_skills: List[str],
) -> Dict[str, Any]:
    """Validate cấu trúc roadmap, trả về dict warnings."""
    total_skills = len(critical_skills) + len(important_skills)
    targets = _compute_course_targets(
        duration_months=duration_months,
        daily_hours=daily_hours,
        project_intensity=project_intensity,
        total_skills=total_skills,
    )

    warnings: Dict[str, Any] = {
        "expected_targets": targets,
        "issues": [],
    }

    phases = roadmap_data.get("phases") or []
    if not isinstance(phases, list) or not phases:
        warnings["issues"].append({"type": "no_phases", "msg": "Roadmap không có phases"})
        return warnings

    if len(phases) != duration_months:
        warnings["issues"].append({
            "type": "phase_count_mismatch",
            "expected": duration_months,
            "actual": len(phases),
        })

    insufficient_phases = []
    actual_total_courses = 0
    skill_coverage: Dict[str, List[str]] = {}  # skill_name -> [course_names]

    for pi, ph in enumerate(phases):
        if not isinstance(ph, dict):
            continue
        courses = ph.get("courses") or []
        actual_total_courses += len(courses)

        if len(courses) < targets["min_courses_per_phase"]:
            insufficient_phases.append({
                "phase": pi + 1,
                "actual": len(courses),
                "expected_min": targets["min_courses_per_phase"],
            })

        # Map skill coverage
        for c in courses:
            if not isinstance(c, dict):
                continue
            covers = c.get("covers_skills") or []
            for s in covers:
                if not isinstance(s, str):
                    continue
                skill_coverage.setdefault(s.lower().strip(), []).append(
                    c.get("name", "(unknown)")
                )

    if insufficient_phases:
        warnings["issues"].append({
            "type": "insufficient_courses_per_phase",
            "phases": insufficient_phases,
        })

    if actual_total_courses < targets["min_total_courses"]:
        warnings["issues"].append({
            "type": "insufficient_total_courses",
            "actual": actual_total_courses,
            "expected_min": targets["min_total_courses"],
        })

    # Check skill coverage cho critical skills
    uncovered_critical = []
    all_critical_lower = [s.lower().strip() for s in critical_skills]
    for skill in critical_skills:
        s_lower = skill.lower().strip()
        if s_lower not in skill_coverage:
            # Fuzzy match: check if any covered skill contains this or vice versa
            covered = False
            for covered_s in skill_coverage:
                if s_lower in covered_s or covered_s in s_lower:
                    covered = True
                    break
            if not covered:
                uncovered_critical.append(skill)

    if uncovered_critical:
        warnings["issues"].append({
            "type": "uncovered_critical_skills",
            "skills": uncovered_critical[:10],  # cap để không spam log
        })

    warnings["actual_total_courses"] = actual_total_courses
    warnings["unique_skills_covered"] = len(skill_coverage)
    warnings["passed"] = len(warnings["issues"]) == 0

    return warnings


def _ensure_unique_ids(roadmap_data: Dict[str, Any]) -> None:
    """Inject phase_id và course_id nếu AI bỏ sót. Modify in-place."""
    phases = roadmap_data.get("phases") or []
    for pi, ph in enumerate(phases):
        if not isinstance(ph, dict):
            continue
        if not ph.get("phase_id"):
            ph["phase_id"] = f"phase-{ph.get('phase', pi + 1)}"
        courses = ph.get("courses") or []
        for ci, c in enumerate(courses):
            if isinstance(c, dict) and not c.get("course_id"):
                nm = (c.get("name") or "course").lower()
                slug = "".join(ch if ch.isalnum() else "-" for ch in nm)[:40].strip("-")
                c["course_id"] = f"course-{ph.get('phase', pi + 1)}-{ci}-{slug or 'item'}"
        # Ensure project_id
        projs = ph.get("practice_projects") or []
        for pri, pr in enumerate(projs):
            if isinstance(pr, dict) and not pr.get("project_id"):
                pr["project_id"] = f"proj-{ph.get('phase', pi + 1)}-{pri}"


def _parse_json_with_repair(raw: str, roadmap_id: int = 0) -> Optional[Dict[str, Any]]:
    """Parse JSON với 3 fallback strategies để xử lý case AI trả output bị cắt:

    1. Parse trực tiếp
    2. Repair: tự đóng các string/array/object còn dở
    3. Trim tới object cuối cùng valid

    Trả về dict hoặc None nếu mọi cách đều fail.
    """
    if not raw or not raw.strip():
        return None

    # Strategy 1: Parse trực tiếp
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f"[learning_path] Direct JSON parse failed for id={roadmap_id}: {e}")

    # Strategy 2: Repair common truncation issues
    repaired = _repair_truncated_json(raw)
    if repaired is not None:
        try:
            data = json.loads(repaired)
            logger.info(f"[learning_path] JSON repaired successfully for id={roadmap_id}")
            return data
        except json.JSONDecodeError as e:
            logger.warning(f"[learning_path] Repaired JSON still invalid for id={roadmap_id}: {e}")

    # Strategy 3: Trim từng ký tự cuối tới khi parse được
    # Tìm vị trí cuối của object hợp lệ
    trimmed = _trim_to_last_valid_json(raw)
    if trimmed is not None:
        try:
            data = json.loads(trimmed)
            logger.info(f"[learning_path] JSON trimmed successfully for id={roadmap_id}")
            return data
        except json.JSONDecodeError:
            pass

    return None


def _repair_truncated_json(raw: str) -> Optional[str]:
    """Repair JSON bị truncate giữa chừng:
    - Đóng string đang dở (thêm ")
    - Bỏ key:value bị cắt (vd: "title":)
    - Đóng các array/object còn open
    """
    s = raw.strip()
    if not s.startswith("{"):
        return None

    # Đếm depth của ngoặc và xác định vị trí trong string
    in_string = False
    escape = False
    stack: List[str] = []  # stack chứa '{' hoặc '['
    last_safe_pos = 0  # vị trí cuối cùng mà JSON còn cân bằng

    for i, ch in enumerate(s):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{" or ch == "[":
            stack.append(ch)
        elif ch == "}":
            if stack and stack[-1] == "{":
                stack.pop()
                if not stack:
                    last_safe_pos = i + 1
        elif ch == "]":
            if stack and stack[-1] == "[":
                stack.pop()
                if not stack:
                    last_safe_pos = i + 1

    # Nếu đang trong string → đóng string
    repaired = s
    if in_string:
        repaired = repaired + '"'

    # Bỏ trailing whitespace + comma
    repaired = repaired.rstrip()
    while repaired and repaired[-1] in (",", " ", "\n", "\t"):
        repaired = repaired.rstrip(", \n\t")

    # CASE đặc biệt: cắt sau "key": (chưa có value)
    # Pattern: ...{"key": HOẶC ..., "key":
    # Cắt bỏ phần "key": dở
    # Detect: tìm dấu : cuối cùng ngoài string, nếu sau đó không có { [ " hoặc digit thì cắt
    in_str2 = False
    esc2 = False
    last_colon = -1
    for i, ch in enumerate(repaired):
        if esc2:
            esc2 = False
            continue
        if ch == "\\" and in_str2:
            esc2 = True
            continue
        if ch == '"':
            in_str2 = not in_str2
            continue
        if in_str2:
            continue
        if ch == ":":
            last_colon = i

    if last_colon >= 0:
        after_colon = repaired[last_colon + 1:].strip()
        # Nếu sau dấu : không có gì hoặc chỉ có whitespace → cắt bỏ "key":
        if not after_colon:
            # Tìm "key" trước dấu : (bỏ chuỗi)
            # Quay lui từ last_colon-1 tìm dấu " kết thúc của key
            j = last_colon - 1
            while j >= 0 and repaired[j] in (" ", "\n", "\t"):
                j -= 1
            if j >= 0 and repaired[j] == '"':
                # Tìm dấu " mở của key
                k = j - 1
                while k >= 0 and not (repaired[k] == '"' and (k == 0 or repaired[k - 1] != "\\")):
                    k -= 1
                if k > 0:
                    # Trước "key" phải là , hoặc { — cắt từ vị trí trước key luôn
                    pre = repaired[:k].rstrip()
                    if pre.endswith(","):
                        repaired = pre[:-1].rstrip()
                    elif pre.endswith("{"):
                        repaired = pre  # giữ nguyên { object
                    else:
                        repaired = pre

    # Bỏ trailing comma lần nữa sau khi xử lý
    while repaired and repaired[-1] in (",", " ", "\n", "\t"):
        repaired = repaired.rstrip(", \n\t")

    # Đóng các ngoặc còn lại (LIFO)
    for opener in reversed(stack):
        if opener == "{":
            repaired += "}"
        elif opener == "[":
            repaired += "]"

    return repaired if repaired != s else None


def _trim_to_last_valid_json(raw: str) -> Optional[str]:
    """Trim JSON tới vị trí cuối cùng còn parse được.
    Strategy: tìm vị trí của } cuối cùng và thử parse từ đầu tới đó.
    """
    s = raw.strip()
    if not s.startswith("{"):
        return None

    # Tìm các vị trí } ở depth=0 (theo logic ngoặc cân bằng)
    in_string = False
    escape = False
    depth = 0
    valid_ends: List[int] = []

    for i, ch in enumerate(s):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                valid_ends.append(i + 1)

    if not valid_ends:
        return None

    # Thử từ cuối đi xuống
    for end in reversed(valid_ends):
        candidate = s[:end]
        try:
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            continue

    return None


# ════════════════════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR — generate_personalized_roadmap()
# ════════════════════════════════════════════════════════════════════════════

def generate_personalized_roadmap(
    db: Session,
    user_id: int,
    analysis_id: int,
    career_id: str,
    career_title: str,
    level_slug: str,
    level_name: str,
    critical_skills: List[str],
    important_skills: List[str],
    existing_skills: List[str],
    duration_months: int,
    daily_hours: float,
    study_time: Optional[str],
    weekly_pattern: Optional[str],
    preferred_sources: List[str],
    budget_type: str,
    max_budget: Optional[float],
    learning_style: str,
    project_intensity: Optional[str],
    preferred_language: str,
    prior_experience: Optional[str],
    learning_goal: Optional[str],
    target_company_type: Optional[str],
    ai_difficulty_level: Optional[str],
    certification_priority: bool,
    current_position: Optional[str],
    target_salary_range: Optional[str],
    user_notes: Optional[str],
    email_reminder: bool,
) -> Dict[str, Any]:
    """Tạo lộ trình + lưu DB. Trả về dict chứa id, status và roadmap data."""
    from .models import PersonalizedRoadmap

    missing_skills = critical_skills + important_skills

    # ─── Step 1: Tạo record với status="generating" ──────────────────────
    roadmap = PersonalizedRoadmap(
        user_id=user_id,
        analysis_id=analysis_id,
        career_id=career_id,
        career_title=career_title,
        level_slug=level_slug,
        level_name=level_name,
        duration_months=duration_months,
        daily_hours=daily_hours,
        study_time=study_time,
        weekly_pattern=weekly_pattern,
        ai_difficulty_level=ai_difficulty_level,
        budget_type=budget_type,
        max_budget=max_budget,
        preferred_sources=preferred_sources,
        preferred_language=preferred_language,
        learning_style=learning_style,
        project_intensity=project_intensity,
        certification_priority=certification_priority,
        prerequisite_skills_check=True,
        prior_experience=prior_experience,
        learning_goal=learning_goal,
        current_position=current_position,
        target_company_type=target_company_type,
        target_salary_range=target_salary_range,
        user_notes=user_notes,
        missing_skills=missing_skills,
        existing_skills=existing_skills,
        critical_skills=critical_skills,
        important_skills=important_skills,
        total_missing=len(missing_skills),
        total_existing=len(existing_skills),
        email_reminder_enabled=email_reminder,
        # Email chỉ gửi được khi có study_time hợp lệ
        email_reminder_time=(study_time if email_reminder and study_time else None),
        status="generating",
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    roadmap_id = roadmap.id

    logger.info(
        f"[learning_path] Generating roadmap id={roadmap_id} for user={user_id}, "
        f"career={career_id}, duration={duration_months}m, "
        f"skills={len(critical_skills)}c/{len(important_skills)}i"
    )

    # ─── Step 2: Build prompt ────────────────────────────────────────────
    prompt = build_roadmap_prompt(
        career_title=career_title,
        level_slug=level_slug,
        level_name=level_name,
        critical_skills=critical_skills,
        important_skills=important_skills,
        existing_skills=existing_skills,
        duration_months=duration_months,
        daily_hours=daily_hours,
        weekly_pattern=weekly_pattern or "flexible",
        preferred_sources=preferred_sources,
        budget_type=budget_type,
        max_budget=max_budget,
        learning_style=learning_style,
        project_intensity=project_intensity or "balanced",
        preferred_language=preferred_language,
        prior_experience=prior_experience or "intermediate",
        learning_goal=learning_goal or "skill_upgrade",
        target_company_type=target_company_type or "any",
        ai_difficulty_level=ai_difficulty_level,
        certification_priority=certification_priority,
        current_position=current_position,
        target_salary_range=target_salary_range,
        user_notes=user_notes,
        study_time=study_time,
        email_reminder=email_reminder,
    )

    # ─── Step 3: Call Gemini stream LEARNING_PATH ────────────────────────
    stream = multi_stream_manager.get_learning_path_stream()
    if not stream.is_available():
        roadmap.status = "failed"
        roadmap.generation_error = "Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau."
        db.commit()
        logger.error(f"[learning_path] AI stream unavailable for roadmap id={roadmap_id}")
        return {"id": roadmap_id, "status": "failed", "error": roadmap.generation_error}

    try:
        result = stream.generate_content_with_retry(
            prompt,
            max_output_tokens=32000,  # Tăng để tránh JSON bị cắt giữa chừng
            temperature=0.4,
            timeout_seconds=300,  # 5 phút cho output dài (mặc định 60s không đủ)
        )

        if not result:
            roadmap.status = "failed"
            roadmap.generation_error = "AI không trả về kết quả. Vui lòng thử lại."
            db.commit()
            return {"id": roadmap_id, "status": "failed", "error": roadmap.generation_error}

        # ─── Step 4: Parse JSON với 4 layers fallback ────────────────────
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        roadmap_data = _parse_json_with_repair(cleaned, roadmap_id)
        if roadmap_data is None:
            # Layer cuối: thử lại với prompt ngắn hơn (yêu cầu AI trả output gọn)
            logger.warning(f"[learning_path] First JSON parse failed for id={roadmap_id}, retrying with compact prompt")
            short_prompt = (
                prompt
                + "\n\n## CẢNH BÁO QUAN TRỌNG: JSON output PHẢI HOÀN CHỈNH (đóng đủ ngoặc), "
                "ngắn gọn hơn nếu cần. KHÔNG được cắt giữa chừng. Mỗi field text < 500 ký tự."
            )
            result2 = stream.generate_content_with_retry(
                short_prompt,
                max_output_tokens=32000,
                temperature=0.3,
                timeout_seconds=300,
            )
            if result2:
                cleaned2 = result2.strip()
                if cleaned2.startswith("```"):
                    cleaned2 = cleaned2.split("\n", 1)[1] if "\n" in cleaned2 else cleaned2[3:]
                if cleaned2.endswith("```"):
                    cleaned2 = cleaned2[:-3]
                cleaned2 = cleaned2.strip()
                roadmap_data = _parse_json_with_repair(cleaned2, roadmap_id)

            if roadmap_data is None:
                roadmap.status = "failed"
                roadmap.generation_error = (
                    "Lỗi xử lý kết quả từ AI (JSON không hợp lệ). "
                    "Vui lòng thử lại — có thể giảm thời gian/độ khó để output ngắn hơn."
                )
                db.commit()
                return {"id": roadmap_id, "status": "failed", "error": roadmap.generation_error}

        # ─── Step 5: Inject IDs nếu AI bỏ sót ────────────────────────────
        try:
            _ensure_unique_ids(roadmap_data)
        except Exception as e:
            logger.warning(f"[learning_path] ID injection error: {e}")

        # ─── Step 6: Post-validation cấu trúc ────────────────────────────
        try:
            validation = _validate_roadmap_structure(
                roadmap_data=roadmap_data,
                duration_months=duration_months,
                daily_hours=daily_hours,
                project_intensity=project_intensity,
                critical_skills=critical_skills,
                important_skills=important_skills,
            )
            if not validation["passed"]:
                logger.warning(
                    f"[learning_path] Roadmap id={roadmap_id} validation issues: "
                    f"{validation['issues']}"
                )
            roadmap_data["_validation_warnings"] = validation
        except Exception as e:
            logger.warning(f"[learning_path] Post-validation error: {e}")

        # ─── Step 7: Validate URLs (4 layers defense) ────────────────────
        try:
            from .course_url_validator import validate_and_fix_roadmap_courses
            roadmap_data = validate_and_fix_roadmap_courses(roadmap_data)
            summary = roadmap_data.get("url_validation_summary", {})
            logger.info(
                f"[learning_path] URL validation: {summary.get('verified', 0)}/{summary.get('total', 0)} "
                f"verified ({summary.get('verification_rate', 0)}%), "
                f"{summary.get('replaced', 0)} replaced with search URLs"
            )
        except Exception as ve:
            logger.error(f"[learning_path] URL validation error: {repr(ve)}")
            roadmap_data["url_validation_summary"] = {
                "total": 0, "verified": 0, "replaced": 0, "suspicious": 0,
                "verification_rate": 0, "error": str(ve)[:200],
            }

        # ─── Step 8: Persist ─────────────────────────────────────────────
        roadmap.roadmap_data = roadmap_data
        roadmap.status = "ready"
        db.commit()

        logger.info(f"[learning_path] Roadmap id={roadmap_id} ready")
        return {
            "id": roadmap_id,
            "status": "ready",
            "roadmap": roadmap_data,
        }

    except json.JSONDecodeError as e:
        logger.error(f"[learning_path] JSON parse error: {e}")
        roadmap.status = "failed"
        roadmap.generation_error = "Lỗi xử lý kết quả từ AI. Vui lòng thử lại."
        db.commit()
        return {"id": roadmap_id, "status": "failed", "error": roadmap.generation_error}

    except Exception as e:
        logger.error(f"[learning_path] Generation error: {repr(e)}")
        roadmap.status = "failed"
        roadmap.generation_error = f"Lỗi hệ thống: {str(e)[:200]}"
        db.commit()
        return {"id": roadmap_id, "status": "failed", "error": roadmap.generation_error}
