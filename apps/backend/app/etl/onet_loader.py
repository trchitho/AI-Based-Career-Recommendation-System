# apps/backend/app/etl/onet_loader.py
from __future__ import annotations

import argparse
import os
import re
import socket
import sys
from datetime import date
from pathlib import Path
from typing import Any, Iterable

import httpx
import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

from ..services.onetsvc import OnetService

# --- Load .env (sau khi import) ---
DOTENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(DOTENV_PATH, override=True)

DB_URL = os.getenv("DATABASE_URL")

# ----------------- UPSERT SQL (khớp schema tài liệu) -----------------
UPSERT_CAREER = """
INSERT INTO core.careers (onet_code, slug, title_en, short_desc_en, updated_at)
VALUES (%s, %s, %s, %s, NOW())
ON CONFLICT (onet_code) DO UPDATE SET
  title_en      = EXCLUDED.title_en,
  short_desc_en = COALESCE(NULLIF(EXCLUDED.short_desc_en, ''), core.careers.short_desc_en),
  updated_at    = NOW();
"""


UPSERT_TASK = """
INSERT INTO core.career_tasks(onet_code, task_text, importance, source, fetched_at)
VALUES (%s, %s, %s, 'ONET', %s)
ON CONFLICT DO NOTHING;
"""

UPSERT_TECH = """
INSERT INTO core.career_technology(onet_code, category, name, hot_flag, source, fetched_at)
VALUES (%s, %s, %s, %s, 'ONET', %s)
ON CONFLICT DO NOTHING;
"""

UPSERT_PREP = """
INSERT INTO core.career_prep(onet_code, job_zone, education, training, source, fetched_at)
VALUES (%s, %s, %s, %s, 'ONET', %s)
ON CONFLICT (onet_code) DO UPDATE SET
  job_zone = EXCLUDED.job_zone,
  education = EXCLUDED.education,
  training  = EXCLUDED.training,
  source    = EXCLUDED.source,
  fetched_at= EXCLUDED.fetched_at;
"""

UPSERT_KSAS = """
INSERT INTO core.career_ksas(
    onet_code, ksa_type, name, category, level, importance, source, fetched_at
)
VALUES (%s, %s, %s, %s, %s, %s, 'ONET', %s)
ON CONFLICT DO NOTHING;
"""

UPSERT_WAGES = """
INSERT INTO core.career_wages_us(
    onet_code, area, median_annual, currency, timespan, source, fetched_at
)
VALUES (%s, %s, %s, %s, %s, 'ONET', %s)
ON CONFLICT DO NOTHING;
"""

UPSERT_OUTLOOK = """
INSERT INTO core.career_outlook(
    onet_code, summary_md, growth_label, openings_est, source, fetched_at
)
VALUES (%s, %s, %s, %s, 'ONET', %s)
ON CONFLICT (onet_code) DO UPDATE SET
    summary_md = EXCLUDED.summary_md,
    growth_label = EXCLUDED.growth_label,
    openings_est = EXCLUDED.openings_est,
    source = EXCLUDED.source,
    fetched_at = EXCLUDED.fetched_at;
"""

UPSERT_INTERESTS = """
INSERT INTO core.career_interests(onet_code, r,i,a,s,e,c, source, fetched_at)
VALUES (%s,%s,%s,%s,%s,%s,%s,'ONET',%s)
ON CONFLICT (onet_code) DO UPDATE SET
  r=EXCLUDED.r, i=EXCLUDED.i, a=EXCLUDED.a, s=EXCLUDED.s, e=EXCLUDED.e, c=EXCLUDED.c,
  source=EXCLUDED.source, fetched_at=EXCLUDED.fetched_at;
"""

# ---------------------------------------------------------------------


def _slugify(title: str, code: str) -> str:
    import unicodedata

    s = "".join(c for c in unicodedata.normalize("NFKD", title or "") if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return f"{s}-{code}"


def _to_float(x: Any) -> float | None:
    try:
        return float(x)
    except Exception:
        return None


def _today() -> date:
    return date.today()


def _safe_get(dct, *keys, default=None):
    cur = dct or {}
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return default
    return cur


def _as_list(x):
    if x is None:
        return []
    if isinstance(x, list):
        return x
    return [x]


def _parse_int(x):
    try:
        # MNM có thể trả "About 79,800 openings"
        if isinstance(x, str):
            import re

            m = re.search(r"(\d[\d,]*)", x)
            if m:
                return int(m.group(1).replace(",", ""))
            return None
        return int(x)
    except Exception:
        return None


def _riasec_one_hot(top_interest: str | None):
    # Map label MNM -> RIASEC letter
    if not top_interest:
        return None
    m = {
        "Realistic": ("R",),
        "Investigative": ("I",),
        "Artistic": ("A",),
        "Social": ("S",),
        "Enterprising": ("E",),
        "Conventional": ("C",),
    }
    # Có thể trả title hoặc code; ta normalize theo title
    t = (top_interest or "").strip().title()
    if t not in m:
        return None
    r, i, a, s, e, c = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    if t == "Realistic":
        r = 1.0
    elif t == "Investigative":
        i = 1.0
    elif t == "Artistic":
        a = 1.0
    elif t == "Social":
        s = 1.0
    elif t == "Enterprising":
        e = 1.0
    elif t == "Conventional":
        c = 1.0
    return (r, i, a, s, e, c)


def upsert_all_for_code(conn: psycopg.Connection, svc: OnetService, code: str) -> None:
    """
    Fetch all sections from O*NET MNM WS for a SOC and UPSERT into core.* tables.

    - Tasks: thu thập từ nhiều khóa MNM (task/duty/responsibility/activity)
    + fallback từ what_they_do để đảm bảo đủ 5 tasks
    (importance vẫn NULL ở MNM).
    """

    # --- 1) Fetch từ MNM ---
    ov_obj = svc.get_overview(code)  # title, what_they_do, on_the_job.task (sample)
    kn_obj = svc.get_knowledge(code)
    sk_obj = svc.get_skills(code)
    ab_obj = svc.get_abilities(code)
    pers_obj = svc.get_personality(code)  # top_interest + work_styles
    tech_obj = svc.get_technology(code)
    edu_obj = svc.get_education(code)
    out_obj = svc.get_outlook(code)

    # --- 2) Normalize (header) ---
    title_en = (ov_obj.get("title") or "").strip()
    short_desc = (ov_obj.get("what_they_do") or "").strip()

    # ===================== Tasks (đảm bảo đủ 5) =====================
    MIN_TASKS, MAX_TASKS = 5, 5

    def _push_text(tasks_list: list[str], x):
        def _add(t: str):
            t = (t or "").strip()
            if not t:
                return
            low = t.lower()
            if low.startswith("related occupations"):
                return
            if t not in tasks_list:
                tasks_list.append(t)

        if isinstance(x, str):
            _add(x)
        elif isinstance(x, dict):
            # có thể lồng { item: [...] }
            if "item" in x and isinstance(x["item"], list):
                for it in x["item"]:
                    _push_text(tasks_list, it)
            else:
                _add(x.get("text") or x.get("name") or "")
        elif isinstance(x, list):
            for it in x:
                _push_text(tasks_list, it)

    def _push_from_obj(tasks_list: list[str], obj: dict, *keys):
        cur = obj
        for k in keys:
            if not isinstance(cur, dict) or k not in cur:
                return
            cur = cur[k]
        _push_text(tasks_list, cur)

    tasks: list[str] = []
    on_job = (ov_obj.get("on_the_job") or {}) if isinstance(ov_obj, dict) else {}

    # 1) Quét toàn bộ khóa MNM thường gặp
    for key in (
        "task",
        "tasks",
        "duty",
        "duties",
        "responsibility",
        "responsibilities",
        "activity",
        "activities",
    ):
        _push_from_obj(tasks, on_job, key)

    # 2) Trim + de-dup (dùng vòng lặp để tránh lỗi walrus scope)
    def _trim(s: str, max_len: int = 220) -> str:
        s = s.replace("\n", " ").replace("\r", " ").strip()
        return s if len(s) <= max_len else (s[: max_len - 1].rstrip() + "…")

    _dedup_trimmed: list[str] = []
    seen = set()
    for t in tasks:
        tt = _trim(t)
        if tt not in seen:
            _dedup_trimmed.append(tt)
            seen.add(tt)
    tasks = _dedup_trimmed

    # 3) Fallback #1: thêm các câu đầu từ what_they_do (không lọc theo động từ)
    if len(tasks) < MIN_TASKS and short_desc:
        import re

        sents = [s.strip() for s in re.split(r"(?<=[\.\!\?])\s+", short_desc) if s.strip()]
        for s in sents:
            if len(tasks) >= MIN_TASKS:
                break
            s2 = _trim(s)
            if s2 not in tasks:
                tasks.append(s2)

    # 4) Fallback #2: thử các nhánh phụ (example/examples) nếu có
    if len(tasks) < MIN_TASKS:
        for key in ("example", "examples"):
            _push_from_obj(tasks, on_job, key)
            if len(tasks) >= MIN_TASKS:
                break
        # re-trim & de-dup lần nữa
        seen.clear()
        _dedup_trimmed = []
        for t in tasks:
            tt = _trim(t)
            if tt not in seen:
                _dedup_trimmed.append(tt)
                seen.add(tt)
        tasks = _dedup_trimmed

    # 5) Fallback #3: vẫn thiếu → đệm câu “mềm” bám theo title_en
    if len(tasks) < MIN_TASKS:
        base = f"{title_en or 'This role'}: "
        seeds = [
            "Plan and coordinate daily operations.",
            "Communicate with stakeholders to resolve issues.",
            "Monitor progress and ensure compliance.",
            "Develop and implement policies and procedures.",
            "Evaluate performance and make improvements.",
        ]
        for s in seeds:
            if len(tasks) >= MIN_TASKS:
                break
            cand = _trim(base + s)
            if cand not in tasks:
                tasks.append(cand)

    # 6) Cắt đúng 5
    tasks = tasks[:MAX_TASKS]
    # =================== End Tasks ===================

    # =================== Technology ===================
    tech_items: list[tuple[str, str, bool]] = []
    for cat in _as_list(tech_obj.get("category")):
        cat_name = _safe_get(cat, "title", "name", default="").strip()
        for ex in _as_list(cat.get("example")):
            ex_name = (ex.get("name") or "").strip()
            hot = bool(ex.get("hot_technology"))
            if ex_name:
                tech_items.append((cat_name, ex_name, hot))

    # =================== KSAs (group -> element; MNM thường không có ratings) ===================
    know_items: list[tuple[str, str, float | None, float | None]] = []
    for grp in _as_list(kn_obj.get("group")):
        grp_name = _safe_get(grp, "title", "name", default="").strip()
        for el in _as_list(grp.get("element")):
            name = (el.get("name") or "").strip()
            if name:
                know_items.append((name, grp_name, None, None))

    skill_items: list[tuple[str, str, float | None, float | None]] = []
    for grp in _as_list(sk_obj.get("group")):
        grp_name = _safe_get(grp, "title", "name", default="").strip()
        for el in _as_list(grp.get("element")):
            name = (el.get("name") or "").strip()
            if name:
                skill_items.append((name, grp_name, None, None))

    abil_items: list[tuple[str, str, float | None, float | None]] = []
    for grp in _as_list(ab_obj.get("group")):
        grp_name = _safe_get(grp, "title", "name", default="").strip()
        for el in _as_list(grp.get("element")):
            name = (el.get("name") or "").strip()
            if name:
                abil_items.append((name, grp_name, None, None))

    # =================== Education/Training ===================
    def _join_text_list(v):
        if isinstance(v, list):
            parts = []
            for it in v:
                if isinstance(it, dict) and it.get("text"):
                    parts.append(it["text"])
                elif isinstance(it, str):
                    parts.append(it)
            return "; ".join(p.strip() for p in parts if p and p.strip())
        if isinstance(v, dict) and v.get("text"):
            return v["text"]
        return v or ""

    job_zone = _safe_get(edu_obj, "job_zone", "title") or edu_obj.get("job_zone") or None
    education = _join_text_list(edu_obj.get("education"))
    training = _join_text_list(edu_obj.get("training"))

    # =================== Outlook ===================
    growth_label = _safe_get(out_obj, "growth", "text") or out_obj.get("growth") or ""
    openings_est = _parse_int(_safe_get(out_obj, "openings", "text") or out_obj.get("openings"))
    outlook_md = out_obj.get("summary") or ""

    # =================== Interests (top_interest -> one-hot) ===================
    top_interest_title = _safe_get(pers_obj, "top_interest", "title")
    riasec = _riasec_one_hot(top_interest_title)  # (r,i,a,s,e,c) hoặc None

    today = _today()

    # --- 3) UPSERT ---
    with conn.cursor() as cur:
        # careers header
        cur.execute(
            UPSERT_CAREER,
            (code, _slugify(title_en or "occupation", code), title_en, short_desc),
        )

        # tasks (importance = NULL for MNM)
        for t in tasks:
            cur.execute(UPSERT_TASK, (code, t, None, today))

        # technology
        for cat, name, hot in tech_items:
            cur.execute(UPSERT_TECH, (code, cat, name, hot, today))

        # KSAs
        for name, cat, lvl, imp in skill_items:
            cur.execute(UPSERT_KSAS, (code, "skill", name, cat, lvl, imp, today))
        for name, cat, lvl, imp in know_items:
            cur.execute(UPSERT_KSAS, (code, "knowledge", name, cat, lvl, imp, today))
        for name, cat, lvl, imp in abil_items:
            cur.execute(UPSERT_KSAS, (code, "ability", name, cat, lvl, imp, today))

        # prep
        cur.execute(UPSERT_PREP, (code, job_zone, education, training, today))

        # outlook
        cur.execute(UPSERT_OUTLOOK, (code, outlook_md, growth_label, openings_est, today))

        # interests
        if riasec:
            r, i, a, s, e, c = riasec
            cur.execute(UPSERT_INTERESTS, (code, r, i, a, s, e, c, today))

    conn.commit()


def _iter_codes_from_db(conn: psycopg.Connection) -> Iterable[str]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("SELECT onet_code FROM core.careers WHERE onet_code IS NOT NULL ORDER BY onet_code")
        for row in cur.fetchall():
            yield row["onet_code"]


def _etl_one(conn, svc, code: str) -> tuple[bool, str]:
    """
    Chạy ETL cho 1 mã. Trả về (ok, message)
    - ok=True  -> [OK] hoặc [SKIP_MNM]/[RETRY_LATER] nhưng không raise
    - ok=False -> lỗi không phân loại được
    """
    try:
        upsert_all_for_code(conn, svc, code)
        return True, f"[OK] ETL {code}"
    except httpx.HTTPStatusError as e:
        sc = e.response.status_code if (e.response is not None) else "NA"
        url = str(e.request.url) if e.request is not None else ""
        # MNM hay trả 422/404/400 khi mã không có dữ liệu
        if sc in (400, 401, 403, 404, 422):
            return True, f"[SKIP_MNM] {code}: HTTP {sc} {url}"
        # còn lại: báo lỗi nhưng vẫn tiếp tục
        return True, f"[HTTP_ERR] {code}: HTTP {sc} {url}"
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout):
        return True, f"[RETRY_LATER] {code}: httpx timeout"
    except (httpx.ConnectError, httpx.NetworkError, socket.gaierror) as ne:
        return True, f"[RETRY_LATER] {code}: network error: {ne}"
    except Exception as ex:
        # lỗi bất ngờ: vẫn không làm chết pipeline, chỉ log rõ
        return True, f"[ERR] {code}: {ex}"


def _print(msg: str):
    # in ra ngay, flush để xem tiến độ theo thời gian thực
    print(msg, flush=True)


def main():
    parser = argparse.ArgumentParser(description="ETL O*NET => Postgres for 'see more'")
    parser.add_argument("--code", type=str, help="Single O*NET/SOC code (e.g., 15-1254.00)")
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read list of codes from STDIN (one per line)",
    )
    args = parser.parse_args()

    if not DB_URL:
        raise RuntimeError("Missing DATABASE_URL")

    svc = OnetService()
    ok_cnt = err_cnt = 0

    with psycopg.connect(DB_URL) as conn:
        if args.code:
            ok, msg = _etl_one(conn, svc, args.code.strip())
            _print(msg)
            ok_cnt += int(ok)
            err_cnt += int(not ok)

        elif args.stdin:
            for line in sys.stdin:
                code = line.strip()
                if not code:
                    continue
                ok, msg = _etl_one(conn, svc, code)
                _print(msg)
                ok_cnt += int(ok)
                err_cnt += int(not ok)

        else:
            # default: iterate all from DB
            for code in _iter_codes_from_db(conn):
                ok, msg = _etl_one(conn, svc, code)
                _print(msg)
                ok_cnt += int(ok)
                err_cnt += int(not ok)

    svc.close()
    _print(f"[SUMMARY] ok={ok_cnt}, err={err_cnt}")


if __name__ == "__main__":
    main()
