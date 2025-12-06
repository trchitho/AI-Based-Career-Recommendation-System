# src/ai_core/ranker/neumf_model.py
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple, Optional

import torch
from ai_core.recsys.neumf.model import MLPScore


@dataclass
class NeuMFPaths:
    model_dir: Path
    model_path: Path
    user_mapping_path: Path
    item_mapping_path: Path


def _resolve_paths(model_dir: Path) -> NeuMFPaths:
    """
    Nếu có config.json thì đọc, không có thì dùng tên default.
    -> Không bao giờ raise chỉ vì thiếu config.json.
    """
    cfg_path = model_dir / "config.json"

    model_file = "best.pt"
    user_map_file = "user_mapping.json"
    item_map_file = "item_mapping.json"

    if cfg_path.exists():
        try:
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            model_file = cfg.get("model_file", model_file)
            user_map_file = cfg.get("user_mapping_file", user_map_file)
            item_map_file = cfg.get("item_mapping_file", item_map_file)
        except Exception as e:
            print(f"[WARN] Cannot parse {cfg_path}: {e}. Using default filenames.")

    return NeuMFPaths(
        model_dir=model_dir,
        model_path=model_dir / model_file,
        user_mapping_path=model_dir / user_map_file,
        item_mapping_path=model_dir / item_map_file,
    )


def load_neumf_model(
    model_dir: str = "models/recsys_mlp",
    device: Optional[torch.device] = None,
) -> Tuple[torch.nn.Module, NeuMFPaths]:
    """
    Load model NeuMF/MLPScore từ thư mục model_dir (mặc định: models/recsys_mlp).

    - Không cần config.json (chỉ dùng nếu có).
    - Luôn dùng MLPScore() (không truyền in_dim).
    - load_state_dict(strict=False) để bỏ qua layer thừa/thiếu.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    mdir = Path(model_dir)
    paths = _resolve_paths(mdir)

    if not paths.model_path.exists():
        raise FileNotFoundError(f"NeuMF weight file not found: {paths.model_path}")

    model = MLPScore()  # kiến trúc cố định, tương thích với train.py hiện tại

    state = torch.load(paths.model_path, map_location=device)
    # Hỗ trợ cả dạng {"state_dict": {...}}
    if isinstance(state, dict) and "state_dict" in state and isinstance(
        state["state_dict"], dict
    ):
        state = state["state_dict"]

    missing, unexpected = model.load_state_dict(state, strict=False)

    if missing or unexpected:
        print("[WARN] Partial load NeuMF state_dict:")
        if missing:
            print(f"  - missing keys   : {list(missing)}")
        if unexpected:
            print(f"  - unexpected keys: {list(unexpected)}")

    model.to(device).eval()
    return model, paths
