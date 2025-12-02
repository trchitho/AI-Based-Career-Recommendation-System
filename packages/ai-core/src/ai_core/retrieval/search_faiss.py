# src/retrieval/search_faiss.py
import argparse
import json
import re
import time
import unicodedata
from pathlib import Path
from typing import Any

import faiss
import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer


# ---------------- Encoder helpers ----------------
def mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1).type_as(last_hidden_state)
    summed = (last_hidden_state * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1e-9)
    return summed / counts


def resolve_model_name(model_arg: str | None) -> str | None:
    if model_arg is None:
        return None
    p = Path(model_arg)
    if p.is_dir():
        tnf = p / "tokenizer_name.txt"
        if not tnf.exists():
            raise FileNotFoundError(
                f"Model dir '{model_arg}' thiếu tokenizer_name.txt; tạo file chứa 1 dòng HF model id."
            )
        name = tnf.read_text(encoding="utf-8").strip()
        if not name:
            raise ValueError(f"tokenizer_name.txt rỗng trong '{model_arg}'")
        return name
    return model_arg


@torch.no_grad()
def encode_queries(
    texts: list[str],
    model_name_or_path: str,
    device: str = "cpu",
    max_length: int = 256,
    normalize: bool = True,
) -> np.ndarray:
    tok = AutoTokenizer.from_pretrained(model_name_or_path, use_fast=True)
    mdl = AutoModel.from_pretrained(model_name_or_path).to(device).eval()

    vecs = []
    for t in texts:
        enc = tok([t], padding=True, truncation=True, max_length=max_length, return_tensors="pt")
        enc = {k: v.to(device) for k, v in enc.items()}
        out = mdl(**enc)
        v = mean_pool(out.last_hidden_state, enc["attention_mask"])
        if normalize:
            v = torch.nn.functional.normalize(v, p=2, dim=1)
        vecs.append(v.cpu().numpy().astype("float32"))
    return np.vstack(vecs)


# ---------------- Meta & tag utils ----------------
def load_jobs_index(path: str) -> list[dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def ensure_2d(arr: np.ndarray) -> np.ndarray:
    if arr.ndim == 1:
        arr = arr[None, :]
    return arr


_TAG_SPLIT_RE = re.compile(r"[|/,&]+|\s+|[^0-9A-Za-zÃ€-á»¹]+")


def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    # >>> FIX QUAN TRỌNG: chuẩn hoá 'đ/Đ' -> 'd/D'
    s = s.replace("Ä‘", "d").replace("Ä", "D")
    return s


def tokenize_tags(s: str) -> list[str]:
    # tách bởi | / , & khoảng trắng và ký tự không chữ/không số
    toks = _TAG_SPLIT_RE.split(s or "")
    toks = [strip_accents(t.lower()).strip() for t in toks if t and t.strip()]
    return toks


# ---------------- Main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=str, default="data/embeddings/faiss_jobs_ip.index")
    ap.add_argument("--jobs_meta", type=str, default="data/embeddings/jobs_index.json")
    ap.add_argument("--topk", type=int, default=5)

    # Query nguá»“n
    ap.add_argument("--query_vector", type=str, default=None, help="Đường dẫn .npy [D] hoặc [1,D]")
    ap.add_argument(
        "--query_text",
        type=str,
        nargs="*",
        default=None,
        help="Một hoặc nhiều câu: --query_text 'backend' 'phân tích dữ liệu'",
    )
    ap.add_argument(
        "--model", type=str, default=None, help="HF id / folder (bắt buộc nếu dùng --query_text)"
    )

    # Encode params
    ap.add_argument("--max_length", type=int, default=256, help="Độ dài cắt câu truy vấn")
    ap.add_argument(
        "--no_norm", action="store_true", help="Không L2-normalize query (không khuyến nghị)"
    )

    # Lá»c theo tags
    ap.add_argument(
        "--allowed_tags",
        type=str,
        default=None,
        help="VD: 'CNTT|Dữ liệu|ML|BI' ; chỉ trả kết quả có ít nhất 1 tag này (so khớp mềm, bỏ dấu).",
    )

    # Over-fetch trÆ°á»›c khi lá»c
    ap.add_argument(
        "--fetch_k",
        type=int,
        default=None,
        help="Số lượng ứng viên lấy từ FAISS trước khi lọc tags. Mặc định: max(topk*5, 100).",
    )

    # Debug
    ap.add_argument(
        "--debug_tags", action="store_true", help="In debug khi lọc tags làm rỗng kết quả."
    )

    # Xuáº¥t JSON
    ap.add_argument("--as_json", action="store_true", help="In kết quả dạng JSON")
    args = ap.parse_args()

    # Load index & meta
    index = faiss.read_index(args.index)
    metas = load_jobs_index(args.jobs_meta)
    if len(metas) != index.ntotal:
        print(
            f"[WARN] Số meta ({len(metas)}) != index.ntotal ({index.ntotal}). Kiểm tra lại thứ tự & dữ liệu."
        )

    # Parse allowed tags
    allowed_set = None
    if args.allowed_tags:
        allowed_set = set(tokenize_tags(args.allowed_tags))
        if not allowed_set:
            print("[WARN] allowed_tags sau chuẩn hoá rỗng → bỏ lọc.")

    # Chuáº©n bá»‹ query vectors
    if args.query_vector:
        q = np.load(args.query_vector).astype("float32")
        q = ensure_2d(q)
        if not args.no_norm:
            faiss.normalize_L2(q)
        queries = q
        query_texts = None
    elif args.query_text:
        if not args.model:
            raise ValueError("--model là bắt buộc khi dùng --query_text")
        model_name = resolve_model_name(args.model)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        queries = encode_queries(
            args.query_text,
            model_name_or_path=model_name,
            device=device,
            max_length=args.max_length,
            normalize=(not args.no_norm),
        )
        query_texts = args.query_text
    else:
        raise ValueError("Cần --query_vector hoặc --query_text (kèm --model)")

    # Search tá»«ng query
    all_outputs = []
    for qi in range(queries.shape[0]):
        q = queries[qi : qi + 1, :]

        # Over-fetch đủ lớn để lọc
        default_fetch = max(args.topk * 5, 100)
        fetch_k = args.fetch_k if args.fetch_k and args.fetch_k > 0 else default_fetch
        fetch_k = min(fetch_k, index.ntotal)

        t0 = time.perf_counter()
        sims, idxs = index.search(q, fetch_k)
        dt_ms = (time.perf_counter() - t0) * 1000.0

        cand = []
        dropped_by_tags = 0

        for i, s in zip(idxs[0], sims[0], strict=False):
            if i < 0:
                continue
            if allowed_set:
                # ƯU TIÊN tag_tokens nếu có; nếu không, fallback về tags (raw)
                tt = metas[i].get("tag_tokens")
                if isinstance(tt, list) and tt:
                    # Chuẩn hoá về ASCII (bỏ dấu + đ->d) và tách thành token để so khớp mềm
                    candidate_tokens = set()
                    for tok in tt:
                        ascii_tok = strip_accents(tok.lower())
                        # thêm cả biến thể thay '_' thành ' ' rồi tách từ
                        ascii_tok_sp = ascii_tok.replace("_", " ")
                        candidate_tokens.update(t for t in _TAG_SPLIT_RE.split(ascii_tok_sp) if t)
                        # giữ luôn cụm underscore (vd: 'cong_nghe_thong_tin')
                        if ascii_tok:
                            candidate_tokens.add(ascii_tok)
                else:
                    raw = metas[i].get("tags") or ""
                    candidate_tokens = set(tokenize_tags(raw))

                # chỉ nhận nếu share ít nhất 1 token với allowed_set
                if allowed_set.isdisjoint(candidate_tokens):
                    dropped_by_tags += 1
                    continue

            cand.append((i, s))
            if len(cand) >= args.topk:
                break

        # Nếu sau lọc rỗng → cảnh báo rõ ràng
        if not cand and allowed_set:
            print("[WARN] Không có kết quả sau khi lọc allowed_tags.")
            if args.debug_tags:
                # In vài ứng viên top-k trước lọc để xem tag có gì
                peek = list(zip(idxs[0][:10], sims[0][:10], strict=False))
                print(f"[DEBUG] allowed_set = {sorted(allowed_set)}")
                for j, (ii, sc) in enumerate(peek, 1):
                    if ii < 0:
                        continue
                    raw = metas[ii].get("tags") or ""
                    print(
                        f"  cand#{j}: score={sc:.4f} | job_id={metas[ii].get('job_id')} | title={metas[ii].get('title')}"
                    )
                    print(f"          tags_raw='{raw}'")
                    print(f"          tokens={tokenize_tags(raw)}")
                print(f"[DEBUG] dropped_by_tags={dropped_by_tags} / fetched={fetch_k}")

        # Build output
        results = []
        for rank, (i, s) in enumerate(cand, 1):
            rec = metas[i] if i < len(metas) else {"job_id": "?", "title": "?"}
            results.append(
                {
                    "rank": rank,
                    "job_id": rec.get("job_id"),
                    "title": rec.get("title"),
                    "score": float(s),
                }
            )

        payload = {"latency_ms": round(dt_ms, 3), "topk": args.topk, "results": results}
        if query_texts is not None:
            payload["query_text"] = query_texts[qi]
        all_outputs.append(payload)

    # Print
    if args.as_json:
        print(
            json.dumps(
                all_outputs if len(all_outputs) > 1 else all_outputs[0],
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        for out in all_outputs:
            if "query_text" in out:
                print(f"\n[Q] {out['query_text']}")
            print(f"[OK] Search latency: {out['latency_ms']:.3f} ms for top-{out['topk']}")
            for r in out["results"]:
                print(
                    f"{r['rank']:2d}. job_id={r['job_id']} | title={r['title']} | score={r['score']:.4f}"
                )


if __name__ == "__main__":
    main()
