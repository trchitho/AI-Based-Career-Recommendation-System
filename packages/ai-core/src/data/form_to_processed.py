# src/data/form_to_processed.py
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd

INPUT_CSV = Path("data/raw/form_responses.csv")
OUT_CSV = Path("data/processed/responses_processed.csv")
OUT_JSONL = Path("data/processed/responses_processed.jsonl")


# ================= Helpers =================
def norm_space(s: str) -> str:
    return re.sub(r"\s+", " ", str(s)).strip()


def contains_all(haystack: str, *frags: str) -> bool:
    h = norm_space(haystack).casefold()
    return all(norm_space(f).casefold() in h for f in frags)


def find_col_by_fragments(columns, *frags, required=True):
    """Tìm cột chứa TẤT CẢ các mẫu chuỗi (không phân biệt hoa/thường, bỏ space thừa)."""
    for c in columns:
        if contains_all(c, *frags):
            return c
    if required:
        raise KeyError(f"Không tìm thấy cột khớp với: {frags}")
    return None


def find_group_by_fragments(columns, fragment_pairs, used):
    """
    Tìm 2 cột cho 1 trait dựa vào list các mẫu chuỗi (mỗi phần tử là tuple các từ khoá).
    Mỗi lần match xong loại cột khỏi pool để tránh trùng.
    """
    cols = []
    pool = [c for c in columns if c not in used]
    for frags in fragment_pairs:
        col = find_col_by_fragments(pool, *frags)
        cols.append(col)
        used.add(col)
        pool.remove(col)
    return cols


def norm_likert(x):
    try:
        x = float(x)
        if np.isnan(x):
            return np.nan
        # 1..5 -> 0..1
        return (x - 1.0) / 4.0
    except Exception:
        return np.nan


def join_jobs(x):
    if pd.isna(x):
        return ""
    parts = [p.strip() for p in str(x).replace(";", ",").split(",") if p.strip()]
    return "|".join(parts)


# ============== Read CSV (handle BOM) ==============
df = pd.read_csv(INPUT_CSV, encoding="utf-8-sig")

# ============== Detect ESSAY / JOBS columns ==============
ESSAY_COL = find_col_by_fragments(df.columns, "Hy vit mt on ngn", "s thch", "im mnh")
JOBS_COL = find_col_by_fragments(df.columns, "Nghề nghip", "quan tâm")

# ============== Detect RIASEC + Big Five columns ==============
# Dựa theo các "mẫu" ngắn gọn khớp template đã dùng. Bạn có thể đổi từ khoá nếu form khác.
used_cols = set()

# RIASEC (6 traits, mỗi trait 2 câu)
R_cols = find_group_by_fragments(
    df.columns,
    [
        ("sửa chữa", "lắp ráp"),
        ("làm vic ngoài trời",),
    ],
    used_cols,
)

I_cols = find_group_by_fragments(
    df.columns,
    [
        ("nghin cu", "vn  phc tp"),
        ("giải quyết", "khoa học"),
    ],
    used_cols,
)

A_cols = find_group_by_fragments(
    df.columns,
    [
        ("v, vit",),  # nếu tiêu đề của bạn không có dấu phụ, đổi thành ("v", "vit")
        ("nghệ thuật", "âm nhạc"),
    ],
    used_cols,
)

S_cols = find_group_by_fragments(
    df.columns,
    [
        ("gip ", "lng nghe"),
        ("hoạt động cộng đồng",),
    ],
    used_cols,
)

E_cols = find_group_by_fragments(
    df.columns,
    [
        ("lãnh ạo", "iều phi"),
        ("thuyết phục", "đàm phán"),
    ],
    used_cols,
)

C_cols = find_group_by_fragments(
    df.columns,
    [
        ("lập kế hoạch", "tài liệu"),
        ("quy trnh", "quy nh"),
    ],
    used_cols,
)

# Big Five (5 traits, mỗi trait 2 câu)
O_cols = find_group_by_fragments(
    df.columns,
    [
        ("t m", " tng mi"),
        ("thử nghiệm", "cách tiếp cận"),
    ],
    used_cols,
)

C5_cols = find_group_by_fragments(
    df.columns,
    [
        ("hon thnh cng vic", "ng hn"),
        ("kế hoạch chi tiết",),
    ],
    used_cols,
)

E5_cols = find_group_by_fragments(
    df.columns,
    [
        ("bắt chuyn", "người lạ"),
        ("tràn ầy nng lượng", "nhiều người"),
    ],
    used_cols,
)

A5_cols = find_group_by_fragments(
    df.columns,
    [
        ("quan tm", "cm xc"),
        ("hợp tác", "cạnh tranh"),
    ],
    used_cols,
)

N_cols = find_group_by_fragments(
    df.columns,
    [
        ("lo lắng", "vic nhỏ"),
        ("căng thẳng", "áp lực"),
    ],
    used_cols,
)

# In ra để bạn kiểm tra cột nào được map (có thể comment dòng dưới)
print("[MAP] R:", R_cols)
print("[MAP] I:", I_cols)
print("[MAP] A:", A_cols)
print("[MAP] S:", S_cols)
print("[MAP] E:", E_cols)
print("[MAP] C:", C_cols)
print("[MAP] O:", O_cols)
print("[MAP] C5:", C5_cols)
print("[MAP] E5:", E5_cols)
print("[MAP] A5:", A5_cols)
print("[MAP] N:", N_cols)
print("[MAP] ESSAY:", ESSAY_COL)
print("[MAP] JOBS :", JOBS_COL)

# ============== Build output ==============
# user_id & language
df.insert(0, "user_id", range(1, len(df) + 1))
df["language"] = "vi"

# Normalize Likert
for group in [
    R_cols,
    I_cols,
    A_cols,
    S_cols,
    E_cols,
    C_cols,
    O_cols,
    C5_cols,
    E5_cols,
    A5_cols,
    N_cols,
]:
    for c in group:
        df[c] = df[c].apply(norm_likert)

# Average per trait
df["R"] = df[R_cols].mean(axis=1)
df["I"] = df[I_cols].mean(axis=1)
df["A"] = df[A_cols].mean(axis=1)
df["S"] = df[S_cols].mean(axis=1)
df["E"] = df[E_cols].mean(axis=1)
df["C"] = df[C_cols].mean(axis=1)

df["O"] = df[O_cols].mean(axis=1)
df["C2"] = df[C5_cols].mean(axis=1)  # Big Five C -> C2 — không trùng C của RIASEC
df["E2"] = df[E5_cols].mean(axis=1)
df["A2"] = df[A5_cols].mean(axis=1)
df["N"] = df[N_cols].mean(axis=1)

# Essay & jobs
df["essay_text"] = df[ESSAY_COL].fillna("").astype(str)
df["target_jobs"] = df[JOBS_COL].apply(join_jobs)

# Final schema
out = df[
    [
        "user_id",
        "language",
        "essay_text",
        "R",
        "I",
        "A",
        "S",
        "E",
        "C",
        "O",
        "C2",
        "E2",
        "A2",
        "N",
        "target_jobs",
    ]
]

# Save
OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
out.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")

with open(OUT_JSONL, "w", encoding="utf-8") as f:
    for _, row in out.iterrows():
        f.write(json.dumps(row.to_dict(), ensure_ascii=False) + "\n")

print(f"OK -> {OUT_CSV}")
print(f"OK -> {OUT_JSONL}")
