from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple, List, Any

import numpy as np
import torch
from torch.utils.data import Dataset


@dataclass
class Interaction:
    user_id: str
    job_id: str
    label: float


def _flatten_user_feat(meta: Any) -> np.ndarray:
    """
    user_feats[user_id] có thể là:
    - list[float] (legacy) -> dùng trực tiếp
    - dict với các key: text, riasec, big5, ... -> concat theo thứ tự:
        [text..., riasec..., big5...]
    """
    if meta is None:
        return np.zeros((0,), dtype="float32")

    # legacy: đã là list/ndarray phẳng
    if isinstance(meta, (list, tuple, np.ndarray)):
        return np.array(meta, dtype="float32")

    if isinstance(meta, dict):
        text = meta.get("text") or []
        riasec = meta.get("riasec") or []
        big5 = meta.get("big5") or []
        # đảm bảo là list float
        def _to_float_list(x):
            if isinstance(x, (list, tuple, np.ndarray)):
                return [float(v) for v in x]
            return []
        vec = _to_float_list(text) + _to_float_list(riasec) + _to_float_list(big5)
        return np.array(vec, dtype="float32")

    # fallback
    return np.zeros((0,), dtype="float32")


def _flatten_item_feat(meta: Any) -> np.ndarray:
    """
    item_feats[job_id] có thể là:
    - list[float] (legacy)
    - dict với các key: text, riasec, title, ... -> concat:
        [text..., riasec...]
    """
    if meta is None:
        return np.zeros((0,), dtype="float32")

    if isinstance(meta, (list, tuple, np.ndarray)):
        return np.array(meta, dtype="float32")

    if isinstance(meta, dict):
        text = meta.get("text") or []
        riasec = meta.get("riasec") or []
        def _to_float_list(x):
            if isinstance(x, (list, tuple, np.ndarray)):
                return [float(v) for v in x]
            return []
        vec = _to_float_list(text) + _to_float_list(riasec)
        return np.array(vec, dtype="float32")

    return np.zeros((0,), dtype="float32")


class PairDataset(Dataset):
    """
    Dataset cho MLPScore: mỗi item là (x, y)
    x = concat(user_feat, item_feat) -> tensor float32
    y = label (0/1 hoặc 0..1)
    """

    def __init__(
        self,
        pairs: List[Tuple[str, str, float]],
        user_feats: Dict[str, Any],
        item_feats: Dict[str, Any],
    ):
        self.pairs = [Interaction(*p) for p in pairs]
        self.user_feats = user_feats
        self.item_feats = item_feats

        # xác định kích thước input sau khi flatten
        # lấy 1 user, 1 item bất kỳ
        u0_meta = next(iter(user_feats.values()))
        i0_meta = next(iter(item_feats.values()))
        u0 = _flatten_user_feat(u0_meta)
        i0 = _flatten_item_feat(i0_meta)
        self.in_dim = len(u0) + len(i0)

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int):
        inter = self.pairs[idx]
        uf_meta = self.user_feats.get(inter.user_id)
        it_meta = self.item_feats.get(inter.job_id)

        if uf_meta is None or it_meta is None:
            raise KeyError(f"Missing feat for user={inter.user_id}, job={inter.job_id}")

        uf = _flatten_user_feat(uf_meta)
        itf = _flatten_item_feat(it_meta)

        x = np.concatenate([uf, itf])
        x_t = torch.from_numpy(x)  # [D]
        y_t = torch.tensor(float(inter.label), dtype=torch.float32)
        return x_t, y_t
