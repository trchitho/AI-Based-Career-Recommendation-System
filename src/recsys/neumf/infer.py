import argparse
import csv
import json
import sys
from pathlib import Path

from recsys.neumf.dataset import PairDataset
from recsys.neumf.model import MLPScore

# Bổ sung src vào sys.path để có thể import tuyệt đối khi chạy trực tiếp
SRC_DIR = Path(__file__).resolve().parents[2]  # .../<project>/src
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def load_json(p: Path):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def load_titles_from_item_feats(item_feats_path: Path) -> dict[str, str]:
    """Ưu tiên lấy title từ item_feats.json (mỗi item: {"title": "...", ...})."""
    titles: dict[str, str] = {}
    try:
        obj = load_json(item_feats_path)
        for jid, meta in obj.items():
            if isinstance(meta, dict):
                t = meta.get("title")
                if t:
                    titles[jid] = str(t)
    except Exception:
        pass
    return titles


def load_titles_from_catalog(csv_path: Path) -> dict[str, str]:
    """Fallback: lấy title từ catalog CSV (yêu cầu có cột job_id hoặc onet_code, và title)."""
    titles: dict[str, str] = {}
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
    ap.add_argument(
        "--user_id", required=True, help="User ID (string or int, keys in user_feats.json)"
    )
    ap.add_argument("--topk", type=int, default=20)
    ap.add_argument("--candidates", nargs="*", help="Optional list of job_id (O*NET code) to score")
    ap.add_argument(
        "--catalog_csv",
        default="data/catalog/jobs.csv",
        help="Fallback CSV to resolve job titles (columns: job_id or onet_code, title)",
    )
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    user_feats_path = Path(args.user_feats)
    item_feats_path = Path(args.item_feats)
    model_path = Path(args.model)
    catalog_path = Path(args.catalog_csv)

    # Load features
    uf = load_json(user_feats_path)
    it = load_json(item_feats_path)

    uid = str(args.user_id)
    if uid not in uf:
        print(f"[WARN] user_id={uid} không có trong user_feats (users={len(uf)}).", file=sys.stderr)
        print("[HINT] Hãy rebuild user_feats từ DB.", file=sys.stderr)
        return

    # Determine candidates
    cand = args.candidates or list(it.keys())
    cand = [j for j in cand if j in it]
    if not cand:
        print("[WARN] item_feats rỗng hoặc candidates không khớp key item_feats.", file=sys.stderr)
        print("[HINT] Kiểm tra job_id format (O*NET code) và rebuild item_feats.", file=sys.stderr)
        return

    # Load model
    model = MLPScore()
    state = torch.load(model_path, map_location="cpu")
    # nếu đã lưu dạng {'state_dict': ...} thì: state = state['state_dict']
    model.load_state_dict(state)
    model.eval()

    # Build dataset & batch infer
    pairs = [(uid, j, 0) for j in cand]
    ds = PairDataset(pairs, uf, it)

    import torch as T

    X = T.stack([ds[i][0] for i in range(len(ds))])
    with T.no_grad():
        s = T.sigmoid(model(X)).cpu().numpy().reshape(-1)

    ranked = sorted(zip(cand, s, strict=False), key=lambda x: float(x[1]), reverse=True)[
        : args.topk
    ]

    # Title map: ưu tiên item_feats → fallback catalog CSV
    title_map = load_titles_from_item_feats(item_feats_path)
    if not title_map:
        title_map = load_titles_from_catalog(catalog_path)

    if args.verbose:
        print(
            f"[INFO] user={uid} | candidates_in={len(cand)} | topk={args.topk} | users={len(uf)} | items={len(it)} | titles={len(title_map)}",
            file=sys.stderr,
        )

    # In: job_id \t title \t score
    for jid, sc in ranked:
        title = title_map.get(jid, "")
        print(f"{jid}\t{title}\t{float(sc):.6f}")


if __name__ == "__main__":
    import torch  # defer import để tránh lỗi khi chỉ check help

    main()
