# src/retrieval/build_mini_index.py
import argparse
import json
import re
import unicodedata
from pathlib import Path

import faiss
import numpy as np


def strip_accents_lower(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    # map đ/Đ -> d/D
    s = s.replace("đ", "d").replace("Đ", "D")
    return s.lower()


def tokenize_allow_list(s: str):
    """
    Chuẩn hoá allowed_tags: chấp nhận 'cntt|du lieu|ml|bi' hoặc 'cong_nghe_thong_tin|du_lieu|may_hoc'
    Trả về set gồm cả cụm và từ con (ASCII, lower).
    """
    if not s:
        return set()
    base = strip_accents_lower(s)
    parts = []
    for seg in base.split("|"):
        seg = seg.strip()
        if not seg:
            continue
        seg_spaces = re.sub(r"[^0-9a-z]+", " ", seg).strip()
        if not seg_spaces:
            continue
        words = seg_spaces.split()
        # thêm cụm dạng underscore + từng từ con
        parts.append("_".join(words))
        parts.extend(words)
    return set(parts)


def expand_meta_token_variants(tok: str):
    """
    Nhận 1 token từ meta (có thể có dấu và '_'), trả về set biến thể để so khớp:
      - ascii_underscore: bỏ dấu + giữ '_'  (vd: 'dữ_liệu' -> 'du_lieu')
      - ascii_spaces:     bỏ dấu + '_'->' ' (vd: 'du lieu')
      - words:            tách theo '_'     (vd: {'du','lieu'})
    Tất cả ở dạng ASCII lower để so khớp với allowed set.
    """
    if not tok:
        return set()
    ascii_underscore = strip_accents_lower(tok)
    ascii_spaces = ascii_underscore.replace("_", " ")
    words = re.sub(r"[^0-9a-z]+", " ", ascii_spaces).strip().split()
    out = set()
    if ascii_underscore:
        out.add(ascii_underscore)
    if ascii_spaces:
        out.add(ascii_spaces)
    out.update(words)
    return out


def main():
    ap = argparse.ArgumentParser("Build mini FAISS index filtered by allowed tags/domains")
    ap.add_argument(
        "--jobs_meta", required=True, help="JSON meta (vd: data/embeddings/jobs_index_visbert.json)"
    )
    ap.add_argument(
        "--embeddings",
        required=True,
        help="NPY embeddings (vd: data/embeddings/jobs_embeddings_visbert.npy)",
    )
    ap.add_argument(
        "--allowed_tags",
        required=True,
        help="VD: 'cntt|du lieu|ml|bi' hoặc 'cong_nghe_thong_tin|du_lieu'",
    )
    ap.add_argument("--index_out", required=True)
    ap.add_argument("--meta_out", required=True)
    ap.add_argument("--emb_out", required=True)
    ap.add_argument(
        "--min_match", type=int, default=1, help="Cần tối thiểu bao nhiêu token khớp (mặc định 1)"
    )
    ap.add_argument(
        "--soc_prefixes",
        type=str,
        default="",
        help="VD: '15-' hoặc '15-|11-3021'. Nếu set, chỉ giữ job_id bắt đầu bằng 1 trong các prefix",
    )
    args = ap.parse_args()

    metas = json.loads(Path(args.jobs_meta).read_text(encoding="utf-8"))
    X = np.load(args.embeddings).astype("float32")

    if len(metas) != X.shape[0]:
        raise SystemExit(f"[ERR] meta ({len(metas)}) != embeddings ({X.shape[0]})")

    allow = tokenize_allow_list(args.allowed_tags)
    if not allow:
        raise SystemExit("[ERR] allowed_tags trống sau khi chuẩn hoá")

    soc_prefixes = [p.strip() for p in (args.soc_prefixes or "").split("|") if p.strip()]

    keep_idx = []
    for i, m in enumerate(metas):
        # 1) SOC filter (nếu có)
        if soc_prefixes:
            jid = (m.get("job_id") or "").strip()
            if not any(jid.startswith(p) for p in soc_prefixes):
                continue

        # 2) allowed_tags filter
        raw = m.get("tag_tokens")
        if not raw:
            raw = m.get("tags") or ""
            if isinstance(raw, str):
                tags = [t.strip() for t in re.split(r"[|,;/]", raw) if t.strip()]
            else:
                tags = raw or []
        else:
            tags = raw

        hit = 0
        for t in tags:
            variants = expand_meta_token_variants(t)
            if variants & allow:
                hit += 1
                if hit >= args.min_match:
                    break
        if hit >= args.min_match:
            keep_idx.append(i)

    if not keep_idx:
        print("[WARN] Không tìm thấy bản ghi nào khớp allowed_tags (và/hoặc soc_prefixes).")
        for j in range(min(5, len(metas))):
            print("SAMPLE tag_tokens:", metas[j].get("tag_tokens"))
        raise SystemExit("[ERR] Kết quả rỗng sau lọc")

    X_sub = X[keep_idx].copy()
    faiss.normalize_L2(X_sub)
    index = faiss.IndexFlatIP(X_sub.shape[1])
    index.add(X_sub)

    Path(args.index_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.meta_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.emb_out).parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, args.index_out)
    metas_sub = [metas[i] for i in keep_idx]
    Path(args.meta_out).write_text(
        json.dumps(metas_sub, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    np.save(args.emb_out, X_sub)

    print(f"[OK] Mini index -> {args.index_out} (ntotal={index.ntotal})")
    print(f"[OK] Meta -> {args.meta_out} (records={len(metas_sub)})")
    print(f"[OK] Emb -> {args.emb_out} {X_sub.shape}")
    print(
        f"[INFO] Matched records: {len(metas_sub)} / {len(metas)} (allowed[:20]={sorted(list(allow))[:20]} ; soc_prefixes={soc_prefixes or 'N/A'})"
    )


if __name__ == "__main__":
    main()
