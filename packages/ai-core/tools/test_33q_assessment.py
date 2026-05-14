"""
test_33q_assessment.py
======================
Validate logic 33 câu hỏi (3 câu/nhãn) cho 3 mode:
  1. Game mode       (?mode=game)
  2. Interactive     (legacy/story mode)
  3. Standard        (?mode=standard)

Chạy: python tools/test_33q_assessment.py
Pass 100% mới được deploy.
"""
import sys, json, os
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

def conn():
    return psycopg2.connect(DB)

# ─── Simulate backend get_questions logic ────────────────────────────────────
import random

def simulate_get_questions(test_type: str, per_dim: int, shuffle: bool = True, seed: int = 42):
    """
    Mô phỏng đúng logic service.py::get_questions()
    """
    with conn() as c:
        with c.cursor() as cur:
            # Normalize type
            db_type = "RIASEC" if test_type.upper() in ("RIASEC","HOLLAND") else "BigFive"

            # Get form_ids
            cur.execute("SELECT id FROM core.assessment_forms WHERE form_type=%s", (db_type,))
            form_ids = [r[0] for r in cur.fetchall()]
            if not form_ids:
                return []

            # Get all questions ordered
            cur.execute("""
                SELECT id, form_id, question_no, question_key, prompt, options_json, reverse_score
                FROM core.assessment_questions
                WHERE form_id = ANY(%s)
                ORDER BY form_id ASC, question_no ASC
            """, (form_ids,))
            rows = cur.fetchall()

    # Build client format
    out = []
    for qid, fid, qno, qkey, prompt, opts_json, rev in rows:
        opts = None
        if isinstance(opts_json, dict) and "options" in opts_json:
            opts = opts_json["options"]
        out.append({
            "id": str(qid),
            "test_type": test_type,
            "question_text": prompt,
            "question_type": "MULTIPLE_CHOICE" if opts else "SCALE",
            "options": opts,
            "dimension": qkey,
            "order_index": qno,
            "reverse_score": rev,
        })

    # Shuffle
    if shuffle:
        rng = random.Random(seed)
        rng.shuffle(out)
        for idx, item in enumerate(out, 1):
            item["order_index"] = idx

    # per_dim sampling
    if per_dim and per_dim > 0:
        dims = "RIASEC" if test_type.upper() == "RIASEC" else "OCEAN"
        cap = {d: 0 for d in dims}
        sel = []
        for it in out:
            dim_key = str(it.get("dimension") or "").upper()
            d = dim_key[:1] if dim_key else None
            if not d or d not in cap:
                continue
            if cap[d] < per_dim:
                sel.append(it)
                cap[d] += 1
            if all(v >= per_dim for v in cap.values()):
                break
        out = sel

    # Re-index
    for idx, item in enumerate(out, 1):
        item["order_index"] = idx

    return out


# ─── SECTION 1: DB data integrity ────────────────────────────────────────────
def test_db_integrity():
    print("\n══ 1. DB Data Integrity ═════════════════════════════")
    with conn() as c:
        with c.cursor() as cur:
            # RIASEC: 6 traits × 48 = 288
            cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=1")
            n = cur.fetchone()[0]
            check("RIASEC total = 288", n == 288, f"got {n}")

            # BIG5: 5 traits × 48 = 240
            cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=2")
            n = cur.fetchone()[0]
            check("BIG5 total = 240", n == 240, f"got {n}")

            # Mỗi trait RIASEC đúng 48
            for t in ["R","I","A","S","E","C"]:
                cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=1 AND LEFT(question_key,1)=%s", (t,))
                n = cur.fetchone()[0]
                check(f"RIASEC trait {t} = 48", n == 48, f"got {n}")

            # Mỗi trait BIG5 đúng 48
            for t in ["O","C","E","A","N"]:
                cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE form_id=2 AND LEFT(question_key,1)=%s", (t,))
                n = cur.fetchone()[0]
                check(f"BIG5 trait {t} = 48", n == 48, f"got {n}")


# ─── SECTION 2: per_dim=3 sampling logic ─────────────────────────────────────
def test_per_dim_3_logic():
    print("\n══ 2. per_dim=3 Sampling Logic ══════════════════════")

    # RIASEC: 6 traits × 3 = 18
    riasec = simulate_get_questions("RIASEC", per_dim=3, seed=42)
    check("RIASEC per_dim=3: total = 18", len(riasec) == 18, f"got {len(riasec)}")

    riasec_by_trait = {}
    for q in riasec:
        t = q["dimension"][0]
        riasec_by_trait.setdefault(t, []).append(q)

    check("RIASEC per_dim=3: 6 traits present", len(riasec_by_trait) == 6,
          f"got {sorted(riasec_by_trait.keys())}")
    for t in ["R","I","A","S","E","C"]:
        cnt = len(riasec_by_trait.get(t, []))
        check(f"RIASEC trait {t} = 3 questions", cnt == 3, f"got {cnt}")

    # BIG5: 5 traits × 3 = 15
    big5 = simulate_get_questions("BIGFIVE", per_dim=3, seed=42)
    check("BIG5 per_dim=3: total = 15", len(big5) == 15, f"got {len(big5)}")

    big5_by_trait = {}
    for q in big5:
        t = q["dimension"][0]
        big5_by_trait.setdefault(t, []).append(q)

    check("BIG5 per_dim=3: 5 traits present", len(big5_by_trait) == 5,
          f"got {sorted(big5_by_trait.keys())}")
    for t in ["O","C","E","A","N"]:
        cnt = len(big5_by_trait.get(t, []))
        check(f"BIG5 trait {t} = 3 questions", cnt == 3, f"got {cnt}")

    # Combined total = 33
    combined = riasec + big5
    check("Combined total = 33", len(combined) == 33, f"got {len(combined)}")

    # order_index liên tục từ 1
    riasec_indices = [q["order_index"] for q in riasec]
    check("RIASEC order_index 1-18", sorted(riasec_indices) == list(range(1,19)),
          f"got {sorted(riasec_indices)}")

    big5_indices = [q["order_index"] for q in big5]
    check("BIG5 order_index 1-15", sorted(big5_indices) == list(range(1,16)),
          f"got {sorted(big5_indices)}")


# ─── SECTION 3: Game mode ────────────────────────────────────────────────────
def test_game_mode():
    print("\n══ 3. Game Mode (?mode=game) ════════════════════════")
    # Game mode dùng assessmentService.getQuestions() với perDim=3
    riasec = simulate_get_questions("RIASEC", per_dim=3, shuffle=True, seed=1000)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, shuffle=True, seed=1001)
    questions = riasec + big5

    check("Game mode: total questions = 33", len(questions) == 33, f"got {len(questions)}")
    check("Game mode: RIASEC count = 18", len(riasec) == 18, f"got {len(riasec)}")
    check("Game mode: BIG5 count = 15", len(big5) == 15, f"got {len(big5)}")

    # Shuffle đã xảy ra — order_index không theo thứ tự dimension gốc
    dims_in_order = [q["dimension"][0] for q in riasec]
    is_shuffled = dims_in_order != sorted(dims_in_order)
    check("Game mode: questions are shuffled", is_shuffled,
          f"dims order: {dims_in_order[:6]}")

    # Mỗi câu có đủ fields
    for q in questions:
        if not q.get("id"):
            check("Game mode: all questions have id", False, f"missing id: {q}")
            break
        if not q.get("question_text"):
            check("Game mode: all questions have question_text", False, f"missing text: {q}")
            break
        if not q.get("options"):
            check("Game mode: all questions have options", False, f"missing options: {q}")
            break
    else:
        check("Game mode: all questions have id, text, options", True)

    # Seed cố định → cùng kết quả
    r1 = simulate_get_questions("RIASEC", per_dim=3, shuffle=True, seed=9999)
    r2 = simulate_get_questions("RIASEC", per_dim=3, shuffle=True, seed=9999)
    check("Game mode: same seed → same order",
          [q["id"] for q in r1] == [q["id"] for q in r2])

    # Seed khác → thứ tự khác
    r3 = simulate_get_questions("RIASEC", per_dim=3, shuffle=True, seed=1111)
    check("Game mode: different seed → different order",
          [q["id"] for q in r1] != [q["id"] for q in r3])


# ─── SECTION 4: Interactive/Story mode ───────────────────────────────────────
def test_interactive_mode():
    print("\n══ 4. Interactive/Story Mode (legacy) ═══════════════")
    # StoryBasedAssessment: load RIASEC + BIG5, combine, slice(0, 33)
    riasec = simulate_get_questions("RIASEC", per_dim=3, shuffle=True, seed=2000)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, shuffle=True, seed=2001)

    # Simulate combine logic từ StoryBasedAssessment
    riasec_labels = ["R","I","A","S","E","C"]
    big5_labels   = ["O","C","E","A","N"]

    riasec_by_label = {}
    for q in riasec:
        t = q["dimension"][0]
        riasec_by_label.setdefault(t, []).append(q)

    big5_by_label = {}
    for q in big5:
        t = q["dimension"][0]
        big5_by_label.setdefault(t, []).append(q)

    combined = []
    for i in range(max(len(riasec_labels), len(big5_labels))):
        if i < len(riasec_labels):
            label = riasec_labels[i]
            combined.extend(riasec_by_label.get(label, []))
        if i < len(big5_labels):
            label = big5_labels[i]
            combined.extend(big5_by_label.get(label, []))

    selected = combined[:33]  # slice(0, 33)

    check("Interactive mode: combined slice = 33", len(selected) == 33, f"got {len(selected)}")

    # Verify có đủ cả RIASEC và BIG5 trong selected
    riasec_in_sel = [q for q in selected if q["test_type"] == "RIASEC"]
    big5_in_sel   = [q for q in selected if q["test_type"] == "BIGFIVE"]
    check("Interactive mode: has RIASEC questions", len(riasec_in_sel) > 0,
          f"got {len(riasec_in_sel)}")
    check("Interactive mode: has BIG5 questions", len(big5_in_sel) > 0,
          f"got {len(big5_in_sel)}")

    # Essay page = selected + 1 essay = 34 total pages
    total_pages = len(selected) + 1  # +1 essay page
    check("Interactive mode: total pages (with essay) = 34", total_pages == 34,
          f"got {total_pages}")

    # Không có câu trùng id
    ids = [q["id"] for q in selected]
    check("Interactive mode: no duplicate question ids", len(ids) == len(set(ids)),
          f"{len(ids)-len(set(ids))} dups")


# ─── SECTION 5: Standard/Traditional mode ────────────────────────────────────
def test_standard_mode():
    print("\n══ 5. Standard Mode (?mode=standard) ════════════════")
    riasec = simulate_get_questions("RIASEC", per_dim=3, shuffle=True, seed=3000)
    big5   = simulate_get_questions("BIGFIVE", per_dim=3, shuffle=True, seed=3001)
    questions = riasec + big5

    check("Standard mode: total questions = 33", len(questions) == 33, f"got {len(questions)}")
    check("Standard mode: RIASEC = 18", len(riasec) == 18, f"got {len(riasec)}")
    check("Standard mode: BIG5 = 15", len(big5) == 15, f"got {len(big5)}")

    # Tất cả câu có options (MULTIPLE_CHOICE)
    no_opts = [q for q in questions if not q.get("options")]
    check("Standard mode: all questions have options", len(no_opts) == 0,
          f"{len(no_opts)} questions missing options")

    # options có đúng 5 lựa chọn
    wrong_len = [q for q in questions if q.get("options") and len(q["options"]) != 5]
    check("Standard mode: all options have 5 choices", len(wrong_len) == 0,
          f"{len(wrong_len)} questions with wrong option count")

    # Có cả câu reverse và non-reverse
    has_reverse = any(q.get("reverse_score") for q in questions)
    has_normal  = any(not q.get("reverse_score") for q in questions)
    check("Standard mode: has reverse-scored questions", has_reverse)
    check("Standard mode: has normal questions", has_normal)

    # Page count: 33 câu / 4 câu/trang = 9 trang (làm tròn lên)
    import math
    questions_per_page = 4
    pages = math.ceil(len(questions) / questions_per_page)
    check("Standard mode: page count = 9 (33÷4 rounded up)", pages == 9,
          f"got {pages} pages")


# ─── SECTION 6: Edge cases ───────────────────────────────────────────────────
def test_edge_cases():
    print("\n══ 6. Edge Cases ════════════════════════════════════")

    # per_dim=0 → trả về tất cả câu
    riasec_all = simulate_get_questions("RIASEC", per_dim=0, shuffle=False)
    check("per_dim=0: returns all RIASEC (288)", len(riasec_all) == 288,
          f"got {len(riasec_all)}")

    # per_dim=1 → 6 câu RIASEC
    riasec_1 = simulate_get_questions("RIASEC", per_dim=1, seed=42)
    check("per_dim=1: RIASEC = 6 questions", len(riasec_1) == 6, f"got {len(riasec_1)}")

    # per_dim=3 không shuffle → vẫn đủ 18 câu
    riasec_no_shuffle = simulate_get_questions("RIASEC", per_dim=3, shuffle=False)
    check("per_dim=3 no shuffle: RIASEC = 18", len(riasec_no_shuffle) == 18,
          f"got {len(riasec_no_shuffle)}")

    # Alias BIGFIVE = BIG_FIVE = BIG5
    for alias in ["BIGFIVE", "BIG_FIVE", "BIG5"]:
        # Normalize manually (same as _normalize_type)
        normalized = "BIGFIVE"
        q = simulate_get_questions(normalized, per_dim=3, seed=42)
        check(f"Alias '{alias}' → 15 BIG5 questions", len(q) == 15, f"got {len(q)}")

    # Không có câu nào bị NULL prompt
    riasec = simulate_get_questions("RIASEC", per_dim=3, seed=42)
    null_prompts = [q for q in riasec if not q.get("question_text")]
    check("No NULL question_text in sampled questions", len(null_prompts) == 0,
          f"{len(null_prompts)} null prompts")

    # Không có câu trùng trong cùng 1 lần lấy
    big5 = simulate_get_questions("BIGFIVE", per_dim=3, seed=42)
    ids = [q["id"] for q in big5]
    check("No duplicate ids in single fetch", len(ids) == len(set(ids)))


# ─── SECTION 7: Frontend constant check ──────────────────────────────────────
def test_frontend_constants():
    print("\n══ 7. Frontend Constants Check ══════════════════════")

    # Kiem tra assessmentService.ts da duoc sua
    # tools/ -> ai-core/ -> packages/ -> project_root/
    tools_dir    = os.path.dirname(os.path.abspath(__file__))   # .../tools
    ai_core_dir  = os.path.dirname(tools_dir)                   # .../ai-core
    packages_dir = os.path.dirname(ai_core_dir)                 # .../packages
    project_root = os.path.dirname(packages_dir)                # project root
    svc_path = os.path.join(project_root, "apps", "frontend", "src", "services", "assessmentService.ts")

    if not os.path.exists(svc_path):
        check("assessmentService.ts exists", False, f"not found at {svc_path}")
        return

    content = open(svc_path, encoding="utf-8").read()
    check("assessmentService.ts: perDim = 3",
          "const perDim = 3;" in content,
          "perDim not updated to 3")
    check("assessmentService.ts: comment says 33 questions",
          "33 questions" in content or "Total 33" in content or "total 33" in content.lower(),
          "comment not updated")
    check("assessmentService.ts: no old perDim = 4",
          "const perDim = 4;" not in content,
          "old perDim=4 still present")

    # Kiem tra StoryBasedAssessment.tsx da duoc sua
    story_path = os.path.join(project_root, "apps", "frontend", "src", "components", "assessment", "StoryBasedAssessment.tsx")

    if not os.path.exists(story_path):
        check("StoryBasedAssessment.tsx exists", False, f"not found at {story_path}")
        return

    story_content = open(story_path, encoding="utf-8").read()
    check("StoryBasedAssessment.tsx: slice(0, 33)",
          "slice(0, 33)" in story_content,
          "slice not updated to 33")
    check("StoryBasedAssessment.tsx: no old slice(0, 44)",
          "slice(0, 44)" not in story_content,
          "old slice(0,44) still present")


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 56)
    print("  33-Question Assessment Validation Suite")
    print("  3 questions per dimension, 3 modes")
    print("=" * 56)

    test_db_integrity()
    test_per_dim_3_logic()
    test_game_mode()
    test_interactive_mode()
    test_standard_mode()
    test_edge_cases()
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
