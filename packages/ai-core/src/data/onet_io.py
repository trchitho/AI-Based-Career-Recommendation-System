# src/data/onet_io.py
from __future__ import annotations

import os

import pandas as pd

ONET_DIR = "data/raw/onet"


def read_onet_tsv(name: str) -> pd.DataFrame:
    path = os.path.join(ONET_DIR, name)
    # TSV với dtype=str, giữ nguyên nội dung
    return pd.read_csv(path, sep="\t", dtype=str, quoting=3, encoding="utf-8", na_filter=False)


def load_onet_core() -> pd.DataFrame:
    """
        Occupation Data.txt — cột chính:
      - job_id (O*NET-SOC Code)
      - title
      - Description
      - title_norm (dành cho matching)
    """
    occ = read_onet_tsv("Occupation Data.txt")
    cols = {c.lower().strip(): c for c in occ.columns}
    code = cols.get("o*net-soc code", "O*NET-SOC Code")
    title = cols.get("title", "Title")
    desc = cols.get("description", "Description")

    core = occ[[code, title, desc]].rename(
        columns={code: "job_id", title: "title", desc: "Description"}
    )
    core["job_id"] = core["job_id"].astype(str).str.strip()
    core = core.drop_duplicates(subset=["job_id"])
    # Normalize ở build_jobs_catalog qua matchers.normalize_title
    core["title_norm"] = (
        core["title"]
        .str.lower()
        .str.normalize("NFKD")
        .str.encode("ascii", "ignore")
        .str.decode("ascii")
    )
    core["title_norm"] = core["title_norm"].str.replace(r"\s+", " ", regex=True).str.strip()
    return core


def load_onet_riasec() -> pd.DataFrame:
    """
    Interests.txt → pivot 6 cột R, I, A, S, E, C trong [0..1].
    Ưu tiên Scale ID = OI, fallback IH nếu không có OI.
    """
    inter = read_onet_tsv("Interests.txt")
    cols = {c.lower().strip(): c for c in inter.columns}

    code_col = cols.get("o*net-soc code", "O*NET-SOC Code")
    name_col = cols.get("element name", "Element Name")
    val_col = cols.get("data value", cols.get("datavalue", "Data Value"))
    scale_col = cols.get("scale id", "Scale ID")

    use_cols = [code_col, name_col, val_col]
    if scale_col in inter.columns:
        use_cols.append(scale_col)
    df = inter[use_cols].copy()

    if scale_col in df.columns:
        scl = df[scale_col].astype(str).str.strip().str.upper()
        if (scl == "OI").any():
            df = df[scl == "OI"]
        elif (scl == "IH").any():
            df = df[scl == "IH"]

    df[val_col] = df[val_col].astype(str).str.replace(",", ".", regex=False)
    df[val_col] = pd.to_numeric(df[val_col], errors="coerce").fillna(0.0)

    name_l = df[name_col].astype(str).str.strip().str.lower()
    mapping = {
        "realistic": "R",
        "investigative": "I",
        "artistic": "A",
        "social": "S",
        "enterprising": "E",
        "conventional": "C",
    }
    df["dim"] = name_l.map(lambda x: mapping.get(x, x[:1].upper()))

    piv = df.pivot_table(index=code_col, columns="dim", values=val_col, aggfunc="max").reset_index()
    piv = piv.rename(columns={code_col: "job_id"}).fillna(0.0)
    piv["job_id"] = piv["job_id"].astype(str).str.strip()

    dims = ["R", "I", "A", "S", "E", "C"]
    if len(piv.columns) > 1:
        vmax = float(piv[[c for c in piv.columns if c in dims]].to_numpy().max())
    else:
        vmax = 0.0
    denom = 7.0 if vmax <= 7.0001 else 100.0

    for d in dims:
        if d in piv.columns:
            col = pd.to_numeric(piv[d], errors="coerce").fillna(0.0)
            piv[d] = (col / denom).clip(0, 1)
        else:
            piv[d] = 0.0
    return piv


def load_onet_skills(topn=15, min_importance=50):
    skills = read_onet_tsv("Skills.txt")
    cols = {c.lower().strip(): c for c in skills.columns}
    code = cols.get("o*net-soc code", "O*NET-SOC Code")
    elname = cols.get("element name", "Element Name")
    scale = cols.get("scale id", "Scale ID")
    val = cols.get("data value", cols.get("datavalue", "Data Value"))

    df = skills[[code, elname, scale, val]].copy()

    # Chuẩn hóa số (nếu có dấu phẩy thập phân)
    df[val] = df[val].astype(str).str.replace(",", ".", regex=False)
    df[val] = pd.to_numeric(df[val], errors="coerce").fillna(0.0)

    # Lọc đúng thang Importance (IM) — chú ý thêm .strip()
    df[scale] = df[scale].astype(str).str.strip().str.upper()
    df = df[df[scale] == "IM"]

    # Ngưỡng min_importance (với IM thường là thang 0..5; bạn đang truyền 0 nên OK)
    df = df[df[val] >= float(min_importance)]

    # Lấy top-N theo giá trị quan trọng nhất
    df["rank"] = df.groupby(code)[val].rank(method="first", ascending=False)
    df = df[df["rank"] <= topn]

    agg = (
        df.groupby(code)[elname]
        .apply(lambda s: sorted(set(s), key=str))
        .reset_index()
        .rename(columns={code: "job_id", elname: "skills_onet"})
    )

    # Chuẩn hóa job_id
    agg["job_id"] = agg["job_id"].astype(str).str.strip()
    return agg
