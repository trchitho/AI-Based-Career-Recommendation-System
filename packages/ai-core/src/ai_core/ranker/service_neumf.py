# src/ai_core/ranker/service_neumf.py
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict
from pathlib import Path
import os
import json

import torch as T

from ai_core.retrieval.service_pgvector import (
    Candidate,
    search_candidates_for_user,
    list_user_ids_with_embeddings,
)
from ai_core.recsys.neumf.dataset import PairDataset
from ai_core.recsys.neumf.model import MLPScore


# ====== Kiểu dữ liệu output cho B4 ======
@dataclass
class ScoredItem:
    job_id: str           # O*NET code
    rank_score: float     # 0–1, điểm tổng để sort & show
    sim_score: float      # điểm similarity từ B3 (0–1)
    cf_score: float       # điểm collaborative từ MLP (0–1)
    trait_score: float = 0.0  # để dành nếu sau này blend thêm trait


# ====== Global config & cache ======

_DEVICE = T.device("cuda" if T.cuda.is_available() else "cpu")

# THỰC DỤNG: dùng luôn model đã train ở models/recsys_mlp
_MODEL_DIR = Path(os.getenv("NEUMF_MODEL_DIR", "models/recsys_mlp"))
_MODEL_PATH = _MODEL_DIR / "best.pt"

# Đường dẫn features (đã build từ DB)
_USER_FEATS_PATH = Path(os.getenv("NEUMF_USER_FEATS", "data/processed/user_feats.json"))
_ITEM_FEATS_PATH = Path(os.getenv("NEUMF_ITEM_FEATS", "data/processed/item_feats.json"))

_MODEL: T.nn.Module | None = None
_USER_FEATS: Dict[str, dict] | None = None
_ITEM_FEATS: Dict[str, dict] | None = None


def _load_json(path: Path) -> Dict:
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Hãy chạy build_feats_from_db.py để sinh file này."
        )
    txt = path.read_text(encoding="utf-8").strip()
    if not txt:
        raise RuntimeError(f"{path} rỗng.")
    return json.loads(txt)


def _lazy_load():
    """
    - Load user_feats.json & item_feats.json vào RAM
    - Load MLPScore + state_dict (strict=False để bỏ qua layer thừa/thiếu)
    """
    global _MODEL, _USER_FEATS, _ITEM_FEATS

    if _USER_FEATS is None or _ITEM_FEATS is None:
        _USER_FEATS = _load_json(_USER_FEATS_PATH)
        _ITEM_FEATS = _load_json(_ITEM_FEATS_PATH)
        print(
            f"[BOOT][B4] Loaded feats: users={len(_USER_FEATS)}, items={len(_ITEM_FEATS)}"
        )

    if _MODEL is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model checkpoint not found: {_MODEL_PATH}. "
                "Hãy chạy train.py để sinh best.pt."
            )

        model = MLPScore()  # kiến trúc chuẩn đã dùng khi train
        state = T.load(_MODEL_PATH, map_location="cpu")

        # Cho phép checkpoint kiểu {"state_dict": {...}}
        if isinstance(state, dict) and "state_dict" in state and isinstance(
            state["state_dict"], dict
        ):
            state = state["state_dict"]

        missing, unexpected = model.load_state_dict(state, strict=False)
        if missing or unexpected:
            print("[WARN] Partial load NeuMF state_dict:")
            if missing:
                print("  - missing keys   :", missing)
            if unexpected:
                print("  - unexpected keys:", unexpected)

        model.to(_DEVICE)
        model.eval()
        _MODEL = model

    return _MODEL, _USER_FEATS, _ITEM_FEATS


# ====== Public API – B4 Ranker (online) ======

def infer_scores(user_id: int, candidates: List[Candidate]) -> List[ScoredItem]:
    """
    B4 – Ranker MLP (NeuMF simplified).

    Input:
      - user_id: core.users.id
      - candidates: list[Candidate] (job_id + score_sim) từ B3

    Output:
      - list[ScoredItem] sort giảm dần theo rank_score
    """
    model, user_feats, item_feats = _lazy_load()

    uid = str(user_id)
    if uid not in user_feats:
        raise ValueError(
            f"user_id={user_id} không có trong user_feats "
            f"(users={len(user_feats)}). Hãy kiểm tra build_feats_from_db."
        )

    # Giữ lại chỉ những job có features
    valid_cands: List[Candidate] = [
        c for c in candidates if c.job_id in item_feats
    ]
    if not valid_cands:
        return []

    # Build pairs như lúc train: (user_id, job_id, label_dummy)
    pairs = [(uid, c.job_id, 0.0) for c in valid_cands]

    ds = PairDataset(pairs, user_feats, item_feats)

    # Stack feature vector cho tất cả candidates
    X_list = []
    for i in range(len(ds)):
        x, _ = ds[i]  # y không dùng
        X_list.append(x)

    X = T.stack(X_list).to(_DEVICE)  # [N, in_dim]

    with T.no_grad():
        logits = model(X).view(-1)                # [N]
        cf_scores = T.sigmoid(logits).cpu().numpy()  # 0–1

    # Blend CF + similarity
    alpha = 0.7  # trọng số CF
    beta = 0.3   # trọng số similarity

    scored: List[ScoredItem] = []
    for cand, cf in zip(valid_cands, cf_scores):
        sim = float(cand.score_sim)
        cf_f = float(cf)
        rank = alpha * cf_f + beta * sim
        scored.append(
            ScoredItem(
                job_id=cand.job_id,
                rank_score=rank,
                sim_score=sim,
                cf_score=cf_f,
                trait_score=0.0,
            )
        )

    scored.sort(key=lambda s: s.rank_score, reverse=True)
    return scored


# ====== CLI demo – B3 + B4 ======

def _demo_for_user(user_id: int, top_n: int):
    print(f"[TEST] Ranking for user_id={user_id}, top_n={top_n}")
    try:
        # B3: lấy candidates dựa trên embedding essay
        cands = search_candidates_for_user(user_id, top_n=top_n * 3)
        if not cands:
            print("  [WARN] Không tìm được candidate nào từ B3.")
            return
    except Exception as e:
        print("  [ERR] retrieval failed:", e)
        return

    try:
        scored = infer_scores(user_id, cands)
    except Exception as e:
        print("  [ERR] ranker failed:", e)
        return

    for s in scored[:top_n]:
        print(
            f"  {s.job_id}: "
            f"rank={s.rank_score:.4f} (sim={s.sim_score:.4f}, cf={s.cf_score:.4f})"
        )


if __name__ == "__main__":
    # Ví dụ:
    #   python -m ai_core.ranker.service_neumf --user-id 9 --top-n 10
    # hoặc:
    #   python -m ai_core.ranker.service_neumf --all-users --top-n 5
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=int, help="User ID để test B3 + B4")
    parser.add_argument(
        "--all-users", action="store_true", help="Chạy cho tất cả user có embedding"
    )
    parser.add_argument("--top-n", type=int, default=10)
    args = parser.parse_args()

    if args.all_users:
        uids = list_user_ids_with_embeddings()
        print(f"[TEST] Found {len(uids)} users with embeddings:", uids)
        for uid in uids:
            print()
            _demo_for_user(uid, args.top_n)
    else:
        uid = args.user_id or 1
        _demo_for_user(uid, args.top_n)
