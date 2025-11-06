# src/data/enrich_tags_auto.py (v5)
import csv
import json
import re
import unicodedata
from pathlib import Path

JOBS_IN = Path("data/catalog/jobs_translated.csv")
JOBS_OUT = Path("data/catalog/jobs_vi_tagged.csv")
ONET_PATH = Path("data/catalog/onet_tags.json")
VOCAB_PATH = Path("data/catalog/tag_vocab.json")
TRANS_PATH = Path("data/catalog/skill_trans_vi.json")

OUT_COLS = ["job_id", "title_vi", "description_vi", "skills_vi", "riasec_centroid_json", "tags_vi"]
MAX_SKILL_TAGS = 15


def strip_accents(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def text_has(needle: str, hay: str) -> bool:
    return re.search(r"\b" + re.escape(needle) + r"\b", hay) is not None


def load_json_or_empty(p: Path):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def norm_row_keys(row):
    out = {}
    for k, v in (row or {}).items():
        if k is None:
            continue
        kk = k.strip()
        if kk:
            out[kk] = v
    return out


def main():
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--overwrite", action="store_true", help="Ghi đè vào jobs_vi.csv")
    ap.add_argument(
        "--fallback_text", action="store_true", help="Text matching khi không map O*NET"
    )
    args = ap.parse_args()

    if not JOBS_IN.exists():
        raise FileNotFoundError(f"Missing {JOBS_IN}")

    onet = load_json_or_empty(ONET_PATH)
    vocab = load_json_or_empty(VOCAB_PATH)
    trans = load_json_or_empty(TRANS_PATH)

    # READ: force comma CSV (bỏ sniff để tránh hiểu nhầm delimiter = space)
    with JOBS_IN.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=",", quotechar='"', skipinitialspace=True)
        # Ép đúng header mong đợi: nếu thiếu cột nào thì thêm sau
        rows = [norm_row_keys(r) for r in reader]

    # Ghi file
    out_path = JOBS_IN if args.overwrite else JOBS_OUT
    matched_soc = 0
    unmatched_soc = 0

    with out_path.open("w", encoding="utf-8-sig", newline="") as g:
        writer = csv.DictWriter(
            g,
            fieldnames=OUT_COLS,
            delimiter=",",
            quotechar='"',
            quoting=csv.QUOTE_ALL,
            lineterminator="\n",
        )
        writer.writeheader()

        for rr in rows:
            out_row = {k: rr.get(k, "") for k in OUT_COLS}
            jid = (out_row.get("job_id") or "").strip()
            title = out_row.get("title_vi", "") or ""
            desc = out_row.get("description_vi", "") or ""
            sktxt = out_row.get("skills_vi", "") or ""

            tags_domain, tags_skill = [], []

            info = onet.get(jid)
            if info:
                matched_soc += 1
                d = (info.get("domain_vi") or "").strip()
                if d:
                    tags_domain.append(d)
                for sk_en in info.get("skills_en", []):
                    vi = (trans.get(sk_en) or sk_en).strip()
                    if vi:
                        tags_skill.append(vi)
            else:
                unmatched_soc += 1
                if args.fallback_text:
                    base_txt = strip_accents(f"{title} {desc} {sktxt}".lower())
                    for sk_en in vocab.get("skills_en", []):
                        needle = strip_accents(sk_en)
                        if text_has(needle, base_txt):
                            vi = (trans.get(sk_en) or sk_en).strip()
                            if vi:
                                tags_skill.append(vi)

            # dedup + limit
            seen = set()
            clean_domain = [t for t in tags_domain if t and not (t in seen or seen.add(t))]
            seen = set()
            clean_skill = [t for t in tags_skill if t and not (t in seen or seen.add(t))][
                :MAX_SKILL_TAGS
            ]
            out_row["tags_vi"] = "|".join(clean_domain + clean_skill)

            writer.writerow(out_row)

    print(f"[OK] wrote {out_path}")
    print(
        f"[INFO] matched_by_onet={matched_soc} | unmatched={unmatched_soc} | fallback_text={'ON' if args.fallback_text else 'OFF'}"
    )


if __name__ == "__main__":
    main()
