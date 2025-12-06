# src/ai_core/ranker/mappings.py
from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple
import json


def _load_json(path: Path):
    if not path.exists() or path.stat().st_size == 0:
        raise FileNotFoundError(f"Missing/empty JSON: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _build_and_save_mappings(model_dir: Path) -> Tuple[Dict[int, int], Dict[str, int]]:
    """
    Khi chưa có user_mapping.json / item_mapping.json:
    - Đọc data/processed/user_feats.json & item_feats.json
    - Tạo mapping đơn giản:
        + user_id (int, từ key JSON)  -> index [0..N-1]
        + job_id  (str, onet_code)    -> index [0..M-1]
    - Ghi lại 2 file mapping vào model_dir để dùng về sau.
    """
    uf_path = Path("data/processed/user_feats.json")
    it_path = Path("data/processed/item_feats.json")

    uf = _load_json(uf_path)   # { "9": {...}, "18": {...}, ... }
    it = _load_json(it_path)   # { "15-1244.00": {...}, ... }

    # user_id key trong JSON là string → convert về int, sort cho ổn định
    user_ids = sorted([int(uid) for uid in uf.keys()])
    job_ids = sorted([str(jid) for jid in it.keys()])

    user_map: Dict[int, int] = {uid: idx for idx, uid in enumerate(user_ids)}
    item_map: Dict[str, int] = {jid: idx for idx, jid in enumerate(job_ids)}

    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / "user_mapping.json").write_text(
        json.dumps({str(k): v for k, v in user_map.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (model_dir / "item_mapping.json").write_text(
        json.dumps(item_map, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(
        f"[INFO] Built mappings from feats: "
        f"users={len(user_map)}, items={len(item_map)} → saved to {model_dir}"
    )
    return user_map, item_map


def load_mappings(model_dir: str | Path) -> Tuple[Dict[int, int], Dict[str, int]]:
    """
    Đọc mapping từ folder model:
      - user_mapping.json : { "<user_id>": user_index, ... }
      - item_mapping.json : { "<job_id>": item_index, ... }

    Nếu 2 file chưa tồn tại → tự build từ:
      - data/processed/user_feats.json
      - data/processed/item_feats.json
    rồi lưu lại vào model_dir.

    Trả về:
      - user_map: dict[int, int]   (user_id → index)
      - item_map: dict[str, int]   (job_id  → index)
    """
    model_dir = Path(model_dir)
    user_path = model_dir / "user_mapping.json"
    item_path = model_dir / "item_mapping.json"

    # Case 1: đã có mapping → load thẳng
    if user_path.exists() and item_path.exists():
        with user_path.open("r", encoding="utf-8") as f:
            raw_user = json.load(f)
        with item_path.open("r", encoding="utf-8") as f:
            raw_item = json.load(f)

        user_map: Dict[int, int] = {int(k): int(v) for k, v in raw_user.items()}
        item_map: Dict[str, int] = {str(k): int(v) for k, v in raw_item.items()}

        return user_map, item_map

    # Case 2: thiếu mapping → build từ feats
    print(
        f"[WARN] user_mapping.json / item_mapping.json not found in {model_dir}. "
        f"Building from data/processed/*_feats.json ..."
    )
    return _build_and_save_mappings(model_dir)
