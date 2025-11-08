import argparse
import json
from pathlib import Path

import numpy as np


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user_id", type=int, required=True, help="User ID cần trích xuất")
    parser.add_argument(
        "--embeddings",
        type=str,
        default="data/embeddings/train_embeddings.npy",
        help="File embeddings (npy)",
    )
    parser.add_argument(
        "--index", type=str, default="data/embeddings/train_index.json", help="File index json"
    )
    parser.add_argument(
        "--out",
        type=str,
        default="data/embeddings/user_vector.npy",
        help="File output user_vector.npy",
    )
    args = parser.parse_args()

    # Load dữ liệu
    embs = np.load(args.embeddings)
    index = json.loads(Path(args.index).read_text(encoding="utf-8"))

    # Tìm vị trí user
    pos = None
    for i, rec in enumerate(index):
        if str(rec["user_id"]) == str(args.user_id):
            pos = i
            break

    if pos is None:
        raise ValueError(f"User ID {args.user_id} không tồn tại trong {args.index}")

    # Lấy vector tương ứng
    user_vector = embs[pos]
    np.save(args.out, user_vector)

    print(f"[OK] Xuất user_id={args.user_id} -> {args.out} (shape {user_vector.shape})")


if __name__ == "__main__":
    main()
