"""
Playwright-based crawler engine for Vietnam job boards.

Architecture:
  CrawlerEngine
    └── per source: VietnamWorksCrawler | ITViecCrawler | TopCVCrawler | CareerVietCrawler
          └── per industry: scrape list page → extract jobs → normalize → return JobRecord[]

Design principles:
  - Stealth mode (no webdriver fingerprint)
  - Rotating user-agents
  - Randomized delays
  - Retry with exponential backoff
  - Prefer __NEXT_DATA__ / embedded JSON over raw HTML
  - Stop after JOBS_PER_INDUSTRY valid jobs per industry
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

from .constants import INDUSTRY_GROUPS, JOBS_PER_INDUSTRY, IndustryGroup
from .normalizer import (
    clean_location, clean_text, clean_title,
    extract_skills, normalize_employment_type,
    normalize_experience, parse_date, parse_salary,
)
from .persistence import JobRecord

logger = logging.getLogger(__name__)

# ── User-agent pool ───────────────────────────────────────────────────────────
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]


def _random_ua() -> str:
    return random.choice(_USER_AGENTS)


async def _random_delay(min_s: float = 0.8, max_s: float = 2.5) -> None:
    await asyncio.sleep(random.uniform(min_s, max_s))


# ── Base crawler ──────────────────────────────────────────────────────────────

class BaseCrawler(ABC):
    """Abstract base for all job board crawlers."""

    source_site: str = ""
    max_retries: int = 3

    def __init__(self) -> None:
        self.logger = logging.getLogger(f"crawler.{self.source_site}")

    @abstractmethod
    async def crawl_industry(
        self,
        industry: IndustryGroup,
        page: Any,  # Playwright Page
        limit: int = JOBS_PER_INDUSTRY,
    ) -> List[JobRecord]:
        """Crawl `limit` newest jobs for the given industry group."""
        ...

    async def _safe_goto(
        self,
        page: Any,
        url: str,
        wait_until: str = "domcontentloaded",
        timeout: int = 20000,
    ) -> bool:
        """Navigate with retry logic."""
        for attempt in range(self.max_retries):
            try:
                await page.goto(url, timeout=timeout, wait_until=wait_until)
                await _random_delay(0.5, 1.5)
                return True
            except Exception as e:
                self.logger.warning(f"[{self.source_site}] goto failed (attempt {attempt+1}): {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
        return False

    def _make_record(
        self,
        industry: IndustryGroup,
        *,
        title: str,
        company: str,
        location: str,
        salary: str = "",
        description: str = "",
        requirements: str = "",
        job_url: str,
        apply_url: str = "",
        posted_raw: str = "",
        deadline_raw: str = "",
        experience_raw: str = "",
        employment_raw: str = "",
        skills_raw: str = "",
        raw_data: Optional[Dict] = None,
    ) -> Optional[JobRecord]:
        title = clean_title(title)
        if not title:
            return None

        # ── Validate: title phải liên quan đến industry ──────────────────────
        # Nếu title không chứa bất kỳ keyword nào của industry → skip
        title_lower = title.lower()
        all_keywords = (
            industry.vnw_keywords + industry.itviec_keywords +
            industry.topcv_keywords + industry.careerviet_keywords
        )
        # Thêm tên ngành tiếng Việt vào danh sách check
        all_keywords.append(industry.name_vi.lower())
        all_keywords.append(industry.name.lower())

        # Relaxed match: chỉ cần 1 keyword xuất hiện trong title HOẶC description
        text_to_check = (title_lower + " " + description.lower() + " " + company.lower())
        is_relevant = any(kw.lower() in text_to_check for kw in all_keywords)

        # Nếu không relevant, vẫn chấp nhận nếu đây là kết quả search (search engine đã filter)
        # Nhưng gán category dựa trên title thay vì keyword search
        actual_industry = industry
        if not is_relevant:
            # Thử tìm industry phù hợp hơn từ title
            from .constants import INDUSTRY_GROUPS as _ALL_GROUPS
            for g in _ALL_GROUPS:
                g_keywords = g.vnw_keywords + g.itviec_keywords + [g.name_vi.lower(), g.name.lower()]
                if any(kw.lower() in title_lower for kw in g_keywords):
                    actual_industry = g
                    break
            # Nếu vẫn không tìm được → giữ nguyên industry gốc (search engine đã filter)

        sal_min, sal_max = parse_salary(salary)
        skills = extract_skills(skills_raw or description or requirements)

        return JobRecord(
            industry_group_id=actual_industry.id,
            industry_group_slug=actual_industry.slug,
            source_site=self.source_site,
            title=title,
            company=clean_text(company, 300),
            location=clean_location(location),
            salary=clean_text(salary, 200),
            salary_min=sal_min,
            salary_max=sal_max,
            skills=skills,
            experience_level=normalize_experience(experience_raw),
            employment_type=normalize_employment_type(employment_raw),
            description=clean_text(description, 2000),
            requirements=clean_text(requirements, 2000),
            posted_date=parse_date(posted_raw),
            application_deadline=parse_date(deadline_raw),
            job_url=job_url.split("?")[0] if job_url else "",  # strip tracking params
            apply_url=apply_url or job_url,
            raw_data=raw_data,
        )


# ── VietnamWorks crawler ──────────────────────────────────────────────────────

class VietnamWorksCrawler(BaseCrawler):
    """
    Crawls VietnamWorks using __NEXT_DATA__ embedded JSON when available,
    falls back to DOM selectors.
    """
    source_site = "vietnamworks"
    BASE_URL = "https://www.vietnamworks.com"

    async def crawl_industry(
        self,
        industry: IndustryGroup,
        page: Any,
        limit: int = JOBS_PER_INDUSTRY,
    ) -> List[JobRecord]:
        records: List[JobRecord] = []
        seen_titles: set = set()

        # Dùng tất cả keywords để lấy nhiều kết quả đa dạng hơn
        for keyword in industry.vnw_keywords:
            if len(records) >= limit:
                break

            url = f"{self.BASE_URL}/viec-lam?q={quote_plus(keyword)}&sort=latest"
            self.logger.info(f"[VNW] {industry.slug}/{keyword} → {url}")
            ok = await self._safe_goto(page, url)
            if not ok:
                continue

            await page.wait_for_timeout(1500)

            # ── Strategy 1: __NEXT_DATA__ embedded JSON ───────────────────────
            try:
                next_data_el = await page.query_selector("#__NEXT_DATA__")
                if next_data_el:
                    raw_json = await next_data_el.inner_text()
                    data = json.loads(raw_json)
                    jobs_data = (
                        data.get("props", {})
                        .get("pageProps", {})
                        .get("searchResult", {})
                        .get("data", {})
                        .get("data", [])
                    )
                    if jobs_data:
                        self.logger.info(f"[VNW] __NEXT_DATA__ found {len(jobs_data)} jobs for '{keyword}'")
                        for item in jobs_data[:limit * 2]:
                            rec = self._parse_vnw_json(industry, item)
                            if rec and rec.title not in seen_titles and len(records) < limit:
                                seen_titles.add(rec.title)
                                records.append(rec)
                        continue  # next keyword
            except Exception as e:
                self.logger.debug(f"[VNW] __NEXT_DATA__ parse failed: {e}")

            # ── Strategy 2: DOM scraping ──────────────────────────────────────
            cards = await page.query_selector_all(".view_job_item")
            self.logger.info(f"[VNW] DOM found {len(cards)} cards for '{keyword}'")

            for card in cards:
                if len(records) >= limit:
                    break
                rec = await self._parse_vnw_card(industry, page, card)
                if rec and rec.title not in seen_titles:
                    seen_titles.add(rec.title)
                    records.append(rec)

        return records

    def _parse_vnw_json(self, industry: IndustryGroup, item: Dict) -> Optional[JobRecord]:
        try:
            job_id = item.get("jobId") or item.get("id", "")
            title = item.get("jobTitle") or item.get("title", "")
            company = (item.get("company") or {}).get("name", "") or item.get("companyName", "")
            location = item.get("workingLocation", [{}])
            if isinstance(location, list) and location:
                location = location[0].get("cityName", "") if isinstance(location[0], dict) else str(location[0])
            else:
                location = str(location)
            salary = item.get("salary", "") or item.get("salaryDisplay", "")
            description = item.get("jobDescription", "") or item.get("description", "")
            job_url = f"{self.BASE_URL}/{item.get('alias', '')}-{job_id}-jv" if job_id else ""
            posted_raw = item.get("postedDate", "") or item.get("createdDate", "")
            deadline_raw = item.get("expiredDate", "") or item.get("applicationDeadline", "")

            return self._make_record(
                industry,
                title=title, company=company, location=location,
                salary=str(salary), description=description,
                job_url=job_url, posted_raw=str(posted_raw),
                deadline_raw=str(deadline_raw),
                raw_data={"source": "next_data", "item": item},
            )
        except Exception as e:
            self.logger.debug(f"[VNW] JSON parse error: {e}")
            return None

    async def _parse_vnw_card(
        self, industry: IndustryGroup, page: Any, card: Any
    ) -> Optional[JobRecord]:
        try:
            # Title
            h2 = await card.query_selector("h2")
            title = (await h2.inner_text()).strip() if h2 else ""

            # Company
            company = ""
            for a in await card.query_selector_all("a"):
                href = await a.get_attribute("href") or ""
                if "/nha-tuyen-dung/" in href or "/employer/" in href:
                    company = (await a.inner_text()).strip()
                    break

            # Job URL
            link = await card.query_selector("h2 a, a[href*='-jv']")
            job_url = ""
            if link:
                href = await link.get_attribute("href") or ""
                job_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

            # Salary
            sal_el = await card.query_selector("[class*='salary'], [class*='wage']")
            salary = (await sal_el.inner_text()).strip() if sal_el else ""

            # Location
            loc_el = await card.query_selector("[class*='location'], [class*='address']")
            location = (await loc_el.inner_text()).strip() if loc_el else ""

            # Posted date
            date_el = await card.query_selector("[class*='date'], time")
            posted_raw = (await date_el.inner_text()).strip() if date_el else ""

            # Experience / employment type from card text
            exp_el = await card.query_selector("[class*='experience'], [class*='level']")
            exp_raw = (await exp_el.inner_text()).strip() if exp_el else ""

            # Tạo description từ thông tin có sẵn
            desc_parts = []
            if company:
                desc_parts.append(f"Vị trí tại {company}.")
            if location:
                desc_parts.append(f"Địa điểm: {location}.")
            if salary and "thỏa thuận" not in salary.lower():
                desc_parts.append(f"Mức lương: {salary}.")
            if exp_raw:
                desc_parts.append(f"Yêu cầu: {exp_raw}.")
            desc_parts.append("Xem chi tiết và ứng tuyển trực tiếp trên VietnamWorks.")
            description = " ".join(desc_parts)

            return self._make_record(
                industry,
                title=title, company=company, location=location,
                salary=salary, job_url=job_url, posted_raw=posted_raw,
                description=description, experience_raw=exp_raw,
                raw_data={"source": "dom"},
            )
        except Exception as e:
            self.logger.debug(f"[VNW] card parse error: {e}")
            return None


# ── ITViec crawler ────────────────────────────────────────────────────────────

class ITViecCrawler(BaseCrawler):
    """Crawls ITViec — IT-focused job board."""
    source_site = "itviec"
    BASE_URL = "https://itviec.com"

    async def crawl_industry(
        self,
        industry: IndustryGroup,
        page: Any,
        limit: int = JOBS_PER_INDUSTRY,
    ) -> List[JobRecord]:
        records: List[JobRecord] = []

        # ITViec is IT-only — skip non-IT industries
        if industry.slug not in (
            "information-technology", "media-content", "retail-ecommerce",
            "finance-banking", "education-training",
        ):
            return records

        keyword = industry.itviec_keywords[0]
        url = f"{self.BASE_URL}/it-jobs/{quote_plus(keyword).replace('%20', '-')}"

        self.logger.info(f"[ITViec] {industry.slug} → {url}")
        ok = await self._safe_goto(page, url)
        if not ok:
            return records

        await page.wait_for_timeout(1800)

        cards = await page.query_selector_all(".job-card")
        self.logger.info(f"[ITViec] {len(cards)} cards")

        for card in cards:
            if len(records) >= limit:
                break
            rec = await self._parse_itv_card(industry, card)
            if rec:
                records.append(rec)

        return records

    async def _parse_itv_card(self, industry: IndustryGroup, card: Any) -> Optional[JobRecord]:
        try:
            h3 = await card.query_selector("h3")
            title = (await h3.inner_text()).strip() if h3 else ""

            company = ""
            for a in await card.query_selector_all("a"):
                href = await a.get_attribute("href") or ""
                if "/companies/" in href:
                    company = (await a.inner_text()).strip()
                    if company:
                        break

            # Skills from tags
            skills_text = ""
            tag_els = await card.query_selector_all("[class*='tag'], [class*='badge']")
            skill_list = []
            for t in tag_els[:8]:
                txt = (await t.inner_text()).strip()
                if txt and len(txt) < 40:
                    skill_list.append(txt)
            skills_text = " ".join(skill_list)

            # Posted
            posted_el = await card.query_selector(".small-text, [class*='date'], time")
            posted_raw = (await posted_el.inner_text()).strip() if posted_el else ""

            # Salary
            sal_el = await card.query_selector("[class*='salary']")
            sal_txt = (await sal_el.inner_text()).strip() if sal_el else ""
            salary = "" if not sal_txt or "sign in" in sal_txt.lower() else sal_txt

            # URL
            slug = await card.get_attribute("data-search--job-selection-job-slug-value") or ""
            job_url = f"{self.BASE_URL}/it-jobs/{slug}" if slug else ""

            rec = self._make_record(
                industry,
                title=title, company=company, location="Hồ Chí Minh / Hà Nội",
                salary=salary, job_url=job_url, posted_raw=posted_raw,
                skills_raw=skills_text,
                description=f"Yêu cầu kỹ năng: {', '.join(skill_list)}. Ứng tuyển trực tiếp trên ITViec." if skill_list else "Xem chi tiết và ứng tuyển trên ITViec.",
                raw_data={"source": "dom", "skills": skill_list},
            )
            if rec and skill_list:
                rec.skills = skill_list[:10]
            return rec
        except Exception as e:
            self.logger.debug(f"[ITViec] card error: {e}")
            return None


# ── TopCV crawler ─────────────────────────────────────────────────────────────

class TopCVCrawler(BaseCrawler):
    """Crawls TopCV — broad Vietnamese job board."""
    source_site = "topcv"
    BASE_URL = "https://www.topcv.vn"

    async def crawl_industry(
        self,
        industry: IndustryGroup,
        page: Any,
        limit: int = JOBS_PER_INDUSTRY,
    ) -> List[JobRecord]:
        records: List[JobRecord] = []
        keyword = industry.topcv_keywords[0]
        url = f"{self.BASE_URL}/tim-viec-lam-{quote_plus(keyword).replace('%20', '-')}-kw"

        self.logger.info(f"[TopCV] {industry.slug} → {url}")
        ok = await self._safe_goto(page, url)
        if not ok:
            return records

        await page.wait_for_timeout(2000)

        # TopCV uses data-job-id attributes
        cards = await page.query_selector_all("[data-job-id], .job-item-search-result, .job-item")
        self.logger.info(f"[TopCV] {len(cards)} cards")

        for card in cards:
            if len(records) >= limit:
                break
            rec = await self._parse_topcv_card(industry, card)
            if rec:
                records.append(rec)

        return records

    async def _parse_topcv_card(self, industry: IndustryGroup, card: Any) -> Optional[JobRecord]:
        try:
            # Title
            title_el = await card.query_selector("h3 a, h2 a, [class*='title'] a, a[class*='job']")
            title = (await title_el.inner_text()).strip() if title_el else ""
            job_url = ""
            if title_el:
                href = await title_el.get_attribute("href") or ""
                job_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

            # Company
            company_el = await card.query_selector("[class*='company'], [class*='employer']")
            company = (await company_el.inner_text()).strip() if company_el else ""

            # Location
            loc_el = await card.query_selector("[class*='location'], [class*='address'], [class*='city']")
            location = (await loc_el.inner_text()).strip() if loc_el else ""

            # Salary
            sal_el = await card.query_selector("[class*='salary'], [class*='wage']")
            salary = (await sal_el.inner_text()).strip() if sal_el else ""

            # Posted
            date_el = await card.query_selector("[class*='date'], time, [class*='time']")
            posted_raw = (await date_el.inner_text()).strip() if date_el else ""

            return self._make_record(
                industry,
                title=title, company=company, location=location,
                salary=salary, job_url=job_url, posted_raw=posted_raw,
                raw_data={"source": "dom"},
            )
        except Exception as e:
            self.logger.debug(f"[TopCV] card error: {e}")
            return None


# ── CareerViet crawler ────────────────────────────────────────────────────────

class CareerVietCrawler(BaseCrawler):
    """Crawls CareerViet."""
    source_site = "careerviet"
    BASE_URL = "https://careerviet.vn"

    async def crawl_industry(
        self,
        industry: IndustryGroup,
        page: Any,
        limit: int = JOBS_PER_INDUSTRY,
    ) -> List[JobRecord]:
        records: List[JobRecord] = []
        keyword = industry.careerviet_keywords[0]
        url = f"{self.BASE_URL}/viec-lam/{quote_plus(keyword).replace('%20', '-')}-vi.html"

        self.logger.info(f"[CareerViet] {industry.slug} → {url}")
        ok = await self._safe_goto(page, url)
        if not ok:
            return records

        await page.wait_for_timeout(2000)

        cards = await page.query_selector_all(".job-item, [class*='job-item'], .job-list-item")
        self.logger.info(f"[CareerViet] {len(cards)} cards")

        for card in cards:
            if len(records) >= limit:
                break
            rec = await self._parse_cv_card(industry, card)
            if rec:
                records.append(rec)

        return records

    async def _parse_cv_card(self, industry: IndustryGroup, card: Any) -> Optional[JobRecord]:
        try:
            title_el = await card.query_selector("h2 a, h3 a, [class*='title'] a")
            title = (await title_el.inner_text()).strip() if title_el else ""
            job_url = ""
            if title_el:
                href = await title_el.get_attribute("href") or ""
                job_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

            company_el = await card.query_selector("[class*='company'], [class*='employer']")
            company = (await company_el.inner_text()).strip() if company_el else ""

            loc_el = await card.query_selector("[class*='location'], [class*='city']")
            location = (await loc_el.inner_text()).strip() if loc_el else ""

            sal_el = await card.query_selector("[class*='salary']")
            salary = (await sal_el.inner_text()).strip() if sal_el else ""

            date_el = await card.query_selector("[class*='date'], time")
            posted_raw = (await date_el.inner_text()).strip() if date_el else ""

            return self._make_record(
                industry,
                title=title, company=company, location=location,
                salary=salary, job_url=job_url, posted_raw=posted_raw,
                raw_data={"source": "dom"},
            )
        except Exception as e:
            self.logger.debug(f"[CareerViet] card error: {e}")
            return None


# ── Crawler Engine ────────────────────────────────────────────────────────────

class CrawlerEngine:
    """
    Orchestrates all crawlers across all industry groups.

    Usage:
        engine = CrawlerEngine()
        results = await engine.run_full_crawl()
        # or
        results = await engine.run_industry(industry_slug="information-technology")
    """

    def __init__(self) -> None:
        self.crawlers: List[BaseCrawler] = [
            VietnamWorksCrawler(),
            ITViecCrawler(),
            TopCVCrawler(),
            CareerVietCrawler(),
        ]
        self.logger = logging.getLogger("crawler.engine")

    async def run_full_crawl(
        self,
        industries: Optional[List[IndustryGroup]] = None,
        sources: Optional[List[str]] = None,
    ) -> Dict[str, List[JobRecord]]:
        """
        Crawl all industry groups across all sources.
        Returns dict: industry_slug → list of JobRecord.
        """
        target_industries = industries or INDUSTRY_GROUPS
        target_crawlers = [
            c for c in self.crawlers
            if sources is None or c.source_site in sources
        ]

        results: Dict[str, List[JobRecord]] = {g.slug: [] for g in target_industries}

        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-blink-features=AutomationControlled",
                        "--disable-dev-shm-usage",
                    ],
                )

                for crawler in target_crawlers:
                    self.logger.info(f"[Engine] Starting {crawler.source_site}")
                    context = await browser.new_context(
                        user_agent=_random_ua(),
                        viewport={"width": 1280, "height": 800},
                        extra_http_headers={
                            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                        },
                    )
                    # Stealth: remove webdriver property
                    await context.add_init_script(
                        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
                    )

                    # Crawl each industry in parallel tabs (max 5 concurrent)
                    sem = asyncio.Semaphore(5)

                    async def crawl_one(industry: IndustryGroup) -> None:
                        async with sem:
                            page = await context.new_page()
                            try:
                                records = await crawler.crawl_industry(
                                    industry, page, limit=JOBS_PER_INDUSTRY
                                )
                                results[industry.slug].extend(records)
                                self.logger.info(
                                    f"[Engine] {crawler.source_site}/{industry.slug}: {len(records)} jobs"
                                )
                            except Exception as e:
                                self.logger.error(
                                    f"[Engine] {crawler.source_site}/{industry.slug} error: {e}"
                                )
                            finally:
                                await page.close()
                                await _random_delay(0.3, 0.8)

                    await asyncio.gather(*[crawl_one(ind) for ind in target_industries])
                    await context.close()

                await browser.close()

        except Exception as e:
            self.logger.error(f"[Engine] Fatal error: {e}")

        total = sum(len(v) for v in results.values())
        self.logger.info(f"[Engine] Crawl complete. Total jobs: {total}")
        return results

    async def run_industry(
        self,
        industry_slug: str,
        sources: Optional[List[str]] = None,
    ) -> List[JobRecord]:
        """Crawl a single industry group across all (or specified) sources."""
        from .constants import INDUSTRY_BY_SLUG
        industry = INDUSTRY_BY_SLUG.get(industry_slug)
        if not industry:
            raise ValueError(f"Unknown industry slug: {industry_slug}")

        results = await self.run_full_crawl(
            industries=[industry],
            sources=sources,
        )
        return results.get(industry_slug, [])
