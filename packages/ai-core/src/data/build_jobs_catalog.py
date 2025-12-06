# src/data/build_jobs_catalog.py
from __future__ import annotations

import argparse
import json
import os
from typing import Any

import pandas as pd

from .esco_io import build_isco_tags_from_value, load_esco_csv, load_isco_tree
from .matchers import build_fuzzy_map
from .onet_io import load_onet_core, load_onet_riasec, load_onet_skills

OUT_PATH = "data/catalog/jobs.csv"


# ------------------------ helpers ------------------------


ALL_OTHER_PHRASES = ("all other", "not listed separately")


def is_all_other_row(row: pd.Series) -> bool:
    """Heuristic phát hiện các job kiểu 'All Other' / 'not listed separately'."""
    title = str(row.get("title") or "").lower()
    desc = str(
        row.get("Description") or row.get("description") or ""
    ).lower()  # core có thể dùng 'Description' (O*NET)
    title_norm = str(row.get("title_norm") or "").lower()

    for kw in ALL_OTHER_PHRASES:
        if kw in title or kw in desc or kw in title_norm:
            return True
    return False


def base_code(job_id: str | None) -> str:
    s = str(job_id or "").strip()
    return s.split(".")[0] if "." in s else s


def normalize_list(v: Any) -> list[str]:
    """Chuẩn hóa 1 ô thành list[str]."""
    if isinstance(v, list):
        return v
    if v is None or (isinstance(v, float) and pd.isna(v)):  # NaN
        return []
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return []
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
            return [str(parsed)]
        except Exception:
            # Chuỗi thường, không phải JSON
            return [v]
    return []


# ------------------------ main ------------------------


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=OUT_PATH)
    parser.add_argument("--topn_onet_skills", type=int, default=15)
    parser.add_argument("--min_importance", type=int, default=50)
    parser.add_argument("--fuzzy_threshold", type=int, default=90)
    parser.add_argument(
        "--max_fuzzy_candidates",
        type=int,
        default=300,
        help="Giới hạn ứng viên fuzzy sau bước blocking (nhanh và nhẹ)",
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
    onet = core.merge(riasec, on="job_id", how="left").merge(
        onet_sk, on="job_id", how="left"
    )
    onet["job_id"] = onet["job_id"].astype(str).str.strip()

    # Chuẩn hoá 6 cột RIASEC, không có NaN và nằm trong [0..1]
    dims = ["R", "I", "A", "S", "E", "C"]
    for d in dims:
        if d not in onet.columns:
            onet[d] = 0.0
        onet[d] = pd.to_numeric(onet[d], errors="coerce").fillna(0.0).clip(0, 1)

    # Đảm bảo skills_onet là list (nếu NaN -> [])
    onet["skills_onet"] = onet["skills_onet"].apply(
        lambda v: v if isinstance(v, list) else []
    )

    # ---------------- CLEAN: loại bỏ nghề "All Other" ----------------
    mask_all_other = onet.apply(is_all_other_row, axis=1)
    # Option: loại thêm các nghề RIASEC toàn 0
    mask_zero_riasec = onet[dims].sum(axis=1) == 0.0
    drop_mask = mask_all_other | mask_zero_riasec
    before = len(onet)
    onet = onet[~drop_mask].reset_index(drop=True)
    after = len(onet)
    print(f"[CLEAN] Dropped {before - after} 'All Other'/zero-RIASEC occupations")

    # -------------------------------------------------------------
    # 2) ESCO: occupations/skills/relations (+ ISCO nếu có)
    # -------------------------------------------------------------
    (
        esco_occ,
        esco_occ_full,
        essential_map,
        optional_map,
        esco_title_col,
        occ_uri_col,
        isco_col,
    ) = load_esco_csv()
    esco_title_norm_to_uri = dict(
        zip(esco_occ["title_norm"], esco_occ[occ_uri_col], strict=False)
    )
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

    # -------------------------------------------------------------
    # 3) Ghép kỹ năng từ ESCO + gắn ISCO tags (nếu có)
    # -------------------------------------------------------------
    skills_ess: list[list[str]] = []
    skills_opt: list[list[str]] = []
    tags: list[list[str]] = []

    for _, r in onet.iterrows():
        en: list[str] = []
        op: list[str] = []
        tg: list[str] = []

        norm = fuzzy_map.get(r["job_id"])
        occ_uri_val = esco_title_norm_to_uri.get(norm) if norm else None

        if occ_uri_val:
            # Kỹ năng
            en = essential_map.get(occ_uri_val, [])
            op = optional_map.get(occ_uri_val, [])

            # ------ ISCO tags ------
            if isco_tree is not None:
                tg = []
                isco_value = None
                if (
                    occ_uri_val
                    and (occ_uri_val in occ_by_uri.index)
                    and isco_col
                    and (isco_col in occ_by_uri.columns)
                ):
                    cell = occ_by_uri.loc[occ_uri_val, isco_col]
                    if isinstance(cell, pd.Series):
                        cell = cell.iloc[0]
                    isco_value = str(cell).strip() if pd.notna(cell) else None

                # Ưu tiên gắn theo mã trong CSV; nếu không có thì leo từ URI
                tg = (
                    build_isco_tags_from_value(isco_value, isco_tree)
                    if isco_value
                    else []
                )
                if not tg and occ_uri_val:
                    tg = build_isco_tags_from_value(occ_uri_val, isco_tree)

        skills_ess.append(en)
        skills_opt.append(op)
        tags.append(tg)

    onet["skills_esco_essential"] = skills_ess
    onet["skills_esco_optional"] = skills_opt
    onet["tags"] = tags  # list[str], EN, dùng làm tags_en sau này

    # --- Fallback: nghề .xx mượn skills từ gốc .00 nếu thiếu ---
    onet_sk_copy = onet_sk.copy()
    onet_sk_copy["_base"] = onet_sk_copy["job_id"].map(base_code)
    base_to_skills = (
        onet_sk_copy.groupby("_base")["skills_onet"].first().to_dict()
    )

    def borrow_if_missing(job_id: str, val: Any) -> list[str]:
        if isinstance(val, list) and len(val) > 0:
            return val
        b = base_code(job_id)
        return base_to_skills.get(b, [])

    onet["skills_onet"] = [
        borrow_if_missing(j, v)
        for j, v in zip(onet["job_id"], onet["skills_onet"], strict=False)
    ]

    # -------------------------------------------------------------
    # 4) Hợp nhất skills: ESCO essential -> O*NET -> ESCO optional
    # -------------------------------------------------------------
    def merge_skills(row: pd.Series) -> list[str]:
        s: list[str] = []

        def add_unique(xs: Any) -> None:
            it = normalize_list(xs)
            for x in it:
                if x not in s:
                    s.append(x)

        add_unique(row.get("skills_esco_essential", []))
        add_unique(row.get("skills_onet", []))
        add_unique(row.get("skills_esco_optional", []))
        return s

    onet["skills"] = onet.apply(merge_skills, axis=1)

    # -------------------------------------------------------------
    # 5) RIASEC vector 6 chiều (JSON), xuất CSV
    # -------------------------------------------------------------
    def to_vec(row: pd.Series) -> str:
        vals = [float(row[d]) for d in dims]
        return json.dumps(vals, allow_nan=False)

    onet["riasec_vector"] = onet.apply(to_vec, axis=1)

    # Chuẩn hoá tên cột mô tả và chọn cột xuất
    onet = onet.rename(columns={"Description": "description"})
    out = onet[["job_id", "title", "description", "skills", "riasec_vector", "tags"]].copy()

    # skills: join bằng ';' cho CSV-friendly
    out["skills"] = out["skills"].apply(
        lambda xs: ";".join(xs) if isinstance(xs, list) else ""
    )

    # tags_en: join list tags bằng '|'
    out["tags_en"] = out["tags"].apply(
        lambda xs: "|".join(xs) if isinstance(xs, list) else ""
    )

    # Giữ đúng thứ tự cột mong muốn
    out = out[["job_id", "title", "description", "skills", "riasec_vector", "tags_en"]]

    # Ghi file
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    out.to_csv(args.out, index=False, encoding="utf-8")
    print(f"[OK] Wrote {args.out} with {len(out)} rows.")


if __name__ == "__main__":
    main()
