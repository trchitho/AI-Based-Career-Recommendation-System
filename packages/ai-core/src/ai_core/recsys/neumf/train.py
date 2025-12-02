# packages/ai-core/src/recsys/neumf/train.py
import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import roc_auc_score
from torch.utils.data import DataLoader

sys.path.append(os.path.dirname(__file__))

import csv

from dataset import PairDataset
from model import MLPScore


def load_pairs(path_csv: Path):
    pairs = []
    with path_csv.open("r", encoding="utf-8", newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            pairs.append((int(row["user_id"]), str(row["job_id"]), int(row["label"])))
    return pairs


def load_feats_json(path_json: Path):
    # JSON: {"<user_or_job_id>": {"text": [...768], "riasec": [...6], "big5": [...5]?}}
    return json.loads(path_json.read_text(encoding="utf-8"))


def collate_pairs(pairs, user_feats, item_feats):
    # Lọc cặp hợp lệ (có feature)
    clean = []
    for u, j, y in pairs:
        if str(u) in user_feats and j in item_feats:
            clean.append((str(u), j, y))
    return clean


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interactions", default="data/processed/interactions.csv")
    ap.add_argument("--user_feats", default="data/processed/user_feats.json")
    ap.add_argument("--item_feats", default="data/processed/item_feats.json")
    ap.add_argument("--epochs", type=int, default=5)
    ap.add_argument("--bs", type=int, default=512)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--val_split", type=float, default=0.1)
    ap.add_argument("--out_dir", default="models/recsys_mlp")
    args = ap.parse_args()

    interactions = Path(args.interactions)
    user_feats = load_feats_json(Path(args.user_feats))
    item_feats = load_feats_json(Path(args.item_feats))
    pairs_all = load_pairs(interactions)
    pairs_all = collate_pairs(pairs_all, user_feats, item_feats)

    # Split train/val nhanh
    rng = np.random.default_rng(42)
    idx = np.arange(len(pairs_all))
    rng.shuffle(idx)
    n_val = int(len(idx) * args.val_split)
    val_idx, tr_idx = idx[:n_val], idx[n_val:]
    val_pairs = [pairs_all[i] for i in val_idx]
    tr_pairs = [pairs_all[i] for i in tr_idx]

    # Torch: build loaders
    tr_ds = PairDataset(tr_pairs, user_feats, item_feats)
    va_ds = PairDataset(val_pairs, user_feats, item_feats)
    tr_dl = DataLoader(tr_ds, batch_size=args.bs, shuffle=True)
    va_dl = DataLoader(va_ds, batch_size=args.bs)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MLPScore().to(device)
    opt = optim.AdamW(model.parameters(), lr=args.lr)
    lossfn = nn.BCEWithLogitsLoss()

    for ep in range(args.epochs):
        model.train()
        for x, y in tr_dl:
            x, y = x.to(device), y.view(-1).to(device)
            opt.zero_grad()
            logits = model(x)
            loss = lossfn(logits, y)
            loss.backward()
            opt.step()

        # quick val AUC
        model.eval()
        y_true, y_score = [], []
        with torch.no_grad():
            for x, y in va_dl:
                x = x.to(device)
                s = torch.sigmoid(model(x)).cpu().numpy()
                y_true.extend(y.view(-1).numpy().tolist())
                y_score.extend(s.tolist())
        auc = roc_auc_score(y_true, y_score) if len(set(y_true)) > 1 else float("nan")
        print(f"[Ep {ep + 1}] val AUC={auc:.4f}")

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), out / "best.pt")
    print(f"[OK] Saved model → {out / 'best.pt'}")


if __name__ == "__main__":
    main()