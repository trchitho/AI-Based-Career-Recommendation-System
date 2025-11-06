# src/retrieval/faiss_index.py
import argparse
import os

import faiss
import numpy as np


def main():
    ap = argparse.ArgumentParser("Build FAISS index from job embeddings")
    ap.add_argument(
        "--embeddings", type=str, required=True, help="Đường dẫn .npy embeddings (N, D)"
    )
    ap.add_argument(
        "--index_out", type=str, required=True, help="Đường dẫn lưu FAISS index (.index)"
    )
    ap.add_argument(
        "--normalize", action="store_true", help="L2-normalize trước khi build (cosine ~ IP)"
    )
    args = ap.parse_args()

    # Load embeddings
    X = np.load(args.embeddings)
    if X.dtype != np.float32:
        X = X.astype("float32")

    if X.ndim != 2:
        raise ValueError(f"Embeddings phải có shape [N, D], hiện tại: {X.shape}")

    # Normalize nếu cần
    if args.normalize:
        faiss.normalize_L2(X)

    n, d = X.shape
    index = faiss.IndexFlatIP(d)  # IP trên vector unit-norm ~ cosine
    index.add(X)

    out_dir = os.path.dirname(args.index_out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    faiss.write_index(index, args.index_out)

    print(f"[OK] Saved index -> {args.index_out} (ntotal={index.ntotal}, dim={d})")


if __name__ == "__main__":
    main()
