"""
translate_assessment_questions.py
==================================
Dịch cột prompt (EN) -> prompt_vi (VI) cho 528 câu hỏi assessment.
Schema mới: prompt_en (giữ nguyên) + prompt_vi (dịch mới), đứng sát nhau.
options_json cũng cần dịch phần options array.

Chạy: python tools/translate_assessment_questions.py
"""
import psycopg2, json, time, os
from googletrans import Translator

DB  = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"
OUT_SQL = os.path.normpath(os.path.join(
    os.path.dirname(__file__), "../../../db/assessment_questions.sql"
))

translator = Translator()

# Options chuẩn — dịch 1 lần, không cần gọi API lặp lại
RIASEC_OPTIONS_VI = ["Rất không thích", "Không thích", "Không chắc", "Thích", "Rất thích"]
BIG5_OPTIONS_VI   = ["Rất không chính xác", "Không chính xác", "Không chắc chắn", "Chính xác", "Rất chính xác"]

def safe_translate(text: str, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            result = translator.translate(text.strip(), src="en", dest="vi")
            return result.text
        except Exception as e:
            print(f"    [retry {attempt+1}] {e}")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Failed after {retries} retries: {text[:60]}")


def translate_options(options_json: dict, scale: str) -> list:
    """Trả về options VI dựa trên scale — không cần gọi API."""
    if scale == "RIASEC":
        return RIASEC_OPTIONS_VI
    else:  # BigFive
        return BIG5_OPTIONS_VI


def main():
    conn = psycopg2.connect(DB)
    conn.autocommit = False
    cur = conn.cursor()

    # ── 1. Lấy toàn bộ data ──────────────────────────────────────────────────
    cur.execute("""
        SELECT id, prompt, options_json
        FROM core.assessment_questions
        ORDER BY id
    """)
    rows = cur.fetchall()
    total = len(rows)
    print(f"Found {total} rows to translate\n")

    # ── 2. Dịch từng prompt ───────────────────────────────────────────────────
    translations = {}  # {id: {prompt_vi, options_vi}}

    for idx, (rid, prompt_en, opts_json) in enumerate(rows, 1):
        # Dịch prompt
        prompt_vi = safe_translate(prompt_en)
        time.sleep(0.35)

        # Lấy options VI (không cần gọi API)
        scale = opts_json.get("scale", "RIASEC") if isinstance(opts_json, dict) else "RIASEC"
        options_vi = translate_options(opts_json, scale)

        translations[rid] = {
            "prompt_en": prompt_en,
            "prompt_vi": prompt_vi,
            "options_vi": options_vi,
            "scale": scale,
        }

        print(f"[{idx:03d}/{total}] id={rid:3d}  EN: {prompt_en[:45]:45}  VI: {prompt_vi[:45]}")

    # Lưu JSON backup translations
    json_path = os.path.join(os.path.dirname(__file__), "assessment_q_translations.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)
    print(f"\nTranslations saved to {json_path}\n")

    # ── 3. Migrate schema ─────────────────────────────────────────────────────
    print("=== Migrating schema ===")

    # Drop constraints tạm để alter
    cur.execute("ALTER TABLE core.assessment_questions DROP CONSTRAINT IF EXISTS uq_assessment_questions_form_no")
    cur.execute("ALTER TABLE core.assessment_questions DROP CONSTRAINT IF EXISTS assessment_questions_form_id_fkey")

    # Thêm cột mới: prompt_en (copy từ prompt), prompt_vi (dịch)
    cur.execute("ALTER TABLE core.assessment_questions ADD COLUMN IF NOT EXISTS prompt_en text")
    cur.execute("ALTER TABLE core.assessment_questions ADD COLUMN IF NOT EXISTS prompt_vi text")
    print("  Added columns: prompt_en, prompt_vi")

    # ── 4. Điền data ──────────────────────────────────────────────────────────
    print("=== Filling data ===")
    for rid, t in translations.items():
        # Cập nhật options_json: thêm options_vi
        cur.execute("SELECT options_json FROM core.assessment_questions WHERE id=%s", (rid,))
        row = cur.fetchone()
        if row:
            old_opts = row[0] if isinstance(row[0], dict) else {}
            new_opts = {**old_opts, "options_vi": t["options_vi"]}
            cur.execute("""
                UPDATE core.assessment_questions
                SET prompt_en   = %s,
                    prompt_vi   = %s,
                    options_json = %s
                WHERE id = %s
            """, (t["prompt_en"], t["prompt_vi"], json.dumps(new_opts), rid))

    # ── 5. NOT NULL sau khi điền ──────────────────────────────────────────────
    cur.execute("ALTER TABLE core.assessment_questions ALTER COLUMN prompt_en SET NOT NULL")
    cur.execute("ALTER TABLE core.assessment_questions ALTER COLUMN prompt_vi SET NOT NULL")
    print("  NOT NULL set on prompt_en, prompt_vi")

    # ── 6. Drop cột cũ ────────────────────────────────────────────────────────
    cur.execute("ALTER TABLE core.assessment_questions DROP COLUMN IF EXISTS prompt")
    print("  Dropped old column: prompt")

    # ── 7. Recreate constraints ───────────────────────────────────────────────
    cur.execute("""
        ALTER TABLE core.assessment_questions
        ADD CONSTRAINT uq_assessment_questions_form_no UNIQUE (form_id, question_no)
    """)
    cur.execute("""
        ALTER TABLE core.assessment_questions
        ADD CONSTRAINT assessment_questions_form_id_fkey
        FOREIGN KEY (form_id) REFERENCES core.assessment_forms(id)
        ON UPDATE NO ACTION ON DELETE CASCADE
    """)
    print("  Constraints recreated")

    conn.commit()
    print("  Committed.\n")

    # ── 8. Verify ─────────────────────────────────────────────────────────────
    print("=== Verification ===")
    cur.execute("""
        SELECT column_name, ordinal_position, is_nullable
        FROM information_schema.columns
        WHERE table_schema='core' AND table_name='assessment_questions'
        ORDER BY ordinal_position
    """)
    print("Columns:")
    for r in cur.fetchall():
        print(f"  pos={r[1]}  {r[0]:25}  nullable={r[2]}")

    cur.execute("SELECT COUNT(*) FROM core.assessment_questions")
    print(f"\nTotal rows: {cur.fetchone()[0]}")

    cur.execute("""
        SELECT COUNT(*) FROM core.assessment_questions
        WHERE prompt_en IS NULL OR prompt_vi IS NULL
    """)
    print(f"NULLs: {cur.fetchone()[0]} (expected 0)")

    cur.execute("""
        SELECT id, question_key, prompt_en, prompt_vi
        FROM core.assessment_questions ORDER BY id LIMIT 5
    """)
    print("\nSample:")
    for r in cur.fetchall():
        print(f"  id={r[0]:3d}  key={r[1]:4s}  EN: {r[2][:40]:40}  VI: {r[3][:40]}")

    # ── 9. Export SQL schema ──────────────────────────────────────────────────
    write_schema_sql(cur)

    cur.close()
    conn.close()
    print("\nDone.")


def write_schema_sql(cur):
    cur.execute("""
        SELECT id, form_id, question_no, question_key,
               prompt_en, prompt_vi, options_json, reverse_score
        FROM core.assessment_questions ORDER BY id
    """)
    data_rows = cur.fetchall()

    def esc(s):
        return (s or "").replace("'", "''")

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- Schema: core.assessment_questions (bilingual: EN + VI)")
    lines.append("-- Generated by translate_assessment_questions.py")
    lines.append("-- Columns: prompt_en, prompt_vi (adjacent)")
    lines.append("-- options_json: added 'options_vi' key alongside 'options' (EN)")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("CREATE TABLE IF NOT EXISTS core.assessment_questions")
    lines.append("(")
    lines.append("    id           bigint  NOT NULL DEFAULT nextval('core.assessment_questions_id_seq'::regclass),")
    lines.append("    form_id      bigint,")
    lines.append("    question_no  integer,")
    lines.append("    question_key text,")
    lines.append("    prompt_en    text    NOT NULL,")
    lines.append("    prompt_vi    text    NOT NULL,")
    lines.append("    options_json jsonb,")
    lines.append("    reverse_score boolean DEFAULT false,")
    lines.append("    created_at   timestamp with time zone DEFAULT now(),")
    lines.append("    CONSTRAINT assessment_questions_pkey PRIMARY KEY (id),")
    lines.append("    CONSTRAINT uq_assessment_questions_form_no UNIQUE (form_id, question_no),")
    lines.append("    CONSTRAINT assessment_questions_form_id_fkey")
    lines.append("        FOREIGN KEY (form_id) REFERENCES core.assessment_forms(id)")
    lines.append("        ON UPDATE NO ACTION ON DELETE CASCADE")
    lines.append(");")
    lines.append("")
    lines.append("-- ── NOTES FOR CODE MIGRATION ────────────────────────────────────────────")
    lines.append("-- Old column removed: prompt")
    lines.append("-- New columns: prompt_en (original EN), prompt_vi (translated VI)")
    lines.append("-- options_json now has both 'options' (EN) and 'options_vi' (VI)")
    lines.append("-- Query pattern:")
    lines.append("--   SELECT prompt_en FROM core.assessment_questions  -- English")
    lines.append("--   SELECT prompt_vi FROM core.assessment_questions  -- Vietnamese")
    lines.append("--   to_client() should return prompt based on user lang preference")
    lines.append("")
    lines.append("-- ── SEED DATA ────────────────────────────────────────────────────────────")
    lines.append("")
    lines.append("TRUNCATE core.assessment_questions RESTART IDENTITY CASCADE;")
    lines.append("")
    lines.append("INSERT INTO core.assessment_questions")
    lines.append("    (form_id, question_no, question_key, prompt_en, prompt_vi, options_json, reverse_score)")
    lines.append("VALUES")

    inserts = []
    for rid, fid, qno, qkey, pen, pvi, opts, rev in data_rows:
        opts_str = json.dumps(opts, ensure_ascii=False).replace("'", "''") if opts else "null"
        rev_str = "true" if rev else "false"
        inserts.append(
            f"  ({fid}, {qno}, '{esc(qkey)}', '{esc(pen)}', '{esc(pvi)}', '{opts_str}'::jsonb, {rev_str})"
        )
    lines.append(",\n".join(inserts) + ";")

    os.makedirs(os.path.dirname(os.path.abspath(OUT_SQL)), exist_ok=True)
    with open(OUT_SQL, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nSchema SQL saved to: {os.path.abspath(OUT_SQL)}")


if __name__ == "__main__":
    main()
