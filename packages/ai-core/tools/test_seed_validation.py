"""
test_seed_validation.py
=======================
Validate toàn bộ dữ liệu đã seed vào DB.
Chạy: python tools/test_seed_validation.py --db "postgresql://..."

Pass 100% mới được coi là production-ready.
"""

import argparse
import sys
from urllib.parse import quote
import os
import psycopg2

DB_URL = None  # set by CLI


def get_conn():
    return psycopg2.connect(DB_URL)


# ─── helpers ────────────────────────────────────────────────────────────────

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
results = []


def check(name: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    msg = f"{status} {name}"
    if detail:
        msg += f"  →  {detail}"
    print(msg)
    results.append((name, condition, detail))
    return condition


def query_one(sql, params=None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def query_all(sql, params=None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


# ─── TEST GROUPS ─────────────────────────────────────────────────────────────

def test_forms():
    print("\n══ 1. assessment_forms ══════════════════════════════")

    for code, expected_type in [
        ("RIASEC180", "RIASEC"),
        ("BIG5_120",  "BigFive"),
    ]:
        row = query_one(
            "SELECT id, form_type, lang, version FROM core.assessment_forms WHERE code=%s",
            (code,)
        )
        check(f"Form '{code}' exists", row is not None, str(row))
        if row:
            check(f"Form '{code}' type = {expected_type}", row[1] == expected_type, f"got {row[1]}")
            check(f"Form '{code}' lang = vi",              row[2] == "vi",           f"got {row[2]}")
            check(f"Form '{code}' version = 2.0",          row[3] == "2.0",          f"got {row[3]}")


def test_essay_prompts():
    print("\n══ 2. essay_prompts ═════════════════════════════════")

    row = query_one("SELECT COUNT(*) FROM core.essay_prompts WHERE lang='vi'")
    total = row[0]
    check("essay_prompts total = 50", total == 50, f"got {total}")

    # Không có title trùng
    dup = query_one(
        "SELECT COUNT(*) FROM (SELECT title FROM core.essay_prompts GROUP BY title HAVING COUNT(*)>1) t"
    )
    check("No duplicate titles", dup[0] == 0, f"{dup[0]} duplicates found")

    # Không có prompt_text rỗng
    empty = query_one("SELECT COUNT(*) FROM core.essay_prompts WHERE prompt_text IS NULL OR TRIM(prompt_text)=''")
    check("No empty prompt_text", empty[0] == 0, f"{empty[0]} empty rows")

    # Không có title rỗng
    empty_t = query_one("SELECT COUNT(*) FROM core.essay_prompts WHERE title IS NULL OR TRIM(title)=''")
    check("No empty title", empty_t[0] == 0, f"{empty_t[0]} empty rows")

    # Độ dài prompt hợp lý (>= 30 ký tự)
    short = query_one("SELECT COUNT(*) FROM core.essay_prompts WHERE LENGTH(prompt_text) < 30")
    check("All prompts length >= 30 chars", short[0] == 0, f"{short[0]} too-short prompts")

    # Kiểm tra một số prompts đặc trưng tồn tại
    for title in ["Nghề nghiệp lý tưởng", "Thất bại và bài học", "Tác động môi trường"]:
        row = query_one("SELECT id FROM core.essay_prompts WHERE title=%s", (title,))
        check(f"Prompt '{title}' exists", row is not None)


def test_riasec_questions():
    print("\n══ 3. RIASEC180 questions ═══════════════════════════")

    form = query_one("SELECT id FROM core.assessment_forms WHERE code='RIASEC180'")
    if not form:
        check("RIASEC180 form exists", False, "SKIP remaining RIASEC tests")
        return
    fid = form[0]

    # Tổng số câu
    total = query_one("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s", (fid,))
    check("RIASEC180 total = 180", total[0] == 180, f"got {total[0]}")

    # Mỗi trait đúng 30 câu
    for trait in ["R", "I", "A", "S", "E", "C"]:
        cnt = query_one(
            "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s AND question_key LIKE %s",
            (fid, f"{trait}%")
        )
        check(f"RIASEC trait {trait} = 30 items", cnt[0] == 30, f"got {cnt[0]}")

    # Reverse ratio ~30% (54/180)
    rev = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s AND reverse_score=true",
        (fid,)
    )
    rev_pct = rev[0] / 180 * 100
    check("RIASEC reverse count = 54", rev[0] == 54, f"got {rev[0]}")
    check("RIASEC reverse ratio ~30%", 28 <= rev_pct <= 32, f"got {rev_pct:.1f}%")

    # Mỗi trait có đúng 9 reverse
    for trait in ["R", "I", "A", "S", "E", "C"]:
        cnt = query_one(
            """SELECT COUNT(*) FROM core.assessment_questions
               WHERE form_id=%s AND question_key LIKE %s AND reverse_score=true""",
            (fid, f"{trait}%")
        )
        check(f"RIASEC trait {trait} reverse = 9", cnt[0] == 9, f"got {cnt[0]}")

    # question_no liên tục 1-180, không trùng
    dup_no = query_one(
        """SELECT COUNT(*) FROM (
            SELECT question_no FROM core.assessment_questions
            WHERE form_id=%s GROUP BY question_no HAVING COUNT(*)>1
           ) t""",
        (fid,)
    )
    check("RIASEC question_no no duplicates", dup_no[0] == 0, f"{dup_no[0]} dups")

    min_no, max_no = query_one(
        "SELECT MIN(question_no), MAX(question_no) FROM core.assessment_questions WHERE form_id=%s",
        (fid,)
    )
    check("RIASEC question_no range 1-180", min_no == 1 and max_no == 180, f"min={min_no} max={max_no}")

    # options_json hợp lệ và có scale=RIASEC
    bad_json = query_one(
        """SELECT COUNT(*) FROM core.assessment_questions
           WHERE form_id=%s AND (options_json IS NULL OR options_json->>'scale' != 'RIASEC')""",
        (fid,)
    )
    check("RIASEC all options_json valid (scale=RIASEC)", bad_json[0] == 0, f"{bad_json[0]} bad rows")

    # Không có prompt rỗng
    empty = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s AND (prompt IS NULL OR TRIM(prompt)='')",
        (fid,)
    )
    check("RIASEC no empty prompts", empty[0] == 0, f"{empty[0]} empty")

    # Không có question_key trùng trong cùng form
    dup_key = query_one(
        """SELECT COUNT(*) FROM (
            SELECT question_key FROM core.assessment_questions
            WHERE form_id=%s GROUP BY question_key HAVING COUNT(*)>1
           ) t""",
        (fid,)
    )
    check("RIASEC question_key no duplicates", dup_key[0] == 0, f"{dup_key[0]} dups")


def test_big5_questions():
    print("\n══ 4. BIG5_120 questions ════════════════════════════")

    form = query_one("SELECT id FROM core.assessment_forms WHERE code='BIG5_120'")
    if not form:
        check("BIG5_120 form exists", False, "SKIP remaining BIG5 tests")
        return
    fid = form[0]

    # Tổng số câu
    total = query_one("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s", (fid,))
    check("BIG5_120 total = 120", total[0] == 120, f"got {total[0]}")

    # Mỗi trait đúng 24 câu
    for trait in ["O", "C", "E", "A", "N"]:
        cnt = query_one(
            "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s AND question_key LIKE %s",
            (fid, f"{trait}%")
        )
        check(f"BIG5 trait {trait} = 24 items", cnt[0] == 24, f"got {cnt[0]}")

    # Reverse ratio ~33% (40/120)
    rev = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s AND reverse_score=true",
        (fid,)
    )
    rev_pct = rev[0] / 120 * 100
    check("BIG5 reverse count = 40", rev[0] == 40, f"got {rev[0]}")
    check("BIG5 reverse ratio ~33%", 31 <= rev_pct <= 35, f"got {rev_pct:.1f}%")

    # Mỗi trait có đúng 8 reverse
    for trait in ["O", "C", "E", "A", "N"]:
        cnt = query_one(
            """SELECT COUNT(*) FROM core.assessment_questions
               WHERE form_id=%s AND question_key LIKE %s AND reverse_score=true""",
            (fid, f"{trait}%")
        )
        check(f"BIG5 trait {trait} reverse = 8", cnt[0] == 8, f"got {cnt[0]}")

    # question_no liên tục 1-120, không trùng
    dup_no = query_one(
        """SELECT COUNT(*) FROM (
            SELECT question_no FROM core.assessment_questions
            WHERE form_id=%s GROUP BY question_no HAVING COUNT(*)>1
           ) t""",
        (fid,)
    )
    check("BIG5 question_no no duplicates", dup_no[0] == 0, f"{dup_no[0]} dups")

    min_no, max_no = query_one(
        "SELECT MIN(question_no), MAX(question_no) FROM core.assessment_questions WHERE form_id=%s",
        (fid,)
    )
    check("BIG5 question_no range 1-120", min_no == 1 and max_no == 120, f"min={min_no} max={max_no}")

    # options_json hợp lệ và có scale=BigFive
    bad_json = query_one(
        """SELECT COUNT(*) FROM core.assessment_questions
           WHERE form_id=%s AND (options_json IS NULL OR options_json->>'scale' != 'BigFive')""",
        (fid,)
    )
    check("BIG5 all options_json valid (scale=BigFive)", bad_json[0] == 0, f"{bad_json[0]} bad rows")

    # Không có prompt rỗng
    empty = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s AND (prompt IS NULL OR TRIM(prompt)='')",
        (fid,)
    )
    check("BIG5 no empty prompts", empty[0] == 0, f"{empty[0]} empty")

    # Không có question_key trùng trong cùng form
    dup_key = query_one(
        """SELECT COUNT(*) FROM (
            SELECT question_key FROM core.assessment_questions
            WHERE form_id=%s GROUP BY question_key HAVING COUNT(*)>1
           ) t""",
        (fid,)
    )
    check("BIG5 question_key no duplicates", dup_key[0] == 0, f"{dup_key[0]} dups")


def test_cross_form():
    print("\n══ 5. Cross-form integrity ══════════════════════════")

    # Không có câu hỏi nào có form_id NULL
    null_fid = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id IS NULL"
    )
    check("No questions with NULL form_id", null_fid[0] == 0, f"{null_fid[0]} rows")

    # Tổng toàn bộ câu hỏi v2 = 300
    riasec_form = query_one("SELECT id FROM core.assessment_forms WHERE code='RIASEC180'")
    big5_form   = query_one("SELECT id FROM core.assessment_forms WHERE code='BIG5_120'")
    if riasec_form and big5_form:
        total = query_one(
            "SELECT COUNT(*) FROM core.assessment_questions WHERE form_id IN (%s,%s)",
            (riasec_form[0], big5_form[0])
        )
        check("Total v2 questions = 300", total[0] == 300, f"got {total[0]}")

    # options_json phải là valid JSON object với key 'options' là array
    bad = query_one(
        """SELECT COUNT(*) FROM core.assessment_questions
           WHERE options_json IS NULL
              OR jsonb_typeof(options_json->'options') != 'array'"""
    )
    check("All options_json have 'options' array", bad[0] == 0, f"{bad[0]} bad rows")

    # Mỗi options array có đúng 5 phần tử
    bad_len = query_one(
        """SELECT COUNT(*) FROM core.assessment_questions
           WHERE jsonb_array_length(options_json->'options') != 5"""
    )
    check("All options arrays have 5 choices", bad_len[0] == 0, f"{bad_len[0]} bad rows")

    # reverse_score không NULL
    null_rev = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE reverse_score IS NULL"
    )
    check("No NULL reverse_score", null_rev[0] == 0, f"{null_rev[0]} rows")

    # created_at không NULL
    null_ts = query_one(
        "SELECT COUNT(*) FROM core.assessment_questions WHERE created_at IS NULL"
    )
    check("No NULL created_at", null_ts[0] == 0, f"{null_ts[0]} rows")


def test_idempotency():
    """Chạy loader lần 2 — số lượng không được tăng (ON CONFLICT DO NOTHING)."""
    print("\n══ 6. Idempotency (re-run loader) ═══════════════════")

    before_q = query_one("SELECT COUNT(*) FROM core.assessment_questions")[0]
    before_e = query_one("SELECT COUNT(*) FROM core.essay_prompts")[0]

    # Re-run loader — cwd phải là thư mục ai-core (chứa data/nlp/)
    import subprocess, sys
    ai_core_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    loader_path = os.path.join(ai_core_dir, "tools", "load_assessments_all.py")

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        [sys.executable, loader_path, "--db", DB_URL],
        capture_output=True, text=True, encoding="utf-8",
        cwd=ai_core_dir, env=env
    )

    after_q = query_one("SELECT COUNT(*) FROM core.assessment_questions")[0]
    after_e = query_one("SELECT COUNT(*) FROM core.essay_prompts")[0]

    check("Re-run: loader exit code 0", result.returncode == 0,
          (result.stderr + result.stdout)[:500] if result.returncode != 0 else "ok")
    check("Re-run: question count unchanged", after_q == before_q,
          f"before={before_q} after={after_q}")
    check("Re-run: essay count unchanged", after_e == before_e,
          f"before={before_e} after={after_e}")


def test_specific_items():
    """Kiểm tra một số câu hỏi cụ thể đã được insert đúng."""
    print("\n══ 7. Spot-check specific items ═════════════════════")

    riasec_form = query_one("SELECT id FROM core.assessment_forms WHERE code='RIASEC180'")
    big5_form   = query_one("SELECT id FROM core.assessment_forms WHERE code='BIG5_120'")

    if riasec_form:
        fid = riasec_form[0]
        # R1 phải là câu đầu tiên, không reverse
        r1 = query_one(
            "SELECT prompt, reverse_score FROM core.assessment_questions WHERE form_id=%s AND question_key='R1'",
            (fid,)
        )
        check("RIASEC R1 exists", r1 is not None)
        if r1:
            check("RIASEC R1 reverse=False", r1[1] == False, f"got {r1[1]}")

        # R22 phải là reverse (câu đầu tiên của reverse block)
        r22 = query_one(
            "SELECT reverse_score FROM core.assessment_questions WHERE form_id=%s AND question_key='R22'",
            (fid,)
        )
        check("RIASEC R22 reverse=True", r22 is not None and r22[0] == True,
              f"got {r22}")

        # C30 phải là câu cuối cùng của RIASEC, reverse
        c30 = query_one(
            "SELECT question_no, reverse_score FROM core.assessment_questions WHERE form_id=%s AND question_key='C30'",
            (fid,)
        )
        check("RIASEC C30 exists and reverse=True",
              c30 is not None and c30[1] == True, f"got {c30}")
        if c30:
            check("RIASEC C30 question_no=180", c30[0] == 180, f"got {c30[0]}")

    if big5_form:
        fid = big5_form[0]
        # O1 không reverse
        o1 = query_one(
            "SELECT reverse_score FROM core.assessment_questions WHERE form_id=%s AND question_key='O1'",
            (fid,)
        )
        check("BIG5 O1 reverse=False", o1 is not None and o1[0] == False, f"got {o1}")

        # O17 phải reverse (đầu reverse block của O)
        o17 = query_one(
            "SELECT reverse_score FROM core.assessment_questions WHERE form_id=%s AND question_key='O17'",
            (fid,)
        )
        check("BIG5 O17 reverse=True", o17 is not None and o17[0] == True, f"got {o17}")

        # N24 là câu cuối, reverse (emotional stability)
        n24 = query_one(
            "SELECT question_no, reverse_score FROM core.assessment_questions WHERE form_id=%s AND question_key='N24'",
            (fid,)
        )
        check("BIG5 N24 exists and reverse=True",
              n24 is not None and n24[1] == True, f"got {n24}")
        if n24:
            check("BIG5 N24 question_no=120", n24[0] == 120, f"got {n24[0]}")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    global DB_URL

    ap = argparse.ArgumentParser()
    ap.add_argument("--db", help="Postgres URL")
    args = ap.parse_args()

    if args.db:
        DB_URL = args.db
    else:
        DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")

    print("=" * 56)
    print("  Seed Validation Test Suite")
    print(f"  DB: {DB_URL.split('@')[-1]}")
    print("=" * 56)

    test_forms()
    test_essay_prompts()
    test_riasec_questions()
    test_big5_questions()
    test_cross_form()
    test_specific_items()
    test_idempotency()

    # ── Summary ──────────────────────────────────────────────
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    total  = len(results)

    print("\n" + "=" * 56)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  |  {failed} FAILED ← fix before production")
        print("=" * 56)
        print("\nFailed tests:")
        for name, ok, detail in results:
            if not ok:
                print(f"  ✗ {name}  →  {detail}")
        sys.exit(1)
    else:
        print("  ✓  ALL PASS")
        print("=" * 56)
        sys.exit(0)


if __name__ == "__main__":
    main()
