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
# v1 (legacy)
CSV_RIASEC_V1 = Path("data/nlp/riasec_en_120.csv")
CSV_BIG5_V1   = Path("data/nlp/big5_en_100.csv")
CSV_ESSAY_V1  = Path("data/nlp/essay_en_5.csv")

# v2 — psychometric-grade, balanced, anti-bias
CSV_RIASEC_V2 = Path("data/nlp/riasec_vi_180.csv")
CSV_BIG5_V2   = Path("data/nlp/big5_vi_120.csv")
CSV_ESSAY_V2  = Path("data/nlp/essay_vi_50.csv")

# Active config — switch to v2 for production
CSV_RIASEC = CSV_RIASEC_V2
CSV_BIG5   = CSV_BIG5_V2
CSV_ESSAY  = CSV_ESSAY_V2

FORMS = [
    # v1 legacy (kept for backward compat)
    ("RIASEC120", "RIASEC Career Interest Test (120 items)", "RIASEC", "en", "1.0"),
    ("BIG5_100",  "Big Five Personality Test (100 items)",   "BigFive", "en", "1.0"),
    # v2 production — balanced, reverse-scored, anti-bias
    ("RIASEC180", "RIASEC Career Interest Test (180 items, balanced)", "RIASEC", "vi", "2.0"),
    ("BIG5_120",  "Big Five Personality Test (120 items, balanced)",   "BigFive", "vi", "2.0"),
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
    """
    Nạp essay prompts từ CSV vào core.essay_prompts.
    Hỗ trợ cả format cũ (id,title,prompt_text,lang) và format mới (title,prompt_text,lang).
    Dùng ON CONFLICT (title) DO NOTHING để idempotent — chạy nhiều lần không bị trùng.
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing essay file: {csv_path}")

    # Đảm bảo unique constraint tồn tại (chạy 1 lần, idempotent)
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'essay_prompts_title_key'
                  AND conrelid = 'core.essay_prompts'::regclass
            ) THEN
                ALTER TABLE core.essay_prompts ADD CONSTRAINT essay_prompts_title_key UNIQUE (title);
            END IF;
        END $$;
    """)

    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cnt = 0
        for r in reader:
            cur.execute(
                """
                INSERT INTO core.essay_prompts (title, prompt_text, lang)
                VALUES (%s, %s, %s)
                ON CONFLICT (title) DO NOTHING;
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
                    print(f"[WARN] Invalid JSON at {csv_path.name} line {r.get('question_no', '?')}: using default")
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
                ON CONFLICT (form_id, question_no) DO NOTHING;
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

    # ── Validation report ──────────────────────────────────────────
    cur.execute("""
        SELECT
            af.code,
            COUNT(aq.id)                                          AS total,
            SUM(CASE WHEN aq.reverse_score THEN 1 ELSE 0 END)    AS reverse_count,
            ROUND(
                100.0 * SUM(CASE WHEN aq.reverse_score THEN 1 ELSE 0 END) / COUNT(aq.id),
                1
            )                                                     AS reverse_pct
        FROM core.assessment_questions aq
        JOIN core.assessment_forms af ON af.id = aq.form_id
        GROUP BY af.code
        ORDER BY af.code;
    """)
    print("\n── Trait Balance Report ──────────────────────────────")
    print(f"{'Form':<12} {'Total':>6} {'Reverse':>8} {'Rev%':>6}")
    print("-" * 36)
    for row in cur.fetchall():
        print(f"{row[0]:<12} {row[1]:>6} {row[2]:>8} {row[3]:>5}%")
    print("─" * 36)
    print(f"  Target reverse ratio: RIASEC ~30%, BIG5 ~33%")
    print("──────────────────────────────────────────────────────\n")

    cur.close()
    conn.close()
    print(f"[DONE] Total inserted questions: {total}")


if __name__ == "__main__":
    main()
