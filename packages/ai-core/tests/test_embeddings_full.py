# tests/test_embeddings_full.py
import json
from pathlib import Path

import numpy as np


def _load_n(npy_path, idx_path):
    E = np.load(npy_path)
    J = json.loads(Path(idx_path).read_text(encoding="utf-8"))
    return E, J


def test_train_embeddings_shape():
    E, J = _load_n("data/embeddings/train_embeddings.npy", "data/embeddings/train_index.json")
    assert E.shape[0] == len(J)
    assert E.shape[1] > 100  # hidden size should be large


def test_val_test_exist():
    for split in ["val", "test"]:
        E, J = _load_n(
            f"data/embeddings/{split}_embeddings.npy", f"data/embeddings/{split}_index.json"
        )
        assert E.shape[0] == len(J)
