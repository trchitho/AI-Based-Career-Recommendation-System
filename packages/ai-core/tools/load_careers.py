# tools/load_careers.py
import csv
import os
from datetime import date
from pathlib import Path

import pandas as pd
import psycopg
from dotenv import load_dotenv
from slugify import slugify

# ---------- CONFIG ----------
load_dotenv()

TRANSLATE = False  # Bật True nếu muốn dịch EN->VI cho short_desc_en

ROOT = Path(".")
ONET_DIR = ROOT / "data" / "raw" / "onet"
VN_CATALOG = ROOT / "data" / "catalog" / "jobs_vi_tagged.csv"
if not VN_CATALOG.exists():
    VN_CATALOG = ROOT / "data" / "catalog" / "jobs_translated.csv"


print(f"[DEBUG] ONET_DIR = {ONET_DIR.resolve()}")
print(f"[DEBUG] VN_CATALOG = {VN_CATALOG.resolve()}")


# Ưu tiên lấy DATABASE_URL
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL or DB_URL.strip() == "":
    PGHOST = os.getenv("PGHOST", "localhost")
    PGPORT = os.getenv("PGPORT", "5433")
    PGDATABASE = os.getenv("PGDATABASE", "postgres")
    PGUSER = os.getenv("PGUSER", "postgres")
    PGPASSWORD = os.getenv("PGPASSWORD", "postgres")
    DB_URL = f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}"
print(f"[INFO] Connecting to {DB_URL}")


# ---------- UTILS ----------
def open_tsv_safely(path):
    try:
        return open(path, encoding="utf-8", newline="")
    except UnicodeDecodeError:
        return open(path, encoding="cp1252", newline="")


def normalize_header(fieldnames):
    return [(h or "").strip().lower() for h in fieldnames]


def normrow(row):
    return {
        (k or "").strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()
    }


def get_col(header_norm, *candidates):
    for c in candidates:
        c0 = c.strip().lower()
        if c0 in header_norm:
            return header_norm.index(c0)
    return -1


# ---------- READ O*NET ----------
def read_onet_titles():
    """{code: {title_en}}"""
    fp = ONET_DIR / "Occupation Data.txt"
    rows = {}
    with open_tsv_safely(fp) as f:
        reader = csv.DictReader(f, delimiter="\t")
        header_norm = normalize_header(reader.fieldnames)
        idx_code = get_col(header_norm, "o*net-soc code", "onet-soc code", "onetsoc code")
        idx_title = get_col(header_norm, "title")
        idx_desc = get_col(header_norm, "description")  # có thể có mô tả ngắn
        for r in reader:
            rr = normrow(r)
            vals = list(rr.values())
            if idx_code >= 0 and idx_title >= 0:
                code = vals[idx_code].strip()
                title_en = vals[idx_title].strip()
                desc_en = vals[idx_desc].strip() if idx_desc != -1 else None
                if code:
                    rows[code] = {"onet_code": code, "title_en": title_en, "desc_en": desc_en}
    return rows


def read_onet_interests():
    """
    Đọc O*NET Interests ở cả 2 format:
    - Wide: 1 dòng/occupation, có đủ các cột Realistic..Conventional
    - Long: nhiều dòng/occupation, mỗi dòng 1 Element Name + Data Value
    Trả về: { onet_code: {R,I,A,S,E,C} } với giá trị chuẩn hóa về [0,1].
    """
    fp = ONET_DIR / "Interests.txt"
    rows = {}

    def _norm_scale(vals):
        # Chuẩn hóa về [0,1]
        mx = max(vals)
        if mx <= 1.0:
            return [round(v, 6) for v in vals]
        # O*NET nhiều khi ở thang 7 (OI) hoặc 100; ưu tiên /7 nếu <=7
        if mx <= 7.0:
            return [round(v / 7.0, 6) for v in vals]
        # fallback: /100
        return [round(v / 100.0, 6) for v in vals]

    with open_tsv_safely(fp) as f:
        reader = csv.DictReader(f, delimiter="\t")
        header_norm = normalize_header(reader.fieldnames)

        # Thử format WIDE trước
        idx_code = get_col(header_norm, "o*net-soc code", "onet-soc code", "onetsoc code")

        def idx_like(name):
            i = get_col(header_norm, name)
            return i if i != -1 else get_col(header_norm, name[0:4])

        R = idx_like("realistic")
        I = idx_like("investigative")  # noqa: E741
        A = idx_like("artistic")
        S = idx_like("social")
        E = idx_like("enterprising")
        C = idx_like("conventional")

        if idx_code != -1 and min([R, I, A, S, E, C]) != -1:
            # WIDE format
            for r in reader:
                rr = normrow(r)
                vals = list(rr.values())
                code = vals[idx_code].strip()
                try:
                    vec = [
                        float(vals[R]),
                        float(vals[I]),
                        float(vals[A]),
                        float(vals[S]),
                        float(vals[E]),
                        float(vals[C]),
                    ]
                except Exception:
                    continue
                vec = _norm_scale(vec)
                if code:
                    rows[code] = {
                        "R": vec[0],
                        "I": vec[1],
                        "A": vec[2],
                        "S": vec[3],
                        "E": vec[4],
                        "C": vec[5],
                    }
            return rows

    # Nếu không phải WIDE, thử LONG
    with open_tsv_safely(fp) as f:
        reader = csv.DictReader(f, delimiter="\t")
        header_norm = normalize_header(reader.fieldnames)
        idx_code = get_col(header_norm, "o*net-soc code", "onet-soc code", "onetsoc code")
        idx_name = get_col(header_norm, "element name", "element", "name")
        idx_val = get_col(header_norm, "data value", "value", "datavalue")

        if min([idx_code, idx_name, idx_val]) == -1:
            # Không nhận diện được, trả về rỗng
            return rows

        # gom theo code
        tmp = {}  # code -> dict letter->value
        for r in reader:
            rr = normrow(r)
            vals = list(rr.values())
            code = (vals[idx_code] or "").strip()
            ename = (vals[idx_name] or "").strip().lower()
            v_raw = (vals[idx_val] or "").strip()
            if not code or not ename or not v_raw:
                continue
            try:
                v = float(v_raw)
            except Exception:
                continue

            # map tên -> chữ cái
            if ename.startswith("realistic"):
                key = "R"
            elif ename.startswith("investigative"):
                key = "I"
            elif ename.startswith("artistic"):
                key = "A"
            elif ename.startswith("social"):
                key = "S"
            elif ename.startswith("enterprising"):
                key = "E"
            elif ename.startswith("conventional"):
                key = "C"
            else:
                continue

            tmp.setdefault(code, {})[key] = v

        # Hoàn thiện đủ 6 chiều, normalize và gán
        for code, d in tmp.items():
            vec_raw = [
                d.get("R", 0.0),
                d.get("I", 0.0),
                d.get("A", 0.0),
                d.get("S", 0.0),
                d.get("E", 0.0),
                d.get("C", 0.0),
            ]
            vec = _norm_scale(vec_raw)
            rows[code] = {
                "R": vec[0],
                "I": vec[1],
                "A": vec[2],
                "S": vec[3],
                "E": vec[4],
                "C": vec[5],
            }
    return rows


def load_jobs_vi_tagged():
    """Đọc CSV jobs_vi_tagged.csv"""
    df = pd.read_csv(VN_CATALOG, encoding="utf-8-sig", dtype=str, keep_default_na=False)
    rename = {
        "job_id": "job_id",
        "title_vi": "title_vi",
        "description_vi": "description_vi",
        "skills_vi": "skills_vi",
        "riasec_centroid_json": "riasec_centroid_json",
        "tags_vi": "tags_vi",
        "tags": "tags_vi",
    }
    for k, v in rename.items():
        if k in df.columns and k != v:
            df.rename(columns={k: v}, inplace=True)
    needed = [
        "job_id",
        "title_vi",
        "description_vi",
        "skills_vi",
        "riasec_centroid_json",
        "tags_vi",
    ]
    for c in needed:
        if c not in df.columns:
            df[c] = ""
    return df[needed]


# ---------- SQL ----------
UPSERT_CAREER = """
INSERT INTO core.careers(
  onet_code, slug, title_en, title_vi, short_desc_en, short_desc_vn, created_at, updated_at
) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
ON CONFLICT (onet_code) DO UPDATE SET
  slug           = EXCLUDED.slug,
  title_en       = EXCLUDED.title_en,
  title_vi       = COALESCE(EXCLUDED.title_vi, core.careers.title_vi),
  short_desc_en  = COALESCE(EXCLUDED.short_desc_en, core.careers.short_desc_en),
  short_desc_vn  = COALESCE(EXCLUDED.short_desc_vn, core.careers.short_desc_vn),
  updated_at     = EXCLUDED.updated_at
RETURNING id;
"""

UPSERT_TAG = """
INSERT INTO core.career_tags(name) VALUES (%s)
ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
RETURNING id;
"""

UPSERT_TAG_MAP = """
INSERT INTO core.career_tag_map(career_id, tag_id)
VALUES (%s,%s)
ON CONFLICT DO NOTHING;
"""

UPSERT_INTERESTS = """
INSERT INTO core.career_interests(onet_code, r,i,a,s,e,c, source, fetched_at)
VALUES (%s,%s,%s,%s,%s,%s,%s,'ONET', %s)
ON CONFLICT (onet_code) DO UPDATE SET
  r=EXCLUDED.r,i=EXCLUDED.i,a=EXCLUDED.a,s=EXCLUDED.s,e=EXCLUDED.e,c=EXCLUDED.c,
  source=EXCLUDED.source,fetched_at=EXCLUDED.fetched_at;
"""


# ---------- MAIN ----------
def main():
    titles = read_onet_titles()         # full O*NET, để lấy title_en + desc_en
    ints = read_onet_interests()        # full RIASEC, sẽ filter sau
    df_vi = load_jobs_vi_tagged()       # catalog đã clean (~924 dòng)

    # Tập mã nghề hợp lệ = chỉ những gì xuất hiện trong catalog đã clean
    valid_codes: set[str] = set()
    vi_rows_by_code: dict[str, dict] = {}

    for _, r in df_vi.iterrows():
        code = (r.get("job_id") or "").strip()
        if not code:
            continue
        valid_codes.add(code)
        vi_rows_by_code[code] = r

    print(f"[INFO] valid_codes from VN_CATALOG = {len(valid_codes)}")

    if not valid_codes:
        raise SystemExit("[ERR] VN_CATALOG rỗng hoặc không có cột job_id.")

    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            today = date.today()

            # XÓA SẠCH trước khi load lại cho chắc
            cur.execute("TRUNCATE TABLE core.careers RESTART IDENTITY CASCADE;")

            # 1) Upsert careers chỉ cho các code hợp lệ
            for code in sorted(valid_codes):
                tinfo = titles.get(code, {})  # có thể thiếu nếu O*NET không có
                title_en = (tinfo.get("title_en") or "").strip() or None
                short_en = (tinfo.get("desc_en") or "").strip() or None

                r_vi = vi_rows_by_code.get(code, {})
                title_vi = (r_vi.get("title_vi") or "").strip() or None
                short_vi = (r_vi.get("description_vi") or "").strip() or None

                base = title_en or title_vi or "unknown"
                slug = slugify(f"{base}-{code}")

                cur.execute(
                    UPSERT_CAREER,
                    (code, slug, title_en or base, title_vi, short_en, short_vi, today, today),
                )
                career_id = cur.fetchone()[0]

                # 2) Tags_vi từ catalog
                tags_vi = (r_vi.get("tags_vi") or "").strip()
                if tags_vi:
                    for t in [x.strip() for x in tags_vi.split("|") if x.strip()]:
                        cur.execute(UPSERT_TAG, (t,))
                        tag_id = cur.fetchone()[0]
                        cur.execute(UPSERT_TAG_MAP, (career_id, tag_id))

            # 3) RIASEC interests chỉ cho valid_codes
            for code in sorted(valid_codes):
                v = ints.get(code)
                if not v:
                    continue
                cur.execute(
                    UPSERT_INTERESTS,
                    (code, v["R"], v["I"], v["A"], v["S"], v["E"], v["C"], today),
                )

        conn.commit()

    print(
        "[OK] Loaded careers FROM CLEAN CATALOG "
        f"(rows={len(valid_codes)}, all from {VN_CATALOG.name})"
    )



if __name__ == "__main__":
    main()
