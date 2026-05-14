"""
Job Scraper - Playwright scraper cho VietnamWorks & ITViec.

Chiến lược 2 bước:
  1. Scrape list page → lấy title, company, URL (nhanh, song song)
  2. Scrape detail page → lấy description, apply URL (song song, giới hạn N jobs)

Đa ngành: IT, Marketing, Kế toán, Nhân sự, Y tế, Xây dựng, Giáo dục, Thiết kế, Logistics
"""
import asyncio
import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─── Category mapping ────────────────────────────────────────────────────────
CATEGORY_MAP = {
    "python": "IT & Phần mềm", "react": "IT & Phần mềm", "java": "IT & Phần mềm",
    "nodejs": "IT & Phần mềm", "devops": "IT & Phần mềm", "data": "IT & Phần mềm",
    "ai": "IT & Phần mềm", "software": "IT & Phần mềm", "developer": "IT & Phần mềm",
    "mobile": "IT & Phần mềm", "backend": "IT & Phần mềm", "frontend": "IT & Phần mềm",
    "marketing": "Kinh doanh & Tiếp thị", "sales": "Kinh doanh & Tiếp thị",
    "kinh doanh": "Kinh doanh & Tiếp thị", "digital marketing": "Kinh doanh & Tiếp thị",
    "kế toán": "Tài chính & Kế toán", "tài chính": "Tài chính & Kế toán",
    "kế toán trưởng": "Tài chính & Kế toán", "kiểm toán": "Tài chính & Kế toán",
    "nhân sự": "Nhân sự", "hr": "Nhân sự", "tuyển dụng": "Nhân sự",
    "thiết kế": "Thiết kế", "design": "Thiết kế", "ui ux": "Thiết kế",
    "y tế": "Y tế & Chăm sóc sức khỏe", "bác sĩ": "Y tế & Chăm sóc sức khỏe",
    "dược": "Y tế & Chăm sóc sức khỏe", "điều dưỡng": "Y tế & Chăm sóc sức khỏe",
    "xây dựng": "Kỹ thuật & Xây dựng", "kỹ sư": "Kỹ thuật & Xây dựng",
    "cơ khí": "Kỹ thuật & Xây dựng", "điện": "Kỹ thuật & Xây dựng",
    "giáo dục": "Giáo dục & Đào tạo", "giảng viên": "Giáo dục & Đào tạo",
    "giáo viên": "Giáo dục & Đào tạo",
    "logistics": "Vận tải & Logistics", "xuất nhập khẩu": "Vận tải & Logistics",
    "chuỗi cung ứng": "Vận tải & Logistics",
}

# Keywords đa ngành — đủ để cover nhiều nhóm ngành
VNW_KEYWORDS = [
    # IT
    "python", "react", "java",
    # Kinh doanh
    "marketing", "sales",
    # Tài chính
    "kế toán",
    # Nhân sự
    "nhân sự",
    # Y tế
    "bác sĩ",
    # Xây dựng
    "kỹ sư xây dựng",
    # Giáo dục
    "giáo viên",
    # Thiết kế
    "thiết kế đồ họa",
    # Logistics
    "logistics",
]

ITV_KEYWORDS = ["python", "react", "nodejs", "devops", "data-engineer", "mobile"]


def _guess_category(title: str, keyword: str = "") -> str:
    text = (title + " " + keyword).lower()
    for kw, cat in CATEGORY_MAP.items():
        if kw in text:
            return cat
    return "Khác"


def _parse_posted_time(text: str) -> str:
    if not text:
        return "Hôm nay"
    text = text.lower().strip()
    if any(x in text for x in ["hôm nay", "today", "just now"]):
        return "Hôm nay"
    m = re.search(r"(\d+)\s*(hour|giờ)", text)
    if m:
        return f"{m.group(1)} giờ trước"
    m = re.search(r"(\d+)\s*(day|ngày)", text)
    if m:
        return f"{m.group(1)} ngày trước"
    m = re.search(r"(\d+)\s*(week|tuần)", text)
    if m:
        return f"{int(m.group(1)) * 7} ngày trước"
    if "yesterday" in text or "hôm qua" in text:
        return "1 ngày trước"
    return text[:30]


def _clean_description(text: str) -> str:
    """Làm sạch description — bỏ whitespace thừa, giới hạn độ dài."""
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:600]


# ─── VietnamWorks ─────────────────────────────────────────────────────────────

async def _vnw_list_page(page: Any, keyword: str) -> List[Dict]:
    """Scrape list page VNW → trả về basic job info + URL."""
    jobs = []
    try:
        url = f"https://www.vietnamworks.com/viec-lam?q={keyword.replace(' ', '+')}&sort=latest"
        await page.goto(url, timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        cards = await page.query_selector_all(".view_job_item")
        logger.info(f"[VNW] '{keyword}': {len(cards)} cards")

        for card in cards:
            try:
                h2 = await card.query_selector("h2")
                title = (await h2.inner_text()).strip() if h2 else ""
                title = re.sub(r"^(Mới|Hot|Urgent)\s+", "", title, flags=re.IGNORECASE).strip()
                if not title:
                    continue

                # Company
                company = ""
                for a in await card.query_selector_all("a"):
                    href = await a.get_attribute("href") or ""
                    if "/nha-tuyen-dung/" in href or "/employer/" in href:
                        company = (await a.inner_text()).strip() or await a.get_attribute("title") or ""
                        break

                # Job URL
                link_el = await card.query_selector("h2 a, a[href*='-jv']")
                job_url = ""
                if link_el:
                    href = await link_el.get_attribute("href") or ""
                    # Strip query params để URL sạch hơn
                    href = href.split("?")[0]
                    job_url = href if href.startswith("http") else f"https://www.vietnamworks.com{href}"

                # Salary
                sal_el = await card.query_selector("[class*='salary'], [class*='wage']")
                salary = (await sal_el.inner_text()).strip() if sal_el else "Thỏa thuận"

                # Location
                loc_el = await card.query_selector("[class*='location'], [class*='address']")
                location = ((await loc_el.inner_text()).strip().split("\n")[0]) if loc_el else "Việt Nam"

                # Posted
                date_el = await card.query_selector("[class*='date'], time, [class*='posted']")
                posted = _parse_posted_time((await date_el.inner_text()).strip() if date_el else "")

                jobs.append({
                    "title": title,
                    "company": company or "Công ty",
                    "location": location or "Việt Nam",
                    "salary": salary,
                    "posted": posted,
                    "category": _guess_category(title, keyword),
                    "skills": [keyword.title()],
                    "source": "vietnamworks",
                    "url": job_url,
                    "description": "",
                    "apply_url": job_url,
                    "keyword": keyword,
                })
            except Exception as e:
                logger.debug(f"[VNW] card error: {e}")
    except Exception as e:
        logger.warning(f"[VNW] list page error '{keyword}': {e}")
    return jobs


async def _vnw_detail_page(page: Any, job: Dict) -> Dict:
    """Scrape detail page VNW → thêm description vào job dict."""
    if not job.get("url"):
        return job
    try:
        await page.goto(job["url"], timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)  # Cần đủ thời gian để JS render

        # Lấy description từ các đoạn text dài trong HTML
        html = await page.content()
        # Tìm các đoạn text dài (>80 chars) — đây là description
        raw_texts = re.findall(r'>([^<\n]{80,400})<', html)
        desc_lines = []
        seen_lines = set()
        for t in raw_texts:
            t = t.strip()
            # Bỏ các dòng là navigation/footer
            if any(skip in t.lower() for skip in ["copyright", "navigos", "tầng", "đoàn văn bơ",
                                                    "tìm việc", "đăng nhập", "đăng ký", "cookie"]):
                continue
            if t not in seen_lines and len(t) > 40:
                seen_lines.add(t)
                desc_lines.append(t)
            if len(desc_lines) >= 6:
                break

        if desc_lines:
            job["description"] = _clean_description(" • ".join(desc_lines[:4]))

        # Apply URL — dùng URL job trực tiếp (VNW redirect đến form apply)
        job["apply_url"] = job["url"]

    except Exception as e:
        logger.debug(f"[VNW] detail error for '{job.get('title', '')}': {e}")
    return job


# ─── ITViec ───────────────────────────────────────────────────────────────────

async def _itv_list_page(page: Any, keyword: str) -> List[Dict]:
    """Scrape list page ITViec."""
    jobs = []
    try:
        url = f"https://itviec.com/it-jobs/{keyword.replace(' ', '-')}"
        await page.goto(url, timeout=20000, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        cards = await page.query_selector_all(".job-card")
        logger.info(f"[ITViec] '{keyword}': {len(cards)} cards")

        for card in cards:
            try:
                h3 = await card.query_selector("h3")
                title = (await h3.inner_text()).strip() if h3 else ""
                if not title:
                    continue

                # Company
                company = ""
                for a in await card.query_selector_all("a"):
                    href = await a.get_attribute("href") or ""
                    if "/companies/" in href:
                        company = (await a.inner_text()).strip()
                        if company:
                            break

                # Skills
                skills = []
                for t in await card.query_selector_all("[class*='tag'], [class*='badge']"):
                    txt = (await t.inner_text()).strip()
                    if txt and len(txt) < 40:
                        skills.append(txt)

                # Posted
                posted_el = await card.query_selector(".small-text, [class*='date'], time")
                posted = _parse_posted_time((await posted_el.inner_text()).strip() if posted_el else "")

                # Salary
                sal_el = await card.query_selector("[class*='salary']")
                sal_txt = (await sal_el.inner_text()).strip() if sal_el else ""
                salary = "Thỏa thuận" if not sal_txt or "sign in" in sal_txt.lower() else sal_txt

                # URL
                slug = await card.get_attribute("data-search--job-selection-job-slug-value") or ""
                job_url = f"https://itviec.com/it-jobs/{slug}" if slug else ""

                jobs.append({
                    "title": title,
                    "company": company or "Công ty IT",
                    "location": "Hồ Chí Minh / Hà Nội",
                    "salary": salary,
                    "posted": posted,
                    "category": "IT & Phần mềm",
                    "skills": skills[:5] if skills else [keyword.title()],
                    "source": "itviec",
                    "url": job_url,
                    "description": "",
                    "apply_url": job_url,
                    "keyword": keyword,
                })
            except Exception as e:
                logger.debug(f"[ITViec] card error: {e}")
    except Exception as e:
        logger.warning(f"[ITViec] list page error '{keyword}': {e}")
    return jobs


# ─── Main scrape functions ────────────────────────────────────────────────────

async def scrape_vietnamworks(keywords: List[str] = None, max_jobs: int = 50) -> List[Dict[str, Any]]:
    """
    Scrape VietnamWorks:
    - Bước 1: Song song scrape list pages (tất cả keywords cùng lúc)
    - Bước 2: Song song scrape detail pages (lấy description, giới hạn max_detail)
    """
    from playwright.async_api import async_playwright

    if keywords is None:
        keywords = VNW_KEYWORDS

    all_jobs: List[Dict] = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
            )

            # ── Bước 1: List pages song song ──
            async def list_keyword(kw: str) -> List[Dict]:
                page = await context.new_page()
                try:
                    return await _vnw_list_page(page, kw)
                finally:
                    await page.close()

            list_results = await asyncio.gather(
                *[list_keyword(kw) for kw in keywords],
                return_exceptions=True
            )

            # Gộp + dedup theo title
            seen_titles: set = set()
            for r in list_results:
                if isinstance(r, list):
                    for job in r:
                        if job["title"] not in seen_titles:
                            seen_titles.add(job["title"])
                            all_jobs.append(job)

            all_jobs = all_jobs[:max_jobs]
            logger.info(f"[VNW] List phase: {len(all_jobs)} unique jobs")

            # ── Bước 2: Detail pages song song (giới hạn 20 để không quá chậm) ──
            detail_limit = min(20, len(all_jobs))
            jobs_for_detail = all_jobs[:detail_limit]

            async def fetch_detail(job: Dict) -> Dict:
                page = await context.new_page()
                try:
                    return await _vnw_detail_page(page, job)
                finally:
                    await page.close()

            detailed = await asyncio.gather(
                *[fetch_detail(job) for job in jobs_for_detail],
                return_exceptions=True
            )

            for i, r in enumerate(detailed):
                if isinstance(r, dict):
                    all_jobs[i] = r

            logger.info(f"[VNW] Detail phase done for {detail_limit} jobs")
            await browser.close()

    except Exception as e:
        logger.error(f"[VNW] Playwright error: {e}")

    logger.info(f"[VNW] Total: {len(all_jobs)} jobs")
    return all_jobs


async def scrape_itviec(keywords: List[str] = None, max_jobs: int = 40) -> List[Dict[str, Any]]:
    """
    Scrape ITViec — list pages song song.
    ITViec bị Cloudflare block detail pages nên chỉ lấy từ list.
    """
    from playwright.async_api import async_playwright

    if keywords is None:
        keywords = ITV_KEYWORDS

    all_jobs: List[Dict] = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
            )

            async def list_keyword(kw: str) -> List[Dict]:
                page = await context.new_page()
                try:
                    return await _itv_list_page(page, kw)
                finally:
                    await page.close()

            results = await asyncio.gather(
                *[list_keyword(kw) for kw in keywords],
                return_exceptions=True
            )

            seen_titles: set = set()
            for r in results:
                if isinstance(r, list):
                    for job in r:
                        if job["title"] not in seen_titles:
                            seen_titles.add(job["title"])
                            # ITViec: dùng skills làm description
                            if job["skills"]:
                                job["description"] = f"Yêu cầu kỹ năng: {', '.join(job['skills'])}. Xem chi tiết và ứng tuyển tại ITViec."
                            all_jobs.append(job)

            await browser.close()

    except Exception as e:
        logger.error(f"[ITViec] Playwright error: {e}")

    logger.info(f"[ITViec] Total: {len(all_jobs)} jobs")
    return all_jobs[:max_jobs]


async def scrape_all_sources(max_total: int = 80) -> List[Dict[str, Any]]:
    """Scrape VietnamWorks + ITViec song song."""
    vnw_task = scrape_vietnamworks(VNW_KEYWORDS, max_jobs=max_total // 2)
    itv_task = scrape_itviec(ITV_KEYWORDS, max_jobs=max_total // 2)

    results = await asyncio.gather(vnw_task, itv_task, return_exceptions=True)

    all_jobs: List[Dict[str, Any]] = []
    for r in results:
        if isinstance(r, list):
            all_jobs.extend(r)
        else:
            logger.warning(f"Source error: {r}")

    logger.info(f"Total scraped: {len(all_jobs)} jobs")
    return all_jobs
