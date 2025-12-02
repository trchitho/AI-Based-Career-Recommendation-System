"""
Build VI->EN alias map for search/graph by inverting EN->VI (canonical O*NET titles),
and optionally merging user-provided VI aliases.

Usage (PowerShell):
  python -m src.data.build_vi2en_alias `
    --en2vi data/processed/job_alias_en2vi.json `
    --out data/processed/job_alias_vi2en.json `
    --onet-titles data/raw/onet/Occupation Titles.txt `
    --extra data/processed/job_alias_vi2en_extra.json
"""

import argparse
import csv
import json
import sys
from pathlib import Path

DEF_EN2VI = Path("data/processed/job_alias_en2vi.json")
DEF_VI2EN_OUT = Path("data/processed/job_alias_vi2en.json")
DEF_ONET_TITLES = Path("data/raw/onet/Occupation Titles.txt")  # TSV, has 'Title' col


def load_en2vi(p: Path) -> dict:
    if not p.exists():
        sys.exit(f"[ERROR] EN->VI file not found: {p}")
    try:
        obj = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(obj, dict):
            raise ValueError
        return obj
    except Exception:
        sys.exit(f"[ERROR] Invalid JSON format in {p}")


def load_onet_titles(p: Path) -> set[str]:
    """Return set of canonical EN titles from O*NET Occupation Titles.txt (TSV)."""
    if not p.exists():
        return set()
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        if not reader.fieldnames:
            return set()
        cols = {c.lower(): c for c in reader.fieldnames}
        if "title" not in cols:
            return set()
        title_col = cols["title"]
        return {(row.get(title_col) or "").strip() for row in reader if row.get(title_col)}


def load_extra(p: Path | None) -> dict:
    if not p:
        return {}
    if not p.exists():
        sys.exit(f"[ERROR] Extra alias file not found: {p}")
    obj = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(obj, dict):
        sys.exit("[ERROR] Extra alias file must be a JSON object: {vi: en, ...}")
    return obj


def main():
    ap = argparse.ArgumentParser(
        description="Build VI->EN alias by inverting EN->VI + merge extras."
    )
    ap.add_argument("--en2vi", type=Path, default=DEF_EN2VI, help="EN->VI JSON (canonical)")
    ap.add_argument("--out", type=Path, default=DEF_VI2EN_OUT, help="Output VI->EN JSON")
    ap.add_argument(
        "--onet-titles",
        type=Path,
        default=DEF_ONET_TITLES,
        help="O*NET Occupation Titles.txt (TSV)",
    )
    ap.add_argument(
        "--extra", type=Path, default=None, help="Optional extra VI->EN aliases to merge"
    )
    ap.add_argument(
        "--strict", action="store_true", help="Keep only EN titles that exist in O*NET list"
    )
    args = ap.parse_args()

    en2vi = load_en2vi(args.en2vi)
    onet_titles = load_onet_titles(args.onet_titles)
    extra = load_extra(args.extra)

    vi2en: dict[str, str] = {}
    conflicts: list[tuple[str, str, str]] = []

    for en, vi in en2vi.items():
        vi, en = (vi or "").strip(), (en or "").strip()
        if not vi or not en:
            continue
        if vi in vi2en and vi2en[vi] != en:
            conflicts.append((vi, vi2en[vi], en))
            continue
        vi2en[vi] = en

    # merge extra (overwrite — ưu tiên chỉnh tay)
    for vi, en in extra.items():
        vi, en = (vi or "").strip(), (en or "").strip()
        if not vi or not en:
            continue
        vi2en[vi] = en

    if args.strict and onet_titles:
        before = len(vi2en)
        vi2en = {vi: en for vi, en in vi2en.items() if en in onet_titles}
        print(f"[INFO] strict filter: {before} -> {len(vi2en)} entries (kept only canonical O*NET)")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(vi2en, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] VI->EN aliases -> {args.out} (entries={len(vi2en)})")
    if conflicts:
        print(f"[WARN] {len(conflicts)} conflicts found (kept first). Examples:")
        for vi, en_old, en_new in conflicts[:5]:
            print(f"  - VI='{vi}' : kept EN='{en_old}', ignored EN='{en_new}'")


if __name__ == "__main__":
    main()
