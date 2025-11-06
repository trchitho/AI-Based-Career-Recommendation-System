# src/data/build_jobs_translated.py
import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

import torch
from tqdm import tqdm

# =========================
# Defaults (override via CLI)
# =========================
DEF_IN = Path("data/catalog/jobs.csv")
DEF_OUT_JSONL = Path("data/processed/unified_vi.jsonl")
DEF_OUT_CSV = Path("data/catalog/jobs_translated.csv")
DEF_GLOSSARY = Path("data/processed/job_alias_en2vi.json")  # EN->VI mapping (ưu tiên cho Title)
DEF_CACHE = Path("data/processed/mt_cache.jsonl")
DEF_RIASEC_MAP = Path("data/processed/job_riasec_map.json")
DEF_SKILL_TRANS = Path("data/catalog/skill_trans_vi.json")  # EN->VI cho skills

ENGINE_NLLB = "nllb"
ENGINE_OPUS = "opus"

DEF_NLLB_MODEL = "facebook/nllb-200-distilled-600M"  # eng_Latn -> vie_Latn
DEF_OPUS_MODEL = "Helsinki-NLP/opus-mt-en-vi"  # dùng >>vie<<

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# =========================
# Utils
# =========================
def load_glossary(glossary_path: Path) -> dict[str, str]:
    if glossary_path.exists():
        obj = json.loads(glossary_path.read_text(encoding="utf-8"))
        if isinstance(obj, dict) and "en2vi" in obj and isinstance(obj["en2vi"], dict):
            return obj["en2vi"]
        return obj if isinstance(obj, dict) else {}
    return {}


def apply_glossary(text: str, glossary: dict[str, str]) -> str:
    if not text:
        return ""
    # thay thế theo ranh giới từ; không phân biệt hoa thường
    for en, vi in glossary.items():
        text = re.sub(rf"\b{re.escape(en)}\b", vi, text, flags=re.IGNORECASE)
    return text


def sanitize_vi(text: str) -> str:
    if not text:
        return ""
    bad_tokens = ["Comment", "GenericName", "NameName", "C/", "CC/", "EEE"]
    for bt in bad_tokens:
        text = text.replace(bt, "")
    text = re.sub(r"\s{2,}", " ", text).strip(' "')
    return text.strip()


# =========================
# Cache helpers
# =========================
def load_cache(cache_path: Path) -> dict[str, str]:
    m: dict[str, str] = {}
    if cache_path.exists():
        with cache_path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                en = obj.get("en")
                vi = obj.get("vi")
                if en is not None and vi is not None:
                    m[en] = vi
    return m


def append_cache(cache_path: Path, pairs: list[tuple[str, str]]):
    if not pairs:
        return
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with cache_path.open("a", encoding="utf-8") as f:
        for en, vi in pairs:
            f.write(json.dumps({"en": en, "vi": vi}, ensure_ascii=False) + "\n")


# =========================
# Input loader (CSV / JSONL)
# =========================
def parse_skills_field(skills_raw: str) -> list[str]:
    skills_raw = (skills_raw or "").strip()
    if not skills_raw:
        return []
    skills_raw = re.sub(r"\s*([|,;])\s*", r"\1", skills_raw)
    parts = re.split(r"[|,;]", skills_raw)
    return [s.strip() for s in parts if s.strip()]


def load_input_records(in_path: Path) -> list[dict[str, Any]]:
    recs: list[dict[str, Any]] = []
    suf = in_path.suffix.lower()

    if suf == ".csv":
        with in_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            # strip toàn bộ header để tránh " job_id   "
            if reader.fieldnames:
                reader.fieldnames = [(h or "").strip() for h in reader.fieldnames]

            for r in reader:
                # strip thêm lần nữa với key/value
                r = {(k or "").strip(): (v or "") for k, v in r.items()}

                job_id = r.get("job_id") or r.get("id") or r.get("code") or ""
                title_en = r.get("title_en") or r.get("title") or ""
                desc_en = r.get("description_en") or r.get("description") or r.get("desc") or ""
                skills_raw = r.get("skills_en") or r.get("skills") or ""
                riasec_vec = r.get("riasec_vector") or r.get("riasec_centroid_json") or ""

                recs.append(
                    {
                        "job_id_en": (job_id or "").strip(),
                        "title_en": (title_en or "").strip(),
                        "description_en": (desc_en or "").strip(),
                        "skills_en": parse_skills_field(skills_raw),
                        "riasec_vec_src": (riasec_vec or "").strip(),
                        "source": r.get("source") or "catalog_csv",
                    }
                )

    elif suf in (".jsonl", ".json"):
        with in_path.open("r", encoding="utf-8") as f:
            if suf == ".jsonl":
                lines = f
            else:
                lines = [f.read()]
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                recs.append(
                    {
                        "job_id_en": (obj.get("job_id_en") or obj.get("job_id") or "").strip(),
                        "title_en": (obj.get("title_en") or obj.get("title") or "").strip(),
                        "description_en": (
                            obj.get("description_en") or obj.get("description") or ""
                        ).strip(),
                        "skills_en": obj.get("skills_en") or obj.get("skills") or [],
                        "riasec_vec_src": (
                            obj.get("riasec_vector") or obj.get("riasec_centroid_json") or ""
                        ).strip(),
                        "source": obj.get("source") or "jsonl",
                    }
                )
    else:
        raise ValueError(f"Unsupported input format: {in_path}")

    # Sanity log
    n_total = len(recs)
    n_title = sum(1 for r in recs if r.get("title_en"))
    n_desc = sum(1 for r in recs if r.get("description_en"))
    n_sk = sum(1 for r in recs if r.get("skills_en"))
    print(f"[INFO] Loaded {n_total} records. With title={n_title}, desc={n_desc}, skills={n_sk}")
    if n_total and n_title == 0 and n_desc == 0:
        print(
            "[WARN] Input CSV headers might have unexpected names. Headers were normalized. Double-check your columns."
        )
    return recs


# =========================
# Translators (safe + lazy fallback)
# =========================
class Translator:
    def translate_batch(self, texts: list[str], max_len: int, num_beams: int) -> list[str]:
        raise NotImplementedError


class NLLBTranslator(Translator):
    def __init__(self, model_name: str = DEF_NLLB_MODEL):
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.src_code = "eng_Latn"
        self.tgt_code = "vie_Latn"
        self.tok = AutoTokenizer.from_pretrained(
            model_name, src_lang=self.src_code, tgt_lang=self.tgt_code
        )
        self.mdl = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(DEVICE).eval()
        self.forced_bos = self._find_lang_bos_id(self.tok, self.tgt_code)

    @staticmethod
    def _find_lang_bos_id(tok, lang_code: str):
        if hasattr(tok, "lang_code_to_id") and isinstance(tok.lang_code_to_id, dict):
            if lang_code in tok.lang_code_to_id:
                return tok.lang_code_to_id[lang_code]
        for c in [
            lang_code,
            f">>{lang_code}<<",
            f"__{lang_code}__",
            "vie_Latn",
            "vie",
            "vi_VN",
            "vi",
        ]:
            try:
                tid = tok.convert_tokens_to_ids(c)
                if isinstance(tid, int) and tid != tok.unk_token_id:
                    return tid
            except Exception:
                pass
        return None

    def translate_batch(self, texts: list[str], max_len: int, num_beams: int) -> list[str]:
        if not texts:
            return []
        texts = [(t or "")[:4000] for t in texts]
        if hasattr(self.tok, "src_lang"):
            self.tok.src_lang = self.src_code
        enc = self.tok(
            texts, return_tensors="pt", padding=True, truncation=True, max_length=max_len
        ).to(DEVICE)
        gen_kwargs = dict(
            max_length=max_len, num_beams=num_beams, early_stopping=True, no_repeat_ngram_size=3
        )
        if self.forced_bos is not None:
            gen_kwargs["forced_bos_token_id"] = self.forced_bos
        with torch.no_grad():
            out_ids = self.mdl.generate(**enc, **gen_kwargs)
        out = self.tok.batch_decode(out_ids, skip_special_tokens=True)
        return [sanitize_vi(o) for o in out]


class OpusTranslator(Translator):
    def __init__(self, model_name: str = DEF_OPUS_MODEL):
        # chỉ khởi tạo nếu thật sự cần fallback
        from transformers import MarianMTModel, MarianTokenizer

        self.tok = MarianTokenizer.from_pretrained(model_name)
        self.mdl = MarianMTModel.from_pretrained(model_name).to(DEVICE).eval()
        self.forced_bos = None
        if hasattr(self.tok, "lang_code_to_id") and isinstance(self.tok.lang_code_to_id, dict):
            self.forced_bos = self.tok.lang_code_to_id.get("vie", None)

    def translate_batch(self, texts: list[str], max_len: int, num_beams: int) -> list[str]:
        if not texts:
            return []
        use_prefix = self.forced_bos is None
        clipped = [(t or "")[:4000] for t in texts]
        if use_prefix:
            clipped = [f">>vie<< {t}" for t in clipped]
        enc = self.tok(
            clipped, return_tensors="pt", padding=True, truncation=True, max_length=max_len
        )
        enc = {k: v.to(DEVICE) for k, v in enc.items()}
        with torch.no_grad():
            out_ids = self.mdl.generate(
                **enc,
                max_length=max_len,
                num_beams=num_beams,
                early_stopping=True,
                no_repeat_ngram_size=3,
                forced_bos_token_id=self.forced_bos,
            )
        out = self.tok.batch_decode(out_ids, skip_special_tokens=True)
        return [sanitize_vi(o) for o in out]


def make_translators(engine: str):
    engine = (engine or ENGINE_NLLB).lower().strip()
    # Chỉ dựng primary; fallback để lazy-init
    if engine == ENGINE_OPUS:
        return OpusTranslator(), None
    else:
        return NLLBTranslator(), None


def ensure_fallback(current_fallback, primary_engine):
    if current_fallback is not None:
        return current_fallback
    # tạo ngược với primary khi thật sự cần
    if isinstance(primary_engine, NLLBTranslator):
        return OpusTranslator()  # cần sentencepiece CHỈ nếu vào đây
    else:
        return NLLBTranslator()


# Tách câu nhẹ → dịch rồi ghép
_SENT_SPLIT = re.compile(r"(?<=[\.\?\!;:])\s+(?=[A-Z])")


def translate_sentences_safe(
    trans: Translator, texts: list[str], max_len: int, beams: int
) -> list[str]:
    out = []
    for s in texts:
        s = (s or "").strip()
        if not s:
            out.append("")
            continue
        parts = _SENT_SPLIT.split(s) if len(s) > 220 else [s]
        vi_parts = trans.translate_batch(parts, max_len=max_len, num_beams=beams)
        out.append(sanitize_vi(" ".join(vi_parts)))
    return out


# =========================
# Main
# =========================
def main():
    ap = argparse.ArgumentParser(description="Build Vietnamese job catalog from English source.")
    ap.add_argument("--in", dest="in_path", type=Path, default=DEF_IN)
    ap.add_argument("--out-jsonl", dest="out_jsonl", type=Path, default=DEF_OUT_JSONL)
    ap.add_argument("--out-csv", dest="out_csv", type=Path, default=DEF_OUT_CSV)
    ap.add_argument("--glossary", dest="glossary_path", type=Path, default=DEF_GLOSSARY)
    ap.add_argument("--cache", dest="cache_path", type=Path, default=DEF_CACHE)
    ap.add_argument(
        "--no-cache", action="store_true", help="Ignore and do not write mt_cache.jsonl"
    )
    ap.add_argument("--riasec-map", dest="riasec_map_path", type=Path, default=DEF_RIASEC_MAP)
    ap.add_argument("--skills-trans", dest="skills_trans_path", type=Path, default=DEF_SKILL_TRANS)
    ap.add_argument("--engine", choices=[ENGINE_NLLB, ENGINE_OPUS], default=ENGINE_NLLB)
    ap.add_argument("--beams", type=int, default=3)
    ap.add_argument("--maxlen-title", type=int, default=128)
    ap.add_argument("--maxlen-desc", type=int, default=512)
    ap.add_argument("--title-batch-size", type=int, default=32)
    ap.add_argument("--desc-batch-size", type=int, default=16)
    args = ap.parse_args()

    # Glossary cho Title + apply lên Description
    glossary = load_glossary(args.glossary_path)

    # Từ điển kỹ năng EN->VI
    skills_trans_map = {}
    if args.skills_trans_path.exists():
        skills_trans_map = json.loads(args.skills_trans_path.read_text(encoding="utf-8"))
    skills_trans_lower = {(k or "").strip().lower(): v for k, v in skills_trans_map.items()}

    cache = {} if args.no_cache else load_cache(args.cache_path)
    records = load_input_records(args.in_path)

    primary, fallback = make_translators(args.engine)

    # --- Titles (respect glossary; MT only when needed) ---
    titles_to_mt: list[str] = []
    for r in records:
        t = (r.get("title_en") or "").strip()
        if t and (t not in glossary) and (t not in cache):
            titles_to_mt.append(t)
    # unique giữ thứ tự
    seen = set()
    titles_to_mt = [x for x in titles_to_mt if not (x in seen or seen.add(x))]

    for i in tqdm(range(0, len(titles_to_mt), args.title_batch_size), desc="Translating title_en"):
        chunk = titles_to_mt[i : i + args.title_batch_size]
        vi_prim = primary.translate_batch(chunk, max_len=args.maxlen_title, num_beams=args.beams)
        fixed: list[str] = []
        for en, vi in zip(chunk, vi_prim, strict=False):
            if not vi or len(vi) < 2:
                # lazy fallback
                fallback = ensure_fallback(fallback, primary)
                vi = fallback.translate_batch(
                    [en], max_len=args.maxlen_title, num_beams=args.beams
                )[0]
            vi = sanitize_vi(vi)
            cache[en] = vi
            fixed.append(vi)
        if not args.no_cache:
            append_cache(args.cache_path, list(zip(chunk, fixed, strict=False)))

    for r in records:
        en = (r.get("title_en") or "").strip()
        r["title_vi"] = glossary.get(en, apply_glossary(cache.get(en, ""), glossary)) if en else ""

    # --- Descriptions (sentence-split + lazy fallback when needed) ---
    desc_to_mt: list[str] = []
    seen = set()
    for r in records:
        d = (r.get("description_en") or "").strip()
        if d and (d not in cache) and not (d in seen or seen.add(d)):
            desc_to_mt.append(d)

    for i in tqdm(
        range(0, len(desc_to_mt), args.desc_batch_size), desc="Translating description_en"
    ):
        chunk = desc_to_mt[i : i + args.desc_batch_size]
        vi_chunk = translate_sentences_safe(
            primary, chunk, max_len=args.maxlen_desc, beams=args.beams
        )
        fixed: list[str] = []
        for en, vi in zip(chunk, vi_chunk, strict=False):
            if not vi or len(vi) < 3:
                fallback = ensure_fallback(fallback, primary)
                vi = translate_sentences_safe(
                    fallback, [en], max_len=args.maxlen_desc, beams=args.beams
                )[0]
            vi = sanitize_vi(vi)
            cache[en] = vi
            fixed.append(vi)
        if not args.no_cache:
            append_cache(args.cache_path, list(zip(chunk, fixed, strict=False)))

    for r in records:
        en = (r.get("description_en") or "").strip()
        r["description_vi"] = apply_glossary(cache.get(en, ""), glossary)

    # --- Skills: NO MT — map qua skill_trans_vi.json; thiếu thì giữ EN ---
    for r in records:
        skills_en = r.get("skills_en") or []
        out: list[str] = []
        seen = set()
        for s in skills_en:
            s_norm = (s or "").strip()
            if not s_norm:
                continue
            vi = skills_trans_lower.get(s_norm.lower())  # map case-insensitive
            label = (vi or s_norm).strip()  # nếu không có bản dịch -> giữ EN
            if label and label not in seen:
                seen.add(label)
                out.append(label)
        r["skills_vi"] = out

    # --- RIASEC centroid --- (ƯU TIÊN từ CSV riasec_vector; rồi mới fallback map)
    riasec_map = {}
    if args.riasec_map_path.exists():
        riasec_map = json.loads(args.riasec_map_path.read_text(encoding="utf-8"))

    for r in records:
        # 1) Ưu tiên dữ liệu có sẵn từ CSV (chuỗi JSON ví dụ: "[0.18, 0.46, ...]")
        raw_vec = (r.get("riasec_vec_src") or "").strip()
        if raw_vec:
            r["riasec_centroid_json"] = raw_vec
            continue

        # 2) Fallback map theo job_id nếu CSV không có
        jid = r.get("job_id_en") or r.get("job_id") or ""
        vec = riasec_map.get(jid)
        r["riasec_centroid_json"] = json.dumps(vec) if vec else ""

    # --- Save JSONL ---
    args.out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with args.out_jsonl.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # --- Save CSV ---
    args.out_csv.parent.mkdir(parents=True, exist_ok=True)
    headers = ["job_id", "title_vi", "description_vi", "skills_vi", "riasec_centroid_json"]

    with args.out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in records:
            job_id = r.get("job_id_en") or r.get("job_id") or ""
            skills_vi = "|".join(r.get("skills_vi", []))
            row = [
                job_id,
                r.get("title_vi", "") or "",
                r.get("description_vi", "") or "",
                skills_vi,
            ]
            row.append(r.get("riasec_centroid_json", "") or "")
            w.writerow(row)

    print(f"[OK] Wrote {args.out_jsonl} and {args.out_csv}")


if __name__ == "__main__":
    main()
