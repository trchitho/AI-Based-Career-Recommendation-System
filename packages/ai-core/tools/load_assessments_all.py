# tools/load_assessments_all.py
# Seed forms (RIASEC120, BIG5_100) + essay_prompts + load questions từ CSV

import argparse
import csv
import json
import os
from pathlib import Path
from urllib.parse import quote

import psycopg2

# ---------- CONFIG ----------
CSV_RIASEC = Path("data/nlp/riasec_en_120.csv")
CSV_BIG5 = Path("data/nlp/big5_en_100.csv")
CSV_ESSAY = Path("data/nlp/essay_en_5.csv")

FORMS = [
    ("RIASEC120", "RIASEC Career Interest Test (120 items)", "RIASEC", "en", "1.0"),
    ("BIG5_100", "Big Five Personality Test (100 items)", "BigFive", "en", "1.0"),
]
# ----------------------------


def mask_url_password(url: str) -> str:
    try:
        if "://" in url and "@" in url and ":" in url.split("://", 1)[1]:
            head, tail = url.split("://", 1)
            creds, rest = tail.split("@", 1)
            if ":" in creds:
                user, _ = creds.split(":", 1)
                return f"{head}://{user}:***@{rest}"
    except Exception:
        pass
    return url


def resolve_db_url(cli_db: str | None) -> str:
    # Ưu tiên: --db > env:DATABASE_URL > PG* rời
    if cli_db and cli_db.strip():
        return cli_db.strip()
    env_url = os.getenv("DATABASE_URL", "").strip()
    if env_url:
        return env_url
    PGHOST = os.getenv("PGHOST", "localhost")
    PGPORT = os.getenv("PGPORT", "5433")
    PGDATABASE = os.getenv("PGDATABASE", "career_ai")
    PGUSER = os.getenv("PGUSER", "postgres")
    PGPASSWORD = os.getenv("PGPASSWORD", "postgres")
    # Password có ký tự đặc biệt cần URL-encode:
    enc_pwd = quote(PGPASSWORD, safe="")
    return f"postgresql://{PGUSER}:{enc_pwd}@{PGHOST}:{PGPORT}/{PGDATABASE}"


def upsert_forms(cur):
    for code, title, ftype, lang, ver in FORMS:
        cur.execute(
            """
            INSERT INTO core.assessment_forms (code, title, form_type, lang, version, created_at)
            VALUES (%s,%s,%s,%s,%s, NOW())
            ON CONFLICT (code) DO NOTHING;
        """,
            (code, title, ftype, lang, ver),
        )


def upsert_essay_prompts(cur, csv_path: Path):
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing essay file: {csv_path}")
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cnt = 0
        for r in reader:
            cur.execute(
                """
                INSERT INTO core.essay_prompts (title, prompt_text, lang)
                VALUES (%s,%s,%s)
                ON CONFLICT DO NOTHING;
            """,
                (r["title"].strip(), r["prompt_text"].strip(), r["lang"].strip()),
            )
            cnt += 1
    print(f"[OK] Seeded {cnt} essay prompts from {csv_path.name}")


def form_id_by_code(cur, code: str) -> int:
    cur.execute("SELECT id FROM core.assessment_forms WHERE code=%s", (code,))
    row = cur.fetchone()
    if not row:
        raise RuntimeError(f"Form '{code}' not found. Did you seed forms?")
    return row[0]


def load_questions(cur, csv_path: Path):
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cache = {}
        cnt = 0
        for r in reader:
            code = r["form_code"].strip()
            if code not in cache:
                cache[code] = form_id_by_code(cur, code)
            form_id = cache[code]

            raw_opt = r.get("options_json", "").strip()
            if not raw_opt:
                opt = {
                    "options": [
                        "Very Inaccurate",
                        "Moderately Inaccurate",
                        "Neither Accurate nor Inaccurate",
                        "Moderately Accurate",
                        "Very Accurate",
                    ],
                    "scale": "Likert-5",
                }
            else:
                try:
                    opt = json.loads(raw_opt)
                except json.JSONDecodeError:
                    print(
                        f"[WARN] Invalid JSON at {csv_path.name} line {r.get('question_no', '?')}: using default"
                    )
                    opt = {
                        "options": [
                            "Very Inaccurate",
                            "Moderately Inaccurate",
                            "Neither Accurate nor Inaccurate",
                            "Moderately Accurate",
                            "Very Accurate",
                        ],
                        "scale": "Likert-5",
                    }

            options_json = json.dumps(opt)
            reverse = str(r.get("reverse_score", "")).lower() in ("true", "1")

            cur.execute(
                """
                INSERT INTO core.assessment_questions
                    (form_id, question_no, question_key, prompt, options_json, reverse_score, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,NOW())
                ON CONFLICT DO NOTHING;
            """,
                (
                    form_id,
                    int(r["question_no"]),
                    r["question_key"].strip(),
                    r["prompt"].strip(),
                    options_json,
                    reverse,
                ),
            )
            cnt += 1
    return cnt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", help="Postgres URL (override env)")
    args = ap.parse_args()

    DB_URL = resolve_db_url(args.db)
    print(f"[INFO] Connecting to {mask_url_password(DB_URL)}")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Seed forms + essay prompts
    upsert_forms(cur)
    upsert_essay_prompts(cur, CSV_ESSAY)
    conn.commit()

    total = 0
    for csv_file in [CSV_RIASEC, CSV_BIG5]:
        if not csv_file.exists():
            raise FileNotFoundError(f"Missing {csv_file}")
        n = load_questions(cur, csv_file)
        conn.commit()
        print(f"[OK] Loaded {n} questions from {csv_file.name}")
        total += n

    cur.close()
    conn.close()
    print(f"[DONE] Total inserted questions: {total}")


if __name__ == "__main__":
    main()
