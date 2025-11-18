# src/data/build_jobs_catalog.py
from __future__ import annotations

import argparse
import json
import os

import pandas as pd

from .esco_io import build_isco_tags_from_value, load_esco_csv, load_isco_tree
from .matchers import build_fuzzy_map
from .onet_io import load_onet_core, load_onet_riasec, load_onet_skills

OUT_PATH = "data/catalog/jobs.csv"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=OUT_PATH)
    parser.add_argument("--topn_onet_skills", type=int, default=15)
    parser.add_argument("--min_importance", type=int, default=50)
    parser.add_argument("--fuzzy_threshold", type=int, default=90)
    parser.add_argument(
        "--max_fuzzy_candidates",
        type=int,
        default=300,
        help="Giới hạn ứng viên fuzzy sau bước blocking (để nhanh và ổn định)",
    )
    parser.add_argument(
        "--exact_only",
        action="store_true",
        help="Chỉ exact match tiêu đề O*NET ↔ ESCO (nhanh nhất, an toàn)",
    )
    parser.add_argument(
        "--add_isco_tags",
        action="store_true",
        help="Gắn tags ISCO dựa trên ESCO + ISCOGroups_en.csv",
    )
    args = parser.parse_args()

    # -------------------------------------------------------------
    # 1) O*NET: core + RIASEC + skills
    # -------------------------------------------------------------
    core = load_onet_core()  # job_id, title, Description, title_norm
    riasec = load_onet_riasec()  # job_id, R..C (đã scale 0..1)
    onet_sk = load_onet_skills(
        args.topn_onet_skills, args.min_importance
    )  # job_id, skills_onet(list)

    # Merge 3 bảng O*NET theo job_id
    onet = core.merge(riasec, on="job_id", how="left").merge(onet_sk, on="job_id", how="left")
    onet["job_id"] = onet["job_id"].astype(str).str.strip()

    # Chuẩn hoá 6 cột RIASEC để không có NaN và nằm trong [0..1]
    dims = ["R", "I", "A", "S", "E", "C"]
    for d in dims:
        if d not in onet.columns:
            onet[d] = 0.0
        onet[d] = pd.to_numeric(onet[d], errors="coerce").fillna(0.0).clip(0, 1)

    # Đảm bảo skills_onet là list (nếu NaN -> [])
    onet["skills_onet"] = onet["skills_onet"].apply(lambda v: v if isinstance(v, list) else [])

    # -------------------------------------------------------------
    # 2) ESCO: đọc occupations/skills/relations (+ phát hiện cột ISCO nếu có)
    # -------------------------------------------------------------
    esco_occ, esco_occ_full, essential_map, optional_map, esco_title_col, occ_uri_col, isco_col = (
        load_esco_csv()
    )
    # Dựng chỉ mục nhanh
    esco_title_norm_to_uri = dict(zip(esco_occ["title_norm"], esco_occ[occ_uri_col], strict=False))
    occ_by_uri = esco_occ.set_index(occ_uri_col, drop=False)
    # Nạp cây ISCO nếu bật cờ
    isco_tree = load_isco_tree() if args.add_isco_tags else None

    # Fuzzy map: O*NET title_norm -> ESCO title_norm (hoặc exact-only)
    if args.exact_only:
        esco_title_set = set(esco_occ["title_norm"].fillna("").tolist())
        fuzzy_map = {
            r["job_id"]: r["title_norm"]
            for _, r in onet.iterrows()
            if isinstance(r["title_norm"], str) and r["title_norm"] in esco_title_set
        }
    else:
        fuzzy_map = build_fuzzy_map(
            onet,
            esco_occ,
            esco_title_col,
            threshold=args.fuzzy_threshold,
            max_candidates=args.max_fuzzy_candidates,
        )

    # Chuáº©n bá»‹ tra cá»©u nhanh: title_norm -> occupation URI
    esco_title_norm_to_uri = dict(zip(esco_occ["title_norm"], esco_occ[occ_uri_col], strict=False))

    # (Tiá»‡n lá»£i) Táº¡o index theo occupation URI Ä‘á»ƒ láº¥y dÃ²ng ESCO nhanh khi gáº¯n ISCO
    occ_by_uri = esco_occ.set_index(occ_uri_col, drop=False)

    # Náº¡p cÃ¢y ISCO (náº¿u báº­t cá»): tráº£ vá» {"by_uri": {...}, "by_notation": {...}}
    isco_tree = load_isco_tree() if args.add_isco_tags else None

    # -------------------------------------------------------------
    # 3) GhÃ©p ká»¹ nÄƒng tá»« ESCO + Gáº¯n ISCO tags (náº¿u cÃ³ dá»¯ liá»‡u)
    # -------------------------------------------------------------
    skills_ess, skills_opt, tags = [], [], []

    for _, r in onet.iterrows():
        en, op, tg = [], [], []
        norm = fuzzy_map.get(r["job_id"])
        occ_uri_val = esco_title_norm_to_uri.get(norm) if norm else None

        if occ_uri_val:
            # Ká»¹ nÄƒng
            en = essential_map.get(occ_uri_val, [])
            op = optional_map.get(occ_uri_val, [])

            # ------ ISCO tags (an toÃ n) ------
            if isco_tree is not None:
                tg = []
                if isco_tree is not None:
                    isco_value = None
                    if (
                        occ_uri_val
                        and (occ_uri_val in occ_by_uri.index)
                        and isco_col
                        and (isco_col in occ_by_uri.columns)
                    ):
                        cell = occ_by_uri.loc[occ_uri_val, isco_col]
                        # cell cÃ³ thá»ƒ lÃ  Series náº¿u index khÃ´ng unique â†’ láº¥y giÃ¡ trá»‹ Ä‘áº§u
                        if isinstance(cell, pd.Series):
                            cell = cell.iloc[0]
                        isco_value = str(cell).strip() if pd.notna(cell) else None

                    # Æ¯u tiÃªn gáº¯n theo mÃ£ (code) trong CSV; náº¿u khÃ´ng cÃ³ thÃ¬ fallback leo tá»« chÃ­nh occupation URI
                    tg = build_isco_tags_from_value(isco_value, isco_tree) if isco_value else []
                    if not tg and occ_uri_val:
                        tg = build_isco_tags_from_value(occ_uri_val, isco_tree)

        # --------------------------------------

        skills_ess.append(en)
        skills_opt.append(op)
        tags.append(tg)

    onet["skills_esco_essential"] = skills_ess
    onet["skills_esco_optional"] = skills_opt
    onet["tags"] = tags

    # --- Fallback: nghá» .xx mÆ°á»£n ká»¹ nÄƒng tá»« nghá» gá»‘c .00 náº¿u thiáº¿u ---
    # Táº¡o map base_code -> skills_onet tá»« báº£ng onet_sk gá»‘c
    def _base_code(s: str) -> str:
        s = str(s or "").strip()
        return s.split(".")[0] if "." in s else s

    base_to_skills = (
        onet_sk.assign(_base=onet_sk["job_id"].map(_base_code))
        .groupby("_base")["skills_onet"]
        .first()
        .to_dict()
    )

    # Náº¿u skills_onet hiá»‡n khÃ´ng pháº£i list (NaN/None/""), mÆ°á»£n tá»« base
    def _borrow_if_missing(job_id, val):
        if isinstance(val, list) and len(val) > 0:
            return val
        base = _base_code(job_id)
        return base_to_skills.get(base, [])

    onet["skills_onet"] = [
        _borrow_if_missing(j, v) for j, v in zip(onet["job_id"], onet["skills_onet"], strict=False)
    ]

    # -------------------------------------------------------------
    # 4) Há»£p nháº¥t skills: ESCO essential -> O*NET -> ESCO optional
    # -------------------------------------------------------------
    def merge_skills(row):
        s = []

        def add_unique(xs):
            # xs cÃ³ thá»ƒ lÃ  list / NaN / str (JSON list) -> chuáº©n hoÃ¡ vá» list rá»“i thÃªm khÃ´ng trÃ¹ng
            if isinstance(xs, list):
                it = xs
            elif pd.isna(xs):
                it = []
            elif isinstance(xs, str):
                try:
                    parsed = json.loads(xs)
                    it = parsed if isinstance(parsed, list) else [xs]
                except Exception:
                    it = [xs]
            else:
                it = []
            for x in it:
                if x not in s:
                    s.append(x)

        add_unique(row.get("skills_esco_essential", []))
        add_unique(row.get("skills_onet", []))
        add_unique(row.get("skills_esco_optional", []))
        return s

    onet["skills"] = onet.apply(merge_skills, axis=1)

    # -------------------------------------------------------------
    # 5) RIASEC vector 6 chiá»u (JSON), xuáº¥t CSV
    # -------------------------------------------------------------
    def to_vec(row):
        vals = [float(row[d]) for d in dims]
        return json.dumps(vals, allow_nan=False)

    onet["riasec_vector"] = onet.apply(to_vec, axis=1)

    # Chuáº©n hoÃ¡ tÃªn cá»™t mÃ´ táº£ vÃ  chá»n cá»™t xuáº¥t
    onet = onet.rename(columns={"Description": "description"})
    out = onet[["job_id", "title", "description", "skills", "riasec_vector"]].copy()

    # skills: join ; Ä‘á»ƒ CSV-friendly. tags: giá»¯ list JSON Ä‘á»ƒ dá»… parse ngÆ°á»£c (tuá»³ báº¡n)
    out["skills"] = out["skills"].apply(lambda xs: ";".join(xs))
    # Náº¿u muá»‘n join tags luÃ´n: báº­t dÃ²ng dÆ°á»›i
    # out["tags"] = out["tags"].apply(lambda xs: ";".join(xs))

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    out.to_csv(args.out, index=False, encoding="utf-8")
    print(f"[OK] Wrote {args.out} with {len(out)} rows.")


if __name__ == "__main__":
    main()
