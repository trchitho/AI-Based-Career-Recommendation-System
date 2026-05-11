import psycopg2, json, random

conn = psycopg2.connect("postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8")
cur = conn.cursor()

print("=== Sample assessment_questions (VI) ===")
cur.execute("SELECT id, question_key, prompt_vi, options_json FROM core.assessment_questions WHERE form_id=1 ORDER BY question_no LIMIT 5")
for r in cur.fetchall():
    opts = r[3]
    vi_opts = opts.get("options_vi") if isinstance(opts, dict) else None
    print(f"  id={r[0]} key={r[1]} vi={r[2][:45]} vi_opts={vi_opts}")

cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE options_json->>'options_vi' IS NULL")
print(f"\nMissing options_vi: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE prompt_vi IS NULL OR prompt_vi=''")
print(f"Missing prompt_vi: {cur.fetchone()[0]}")

print("\n=== Sample essay_prompts (VI) ===")
cur.execute("SELECT id, title_vi, LEFT(prompt_text_vi, 60) FROM core.essay_prompts ORDER BY id LIMIT 3")
for r in cur.fetchall():
    print(f"  id={r[0]} title_vi={r[1]} prompt={r[2]}...")

print("\n=== Simulate get_questions(RIASEC, per_dim=3, lang=vi) ===")
cur.execute("""
    SELECT id, question_key, prompt_vi, options_json
    FROM core.assessment_questions WHERE form_id=1 ORDER BY question_no
""")
rows = cur.fetchall()
out = []
for rid, qkey, pvi, opts in rows:
    vi_opts = opts.get("options_vi") if isinstance(opts, dict) else None
    out.append({"id": str(rid), "question_text": pvi, "options": vi_opts, "dimension": qkey})

rng = random.Random(42)
rng.shuffle(out)
cap = {d: 0 for d in "RIASEC"}
sel = []
for it in out:
    d = str(it.get("dimension") or "").upper()[:1]
    if not d or d not in cap: continue
    if cap[d] < 3:
        sel.append(it)
        cap[d] += 1
    if all(v >= 3 for v in cap.values()): break

print(f"  Sampled: {len(sel)} (expected 18)")
dist = {d: sum(1 for q in sel if q['dimension'][0]==d) for d in "RIASEC"}
print(f"  Distribution: {dist}")
print("  Sample:")
for q in sel[:3]:
    print(f"    [{q['dimension']}] {q['question_text'][:55]}")
    print(f"         options: {q['options']}")

print("\n=== Simulate get_questions(BIGFIVE, per_dim=3, lang=vi) ===")
cur.execute("""
    SELECT id, question_key, prompt_vi, options_json
    FROM core.assessment_questions WHERE form_id=2 ORDER BY question_no
""")
rows = cur.fetchall()
out2 = []
for rid, qkey, pvi, opts in rows:
    vi_opts = opts.get("options_vi") if isinstance(opts, dict) else None
    out2.append({"id": str(rid), "question_text": pvi, "options": vi_opts, "dimension": qkey})

rng2 = random.Random(42)
rng2.shuffle(out2)
cap2 = {d: 0 for d in "OCEAN"}
sel2 = []
for it in out2:
    d = str(it.get("dimension") or "").upper()[:1]
    if not d or d not in cap2: continue
    if cap2[d] < 3:
        sel2.append(it)
        cap2[d] += 1
    if all(v >= 3 for v in cap2.values()): break

print(f"  Sampled: {len(sel2)} (expected 15)")
dist2 = {d: sum(1 for q in sel2 if q['dimension'][0]==d) for d in "OCEAN"}
print(f"  Distribution: {dist2}")
print("  Sample:")
for q in sel2[:3]:
    print(f"    [{q['dimension']}] {q['question_text'][:55]}")
    print(f"         options: {q['options']}")

print(f"\nTotal combined: {len(sel)+len(sel2)} (expected 33)")

cur.close()
conn.close()
