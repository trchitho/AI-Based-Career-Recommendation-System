# src/data/build_onet_tags.py (v5.0 - refactor)
from __future__ import annotations

import argparse
import csv
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

# ---------------------------------------------------------
# Cấu hình domain tiếng Việt theo nhóm O*NET SOC major
# ---------------------------------------------------------
SOC_MAJOR_TO_DOMAIN_VI: Dict[str, str] = {
    "11": "Quản lý",
    "13": "Kinh doanh/Tài chính",
    "15": "CNTT/Dữ liệu",
    "17": "Kỹ sư",
    "19": "Khoa học tự nhiên",
    "21": "Xã hội học/Tư vấn",
    "25": "Giáo dục/Đào tạo",
    "27": "Nghệ thuật/Thiết kế",
    "29": "Y tế",
    "31": "Chăm sóc sức khỏe hỗ trợ",
    "33": "An ninh/Cứu hoả",
    "35": "Dịch vụ ăn uống",
    "37": "Dọn dẹp/Bảo trì",
    "39": "Dịch vụ cá nhân",
    "41": "Bán hàng",
    "43": "Hành chính/Văn phòng",
    "47": "Xây dựng",
    "49": "Sửa chữa/Lắp đặt",
    "51": "Sản xuất",
    "53": "Vận tải/Kho vận",
}

# Tên cột có thể gặp trong Skills.txt (O*NET)
COL_SOC = ["o*net-soc code", "onet-soc code", "o*net-soc", "o*net soc code"]
COL_NAME = ["element name", "element", "name"]
COL_SCALE = ["scale id", "scale"]
COL_VALUE = ["data value", "value"]


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------


def norm_key(s: str) -> str:
    """Chuẩn hóa key header: lowercase + gọn whitespace."""
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def pick(row: dict, candidates: Iterable[str]):
    """Chọn giá trị đầu tiên khác rỗng trong list candidates (đã norm key)."""
    for k in candidates:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return None


def clean_soc(s: str | None) -> str:
    """Chuẩn hóa mã SOC về dạng chuỗi strip đơn giản."""
    return (s or "").strip()


def try_csv_reader(path: Path):
    """
    Thử đọc file bằng csv.Sniffer để phát hiện delimiter (tab, ;, , ...).
    Trả về: (reader, delimiter, fieldnames) hoặc (None, None, None) nếu fail.
    """
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
    """
    Fallback: đọc file dạng 'bảng whitespace' (tab hoặc nhiều spaces).
    """
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


# ---------------------------------------------------------
# Load O*NET skills
# ---------------------------------------------------------


def load_onet_skills(skills_path: Path) -> List[dict]:
    """
    Đọc Skills.txt (O*NET) thành list[dict], đã chuẩn hóa header (norm_key).
    Tự động detect delimiter; fallback sang bảng whitespace nếu cần.
    """
    reader, delim, fields = try_csv_reader(skills_path)
    if reader is not None:
        print(
            f"[INFO] Opened {skills_path} via csv | delimiter='{delim}' | cols={len(fields)}"
        )
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


# ---------------------------------------------------------
# Phân tích scale & chọn top skills
# ---------------------------------------------------------


def scan_scales(rows: List[dict]):
    """
    In thống kê các scale (IM, LV, ...): min, max, mean.
    Giúp chọn threshold / scale phù hợp.
    """
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
            f"[INFO] Scale {sc or '(none)'}: count={len(arr)} "
            f"min={mn:.3f} max={mx:.3f} mean={mu:.3f}"
        )
    return by_scale


def top_skills_per_soc(
    rows: List[dict],
    imp_threshold: float = 3.0,
    topn: int = 20,
    accept_scales: Tuple[str, ...] = ("IM", "LV"),
    require_scale: bool = True,
) -> Dict[str, List[str]]:
    """
    Rút ra top kỹ năng mỗi SOC:
      - Lọc theo scale (IM, LV, ...) nếu require_scale = True
      - Lọc theo ngưỡng độ quan trọng imp_threshold
      - Lấy tối đa topn kỹ năng / SOC theo giá trị (giảm dần)
    """
    per_soc: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
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

    print(f"[INFO] Collected skill rows used: {used} | dropped(missing/invalid): {dropped}")

    out: Dict[str, List[str]] = {}
    for soc, items in per_soc.items():
        items.sort(key=lambda x: -x[1])  # sort desc theo importance
        out[soc] = [n.strip().lower() for n, _ in items[:topn] if n.strip()]
    return out


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Build O*NET skill tags per SOC.")
    ap.add_argument(
        "--skills_path",
        type=str,
        default="data/raw/onet/Skills.txt",
        help="Đường dẫn Skills.txt của O*NET.",
    )
    ap.add_argument(
        "--imp_threshold",
        type=float,
        default=3.0,
        help="Ngưỡng độ quan trọng (IM/LV).",
    )
    ap.add_argument(
        "--topn",
        type=int,
        default=20,
        help="Số skill tối đa / SOC.",
    )
    ap.add_argument(
        "--out",
        type=str,
        default="data/catalog/onet_tags.json",
        help="Đường dẫn file JSON output.",
    )
    ap.add_argument(
        "--accept_scales",
        type=str,
        default="IM,LV",
        help="Danh sách scale chấp nhận, ví dụ: 'IM,LV'.",
    )
    ap.add_argument(
        "--no_scale_guard",
        action="store_true",
        help="Nếu bật, không lọc theo scale, dùng mọi scale có data.",
    )
    return ap.parse_args()


def main() -> None:
    args = parse_args()

    skills_path = Path(args.skills_path)
    if not skills_path.exists():
        print(f"[ERR] Không thấy file: {skills_path}")
        sys.exit(1)

    rows = load_onet_skills(skills_path)
    if not rows:
        print("[ERR] File rỗng/không parse được.")
        sys.exit(1)

    # Thống kê scale
    scan_scales(rows)

    accept = tuple(s.strip().upper() for s in args.accept_scales.split(",") if s.strip())
    soc2skills = top_skills_per_soc(
        rows=rows,
        imp_threshold=args.imp_threshold,
        topn=args.topn,
        accept_scales=accept,
        require_scale=not args.no_scale_guard,
    )

    if not soc2skills:
        print(
            "[WARN] Không rút được kỹ năng nào. "
            "Thử --imp_threshold 2.5 hoặc --no_scale_guard."
        )
        sys.exit(1)

    # Build onet_tags: {SOC: {domain_vi, skills_en}}
    onet_tags: Dict[str, dict] = {}
    for soc, skills in soc2skills.items():
        soc_std = clean_soc(soc)
        major = soc_std.split("-")[0]
        domain_vi = SOC_MAJOR_TO_DOMAIN_VI.get(major, "Khác")
        onet_tags[soc_std] = {
            "domain_vi": domain_vi,
            "skills_en": sorted(set(skills)),
        }

    outp = Path(args.out)
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps(onet_tags, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] wrote {outp} (SOC={len(onet_tags)})")
    # In sample 5 dòng đầu
    for k, v in list(onet_tags.items())[:5]:
        print(
            f"[SAMPLE] {k} -> domain={v['domain_vi']} "
            f"| skills_en={v['skills_en'][:5]}"
        )


if __name__ == "__main__":
    main()
