"""
Script import dữ liệu từ jobs-trends.csv vào bảng core.crawled_jobs (PostgreSQL).
Sử dụng psycopg2 + INSERT ... ON CONFLICT DO UPDATE để tránh trùng lặp.
"""
import csv
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values, Json

DB_URL = "host=localhost port=5433 dbname=career_ai user=postgres password=123456"
CSV_PATH = Path(__file__).resolve().parent.parent.parent / "jobs-trends.csv"

INSERT_SQL = """
INSERT INTO core.crawled_jobs (
    industry_group_id, industry_group_slug, source_site,
    title, company, location, salary, salary_min, salary_max,
    skills, experience_level, employment_type,
    description, requirements,
    posted_date, application_deadline,
    job_url, apply_url, content_hash,
    is_active, first_seen_at, last_seen_at, created_at, updated_at, raw_data
) VALUES %s
ON CONFLICT (job_url) DO UPDATE SET
    last_seen_at = EXCLUDED.last_seen_at,
    updated_at = NOW(),
    is_active = EXCLUDED.is_active
"""


def parse_ts(val: str):
    if not val or val.strip() == "":
        return None
    try:
        return datetime.fromisoformat(val.strip())
    except ValueError:
        return None


def parse_float(val: str):
    if not val or val.strip() == "":
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


def parse_bool(val: str):
    if not val:
        return True
    return val.strip().lower() in ("t", "true", "1", "yes")


def parse_skills(val: str):
    """Parse PostgreSQL array literal like {skill1,skill2} into Python list."""
    if not val or val.strip() in ("", "{}"):
        return []
    inner = val.strip().strip("{}")
    if not inner:
        return []
    skills = []
    current = ""
    in_quote = False
    for ch in inner:
        if ch == '"' or ch == "'":
            in_quote = not in_quote
        elif ch == "," and not in_quote:
            skills.append(current.strip().strip("'\""))
            current = ""
        else:
            current += ch
    if current.strip():
        skills.append(current.strip().strip("'\""))
    return [s for s in skills if s]


def parse_raw_data(val: str):
    if not val or val.strip() in ("", "{}"):
        return Json({})
    try:
        return Json(json.loads(val))
    except json.JSONDecodeError:
        fixed = val.replace("'", '"')
        try:
            return Json(json.loads(fixed))
        except json.JSONDecodeError:
            return Json({"_raw": val})


def make_hash(title: str, company: str, location: str) -> str:
    raw = f"{(title or '').strip().lower()}|{(company or '').strip().lower()}|{(location or '').strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main():
    if not CSV_PATH.exists():
        print(f"[ERROR] CSV not found: {CSV_PATH}")
        sys.exit(1)

    print(f"[INFO] Reading CSV: {CSV_PATH}")

    rows = []
    skipped = 0
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Fix content_hash: if invalid, recalculate
            content_hash = (row.get("content_hash") or "").strip()
            if len(content_hash) != 64:
                content_hash = make_hash(row["title"], row.get("company", ""), row.get("location", ""))

            # Validate job_url is present
            job_url = (row.get("job_url") or "").strip()
            if not job_url:
                skipped += 1
                continue

            rows.append((
                int(row["industry_group_id"]),
                row["industry_group_slug"],
                row["source_site"],
                row["title"][:500],
                (row.get("company") or None),
                (row.get("location") or None),
                (row.get("salary") or None),
                parse_float(row.get("salary_min", "")),
                parse_float(row.get("salary_max", "")),
                parse_skills(row.get("skills", "")),
                (row.get("experience_level") or None),
                (row.get("employment_type") or None),
                (row.get("description") or None),
                (row.get("requirements") or None),
                parse_ts(row.get("posted_date", "")),
                parse_ts(row.get("application_deadline", "")),
                job_url,
                (row.get("apply_url") or None),
                content_hash[:64],
                parse_bool(row.get("is_active", "t")),
                parse_ts(row.get("first_seen_at", "")),
                parse_ts(row.get("last_seen_at", "")),
                parse_ts(row.get("created_at", "")),
                parse_ts(row.get("updated_at", "")),
                parse_raw_data(row.get("raw_data", "")),
            ))

    print(f"[INFO] Parsed {len(rows)} records (skipped {skipped})")
    print(f"[INFO] Connecting to PostgreSQL...")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("CREATE SCHEMA IF NOT EXISTS core")

    TEMPLATE = """(
        %s, %s, %s,
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s,
        %s, %s,
        %s, %s,
        %s, %s, %s,
        %s, %s, %s, %s, %s, %s
    )"""

    batch_size = 100
    total_inserted = 0
    errors = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            execute_values(cur, INSERT_SQL, batch, template=TEMPLATE, page_size=batch_size)
            conn.commit()
            total_inserted += len(batch)
        except Exception as e:
            conn.rollback()
            # Insert one by one to skip bad rows
            for row in batch:
                try:
                    execute_values(cur, INSERT_SQL, [row], template=TEMPLATE, page_size=1)
                    conn.commit()
                    total_inserted += 1
                except Exception:
                    conn.rollback()
                    errors += 1
        print(f"  ... {total_inserted}/{len(rows)} imported ({errors} errors)")

    cur.close()
    conn.close()

    print(f"\n✅ Done! Imported {total_inserted} jobs into core.crawled_jobs ({errors} errors)")


if __name__ == "__main__":
    main()
