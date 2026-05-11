"""
deep_check.py — Kiểm tra toàn diện DB trước khi bàn giao
Chạy: python tools/deep_check.py
"""
import psycopg2, json, re, sys

DB = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"
conn = psycopg2.connect(DB)
cur = conn.cursor()

errors = []
warnings = []

def err(msg):  errors.append(msg);   print(f"  [ERR]  {msg}")
def warn(msg): warnings.append(msg); print(f"  [WARN] {msg}")
def ok(msg):                          print(f"  [OK]   {msg}")

# ══════════════════════════════════════════════════════════════
print("\n=== 1. assessment_forms ===")
# ══════════════════════════════════════════════════════════════
cur.execute("SELECT id,code,title,form_type,lang,version,created_at FROM core.assessment_forms ORDER BY id")
forms = cur.fetchall()

if len(forms) != 2:
    err(f"Expected 2 forms, got {len(forms)}")
else:
    ok("2 forms present")

for fid,code,title,ftype,lang,ver,cat in forms:
    p = f"form id={fid}"
    if fid   is None:              err(f"{p}: id NULL")
    if not code or not code.strip(): err(f"{p}: code NULL/empty")
    if not title or not title.strip(): err(f"{p}: title NULL/empty")
    if ftype not in ("RIASEC","BigFive"): err(f"{p}: form_type='{ftype}' invalid")
    if lang != "vi":               err(f"{p}: lang='{lang}' expected 'vi'")
    if not ver:                    err(f"{p}: version NULL")
    if cat is None:                err(f"{p}: created_at NULL")
    ok(f"  {p} code={code} type={ftype} lang={lang} ver={ver}")
    ok(f"    title: {title}")

# ══════════════════════════════════════════════════════════════
print("\n=== 2. assessment_questions: NULL checks ===")
# ══════════════════════════════════════════════════════════════
for col in ["id","form_id","question_no","question_key","prompt","options_json","reverse_score","created_at"]:
    cur.execute(f"SELECT COUNT(*) FROM core.assessment_questions WHERE {col} IS NULL")
    n = cur.fetchone()[0]
    if n > 0: err(f"'{col}' has {n} NULL rows")
    else:     ok(f"'{col}': 0 NULLs")

# ══════════════════════════════════════════════════════════════
print("\n=== 3. assessment_questions: empty string checks ===")
# ══════════════════════════════════════════════════════════════
for col in ["question_key","prompt"]:
    cur.execute(f"SELECT COUNT(*) FROM core.assessment_questions WHERE TRIM({col}) = ''")
    n = cur.fetchone()[0]
    if n > 0: err(f"'{col}' has {n} empty-string rows")
    else:     ok(f"'{col}': 0 empty strings")

# ══════════════════════════════════════════════════════════════
print("\n=== 4. assessment_questions: per-form stats ===")
# ══════════════════════════════════════════════════════════════
cur.execute("""
    SELECT af.id, af.code, COUNT(*) as total,
           SUM(CASE WHEN aq.reverse_score THEN 1 ELSE 0 END) as rev,
           MIN(aq.question_no), MAX(aq.question_no),
           COUNT(DISTINCT aq.question_no)  as d_no,
           COUNT(DISTINCT aq.question_key) as d_key,
           COUNT(DISTINCT aq.prompt)       as d_prompt
    FROM core.assessment_questions aq
    JOIN core.assessment_forms af ON af.id = aq.form_id
    GROUP BY af.id, af.code ORDER BY af.id
""")
for fid,code,total,rev,mn,mx,d_no,d_key,d_prompt in cur.fetchall():
    ok(f"form_id={fid} ({code}): total={total} reverse={rev} q_no={mn}-{mx}")
    ok(f"  distinct: q_no={d_no} key={d_key} prompt={d_prompt}")

    if mn != 1:      err(f"form_id={fid}: question_no min={mn}, expected 1")
    if mx != total:  err(f"form_id={fid}: question_no max={mx}, expected {total}")
    if d_no != total:    err(f"form_id={fid}: {total-d_no} duplicate question_no")
    if d_key != total:   err(f"form_id={fid}: {total-d_key} duplicate question_key")
    if d_prompt != total: err(f"form_id={fid}: {total-d_prompt} duplicate prompts")

    rev_pct = rev/total*100
    if fid == 1:
        if not (15 <= rev_pct <= 40): err(f"RIASEC reverse {rev_pct:.1f}% out of 15-40%")
        else: ok(f"RIASEC reverse ratio: {rev_pct:.1f}%")
    else:
        if not (25 <= rev_pct <= 55): err(f"BIG5 reverse {rev_pct:.1f}% out of 25-55%")
        else: ok(f"BIG5 reverse ratio: {rev_pct:.1f}%")

# ══════════════════════════════════════════════════════════════
print("\n=== 5. options_json: deep validation ===")
# ══════════════════════════════════════════════════════════════
cur.execute("SELECT id, form_id, options_json FROM core.assessment_questions")
all_q = cur.fetchall()
bad = 0
for qid, fid, ojson in all_q:
    if ojson is None:
        err(f"id={qid}: options_json NULL"); bad+=1; continue
    obj = ojson if isinstance(ojson, dict) else None
    if obj is None:
        try: obj = json.loads(ojson)
        except: err(f"id={qid}: invalid JSON"); bad+=1; continue
    if "options" not in obj:
        err(f"id={qid}: missing 'options'"); bad+=1
    elif len(obj["options"]) != 5:
        err(f"id={qid}: options len={len(obj['options'])} expected 5"); bad+=1
    if "scale" not in obj:
        err(f"id={qid}: missing 'scale'"); bad+=1
    else:
        exp = "RIASEC" if fid==1 else "BigFive"
        if obj["scale"] != exp:
            err(f"id={qid}: scale='{obj['scale']}' expected '{exp}'"); bad+=1

if bad == 0: ok(f"All {len(all_q)} options_json valid")

# ══════════════════════════════════════════════════════════════
print("\n=== 6. Trait distribution ===")
# ══════════════════════════════════════════════════════════════
cur.execute("""
    SELECT LEFT(question_key,1), COUNT(*),
           SUM(CASE WHEN reverse_score THEN 1 ELSE 0 END)
    FROM core.assessment_questions WHERE form_id=1
    GROUP BY LEFT(question_key,1) ORDER BY 1
""")
riasec_rows = cur.fetchall()
print("  RIASEC traits:")
riasec_keys = set()
for t,cnt,rev in riasec_rows:
    riasec_keys.add(t)
    print(f"    {t}: {cnt} items, {rev} reverse ({rev/cnt*100:.0f}%)")
    if t not in ("R","I","A","S","E","C"):
        err(f"RIASEC unexpected trait prefix '{t}'")
for t in ("R","I","A","S","E","C"):
    if t not in riasec_keys: err(f"RIASEC missing trait '{t}'")

cur.execute("""
    SELECT LEFT(question_key,1), COUNT(*),
           SUM(CASE WHEN reverse_score THEN 1 ELSE 0 END)
    FROM core.assessment_questions WHERE form_id=2
    GROUP BY LEFT(question_key,1) ORDER BY 1
""")
big5_rows = cur.fetchall()
print("  BIG5 traits:")
big5_keys = set()
for t,cnt,rev in big5_rows:
    big5_keys.add(t)
    print(f"    {t}: {cnt} items, {rev} reverse ({rev/cnt*100:.0f}%)")
    if t not in ("O","C","E","A","N"):
        err(f"BIG5 unexpected trait prefix '{t}'")
for t in ("O","C","E","A","N"):
    if t not in big5_keys: err(f"BIG5 missing trait '{t}'")

# ══════════════════════════════════════════════════════════════
print("\n=== 7. essay_prompts: full validation ===")
# ══════════════════════════════════════════════════════════════
cur.execute("SELECT id,title,prompt_text,lang,created_at FROM core.essay_prompts ORDER BY id")
essays = cur.fetchall()

if len(essays) != 50: err(f"Expected 50 essays, got {len(essays)}")
else: ok("50 essay prompts")

for col in ["id","title","prompt_text","lang","created_at"]:
    cur.execute(f"SELECT COUNT(*) FROM core.essay_prompts WHERE {col} IS NULL")
    n = cur.fetchone()[0]
    if n > 0: err(f"essay_prompts.{col}: {n} NULLs")
    else:     ok(f"essay_prompts.{col}: 0 NULLs")

for col in ["title","prompt_text"]:
    cur.execute(f"SELECT COUNT(*) FROM core.essay_prompts WHERE TRIM({col})=''")
    n = cur.fetchone()[0]
    if n > 0: err(f"essay_prompts.{col}: {n} empty strings")
    else:     ok(f"essay_prompts.{col}: 0 empty strings")

cur.execute("SELECT COUNT(*) FROM (SELECT title FROM core.essay_prompts GROUP BY title HAVING COUNT(*)>1) t")
n = cur.fetchone()[0]
if n > 0: err(f"essay_prompts: {n} duplicate titles")
else:     ok("essay_prompts: 0 duplicate titles")

cur.execute("SELECT COUNT(*) FROM (SELECT prompt_text FROM core.essay_prompts GROUP BY prompt_text HAVING COUNT(*)>1) t")
n = cur.fetchone()[0]
if n > 0: err(f"essay_prompts: {n} duplicate prompt_texts")
else:     ok("essay_prompts: 0 duplicate prompt_texts")

cur.execute("SELECT MIN(id),MAX(id),COUNT(DISTINCT id) FROM core.essay_prompts")
mn,mx,d = cur.fetchone()
if mn!=1:  err(f"essay id min={mn}, expected 1")
else:      ok("essay id min=1")
if mx!=50: err(f"essay id max={mx}, expected 50")
else:      ok("essay id max=50")
if d!=50:  err(f"essay {50-d} duplicate ids")
else:      ok("essay ids all distinct")

cur.execute("SELECT COUNT(*) FROM core.essay_prompts WHERE lang!='vi'")
n = cur.fetchone()[0]
if n > 0: err(f"essay_prompts: {n} rows lang!='vi'")
else:     ok("essay_prompts: all lang='vi'")

cur.execute("SELECT COUNT(*) FROM core.essay_prompts WHERE LENGTH(prompt_text)<30")
n = cur.fetchone()[0]
if n > 0: err(f"essay_prompts: {n} prompt_text < 30 chars")
else:     ok("essay_prompts: all prompt_text >= 30 chars")

# ══════════════════════════════════════════════════════════════
print("\n=== 8. Spot checks ===")
# ══════════════════════════════════════════════════════════════
cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE prompt='Build kitchen cabinets.'")
n = cur.fetchone()[0]
if n != 1: err(f"'Build kitchen cabinets.' = {n} rows, expected 1")
else:      ok("'Build kitchen cabinets.' = exactly 1 row")

cur.execute("""
    SELECT COUNT(*) FROM core.assessment_questions aq
    WHERE NOT EXISTS (SELECT 1 FROM core.assessment_forms af WHERE af.id=aq.form_id)
""")
n = cur.fetchone()[0]
if n > 0: err(f"{n} orphan rows (no matching form)")
else:     ok("0 orphan rows")

# ══════════════════════════════════════════════════════════════
print("\n=== 9. Constraints ===")
# ══════════════════════════════════════════════════════════════
cur.execute("SELECT conname,contype FROM pg_constraint WHERE conrelid='core.assessment_questions'::regclass ORDER BY conname")
existing = {r[0]:r[1] for r in cur.fetchall()}
for c in ["assessment_questions_pkey","assessment_questions_form_id_fkey","uq_assessment_questions_form_no"]:
    if c in existing: ok(f"Constraint '{c}' ({existing[c]}) exists")
    else:             err(f"Constraint '{c}' MISSING")

# ══════════════════════════════════════════════════════════════
print("\n=== 10. Title vs actual count consistency ===")
# ══════════════════════════════════════════════════════════════
cur.execute("SELECT id,code,title FROM core.assessment_forms ORDER BY id")
for fid,code,title in cur.fetchall():
    cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=%s",(fid,))
    actual = cur.fetchone()[0]
    m = re.search(r'\((\d+) items\)', title)
    if m:
        stated = int(m.group(1))
        if stated != actual: err(f"form_id={fid} ({code}): title says {stated} but actual={actual}")
        else:                ok(f"form_id={fid} ({code}): title count {stated} == actual {actual}")
    else:
        warn(f"form_id={fid} ({code}): title has no item count pattern")

# ══════════════════════════════════════════════════════════════
print("\n" + "="*60)
print(f"  ERRORS:   {len(errors)}")
print(f"  WARNINGS: {len(warnings)}")
if errors:
    print("\nAll errors:")
    for e in errors: print(f"  x {e}")
    sys.exit(1)
else:
    print("  ALL CHECKS PASSED - READY TO DELIVER")
print("="*60)

cur.close()
conn.close()
