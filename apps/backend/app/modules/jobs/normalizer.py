"""
Normalizer — cleans and standardizes raw scraped job data.

Responsibilities:
  - Normalize salary strings → (min, max) float in VND millions
  - Normalize experience level → canonical enum
  - Normalize employment type → canonical enum
  - Clean title / company / location strings
  - Extract skills from description text
  - Parse posted_date strings → datetime
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

# ── Salary parsing ────────────────────────────────────────────────────────────

_SALARY_PATTERNS = [
    # "15 - 25 triệu" / "15-25 triệu VND"
    (r"(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million|m)", "vnd_million_range"),
    # "Lên đến 30 triệu"
    (r"(?:lên đến|up to|tối đa)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million)", "vnd_million_max"),
    # "Từ 15 triệu"
    (r"(?:từ|from)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million)", "vnd_million_min"),
    # "$1000 - $2000" or "1000 - 2000 USD"
    (r"\$?\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(?:USD|usd|\$)?", "usd_range"),
    # "1,000 - 2,000 USD"
    (r"(\d{1,3}(?:,\d{3})+)\s*[-–]\s*(\d{1,3}(?:,\d{3})+)\s*(?:USD|usd)?", "usd_range_comma"),
]

_USD_TO_VND_MILLION = 0.025  # 1 USD ≈ 25,000 VND = 0.025 triệu


def _clean_num(s: str) -> float:
    return float(s.replace(",", "").replace(".", ""))


def parse_salary(raw: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Returns (salary_min, salary_max) in VND millions per MONTH.
    Returns (None, None) if unparseable.
    """
    if not raw:
        return None, None
    raw_lower = raw.lower().strip()

    # "Thỏa thuận" / "Negotiable" / "Competitive"
    if any(kw in raw_lower for kw in ["thỏa thuận", "negotiable", "competitive", "thoả thuận"]):
        return None, None

    lo, hi = None, None

    for pattern, kind in _SALARY_PATTERNS:
        m = re.search(pattern, raw_lower, re.IGNORECASE)
        if not m:
            continue
        try:
            if kind == "vnd_million_range":
                lo, hi = _clean_num(m.group(1)), _clean_num(m.group(2))
                break
            elif kind == "vnd_million_max":
                hi = _clean_num(m.group(1))
                break
            elif kind == "vnd_million_min":
                lo = _clean_num(m.group(1))
                break
            elif kind in ("usd_range", "usd_range_comma"):
                lo = _clean_num(m.group(1)) * _USD_TO_VND_MILLION
                hi = _clean_num(m.group(2)) * _USD_TO_VND_MILLION
                break
        except (ValueError, IndexError):
            continue

    if lo is None and hi is None:
        return None, None

    # Sanity check: nếu > 60 triệu → có thể là salary năm, chia 12
    if lo and lo > 60:
        lo = round(lo / 12, 1)
    if hi and hi > 60:
        hi = round(hi / 12, 1)

    # Nếu vẫn > 50 triệu/tháng → bỏ (outlier cho thị trường VN)
    if lo and lo > 50:
        return None, None
    if hi and hi > 50:
        hi = 50.0

    return lo, hi


# ── Experience level ──────────────────────────────────────────────────────────

_EXP_MAP = {
    "fresher": ["fresher", "sinh viên", "mới ra trường", "0 năm", "không yêu cầu kinh nghiệm"],
    "junior": ["junior", "1 năm", "1-2 năm", "dưới 2 năm"],
    "mid": ["mid", "2 năm", "3 năm", "2-3 năm", "2-4 năm", "3-5 năm"],
    "senior": ["senior", "5 năm", "4-5 năm", "5+ năm", "trên 5 năm"],
    "lead": ["lead", "tech lead", "team lead", "trưởng nhóm"],
    "manager": ["manager", "quản lý", "giám đốc", "trưởng phòng", "head of"],
}


def normalize_experience(raw: str) -> Optional[str]:
    if not raw:
        return None
    raw_lower = raw.lower()
    for level, keywords in _EXP_MAP.items():
        if any(kw in raw_lower for kw in keywords):
            return level
    return None


# ── Employment type ───────────────────────────────────────────────────────────

_EMP_MAP = {
    "full-time": ["full-time", "toàn thời gian", "full time", "permanent"],
    "part-time": ["part-time", "bán thời gian", "part time"],
    "contract": ["contract", "hợp đồng", "freelance", "tư vấn"],
    "internship": ["internship", "thực tập", "intern"],
    "remote": ["remote", "làm việc từ xa", "work from home", "wfh"],
}


def normalize_employment_type(raw: str) -> Optional[str]:
    if not raw:
        return None
    raw_lower = raw.lower()
    for etype, keywords in _EMP_MAP.items():
        if any(kw in raw_lower for kw in keywords):
            return etype
    return None


# ── Skills extraction ─────────────────────────────────────────────────────────

_SKILL_PATTERNS = [
    # ── IT & Software ──
    r"\b(python|java|javascript|typescript|react|vue|angular|nodejs|node\.js|php|ruby|go|golang|rust|swift|kotlin|flutter|dart|c\+\+|c#|\.net)\b",
    r"\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|kafka|rabbitmq|oracle|sql server)\b",
    r"\b(aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible|jenkins|ci/cd|devops)\b",
    r"\b(machine learning|deep learning|ai|nlp|computer vision|data science|big data|data analytics)\b",
    r"\b(html|css|sass|webpack|git|linux|bash|shell|api|rest|graphql|microservices)\b",
    r"\b(cybersecurity|penetration testing|network security|cloud computing|blockchain)\b",

    # ── Marketing & Communication ──
    r"\b(digital marketing|seo|sem|google ads|facebook ads|content marketing|email marketing|social media)\b",
    r"\b(branding|copywriting|pr|public relations|media planning|influencer marketing|tiktok|instagram)\b",
    r"\b(market research|consumer insight|campaign management|growth hacking|performance marketing)\b",

    # ── Finance & Banking ──
    r"\b(financial analysis|financial modeling|investment banking|risk management|portfolio management)\b",
    r"\b(credit analysis|treasury|forex|derivatives|wealth management|asset management|fintech)\b",
    r"\b(bloomberg|reuters|financial reporting|valuation|m&a|ipo|venture capital)\b",

    # ── Accounting & Auditing ──
    r"\b(accounting|auditing|tax|ifrs|gaap|bookkeeping|cost accounting|management accounting)\b",
    r"\b(internal audit|external audit|compliance|financial statements|budgeting|forecasting)\b",
    r"\b(misa|sap|quickbooks|xero|tax planning|transfer pricing|consolidation)\b",

    # ── Human Resources ──
    r"\b(recruitment|talent acquisition|onboarding|performance management|compensation|benefits)\b",
    r"\b(training|learning development|employee engagement|hr analytics|succession planning)\b",
    r"\b(labor law|payroll|hris|organizational development|employer branding|headhunting)\b",

    # ── Sales & Business ──
    r"\b(sales|business development|key account|b2b|b2c|negotiation|cold calling|lead generation)\b",
    r"\b(crm|salesforce|hubspot|pipeline management|revenue|quota|territory management)\b",
    r"\b(partnership|strategic planning|market expansion|customer acquisition|upselling)\b",

    # ── Customer Service ──
    r"\b(customer service|customer support|call center|helpdesk|ticketing|zendesk|freshdesk)\b",
    r"\b(complaint handling|service level|nps|customer satisfaction|live chat|chatbot)\b",

    # ── Education & Training ──
    r"\b(teaching|curriculum|lesson planning|e-learning|lms|instructional design|assessment)\b",
    r"\b(tutoring|mentoring|coaching|training delivery|workshop|seminar|certification)\b",
    r"\b(ielts|toeic|toefl|cambridge|tesol|tefl|pedagogy|educational technology)\b",

    # ── Healthcare & Medical ──
    r"\b(clinical|patient care|nursing|pharmacy|medical devices|healthcare management)\b",
    r"\b(diagnosis|treatment|surgery|radiology|laboratory|biomedical|public health)\b",
    r"\b(gmp|gsp|gdp|fda|who|clinical trial|drug safety|pharmacovigilance)\b",

    # ── Logistics & Supply Chain ──
    r"\b(logistics|supply chain|warehouse|inventory|procurement|purchasing|sourcing)\b",
    r"\b(import export|customs|freight|shipping|distribution|fleet management|3pl)\b",
    r"\b(demand planning|supply planning|lean|six sigma|kaizen|wms|tms|erp)\b",

    # ── Manufacturing & Production ──
    r"\b(manufacturing|production planning|quality control|quality assurance|lean manufacturing)\b",
    r"\b(iso 9001|iso 14001|5s|tpm|oee|process improvement|industrial engineering)\b",
    r"\b(cnc|plc|scada|automation|robotics|assembly|packaging|maintenance)\b",

    # ── Construction & Engineering ──
    r"\b(autocad|revit|bim|civil engineering|structural|mep|hvac|electrical)\b",
    r"\b(project management|site management|quantity surveying|estimation|tender)\b",
    r"\b(construction|architecture|interior design|landscape|urban planning|safety)\b",

    # ── General Business Skills ──
    r"\b(excel|powerpoint|word|google sheets|tableau|power bi|sap|erp|crm)\b",
    r"\b(project management|agile|scrum|kanban|jira|trello|confluence|ms project)\b",
    r"\b(communication|leadership|teamwork|problem solving|critical thinking|presentation)\b",
    r"\b(negotiation|time management|analytical thinking|decision making|strategic thinking)\b",
    r"\b(english|chinese|japanese|korean|french|german|bilingual|multilingual)\b",

    # ── Design ──
    r"\b(ui/ux|figma|sketch|adobe xd|photoshop|illustrator|indesign|after effects)\b",
    r"\b(graphic design|web design|product design|motion graphics|3d modeling|rendering)\b",

    # ── Real Estate ──
    r"\b(real estate|property management|leasing|valuation|brokerage|land development)\b",

    # ── Hospitality & Tourism ──
    r"\b(hospitality|hotel management|f&b|restaurant|tourism|travel|event management)\b",
    r"\b(front office|housekeeping|reservation|concierge|banquet|catering)\b",
]

_COMPILED_SKILLS = [re.compile(p, re.IGNORECASE) for p in _SKILL_PATTERNS]


def extract_skills(text: str) -> List[str]:
    """Extract skill keywords from job description/requirements — covers all industries."""
    if not text:
        return []
    found = set()
    for pattern in _COMPILED_SKILLS:
        for m in pattern.finditer(text):
            found.add(m.group(0).strip())
    # Capitalize nicely
    return sorted(found, key=lambda x: x.lower())[:20]


# ── Date parsing ──────────────────────────────────────────────────────────────

_VN_TZ = timezone(timedelta(hours=7))


def parse_date(raw: str) -> Optional[datetime]:
    """Parse various date formats into timezone-aware datetime."""
    if not raw:
        return None
    raw = raw.strip()

    # Relative: "2 ngày trước", "3 hours ago"
    m = re.search(r"(\d+)\s*(giờ|hour|giây|second)", raw, re.IGNORECASE)
    if m:
        return datetime.now(_VN_TZ) - timedelta(hours=int(m.group(1)))
    m = re.search(r"(\d+)\s*(ngày|day)", raw, re.IGNORECASE)
    if m:
        return datetime.now(_VN_TZ) - timedelta(days=int(m.group(1)))
    m = re.search(r"(\d+)\s*(tuần|week)", raw, re.IGNORECASE)
    if m:
        return datetime.now(_VN_TZ) - timedelta(weeks=int(m.group(1)))
    m = re.search(r"(\d+)\s*(tháng|month)", raw, re.IGNORECASE)
    if m:
        return datetime.now(_VN_TZ) - timedelta(days=int(m.group(1)) * 30)

    # Absolute formats
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y %H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(raw[:len(fmt)], fmt)
            return dt.replace(tzinfo=_VN_TZ)
        except ValueError:
            continue

    return None


# ── Text cleaning ─────────────────────────────────────────────────────────────

def clean_text(text: str, max_len: int = 2000) -> str:
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len]


def clean_title(title: str) -> str:
    if not title:
        return ""
    # Remove leading badges like "Mới", "Hot", "Urgent"
    title = re.sub(r"^(Mới|Hot|Urgent|New|Featured)\s+", "", title, flags=re.IGNORECASE)
    return clean_text(title, 300)


def clean_location(location: str) -> str:
    if not location:
        return ""
    # Take first line only
    location = location.split("\n")[0].split("|")[0].strip()
    return clean_text(location, 200)
