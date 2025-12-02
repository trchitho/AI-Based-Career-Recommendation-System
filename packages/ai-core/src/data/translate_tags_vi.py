# src/data/translate_tags_vi.py
import json
import re
import unicodedata
from pathlib import Path

VOCAB_PATH = Path("data/catalog/tag_vocab.json")
OUT_PATH = Path("data/catalog/skill_trans_vi.json")

KEEP_EN = {
    "python",
    "sql",
    "pandas",
    "numpy",
    "scikit-learn",
    "sklearn",
    "pytorch",
    "tensorflow",
    "docker",
    "kubernetes",
    "apache spark",
    "spark",
    "hadoop",
    "redis",
    "kafka",
    "postgresql",
    "mysql",
    "mssql",
    "oracle",
    "mongodb",
    "fastapi",
    "flask",
    "django",
    "react",
    "node.js",
    "vue",
    "angular",
    "airflow",
    "tableau",
    "power bi",
    "excel",
    "git",
    "jira",
}
MANUAL = {
    "persuasion": "thuyết phục",
    "coordination": "phối hợp",
    "reading comprehension": "ọc hiu",
    "writing": "viết",
    "speaking": "giao tip ni",
    "active listening": "lng nghe tch cc",
    "critical thinking": "tư duy phản biện",
    "complex problem solving": "giải quyết vấn ề phức tạp",
    "mathematics": "toán học",
    "science": "khoa học",
    "programming": "lp trnh",
    "systems analysis": "phn tch h thng",
    "systems evaluation": "đánh giá hệ thống",
    "operations analysis": "phn tch vn hnh",
    "quality control analysis": "phn tch kim sot cht lng",
    "time management": "qun l thi gian",
    "negotiation": "đàm phán",
    "monitoring": "giám sát",
    "service orientation": "định hướng dịch vụ",
    "social perceptiveness": "nhy bn x hi",
    "judgment and decision making": "phán đoán & ra quyết định",
    "management of financial resources": "qun l ngun lc ti chnh",
    "management of material resources": "qun l ngun lc vt cht",
    "management of personnel resources": "qun l ngun nhn lc",
    "equipment maintenance": "bo tr thit b",
    "equipment selection": "lựa chọn thiết b",
    "installation": "lắp đặt",
    "repairing": "sửa chữa",
    "technology design": "thit k cng ngh",
    "instructing": "hướng dẫn",
    "learning strategies": "chiến lược học tập",
    "operations monitoring": "giám sát vận hành",
    "active learning": "học chủ ng",
}


def load_vocab():
    if not VOCAB_PATH.exists():
        raise FileNotFoundError(f"Missing {VOCAB_PATH}")
    return json.loads(VOCAB_PATH.read_text(encoding="utf-8"))


def maybe_import_mt():
    try:
        from transformers import MarianMTModel, MarianTokenizer

        tok = MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-en-vi")
        mdl = MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-en-vi")
        return mdl, tok
    except Exception:
        return None, None


def strip_accents(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def looks_bad(vi: str, en: str) -> bool:
    if not vi:
        return True
    if len(vi) > 120:
        return True
    letters = sum(ch.isalpha() for ch in vi)
    if letters / max(1, len(vi)) < 0.5:
        return True
    if re.search(r"(.)\1{4,}", vi):
        return True
    toks = re.findall(r"\w+", strip_accents(vi.lower()))
    from collections import Counter

    if toks and Counter(toks).most_common(1)[0][1] >= 5:
        return True
    if strip_accents(vi.lower()) == strip_accents(en.lower()):
        return False
    return False


def translate_batch(batch, mdl, tok):
    if mdl is None or tok is None:
        return batch
    enc = tok(batch, return_tensors="pt", padding=True, truncation=True)
    out = mdl.generate(**enc, max_length=64, num_beams=4)
    return tok.batch_decode(out, skip_special_tokens=True)


def main():
    vocab = load_vocab()
    skills_en = vocab.get("skills_en", [])
    trans_map = {}

    for en in skills_en:
        if en in KEEP_EN:
            trans_map[en] = en
    for en, vi in MANUAL.items():
        trans_map[en] = vi

    to_translate = [s for s in skills_en if s not in trans_map]
    mdl, tok = maybe_import_mt()
    if mdl is None:
        for en in to_translate:
            trans_map[en] = en
    else:
        B = 32
        for i in range(0, len(to_translate), B):
            batch = to_translate[i : i + B]
            vi_batch = translate_batch(batch, mdl, tok)
            for en, vi in zip(batch, vi_batch, strict=False):
                vi = (vi or "").strip()
                trans_map[en] = en if looks_bad(vi, en) else vi

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(trans_map, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] wrote {OUT_PATH} (entries={len(trans_map)})")


if __name__ == "__main__":
    main()
