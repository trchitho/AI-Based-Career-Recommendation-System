# src/training/train_regression.py
import argparse
import math
import random
from pathlib import Path

import numpy as np
import torch
from torch.optim import AdamW
from torch.utils.data import DataLoader
from tqdm import tqdm
from transformers import AutoTokenizer, get_linear_schedule_with_warmup

from src.training.dataset_jsonl import TASK2CFG, JsonlRegDataset
from src.training.modeling import TextRegressor


# -------------------- utils --------------------
def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def masked_mse(pred, target, mask):
    # pred/target: [B, D], mask: [B, D] với 1.0 cho nhãn có thật, 0.0 cho thiếu
    diff = (pred - target) ** 2
    diff = diff * mask
    denom = mask.sum().clamp(min=1.0)
    return diff.sum() / denom


def masked_mae_per_dim(pred, target, mask):
    diff = (pred - target).abs() * mask
    denom = mask.sum(dim=0).clamp(min=1.0)
    mae = diff.sum(dim=0) / denom
    return mae.detach().cpu().tolist()


def load_yaml(path: Path):
    import yaml

    return yaml.safe_load(path.read_text(encoding="utf-8"))


# Để kiểu an toàn: YAML có "2e-5" hay "256" dạng chuỗi vẫn chạy
def as_float(x, default):
    try:
        return float(x)
    except Exception:
        return float(default)


def as_int(x, default):
    try:
        # Chuỗi số thực nhưng là số nguyên (vd "256.0") cũng xử lý
        v = float(x)
        return int(v)
    except Exception:
        try:
            return int(x)
        except Exception:
            return int(default)


def as_bool(x, default):
    if isinstance(x, bool):
        return x
    if isinstance(x, str):
        return x.strip().lower() in ("1", "true", "yes", "y", "on")
    return bool(x) if x is not None else bool(default)


def get_cfg(cfg_raw: dict):
    # Chuẩn hoá kiểu cho tất cả field cần dùng
    out = {}
    out["model_name"] = cfg_raw.get("model_name", "vinai/phobert-base")
    out["max_length"] = as_int(cfg_raw.get("max_length", 256), 256)
    out["batch_size"] = as_int(cfg_raw.get("batch_size", 16), 16)
    out["num_epochs"] = as_int(cfg_raw.get("num_epochs", 5), 5)
    out["lr"] = as_float(cfg_raw.get("lr", 2e-5), 2e-5)
    out["weight_decay"] = as_float(cfg_raw.get("weight_decay", 0.01), 0.01)
    out["warmup_ratio"] = as_float(cfg_raw.get("warmup_ratio", 0.1), 0.1)
    out["seed"] = as_int(cfg_raw.get("seed", 42), 42)
    out["task"] = cfg_raw.get("task", "riasec")
    out["freeze_base"] = as_bool(cfg_raw.get("freeze_base", False), False)
    out["output_dir"] = cfg_raw.get("output_dir", "models/riasec_phobert")
    # Kiểm tra hợp lệ task
    if out["task"] not in TASK2CFG:
        raise ValueError(f"Unsupported task: {out['task']} (valid: {list(TASK2CFG.keys())})")
    return out


# -------------------- main --------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/nlp.yaml")
    parser.add_argument("--train", type=str, default="data/processed/train.jsonl")
    parser.add_argument("--val", type=str, default="data/processed/val.jsonl")
    args = parser.parse_args()

    cfg_file = Path(args.config)
    cfg_raw = load_yaml(cfg_file)
    cfg = get_cfg(cfg_raw)

    set_seed(cfg["seed"])

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    # Một số tokenizer (vd PhoBERT) có thể cần use_fast=False nếu lỗi; bật dùng lại nếu gặp trục trặc:
    tokenizer = AutoTokenizer.from_pretrained(cfg["model_name"])

    out_dim = len(TASK2CFG[cfg["task"]]["dims"])

    ds_tr = JsonlRegDataset(Path(args.train), tokenizer, cfg["task"], cfg["max_length"])
    ds_va = JsonlRegDataset(Path(args.val), tokenizer, cfg["task"], cfg["max_length"])

    dl_tr = DataLoader(ds_tr, batch_size=cfg["batch_size"], shuffle=True)
    dl_va = DataLoader(ds_va, batch_size=cfg["batch_size"], shuffle=False)

    model = TextRegressor(cfg["model_name"], out_dim, freeze_base=cfg["freeze_base"]).to(device)

    optim = AdamW(model.parameters(), lr=cfg["lr"], weight_decay=cfg["weight_decay"])

    # total_steps theo số batch (ceil) * epochs
    steps_per_epoch = math.ceil(len(dl_tr))
    total_steps = cfg["num_epochs"] * steps_per_epoch

    scheduler = get_linear_schedule_with_warmup(
        optim,
        num_warmup_steps=int(total_steps * cfg["warmup_ratio"]),
        num_training_steps=total_steps,
    )

    best_val = float("inf")
    patience = 2
    bad = 0

    output_dir = Path(cfg["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, cfg["num_epochs"] + 1):
        model.train()
        tr_loss = 0.0
        for batch in tqdm(dl_tr, desc=f"Epoch {epoch}/{cfg['num_epochs']} [train]"):
            optim.zero_grad(set_to_none=True)

            input_ids = batch["input_ids"].to(device)
            attn = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            mask = batch["label_mask"].to(device)

            preds = model(input_ids, attn)
            loss = masked_mse(preds, labels, mask)
            loss.backward()
            optim.step()
            scheduler.step()

            tr_loss += loss.item()

        model.eval()
        va_loss = 0.0
        mae_dim_sum = np.zeros(out_dim, dtype=float)
        with torch.no_grad():
            for batch in tqdm(dl_va, desc=f"Epoch {epoch} [val]"):
                input_ids = batch["input_ids"].to(device)
                attn = batch["attention_mask"].to(device)
                labels = batch["labels"].to(device)
                mask = batch["label_mask"].to(device)

                preds = model(input_ids, attn)
                loss = masked_mse(preds, labels, mask)
                va_loss += loss.item()

                mae_dim = masked_mae_per_dim(preds, labels, mask)
                mae_dim_sum += np.array(mae_dim, dtype=float)

        tr_loss /= max(1, len(dl_tr))
        va_loss /= max(1, len(dl_va))
        mae_dim_avg = (mae_dim_sum / max(1, len(dl_va))).tolist()

        print(f"\nEpoch {epoch}: train_loss={tr_loss:.6f}  val_loss={va_loss:.6f}")
        print(
            f"MAE per-dim ({TASK2CFG[cfg['task']]['dims']}): {[round(x, 6) for x in mae_dim_avg]}"
        )

        # Early stopping + save best
        if va_loss < best_val - 1e-9:
            best_val = va_loss
            bad = 0
            ckpt = output_dir / "best.pt"
            torch.save({"model_state": model.state_dict(), "cfg": cfg}, ckpt)
            print(f"Saved best checkpoint -> {ckpt}")
        else:
            bad += 1
            if bad > patience:
                print("Early stopping.")
                break

    # Lưu tokenizer name & task để encode sau này dùng cho khớp
    (output_dir / "tokenizer_name.txt").write_text(cfg["model_name"], encoding="utf-8")
    (output_dir / "task.txt").write_text(cfg["task"], encoding="utf-8")
    print("Done training.")


if __name__ == "__main__":
    main()
