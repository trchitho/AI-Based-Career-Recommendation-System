from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import psycopg2
import requests
from deep_translator import GoogleTranslator


DB_URL = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"
ROOT = Path(__file__).resolve().parents[1]
CACHE_FILE = ROOT / "scripts" / "cache_roadmap_milestones_vi.json"
REPORT_FILE = ROOT / "scripts" / "roadmap_milestones_vi_check_report.json"

TARGET_COLUMNS = [
    "id",
    "roadmap_id",
    "order_no",
    "skill_name_en",
    "skill_name_vn",
    "description_en",
    "description_vn",
    "estimated_duration_en",
    "estimated_duration_vn",
    "resources_json_en",
    "resources_json_vn",
    "level",
]

DURATION_VI = {
    "1 week": "1 tuần",
    "2 weeks": "2 tuần",
    "2-3 weeks": "2-3 tuần",
    "3 weeks": "3 tuần",
    "3-4 weeks": "3-4 tuần",
    "4 weeks": "4 tuần",
    "1 month": "1 tháng",
}

MANUAL_TERMS = {
    "Strategic leadership & vision": "Lãnh đạo chiến lược và tầm nhìn",
    "Financial & business acumen": "Năng lực tài chính và tư duy kinh doanh",
    "People & organization leadership": "Lãnh đạo con người và tổ chức",
    "Stakeholder communication & influence": "Giao tiếp và tạo ảnh hưởng với các bên liên quan",
    "Decision-making & risk management": "Ra quyết định và quản trị rủi ro",
    "Execution & change management": "Triển khai thực thi và quản trị thay đổi",
}

POST_REPLACEMENTS = {
    "KPI": "KPI",
    "KPIs": "KPI",
    "dashboard": "bảng điều khiển",
    "dashboards": "bảng điều khiển",
    "stakeholder": "bên liên quan",
    "stakeholders": "các bên liên quan",
    "leadership": "lãnh đạo",
    "management": "quản lý",
    "business": "kinh doanh",
    "financial": "tài chính",
    "risk": "rủi ro",
    "strategy": "chiến lược",
    "strategic": "chiến lược",
    "communication": "giao tiếp",
    "influence": "ảnh hưởng",
    "execution": "thực thi",
}

ALLOWED_ENGLISH_TERMS = {
    "API",
    "AI",
    "CEO",
    "CFO",
    "CIO",
    "CTO",
    "COO",
    "CHRO",
    "KPI",
    "ROI",
    "SQL",
    "HTML",
    "CSS",
    "JavaScript",
    "Python",
    "Microsoft",
    "Coursera",
    "edX",
    "Khan",
    "Academy",
    "LinkedIn",
    "Google",
    "AWS",
    "MIT",
    "OpenCourseWare",
}

ENGLISH_INDICATORS = {
    "the",
    "and",
    "or",
    "with",
    "without",
    "under",
    "within",
    "between",
    "from",
    "into",
    "your",
    "their",
    "teams",
    "team",
    "business",
    "management",
    "leadership",
    "strategy",
    "strategic",
    "financial",
    "finance",
    "communication",
    "stakeholder",
    "stakeholders",
    "execution",
    "change",
    "risk",
    "decision",
    "decisions",
    "course",
    "search",
    "learning",
    "resources",
    "fundamentals",
    "documentation",
    "operations",
    "quality",
    "compliance",
    "support",
    "service",
    "services",
    "development",
    "planning",
    "analysis",
    "analyze",
    "understand",
    "operate",
    "prepare",
    "maintain",
    "coordinate",
    "communicate",
}


def connect():
    return psycopg2.connect(DB_URL)


def load_cache() -> dict[str, str]:
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def normalize_text(text: str) -> str:
    text = "" if text is None else str(text)
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def postprocess_vi(text: str) -> str:
    text = normalize_text(text)
    for en, vi in POST_REPLACEMENTS.items():
        text = re.sub(rf"\b{re.escape(en)}\b", vi, text, flags=re.IGNORECASE)
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return text.strip()


def strip_markdown_artifacts(value: Any) -> str:
    text = unquote(normalize_text(value))
    text = re.sub(r"\]\(https?://[^)]*\)", "", text)
    text = re.sub(r"\[(https?://[^\]]+)\]", r"\1", text)
    text = text.replace("[", "").replace("]", "").replace("`", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def first_plain_url(value: Any) -> str:
    text = normalize_text(value)
    match = re.search(r"https?://[^\s\]\)\"'`]+", text)
    if not match:
        return text.strip("[]() ")
    return match.group(0).rstrip(".,;")


def clean_resource_for_storage(resource: dict[str, Any]) -> dict[str, Any]:
    item = dict(resource)
    if item.get("url"):
        item["url"] = first_plain_url(item["url"])
    if item.get("title"):
        item["title"] = strip_markdown_artifacts(item["title"])
    if item.get("cost_note_vi"):
        item["cost_note_vi"] = strip_markdown_artifacts(item["cost_note_vi"])
    return item


class Translator:
    def __init__(self, delay: float) -> None:
        self.delay = delay
        self.cache = load_cache()
        self.translator = GoogleTranslator(source="en", target="vi")

    def translate(self, text: str) -> str:
        text = normalize_text(text)
        if not text:
            return text
        if text in DURATION_VI:
            return DURATION_VI[text]
        if text in MANUAL_TERMS:
            return MANUAL_TERMS[text]
        if text in self.cache:
            return self.cache[text]
        translated = self.translate_with_retry(text)
        if not translated:
            raise RuntimeError(f"Google Translate returned empty result for: {text[:120]}")
        translated = postprocess_vi(translated)
        self.cache[text] = translated
        save_cache(self.cache)
        time.sleep(self.delay)
        return translated

    def translate_with_retry(self, text: str) -> str:
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                response = requests.get(
                    "https://translate.googleapis.com/translate_a/single",
                    params={
                        "client": "gtx",
                        "sl": "en",
                        "tl": "vi",
                        "dt": "t",
                        "q": text,
                    },
                    timeout=12,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                response.raise_for_status()
                payload = response.json()
                translated = "".join(part[0] for part in payload[0] if part and part[0])
                if translated:
                    return translated
            except Exception as exc:
                last_error = exc
                time.sleep(min(0.5 * attempt, 2.0))

        for attempt in range(1, 4):
            try:
                result = self.translator.translate(text)
                if result:
                    return result
            except Exception as exc:
                last_error = exc
                self.translator = GoogleTranslator(source="en", target="vi")
                time.sleep(self.delay * attempt + 0.5)

        raise RuntimeError(f"Google Translate failed after retries: {text[:160]} | last_error={last_error}")


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def get_columns(cur) -> list[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema='core' AND table_name='roadmap_milestones'
        ORDER BY ordinal_position
        """
    )
    return [row[0] for row in cur.fetchall()]


def create_backup(cur) -> str:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = f"roadmap_milestones_backup_vi_{stamp}"
    cur.execute(f'CREATE TABLE core.{quote_ident(backup)} AS TABLE core.roadmap_milestones')
    return f"core.{backup}"


def migrate_schema(cur) -> None:
    columns = get_columns(cur)
    if columns == TARGET_COLUMNS:
        print("[schema] already migrated")
        return

    if {"skill_name_en", "description_en", "estimated_duration_en", "resources_json_en"}.issubset(columns):
        raise RuntimeError("Table already has *_en columns but order/shape differs; inspect manually before recreating.")

    required_old = {"id", "roadmap_id", "order_no", "skill_name", "description", "estimated_duration", "resources_json", "level"}
    if not required_old.issubset(columns):
        raise RuntimeError(f"Unexpected source columns: {columns}")

    cur.execute("ALTER TABLE core.roadmap_milestones RENAME TO roadmap_milestones_old_pre_vi")
    cur.execute(
        """
        CREATE TABLE core.roadmap_milestones (
            id bigint NOT NULL DEFAULT nextval('core.roadmap_milestones_id_seq'::regclass),
            roadmap_id bigint NOT NULL,
            order_no integer,
            skill_name_en text,
            skill_name_vn text,
            description_en text,
            description_vn text,
            estimated_duration_en text,
            estimated_duration_vn text,
            resources_json_en jsonb,
            resources_json_vn jsonb,
            level integer DEFAULT 1
        )
        """
    )
    cur.execute(
        """
        INSERT INTO core.roadmap_milestones (
            id, roadmap_id, order_no,
            skill_name_en, description_en, estimated_duration_en, resources_json_en, level
        )
        SELECT id, roadmap_id, order_no, skill_name, description, estimated_duration, resources_json, level
        FROM core.roadmap_milestones_old_pre_vi
        ORDER BY id
        """
    )
    cur.execute("ALTER SEQUENCE core.roadmap_milestones_id_seq OWNED BY NONE")
    cur.execute("DROP TABLE core.roadmap_milestones_old_pre_vi")
    cur.execute("ALTER SEQUENCE core.roadmap_milestones_id_seq OWNED BY core.roadmap_milestones.id")
    cur.execute("ALTER TABLE core.roadmap_milestones ADD CONSTRAINT roadmap_milestones_pkey PRIMARY KEY (id)")
    cur.execute("CREATE INDEX idx_milestones_roadmap ON core.roadmap_milestones USING btree (roadmap_id)")
    cur.execute("CREATE INDEX idx_roadmap_milestones_level ON core.roadmap_milestones USING btree (level)")
    cur.execute("CREATE INDEX idx_roadmap_milestones_roadmap_level ON core.roadmap_milestones USING btree (roadmap_id, level)")
    cur.execute(
        "SELECT setval('core.roadmap_milestones_id_seq', COALESCE((SELECT MAX(id) FROM core.roadmap_milestones), 1), true)"
    )
    print("[schema] migrated with adjacent *_en/*_vn columns")


def clean_resources_json(resources: Any) -> list[dict[str, Any]]:
    if resources is None:
        return []
    if isinstance(resources, str):
        resources = json.loads(resources)
    if not isinstance(resources, list):
        raise ValueError("resources_json_en must be an array")
    return [clean_resource_for_storage(resource) for resource in resources]


def translate_resource_json(resources: Any, translator: Translator) -> Any:
    resources = clean_resources_json(resources)
    out = []
    for resource in resources:
        if not isinstance(resource, dict):
            raise ValueError("resource item must be an object")
        item = dict(resource)
        title = normalize_text(str(item.get("title") or ""))
        if title:
            item["title"] = translator.translate(title)
        note = normalize_text(str(item.get("cost_note_vi") or ""))
        if note:
            item["cost_note_vi"] = note
        if item.get("lang") == "en":
            item["lang"] = "vi"
        out.append(item)
    return out


def fetch_rows(cur, limit_roadmaps: int | None, only_missing: bool) -> list[dict[str, Any]]:
    where = []
    if only_missing:
        where.append(
            "(skill_name_vn IS NULL OR description_vn IS NULL OR estimated_duration_vn IS NULL OR resources_json_vn IS NULL)"
        )
    sql = """
        SELECT id, roadmap_id, order_no, skill_name_en, description_en, estimated_duration_en, resources_json_en
        FROM core.roadmap_milestones
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY roadmap_id, order_no, id"
    cur.execute(sql)
    rows = [
        {
            "id": r[0],
            "roadmap_id": r[1],
            "order_no": r[2],
            "skill_name_en": r[3],
            "description_en": r[4],
            "estimated_duration_en": r[5],
            "resources_json_en": r[6],
        }
        for r in cur.fetchall()
    ]
    if limit_roadmaps is None:
        return rows
    selected = []
    seen: list[int] = []
    for row in rows:
        rid = row["roadmap_id"]
        if rid not in seen:
            if len(seen) >= limit_roadmaps:
                break
            seen.append(rid)
        selected.append(row)
    return selected


def update_translations(cur, rows: list[dict[str, Any]], translator: Translator, commit_every: int) -> None:
    for idx, row in enumerate(rows, 1):
        skill_vn = translator.translate(row["skill_name_en"])
        desc_vn = translator.translate(row["description_en"])
        duration_vn = translator.translate(row["estimated_duration_en"])
        resources_vn = translate_resource_json(row["resources_json_en"], translator)
        resources_en = clean_resources_json(row["resources_json_en"])
        cur.execute(
            """
            UPDATE core.roadmap_milestones
            SET skill_name_vn=%s,
                description_vn=%s,
                estimated_duration_vn=%s,
                resources_json_en=%s::jsonb,
                resources_json_vn=%s::jsonb
            WHERE id=%s
            """,
            (
                skill_vn,
                desc_vn,
                duration_vn,
                json.dumps(resources_en, ensure_ascii=False),
                json.dumps(resources_vn, ensure_ascii=False),
                row["id"],
            ),
        )
        if idx % commit_every == 0:
            cur.connection.commit()
            print(f"[translate] committed {idx}/{len(rows)} rows")
    cur.connection.commit()
    print(f"[translate] committed {len(rows)}/{len(rows)} rows")


def suspicious_english_tokens(text: str) -> list[str]:
    text = normalize_text(text)
    if not text:
        return []
    tokens = re.findall(r"\b[A-Za-z][A-Za-z&+-]{2,}\b", text)
    bad = []
    for token in tokens:
        if token in ALLOWED_ENGLISH_TERMS or token.upper() in ALLOWED_ENGLISH_TERMS:
            continue
        lower = token.lower()
        if lower in ENGLISH_INDICATORS:
            bad.append(token)
    return sorted(set(bad))


def validate_rows(cur, limit_roadmaps: int | None) -> dict[str, Any]:
    rows = fetch_rows(cur, limit_roadmaps, only_missing=False)
    issues = []
    for row in rows:
        cur.execute(
            """
            SELECT skill_name_vn, description_vn, estimated_duration_vn, resources_json_vn
            FROM core.roadmap_milestones
            WHERE id=%s
            """,
            (row["id"],),
        )
        skill_vn, desc_vn, duration_vn, resources_vn = cur.fetchone()
        for field, value in [
            ("skill_name_vn", skill_vn),
            ("description_vn", desc_vn),
            ("estimated_duration_vn", duration_vn),
        ]:
            if not value:
                issues.append({"id": row["id"], "field": field, "issue": "missing"})
                continue
            bad = suspicious_english_tokens(value)
            if bad:
                issues.append({"id": row["id"], "field": field, "issue": "english_tokens", "tokens": bad, "value": value})
        if not isinstance(resources_vn, list):
            issues.append({"id": row["id"], "field": "resources_json_vn", "issue": "not_array"})
            continue
        for idx, item in enumerate(resources_vn):
            title = normalize_text(str(item.get("title") or ""))
            bad = suspicious_english_tokens(title)
            if bad:
                issues.append(
                    {
                        "id": row["id"],
                        "field": f"resources_json_vn[{idx}].title",
                        "issue": "english_tokens",
                        "tokens": bad,
                        "value": title,
                    }
                )
    report = {
        "checked_rows": len(rows),
        "issue_count": len(issues),
        "issues": issues[:200],
    }
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def print_sample(cur, limit: int = 10) -> None:
    cur.execute(
        """
        SELECT id, roadmap_id, order_no, skill_name_en, skill_name_vn, description_en, description_vn, estimated_duration_en, estimated_duration_vn
        FROM core.roadmap_milestones
        ORDER BY roadmap_id, order_no, id
        LIMIT %s
        """,
        (limit,),
    )
    for row in cur.fetchall():
        print(json.dumps(
            {
                "id": row[0],
                "roadmap_id": row[1],
                "order_no": row[2],
                "skill_name_en": row[3],
                "skill_name_vn": row[4],
                "description_en": row[5],
                "description_vn": row[6],
                "estimated_duration_en": row[7],
                "estimated_duration_vn": row[8],
            },
            ensure_ascii=False,
        ))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrate-schema", action="store_true")
    parser.add_argument("--backup", action="store_true")
    parser.add_argument("--limit-roadmaps", type=int, default=None)
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--only-missing", action="store_true")
    parser.add_argument("--delay", type=float, default=0.25)
    parser.add_argument("--commit-every", type=int, default=25)
    args = parser.parse_args()

    if args.full and args.limit_roadmaps is not None:
        parser.error("--full and --limit-roadmaps are mutually exclusive")

    conn = connect()
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            if args.backup:
                backup_name = create_backup(cur)
                conn.commit()
                print(f"[backup] {backup_name}")

            if args.migrate_schema:
                migrate_schema(cur)
                conn.commit()

            if args.check:
                report = validate_rows(cur, args.limit_roadmaps)
                print(json.dumps(report | {"report": str(REPORT_FILE)}, ensure_ascii=False, indent=2))
                return 1 if report["issue_count"] else 0

            if args.full or args.limit_roadmaps is not None:
                translator = Translator(args.delay)
                rows = fetch_rows(cur, None if args.full else args.limit_roadmaps, only_missing=args.only_missing)
                print(f"[translate] rows={len(rows)}")
                update_translations(cur, rows, translator, args.commit_every)
                report = validate_rows(cur, None if args.full else args.limit_roadmaps)
                print(json.dumps(report | {"report": str(REPORT_FILE)}, ensure_ascii=False, indent=2))
                print_sample(cur, 10)
                return 1 if report["issue_count"] else 0

            print("[noop] Use --backup, --migrate-schema, --limit-roadmaps, --full, or --check")
            return 0
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
