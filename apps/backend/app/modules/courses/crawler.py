"""
Web scraper for Coursera, Udemy, LinkedIn Learning.
No API keys required — scrapes public web pages directly.

Strategy per platform
─────────────────────
• Coursera  : public REST catalog API (no auth, always works)
• Udemy     : parse JSON blob embedded in search-result HTML
• LinkedIn  : parse JSON-LD + HTML cards from public search page
              (requires LinkedIn session cookie for full access;
               falls back to partial results without it)
"""
from __future__ import annotations

import json
import logging
import os
import random
import re
import time
from typing import TYPE_CHECKING

import requests
from bs4 import BeautifulSoup

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Shared HTTP session ────────────────────────────────────────────
_SESSION = requests.Session()

# Rotate common browser User-Agents to avoid 403s
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
]

_BASE_HEADERS = {
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
}

# Default keywords to crawl
DEFAULT_KEYWORDS = [
    "Python", "Machine Learning", "Data Science", "SQL", "React",
    "Docker", "AWS", "JavaScript", "Java", "Deep Learning",
    "NLP", "Computer Vision", "DevOps", "Kubernetes", "TypeScript",
    "Node.js", "FastAPI", "Data Engineering", "Cloud Computing", "Cybersecurity",
]

# Polite delay range (seconds) between requests to same domain
_MIN_DELAY = 1.2
_MAX_DELAY = 2.8


def _headers(extra: dict | None = None) -> dict:
    h = {**_BASE_HEADERS, "User-Agent": random.choice(_USER_AGENTS)}
    if extra:
        h.update(extra)
    return h


def _sleep():
    time.sleep(random.uniform(_MIN_DELAY, _MAX_DELAY))


def _get(url: str, *, params: dict | None = None, extra_headers: dict | None = None, timeout: int = 15) -> requests.Response | None:
    """GET with retry once on transient errors."""
    for attempt in range(2):
        try:
            resp = _SESSION.get(url, params=params, headers=_headers(extra_headers), timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.exceptions.HTTPError as e:
            if resp.status_code in (429, 503) and attempt == 0:
                logger.warning(f"Rate limited ({resp.status_code}), waiting 5s…")
                time.sleep(5)
                continue
            logger.warning(f"HTTP {resp.status_code} fetching {url}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Request failed ({url}): {e}")
            return None
    return None


# ── Helpers ───────────────────────────────────────────────────────

def _extract_json_var(html: str, var_name: str) -> dict | list | None:
    """Extract a JavaScript variable assignment like: var FOO = {...};"""
    pattern = rf'(?:var\s+|window\.){re.escape(var_name)}\s*=\s*(\{{.*?\}}|\[.*?\])\s*;'
    m = re.search(pattern, html, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return None


def _extract_next_data(html: str) -> dict | None:
    """Extract Next.js __NEXT_DATA__ script tag."""
    m = re.search(r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', html, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return None


def _extract_json_ld(soup: BeautifulSoup) -> list[dict]:
    """Extract all JSON-LD structured data blocks from a page."""
    results = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            if isinstance(data, list):
                results.extend(data)
            else:
                results.append(data)
        except json.JSONDecodeError:
            pass
    return results


# ── Coursera ──────────────────────────────────────────────────────

_COURSERA_API = "https://api.coursera.org/api/courses.v1"


def crawl_coursera(keyword: str, limit: int = 10) -> list[dict]:
    """
    Coursera public catalog API — no authentication required.
    """
    params = {
        "q": "search",
        "query": keyword,
        "limit": limit,
        "fields": "id,name,slug,description,photoUrl,workload,level,partners.v1(name)",
        "includes": "partners",
    }
    resp = _get(_COURSERA_API, params=params)
    if not resp:
        return []

    try:
        data = resp.json()
    except Exception:
        return []

    elements = data.get("elements", [])
    linked = data.get("linked", {})
    partner_map: dict[str, str] = {p["id"]: p.get("name", "") for p in linked.get("partners.v1", [])}

    courses = []
    for item in elements:
        partner_ids = item.get("partnerIds", [])
        instructor = partner_map.get(partner_ids[0], "") if partner_ids else ""
        courses.append({
            "external_id": f"coursera-{item['id']}",
            "title": item.get("name", ""),
            "description": (item.get("description") or "")[:500],
            "url": f"https://www.coursera.org/learn/{item.get('slug', item['id'])}",
            "platform": "coursera",
            "instructor": instructor,
            "rating": 0.0,
            "num_reviews": 0,
            "price": 0.0,
            "is_free": True,
            "level": (item.get("level") or "").lower() or None,
            "duration_hrs": None,
            "thumbnail": item.get("photoUrl") or "",
            "language": "en",
            "tags": [keyword.lower()],
        })

    _sleep()
    logger.info(f"[Coursera] '{keyword}' → {len(courses)} courses")
    return courses


# ── Udemy ─────────────────────────────────────────────────────────

_UDEMY_SEARCH_URL = "https://www.udemy.com/courses/search/"


def _parse_udemy_courses(data: dict, keyword: str) -> list[dict]:
    """Parse course list from Udemy API/JSON blob."""
    items = []
    # Structure varies: results[], courses[], items[]
    raw = (
        data.get("results")
        or data.get("courses")
        or data.get("items")
        or (data.get("data", {}) or {}).get("results", [])
    )
    if not isinstance(raw, list):
        return []

    for item in raw:
        cid = item.get("id") or item.get("course_id", "")
        if not cid:
            continue
        price_detail = item.get("price_detail") or {}
        price_str = price_detail.get("amount") or item.get("price") or "0"
        try:
            price = float(str(price_str).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            price = 0.0

        items.append({
            "external_id": f"udemy-{cid}",
            "title": item.get("title", ""),
            "description": (item.get("headline") or item.get("description") or "")[:500],
            "url": f"https://www.udemy.com{item.get('url', '')}",
            "platform": "udemy",
            "instructor": (
                item.get("visible_instructors", [{}])[0].get("display_name", "")
                if item.get("visible_instructors") else ""
            ),
            "rating": float(item.get("rating") or 0),
            "num_reviews": int(item.get("num_reviews") or 0),
            "price": price,
            "is_free": not item.get("is_paid", True),
            "level": (item.get("instructional_level_simple") or "").lower() or None,
            "duration_hrs": None,
            "thumbnail": item.get("image_480x270") or item.get("image_240x135") or "",
            "language": item.get("locale", {}).get("simple_english_title", "english").lower()
                        if isinstance(item.get("locale"), dict) else "en",
            "tags": [keyword.lower()],
        })
    return items


def crawl_udemy(keyword: str, limit: int = 10) -> list[dict]:
    """
    Scrape Udemy search results page.
    Parses the embedded JSON data bundle — no API key needed.
    """
    params = {
        "q": keyword,
        "sort": "highest-rated",
        "lang": "en",
        "instructional_level": "",
    }
    resp = _get(
        _UDEMY_SEARCH_URL,
        params=params,
        extra_headers={
            "Referer": "https://www.udemy.com/",
            "Sec-Fetch-Site": "same-origin",
        },
    )
    if not resp:
        return []

    html = resp.text
    soup = BeautifulSoup(html, "lxml")
    courses: list[dict] = []

    # ── Strategy 1: window.ud_api_cache JSON blob ──
    m = re.search(r'window\.ud_api_cache\s*=\s*(\{.*?\});\s*(?:window|var|\n)', html, re.DOTALL)
    if m:
        try:
            cache = json.loads(m.group(1))
            for key, val in cache.items():
                if "courses" in key or "search" in key:
                    parsed = _parse_udemy_courses(val if isinstance(val, dict) else {}, keyword)
                    courses.extend(parsed)
                    if courses:
                        break
        except json.JSONDecodeError:
            pass

    # ── Strategy 2: __NEXT_DATA__ ──
    if not courses:
        next_data = _extract_next_data(html)
        if next_data:
            props = next_data.get("props", {}).get("pageProps", {})
            results = props.get("searchResults") or props.get("courses") or {}
            parsed = _parse_udemy_courses(results if isinstance(results, dict) else {}, keyword)
            courses.extend(parsed)

    # ── Strategy 3: JSON-LD structured data ──
    if not courses:
        for block in _extract_json_ld(soup):
            if block.get("@type") in ("ItemList", "Course"):
                if block.get("@type") == "ItemList":
                    for entry in block.get("itemListElement", []):
                        item = entry.get("item", {})
                        if item.get("@type") == "Course":
                            cid = re.sub(r"[^a-z0-9]", "-", (item.get("url") or "").lower())[-40:]
                            courses.append({
                                "external_id": f"udemy-{cid}",
                                "title": item.get("name", ""),
                                "description": (item.get("description") or "")[:500],
                                "url": item.get("url", ""),
                                "platform": "udemy",
                                "instructor": "",
                                "rating": float((item.get("aggregateRating") or {}).get("ratingValue") or 0),
                                "num_reviews": int((item.get("aggregateRating") or {}).get("reviewCount") or 0),
                                "price": 0.0,
                                "is_free": False,
                                "level": None,
                                "duration_hrs": None,
                                "thumbnail": (item.get("image") or [None])[0] if isinstance(item.get("image"), list) else item.get("image") or "",
                                "language": "en",
                                "tags": [keyword.lower()],
                            })

    # ── Strategy 4: HTML card scraping ──
    if not courses:
        for card in soup.select("[data-purpose='course-title-url'] a, .course-card--course-title--wgDNy, [class*='CourseCard'] h3"):
            title = card.get_text(strip=True)
            href = card.get("href", "")
            if not title:
                continue
            courses.append({
                "external_id": f"udemy-html-{re.sub(r'[^a-z0-9]', '', title.lower())[:30]}",
                "title": title,
                "description": "",
                "url": f"https://www.udemy.com{href}" if href.startswith("/") else href,
                "platform": "udemy",
                "instructor": "",
                "rating": 0.0,
                "num_reviews": 0,
                "price": 0.0,
                "is_free": False,
                "level": None,
                "duration_hrs": None,
                "thumbnail": "",
                "language": "en",
                "tags": [keyword.lower()],
            })

    courses = courses[:limit]
    _sleep()
    logger.info(f"[Udemy] '{keyword}' → {len(courses)} courses")
    return courses


# ── LinkedIn Learning ─────────────────────────────────────────────

_LINKEDIN_SEARCH_URL = "https://www.linkedin.com/learning/search"


def crawl_linkedin(keyword: str, limit: int = 10) -> list[dict]:
    """
    Scrape LinkedIn Learning public search page.
    Works best with a valid LINKEDIN_SESSION_COOKIE (li_at) in .env.
    Without a cookie, LinkedIn may return a login redirect — results will be empty.
    """
    li_at = os.getenv("LINKEDIN_SESSION_COOKIE", "")
    cookies = {"li_at": li_at} if li_at else {}

    params = {"keywords": keyword, "contentType": "course", "u": "0"}
    extra = {
        "Referer": "https://www.linkedin.com/",
        "Sec-Fetch-Site": "same-origin",
    }

    resp = _get(
        _LINKEDIN_SEARCH_URL,
        params=params,
        extra_headers=extra,
        cookies=cookies,
    )
    if not resp:
        return []

    # Redirect to login page means no session
    if "linkedin.com/login" in resp.url or "authwall" in resp.url:
        logger.warning(
            "LinkedIn Learning requires a session cookie. "
            "Set LINKEDIN_SESSION_COOKIE=<li_at value> in .env"
        )
        return []

    html = resp.text
    soup = BeautifulSoup(html, "lxml")
    courses: list[dict] = []

    # ── Strategy 1: JSON-LD structured data ──
    for block in _extract_json_ld(soup):
        if block.get("@type") == "ItemList":
            for entry in block.get("itemListElement", []):
                item = entry.get("item", {})
                if item.get("@type") != "Course":
                    continue
                url = item.get("url", "")
                slug = url.rstrip("/").split("/")[-1] if url else ""
                courses.append({
                    "external_id": f"linkedin-{slug or re.sub(r'[^a-z0-9]', '', item.get('name','').lower())[:30]}",
                    "title": item.get("name", ""),
                    "description": (item.get("description") or "")[:500],
                    "url": url,
                    "platform": "linkedin",
                    "instructor": (item.get("author") or {}).get("name", "") if isinstance(item.get("author"), dict) else "",
                    "rating": float((item.get("aggregateRating") or {}).get("ratingValue") or 0),
                    "num_reviews": int((item.get("aggregateRating") or {}).get("reviewCount") or 0),
                    "price": 0.0,
                    "is_free": False,
                    "level": None,
                    "duration_hrs": None,
                    "thumbnail": item.get("image", ""),
                    "language": "en",
                    "tags": [keyword.lower()],
                })

    # ── Strategy 2: HTML card scraping ──
    if not courses:
        selectors = [
            "li.search-result",
            "[data-test='search-result']",
            ".learning-serp-card",
            "[class*='search-results__result-item']",
            "article",
        ]
        cards = []
        for sel in selectors:
            cards = soup.select(sel)
            if cards:
                break

        for card in cards:
            title_el = card.select_one("h3, h4, [class*='title'], [class*='name']")
            link_el = card.select_one("a[href*='/learning/']")
            img_el = card.select_one("img")
            desc_el = card.select_one("[class*='description'], [class*='subtitle'], p")

            title = title_el.get_text(strip=True) if title_el else ""
            if not title:
                continue
            href = link_el.get("href", "") if link_el else ""
            slug = href.rstrip("/").split("/")[-1] if href else re.sub(r"[^a-z0-9]", "", title.lower())[:30]

            courses.append({
                "external_id": f"linkedin-{slug}",
                "title": title,
                "description": desc_el.get_text(strip=True)[:500] if desc_el else "",
                "url": f"https://www.linkedin.com{href}" if href.startswith("/") else href,
                "platform": "linkedin",
                "instructor": "",
                "rating": 0.0,
                "num_reviews": 0,
                "price": 0.0,
                "is_free": False,
                "level": None,
                "duration_hrs": None,
                "thumbnail": img_el.get("src", "") if img_el else "",
                "language": "en",
                "tags": [keyword.lower()],
            })

    courses = courses[:limit]
    _sleep()
    logger.info(f"[LinkedIn] '{keyword}' → {len(courses)} courses")
    return courses


# ── Persist to DB ─────────────────────────────────────────────────

def upsert_courses(db: "Session", courses: list[dict]) -> dict:
    """Insert new courses; refresh mutable fields for existing ones."""
    from .models import CourseCatalog

    inserted = 0
    updated = 0
    for data in courses:
        existing = db.query(CourseCatalog).filter_by(external_id=data["external_id"]).first()
        if existing:
            existing.rating = data.get("rating") or existing.rating
            existing.num_reviews = data.get("num_reviews") or existing.num_reviews
            existing.description = data.get("description") or existing.description
            existing.thumbnail = data.get("thumbnail") or existing.thumbnail
            existing.is_embedded = False  # re-embed on next run
            updated += 1
        else:
            db.add(CourseCatalog(**{k: v for k, v in data.items()}))
            inserted += 1

    db.commit()
    return {"inserted": inserted, "updated": updated}


# ── Main crawl entry point ────────────────────────────────────────

def run_crawl(
    db: "Session",
    keywords: list[str] | None = None,
    platforms: list[str] | None = None,
    page_size: int = 10,
) -> dict:
    """
    Crawl courses from selected platforms for given keywords.
    Auto-triggers embedding + skill-map rebuild after insert.

    Platforms: "coursera" | "udemy" | "linkedin"
    Default: all three.
    """
    kws = keywords or DEFAULT_KEYWORDS
    plats = [p.lower() for p in (platforms or ["coursera", "udemy", "linkedin"])]

    total_inserted = 0
    total_updated = 0
    errors: list[str] = []

    crawlers = {
        "coursera": crawl_coursera,
        "udemy": crawl_udemy,
        "linkedin": crawl_linkedin,
    }

    for kw in kws:
        raw: list[dict] = []
        for plat in plats:
            fn = crawlers.get(plat)
            if fn:
                raw.extend(fn(kw, page_size))
            else:
                errors.append(f"Unknown platform: '{plat}'")

        if raw:
            result = upsert_courses(db, raw)
            total_inserted += result["inserted"]
            total_updated += result["updated"]
            logger.info(f"  [{kw}] {result['inserted']} new, {result['updated']} updated")
        else:
            errors.append(f"No results for '{kw}'")

    logger.info(f"Crawl done: {total_inserted} inserted, {total_updated} updated")
    return {
        "inserted": total_inserted,
        "updated": total_updated,
        "keywords": kws,
        "platforms": plats,
        "errors": errors,
    }
