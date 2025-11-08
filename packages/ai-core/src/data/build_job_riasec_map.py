#!/usr/bin/env python3
"""
Build job_riasec_map.json from O*NET Interests.txt
- Reads tab-delimited O*NET Interests file (OI scale -> R,I,A,S,E,C scores)
- Optionally joins Occupation Titles to use human-readable titles as keys
- Normalizes scores to [0,1] by default (divide by 7.0)

Usage:
  python src/data/build_job_riasec_map.py \
    --interests "data/raw/onet/Interests.txt" \
    --titles "data/raw/onet/Occupation Titles.txt" \
    --output "data/processed/job_riasec_map.json"

If you don't have titles, omit --titles (keys will be SOC codes).
"""

import argparse
import csv
import json
from pathlib import Path

# Map long names -> RIASEC letter
NAME2LETTER = {
    "realistic": "R",
    "investigative": "I",
    "artistic": "A",
    "social": "S",
    "enterprising": "E",
    "conventional": "C",
}

RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"]


def read_titles(titles_path: Path | None) -> dict[str, str]:
    """
    Read Occupation Titles file (tab-delimited).
    Must contain columns: 'O*NET-SOC Code' and 'Title'.
    Returns dict: soc_code -> title
    """
    code2title: dict[str, str] = {}
    if not titles_path:
        return code2title
    if not titles_path.exists():
        raise FileNotFoundError(f"Titles file not found: {titles_path}")

    with titles_path.open("r", encoding="utf-8", newline="") as f:
        rdr = csv.DictReader(f, delimiter="\t", skipinitialspace=True)
        # Be lenient on header names (some releases vary slightly)
        # Try to find columns case-insensitively.
        headers = {h.lower(): h for h in rdr.fieldnames or []}
        code_col = headers.get("o*net-soc code") or headers.get("onet-soc code")
        title_col = headers.get("title")

        if not code_col or not title_col:
            raise ValueError(
                f"Cannot find headers 'O*NET-SOC Code' and 'Title' in titles file.\nFound headers: {rdr.fieldnames}"
            )

        for row in rdr:
            code = (row.get(code_col) or "").strip()
            title = (row.get(title_col) or "").strip()
            if code and title:
                code2title[code] = title
    return code2title


def read_interests(interests_path: Path, normalize: bool = True) -> dict[str, dict[str, float]]:
    """
    Read Interests.txt (tab-delimited) and aggregate OI scores into R,I,A,S,E,C per SOC.
    Returns dict: soc_code -> {'R':..., 'I':..., 'A':..., 'S':..., 'E':..., 'C':...}
    """
    if not interests_path.exists():
        raise FileNotFoundError(f"Interests file not found: {interests_path}")

    soc2vec: dict[str, dict[str, float]] = {}
    with interests_path.open("r", encoding="utf-8", newline="") as f:
        rdr = csv.DictReader(f, delimiter="\t", skipinitialspace=True)
        # Expected headers:
        # 'O*NET-SOC Code', 'Element ID', 'Element Name', 'Scale ID', 'Data Value', 'Date', 'Domain Source'
        headers = {h.lower(): h for h in rdr.fieldnames or []}
        code_col = headers.get("o*net-soc code") or headers.get("onet-soc code")
        name_col = headers.get("element name")
        scale_col = headers.get("scale id")
        value_col = headers.get("data value")

        if not code_col or not name_col or not scale_col or not value_col:
            raise ValueError(
                "Interests.txt missing required headers. Expected at least: "
                "'O*NET-SOC Code', 'Element Name', 'Scale ID', 'Data Value'.\n"
                f"Found headers: {rdr.fieldnames}"
            )

        for row in rdr:
            try:
                if (row.get(scale_col) or "").strip().upper() != "OI":
                    # Only use numeric profile (OI). Ignore IH (high-point indices).
                    continue

                soc = (row.get(code_col) or "").strip()
                el_name = (row.get(name_col) or "").strip().lower()
                val_raw = row.get(value_col)

                if not soc or not el_name or val_raw is None:
                    continue

                letter = NAME2LETTER.get(el_name)
                if not letter:
                    # Ignore non-RIASEC rows (if any)
                    continue

                val = float(val_raw)
                if normalize:
                    # O*NET OI uses 1..7. Normalize to 0..1 (clamp just in case).
                    val = max(0.0, min(1.0, val / 7.0))

                if soc not in soc2vec:
                    soc2vec[soc] = {k: 0.0 for k in RIASEC_KEYS}

                soc2vec[soc][letter] = val
            except Exception:
                # Be robust to bad lines
                continue

    # Ensure all keys present
    for vec in soc2vec.values():
        for k in RIASEC_KEYS:
            vec.setdefault(k, 0.0)

    return soc2vec


def attach_titles(
    soc2vec: dict[str, dict[str, float]], code2title: dict[str, str]
) -> dict[str, dict[str, float]]:
    """
    If titles are available, re-key dict by title.
    If multiple SOC codes share the same title, last write wins (rare in practice).
    """
    if not code2title:
        return soc2vec

    out: dict[str, dict[str, float]] = {}
    for soc, vec in soc2vec.items():
        key = code2title.get(soc, soc)  # fallback to SOC if title missing
        out[key] = vec
    return out


def main():
    ap = argparse.ArgumentParser(description="Build job_riasec_map.json from O*NET Interests.")
    ap.add_argument(
        "--interests", required=True, type=Path, help="Path to Interests.txt (tab-delimited)"
    )
    ap.add_argument(
        "--titles", required=False, type=Path, help="Path to Occupation Titles file (tab-delimited)"
    )
    ap.add_argument(
        "--output",
        default=Path("data/processed/job_riasec_map.json"),
        type=Path,
        help="Output JSON",
    )
    ap.add_argument(
        "--no-normalize", dest="normalize", action="store_false", help="Keep raw 1..7 scores"
    )
    ap.set_defaults(normalize=True)
    args = ap.parse_args()

    soc2vec = read_interests(args.interests, normalize=args.normalize)
    code2title = read_titles(args.titles) if args.titles else {}

    result = attach_titles(soc2vec, code2title)

    # Sort keys for reproducibility; round numbers for compactness
    final = {
        k: {kk: round(float(vv), 4) for kk, vv in result[k].items()} for k in sorted(result.keys())
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK -> {args.output} (items: {len(final)})")


if __name__ == "__main__":
    main()
