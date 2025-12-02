# apps/backend/app/etl/online_parsers.py
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Tuple


def as_list(x: Any) -> List[Any]:
    """Chuẩn hóa field có thể là item / list / None về list."""
    if x is None:
        return []
    if isinstance(x, list):
        return x
    return [x]


# ---------- Work Activities (summary box) ----------

def parse_work_activities_online(obj: Dict[str, Any]) -> List[str]:
    """
    Trả về list các câu activity (5–10 dòng).
    Online thường có: { "activities": [ {"text": "..."} , ... ] } hoặc tương đương.
    """
    out: List[str] = []

    for it in as_list(obj.get("activities") or obj.get("items") or obj.get("list")):
        if isinstance(it, dict):
            t = (it.get("activity") or it.get("text") or it.get("name") or "").strip()
            if t:
                out.append(t)
        elif isinstance(it, str) and it.strip():
            out.append(it.strip())

    # de-dup
    seen = set()
    unique_out: List[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            unique_out.append(x)

    return unique_out


# ---------- Detailed Work Activities (DWAs) ----------

def parse_dwas_online(obj: Dict[str, Any]) -> List[str]:
    """
    Trả về list string DWA.
    """
    out: List[str] = []

    for it in as_list(obj.get("items") or obj.get("dwas") or obj.get("list")):
        if isinstance(it, dict):
            t = (it.get("dwa") or it.get("text") or it.get("name") or "").strip()
            if t:
                out.append(t)
        elif isinstance(it, str) and it.strip():
            out.append(it.strip())

    # de-dup
    seen = set()
    unique_out: List[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            unique_out.append(x)

    return unique_out


# ---------- Work Context ----------

def parse_work_context_online(obj: Dict[str, Any]) -> List[str]:
    """
    Trả về list string mô tả context (môi trường làm việc).
    Thường: { "elements": [ {"name": "...", "description": "..."}, ... ] }
    """
    out: List[str] = []

    for it in as_list(obj.get("elements") or obj.get("items") or obj.get("list")):
        if not isinstance(it, dict):
            continue
        name = (it.get("name") or "").strip()
        desc = (it.get("description") or it.get("text") or "").strip()
        if desc:
            out.append(desc)
        elif name:
            out.append(name)

    # de-dup
    seen = set()
    unique_out: List[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            unique_out.append(x)

    return unique_out


# ---------- Education % ----------

def parse_education_pct_online(obj: Dict[str, Any]) -> List[Tuple[str, float | None]]:
    """
    Trả về [(label, pct)].
    Online thường có: { "distribution": [ {"label": "...", "value": 0.34}, ... ] }
    """
    out: List[Tuple[str, float | None]] = []

    for it in as_list(
        obj.get("distribution") or obj.get("education_levels") or obj.get("items") or obj.get("list")
    ):
        if not isinstance(it, dict):
            continue
        label = (it.get("label") or it.get("name") or "").strip()
        pct = it.get("value") or it.get("percent") or it.get("pct")
        if not label:
            continue
        try:
            pct_val = float(pct) if pct is not None else None
        except Exception:
            pct_val = None
        out.append((label, pct_val))

    # de-dup trên label
    seen = set()
    unique_out: List[Tuple[str, float | None]] = []
    for label, pct in out:
        if label not in seen:
            seen.add(label)
            unique_out.append((label, pct))

    return unique_out
