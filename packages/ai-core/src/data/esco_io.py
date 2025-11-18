# src/data/esco_io.py
from __future__ import annotations

import os

import pandas as pd
from pandas.errors import ParserError

# ====== ÄÆ°á»ng dáº«n máº·c Ä‘á»‹nh (cÃ³ thá»ƒ Ä‘á»•i á»Ÿ nÆ¡i gá»i) ======
ESCO_DIR = "data/raw/esco"


# ====== Helpers cho IO CSV ESCO ======
def read_esco_csv_robust(path: str) -> pd.DataFrame:
    """
    Äá»c CSV ESCO an toÃ n:
      - thá»­ C-engine (nhanh)
      - náº¿u ParserError -> engine='python' + sep=None
      - náº¿u váº«n lá»—i -> on_bad_lines='skip'
    """
    try:
        return pd.read_csv(path, dtype=str, na_filter=False, encoding="utf-8")
    except ParserError:
        pass
    try:
        return pd.read_csv(
            path,
            dtype=str,
            na_filter=False,
            encoding="utf-8",
            engine="python",
            sep=None,
            quotechar='"',
            escapechar="\\",
        )
    except ParserError:
        return pd.read_csv(
            path,
            dtype=str,
            na_filter=False,
            encoding="utf-8",
            engine="python",
            sep=None,
            quotechar='"',
            escapechar="\\",
            on_bad_lines="skip",
        )


def _strip_df_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Chuáº©n hoÃ¡ tÃªn cá»™t: bá» khoáº£ng tráº¯ng Ä‘áº§u/cuá»‘i."""
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


# ====== ISCO tree ======
def load_isco_tree() -> dict | None:
    """
    Äá»c cÃ¢y ISCO tá»« ISCOGroups_en.csv.
    Tráº£ vá» dict:
      {
        "by_uri": { uri: {"label":..,"notation":..,"broader":..}, ... },
        "by_notation": { "2":"uri_major_2", "25":"uri_submajor_25", "251":"...", "2512":"..." }
      }

    LÆ°u Ã½: náº¿u file chá»‰ cÃ³ cá»™t 'code' (khÃ´ng cÃ³ 'notation'/'broader'), ta váº«n xÃ¢y Ä‘Æ°á»£c cÃ¢y
    báº±ng cÃ¡ch dÃ¹ng 'code' lÃ m notation vÃ  suy luáº­n broader theo tiá»n tá»‘.
    """
    path = os.path.join(ESCO_DIR, "ISCOGroups_en.csv")
    if not os.path.exists(path):
        return None

    df = _strip_df_columns(read_esco_csv_robust(path))

    # Æ¯u tiÃªn cÃ¡c tÃªn cá»™t chuáº©n; náº¿u khÃ´ng cÃ³ thÃ¬ dÃ² theo tÃªn gáº§n giá»‘ng
    cols = {c.lower(): c for c in df.columns}
    uri_col = cols.get("concepturi") or "conceptUri"
    label_col = cols.get("preferredlabel") or "preferredLabel"
    # cÃ³ thá»ƒ lÃ  'notation' hoáº·c 'code'
    note_col = cols.get("notation") or cols.get("code")
    broad_col = cols.get("broader")  # cÃ³ thá»ƒ khÃ´ng tá»“n táº¡i

    # Chuáº©n hoÃ¡ tá»‘i thiá»ƒu
    for c in [uri_col, label_col, note_col] if note_col else [uri_col, label_col]:
        if c in df.columns:
            df[c] = df[c].astype(str).strip()

    if uri_col not in df.columns:
        return None

    by_uri: dict[str, dict[str, str]] = {}
    by_note: dict[str, str] = {}

    # Map cÆ¡ báº£n
    for _, r in df.iterrows():
        u = r.get(uri_col, "") or ""
        if not u:
            continue
        lab = (r.get(label_col, "") or "").strip() if label_col in df.columns else ""
        note = (r.get(note_col, "") or "").strip() if note_col and (note_col in df.columns) else ""
        rec = {"label": lab, "notation": note, "broader": ""}
        by_uri[u] = rec
        if note:
            by_note[note] = u

    # Náº¿u chÆ°a cÃ³ broader, suy luáº­n theo tiá»n tá»‘ 'notation'
    def parent_code(cd: str) -> str:
        cd = (cd or "").strip()
        if len(cd) == 4:
            return cd[:3]
        if len(cd) == 3:
            return cd[:2]
        if len(cd) == 2:
            return cd[:1]
        return ""

    # Náº¿u file cÃ³ sáºµn cá»™t broader thÃ¬ ghi Ä‘Ã¨ (Æ°u tiÃªn dá»¯ liá»‡u nguá»“n)
    if broad_col and broad_col in df.columns:
        for _, r in df.iterrows():
            u = (r.get(uri_col, "") or "").strip()
            b = (r.get(broad_col, "") or "").strip()
            if u in by_uri and b:
                by_uri[u]["broader"] = b

    return {"by_uri": by_uri, "by_notation": by_note}


def _walk_isco_path_from_uri(uri: str, tree_by_uri: dict[str, dict[str, str]]) -> list[str]:
    """Leo cÃ¢y broader tá»« má»™t URI â†’ danh sÃ¡ch tag theo thá»© tá»± major â†’ â€¦ â†’ unit."""
    path, seen = [], set()
    u = (uri or "").strip()
    while u and (u in tree_by_uri) and (u not in seen):
        seen.add(u)
        node = tree_by_uri[u]
        code = (node.get("notation") or "").strip()
        lab = (node.get("label") or "").strip()
        tag = f"ISCO:{code} {lab}".strip() if (code or lab) else ""
        if tag:
            path.append(tag)
        u = (node.get("broader") or "").strip()
    return list(reversed(path))


def build_isco_tags_from_value(val: str, isco_tree: dict | None) -> list[str]:
    """
    val: cÃ³ thá»ƒ lÃ  URI ('httpâ€¦') hoáº·c mÃ£ 'code' (vd '2512' hay '2512|2521').
    """
    if not isco_tree or val is None:
        return []
    v = str(val).strip()
    by_uri = isco_tree.get("by_uri", {})
    by_note = isco_tree.get("by_notation", {})

    if v.startswith("http"):
        return _walk_isco_path_from_uri(v, by_uri)

    code = v.split("|")[0].strip()
    uri = by_note.get(code)
    if uri:
        return _walk_isco_path_from_uri(uri, by_uri)
    return []


# ====== ESCO occupations/skills/relations ======
def detect_isco_col_in_occupations(occ_df: pd.DataFrame) -> str | None:
    """TÃ¬m cá»™t cÃ³ chá»¯ 'isco' trong occupations_en.csv; Æ°u tiÃªn tÃªn chá»©a group/uri/code."""
    cols = [c for c in occ_df.columns if "isco" in c.lower()]
    if not cols:
        return None
    cols = sorted(
        cols,
        key=lambda c: (
            not ("group" in c.lower() or "uri" in c.lower() or "code" in c.lower()),
            c,
        ),
    )
    return cols[0]


def load_esco_csv() -> tuple[pd.DataFrame, pd.DataFrame, dict, dict, str, str, str | None]:
    """
    Tráº£ vá»:
      - esco_occ      : DataFrame gá»n (conceptUri, preferredLabel, [isco?], title_norm)
      - esco_occ_full : DataFrame Ä‘áº§y Ä‘á»§ occupations (Ä‘á»ƒ tra cá»©u cá»™t ISCO hay cá»™t khÃ¡c)
      - essential_map : dict occupationUri -> [skill names] (essential)
      - optional_map  : dict occupationUri -> [skill names] (optional)
      - esco_title_col: tÃªn cá»™t tiÃªu Ä‘á» nghá» trong ESCO
      - occ_uri_col   : tÃªn cá»™t URI nghá» trong ESCO
      - isco_col      : tÃªn cá»™t ISCO tÃ¬m tháº¥y (hoáº·c None)
    """
    occ = _strip_df_columns(read_esco_csv_robust(os.path.join(ESCO_DIR, "occupations_en.csv")))
    skills = _strip_df_columns(read_esco_csv_robust(os.path.join(ESCO_DIR, "skills_en.csv")))
    rel = _strip_df_columns(
        read_esco_csv_robust(os.path.join(ESCO_DIR, "occupationSkillRelations_en.csv"))
    )

    # XÃ¡c Ä‘á»‹nh tÃªn cá»™t chÃ­nh (chá»‹u Ä‘Æ°á»£c lá»‡ch hoa/thÆ°á»ng/khoáº£ng tráº¯ng)
    occ_uri_col = "conceptUri" if "conceptUri" in occ.columns else occ.columns[0]
    occ_title_col = "preferredLabel" if "preferredLabel" in occ.columns else occ.columns[1]

    skill_uri = "conceptUri" if "conceptUri" in skills.columns else skills.columns[0]
    skill_label = "preferredLabel" if "preferredLabel" in skills.columns else skills.columns[1]

    rel_occ = "occupationUri"
    rel_skill = "skillUri"
    rel_type = "relationType"

    # Map skillUri -> tÃªn ká»¹ nÄƒng
    skill_name = dict(zip(skills[skill_uri], skills[skill_label], strict=False))

    def collect_skills(df: pd.DataFrame, kind: str) -> dict:
        x = df[df[rel_type].str.lower() == kind]
        return (
            x.groupby(rel_occ)[rel_skill]
            .apply(lambda s: sorted({skill_name.get(u, u) for u in s}))
            .to_dict()
        )

    essential_map = collect_skills(rel, "essential")
    optional_map = collect_skills(rel, "optional")

    # PhÃ¡t hiá»‡n cá»™t ISCO trÃªn báº£n FULL occupations
    isco_col = detect_isco_col_in_occupations(occ)

    # Báº£n gá»n Ä‘á»ƒ match tiÃªu Ä‘á» + (náº¿u cÃ³) giá»¯ luÃ´n cá»™t ISCO cho tiá»‡n
    keep_cols = [occ_uri_col, occ_title_col]
    if isco_col and isco_col not in keep_cols:
        keep_cols.append(isco_col)

    occ_small = occ[keep_cols].copy()

    # Chuáº©n hoÃ¡ tiÃªu Ä‘á» thÆ°á»ng hoÃ¡ Ä‘á»ƒ fuzzy
    def _normalize_title(s: str) -> str:
        import unicodedata

        s = (s or "").strip().lower()
        s = "".join(
            c
            for c in unicodedata.normalize("NFKD", s)
            if not unicodedata.category(c).startswith("M")
        )
        return " ".join(s.split())

    occ_small["title_norm"] = occ_small[occ_title_col].map(_normalize_title)

    occ_full = occ.copy()

    return occ_small, occ_full, essential_map, optional_map, occ_title_col, occ_uri_col, isco_col
