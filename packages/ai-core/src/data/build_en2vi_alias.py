# src/data/build_en2vi_alias.py
"""
Seed EN->VI glossary for O*NET Titles + Skills.

Inputs:
  - data/raw/onet/Occupation Data.txt (TSV, has 'Title')
  - data/raw/onet/Skills.txt (TSV, has 'Element Name')  [optional]
  - data/catalog/jobs.csv (skills_en)                    [optional]

Output:
  - data/processed/job_alias_en2vi.json  (EN -> VI)
  - data/processed/glossary_missing.json (terms that need manual VI)

Behavior:
  * Keep/merge existing human-edited translations.
  * Titles: machine-translate with NLLB (primary) + OPUS (fallback), forced VI.
  * Skills: DO NOT MT by default. Prefer CORE_SKILLS mapping; optional MT via --mt-skills.
  * Sanity-check & skip garbage outputs.
"""

import argparse
import csv
import json
import re
from pathlib import Path

import torch
from tqdm import tqdm

# ---------------- Config ----------------
ENGINE_NLLB = "nllb"
ENGINE_OPUS = "opus"

DEF_IN_TITLES = Path("data/raw/onet/Occupation Data.txt")
DEF_IN_SKILLS = Path("data/raw/onet/Skills.txt")
DEF_IN_CATALOG = Path("data/catalog/jobs.csv")
DEF_OUT_EN2VI = Path("data/processed/job_alias_en2vi.json")
DEF_MISSING = Path("data/processed/glossary_missing.json")
DEF_ENGINE = ENGINE_NLLB

DEF_NLLB_MODEL = "facebook/nllb-200-distilled-600M"  # eng_Latn -> vie_Latn
DEF_OPUS_MODEL = "Helsinki-NLP/opus-mt-en-vi"  # target via >>vie<< or forced_bos

# A small, high-quality seed for skills
CORE_SKILLS: dict[str, str] = {
    "Active Listening": "Lắng nghe tích cực",
    "Speaking": "Giao tiếp nói",
    "Reading Comprehension": "Đọc hiểu",
    "Writing": "Viết",
    "Critical Thinking": "Tư duy phản biện",
    "Complex Problem Solving": "Giải quyết vấn đề phức tạp",
    "Judgment and Decision Making": "Phán đoán & ra quyết định",
    "Systems Analysis": "Phân tích hệ thống",
    "Systems Evaluation": "Đánh giá hệ thống",
    "Monitoring": "Giám sát",
    "Coordination": "Điều phối",
    "Negotiation": "Đàm phán",
    "Social Perceptiveness": "Nhạy bén xã hội",
    "Time Management": "Quản lý thời gian",
    "Service Orientation": "Định hướng dịch vụ",
    "Instructing": "Hướng dẫn",
    "Learning Strategies": "Chiến lược học tập",
    "Management of Personnel Resources": "Quản lý nguồn nhân lực",
    "Management of Financial Resources": "Quản lý nguồn lực tài chính",
    "Management of Material Resources": "Quản lý nguồn lực vật chất",
    "Operations Analysis": "Phân tích vận hành",
    "Mathematics": "Toán học",
    "Programming": "Lập trình",
    "Quality Control Analysis": "Phân tích kiểm soát chất lượng",
    "Operation Monitoring": "Giám sát vận hành",
    "Operation and Control": "Vận hành & điều khiển",
    "Troubleshooting": "Khắc phục sự cố",
    "Equipment Maintenance": "Bảo trì thiết bị",
    "Equipment Selection": "Lựa chọn thiết bị",
}


# ---------------- IO helpers ----------------
def load_titles_from_onet(file_path: Path) -> list[str]:
    if not file_path.exists():
        raise FileNotFoundError(f"Cannot find: {file_path}")
    with file_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        if not reader.fieldnames:
            raise ValueError("TSV has no header row. Check file format.")
        cols = {c.lower(): c for c in reader.fieldnames}
        if "title" not in cols:
            raise ValueError(f"'Title' column not found. Got columns: {reader.fieldnames}")
        title_col = cols["title"]
        seen, titles = set(), []
        for row in reader:
            t = (row.get(title_col) or "").strip()
            if not t:
                continue
            t = re.sub(r"\s+", " ", t)
            if t not in seen:
                seen.add(t)
                titles.append(t)
    titles.sort()
    return titles


def load_onet_skills(path: Path) -> list[str]:
    if not path or not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        if not reader.fieldnames:
            return []
        cols = {c.lower(): c for c in reader.fieldnames}
        col = cols.get("element name") or cols.get("element_name") or cols.get("name")
        if not col:
            return []
        seen, out = set(), []
        for row in reader:
            s = (row.get(col) or "").strip()
            if s and s not in seen:
                seen.add(s)
                out.append(s)
    out.sort()
    return out


def _parse_catalog_skills_field(skills_raw: str) -> list[str]:
    skills_raw = (skills_raw or "").strip()
    if not skills_raw:
        return []
    skills_raw = re.sub(r"\s*([|,;])\s*", r"\1", skills_raw)
    parts = re.split(r"[|,;]", skills_raw)
    return [s.strip() for s in parts if s.strip()]


def load_catalog_skills(path: Path) -> list[str]:
    if not path or not path.exists():
        return []
    seen, out = set(), []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            sraw = r.get("skills_en") or r.get("skills") or ""
            for s in _parse_catalog_skills_field(sraw):
                if s not in seen:
                    seen.add(s)
                    out.append(s)
    out.sort()
    return out


def load_existing(out_path: Path) -> dict[str, str]:
    if out_path.exists():
        try:
            obj = json.loads(out_path.read_text(encoding="utf-8"))
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass
    return {}


# ---------------- Sanity check ----------------
_VI_CHARS = ""


def looks_suspicious_vi(s: str) -> bool:
    if not s:
        return True
    s = s.strip()
    if len(s) < 2:
        return True
    bad_tokens = ["Comment", "GenericName", "NameName", "C/", "CC/"]
    if any(bt.lower() in s.lower() for bt in bad_tokens):
        return True
    if re.search(r"(\b\w+\b)(?:\s+\1){2,}", s, flags=re.IGNORECASE):
        return True
    if len(s) > 12 and not any(ch in s.lower() for ch in _VI_CHARS):
        return True
    if len(re.findall(r"[^\w\s" + _VI_CHARS + r"'-]", s.lower())) > 6:
        return True
    return False


# ---------------- Engines ----------------
class Translator:
    def translate(self, batch: list[str]) -> list[str]:
        raise NotImplementedError


def find_lang_bos_id(tok, lang_code: str):
    if hasattr(tok, "lang_code_to_id") and isinstance(tok.lang_code_to_id, dict):
        _id = tok.lang_code_to_id.get(lang_code)
        if _id is not None:
            return _id
    candidates = [
        lang_code,
        f">>{lang_code}<<",
        f"__{lang_code}__",
        "vie_Latn",
        "vie",
        "vi_VN",
        "vi",
        "vietnamese",
        "Vietnamese",
    ]
    for c in candidates:
        try:
            tid = tok.convert_tokens_to_ids(c)
            if isinstance(tid, int) and tid != tok.unk_token_id:
                return tid
        except Exception:
            pass
    return None


class NLLBTranslator(Translator):
    def __init__(self, model_name: str):
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.src_code = "eng_Latn"
        self.tgt_code = "vie_Latn"
        self.tok = AutoTokenizer.from_pretrained(
            model_name, src_lang=self.src_code, tgt_lang=self.tgt_code
        )
        self.mdl = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.mdl = self.mdl.to(self.device).eval()
        self.forced_bos = find_lang_bos_id(self.tok, self.tgt_code)

    def translate(self, batch: list[str]) -> list[str]:
        if not batch:
            return []
        texts = [(t or "")[:400] for t in batch]
        if hasattr(self.tok, "src_lang"):
            self.tok.src_lang = self.src_code
        enc = self.tok(
            texts, return_tensors="pt", padding=True, truncation=True, max_length=128
        ).to(self.device)
        gen_kwargs = dict(max_length=128, num_beams=4, early_stopping=True, no_repeat_ngram_size=3)
        if self.forced_bos is not None:
            gen_kwargs["forced_bos_token_id"] = self.forced_bos
        with torch.no_grad():
            gen = self.mdl.generate(**enc, **gen_kwargs)
        out = self.tok.batch_decode(gen, skip_special_tokens=True)
        return [o.strip() for o in out]


class OpusTranslator(Translator):
    def __init__(self, model_name: str):
        from transformers import MarianMTModel, MarianTokenizer

        self.tok = MarianTokenizer.from_pretrained(model_name)
        self.mdl = MarianMTModel.from_pretrained(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.mdl = self.mdl.to(self.device).eval()
        self.forced_bos = None
        if hasattr(self.tok, "lang_code_to_id") and isinstance(self.tok.lang_code_to_id, dict):
            self.forced_bos = self.tok.lang_code_to_id.get("vie", None)

    def translate(self, batch: list[str]) -> list[str]:
        if not batch:
            return []
        use_prefix = self.forced_bos is None
        texts = []
        for t in batch:
            t = (t or "")[:400]
            texts.append(f">>vie<< {t}" if use_prefix else t)
        enc = self.tok(texts, return_tensors="pt", padding=True, truncation=True, max_length=128)
        enc = {k: v.to(self.device) for k, v in enc.items()}
        with torch.no_grad():
            gen = self.mdl.generate(
                **enc,
                max_length=128,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
                forced_bos_token_id=self.forced_bos,
            )
        out = self.tok.batch_decode(gen, skip_special_tokens=True)
        return [o.strip() for o in out]


def make_translator(engine: str):
    engine = (engine or ENGINE_NLLB).lower().strip()
    if engine == ENGINE_OPUS:
        return OpusTranslator(DEF_OPUS_MODEL)
    return NLLBTranslator(DEF_NLLB_MODEL)


def make_fallback(engine: str) -> Translator | None:
    engine = (engine or ENGINE_NLLB).lower().strip()
    if engine == ENGINE_OPUS:
        return NLLBTranslator(DEF_NLLB_MODEL)
    return OpusTranslator(DEF_OPUS_MODEL)


# ---------------- Main ----------------
def main():
    ap = argparse.ArgumentParser(description="Seed EN->VI glossary for O*NET titles + skills.")
    ap.add_argument(
        "--in",
        dest="in_titles",
        type=Path,
        default=DEF_IN_TITLES,
        help="O*NET Occupation Data.txt (TSV)",
    )
    ap.add_argument(
        "--skills-onet", type=Path, default=DEF_IN_SKILLS, help="O*NET Skills.txt (TSV) [optional]"
    )
    ap.add_argument(
        "--skills-catalog",
        type=Path,
        default=DEF_IN_CATALOG,
        help="jobs.csv with skills_en [optional]",
    )
    ap.add_argument(
        "--out", dest="out_en2vi", type=Path, default=DEF_OUT_EN2VI, help="Output JSON for EN->VI"
    )
    ap.add_argument(
        "--engine",
        choices=[ENGINE_NLLB, ENGINE_OPUS],
        default=DEF_ENGINE,
        help="MT engine for TITLES",
    )
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument(
        "--mt-skills", action="store_true", help="Also machine-translate skills not in CORE_SKILLS"
    )
    args = ap.parse_args()

    # gather titles
    titles = load_titles_from_onet(args.in_titles)
    print(f"[INFO] Titles loaded: {len(titles)}")

    # gather skills
    onet_skills = load_onet_skills(args.skills_onet)
    cat_skills = load_catalog_skills(args.skills_catalog)
    skills_all: list[str] = []
    seen = set()
    for s in onet_skills + cat_skills:
        if s and s not in seen:
            seen.add(s)
            skills_all.append(s)
    print(
        f"[INFO] Skills collected: onet={len(onet_skills)}, catalog={len(cat_skills)}, unique={len(skills_all)}"
    )

    # existing map
    en2vi_existing = load_existing(args.out_en2vi)
    print(f"[INFO] Existing EN->VI entries kept: {len(en2vi_existing)}")

    primary = make_translator(args.engine)
    fallback = make_fallback(args.engine)

    out_pairs: dict[str, str] = {}
    bad_examples: list[str] = []

    # ----- TITLES: MT for new items only
    need_titles = [t for t in titles if t not in en2vi_existing]
    for i in tqdm(range(0, len(need_titles), args.batch_size), desc="Translating TITLES"):
        chunk = need_titles[i : i + args.batch_size]
        vi_prim = primary.translate(chunk)
        for e, v in zip(chunk, vi_prim, strict=False):
            if looks_suspicious_vi(v) and fallback is not None:
                v = fallback.translate([e])[0]
            if looks_suspicious_vi(v):
                bad_examples.append(f"{e} -> {v}")
                continue
            out_pairs[e] = v

    # ----- SKILLS: prefer CORE_SKILLS; optional MT; else missing
    missing_skills: list[str] = []
    for s in skills_all:
        if s in en2vi_existing or s in out_pairs:
            continue
        if s in CORE_SKILLS:
            out_pairs[s] = CORE_SKILLS[s]
            continue
        if args.mt_skills:
            v = primary.translate([s])[0]
            if looks_suspicious_vi(v) and fallback is not None:
                v = fallback.translate([s])[0]
            if not looks_suspicious_vi(v):
                out_pairs[s] = v
                continue
        missing_skills.append(s)

    # ------ MERGE (theo thứ tự ưu tiên) ------
    merged: dict[str, str] = dict(en2vi_existing)  # giữ bản dịch thủ công trước
    merged.update(out_pairs)  # thêm các bản dịch mới (titles + skills MT/CORE)
    # luôn đảm bảo CORE_SKILLS có mặt (nhưng KHÔNG ghi đè nếu đã có)
    for en, vi in CORE_SKILLS.items():
        if en not in merged:
            merged[en] = vi

    # write
    args.out_en2vi.parent.mkdir(parents=True, exist_ok=True)
    args.out_en2vi.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"[OK] EN->VI glossary written: {args.out_en2vi} (total={len(merged)}, added_now={len(out_pairs)})"
    )

    # report missing skills (để bạn bổ sung tay dần)
    if missing_skills:
        DEF_MISSING.parent.mkdir(parents=True, exist_ok=True)
        DEF_MISSING.write_text(
            json.dumps({"skills_missing": missing_skills}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"[WARN] {len(missing_skills)} skills have no VI mapping. See {DEF_MISSING}")

    # preview
    if out_pairs:
        print("[Preview] first 10 new pairs:")
        for en, vi in list(out_pairs.items())[:10]:
            print(f"  - {en} -> {vi}")
    if bad_examples:
        print(f"[WARN] Skipped {len(bad_examples)} suspicious title outputs. First 10:")
        for s in bad_examples[:10]:
            print("   ", s)


if __name__ == "__main__":
    main()
