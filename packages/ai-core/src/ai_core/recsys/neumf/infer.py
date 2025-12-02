from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List

import torch as T
from ai_core.recsys.neumf.dataset import PairDataset
from ai_core.recsys.neumf.model import MLPScore


def load_json(p: Path):
    p = Path(p)
    if not p.exists() or p.stat().st_size == 0:
        raise FileNotFoundError(f"Missing/empty JSON: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def load_titles_from_item_feats(item_feats_path: Path) -> Dict[str, str]:
    """Ưu tiên lấy title từ `item_feats.json` (mỗi item: {"title": "...", ...})."""
    titles: Dict[str, str] = {}
    if not item_feats_path.exists():
        return titles
    try:
        obj = load_json(item_feats_path)
        # obj: {job_id: {"text": [...], "riasec": [...], "title": "..."}}
        for jid, meta in obj.items():
            if isinstance(meta, dict):
                t = meta.get("title")
                if t:
                    titles[str(jid)] = str(t)
    except Exception:
        # không bắt buộc — nếu thiếu title thì bỏ qua
        pass
    return titles


def load_titles_from_catalog(csv_path: Path) -> Dict[str, str]:
    """Fallback: lấy title từ catalog CSV (cột: job_id hoặc onet_code, và title)."""
    titles: Dict[str, str] = {}
    if not csv_path.exists():
        return titles
    try:
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            r = csv.DictReader(f)
            for row in r:
                jid = row.get("job_id") or row.get("onet_code")
                title = row.get("title")
                if jid and title:
                    titles[str(jid)] = str(title)
    except Exception:
        pass
    return titles


def main():
    ap = argparse.ArgumentParser(description="Infer Top-K careers for a user with MLP/NeuMF.")
    ap.add_argument("--model", default="models/recsys_mlp/best.pt")
    ap.add_argument("--user_feats", default="data/processed/user_feats.json")
    ap.add_argument("--item_feats", default="data/processed/item_feats.json")
    ap.add_argument("--user_id", required=True, help="User ID (string hoặc int; key trong user_feats.json)")
    ap.add_argument("--topk", type=int, default=20)
    ap.add_argument("--candidates", nargs="*", help="Tùy chọn: danh sách job_id (O*NET code) để chấm điểm")
    ap.add_argument(
        "--catalog_csv",
        default="data/catalog/jobs.csv",
        help="CSV fallback để map title (cột: job_id hoặc onet_code, title)",
    )
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    user_feats_path = Path(args.user_feats)
    item_feats_path = Path(args.item_feats)
    model_path = Path(args.model)
    catalog_path = Path(args.catalog_csv)

    # Load features (bắt buộc tồn tại)
    try:
        uf = load_json(user_feats_path)
        it = load_json(item_feats_path)
    except FileNotFoundError as e:
        print(f"[ERROR] {e}", flush=True)
        print("[HINT] Hãy chạy build_feats_from_db.py để sinh user_feats.json & item_feats.json.", flush=True)
        return

    uid = str(args.user_id)
    if uid not in uf:
        print(f"[WARN] user_id={uid} không có trong user_feats (users={len(uf)}).", flush=True)
        print("[HINT] Hãy rebuild user_feats từ DB.", flush=True)
        return

    # Determine candidates
    cand: List[str] = args.candidates or list(it.keys())
    cand = [j for j in cand if j in it]
    if not cand:
        print("[WARN] item_feats rỗng hoặc danh sách candidates không khớp key trong item_feats.", flush=True)
        print("[HINT] Kiểm tra định dạng job_id (O*NET code) và rebuild item_feats.", flush=True)
        return

    # Load model (hỗ trợ cả state raw và wrapped)
    model = MLPScore()
    state = T.load(model_path, map_location="cpu")
    if isinstance(state, dict) and "state_dict" in state and isinstance(state["state_dict"], dict):
        state = state["state_dict"]
    model.load_state_dict(state)
    model.eval()

    # Build dataset & batch infer
    pairs = [(uid, j, 0) for j in cand]
    ds = PairDataset(pairs, uf, it)

    X = T.stack([ds[i][0] for i in range(len(ds))])  # ds[i] -> (features, label)
    with T.no_grad():
        scores = T.sigmoid(model(X)).cpu().numpy().reshape(-1)

    ranked = sorted(zip(cand, scores), key=lambda x: float(x[1]), reverse=True)[: args.topk]

    # Title map: ưu tiên item_feats, fallback sang catalog CSV
    title_map = load_titles_from_item_feats(item_feats_path) or load_titles_from_catalog(catalog_path)

    if args.verbose:
        print(
            f"[INFO] user={uid} | candidates_in={len(cand)} | topk={args.topk} | "
            f"users={len(uf)} | items={len(it)} | titles={len(title_map)}",
            flush=True,
        )

    # Output: job_id \t title \t score
    for jid, sc in ranked:
        title = title_map.get(jid, "")
        print(f"{jid}\t{title}\t{float(sc):.6f}")


if __name__ == "__main__":
    main()
