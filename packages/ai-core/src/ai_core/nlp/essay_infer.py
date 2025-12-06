# packages/ai-core/src/ai_core/nlp/essay_infer.py
from __future__ import annotations

from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Literal

import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel

try:
    # dùng nếu anh cài deep_translator (ổn định hơn googletrans)
    import importlib
    GoogleTranslator = importlib.import_module("deep_translator").GoogleTranslator
except Exception:
    GoogleTranslator = None  # fallback

# ------------------------
# 1) Config đường dẫn model
# ------------------------

ROOT = Path(__file__).resolve().parents[3]  # packages/ai-core
MODELS_DIR = ROOT / "models"

PHOBERT_RIASEC_DIR = MODELS_DIR / "riasec_phobert"
PHOBERT_BIG5_DIR = MODELS_DIR / "big5_phobert"
SBERT_USER_DIR = MODELS_DIR / "vi_sbert_768"  # user embedding 768D

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


@dataclass
class TraitResult:
    language_detected: str
    language_used: str          # sau dịch (luôn "vi")
    essay_original: str
    essay_used: str             # text tiếng Việt sau khi dịch nếu cần
    riasec: np.ndarray          # shape (6,)
    big5: np.ndarray            # shape (5,)
    embedding: np.ndarray       # shape (768,)


# ------------------------
# 2) PhoBERT regression loader
# ------------------------

class PhoBERTRegressor(torch.nn.Module):
    """
    Head hồi quy đơn giản giống lúc train:
    backbone (PhoBERT) + Linear → num_labels.
    """
    def __init__(self, backbone_name: str, num_labels: int):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(backbone_name)
        hidden_size = self.backbone.config.hidden_size
        self.head = torch.nn.Linear(hidden_size, num_labels)

    def forward(self, input_ids, attention_mask):
        outputs = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        cls = outputs.last_hidden_state[:, 0, :]
        logits = self.head(cls)
        return logits


def _load_phobert_model(model_dir: Path, num_labels: int):
    """
    Loader chịu được các kiểu checkpoint:

    torch.save({"model_state": model.state_dict(), "cfg": cfg}, "best.pt")

    - Đọc tokenizer_name.txt → backbone_name
    - Khởi tạo PhoBERTRegressor
    - Nếu checkpoint bọc trong 'model_state' thì bóc ra
    - load_state_dict(strict=False) cho an toàn
    """
    tok_name = (model_dir / "tokenizer_name.txt").read_text(encoding="utf-8").strip()
    tokenizer = AutoTokenizer.from_pretrained(tok_name)

    ckpt_path = model_dir / "best.pt"
    if not ckpt_path.exists():
        raise FileNotFoundError(f"best.pt not found in {ckpt_path}")

    state = torch.load(ckpt_path, map_location="cpu")
    if isinstance(state, dict) and "model_state" in state:
        state = state["model_state"]

    model = PhoBERTRegressor(tok_name, num_labels=num_labels)
    load_res = model.load_state_dict(state, strict=False)

    # log missing / unexpected để debug
    try:
        missing = getattr(load_res, "missing_keys", [])
        unexpected = getattr(load_res, "unexpected_keys", [])
        if missing or unexpected:
            print(f"[PHOBERT] Loaded {ckpt_path} with "
                  f"missing={len(missing)}, unexpected={len(unexpected)}")
            if missing:
                print("  missing (first):", missing[:5])
            if unexpected:
                print("  unexpected:", unexpected)
    except Exception:
        pass

    model.to(DEVICE)
    model.eval()
    return tokenizer, model


# ------------------------
# 3) SBERT 768D cho user embedding
# ------------------------

def _load_sbert_embedder(model_dir: Path):
    tok_name = (model_dir / "tokenizer_name.txt").read_text(encoding="utf-8").strip()
    tokenizer = AutoTokenizer.from_pretrained(tok_name)
    mdl = AutoModel.from_pretrained(tok_name).to(DEVICE)
    mdl.eval()
    return tokenizer, mdl


def _mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1).float()
    return (last_hidden_state * mask).sum(1) / mask.sum(1).clamp(min=1e-6)


# ------------------------
# 4) Detect & dịch EN → VI
# ------------------------

def detect_language(text: str) -> str:
    """
    Heuristic đơn giản không phụ thuộc lib ngoài.
    Khi cần chính xác hơn thì anh có thể thay bằng fastText/langdetect.
    """
    if not text:
        return "vi"

    lower = text.lower()
    en_keywords = [" the ", " and ", " to ", " for ", " with ", "career", " job ", " work "]
    score = sum(1 for kw in en_keywords if kw in lower)
    return "en" if score >= 2 else "vi"


def translate_to_vi(text: str, src_lang: str) -> str:
    """
    Nếu src_lang == 'en' thì cố gắng dịch sang VI.
    Ưu tiên deep_translator.GoogleTranslator; nếu chưa cài hoặc lỗi thì fallback
    dùng chính text gốc (vẫn chạy được pipeline, chỉ kém chính xác hơn).
    """
    if src_lang == "vi":
        return text

    if GoogleTranslator is None:
        # chưa cài deep_translator → không dịch
        print("[essay_infer] deep_translator not installed, skip translation.")
        return text

    try:
        translated = GoogleTranslator(source=src_lang, target="vi").translate(text)
        return translated or text
    except Exception as e:
        print("[essay_infer] translate_to_vi error:", repr(e))
        return text


# ------------------------
# 5) Singleton loaders
# ------------------------

_phobert_riasec = None
_phobert_big5 = None
_sbert_user = None


def _get_riasec_model():
    global _phobert_riasec
    if _phobert_riasec is None:
        _phobert_riasec = _load_phobert_model(PHOBERT_RIASEC_DIR, num_labels=6)
    return _phobert_riasec


def _get_big5_model():
    global _phobert_big5
    if _phobert_big5 is None:
        _phobert_big5 = _load_phobert_model(PHOBERT_BIG5_DIR, num_labels=5)
    return _phobert_big5


def _get_sbert_user():
    global _sbert_user
    if _sbert_user is None:
        _sbert_user = _load_sbert_embedder(SBERT_USER_DIR)
    return _sbert_user


# ------------------------
# 6) Predict từ tiếng Việt
# ------------------------

@torch.no_grad()
def predict_riasec_vi(text_vi: str) -> np.ndarray:
    tok, mdl = _get_riasec_model()
    enc = tok(
        text_vi,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding="max_length",
    ).to(DEVICE)
    logits = mdl(enc["input_ids"], enc["attention_mask"])
    preds = torch.sigmoid(logits)  # giả định train trên [0,1]
    return preds[0].detach().cpu().numpy()


@torch.no_grad()
def predict_big5_vi(text_vi: str) -> np.ndarray:
    tok, mdl = _get_big5_model()
    enc = tok(
        text_vi,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding="max_length",
    ).to(DEVICE)
    logits = mdl(enc["input_ids"], enc["attention_mask"])
    preds = torch.sigmoid(logits)
    return preds[0].detach().cpu().numpy()


@torch.no_grad()
def encode_user_embedding(text_vi: str) -> np.ndarray:
    tok, mdl = _get_sbert_user()
    enc = tok(
        text_vi,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding="max_length",
    ).to(DEVICE)
    outputs = mdl(**enc)
    pooled = _mean_pool(outputs.last_hidden_state, enc["attention_mask"])
    vec = pooled[0].detach().cpu().numpy().astype("float32")
    norm = np.linalg.norm(vec) + 1e-9
    return (vec / norm).astype("float32")


# ------------------------
# 7) Public API: infer_user_traits
# ------------------------

def infer_user_traits(
    essay_text: str,
    language: Optional[Literal["vi", "en", "auto"]] = "auto",
) -> TraitResult:
    essay_text = (essay_text or "").strip()
    if not essay_text:
        raise ValueError("essay_text is empty")

    lang_detected = detect_language(essay_text) if language in (None, "auto") else language
    essay_vi = translate_to_vi(essay_text, lang_detected)

    riasec = predict_riasec_vi(essay_vi)
    big5 = predict_big5_vi(essay_vi)
    emb = encode_user_embedding(essay_vi)

    return TraitResult(
        language_detected=lang_detected,
        language_used="vi",
        essay_original=essay_text,
        essay_used=essay_vi,
        riasec=riasec,
        big5=big5,
        embedding=emb,
    )
