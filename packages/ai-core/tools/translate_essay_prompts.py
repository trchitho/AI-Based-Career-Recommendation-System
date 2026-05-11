"""
translate_essay_prompts.py
==========================
Dịch từng dòng title + prompt_text từ VI -> EN bằng Google Translate free.
Sau đó:
  1. Migrate schema: thêm cột title_vi, title_en, prompt_text_vi, prompt_text_en
  2. Điền data
  3. Drop cột cũ (title, prompt_text, lang)
  4. Lưu schema mới ra file db/essay_prompts.sql
"""
import psycopg2, time, json, os
from googletrans import Translator

DB  = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"
OUT_SQL = os.path.join(os.path.dirname(__file__), "../../../db/essay_prompts.sql")

translator = Translator()

def safe_translate(text: str, retries: int = 3) -> str:
    """Dịch 1 đoạn text, retry nếu lỗi."""
    for attempt in range(retries):
        try:
            result = translator.translate(text, src="vi", dest="en")
            return result.text
        except Exception as e:
            print(f"    [retry {attempt+1}] {e}")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Failed to translate after {retries} retries: {text[:50]}")


def main():
    conn = psycopg2.connect(DB)
    conn.autocommit = False
    cur = conn.cursor()

    # ── 1. Lấy toàn bộ data hiện tại ─────────────────────────────────────────
    cur.execute("SELECT id, title, prompt_text FROM core.essay_prompts ORDER BY id")
    rows = cur.fetchall()
    print(f"Found {len(rows)} rows to translate\n")

    # ── 2. Dịch từng dòng ────────────────────────────────────────────────────
    translations = {}  # {id: {title_en, prompt_text_en}}

    for idx, (rid, title_vi, prompt_vi) in enumerate(rows, 1):
        print(f"[{idx:02d}/50] id={rid}  title_vi={title_vi[:35]}")

        # Dịch title
        title_en = safe_translate(title_vi)
        print(f"         title_en={title_en}")
        time.sleep(0.4)

        # Dịch prompt_text
        prompt_en = safe_translate(prompt_vi)
        print(f"         prompt_en={prompt_en[:70]}...")
        time.sleep(0.4)

        translations[rid] = {
            "title_vi":       title_vi,
            "title_en":       title_en,
            "prompt_text_vi": prompt_vi,
            "prompt_text_en": prompt_en,
        }
        print()

    # Lưu JSON backup
    json_path = os.path.join(os.path.dirname(__file__), "essay_translations.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)
    print(f"Translations saved to {json_path}\n")

    # ── 3. Migrate schema ─────────────────────────────────────────────────────
    print("=== Migrating schema ===")

    # Thêm 4 cột mới (title_en title_vi sát nhau, prompt_text_en prompt_text_vi sát nhau)
    cur.execute("ALTER TABLE core.essay_prompts ADD COLUMN IF NOT EXISTS title_en       text")
    cur.execute("ALTER TABLE core.essay_prompts ADD COLUMN IF NOT EXISTS title_vi       text")
    cur.execute("ALTER TABLE core.essay_prompts ADD COLUMN IF NOT EXISTS prompt_text_en text")
    cur.execute("ALTER TABLE core.essay_prompts ADD COLUMN IF NOT EXISTS prompt_text_vi text")
    print("  Added columns: title_en, title_vi, prompt_text_en, prompt_text_vi")

    # ── 4. Điền data ──────────────────────────────────────────────────────────
    print("=== Filling data ===")
    for rid, t in translations.items():
        cur.execute("""
            UPDATE core.essay_prompts
            SET title_en       = %s,
                title_vi       = %s,
                prompt_text_en = %s,
                prompt_text_vi = %s
            WHERE id = %s
        """, (t["title_en"], t["title_vi"], t["prompt_text_en"], t["prompt_text_vi"], rid))

    # ── 5. Set NOT NULL sau khi điền xong ─────────────────────────────────────
    cur.execute("ALTER TABLE core.essay_prompts ALTER COLUMN title_en       SET NOT NULL")
    cur.execute("ALTER TABLE core.essay_prompts ALTER COLUMN title_vi       SET NOT NULL")
    cur.execute("ALTER TABLE core.essay_prompts ALTER COLUMN prompt_text_en SET NOT NULL")
    cur.execute("ALTER TABLE core.essay_prompts ALTER COLUMN prompt_text_vi SET NOT NULL")
    print("  NOT NULL constraints set")

    # ── 6. Drop cột cũ ────────────────────────────────────────────────────────
    cur.execute("ALTER TABLE core.essay_prompts DROP COLUMN IF EXISTS title")
    cur.execute("ALTER TABLE core.essay_prompts DROP COLUMN IF EXISTS prompt_text")
    cur.execute("ALTER TABLE core.essay_prompts DROP COLUMN IF EXISTS lang")
    print("  Dropped old columns: title, prompt_text, lang")

    conn.commit()
    print("  Committed.\n")

    # ── 7. Verify ─────────────────────────────────────────────────────────────
    print("=== Verification ===")
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema='core' AND table_name='essay_prompts'
        ORDER BY ordinal_position
    """)
    print("Columns:")
    for r in cur.fetchall():
        print(f"  {r[0]:25} {r[1]:30} nullable={r[2]}")

    cur.execute("SELECT COUNT(*) FROM core.essay_prompts")
    print(f"\nTotal rows: {cur.fetchone()[0]}")

    cur.execute("""
        SELECT COUNT(*) FROM core.essay_prompts
        WHERE title_en IS NULL OR title_vi IS NULL
           OR prompt_text_en IS NULL OR prompt_text_vi IS NULL
    """)
    nulls = cur.fetchone()[0]
    print(f"NULL values: {nulls} (expected 0)")

    cur.execute("SELECT id, title_en, title_vi FROM core.essay_prompts ORDER BY id LIMIT 3")
    print("\nSample rows:")
    for r in cur.fetchall():
        print(f"  id={r[0]}  en={r[1]}  vi={r[2]}")

    cur.execute("SELECT MIN(id), MAX(id) FROM core.essay_prompts")
    mn, mx = cur.fetchone()
    print(f"\nid range: {mn}-{mx} (expected 1-50)")

    # ── 8. Export schema SQL ──────────────────────────────────────────────────
    os.makedirs(os.path.dirname(os.path.abspath(OUT_SQL)), exist_ok=True)
    write_schema_sql(cur)

    cur.close()
    conn.close()
    print("\nDone.")


def write_schema_sql(cur):
    """Xuất file SQL schema mới."""
    # Lấy toàn bộ data để embed vào SQL
    cur.execute("""
        SELECT id, title_en, title_vi, prompt_text_en, prompt_text_vi, created_at
        FROM core.essay_prompts ORDER BY id
    """)
    data_rows = cur.fetchall()

    def esc(s):
        return s.replace("'", "''") if s else ""

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- Schema: core.essay_prompts (bilingual: VI + EN)")
    lines.append("-- Generated by translate_essay_prompts.py")
    lines.append("-- Columns: title_en, title_vi (adjacent) | prompt_text_en, prompt_text_vi (adjacent)")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("-- DROP TABLE IF EXISTS core.essay_prompts;")
    lines.append("")
    lines.append("CREATE TABLE IF NOT EXISTS core.essay_prompts")
    lines.append("(")
    lines.append("    id              bigint NOT NULL DEFAULT nextval('core.essay_prompts_id_seq'::regclass),")
    lines.append("    title_en        text   NOT NULL,")
    lines.append("    title_vi        text   NOT NULL,")
    lines.append("    prompt_text_en  text   NOT NULL,")
    lines.append("    prompt_text_vi  text   NOT NULL,")
    lines.append("    created_at      timestamp with time zone DEFAULT now(),")
    lines.append("    CONSTRAINT essay_prompts_pkey PRIMARY KEY (id)")
    lines.append(");")
    lines.append("")
    lines.append("ALTER TABLE IF EXISTS core.essay_prompts OWNER TO postgres;")
    lines.append("")
    lines.append("-- Unique constraint on Vietnamese title (natural key)")
    lines.append("ALTER TABLE core.essay_prompts")
    lines.append("    ADD CONSTRAINT IF NOT EXISTS essay_prompts_title_vi_key UNIQUE (title_vi);")
    lines.append("")
    lines.append("-- ── SEED DATA (50 rows) ──────────────────────────────────────────────────")
    lines.append("")
    lines.append("TRUNCATE core.essay_prompts RESTART IDENTITY CASCADE;")
    lines.append("")
    lines.append("INSERT INTO core.essay_prompts (title_en, title_vi, prompt_text_en, prompt_text_vi) VALUES")

    inserts = []
    for rid, ten, tvi, pen, pvi, cat in data_rows:
        inserts.append(
            f"  ('{esc(ten)}', '{esc(tvi)}', '{esc(pen)}', '{esc(pvi)}')"
        )
    lines.append(",\n".join(inserts) + ";")
    lines.append("")
    lines.append("-- ── NOTES FOR CODE MIGRATION ────────────────────────────────────────────")
    lines.append("-- Old columns removed: title, prompt_text, lang")
    lines.append("-- New columns: title_en, title_vi, prompt_text_en, prompt_text_vi")
    lines.append("-- Query pattern:")
    lines.append("--   SELECT title_vi, prompt_text_vi FROM core.essay_prompts  -- Vietnamese")
    lines.append("--   SELECT title_en, prompt_text_en FROM core.essay_prompts  -- English")
    lines.append("--   SELECT title_en, title_vi, prompt_text_en, prompt_text_vi FROM core.essay_prompts  -- Both")
    lines.append("-- API response should include both languages and let FE pick based on user locale.")

    sql_content = "\n".join(lines)
    abs_path = os.path.abspath(OUT_SQL)
    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"\nSchema SQL saved to: {abs_path}")


if __name__ == "__main__":
    main()
