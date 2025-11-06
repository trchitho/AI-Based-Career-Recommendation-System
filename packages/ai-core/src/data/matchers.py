# src/data/matchers.py
from __future__ import annotations

from collections import Counter, defaultdict

import pandas as pd
from rapidfuzz import fuzz, process
from unidecode import unidecode


def normalize_title(s: str) -> str:
    """
    Hạ chữ thường, bỏ dấu (unidecode), gộp khoảng trắng → tạo khóa title_norm.
    Dùng cho matching “O*NET ↔ ESCO” theo tiêu đề.
    """
    s = (s or "").strip().lower()
    s = unidecode(s)
    return " ".join(s.split())


def build_token_index(titles_norm: list[str]) -> dict[str, list[int]]:
    """
    Tạo chỉ mục token -> indices giúp blocking trước khi fuzzy.
    Mỗi token chỉ ghi một lần/tiêu đề (set) để tránh thiên vị tiêu đề dài.
    """
    idx = defaultdict(list)
    for i, t in enumerate(titles_norm):
        if not isinstance(t, str) or not t:
            continue
        for tok in set(t.split()):
            if tok:
                idx[tok].append(i)
    return idx


def build_fuzzy_map(
    onet_core: pd.DataFrame,
    esco_occ: pd.DataFrame,
    esco_title_col: str,
    threshold: int = 90,
    max_candidates: int = 300,
) -> dict[str, str]:
    """
    Trả về: map O*NET job_id -> ESCO title_norm
      - Exact match trước
      - Sau đó blocking theo token để giới hạn ứng viên rồi mới fuzzy
    """
    esco_titles = esco_occ["title_norm"].fillna("").tolist()
    esco_title_set = set(esco_titles)
    token_index = build_token_index(esco_titles)

    mapping: dict[str, str] = {}

    for _, r in onet_core.iterrows():
        t = r.get("title_norm", "")
        if not isinstance(t, str) or not t:
            continue

        # 1) Exact match siêu nhanh
        if t in esco_title_set:
            mapping[r["job_id"]] = t
            continue

        # 2) Blocking: lấy ứng viên theo token overlap
        tokens = set(t.split())
        cand_counter = Counter()
        for tok in tokens:
            for i in token_index.get(tok, []):
                cand_counter[i] += 1

        if not cand_counter:
            # không có overlap token -> bỏ qua (không enrich từ ESCO)
            continue

        # 3) Chọn top-K ứng viên theo số token chung
        top_idx = [i for i, _ in cand_counter.most_common(max_candidates)]
        candidates = [esco_titles[i] for i in top_idx]

        # 4) Fuzzy chỉ trên nhóm nhỏ này
        best = process.extractOne(t, candidates, scorer=fuzz.WRatio, score_cutoff=threshold)
        if best:
            mapping[r["job_id"]] = best[0]

    return mapping
