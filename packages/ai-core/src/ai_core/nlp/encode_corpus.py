import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader
from tqdm import tqdm
from transformers import AutoModel, AutoTokenizer

from src.training.dataset_jsonl import JsonlRegDataset


def mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1)
    return (last_hidden_state * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-6)


def load_cfg(ckpt_dir: Path):
    import yaml

    cfg = yaml.safe_load((Path("configs/nlp.yaml")).read_text(encoding="utf-8"))
    # DÃ¹ng model_name tá»« file Ä‘á»ƒ Ä‘á»“ng bá»™ (phÃ²ng Ä‘á»•i config)
    model_name = (ckpt_dir / "tokenizer_name.txt").read_text(encoding="utf-8").strip()
    cfg["model_name"] = model_name
    return cfg


def encode_split(split_path: Path, model_name: str, max_length: int, batch_size: int, device: str):
    tok = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name).to(device)
    model.eval()

    # dataset chá»‰ cáº§n tokenizer; task khÃ´ng quan trá»ng á»Ÿ Ä‘Ã¢y, ta táº¡o nhÃ£n giáº£
    class PlainDataset(JsonlRegDataset):
        def __init__(self, path, tokenizer, max_length):
            # dÃ¹ng task riasec cho há»£p lá»‡ mask/labels nhÆ°ng khÃ´ng dÃ¹ng
            super().__init__(path, tokenizer, "riasec", max_length)

        def __getitem__(self, i):
            item = super().__getitem__(i)
            return {"input_ids": item["input_ids"], "attention_mask": item["attention_mask"]}

    ds = PlainDataset(split_path, tok, max_length)
    dl = DataLoader(ds, batch_size=batch_size, shuffle=False)

    embs = []
    with torch.no_grad():
        for batch in tqdm(dl, desc=f"Encode {split_path.name}"):
            input_ids = batch["input_ids"].to(device)
            attn = batch["attention_mask"].to(device)
            out = model(input_ids=input_ids, attention_mask=attn)
            pooled = mean_pool(out.last_hidden_state, attn)  # [B, H]
            embs.append(pooled.cpu().numpy())
    embs = np.vstack(embs) if embs else np.zeros((0, model.config.hidden_size), dtype=np.float32)
    return embs


def main():
    ckpt_dir = Path("models/riasec_phobert")  # hoáº·c big5_phobert, tuá»³ báº¡n muá»‘n dÃ¹ng backbone nÃ o
    cfg = load_cfg(ckpt_dir)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    out_dir = Path("data/embeddings")
    out_dir.mkdir(parents=True, exist_ok=True)

    splits = {
        "train": Path("data/processed/train.jsonl"),
        "val": Path("data/processed/val.jsonl"),
        "test": Path("data/processed/test.jsonl"),
    }
    for name, p in splits.items():
        embs = encode_split(p, cfg["model_name"], cfg["max_length"], cfg["batch_size"], device)
        np.save(out_dir / f"{name}_embeddings.npy", embs)
        # LÆ°u index (user_id, languageâ€¦) Ä‘á»ƒ tra ngÆ°á»£c
        rows = [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines()]
        index = [{"user_id": r["user_id"], "language": r["language"]} for r in rows]
        (out_dir / f"{name}_index.json").write_text(
            json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"[OK] {name}: {embs.shape} -> {out_dir / (name + '_embeddings.npy')}")


if __name__ == "__main__":
    main()
