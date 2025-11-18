# src/data/build_onet_tags.py (v4.2)
import csv
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

SOC_MAJOR_TO_DOMAIN_VI = {
    "11": "Quáº£n lÃ½",
    "13": "Kinh doanh/TÃ i chÃ­nh",
    "15": "CNTT/Dá»¯ liá»‡u",
    "17": "Ká»¹ sÆ°",
    "19": "Khoa há»c tá»± nhiÃªn",
    "21": "XÃ£ há»™i há»c/TÆ° váº¥n",
    "25": "GiÃ¡o dá»¥c/ÄÃ o táº¡o",
    "27": "Nghá»‡ thuáº­t/Thiáº¿t káº¿",
    "29": "Y táº¿",
    "31": "ChÄƒm sÃ³c sá»©c khoáº» há»— trá»£",
    "33": "An ninh/Cá»©u hoáº£",
    "35": "Dá»‹ch vá»¥ Äƒn uá»‘ng",
    "37": "Dá»n dáº¹p/Báº£o trÃ¬",
    "39": "Dá»‹ch vá»¥ cÃ¡ nhÃ¢n",
    "41": "BÃ¡n hÃ ng",
    "43": "HÃ nh chÃ­nh/VÄƒn phÃ²ng",
    "47": "XÃ¢y dá»±ng",
    "49": "Sá»­a chá»¯a/Láº¯p Ä‘áº·t",
    "51": "Sáº£n xuáº¥t",
    "53": "Váº­n táº£i/Kho váº­n",
}

COL_SOC = ["o*net-soc code", "onet-soc code", "o*net-soc", "o*net soc code"]
COL_NAME = ["element name", "element", "name"]
COL_SCALE = ["scale id", "scale"]
COL_VALUE = ["data value", "value"]


def norm_key(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def pick(d: dict, candidates: list[str]):
    for k in candidates:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return None


def clean_soc(s: str) -> str:
    return (s or "").strip()


def try_csv_reader(path: Path):
    raw = path.read_text(encoding="utf-8", errors="ignore")
    sample = raw[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample)
        delim = dialect.delimiter
    except Exception:
        return None, None, None
    f = path.open(encoding="utf-8", newline="")
    reader = csv.DictReader(f, delimiter=delim)
    return reader, delim, reader.fieldnames or []


def whitespace_table_reader(path: Path):
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    if not lines:
        return [], []
    splitter = re.compile(r"\t+| {2,}")
    headers = [h.strip() for h in splitter.split(lines[0]) if h.strip()]
    rows = []
    for ln in lines[1:]:
        if not ln.strip():
            continue
        cols = [c.strip() for c in splitter.split(ln)]
        if len(cols) < len(headers):
            cols += [""] * (len(headers) - len(cols))
        rows.append(dict(zip(headers, cols, strict=False)))
    return rows, headers


def load_onet_skills(skills_path: Path):
    reader, delim, fields = try_csv_reader(skills_path)
    if reader is not None:
        print(f"[INFO] Opened {skills_path} via csv | delimiter='{delim}' | cols={len(fields)}")
        rows_raw = list(reader)
        rows = [{norm_key(k): v for k, v in r.items()} for r in rows_raw]
        print(f"[INFO] Loaded rows: {len(rows)}")
        return rows
    rows_raw, headers = whitespace_table_reader(skills_path)
    print(f"[INFO] Opened {skills_path} via whitespace-table | cols={len(headers)}")
    print(f"[INFO] Columns sample (raw): {headers[:10]}")
    rows = [{norm_key(k): v for k, v in r.items()} for r in rows_raw]
    print(f"[INFO] Loaded rows: {len(rows)}")
    return rows


def scan_scales(rows):
    by_scale = defaultdict(list)
    for r in rows:
        scale = (pick(r, COL_SCALE) or "").strip().upper()
        val_s = pick(r, COL_VALUE)
        try:
            v = float(val_s) if val_s not in (None, "") else None
        except Exception:
            v = None
        if v is not None:
            by_scale[scale].append(v)
    for sc, arr in by_scale.items():
        mn, mx, mu = min(arr), max(arr), statistics.mean(arr)
        print(
            f"[INFO] Scale {sc or '(none)'}: count={len(arr)} min={mn:.3f} max={mx:.3f} mean={mu:.3f}"
        )
    return by_scale


def top_skills_per_soc(
    rows, imp_threshold=3.0, topn=20, accept_scales=("IM", "LV"), require_scale=True
):
    per_soc = defaultdict(list)
    used = 0
    dropped = 0
    for r in rows:
        soc_raw = pick(r, COL_SOC)
        soc = clean_soc(soc_raw)
        name = pick(r, COL_NAME)
        scale = (pick(r, COL_SCALE) or "").strip().upper()
        val_s = pick(r, COL_VALUE)
        if not (soc and name and val_s):
            dropped += 1
            continue
        try:
            val = float(val_s)
        except Exception:
            dropped += 1
            continue
        if require_scale and (scale not in accept_scales):
            continue
        if val >= imp_threshold:
            per_soc[soc].append((name.strip(), val))
            used += 1
    print(f"[INFO] Collected skill rows used: {used} | dropped(missing): {dropped}")
    out = {}
    for soc, items in per_soc.items():
        items.sort(key=lambda x: -x[1])
        out[soc] = [n.strip().lower() for n, _ in items[:topn] if n.strip()]
    return out


def main():
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--skills_path", type=str, default="data/raw/onet/Skills.txt")
    ap.add_argument("--imp_threshold", type=float, default=3.0)
    ap.add_argument("--topn", type=int, default=20)
    ap.add_argument("--out", type=str, default="data/catalog/onet_tags.json")
    ap.add_argument("--accept_scales", type=str, default="IM,LV")
    ap.add_argument("--no_scale_guard", action="store_true")
    args = ap.parse_args()

    p = Path(args.skills_path)
    if not p.exists():
        print(f"[ERR] KhÃ´ng tháº¥y file: {p}")
        sys.exit(1)

    rows = load_onet_skills(p)
    if not rows:
        print("[ERR] File rá»—ng/khÃ´ng parse Ä‘Æ°á»£c.")
        sys.exit(1)

    scan_scales(rows)
    accept = tuple(s.strip().upper() for s in args.accept_scales.split(",") if s.strip())
    soc2skills = top_skills_per_soc(
        rows, args.imp_threshold, args.topn, accept, not args.no_scale_guard
    )
    if not soc2skills:
        print("[WARN] KhÃ´ng rÃºt Ä‘Æ°á»£c ká»¹ nÄƒng nÃ o. Thá»­ --imp_threshold 2.5 hoáº·c --no_scale_guard.")
        sys.exit(1)

    onet_tags = {}
    for soc, skills in soc2skills.items():
        soc_std = clean_soc(soc)
        major = soc_std.split("-")[0]
        domain_vi = SOC_MAJOR_TO_DOMAIN_VI.get(major, "KhÃ¡c")
        onet_tags[soc_std] = {"domain_vi": domain_vi, "skills_en": sorted(set(skills))}

    outp = Path(args.out)
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps(onet_tags, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] wrote {outp} (SOC={len(onet_tags)})")
    for k, v in list(onet_tags.items())[:5]:
        print(f"[SAMPLE] {k} -> domain={v['domain_vi']} | skills_en={v['skills_en'][:5]}")


if __name__ == "__main__":
    main()
