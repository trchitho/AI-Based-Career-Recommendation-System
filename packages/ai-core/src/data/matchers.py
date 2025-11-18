# src/data/matchers.py
from __future__ import annotations

from collections import Counter, defaultdict

import pandas as pd
from rapidfuzz import fuzz, process
from unidecode import unidecode


def normalize_title(s: str) -> str:
    """
    Háº¡ chá»¯ thÆ°á»ng, bá» dáº¥u (unidecode), gá»™p khoáº£ng tráº¯ng â†’ táº¡o khÃ³a title_norm.
    DÃ¹ng cho matching â€œO*NET â†” ESCOâ€ theo tiÃªu Ä‘á».
    """
    s = (s or "").strip().lower()
    s = unidecode(s)
    return " ".join(s.split())


def build_token_index(titles_norm: list[str]) -> dict[str, list[int]]:
    """
    Táº¡o chá»‰ má»¥c token -> indices giÃºp blocking trÆ°á»›c khi fuzzy.
    Má»—i token chá»‰ ghi má»™t láº§n/tiÃªu Ä‘á» (set) Ä‘á»ƒ trÃ¡nh thiÃªn vá»‹ tiÃªu Ä‘á» dÃ i.
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
    Tráº£ vá»: map O*NET job_id -> ESCO title_norm
      - Exact match trÆ°á»›c
      - Sau Ä‘Ã³ blocking theo token Ä‘á»ƒ giá»›i háº¡n á»©ng viÃªn rá»“i má»›i fuzzy
    """
    esco_titles = esco_occ["title_norm"].fillna("").tolist()
    esco_title_set = set(esco_titles)
    token_index = build_token_index(esco_titles)

    mapping: dict[str, str] = {}

    for _, r in onet_core.iterrows():
        t = r.get("title_norm", "")
        if not isinstance(t, str) or not t:
            continue

        # 1) Exact match siÃªu nhanh
        if t in esco_title_set:
            mapping[r["job_id"]] = t
            continue

        # 2) Blocking: láº¥y á»©ng viÃªn theo token overlap
        tokens = set(t.split())
        cand_counter = Counter()
        for tok in tokens:
            for i in token_index.get(tok, []):
                cand_counter[i] += 1

        if not cand_counter:
            # khÃ´ng cÃ³ overlap token -> bá» qua (khÃ´ng enrich tá»« ESCO)
            continue

        # 3) Chá»n top-K á»©ng viÃªn theo sá»‘ token chung
        top_idx = [i for i, _ in cand_counter.most_common(max_candidates)]
        candidates = [esco_titles[i] for i in top_idx]

        # 4) Fuzzy chá»‰ trÃªn nhÃ³m nhá» nÃ y
        best = process.extractOne(t, candidates, scorer=fuzz.WRatio, score_cutoff=threshold)
        if best:
            mapping[r["job_id"]] = best[0]

    return mapping
