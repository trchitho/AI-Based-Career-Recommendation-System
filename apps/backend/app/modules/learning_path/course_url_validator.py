"""
Course URL Validator - Production-grade URL validation cho khóa học.

Vấn đề: AI Gemini thường bịa URL cho khóa học, dẫn đến link 404 khi user click.

Giải pháp 4 lớp (defense in depth):
1. PATTERN CHECK - Verify URL match đúng pattern của platform
2. HTTP HEAD CHECK - Real HTTP request kiểm tra status code
3. CONTENT CHECK - Fetch HTML và detect 404 page indicators
4. FALLBACK SEARCH - Nếu chết, generate search URL trên platform với title

Mỗi URL phải pass tất cả 4 lớp mới được mark là VERIFIED.
URL nào chết → replace bằng search URL với platform-specific format.
"""

from __future__ import annotations

import asyncio
import logging
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════════════
# CONSTANTS & CONFIG
# ════════════════════════════════════════════════════════════════════════════

REQUEST_TIMEOUT = 8  # giây
MAX_RETRIES = 2
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
}

MAX_CONCURRENT_CHECKS = 8  # Tránh ddos chính platform
PARALLEL_VALIDATION_TIMEOUT = 60  # Tổng timeout cho validate cả batch


class ValidationStatus(str, Enum):
    """Trạng thái sau khi validate 1 URL."""

    VERIFIED = "verified"          # URL hoạt động, page tồn tại, không phải 404
    DEAD_404 = "dead_404"          # HTTP 404 hoặc redirect tới 404 page
    DEAD_GONE = "dead_gone"        # 410 Gone hoặc 451
    DEAD_OTHER = "dead_other"      # Lỗi network, timeout, status >= 500
    SUSPICIOUS = "suspicious"      # Pattern không match platform
    UNREACHABLE = "unreachable"    # Network không tới được
    REPLACED = "replaced"          # URL bị thay thế bằng search URL
    SKIPPED = "skipped"            # URL rỗng / không có URL


@dataclass
class ValidationResult:
    """Kết quả validate 1 URL."""
    original_url: Optional[str]
    final_url: Optional[str]            # URL sau khi follow redirect (hoặc search URL fallback)
    status: ValidationStatus
    http_status: Optional[int] = None
    reason: str = ""
    is_search_url: bool = False         # Có phải fallback search URL không
    detected_platform: Optional[str] = None
    redirect_count: int = 0
    response_time_ms: int = 0


# ════════════════════════════════════════════════════════════════════════════
# PLATFORM SIGNATURES
# ════════════════════════════════════════════════════════════════════════════

@dataclass
class PlatformSignature:
    """Signature để nhận diện URL hợp lệ của 1 platform."""
    platform_id: str
    platform_name: str
    domains: List[str]                  # Các domain hợp lệ (vd: coursera.org, www.coursera.org)
    valid_path_patterns: List[str]      # Regex patterns cho path
    known_404_indicators: List[str]     # Text trong HTML chỉ ra 404
    search_url_template: str            # Template search URL với {query}
    fallback_url: str                   # URL trang chủ làm fallback cuối cùng
    course_listing_url: Optional[str] = None  # URL danh mục khóa học


# Đăng ký signatures cho 6 nguồn uy tín
PLATFORM_SIGNATURES: Dict[str, PlatformSignature] = {
    "coursera": PlatformSignature(
        platform_id="coursera",
        platform_name="Coursera",
        domains=["coursera.org", "www.coursera.org"],
        valid_path_patterns=[
            r"^/learn/[a-z0-9\-]+/?",
            r"^/specializations/[a-z0-9\-]+/?",
            r"^/professional-certificates/[a-z0-9\-]+/?",
            r"^/programs/[a-z0-9\-]+/?",
            r"^/degrees/[a-z0-9\-]+/?",
            r"^/courses(\?.*)?$",
            r"^/search(\?.*)?$",
            r"^/browse(/.*)?$",
        ],
        known_404_indicators=[
            "We were not able to find the page",
            "Page not found",
            "browsing our course catalog",
            "404 - Page Not Found",
        ],
        search_url_template="https://www.coursera.org/search?query={query}",
        fallback_url="https://www.coursera.org/courses",
        course_listing_url="https://www.coursera.org/courses",
    ),
    "udemy": PlatformSignature(
        platform_id="udemy",
        platform_name="Udemy",
        domains=["udemy.com", "www.udemy.com"],
        valid_path_patterns=[
            r"^/course/[a-z0-9\-]+/?",
            r"^/courses/search/?",
            r"^/topic/[a-z0-9\-]+/?",
            r"^/courses/?",
        ],
        known_404_indicators=[
            "We can't find the page you're looking for",
            "We can\u2019t find the page",
            "We cannot find the page",
            "404 - Page Not Found",
            "page-not-found",
        ],
        search_url_template="https://www.udemy.com/courses/search/?q={query}",
        fallback_url="https://www.udemy.com/courses/",
        course_listing_url="https://www.udemy.com/courses/",
    ),
    "edx": PlatformSignature(
        platform_id="edx",
        platform_name="edX",
        domains=["edx.org", "www.edx.org"],
        valid_path_patterns=[
            r"^/learn/[a-z0-9\-]+/?",
            r"^/course/[a-z0-9\-]+/?",
            r"^/professional-certificate/[a-z0-9\-]+/?",
            r"^/microbachelors/[a-z0-9\-]+/?",
            r"^/micromasters/[a-z0-9\-]+/?",
            r"^/courses(/.*)?$",
            r"^/search(\?.*)?$",
            r"^/boot-camps/.*",
        ],
        known_404_indicators=[
            "Page not found",
            "We can't find that page",
            "404",
        ],
        search_url_template="https://www.edx.org/search?q={query}",
        fallback_url="https://www.edx.org/courses",
        course_listing_url="https://www.edx.org/courses",
    ),
    "linkedin_learning": PlatformSignature(
        platform_id="linkedin_learning",
        platform_name="LinkedIn Learning",
        domains=["linkedin.com", "www.linkedin.com"],
        valid_path_patterns=[
            r"^/learning/[a-z0-9\-]+/?",
            r"^/learning/?$",
            r"^/learning/search(\?.*)?$",
            r"^/learning/topics/[a-z0-9\-]+/?",
            r"^/learning/paths/[a-z0-9\-]+/?",
        ],
        known_404_indicators=[
            "Page not found",
            "we can\u2019t seem to find the page",
            "Show your recommendations",
        ],
        search_url_template="https://www.linkedin.com/learning/search?keywords={query}",
        fallback_url="https://www.linkedin.com/learning/",
        course_listing_url="https://www.linkedin.com/learning/",
    ),
    "freecodecamp": PlatformSignature(
        platform_id="freecodecamp",
        platform_name="freeCodeCamp",
        domains=["freecodecamp.org", "www.freecodecamp.org"],
        valid_path_patterns=[
            r"^/learn(/.*)?$",
            r"^/news(/.*)?$",
            r"^/news/search/(\?.*)?$",
            r"^/news/tag/[a-z0-9\-]+/?",
            r"^/?$",
        ],
        known_404_indicators=[
            "Page not found",
            "404",
        ],
        search_url_template="https://www.freecodecamp.org/news/search/?query={query}",
        fallback_url="https://www.freecodecamp.org/learn",
        course_listing_url="https://www.freecodecamp.org/learn",
    ),
    "pluralsight": PlatformSignature(
        platform_id="pluralsight",
        platform_name="Pluralsight",
        domains=["pluralsight.com", "www.pluralsight.com"],
        valid_path_patterns=[
            r"^/courses/[a-z0-9\-]+/?",
            r"^/paths/[a-z0-9\-]+/?",
            r"^/search(\?.*)?$",
            r"^/browse(/.*)?$",
        ],
        known_404_indicators=[
            "Page not found",
            "404",
            "We can't find the page",
        ],
        search_url_template="https://www.pluralsight.com/search?q={query}",
        fallback_url="https://www.pluralsight.com/browse",
        course_listing_url="https://www.pluralsight.com/browse",
    ),
}


# Map platform name (case-insensitive) → platform_id
PLATFORM_NAME_TO_ID: Dict[str, str] = {}
for pid, sig in PLATFORM_SIGNATURES.items():
    PLATFORM_NAME_TO_ID[sig.platform_name.lower()] = pid
    PLATFORM_NAME_TO_ID[pid.lower()] = pid
    # Aliases
PLATFORM_NAME_TO_ID["linkedin"] = "linkedin_learning"
PLATFORM_NAME_TO_ID["linkedin learning"] = "linkedin_learning"
PLATFORM_NAME_TO_ID["free code camp"] = "freecodecamp"
PLATFORM_NAME_TO_ID["fcc"] = "freecodecamp"


# ════════════════════════════════════════════════════════════════════════════
# LAYER 1: PATTERN VALIDATION
# ════════════════════════════════════════════════════════════════════════════

def detect_platform_from_url(url: str) -> Optional[str]:
    """Detect platform_id từ URL bằng cách match domain."""
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        host = (parsed.netloc or "").lower()
        if not host:
            return None
        for pid, sig in PLATFORM_SIGNATURES.items():
            for domain in sig.domains:
                if host == domain or host.endswith("." + domain):
                    return pid
    except Exception:
        return None
    return None


def detect_platform_from_name(name: str) -> Optional[str]:
    """Detect platform_id từ tên platform (text)."""
    if not name:
        return None
    name_clean = name.lower().strip()
    if name_clean in PLATFORM_NAME_TO_ID:
        return PLATFORM_NAME_TO_ID[name_clean]
    # Substring match
    for key, pid in PLATFORM_NAME_TO_ID.items():
        if key in name_clean or name_clean in key:
            return pid
    return None


def is_valid_url_format(url: str) -> bool:
    """Check URL format hợp lệ (HTTPS, có domain, có path hoặc query)."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    if not parsed.netloc:
        return False
    # URL phải có domain hợp lệ (ít nhất 1 dấu chấm)
    if "." not in parsed.netloc:
        return False
    return True


def matches_platform_pattern(url: str, platform_id: str) -> bool:
    """Layer 1: Check URL có match pattern của platform không."""
    sig = PLATFORM_SIGNATURES.get(platform_id)
    if not sig:
        return False
    if not is_valid_url_format(url):
        return False
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False
    host = (parsed.netloc or "").lower()
    # Domain check
    domain_ok = any(host == d or host.endswith("." + d) for d in sig.domains)
    if not domain_ok:
        return False
    # Path check (ít nhất 1 pattern match)
    path = parsed.path or "/"
    full_path = path + (("?" + parsed.query) if parsed.query else "")
    for pattern in sig.valid_path_patterns:
        if re.match(pattern, full_path, re.IGNORECASE):
            return True
        if re.match(pattern, path, re.IGNORECASE):
            return True
    return False


# ════════════════════════════════════════════════════════════════════════════
# LAYER 2: HTTP HEAD CHECK
# ════════════════════════════════════════════════════════════════════════════

def http_head_check(url: str) -> Tuple[Optional[int], Optional[str], int, int]:
    """Real HTTP request kiểm tra URL.

    Returns:
        (status_code, final_url, redirect_count, response_time_ms)
    """
    import time
    start = time.time()
    try:
        # Một số site (Udemy, LinkedIn) chặn HEAD nên dùng GET với stream=True
        resp = requests.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
            stream=True,
        )
        elapsed = int((time.time() - start) * 1000)
        # Đọc 1 chunk nhỏ để có content cho layer 3 (sau)
        try:
            resp.raw.read(1024 * 50, decode_content=True)  # 50KB
        except Exception:
            pass
        redirect_count = len(resp.history)
        final_url = resp.url
        status = resp.status_code
        resp.close()
        return status, final_url, redirect_count, elapsed
    except requests.exceptions.Timeout:
        return None, None, 0, REQUEST_TIMEOUT * 1000
    except requests.exceptions.ConnectionError:
        return None, None, 0, int((time.time() - start) * 1000)
    except requests.exceptions.RequestException:
        return None, None, 0, int((time.time() - start) * 1000)
    except Exception:
        return None, None, 0, int((time.time() - start) * 1000)


def http_get_html(url: str, max_bytes: int = 200_000) -> Optional[str]:
    """Fetch HTML content (truncated) để check 404 indicators."""
    try:
        resp = requests.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
            stream=True,
        )
        chunks = []
        total = 0
        for chunk in resp.iter_content(chunk_size=8192, decode_unicode=False):
            if not chunk:
                continue
            chunks.append(chunk)
            total += len(chunk)
            if total >= max_bytes:
                break
        resp.close()
        try:
            return b"".join(chunks).decode("utf-8", errors="ignore")
        except Exception:
            return ""
    except Exception:
        return None


# ════════════════════════════════════════════════════════════════════════════
# LAYER 3: CONTENT CHECK (404 indicators)
# ════════════════════════════════════════════════════════════════════════════

def html_has_404_indicator(html: str, platform_id: str) -> bool:
    """Check HTML có chứa indicator của trang 404 không.

    Một số site (như Udemy, LinkedIn) trả 200 OK cho trang 404
    nhưng nội dung HTML có text "Page not found".
    """
    if not html:
        return False
    sig = PLATFORM_SIGNATURES.get(platform_id)
    if not sig:
        return False
    html_lower = html.lower()
    for indicator in sig.known_404_indicators:
        if indicator.lower() in html_lower:
            return True
    # Generic 404 indicators
    generic_indicators = [
        '<title>404',
        '<title>page not found',
        'http-equiv="status" content="404"',
        'class="not-found"',
        'id="error-404"',
    ]
    for ind in generic_indicators:
        if ind in html_lower:
            return True
    return False


# ════════════════════════════════════════════════════════════════════════════
# LAYER 4: FALLBACK SEARCH URL
# ════════════════════════════════════════════════════════════════════════════

def normalize_search_query(text: str) -> str:
    """Chuẩn hóa text thành search query."""
    if not text:
        return ""
    # Bỏ ký tự đặc biệt, giữ chữ và số và space
    cleaned = re.sub(r'[^\w\s\u00C0-\u1EF9]', ' ', text, flags=re.UNICODE)
    # Collapse whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    # Limit length
    if len(cleaned) > 100:
        cleaned = cleaned[:100].rsplit(' ', 1)[0]
    return cleaned


def build_search_url(platform_id: str, course_title: str, fallback_skill: Optional[str] = None) -> str:
    """Build search URL trên platform với title của khóa học."""
    sig = PLATFORM_SIGNATURES.get(platform_id)
    if not sig:
        # Fallback: Google search với platform name
        plat_name = (PLATFORM_SIGNATURES.get(platform_id) or PLATFORM_SIGNATURES["coursera"]).platform_name
        q = urllib.parse.quote_plus(f"{course_title or fallback_skill or ''} {plat_name}".strip())
        return f"https://www.google.com/search?q={q}"

    query_text = course_title or fallback_skill or ""
    query_text = normalize_search_query(query_text)
    if not query_text:
        return sig.fallback_url

    quoted = urllib.parse.quote_plus(query_text)
    return sig.search_url_template.format(query=quoted)


def build_fallback_url(platform_id: str) -> str:
    """Get URL fallback (trang chủ khóa học) khi không có gì để search."""
    sig = PLATFORM_SIGNATURES.get(platform_id)
    if sig:
        return sig.fallback_url
    return "https://www.google.com/search?q=online+courses"


# ════════════════════════════════════════════════════════════════════════════
# CORE VALIDATOR
# ════════════════════════════════════════════════════════════════════════════

def validate_single_url(
    url: Optional[str],
    platform_name_or_id: Optional[str],
    course_title: Optional[str] = None,
    fallback_skill: Optional[str] = None,
    do_http_check: bool = True,
) -> ValidationResult:
    """Validate 1 URL qua tất cả 4 lớp.

    Args:
        url: URL gốc do AI tạo
        platform_name_or_id: Tên platform (Coursera/Udemy/...) hoặc ID
        course_title: Tên khóa học (để build search URL fallback)
        fallback_skill: Tên skill (fallback nếu không có title)
        do_http_check: Có check HTTP thực tế không (mặc định True)

    Returns:
        ValidationResult với final_url đã được verify hoặc replace
    """
    # Detect platform
    platform_id = detect_platform_from_name(platform_name_or_id or "")
    if not platform_id and url:
        platform_id = detect_platform_from_url(url)

    # Nếu không xác định được platform → return suspicious
    if not platform_id:
        return ValidationResult(
            original_url=url,
            final_url=url or "https://www.google.com",
            status=ValidationStatus.SUSPICIOUS,
            reason="Không xác định được platform",
        )

    sig = PLATFORM_SIGNATURES[platform_id]

    # Case: URL rỗng → fallback search
    if not url or not url.strip():
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            reason="URL rỗng, dùng search URL",
            is_search_url=True,
            detected_platform=platform_id,
        )

    url = url.strip()

    # ─── LAYER 1: PATTERN CHECK ───────────────────────────────────────────
    if not is_valid_url_format(url):
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            reason="URL format không hợp lệ",
            is_search_url=True,
            detected_platform=platform_id,
        )

    # Check URL có thuộc đúng platform không (cùng domain)
    detected_url_platform = detect_platform_from_url(url)
    if detected_url_platform and detected_url_platform != platform_id:
        # AI nhầm platform → dùng platform của URL
        platform_id = detected_url_platform
        sig = PLATFORM_SIGNATURES[platform_id]

    # Check pattern
    pattern_ok = matches_platform_pattern(url, platform_id)
    if not pattern_ok:
        # Pattern sai (vd: /learn/acting nhưng path không match) → search
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            reason=f"Pattern không match {sig.platform_name}",
            is_search_url=True,
            detected_platform=platform_id,
        )

    # ─── LAYER 2: HTTP CHECK ──────────────────────────────────────────────
    if not do_http_check:
        return ValidationResult(
            original_url=url,
            final_url=url,
            status=ValidationStatus.VERIFIED,
            reason="Skip HTTP check",
            detected_platform=platform_id,
        )

    status_code, final_url, redirect_count, elapsed = http_head_check(url)

    if status_code is None:
        # Network error → fallback search
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            reason="Không kết nối được, dùng search URL",
            is_search_url=True,
            detected_platform=platform_id,
            response_time_ms=elapsed,
        )

    # Status 404 / 410
    if status_code == 404:
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            http_status=404,
            reason="404 Not Found, dùng search URL",
            is_search_url=True,
            detected_platform=platform_id,
            response_time_ms=elapsed,
        )

    if status_code in (410, 451):
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            http_status=status_code,
            reason=f"HTTP {status_code}, dùng search URL",
            is_search_url=True,
            detected_platform=platform_id,
            response_time_ms=elapsed,
        )

    if status_code >= 500:
        # Server error → có thể tạm thời, dùng search URL an toàn hơn
        search_url = build_search_url(platform_id, course_title or "", fallback_skill)
        return ValidationResult(
            original_url=url,
            final_url=search_url,
            status=ValidationStatus.REPLACED,
            http_status=status_code,
            reason=f"Server error {status_code}, dùng search URL",
            is_search_url=True,
            detected_platform=platform_id,
            response_time_ms=elapsed,
        )

    # ─── LAYER 3: CONTENT CHECK (cho 200 OK) ──────────────────────────────
    # Một số platform trả 200 OK cho trang 404 (Udemy, LinkedIn)
    if status_code == 200:
        # Kiểm tra final URL sau redirect có còn match pattern không
        if final_url and final_url != url:
            final_pattern_ok = matches_platform_pattern(final_url, platform_id)
            if not final_pattern_ok:
                # Bị redirect tới trang khác (vd: trang 404 hoặc home)
                search_url = build_search_url(platform_id, course_title or "", fallback_skill)
                return ValidationResult(
                    original_url=url,
                    final_url=search_url,
                    status=ValidationStatus.REPLACED,
                    http_status=200,
                    reason="Redirect tới trang ngoài pattern",
                    is_search_url=True,
                    detected_platform=platform_id,
                    redirect_count=redirect_count,
                    response_time_ms=elapsed,
                )

        # Fetch HTML để check 404 indicators
        html = http_get_html(final_url or url)
        if html and html_has_404_indicator(html, platform_id):
            search_url = build_search_url(platform_id, course_title or "", fallback_skill)
            return ValidationResult(
                original_url=url,
                final_url=search_url,
                status=ValidationStatus.REPLACED,
                http_status=200,
                reason="HTML chứa 404 indicator",
                is_search_url=True,
                detected_platform=platform_id,
                redirect_count=redirect_count,
                response_time_ms=elapsed,
            )

        # PASS tất cả 4 lớp → VERIFIED
        return ValidationResult(
            original_url=url,
            final_url=final_url or url,
            status=ValidationStatus.VERIFIED,
            http_status=200,
            reason="OK",
            detected_platform=platform_id,
            redirect_count=redirect_count,
            response_time_ms=elapsed,
        )

    # 3xx redirect (đã follow) hoặc 4xx khác (401 auth required → coi như OK vì page tồn tại)
    if status_code in (401, 403):
        # Page có thể tồn tại nhưng cần login → vẫn coi là OK
        return ValidationResult(
            original_url=url,
            final_url=final_url or url,
            status=ValidationStatus.VERIFIED,
            http_status=status_code,
            reason=f"HTTP {status_code} (cần login, nhưng page tồn tại)",
            detected_platform=platform_id,
            redirect_count=redirect_count,
            response_time_ms=elapsed,
        )

    # Các status khác (399, 405...) → search URL cho an toàn
    search_url = build_search_url(platform_id, course_title or "", fallback_skill)
    return ValidationResult(
        original_url=url,
        final_url=search_url,
        status=ValidationStatus.REPLACED,
        http_status=status_code,
        reason=f"HTTP {status_code}, dùng search URL",
        is_search_url=True,
        detected_platform=platform_id,
        response_time_ms=elapsed,
    )


# ════════════════════════════════════════════════════════════════════════════
# BATCH VALIDATION (concurrent)
# ════════════════════════════════════════════════════════════════════════════

def validate_courses_batch(
    courses: List[Dict[str, Any]],
    do_http_check: bool = True,
    max_workers: int = MAX_CONCURRENT_CHECKS,
    timeout: int = PARALLEL_VALIDATION_TIMEOUT,
) -> List[Tuple[Dict[str, Any], ValidationResult]]:
    """Validate batch courses song song.

    Args:
        courses: List dict với keys: name, platform, url
        do_http_check: Có thực hiện HTTP check không

    Returns:
        List tuples (original_course, validation_result)
    """
    if not courses:
        return []

    results: List[Optional[Tuple[Dict[str, Any], ValidationResult]]] = [None] * len(courses)

    def _validate_one(idx: int, course: Dict[str, Any]) -> None:
        try:
            url = course.get("url", "")
            platform = course.get("platform", "")
            title = course.get("name") or course.get("title", "")
            result = validate_single_url(
                url=url,
                platform_name_or_id=platform,
                course_title=title,
                do_http_check=do_http_check,
            )
            results[idx] = (course, result)
        except Exception as e:
            logger.error(f"[validator] Error validating course {idx}: {e}")
            results[idx] = (course, ValidationResult(
                original_url=course.get("url"),
                final_url=course.get("url") or "https://www.google.com",
                status=ValidationStatus.UNREACHABLE,
                reason=f"Exception: {str(e)[:100]}",
            ))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(_validate_one, i, c) for i, c in enumerate(courses)]
        try:
            for future in as_completed(futures, timeout=timeout):
                pass
        except Exception as e:
            logger.warning(f"[validator] Batch timeout or error: {e}")

    # Fill in any missing results
    final_results: List[Tuple[Dict[str, Any], ValidationResult]] = []
    for i, r in enumerate(results):
        if r is None:
            final_results.append((courses[i], ValidationResult(
                original_url=courses[i].get("url"),
                final_url=courses[i].get("url") or "https://www.google.com",
                status=ValidationStatus.UNREACHABLE,
                reason="Timeout trong batch",
            )))
        else:
            final_results.append(r)

    return final_results


# ════════════════════════════════════════════════════════════════════════════
# ROADMAP-LEVEL VALIDATION (integrate với roadmap_data từ Gemini)
# ════════════════════════════════════════════════════════════════════════════

def validate_and_fix_roadmap_courses(roadmap_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate tất cả courses trong roadmap và replace dead links.

    Modify in-place và return roadmap_data.
    Mỗi course sẽ có thêm fields:
        - url_verified: bool
        - url_status: str (verified|replaced|...)
        - url_replaced_reason: str (nếu bị replace)
        - is_search_url: bool (URL hiện tại có phải search URL không)
    """
    if not isinstance(roadmap_data, dict):
        return roadmap_data

    phases = roadmap_data.get("phases")
    if not isinstance(phases, list):
        return roadmap_data

    # Collect all courses across phases for batch validation
    all_courses: List[Tuple[int, int, Dict[str, Any]]] = []  # (phase_idx, course_idx, course)
    for pi, phase in enumerate(phases):
        if not isinstance(phase, dict):
            continue
        courses = phase.get("courses", [])
        if not isinstance(courses, list):
            continue
        for ci, course in enumerate(courses):
            if isinstance(course, dict):
                all_courses.append((pi, ci, course))

    if not all_courses:
        return roadmap_data

    # Batch validate
    courses_only = [c for _, _, c in all_courses]
    logger.info(f"[validator] Validating {len(courses_only)} course URLs...")
    validation_results = validate_courses_batch(courses_only, do_http_check=True)

    verified_count = 0
    replaced_count = 0
    suspicious_count = 0

    for (pi, ci, course), (_, vresult) in zip(all_courses, validation_results):
        # Update course in-place
        course["url"] = vresult.final_url or course.get("url", "")
        course["url_verified"] = vresult.status == ValidationStatus.VERIFIED
        course["url_status"] = vresult.status.value
        course["is_search_url"] = vresult.is_search_url
        if vresult.is_search_url:
            course["url_replaced_reason"] = vresult.reason

        if vresult.status == ValidationStatus.VERIFIED:
            verified_count += 1
        elif vresult.status == ValidationStatus.REPLACED:
            replaced_count += 1
        else:
            suspicious_count += 1

    # Update phases với courses đã validate
    for (pi, ci, course), (_, _) in zip(all_courses, validation_results):
        phases[pi]["courses"][ci] = course

    # Add validation summary to roadmap_data
    roadmap_data["url_validation_summary"] = {
        "total": len(all_courses),
        "verified": verified_count,
        "replaced": replaced_count,
        "suspicious": suspicious_count,
        "verification_rate": round(verified_count / max(len(all_courses), 1) * 100, 1),
    }

    logger.info(
        f"[validator] Done: {verified_count} verified, {replaced_count} replaced, "
        f"{suspicious_count} suspicious"
    )

    return roadmap_data


# ════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ════════════════════════════════════════════════════════════════════════════

def get_platform_info(platform_id_or_name: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin platform để hiển thị trong UI."""
    pid = detect_platform_from_name(platform_id_or_name)
    if not pid:
        return None
    sig = PLATFORM_SIGNATURES[pid]
    return {
        "id": sig.platform_id,
        "name": sig.platform_name,
        "domains": sig.domains,
        "course_listing_url": sig.course_listing_url,
        "search_url_template": sig.search_url_template,
    }


def is_search_url(url: str) -> bool:
    """Check URL có phải là search URL của platform nào không."""
    if not url:
        return False
    for sig in PLATFORM_SIGNATURES.values():
        # Build base of search URL
        base = sig.search_url_template.split("?")[0].split("{")[0].rstrip("/")
        if base in url:
            return True
    return False


def safe_validate_url_fast(url: str, platform: str) -> str:
    """Quick validate (no HTTP check) - chỉ check pattern. Trả về URL fallback nếu invalid."""
    if not url or not is_valid_url_format(url):
        platform_id = detect_platform_from_name(platform) or "coursera"
        return build_fallback_url(platform_id)

    platform_id = detect_platform_from_name(platform) or detect_platform_from_url(url)
    if not platform_id:
        return url

    if matches_platform_pattern(url, platform_id):
        return url

    return build_fallback_url(platform_id)
