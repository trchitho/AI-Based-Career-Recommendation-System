"""
Company Job Board Scraper
=========================
Thu thap ten cong ty va URL tuyen dung tu cac board:
  - VietnamWorks  (vietnamworks.com)
  - TopCV         (topcv.vn)
  - ITViec        (itviec.com)        — chi IT
  - JobStreet VN  (jobstreet.com.vn)
  - CareerViet    (careerviet.vn)

Moi nguon tra ve list[CompanyResult]:
  name, careers_url, source_board, career_group_slug, location, industry
"""
from __future__ import annotations

import asyncio
import logging
import random
import re
import time
from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import quote_plus, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Rotate User-Agents to avoid blocks ────────────────────────────
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

try:
    _TIMEOUT = httpx.Timeout(connect=10.0, read=20.0, write=10.0, pool=5.0)
except TypeError:
    # httpx < 0.20 used the *_timeout keyword names.
    _TIMEOUT = httpx.Timeout(
        connect_timeout=10.0,
        read_timeout=20.0,
        write_timeout=10.0,
        pool_timeout=5.0,
    )


@dataclass
class CompanyResult:
    name: str
    careers_url: Optional[str] = None
    source_board: str = ""          # vietnamworks / topcv / itviec / jobstreet / careerviet
    board_url: Optional[str] = None # URL on job board
    career_group_slug: str = ""
    industry: Optional[str] = None
    location: Optional[str] = None
    size: Optional[str] = None


# ── Career group → search keywords mapping ────────────────────────
SLUG_TO_KEYWORDS = {
    "management":              ["quan ly", "giam doc", "truong phong", "CEO", "COO", "manager"],
    "business-finance":        ["tai chinh", "ke toan", "phan tich", "kinh doanh", "business analyst"],
    "computer-math":           ["lap trinh", "developer", "data science", "devops", "backend", "frontend"],
    "architecture-engineering":["ky su", "kien truc", "co dien", "xay dung cong trinh"],
    "life-science":            ["khoa hoc", "sinh hoc", "nghien cuu", "hoa hoc", "moi truong"],
    "community-social":        ["cong tac xa hoi", "ngo", "cong dong", "tu van tam ly"],
    "legal":                   ["luat su", "phap ly", "compliance", "tuan thu"],
    "education":               ["giao vien", "giang day", "dao tao", "giao duc"],
    "arts-media":              ["thiet ke", "designer", "truyen thong", "marketing", "creative"],
    "healthcare-practitioners":["bac si", "y ta", "duoc si", "chuyen gia y te"],
    "healthcare-support":      ["dieu duong ho tro", "ky thuat vien y", "nha thuoc"],
    "protective-service":      ["bao ve", "an ninh", "canh sat", "phong chay"],
    "food-service":            ["dau bep", "phuc vu", "nha hang", "quan ly f&b"],
    "building-maintenance":    ["bao tri", "facilities", "ky thuat toa nha", "ve sinh cong nghiep"],
    "personal-care":           ["spa", "lam dep", "huan luyen vien", "fitness"],
    "sales":                   ["ban hang", "kinh doanh", "sale", "key account"],
    "office-admin":            ["hanh chinh", "thu ky", "van phong", "le tan"],
    "farming-forestry":        ["nong nghiep", "lam nghiep", "ky su nong", "thu y"],
    "construction":            ["xay dung", "cong trinh", "nha thau", "ket cau"],
    "installation-repair":     ["lap dat", "sua chua", "bao tri thiet bi", "ky thuat vien"],
    "production":              ["san xuat", "che tao", "kiem soat chat luong", "van hanh nha may"],
    "transportation":          ["van tai", "logistics", "tai xe", "giao hang"],
}


def _headers() -> dict:
    return {
        "User-Agent": random.choice(_USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
    }


async def _fetch(client: httpx.AsyncClient, url: str, retries: int = 3) -> Optional[str]:
    """Fetch URL with retry + exponential backoff."""
    for attempt in range(retries):
        try:
            await asyncio.sleep(random.uniform(1.5, 3.5))   # polite delay
            r = await client.get(url, headers=_headers(), timeout=_TIMEOUT, allow_redirects=True)
            if r.status_code == 200:
                return r.text
            if r.status_code == 429:
                wait = (2 ** attempt) * 5
                logger.warning(f"[scraper] Rate limited {url} — waiting {wait}s")
                await asyncio.sleep(wait)
            elif r.status_code in (403, 404):
                return None
        except Exception as e:
            logger.debug(f"[scraper] Fetch error {url}: {e}")
            await asyncio.sleep(2 ** attempt)
    return None


def _clean(text: str) -> str:
    return re.sub(r'\s+', ' ', text or '').strip()


def _domain_careers_url(company_name: str, board_profile_url: str) -> Optional[str]:
    """Try to infer company's own career page from profile URL."""
    if not board_profile_url:
        return None
    # Many large companies have /careers or /tuyen-dung on their own domain
    return board_profile_url   # return board profile as fallback


# ═══════════════════════════════════════════════════════════════════
#  SOURCE 1: VietnamWorks
# ═══════════════════════════════════════════════════════════════════
async def scrape_vietnamworks(client: httpx.AsyncClient, slug: str, keyword: str, page: int = 1) -> List[CompanyResult]:
    """Scrape VietnamWorks search results for a keyword."""
    url = (
        f"https://www.vietnamworks.com/tim-viec-lam"
        f"?keyword={quote_plus(keyword)}&page={page}"
    )
    html = await _fetch(client, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[CompanyResult] = []

    # VietnamWorks job cards contain company info
    for card in soup.select("div[class*='job-item'], div[class*='JobItem'], li[class*='job']"):
        # Company name
        cname_el = (
            card.select_one("span[class*='company'], a[class*='company'], h3[class*='company']")
            or card.select_one("[data-company], [class*='employer']")
        )
        if not cname_el:
            continue
        name = _clean(cname_el.get_text())
        if not name or len(name) < 2:
            continue

        # Company page URL on VW
        clink = card.select_one("a[href*='/nha-tuyen-dung/']")
        board_url = urljoin("https://www.vietnamworks.com", clink["href"]) if clink else None

        # Location
        loc_el = card.select_one("[class*='location'], [class*='Location']")
        location = _clean(loc_el.get_text()) if loc_el else None

        results.append(CompanyResult(
            name=name,
            source_board="vietnamworks",
            board_url=board_url,
            careers_url=board_url,
            vietnamworks_url=board_url,
            career_group_slug=slug,
            location=location,
        ))

    return results


# ═══════════════════════════════════════════════════════════════════
#  SOURCE 2: TopCV
# ═══════════════════════════════════════════════════════════════════
async def scrape_topcv(client: httpx.AsyncClient, slug: str, keyword: str, page: int = 1) -> List[CompanyResult]:
    url = f"https://www.topcv.vn/tim-viec-lam?keyword={quote_plus(keyword)}&page={page}"
    html = await _fetch(client, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[CompanyResult] = []

    for card in soup.select("div.job-item, div[class*='job-item-search'], div[class*='JobItem']"):
        cname_el = card.select_one("a[class*='company'], span[class*='company'], h4[class*='company']")
        if not cname_el:
            continue
        name = _clean(cname_el.get_text())
        if not name or len(name) < 2:
            continue

        clink = card.select_one("a[href*='/cong-ty/']")
        board_url = urljoin("https://www.topcv.vn", clink["href"]) if clink else None

        loc_el = card.select_one("[class*='location']")
        location = _clean(loc_el.get_text()) if loc_el else None

        results.append(CompanyResult(
            name=name,
            source_board="topcv",
            board_url=board_url,
            careers_url=board_url,
            topcv_url=board_url,
            career_group_slug=slug,
            location=location,
        ))

    return results


# ═══════════════════════════════════════════════════════════════════
#  SOURCE 3: ITViec (IT only)
# ═══════════════════════════════════════════════════════════════════
async def scrape_itviec(client: httpx.AsyncClient, slug: str = "computer-math", keyword: str = "developer", page: int = 1) -> List[CompanyResult]:
    url = f"https://itviec.com/it-jobs?query={quote_plus(keyword)}&page={page}"
    html = await _fetch(client, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[CompanyResult] = []

    for card in soup.select("div.job, div[class*='job_content'], div[class*='JobItem']"):
        cname_el = card.select_one("a[class*='employer'], h2[class*='company'], span[class*='company']")
        if not cname_el:
            continue
        name = _clean(cname_el.get_text())
        if not name or len(name) < 2:
            continue

        clink = card.select_one("a[href*='/companies/']")
        board_url = urljoin("https://itviec.com", clink["href"]) if clink else None

        results.append(CompanyResult(
            name=name,
            source_board="itviec",
            board_url=board_url,
            careers_url=board_url,
            itviec_url=board_url,
            career_group_slug="computer-math",
            location="Vietnam",
        ))

    return results


# ═══════════════════════════════════════════════════════════════════
#  SOURCE 4: CareerViet
# ═══════════════════════════════════════════════════════════════════
async def scrape_careerviet(client: httpx.AsyncClient, slug: str, keyword: str, page: int = 1) -> List[CompanyResult]:
    url = f"https://careerviet.vn/viec-lam/tim-kiem.html?keyword={quote_plus(keyword)}&page={page}"
    html = await _fetch(client, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[CompanyResult] = []

    for card in soup.select("div.job-item, div[class*='job-item'], li[class*='job']"):
        cname_el = card.select_one("a[class*='company'], span[class*='company-name']")
        if not cname_el:
            continue
        name = _clean(cname_el.get_text())
        if not name or len(name) < 2:
            continue

        clink = card.select_one("a[href*='/cong-ty/'], a[href*='/company/']")
        board_url = urljoin("https://careerviet.vn", clink["href"]) if clink else None

        results.append(CompanyResult(
            name=name,
            source_board="careerviet",
            board_url=board_url,
            careers_url=board_url,
            career_group_slug=slug,
        ))

    return results


# ═══════════════════════════════════════════════════════════════════
#  SOURCE 5: JobStreet Vietnam
# ═══════════════════════════════════════════════════════════════════
async def scrape_jobstreet(client: httpx.AsyncClient, slug: str, keyword: str, page: int = 1) -> List[CompanyResult]:
    url = (
        f"https://www.jobstreet.com.vn/viec-lam-{quote_plus(keyword).replace('%20', '-')}"
        f"?pg={page}"
    )
    html = await _fetch(client, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[CompanyResult] = []

    for card in soup.select("article[data-automation='job-card'], div[class*='job-card']"):
        cname_el = card.select_one("a[data-automation='jobcard-company'], span[class*='company']")
        if not cname_el:
            continue
        name = _clean(cname_el.get_text())
        if not name or len(name) < 2:
            continue

        loc_el = card.select_one("[data-automation='job-location'], [class*='location']")
        location = _clean(loc_el.get_text()) if loc_el else None

        results.append(CompanyResult(
            name=name,
            source_board="jobstreet",
            career_group_slug=slug,
            location=location,
            jobstreet_url=f"https://www.jobstreet.com.vn/en/companies/{name.lower().replace(' ', '-')}-jobs.html",
        ))

    return results


# ═══════════════════════════════════════════════════════════════════
#  MAIN: Scrape all sources for one career group
# ═══════════════════════════════════════════════════════════════════
async def scrape_group(slug: str, max_pages: int = 2) -> List[CompanyResult]:
    """Scrape all job boards for one career group slug. Returns deduplicated list."""
    keywords = SLUG_TO_KEYWORDS.get(slug, [slug.replace("-", " ")])
    all_results: List[CompanyResult] = []

    async with httpx.AsyncClient(
        verify=False,
        timeout=_TIMEOUT,
        limits=httpx.Limits(max_connections=5, max_keepalive_connections=3),
    ) as client:
        for kw in keywords[:2]:    # only first 2 keywords per group to stay polite
            for page in range(1, max_pages + 1):
                try:
                    tasks = [
                        scrape_vietnamworks(client, slug, kw, page),
                        scrape_topcv(client, slug, kw, page),
                        scrape_careerviet(client, slug, kw, page),
                    ]
                    if slug == "computer-math":
                        tasks.append(scrape_itviec(client, slug, kw, page))
                    else:
                        tasks.append(scrape_jobstreet(client, slug, kw, page))

                    results_nested = await asyncio.gather(*tasks, return_exceptions=True)
                    for r in results_nested:
                        if isinstance(r, list):
                            all_results.extend(r)
                    logger.info(f"[scraper] {slug} | kw='{kw}' p={page} → {sum(len(r) for r in results_nested if isinstance(r, list))} found")
                except Exception as e:
                    logger.error(f"[scraper] Error scraping {slug}/{kw}/p{page}: {e}")

    # Deduplicate by normalized name
    seen: set = set()
    unique: List[CompanyResult] = []
    for r in all_results:
        key = re.sub(r'[^a-zA-Z0-9]', '', r.name.lower())
        if key and key not in seen and len(key) > 2:
            seen.add(key)
            unique.append(r)

    logger.info(f"[scraper] {slug} → {len(unique)} unique companies")
    return unique


# ═══════════════════════════════════════════════════════════════════
#  SCRAPE ALL GROUPS
# ═══════════════════════════════════════════════════════════════════
async def scrape_all_groups(slugs: Optional[List[str]] = None, max_pages: int = 2) -> dict:
    """Scrape all (or specified) career groups. Returns {slug: [CompanyResult]}."""
    target_slugs = slugs or list(SLUG_TO_KEYWORDS.keys())
    output = {}
    for slug in target_slugs:
        try:
            results = await scrape_group(slug, max_pages=max_pages)
            output[slug] = results
            await asyncio.sleep(random.uniform(2, 4))   # inter-group pause
        except Exception as e:
            logger.error(f"[scraper] Group {slug} failed: {e}")
            output[slug] = []
    return output
