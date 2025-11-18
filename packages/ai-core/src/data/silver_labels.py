# src/data/silver_labels.py
import json
import unicodedata
from pathlib import Path

IN_PATH = Path("data/processed/train.jsonl")
OUT_PATH = Path("data/processed/train_with_labels.jsonl")
JOBMAP = Path("data/processed/job_riasec_map.json")
ALIAS = Path("data/processed/job_alias_vi_en.json")


def norm(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))  # bá» dáº¥u
    return s.strip().lower()


def combine(
    a: dict[str, float | None], b: dict[str, float], w_test: float = 0.7
) -> dict[str, float]:
    keys = ["R", "I", "A", "S", "E", "C"]
    out = {}
    for k in keys:
        va = a.get(k) if a else None
        vb = b.get(k, 0.0)
        out[k] = vb if va is None else (w_test * float(va) + (1.0 - w_test) * vb)
    return out


def avg_job_vector(joblist, jobmap_en, alias_vi_en) -> dict[str, float]:
    keys = ["R", "I", "A", "S", "E", "C"]
    if not joblist:
        return {k: 0.0 for k in keys}

    acc = {k: 0.0 for k in keys}
    n = 0
    for j in joblist:
        j_key = norm(j)
        en_name = alias_vi_en.get(j_key)  # tra alias sang EN
        if not en_name:
            continue
        v = jobmap_en.get(en_name)
        if not v:
            continue
        for k in keys:
            acc[k] += v.get(k, 0.0)
        n += 1

    if n == 0:
        return {k: 0.0 for k in keys}
    return {k: acc[k] / n for k in keys}


def main():
    jobmap = json.loads(JOBMAP.read_text(encoding="utf-8")) if JOBMAP.exists() else {}
    alias = {}
    if ALIAS.exists():
        raw_alias = json.loads(ALIAS.read_text(encoding="utf-8"))
        # chuáº©n hÃ³a key VI (bÃªn trÃ¡i)
        alias = {norm(k): v for k, v in raw_alias.items()}

    with IN_PATH.open("r", encoding="utf-8") as fin, OUT_PATH.open("w", encoding="utf-8") as fout:
        for line in fin:
            rec = json.loads(line)
            jobs_vec = avg_job_vector(rec.get("target_jobs") or [], jobmap, alias)
            riasec_soft = combine(rec.get("riasec_scores") or {}, jobs_vec, w_test=0.7)
            rec["silver_riasec"] = riasec_soft
            rec["silver_big5"] = rec.get("big5_scores") or None
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"OK -> {OUT_PATH}")


if __name__ == "__main__":
    main()
