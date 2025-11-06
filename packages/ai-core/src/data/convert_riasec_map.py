# src/data/convert_riasec_map.py
import argparse
import csv
import difflib
import json
import re
from pathlib import Path
from typing import Any


def norm_title(s: str) -> str:
    """Chuẩn hoá nhẹ để khớp title tốt hơn (không phá vỡ meaning)."""
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def load_title_to_id(jobs_csv: Path) -> dict[str, str]:
    """Đọc jobs.csv → map title_en → job_id (ưu tiên cột 'title_en', fallback 'title')."""
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
    """Nhận vec dạng dict {R,I,A,S,E,C} hoặc list, trả về list [R,I,A,S,E,C]."""
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
    Trả về (số lượng ghi được, danh sách miss [(title, gợi_ý)]).

    - fuzzy=True: thử dùng difflib để gợi ý khớp gần nhất khi không tìm được exact match.
    - fuzzy_cutoff: ngưỡng tương tự (0..1), càng cao thì càng khắt khe.
    """
    title2id = load_title_to_id(jobs_csv)
    if not title2id:
        raise RuntimeError(f"No title→id mapping found from {jobs_csv}")

    # đọc map theo title
    in_obj = json.loads(map_in.read_text(encoding="utf-8"))
    out_obj: dict[str, list[float]] = {}
    misses: list[tuple[str, str]] = []

    all_titles = list(title2id.keys())

    for raw_title, vec in in_obj.items():
        t = norm_title(str(raw_title))
        jid = title2id.get(t)
        if not jid and fuzzy:
            # gợi ý gần nhất
            cand = difflib.get_close_matches(t, all_titles, n=1, cutoff=fuzzy_cutoff)
            if cand:
                suggest = cand[0]
                jid = title2id.get(suggest)
                if jid:
                    # ghi chú miss nhưng có gợi ý
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
        description="Convert RIASEC map keyed by title → map keyed by job_id."
    )
    ap.add_argument(
        "--jobs_csv",
        type=Path,
        default=Path("data/catalog/jobs.csv"),
        help="CSV có cột job_id & title_en (fallback title).",
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
        help="Bật khớp gần đúng bằng difflib khi không tìm thấy exact match.",
    )
    ap.add_argument(
        "--fuzzy_cutoff",
        type=float,
        default=0.92,
        help="Ngưỡng tương tự khi fuzzy-match (0..1). Mặc định 0.92.",
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
