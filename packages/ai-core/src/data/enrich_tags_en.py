from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Dict, List, Iterable, Any


# --------- utilities ---------
def read_json(p: Path) -> dict:
    if not p or not Path(p).exists():
        return {}
    return json.loads(Path(p).read_text(encoding="utf-8"))


def norm_token(s: str) -> str:
    # lower -> keep a-z0-9 and space -> collapse spaces -> replace spaces by hyphen
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s|,+\-_/]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace(" / ", " ").replace("/", " ")
    return re.sub(r"\s+", "-", s)


def uniq_keep_order(xs: Iterable[str]) -> List[str]:
    seen, out = set(), []
    for x in xs:
        if not x:
            continue
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def derive_tags_from_text(*texts: str, max_tags: int = 10) -> List[str]:
    # very light heuristic fallback
    blob = " | ".join([t for t in texts if t]).lower()
    # split by common separators
    parts = re.split(r"[|,;•\n]+", blob)
    # keep short-ish tokens/phrases (1–4 words)
    cand: List[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if len(p.split()) > 4:
            continue
        cand.append(norm_token(p))
    cand = [c for c in cand if 2 <= len(c) <= 40]
    return uniq_keep_order(cand)[:max_tags]


# --------- main logic ---------
def main():
    ap = argparse.ArgumentParser(description="Enrich jobs.csv with tags_en.")
    ap.add_argument(
        "--in",
        dest="inp",
        default="data/catalog/jobs.csv",
        help="Input CSV (jobs.csv), default=data/catalog/jobs.csv",
    )
    ap.add_argument(
        "--out",
        dest="outp",
        default=None,
        help="Output CSV (default: overwrite input)",
    )
    ap.add_argument(
        "--onet_tags",
        default="data/catalog/onet_tags.json",
        help="JSON mapping {job_id: {...}} from build_onet_tags.py",
    )
    ap.add_argument(
        "--max_fallback",
        type=int,
        default=10,
        help="Max tags generated from skills/description when mapping is missing",
    )
    args = ap.parse_args()

    inp = Path(args.inp)
    outp = Path(args.outp) if args.outp else inp
    onet_tags_path = Path(args.onet_tags)

    if not inp.exists():
        raise FileNotFoundError(f"CSV not found: {inp}")

    mapping: Dict[str, Any] = read_json(onet_tags_path) or {}

    # read CSV
    rows: List[dict] = []
    with inp.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        has_tags_col = "tags_en" in fieldnames
        if not has_tags_col:
            fieldnames.append("tags_en")

        for row in reader:
            jid = (row.get("job_id") or "").strip()
            title = (row.get("title") or "").strip()
            desc = (row.get("description") or "").strip()
            skills = (row.get("skills") or "").strip()

            tags: List[str] = []

            mapped = mapping.get(jid)
            # mapping v5: {"domain_vi": "...", "skills_en": [...]}
            if isinstance(mapped, dict):
                skills_en = mapped.get("skills_en") or []
                tags = [norm_token(t) for t in skills_en if t]
            # fallback: nếu sau này mapping là list[str]
            elif isinstance(mapped, list):
                tags = [norm_token(t) for t in mapped if t]

            # fallback từ text nếu mapping rỗng
            if not tags:
                tags = derive_tags_from_text(skills, desc, title, max_tags=args.max_fallback)

            row["tags_en"] = "|".join(uniq_keep_order(tags))
            rows.append(row)

    # backup once if overwriting
    if outp == inp:
        bak = inp.with_suffix(inp.suffix + ".bak")
        if not bak.exists():
            bak.write_text(inp.read_text(encoding="utf-8"), encoding="utf-8")

    # write CSV
    with outp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[OK] tags_en written -> {outp}")
    print(f"[INFO] rows={len(rows)} | mapping={'yes' if mapping else 'no'}")


if __name__ == "__main__":
    main()
