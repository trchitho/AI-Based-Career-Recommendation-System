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
    """TÃ¬m cá»™t chá»©a Táº¤T Cáº¢ cÃ¡c máº©u chuá»—i (khÃ´ng phÃ¢n biá»‡t hoa/thÆ°á»ng, bá» space thá»«a)."""
    for c in columns:
        if contains_all(c, *frags):
            return c
    if required:
        raise KeyError(f"KhÃ´ng tÃ¬m tháº¥y cá»™t khá»›p vá»›i: {frags}")
    return None


def find_group_by_fragments(columns, fragment_pairs, used):
    """
    TÃ¬m 2 cá»™t cho 1 trait dá»±a vÃ o list cÃ¡c máº©u chuá»—i (má»—i pháº§n tá»­ lÃ  tuple cÃ¡c tá»« khÃ³a).
    Má»—i láº§n match xong loáº¡i cá»™t Ä‘Ã³ khá»i pool Ä‘á»ƒ trÃ¡nh trÃ¹ng.
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
ESSAY_COL = find_col_by_fragments(df.columns, "HÃ£y viáº¿t má»™t Ä‘oáº¡n ngáº¯n", "sá»Ÿ thÃ­ch", "Ä‘iá»ƒm máº¡nh")
JOBS_COL = find_col_by_fragments(df.columns, "Nghá» nghiá»‡p", "quan tÃ¢m")

# ============== Detect RIASEC + Big Five columns ==============
# DÃ² theo cÃ¡c "máº©u" ngáº¯n gá»n khá»›p template Ä‘Ã£ dÃ¹ng. Báº¡n cÃ³ thá»ƒ Ä‘á»•i tá»« khÃ³a náº¿u form khÃ¡c.
used_cols = set()

# RIASEC (6 traits, má»—i trait 2 cÃ¢u)
R_cols = find_group_by_fragments(
    df.columns,
    [
        ("sá»­a chá»¯a", "láº¯p rÃ¡p"),
        ("lÃ m viá»‡c ngoÃ i trá»i",),
    ],
    used_cols,
)

I_cols = find_group_by_fragments(
    df.columns,
    [
        ("nghiÃªn cá»©u", "váº¥n Ä‘á» phá»©c táº¡p"),
        ("giáº£i quyáº¿t", "khoa há»c"),
    ],
    used_cols,
)

A_cols = find_group_by_fragments(
    df.columns,
    [
        ("váº½, viáº¿t",),  # náº¿u tiÃªu Ä‘á» cá»§a báº¡n khÃ´ng cÃ³ dáº¥u pháº©y, Ä‘á»•i thÃ nh ("váº½", "viáº¿t")
        ("nghá»‡ thuáº­t", "Ã¢m nháº¡c"),
    ],
    used_cols,
)

S_cols = find_group_by_fragments(
    df.columns,
    [
        ("giÃºp Ä‘á»¡", "láº¯ng nghe"),
        ("hoáº¡t Ä‘á»™ng cá»™ng Ä‘á»“ng",),
    ],
    used_cols,
)

E_cols = find_group_by_fragments(
    df.columns,
    [
        ("lÃ£nh Ä‘áº¡o", "Ä‘iá»u phá»‘i"),
        ("thuyáº¿t phá»¥c", "Ä‘Ã m phÃ¡n"),
    ],
    used_cols,
)

C_cols = find_group_by_fragments(
    df.columns,
    [
        ("láº­p káº¿ hoáº¡ch", "tÃ i liá»‡u"),
        ("quy trÃ¬nh", "quy Ä‘á»‹nh"),
    ],
    used_cols,
)

# Big Five (5 traits, má»—i trait 2 cÃ¢u)
O_cols = find_group_by_fragments(
    df.columns,
    [
        ("tÃ² mÃ²", "Ã½ tÆ°á»Ÿng má»›i"),
        ("thá»­ nghiá»‡m", "cÃ¡ch tiáº¿p cáº­n"),
    ],
    used_cols,
)

C5_cols = find_group_by_fragments(
    df.columns,
    [
        ("hoÃ n thÃ nh cÃ´ng viá»‡c", "Ä‘Ãºng háº¡n"),
        ("káº¿ hoáº¡ch chi tiáº¿t",),
    ],
    used_cols,
)

E5_cols = find_group_by_fragments(
    df.columns,
    [
        ("báº¯t chuyá»‡n", "ngÆ°á»i láº¡"),
        ("trÃ n Ä‘áº§y nÄƒng lÆ°á»£ng", "nhiá»u ngÆ°á»i"),
    ],
    used_cols,
)

A5_cols = find_group_by_fragments(
    df.columns,
    [
        ("quan tÃ¢m", "cáº£m xÃºc"),
        ("há»£p tÃ¡c", "cáº¡nh tranh"),
    ],
    used_cols,
)

N_cols = find_group_by_fragments(
    df.columns,
    [
        ("lo láº¯ng", "viá»‡c nhá»"),
        ("cÄƒng tháº³ng", "Ã¡p lá»±c"),
    ],
    used_cols,
)

# In ra Ä‘á»ƒ báº¡n kiá»ƒm tra cá»™t nÃ o Ä‘Æ°á»£c map (cÃ³ thá»ƒ comment dÃ²ng dÆ°á»›i)
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
df["C2"] = df[C5_cols].mean(axis=1)  # Big Five C -> C2 Ä‘á»ƒ khÃ´ng Ä‘Ã¨ C cá»§a RIASEC
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
