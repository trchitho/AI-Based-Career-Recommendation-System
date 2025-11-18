# src/retrieval/faiss_index.py
import argparse
import os

import faiss
import numpy as np


def main():
    ap = argparse.ArgumentParser("Build FAISS index from job embeddings")
    ap.add_argument(
        "--embeddings", type=str, required=True, help="ÄÆ°á»ng dáº«n .npy embeddings (N, D)"
    )
    ap.add_argument(
        "--index_out", type=str, required=True, help="ÄÆ°á»ng dáº«n lÆ°u FAISS index (.index)"
    )
    ap.add_argument(
        "--normalize", action="store_true", help="L2-normalize trÆ°á»›c khi build (cosine ~ IP)"
    )
    args = ap.parse_args()

    # Load embeddings
    X = np.load(args.embeddings)
    if X.dtype != np.float32:
        X = X.astype("float32")

    if X.ndim != 2:
        raise ValueError(f"Embeddings pháº£i cÃ³ shape [N, D], hiá»‡n táº¡i: {X.shape}")

    # Normalize náº¿u cáº§n
    if args.normalize:
        faiss.normalize_L2(X)

    n, d = X.shape
    index = faiss.IndexFlatIP(d)  # IP trÃªn vector unit-norm ~ cosine
    index.add(X)

    out_dir = os.path.dirname(args.index_out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    faiss.write_index(index, args.index_out)

    print(f"[OK] Saved index -> {args.index_out} (ntotal={index.ntotal}, dim={d})")


if __name__ == "__main__":
    main()
