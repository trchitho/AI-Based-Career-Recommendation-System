# src/data/convert_riasec_map.py
import argparse
import csv
import difflib
import json
import re
from pathlib import Path
from typing import Any


def norm_title(s: str) -> str:
    """Chuáº©n hoÃ¡ nháº¹ Ä‘á»ƒ khá»›p title tá»‘t hÆ¡n (khÃ´ng phÃ¡ vá»¡ meaning)."""
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def load_title_to_id(jobs_csv: Path) -> dict[str, str]:
    """Äá»c jobs.csv â†’ map title_en â†’ job_id (Æ°u tiÃªn cá»™t 'title_en', fallback 'title')."""
    title2id: dict[str, str] = {}
    with jobs_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            job_id = (r.get("job_id") or r.get("id") or "").strip()
            title_en = (r.get("title_en") or r.get("title") or "").strip()
            if job_id and title_en:
                title2id[norm_title(title_en)] = job_id
    return title2id


def vec_dict_to_list(v: Any) -> list[float]:
    """Nháº­n vec dáº¡ng dict {R,I,A,S,E,C} hoáº·c list, tráº£ vá» list [R,I,A,S,E,C]."""
    if isinstance(v, dict):
        return [
            float(v.get("R", 0.0)),
            float(v.get("I", 0.0)),
            float(v.get("A", 0.0)),
            float(v.get("S", 0.0)),
            float(v.get("E", 0.0)),
            float(v.get("C", 0.0)),
        ]
    if isinstance(v, (list, tuple)) and len(v) == 6:
        return [float(x) for x in v]
    raise ValueError("Vector must be dict with keys R,I,A,S,E,C or a list of length 6")


def convert(
    jobs_csv: Path,
    map_in: Path,
    map_out: Path,
    fuzzy: bool = False,
    fuzzy_cutoff: float = 0.92,
) -> tuple[int, list[tuple[str, str]]]:
    """
    Tráº£ vá» (sá»‘ lÆ°á»£ng ghi Ä‘Æ°á»£c, danh sÃ¡ch miss [(title, gá»£i_Ã½)]).

    - fuzzy=True: thá»­ dÃ¹ng difflib Ä‘á»ƒ gá»£i Ã½ khá»›p gáº§n nháº¥t khi khÃ´ng tÃ¬m Ä‘Æ°á»£c exact match.
    - fuzzy_cutoff: ngÆ°á»¡ng tÆ°Æ¡ng tá»± (0..1), cÃ ng cao thÃ¬ cÃ ng kháº¯t khe.
    """
    title2id = load_title_to_id(jobs_csv)
    if not title2id:
        raise RuntimeError(f"No titleâ†’id mapping found from {jobs_csv}")

    # Ä‘á»c map theo title
    in_obj = json.loads(map_in.read_text(encoding="utf-8"))
    out_obj: dict[str, list[float]] = {}
    misses: list[tuple[str, str]] = []

    all_titles = list(title2id.keys())

    for raw_title, vec in in_obj.items():
        t = norm_title(str(raw_title))
        jid = title2id.get(t)
        if not jid and fuzzy:
            # gá»£i Ã½ gáº§n nháº¥t
            cand = difflib.get_close_matches(t, all_titles, n=1, cutoff=fuzzy_cutoff)
            if cand:
                suggest = cand[0]
                jid = title2id.get(suggest)
                if jid:
                    # ghi chÃº miss nhÆ°ng cÃ³ gá»£i Ã½
                    misses.append((raw_title, f"~ {suggest} -> {jid}"))
        if not jid:
            misses.append((raw_title, "NOT FOUND"))
            continue

        out_obj[jid] = vec_dict_to_list(vec)

    map_out.parent.mkdir(parents=True, exist_ok=True)
    map_out.write_text(json.dumps(out_obj, ensure_ascii=False, indent=2), encoding="utf-8")

    return len(out_obj), misses


def main():
    ap = argparse.ArgumentParser(
        description="Convert RIASEC map keyed by title â†’ map keyed by job_id."
    )
    ap.add_argument(
        "--jobs_csv",
        type=Path,
        default=Path("data/catalog/jobs.csv"),
        help="CSV cÃ³ cá»™t job_id & title_en (fallback title).",
    )
    ap.add_argument(
        "--map_in",
        type=Path,
        default=Path("data/processed/job_riasec_map.json"),
        help="JSON input: {title_en: {R,I,A,S,E,C} | [R,I,A,S,E,C]}",
    )
    ap.add_argument(
        "--map_out",
        type=Path,
        default=Path("data/processed/job_riasec_map_id.json"),
        help="JSON output: {job_id: [R,I,A,S,E,C]}",
    )
    ap.add_argument(
        "--fuzzy",
        action="store_true",
        help="Báº­t khá»›p gáº§n Ä‘Ãºng báº±ng difflib khi khÃ´ng tÃ¬m tháº¥y exact match.",
    )
    ap.add_argument(
        "--fuzzy_cutoff",
        type=float,
        default=0.92,
        help="NgÆ°á»¡ng tÆ°Æ¡ng tá»± khi fuzzy-match (0..1). Máº·c Ä‘á»‹nh 0.92.",
    )
    args = ap.parse_args()

    count, misses = convert(
        args.jobs_csv, args.map_in, args.map_out, fuzzy=args.fuzzy, fuzzy_cutoff=args.fuzzy_cutoff
    )
    print(f"[OK] Wrote {args.map_out} with {count} entries")

    if misses:
        print("\nUnmatched titles (showing up to 40):")
        for t, note in misses[:40]:
            print(f"  - {t}  [{note}]")
        if len(misses) > 40:
            print(f"  ... and {len(misses) - 40} more")


if __name__ == "__main__":
    main()
