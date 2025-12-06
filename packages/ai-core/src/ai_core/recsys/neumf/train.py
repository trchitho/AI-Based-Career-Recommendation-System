from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List, Tuple

import json
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import roc_auc_score
from torch.utils.data import DataLoader

from .dataset import PairDataset
from .model import MLPScore


def _normalize_job_id(raw: str) -> str:
    """
    Chuẩn hoá job_id về O*NET code:
    - Nếu đã là dạng '11-1021.00' thì giữ nguyên.
    - Nếu là slug kiểu 'general-and-operations-managers-11-1021-00'
      thì bóc phần code cuối và đổi thành '11-1021.00'.
    """
    s = (raw or "").strip()
    if not s:
        return s

    # Nếu đã có dấu chấm ở dạng ##-####.## thì giữ nguyên
    import re

    m = re.search(r"(\d{2})-(\d{4})\.(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}.{m.group(3)}"

    # Thử dạng slug: ...-11-1021-00
    m = re.search(r"(\d{2})-(\d{4})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}.{m.group(3)}"

    return s


def load_pairs(path: Path) -> List[Tuple[str, str, float]]:
    """
    Đọc interactions và trả về list (user_id, job_id, label).

    Hỗ trợ 2 schema:
    - user_id,job_id,label
    - user_id,job_id,implicit_rating[,timestamp]

    Đồng thời chuẩn hoá job_id về O*NET code (11-1021.00).
    """
    pairs: List[Tuple[str, str, float]] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            user = str(row.get("user_id", "")).strip()
            raw_job = str(row.get("job_id", "")).strip()
            if not user or not raw_job:
                continue

            job = _normalize_job_id(raw_job)

            label_val = None

            # 1) Ưu tiên cột 'label'
            if "label" in row and row["label"] not in (None, ""):
                try:
                    label_val = float(row["label"])
                except Exception:
                    pass

            # 2) Fallback 'implicit_rating'
            if label_val is None and "implicit_rating" in row and row["implicit_rating"] not in (None, ""):
                try:
                    label_val = float(row["implicit_rating"])
                except Exception:
                    pass

            if label_val is None:
                continue

            pairs.append((user, job, float(label_val)))

    return pairs



def split_train_val(pairs: List[Tuple[str, str, float]], val_ratio: float = 0.1):
    n = len(pairs)
    split = int(n * (1 - val_ratio))
    return pairs[:split], pairs[split:]


def train_mlp(
    train_pairs,
    val_pairs,
    user_feats: Dict[str, list[float]],
    item_feats: Dict[str, list[float]],
    epochs: int = 5,
    bs: int = 512,
    lr: float = 1e-3,
    device: str = "cpu",
):
    train_ds = PairDataset(train_pairs, user_feats, item_feats)
    val_ds = PairDataset(val_pairs, user_feats, item_feats)

    model = MLPScore().to(device)
    opt = optim.AdamW(model.parameters(), lr=lr)
    lossfn = nn.BCEWithLogitsLoss()

    dl = DataLoader(train_ds, batch_size=bs, shuffle=True)

    for ep in range(epochs):
        model.train()
        for x, y in dl:
            x = x.to(device)
            y = y.to(device)
            opt.zero_grad()
            logits = model(x)
            loss = lossfn(logits, y.view(-1))
            loss.backward()
            opt.step()

        # quick val AUC
        model.eval()
        Xv = []
        Yv = []
        with torch.no_grad():
            for x, y in DataLoader(val_ds, batch_size=bs):
                x = x.to(device)
                y = y.to(device)
                prob = torch.sigmoid(model(x))
                Xv.append(prob.cpu())
                Yv.append(y.view(-1).cpu())

        import torch as T

        auc = roc_auc_score(
            T.cat(Yv).numpy(),
            T.cat(Xv).numpy(),
        )
        print(f"Epoch {ep+1}: val AUC={auc:.4f}")

    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--interactions", type=Path, required=True)
    parser.add_argument("--user_feats", type=Path, required=True)
    parser.add_argument("--item_feats", type=Path, required=True)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("models/recsys_mlp/best.pt"),
    )
    args = parser.parse_args()

    pairs = load_pairs(args.interactions)
    if not pairs:
        raise RuntimeError(f"No training pairs loaded from {args.interactions}")

    train_pairs, val_pairs = split_train_val(pairs)

    user_feats = json.loads(args.user_feats.read_text(encoding="utf-8"))
    item_feats = json.loads(args.item_feats.read_text(encoding="utf-8"))

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = train_mlp(train_pairs, val_pairs, user_feats, item_feats, device=device)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.out)
    print(f"[OK] saved model to {args.out}")


if __name__ == "__main__":
    main()
