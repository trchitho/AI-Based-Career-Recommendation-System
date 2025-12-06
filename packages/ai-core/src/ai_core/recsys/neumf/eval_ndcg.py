# src/ai_core/recsys/neumf/eval_ndcg.py
import argparse
import csv
import json
from collections import defaultdict
from math import log2
from pathlib import Path

import torch

from .infer import infer_scores
from .model import MLPScore


def ndcg_at_k(rel, k):
    """rel: list[0/1] theo thứ tự model."""
    rel = rel[:k]
    if not rel:
        return 0.0
    dcg = sum(r / log2(i + 2) for i, r in enumerate(rel))
    ideal = sum(sorted(rel, reverse=True)[i] / log2(i + 2) for i in range(len(rel)))
    return dcg / ideal if ideal > 0 else 0.0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--interactions", type=Path, required=True)
    p.add_argument("--user_feats", type=Path, required=True)
    p.add_argument("--item_feats", type=Path, required=True)
    p.add_argument("--model", type=Path, required=True)
    p.add_argument("--k", type=int, default=10)
    args = p.parse_args()

    # load interactions, group by user, chỉ dùng click/apply làm positive
    user_pos = defaultdict(set)
    user_cands = defaultdict(set)

    with args.interactions.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            uid = str(row["user_id"])
            jid = str(row["job_id"])
            label = float(row["label"])
            user_cands[uid].add(jid)
            if label > 0.5:
                user_pos[uid].add(jid)

    uf = json.loads(args.user_feats.read_text(encoding="utf-8"))
    itf = json.loads(args.item_feats.read_text(encoding="utf-8"))

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Kiến trúc model đã cố định (dim_text=768, v.v.)
    model = MLPScore()
    state = torch.load(args.model, map_location=device)
    model.load_state_dict(state)
    model.to(device)
    model.eval()

    ndcgs = []

    for uid, cand_jobs in user_cands.items():
        cand_jobs = [j for j in cand_jobs if j in itf]
        if not cand_jobs:
            continue
        scored = infer_scores(model, uid, cand_jobs, uf, itf, device=device)
        scored_sorted = sorted(scored, key=lambda x: x[1], reverse=True)
        top = scored_sorted[: args.k]
        rel = [1.0 if j in user_pos[uid] else 0.0 for j, _ in top]
        ndcgs.append(ndcg_at_k(rel, args.k))

    if ndcgs:
        avg = sum(ndcgs) / len(ndcgs)
    else:
        avg = 0.0
    print(f"nDCG@{args.k} = {avg:.4f}")


if __name__ == "__main__":
    main()
