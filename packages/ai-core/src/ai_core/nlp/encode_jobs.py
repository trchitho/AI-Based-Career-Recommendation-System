# src/nlp/encode_jobs.py
from __future__ import annotations

import argparse
import csv
import json
import unicodedata
from pathlib import Path
from typing import Any

import numpy as np
import torch
from tqdm import tqdm
from transformers import AutoModel, AutoTokenizer


# ---------- Text utils ----------
def strip_accents_lower(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    # FIX: "Ä‘/Ä" -> "d/D"
    s = s.replace("Ä‘", "d").replace("Ä", "D")
    return s.lower()


def _strip_accents_lower_ascii(s: str) -> str:
    # DÃ¹ng khi cáº§n biáº¿n thá»ƒ khÃ´ng dáº¥u
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace("Ä‘", "d").replace("Ä", "D")
    return s.lower()


def _lower_keep_diacritics(s: str) -> str:
    # Giá»¯ dáº¥u: chá»‰ chuáº©n hoÃ¡ & lower, KHÃ”NG bá» dáº¥u
    if not s:
        return ""
    # NFC Ä‘á»ƒ gá»™p kÃ½ tá»± tá»• há»£p vá» dáº¡ng tiÃªu chuáº©n (Ä‘áº£m báº£o Ä‘á»“ng nháº¥t 'á»‘', 'á»™',...)
    return unicodedata.normalize("NFC", s).lower()


def _split_words_keep_unicode(s: str) -> list[str]:
    # TÃ¡ch theo kÃ½ tá»± "khÃ´ng pháº£i chá»¯/sá»‘" nhÆ°ng giá»¯ nguyÃªn chá»¯ cÃ³ dáº¥u (dÃ¹ng .isalnum() há»— trá»£ Unicode)
    buf = []
    for ch in s:
        buf.append(ch if ch.isalnum() else " ")
    return [w for w in "".join(buf).split() if w]


def tokenize_tags(
    tags_vi: str,
    mode: str = "phrases",  # "phrases" | "words" | "both"
    collapse_phrase_components: bool = True,  # True: cÃ³ 'há»c_chá»§_Ä‘á»™ng' thÃ¬ bá» 'há»c','chá»§','Ä‘á»™ng'
    stopwords: (
        list[str] | None
    ) = None,  # danh sÃ¡ch tá»« muá»‘n loáº¡i (Ä‘Ã£ lower, cÃ³ dáº¥u hoáº·c khÃ´ng dáº¥u tÃ¹y emit_ascii_variant)
    min_word_len: int = 2,
    keep_diacritics: bool = True,  # <<< GIá»® Dáº¤U
    emit_ascii_variant: bool = False,  # <<< THÃŠM BIáº¾N THá»‚ KHÃ”NG Dáº¤U (tÃ¹y chá»n)
) -> list[str]:
    """
    Tráº£ vá» danh sÃ¡ch token tá»« tags_vi. Há»— trá»£:
      - keep_diacritics=True: token cÃ³ dáº¥u (vÃ­ dá»¥ 'há»c_chá»§_Ä‘á»™ng', 'quáº£n_lÃ½')
      - emit_ascii_variant=True: thÃªm cáº£ biáº¿n thá»ƒ khÃ´ng dáº¥u song song ('hoc_chu_dong', 'quan_ly')
      - mode: 'phrases' (máº·c Ä‘á»‹nh gá»n), 'words', hoáº·c 'both'
      - collapse_phrase_components: náº¿u Ä‘Ã£ cÃ³ cá»¥m thÃ¬ bá» tá»« Ä‘Æ¡n bÃª  n trong cá»¥m
    """
    if not tags_vi:
        return []

    norm = _lower_keep_diacritics if keep_diacritics else _strip_accents_lower_ascii
    base = norm(tags_vi)
    stop = set(stopwords or [])

    phrases, words_all = [], []

    for seg in base.split("|"):
        seg = seg.strip()
        if not seg:
            continue
        ws = _split_words_keep_unicode(seg)  # váº«n giá»¯ dáº¥u trong tá»«
        ws = [w for w in ws if len(w) >= min_word_len and w not in stop]
        if not ws:
            continue
        phrases.append("_".join(ws))
        words_all.extend(ws)

    out, seen = [], set()

    def add(tok: str):
        if tok and tok not in seen:
            out.append(tok)
            seen.add(tok)

    # 1) ThÃªm cá»¥m
    if mode in ("both", "phrases"):
        for ph in phrases:
            add(ph)

    # 2) ThÃªm tá»« Ä‘Æ¡n (náº¿u cáº§n)
    if mode in ("both", "words"):
        if collapse_phrase_components and phrases:
            comp = set()
            for ph in phrases:
                comp.update(ph.split("_"))
            for w in words_all:
                if w not in comp:
                    add(w)
        else:
            for w in words_all:
                add(w)

    # 3) ThÃªm biáº¿n thá»ƒ khÃ´ng dáº¥u (tuá»³ chá»n)
    if emit_ascii_variant:
        ascii_seen = set()

        def add_ascii(tok: str):
            t2 = _strip_accents_lower_ascii(tok)
            if t2 and t2 not in seen and t2 not in ascii_seen:
                out.append(t2)
                ascii_seen.add(t2)

        for tok in list(out):
            add_ascii(tok)

    return out


# ---------- IO & schema helpers ----------
def _norm_key(k: str) -> str:
    return (k or "").replace("\ufeff", "").strip()


def read_catalog(path: str) -> list[dict[str, Any]]:
    """
    Äá»c catalog .csv (utf-8-sig) hoáº·c .json/.jsonl (utf-8).
    Chuáº©n hoÃ¡ khÃ³a cá»™t, nuá»‘t BOM.
    """
    p = Path(path)
    ext = p.suffix.lower()
    rows: list[dict[str, Any]] = []
    if ext == ".csv":
        with p.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append({_norm_key(k): v for k, v in (r or {}).items() if k is not None})
    elif ext in (".json", ".jsonl"):
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("JSON pháº£i lÃ  list cÃ¡c object")
        rows = [{_norm_key(k): v for k, v in (r or {}).items()} for r in data]
    else:
        raise ValueError(f"Äá»‹nh dáº¡ng catalog khÃ´ng há»— trá»£: {ext}")
    return rows


def get_col(row: dict[str, Any], *candidates: str) -> str:
    """Láº¥y giÃ¡ trá»‹ cá»™t Ä‘áº§u tiÃªn tá»“n táº¡i trong candidates, dáº¡ng string sáº¡ch."""
    for c in candidates:
        if c in row and row[c] is not None:
            return str(row[c]).strip()
    return ""


def parse_riasec_centroid(row: dict[str, Any]) -> list[float]:
    js = get_col(row, "riasec_centroid_json")
    if not js:
        return []
    try:
        arr = json.loads(js)
        if isinstance(arr, list) and len(arr) == 6 and all(isinstance(x, int | float) for x in arr):
            return [float(x) for x in arr]
    except Exception:
        pass
    return []


def row_to_text(
    row: dict[str, Any],
    include_skills: bool = True,
    include_tags: bool = False,
) -> str:
    """
    Táº¡o cÃ¢u Ä‘áº§u vÃ o encoder tá»« cÃ¡c cá»™t *_vi (fallback sang cá»™t chung).
    CÃ³ thá»ƒ thÃªm skills/tags Ä‘á»ƒ tÄƒng tÃ­n hiá»‡u.
    """
    title = get_col(row, "title_vi", "title")
    desc = get_col(row, "description_vi", "description")
    skills = get_col(row, "skills_vi", "skills")
    tags = get_col(row, "tags_vi", "tags")

    parts = []
    if title:
        parts.append(title)
    if desc:
        parts.append(desc)
    if include_skills and skills:
        parts.append(f"Ká»¹ nÄƒng: {skills}. Ká»¹ nÄƒng quan trá»ng: {skills}")
    if include_tags and tags:
        parts.append(f"Tags: {tags}")

    return ". ".join([p for p in parts if p]).strip()


# ---------- Model / encoding ----------
def resolve_model_name(model_arg: str) -> str:
    """
    - Náº¿u model_arg lÃ  thÆ° má»¥c â†’ Ä‘á»c tokenizer_name.txt bÃªn trong.
    - Náº¿u khÃ´ng â†’ coi nhÆ° HF model id trá»±c tiáº¿p.
    """
    p = Path(model_arg)
    if p.is_dir():
        tnf = p / "tokenizer_name.txt"
        if not tnf.exists():
            raise FileNotFoundError(
                f"Model dir '{model_arg}' khÃ´ng cÃ³ tokenizer_name.txt; hÃ£y táº¡o file chá»©a 1 dÃ²ng HF model id."
            )
        name = tnf.read_text(encoding="utf-8").strip()
        if not name:
            raise ValueError(f"tokenizer_name.txt rá»—ng trong '{model_arg}'")
        return name
    return model_arg


def choose_device(device_arg: str) -> str:
    if device_arg == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if device_arg in ("cuda", "cpu", "mps"):
        return device_arg
    raise ValueError("--device chá»‰ nháº­n: auto|cuda|cpu|mps")


def mean_pool(last_hidden_state: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
    """Mean pooling vá»›i mask."""
    mask = attention_mask.unsqueeze(-1).type_as(last_hidden_state)  # [B, T, 1]
    summed = (last_hidden_state * mask).sum(dim=1)  # [B, H]
    counts = mask.sum(dim=1).clamp(min=1e-9)  # [B, 1]
    return summed / counts


@torch.no_grad()
def encode_texts(
    texts: list[str],
    tokenizer,
    model,
    device: str,
    batch_size: int = 32,
    max_length: int = 256,
    normalize_in_encoder: bool = False,
) -> np.ndarray:
    all_vecs = []
    for i in tqdm(range(0, len(texts), batch_size), desc="Encoding jobs"):
        batch = texts[i : i + batch_size]
        enc = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        enc = {k: v.to(device) for k, v in enc.items()}
        out = model(**enc)
        vecs = mean_pool(out.last_hidden_state, enc["attention_mask"])  # [B, H]

        if normalize_in_encoder:
            vecs = torch.nn.functional.normalize(vecs, p=2, dim=1)

        all_vecs.append(vecs.cpu().numpy().astype("float32"))
    return np.vstack(all_vecs)


# ---------- Main ----------
def main():
    ap = argparse.ArgumentParser(
        "Encode Vietnamese job catalog with a semantic encoder (vi-SBERT/MiniLM)."
    )
    # I/O & model
    ap.add_argument("--catalog", required=True, help="Path CSV/JSON jobs catalog.")
    ap.add_argument(
        "--model", required=True, help="HF model id hoáº·c thÆ° má»¥c chá»©a tokenizer_name.txt"
    )
    ap.add_argument("--model_name", default=None, help="Náº¿u set, Æ°u tiÃªn dÃ¹ng HF model id nÃ y.")
    ap.add_argument("--device", default="auto", help="auto|cuda|cpu|mps (máº·c Ä‘á»‹nh: auto)")

    # text building
    ap.add_argument("--include_skills", action="store_true")
    ap.add_argument("--include_tags", action="store_true")

    # batching/encoding
    ap.add_argument("--batch_size", type=int, default=32)
    ap.add_argument("--max_length", type=int, default=256)
    ap.add_argument(
        "--normalize_in_encoder", action="store_true", help="L2-normalize ngay trong encoder"
    )

    # outputs
    ap.add_argument("--emb_out", required=True)
    ap.add_argument("--idx_out", required=True)

    # tag tokenization config
    ap.add_argument("--tag_mode", default="both", choices=["phrases", "words", "both"])
    ap.add_argument("--collapse_phrase_components", action="store_true")
    ap.add_argument("--min_word_len", type=int, default=2)
    ap.add_argument("--tag_stopwords", default="", help="ÄÆ°á»ng dáº«n .txt: má»—i dÃ²ng 1 stopword")
    ap.add_argument(
        "--tag_preview_n", type=int, default=20, help="Sá»‘ token hiá»ƒn thá»‹ á»Ÿ sample preview"
    )
    ap.add_argument(
        "--tag_keep_diacritics", action="store_true", help="Sinh tag_tokens cÃ³ dáº¥u (Unicode)"
    )
    ap.add_argument(
        "--tag_emit_ascii_variant",
        action="store_true",
        help="Sinh thÃªm biáº¿n thá»ƒ khÃ´ng dáº¥u song song",
    )

    args = ap.parse_args()

    # 1) Resolve model name & device
    model_name = args.model_name.strip() if args.model_name else resolve_model_name(args.model)
    device = choose_device(args.device)

    # 2) Load tokenizer/model
    tok = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    mdl = AutoModel.from_pretrained(model_name).to(device).eval()

    # 3) Load stopwords (náº¿u cÃ³)
    stopwords: list[str] = []
    if args.tag_stopwords:
        sp = Path(args.tag_stopwords)
        if sp.exists():
            stopwords = [
                line.strip() for line in sp.read_text(encoding="utf-8").splitlines() if line.strip()
            ]

    # 4) Read catalog
    rows = read_catalog(args.catalog)
    if not rows:
        raise SystemExit("[ERR] Catalog rá»—ng.")

    texts: list[str] = []
    metas: list[dict[str, Any]] = []

    # 5) Build texts + metas
    for r in rows:
        text = row_to_text(r, include_skills=args.include_skills, include_tags=args.include_tags)
        job_id = get_col(r, "job_id", "soc", "id")  # linh hoáº¡t nhÆ°ng Æ°u tiÃªn job_id
        tags_vi = get_col(r, "tags_vi", "tags")

        tag_tokens = tokenize_tags(
            tags_vi,
            mode=args.tag_mode,
            collapse_phrase_components=args.collapse_phrase_components,
            stopwords=stopwords,
            min_word_len=args.min_word_len,
            keep_diacritics=args.tag_keep_diacritics,
            emit_ascii_variant=args.tag_emit_ascii_variant,
        )

        metas.append(
            {
                "job_id": job_id,
                "title": get_col(r, "title_vi", "title"),
                "skills": get_col(r, "skills_vi", "skills"),
                "tags_vi": tags_vi,
                "tag_tokens": tag_tokens,
                "riasec_centroid": parse_riasec_centroid(r),
            }
        )
        texts.append(text if text else get_col(r, "title_vi", "title"))

    # 6) Encode
    emb = encode_texts(
        texts=texts,
        tokenizer=tok,
        model=mdl,
        device=device,
        batch_size=args.batch_size,
        max_length=args.max_length,
        normalize_in_encoder=args.normalize_in_encoder,
    ).astype("float32")

    # 7) Save
    out_emb = Path(args.emb_out)
    out_idx = Path(args.idx_out)
    out_emb.parent.mkdir(parents=True, exist_ok=True)
    out_idx.parent.mkdir(parents=True, exist_ok=True)

    np.save(out_emb, emb)
    out_idx.write_text(json.dumps(metas, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] embeddings -> {out_emb} {emb.shape}")
    print(f"[OK] index json -> {out_idx} (records={len(metas)})")
    if metas:
        smp = metas[0].copy()
        full = smp.get("tag_tokens", []) or []
        preview = full[: max(1, args.tag_preview_n)]
        smp["tag_tokens_preview"] = preview
        smp["tag_tokens_count"] = len(full)
        if "tag_tokens" in smp:  # trÃ¡nh in quÃ¡ dÃ i
            del smp["tag_tokens"]
        print("[Sample meta]:", json.dumps(smp, ensure_ascii=False))


if __name__ == "__main__":
    main()
