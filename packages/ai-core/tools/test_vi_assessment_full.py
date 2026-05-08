"""
test_vi_assessment_full.py
===========================
Validate toàn bộ luồng xuất câu hỏi VI cho 3 mode:
  1. Game mode       (?mode=game)
  2. Book/Interactive mode (legacy/story)
  3. Standard mode   (?mode=standard)

Kiểm tra:
  - 33 câu hỏi VI (18 RIASEC + 15 BIG5)
  - 1 essay prompt VI
  - options VI đúng
  - Không có text EN lọt vào response
  - Frontend constants đúng

Chạy: python tools/test_vi_assessment_full.py
"""
import sys, os, json, random
import psycopg2

DB = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
results = []

def check(name, cond, detail=""):
    tag = PASS if cond else FAIL
    msg = f"{tag} {name}"
    if detail: msg += f"  →  {detail}"
    print(msg)
    results.append((name, cond, detail))
    return cond

def get_conn():
    return psycopg2.connect(DB)

# ── Simulate backend get_questions ───────────────────────────────────────────
def simulate_get_questions(test_type: str, per_dim: int, lang: str = "vi", seed: int = 42):
    db_type = "RIASEC" if test_type.upper() in ("RIASEC","HOLLAND") else "BigFive"
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT id FROM core.assessment_forms WHERE form_type=%s", (db_type,))
            form_ids = [r[0] for r in cur.fetchall()]
            if not form_ids: return []
            cur.execute("""
                SELECT id, question_key, prompt_en, prompt_vi, options_json, reverse_score
                FROM core.assessment_questions
                WHERE form_id = ANY(%s)
                ORDER BY form_id, question_no
            """, (form_ids,))
            rows = cur.fetchall()

    out = []
    for rid, qkey, pen, pvi, opts, rev in rows:
        # to_client(lang)
        if isinstance(opts, dict):
            if lang == "vi" and "options_vi" in opts:
                options = opts["options_vi"]
            elif "options" in opts:
                options = opts["options"]
            else:
                options = None
        else:
            options = None

        out.append({
            "id": str(rid),
            "test_type": test_type,
            "question_text": pvi if lang == "vi" else pen,
            "question_type": "MULTIPLE_CHOICE" if options else "SCALE",
            "options": options,
            "dimension": qkey,
            "order_index": 0,
            "reverse_score": rev,
        })

    # Shuffle
    rng = random.Random(seed)
    rng.shuffle(out)
    for idx, item in enumerate(out, 1):
        item["order_index"] = idx

    # per_dim
    if per_dim > 0:
        dims = "RIASEC" if test_type.upper() == "RIASEC" else "OCEAN"
        cap = {d: 0 for d in dims}
        sel = []
        for it in out:
            d = str(it.get("dimension") or "").upper()[:1]
            if not d or d not in cap: continue
            if cap[d] < per_dim:
                sel.append(it)
                cap[d] += 1
            if all(v >= per_dim for v in cap.values()): break
        out = sel

    for idx, item in enumerate(out, 1):
        item["order_index"] = idx
    return out


def is_vietnamese(text: str) -> bool:
    """Kiểm tra text có chứa ký tự tiếng Việt không."""
    vi_chars = set("àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"
                   "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ")
    return any(c in vi_chars for c in text)

def is_english_only(text: str) -> bool:
    """Kiểm tra text có phải EN thuần không (không có ký tự VI)."""
    return not is_vietnamese(text)


# ─── SECTION 1: DB integrity ─────────────────────────────────────────────────
def test_db_integrity():
    print("\n══ 1. DB Integrity ══════════════════════════════════")
    with get_conn() as c:
        with c.cursor() as cur:
            # Columns exist
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema='core' AND table_name='assessment_questions'
                ORDER BY ordinal_position
            """)
            cols = [r[0] for r in cur.fetchall()]
            check("assessment_questions has prompt_en", "prompt_en" in cols)
            check("assessment_questions has prompt_vi", "prompt_vi" in cols)
            check("assessment_questions no old 'prompt' column", "prompt" not in cols)
            check("prompt_en before prompt_vi (adjacent)",
                  cols.index("prompt_en") + 1 == cols.index("prompt_vi"),
                  f"positions: en={cols.index('prompt_en')} vi={cols.index('prompt_vi')}")

            # essay_prompts columns
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema='core' AND table_name='essay_prompts'
                ORDER BY ordinal_position
            """)
            ecols = [r[0] for r in cur.fetchall()]
            check("essay_prompts has title_en", "title_en" in ecols)
            check("essay_prompts has title_vi", "title_vi" in ecols)
            check("essay_prompts has prompt_text_en", "prompt_text_en" in ecols)
            check("essay_prompts has prompt_text_vi", "prompt_text_vi" in ecols)
            check("essay_prompts no old 'title' column", "title" not in ecols)
            check("essay_prompts no old 'lang' column", "lang" not in ecols)
            check("title_en before title_vi",
                  ecols.index("title_en") + 1 == ecols.index("title_vi"))
            check("prompt_text_en before prompt_text_vi",
                  ecols.index("prompt_text_en") + 1 == ecols.index("prompt_text_vi"))

            # NULL checks
            cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE prompt_vi IS NULL OR prompt_vi=''")
            check("No NULL/empty prompt_vi", cur.fetchone()[0] == 0)
            cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE prompt_en IS NULL OR prompt_en=''")
            check("No NULL/empty prompt_en", cur.fetchone()[0] == 0)
            cur.execute("SELECT COUNT(*) FROM core.essay_prompts WHERE title_vi IS NULL OR prompt_text_vi IS NULL")
            check("No NULL essay VI fields", cur.fetchone()[0] == 0)

            # options_vi
            cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE options_json->>'options_vi' IS NULL")
            check("All questions have options_vi", cur.fetchone()[0] == 0)

            # VI content check (sample)
            cur.execute("SELECT prompt_vi FROM core.assessment_questions ORDER BY id LIMIT 20")
            vi_prompts = [r[0] for r in cur.fetchall()]
            vi_count = sum(1 for p in vi_prompts if is_vietnamese(p))
            check("prompt_vi contains Vietnamese characters", vi_count >= 15,
                  f"{vi_count}/20 have VI chars")

            # options_vi content check
            cur.execute("SELECT options_json FROM core.assessment_questions WHERE form_id=1 LIMIT 5")
            for row in cur.fetchall():
                opts = row[0]
                if isinstance(opts, dict) and "options_vi" in opts:
                    vi_opts = opts["options_vi"]
                    has_vi = any(is_vietnamese(o) for o in vi_opts)
                    check("options_vi contains Vietnamese", has_vi, str(vi_opts))
                    break


# ─── SECTION 2: per_dim=3 VI sampling ────────────────────────────────────────
def test_vi_sampling():
    print("\n══ 2. VI Sampling (per_dim=3) ═══════════════════════")

    riasec = simulate_get_questions("RIASEC", per_dim=3, lang="vi", seed=42)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, lang="vi", seed=42)

    check("RIASEC VI: 18 questions", len(riasec) == 18, f"got {len(riasec)}")
    check("BIG5 VI: 15 questions",   len(big5)   == 15, f"got {len(big5)}")
    check("Combined: 33 questions",  len(riasec)+len(big5) == 33)

    # All question_text is VI
    en_leaks = [q for q in riasec+big5 if is_english_only(q["question_text"])]
    check("No EN-only question_text in VI response", len(en_leaks) == 0,
          f"{len(en_leaks)} EN-only: {[q['question_text'][:40] for q in en_leaks[:2]]}")

    # All options are VI
    for q in riasec[:3]:
        if q["options"]:
            vi_opts = [o for o in q["options"] if is_vietnamese(o)]
            check(f"RIASEC options VI [{q['dimension']}]", len(vi_opts) == len(q["options"]),
                  str(q["options"]))
            break

    for q in big5[:3]:
        if q["options"]:
            vi_opts = [o for o in q["options"] if is_vietnamese(o)]
            check(f"BIG5 options VI [{q['dimension']}]", len(vi_opts) == len(q["options"]),
                  str(q["options"]))
            break

    # Trait distribution
    for t in "RIASEC":
        cnt = sum(1 for q in riasec if q["dimension"][0] == t)
        check(f"RIASEC trait {t} = 3", cnt == 3, f"got {cnt}")
    for t in "OCEAN":
        cnt = sum(1 for q in big5 if q["dimension"][0] == t)
        check(f"BIG5 trait {t} = 3", cnt == 3, f"got {cnt}")


# ─── SECTION 3: Game mode ────────────────────────────────────────────────────
def test_game_mode():
    print("\n══ 3. Game Mode (?mode=game) ════════════════════════")
    riasec = simulate_get_questions("RIASEC", per_dim=3, lang="vi", seed=1000)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, lang="vi", seed=1001)
    questions = riasec + big5

    check("Game: 33 questions total", len(questions) == 33, f"got {len(questions)}")
    check("Game: RIASEC = 18", len(riasec) == 18)
    check("Game: BIG5 = 15", len(big5) == 15)

    # question_text là VI
    en_only = [q for q in questions if is_english_only(q["question_text"])]
    check("Game: all question_text is VI", len(en_only) == 0,
          f"{len(en_only)} EN-only questions")

    # options là VI
    bad_opts = []
    for q in questions:
        if q["options"]:
            if any(is_english_only(o) for o in q["options"]):
                bad_opts.append(q["dimension"])
    check("Game: all options are VI", len(bad_opts) == 0,
          f"EN options in: {bad_opts[:3]}")

    # SCALE questions có options VI
    scale_qs = [q for q in questions if q["question_type"] == "SCALE"]
    mc_qs    = [q for q in questions if q["question_type"] == "MULTIPLE_CHOICE"]
    check("Game: has MULTIPLE_CHOICE questions", len(mc_qs) > 0, f"got {len(mc_qs)}")
    check("Game: all questions have options", all(q["options"] for q in questions),
          f"{sum(1 for q in questions if not q['options'])} missing options")


# ─── SECTION 4: Book/Interactive mode ────────────────────────────────────────
def test_book_mode():
    print("\n══ 4. Book/Interactive Mode (legacy) ════════════════")
    riasec = simulate_get_questions("RIASEC", per_dim=3, lang="vi", seed=2000)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, lang="vi", seed=2001)

    # Simulate StoryBasedAssessment combine logic
    riasec_labels = ["R","I","A","S","E","C"]
    big5_labels   = ["O","C","E","A","N"]
    riasec_by = {t: [q for q in riasec if q["dimension"][0]==t] for t in riasec_labels}
    big5_by   = {t: [q for q in big5   if q["dimension"][0]==t] for t in big5_labels}

    combined = []
    for i in range(max(len(riasec_labels), len(big5_labels))):
        if i < len(riasec_labels):
            combined.extend(riasec_by.get(riasec_labels[i], []))
        if i < len(big5_labels):
            combined.extend(big5_by.get(big5_labels[i], []))

    selected = combined[:33]  # slice(0, 33)

    check("Book: 33 questions selected", len(selected) == 33, f"got {len(selected)}")

    # +1 essay page = 34 total
    total_pages = len(selected) + 1
    check("Book: 34 total pages (33 + 1 essay)", total_pages == 34, f"got {total_pages}")

    # question_text là VI
    en_only = [q for q in selected if is_english_only(q["question_text"])]
    check("Book: all question_text is VI", len(en_only) == 0,
          f"{len(en_only)} EN-only")

    # No duplicate ids
    ids = [q["id"] for q in selected]
    check("Book: no duplicate ids", len(ids) == len(set(ids)))

    # Essay prompt là VI
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT id, title_vi, prompt_text_vi FROM core.essay_prompts ORDER BY RANDOM() LIMIT 1")
            row = cur.fetchone()
    check("Book: essay prompt exists", row is not None)
    if row:
        check("Book: essay title_vi is VI", is_vietnamese(row[1]), row[1])
        check("Book: essay prompt_text_vi is VI", is_vietnamese(row[2]), row[2][:50])


# ─── SECTION 5: Standard mode ────────────────────────────────────────────────
def test_standard_mode():
    print("\n══ 5. Standard Mode (?mode=standard) ════════════════")
    riasec = simulate_get_questions("RIASEC", per_dim=3, lang="vi", seed=3000)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, lang="vi", seed=3001)
    questions = riasec + big5

    check("Standard: 33 questions", len(questions) == 33, f"got {len(questions)}")

    # question_text là VI
    en_only = [q for q in questions if is_english_only(q["question_text"])]
    check("Standard: all question_text is VI", len(en_only) == 0,
          f"{len(en_only)} EN-only: {[q['question_text'][:40] for q in en_only[:2]]}")

    # options là VI
    bad_opts = []
    for q in questions:
        if q["options"]:
            if any(is_english_only(o) for o in q["options"]):
                bad_opts.append(f"{q['dimension']}: {q['options']}")
    check("Standard: all options are VI", len(bad_opts) == 0,
          f"EN options: {bad_opts[:2]}")

    # Page count = 9 (33÷4 rounded up)
    import math
    pages = math.ceil(len(questions) / 4)
    check("Standard: 9 pages (33÷4)", pages == 9, f"got {pages}")

    # Sample VI options
    print("  Sample VI options (RIASEC):", riasec[0]["options"])
    print("  Sample VI options (BIG5):",   big5[0]["options"])


# ─── SECTION 6: Essay prompt ─────────────────────────────────────────────────
def test_essay_prompt():
    print("\n══ 6. Essay Prompt VI ═══════════════════════════════")
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM core.essay_prompts")
            check("50 essay prompts", cur.fetchone()[0] == 50)

            cur.execute("SELECT id, title_vi, prompt_text_vi, title_en, prompt_text_en FROM core.essay_prompts ORDER BY id LIMIT 5")
            rows = cur.fetchall()
            for row in rows:
                check(f"Essay id={row[0]}: title_vi is VI", is_vietnamese(row[1]), row[1])
                check(f"Essay id={row[0]}: prompt_text_vi is VI", is_vietnamese(row[2]), row[2][:40])
                check(f"Essay id={row[0]}: title_en is EN", is_english_only(row[3]), row[3])

            # API response simulation
            cur.execute("SELECT id, title_vi, title_en, prompt_text_vi, prompt_text_en FROM core.essay_prompts ORDER BY RANDOM() LIMIT 1")
            row = cur.fetchone()
            if row:
                # Simulate EssayPromptOut với lang=vi
                response = {
                    "id": row[0],
                    "title_vi": row[1], "title_en": row[2],
                    "prompt_text_vi": row[3], "prompt_text_en": row[4],
                    "title": row[1],        # convenience: VI
                    "prompt_text": row[3],  # convenience: VI
                    "lang": "vi"
                }
                check("Essay API: title = title_vi", response["title"] == response["title_vi"])
                check("Essay API: prompt_text = prompt_text_vi", response["prompt_text"] == response["prompt_text_vi"])
                check("Essay API: lang = vi", response["lang"] == "vi")


# ─── SECTION 7: Frontend constants ───────────────────────────────────────────
def test_frontend_constants():
    print("\n══ 7. Frontend Constants ════════════════════════════")
    tools_dir    = os.path.dirname(os.path.abspath(__file__))
    ai_core_dir  = os.path.dirname(tools_dir)
    packages_dir = os.path.dirname(ai_core_dir)
    project_root = os.path.dirname(packages_dir)

    # assessmentService.ts
    svc = os.path.join(project_root, "apps", "frontend", "src", "services", "assessmentService.ts")
    if os.path.exists(svc):
        content = open(svc, encoding="utf-8").read()
        check("assessmentService: perDim = 3", "const perDim = 3;" in content)
        check("assessmentService: lang = vi param", "lang: 'vi'" in content)
        check("assessmentService: no old perDim = 4", "const perDim = 4;" not in content)
    else:
        check("assessmentService.ts exists", False, svc)

    # StoryBasedAssessment.tsx
    story = os.path.join(project_root, "apps", "frontend", "src", "components", "assessment", "StoryBasedAssessment.tsx")
    if os.path.exists(story):
        content = open(story, encoding="utf-8").read()
        check("StoryBasedAssessment: slice(0, 33)", "slice(0, 33)" in content)
        check("StoryBasedAssessment: no hardcode 'Scenario 45 of 45'", "Scenario 45 of 45" not in content)
        check("StoryBasedAssessment: no old slice(0, 44)", "slice(0, 44)" not in content)
    else:
        check("StoryBasedAssessment.tsx exists", False, story)

    # GameQuizMode.tsx — no EN scale labels
    game = os.path.join(project_root, "apps", "frontend", "src", "components", "assessment", "GameQuizMode.tsx")
    if os.path.exists(game):
        content = open(game, encoding="utf-8").read()
        check("GameQuizMode: no 'Strongly Disagree'", "Strongly Disagree" not in content)
        check("GameQuizMode: no 'Strongly Agree'", "Strongly Agree" not in content)
        check("GameQuizMode: has VI scale label", "Rất không đồng ý" in content or "Không đồng ý" in content)
    else:
        check("GameQuizMode.tsx exists", False, game)

    # TetrisQuizGame.tsx — no EN scale labels
    tetris = os.path.join(project_root, "apps", "frontend", "src", "components", "assessment", "TetrisQuizGame.tsx")
    if os.path.exists(tetris):
        content = open(tetris, encoding="utf-8").read()
        check("TetrisQuizGame: no hardcode EN 'Strongly Disagree'",
              "['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']" not in content)
        check("TetrisQuizGame: has VI fallback labels",
              "Rất không đồng ý" in content or "options_vi" in content)
    else:
        check("TetrisQuizGame.tsx exists", False, tetris)

    # types/assessment.ts — has reverse_score
    types = os.path.join(project_root, "apps", "frontend", "src", "types", "assessment.ts")
    if os.path.exists(types):
        content = open(types, encoding="utf-8").read()
        check("assessment.ts: Question has reverse_score", "reverse_score" in content)
    else:
        check("assessment.ts exists", False, types)


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 56)
    print("  VI Assessment Full Validation Suite")
    print("  3 modes: game, book, standard")
    print("=" * 56)

    test_db_integrity()
    test_vi_sampling()
    test_game_mode()
    test_book_mode()
    test_standard_mode()
    test_essay_prompt()
    test_frontend_constants()

    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    total  = len(results)

    print("\n" + "=" * 56)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  |  {failed} FAILED")
        print("=" * 56)
        print("\nFailed tests:")
        for name, ok, detail in results:
            if not ok:
                print(f"  x {name}  →  {detail}")
        sys.exit(1)
    else:
        print("  ✓  ALL PASS")
        print("=" * 56)
        sys.exit(0)


if __name__ == "__main__":
    main()
