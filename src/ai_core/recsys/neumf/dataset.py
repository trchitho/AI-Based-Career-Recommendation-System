# packages/ai-core/src/recsys/neumf/dataset.py
import numpy as np
import torch
from torch.utils.data import Dataset


class PairDataset(Dataset):
    """
    Mỗi phần tử là (user_id, job_id, label).
    user_feats[u]: {"text": np(768), "riasec": np(6), "big5": np(5)}
    item_feats[i]: {"text": np(768), "riasec": np(6)}  # riasec có thể vắng → zeros(6)
    """

    def __init__(self, pairs, user_feats, item_feats):
        self.pairs = pairs
        self.user_feats = user_feats
        self.item_feats = item_feats

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        u, i, y = self.pairs[idx]
        uf = self.user_feats[u]
        itf = self.item_feats[i]
        x = np.concatenate(
            [
                uf["text"],
                itf["text"],
                uf["riasec"],
                uf["big5"],
                itf.get("riasec", np.zeros(6, dtype=np.float32)),
            ]
        ).astype("float32")
        return torch.from_numpy(x), torch.tensor([y], dtype=torch.float32)
