# src/ai_core/recsys/neumf/mappings.py

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Any, Tuple
import re


# ===============================
# Helpers
# ===============================

def _normalize_job_id(raw: str) -> str:
    """
    Chuẩn hoá job_id sang đúng O*NET code dạng:
        11-1021.00
    Hỗ trợ input dạng:
        "general-and-operations-managers-11-1021-00"
        "11-1021-00"
        "11-1021.00"
    """
    if raw is None:
        return ""

    s = str(raw).strip()

    # Dạng đúng → giữ nguyên
    m = re.fullmatch(r"(\d{2})-(\d{4})\.(\d{2})", s)
    if m:
        return s

    # Dạng slug → chuyển
    m = re.search(r"(\d{2})-(\d{4})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}.{m.group(3)}"

    return s


# ===============================
# Load functions
# ===============================

BASE_DIR = Path(__file__).resolve().parents[3]  # packages/ai-core
DATA_DIR = BASE_DIR / "data" / "processed"
MODEL_DEFAULT = BASE_DIR / "models" / "recsys_neumf" / "best.pt"


def load_user_feats(path: Path | str = None) -> Dict[str, Any]:
    """
    Load user_feats.json → dict[user_id(str)] = {text, riasec, big5, ...}
    """
    p = Path(path) if path else DATA_DIR / "user_feats.json"
    if not p.exists():
        raise FileNotFoundError(f"user_feats.json not found: {p}")

    raw = json.loads(p.read_text(encoding="utf-8"))
    out = {}

    for uid, feat in raw.items():
        uid_str = str(uid).strip()
        out[uid_str] = feat

    return out


def load_item_feats(path: Path | str = None) -> Dict[str, Any]:
    """
    Load item_feats.json → dict[job_id(str)] = {text, riasec, title, ...}
    """
    p = Path(path) if path else DATA_DIR / "item_feats.json"
    if not p.exists():
        raise FileNotFoundError(f"item_feats.json not found: {p}")

    raw = json.loads(p.read_text(encoding="utf-8"))
    out = {}

    for jid, feat in raw.items():
        jid_norm = _normalize_job_id(jid)
        out[jid_norm] = feat

    return out


def load_mappings(
    user_path: Path | str = None,
    item_path: Path | str = None,
    model_path: Path | str = None
) -> Tuple[Dict[str, Any], Dict[str, Any], Path]:
    """
    Trả về:
        user_feats, item_feats, model_path
    Dùng cho infer_scores trong B4 (NeuMF infer).
    """
    user_feats = load_user_feats(user_path)
    item_feats = load_item_feats(item_path)

    model_p = Path(model_path) if model_path else MODEL_DEFAULT
    if not model_p.exists():
        raise FileNotFoundError(f"NeuMF model not found at {model_p}")

    return user_feats, item_feats, model_p
