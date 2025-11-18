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
    "Active Listening": "Láº¯ng nghe tÃ­ch cá»±c",
    "Speaking": "Giao tiáº¿p nÃ³i",
    "Reading Comprehension": "Äá»c hiá»ƒu",
    "Writing": "Viáº¿t",
    "Critical Thinking": "TÆ° duy pháº£n biá»‡n",
    "Complex Problem Solving": "Giáº£i quyáº¿t váº¥n Ä‘á» phá»©c táº¡p",
    "Judgment and Decision Making": "PhÃ¡n Ä‘oÃ¡n & ra quyáº¿t Ä‘á»‹nh",
    "Systems Analysis": "PhÃ¢n tÃ­ch há»‡ thá»‘ng",
    "Systems Evaluation": "ÄÃ¡nh giÃ¡ há»‡ thá»‘ng",
    "Monitoring": "GiÃ¡m sÃ¡t",
    "Coordination": "Äiá»u phá»‘i",
    "Negotiation": "ÄÃ m phÃ¡n",
    "Social Perceptiveness": "Nháº¡y bÃ©n xÃ£ há»™i",
    "Time Management": "Quáº£n lÃ½ thá»i gian",
    "Service Orientation": "Äá»‹nh hÆ°á»›ng dá»‹ch vá»¥",
    "Instructing": "HÆ°á»›ng dáº«n",
    "Learning Strategies": "Chiáº¿n lÆ°á»£c há»c táº­p",
    "Management of Personnel Resources": "Quáº£n lÃ½ nguá»“n nhÃ¢n lá»±c",
    "Management of Financial Resources": "Quáº£n lÃ½ nguá»“n lá»±c tÃ i chÃ­nh",
    "Management of Material Resources": "Quáº£n lÃ½ nguá»“n lá»±c váº­t cháº¥t",
    "Operations Analysis": "PhÃ¢n tÃ­ch váº­n hÃ nh",
    "Mathematics": "ToÃ¡n há»c",
    "Programming": "Láº­p trÃ¬nh",
    "Quality Control Analysis": "PhÃ¢n tÃ­ch kiá»ƒm soÃ¡t cháº¥t lÆ°á»£ng",
    "Operation Monitoring": "GiÃ¡m sÃ¡t váº­n hÃ nh",
    "Operation and Control": "Váº­n hÃ nh & Ä‘iá»u khiá»ƒn",
    "Troubleshooting": "Kháº¯c phá»¥c sá»± cá»‘",
    "Equipment Maintenance": "Báº£o trÃ¬ thiáº¿t bá»‹",
    "Equipment Selection": "Lá»±a chá»n thiáº¿t bá»‹",
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
_VI_CHARS = "Äƒáº±áº¯áº³áºµáº·Ã¢áº§áº¥áº©áº«áº­Ä‘Ãªá»áº¿á»ƒá»…á»‡Ã´á»“á»‘á»•á»—á»™Æ¡á»á»›á»Ÿá»¡á»£Æ°á»«á»©á»­á»¯á»±Ã¡Ã áº£Ã£áº¡Ã©Ã¨áº»áº½áº¹Ã­Ã¬á»‰Ä©á»‹Ã³Ã²á»Ãµá»ÃºÃ¹á»§Å©á»¥Ã½á»³á»·á»¹á»µ"


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

    # ------ MERGE (Ä‘Ãºng thá»© tá»± Æ°u tiÃªn) ------
    merged: dict[str, str] = dict(en2vi_existing)  # giá»¯ báº£n dá»‹ch thá»§ cÃ´ng trÆ°á»›c
    merged.update(out_pairs)  # thÃªm cÃ¡c báº£n dá»‹ch má»›i (titles + skills MT/CORE)
    # luÃ´n Ä‘áº£m báº£o CORE_SKILLS cÃ³ máº·t (nhÆ°ng KHÃ”NG ghi Ä‘Ã¨ náº¿u Ä‘Ã£ cÃ³)
    for en, vi in CORE_SKILLS.items():
        if en not in merged:
            merged[en] = vi

    # write
    args.out_en2vi.parent.mkdir(parents=True, exist_ok=True)
    args.out_en2vi.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"[OK] EN->VI glossary written: {args.out_en2vi} (total={len(merged)}, added_now={len(out_pairs)})"
    )

    # report missing skills (Ä‘á»ƒ báº¡n bá»• sung tay dáº§n)
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
