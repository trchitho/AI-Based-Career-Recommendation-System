import argparse
from pathlib import Path

import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer


def mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1)
    return (last_hidden_state * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-6)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, required=True, help="Essay text cần encode")
    parser.add_argument(
        "--model", type=str, default="models/riasec_phobert", help="Checkpoint đã fine-tune"
    )
    parser.add_argument(
        "--out", type=str, default="data/embeddings/user_vector.npy", help="File output .npy"
    )
    parser.add_argument("--max_length", type=int, default=256)
    args = parser.parse_args()

    # đọc tên backbone từ tokenizer_name.txt
    model_name = (Path(args.model) / "tokenizer_name.txt").read_text().strip()

    tok = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name).eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)

    inputs = tok(args.text, return_tensors="pt", truncation=True, max_length=args.max_length).to(
        device
    )

    with torch.no_grad():
        out = model(**inputs)
        vector = mean_pool(out.last_hidden_state, inputs["attention_mask"])[0].cpu().numpy()

    np.save(args.out, vector)
    print(f"[OK] Saved vector shape {vector.shape} to {args.out}")


if __name__ == "__main__":
    main()
