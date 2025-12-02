# packages/ai-core/src/ai_core/nlp/essay_infer.py

from __future__ import annotations

from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Literal

import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel

# ------------------------
# 1) Config đường dẫn model
# ------------------------

ROOT = Path(__file__).resolve().parents[3]  # đi lên thêm 1 cấp → packages/ai-core
MODELS_DIR = ROOT / "models"

PHOBERT_RIASEC_DIR = MODELS_DIR / "riasec_phobert"
PHOBERT_BIG5_DIR = MODELS_DIR / "big5_phobert"
SBERT_USER_DIR = MODELS_DIR / "vi_sbert_768"  # user embedding 768D

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


@dataclass
class TraitResult:
    language_detected: str
    language_used: str          # sau dịch
    essay_original: str
    essay_used: str             # text tiếng Việt sau khi dịch nếu cần
    riasec: np.ndarray          # shape (6,)
    big5: np.ndarray            # shape (5,)
    embedding: np.ndarray       # shape (768,)


# ------------------------
# 2) Helper: load model PhoBERT regression
# ------------------------

class PhoBERTRegressor(torch.nn.Module):
    """
    Head hồi quy đơn giản: giống cấu trúc khi train.
    Ở đây giả định bạn đã export full model (base + head) trong best.pt
    Nếu khi train bạn chỉ lưu head, cần wrap lại y chang train_regression.py
    """
    def __init__(self, backbone_name: str, num_labels: int):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(backbone_name)
        hidden_size = self.backbone.config.hidden_size
        self.head = torch.nn.Linear(hidden_size, num_labels)

    def forward(self, input_ids, attention_mask):
        outputs = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        # lấy CLS token
        cls = outputs.last_hidden_state[:, 0, :]
        logits = self.head(cls)
        return logits


def _load_phobert_model(model_dir: Path, num_labels: int):
    """
    Loader robust cho checkpoint kiểu:
      torch.save({"model_state": model.state_dict(), "cfg": cfg}, "best.pt")

    - Đọc tokenizer_name.txt → backbone_name
    - Khởi tạo PhoBERTRegressor(backbone_name, num_labels)
    - Nếu checkpoint bọc trong 'model_state' thì bóc ra
    - load_state_dict(strict=False) để bỏ qua key lạ (vd 'cfg')
    """
    # 1) Đọc tên tokenizer/model gốc
    tok_name = (model_dir / "tokenizer_name.txt").read_text(encoding="utf-8").strip()
    tokenizer = AutoTokenizer.from_pretrained(tok_name)

    # 2) Load checkpoint
    ckpt_path = model_dir / "best.pt"
    if not ckpt_path.exists():
        raise FileNotFoundError(f"best.pt not found in {ckpt_path}")

    state = torch.load(ckpt_path, map_location="cpu")

    # Nếu là dict có key 'model_state', bóc ra cho đúng
    if isinstance(state, dict) and "model_state" in state:
        state = state["model_state"]

    # 3) Khởi tạo model & nạp weight
    model = PhoBERTRegressor(tok_name, num_labels=num_labels)

    # Cho strict=False để nếu checkpoint có thêm/bớt vài key không critical thì vẫn chạy
    load_res = model.load_state_dict(state, strict=False)

    # (Tùy chọn) log missing / unexpected keys để debug nếu cần
    try:
        missing = getattr(load_res, "missing_keys", [])
        unexpected = getattr(load_res, "unexpected_keys", [])
        if missing or unexpected:
            print(f"[PHOBERT] Loaded {ckpt_path} với missing_keys={len(missing)}, unexpected_keys={len(unexpected)}")
            if missing:
                print("  missing (ví dụ vài key đầu):", missing[:5])
            if unexpected:
                print("  unexpected:", unexpected)
    except Exception:
        # trường hợp load_res là None trên phiên bản torch cũ
        pass

    model.to(DEVICE)
    model.eval()

    return tokenizer, model


# ------------------------
# 3) Helper: load SBERT 768D cho user embedding
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
# 4) Ngôn ngữ & dịch (EN ↔ VI)
# ------------------------

def detect_language(text: str) -> str:
    """
    Cách đơn giản, không phụ thuộc lib ngoài:
    - nếu thấy nhiều từ tiếng Anh cơ bản → 'en'
    - ngược lại → 'vi'
    Bạn có thể thay bằng langdetect/fastText sau.
    """
    if not text:
        return "vi"

    lower = text.lower()
    en_keywords = [" the ", " and ", " to ", " for ", " with ", "career", "job", "work"]
    score = sum(1 for kw in en_keywords if kw in lower)
    return "en" if score >= 2 else "vi"


def translate_to_vi(text: str, src_lang: str) -> str:
    """
    Tạm thời stub: nếu src_lang == 'en' thì gọi dịch.
    Bạn có thể:
      - dùng googletrans/deep_translator
      - hoặc call sang 1 service khác
    Ở đây để đơn giản: trả về text gốc nếu chưa tích hợp dịch.
    """
    if src_lang == "vi":
        return text
    # TODO: tích hợp real translation
    # from deep_translator import GoogleTranslator
    # return GoogleTranslator(source="en", target="vi").translate(text)
    return text  # tạm: chưa dịch, nhưng interface sẵn


# ------------------------
# 5) Singleton loader để tránh load model nhiều lần
# ------------------------

_phobert_riasec = None
_phobert_big5 = None
_sbert_user = None


def _get_riasec_model():
    global _phobert_riasec
    if _phobert_riasec is None:
        tok, mdl = _load_phobert_model(PHOBERT_RIASEC_DIR, num_labels=6)
        _phobert_riasec = (tok, mdl)
    return _phobert_riasec


def _get_big5_model():
    global _phobert_big5
    if _phobert_big5 is None:
        tok, mdl = _load_phobert_model(PHOBERT_BIG5_DIR, num_labels=5)
        _phobert_big5 = (tok, mdl)
    return _phobert_big5


def _get_sbert_user():
    global _sbert_user
    if _sbert_user is None:
        tok, mdl = _load_sbert_embedder(SBERT_USER_DIR)
        _sbert_user = (tok, mdl)
    return _sbert_user


# ------------------------
# 6) Hàm predict traits từ bài viết tiếng Việt
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
    # giả sử đã train trên [0..1], nếu không có thể clamp
    preds = torch.sigmoid(logits)  # hoặc identity nếu bạn train regression thuần
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
    # chuẩn hoá L2 giống các embeddings khác
    norm = np.linalg.norm(vec) + 1e-9
    vec = vec / norm
    return vec


# ------------------------
# 7) Hàm public: infer_user_traits (đa ngôn ngữ EN/VN)
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
