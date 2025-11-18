# src/data/make_dataset.py
import csv
import json
import os
from pathlib import Path
from typing import Any

from src.utils.clean_text import basic_clean, valid_min_length

# ---- Chá»n file CSV Ä‘áº§u vÃ o (Æ°u tiÃªn file Ä‘Ã£ xá»­ lÃ½) ----
CANDIDATES = [
    Path("data/processed/responses_processed.csv"),  # â† Æ°u tiÃªn
    Path("data/raw/form_responses.csv"),
]
RAW_CSV = next((p for p in CANDIDATES if p.exists()), CANDIDATES[0])

OUT_PATH = Path("data/processed/train.jsonl")

# NgÆ°á»¡ng tá»‘i thiá»ƒu kÃ½ tá»± essay sau lÃ m sáº¡ch (override báº±ng env MIN_CHARS)
MIN_CHARS = int(os.getenv("MIN_CHARS", "10"))  # bootstrap Ä‘á»ƒ khÃ´ng bá»‹ 0 records


def parse_float(x: str) -> float | None:
    try:
        v = float(x)
        if 0.0 <= v <= 1.0:
            return v
    except Exception:
        pass
    return None


def to_record(row: dict[str, str]) -> dict[str, Any] | None:
    essay = basic_clean(row.get("essay_text", ""))
    if not valid_min_length(essay, min_chars=MIN_CHARS):
        return None

    def pick(keys: list[str]) -> dict[str, float | None]:
        return {k: parse_float((row.get(k, "") or "").strip()) for k in keys}

    uid_raw = (row.get("user_id") or "").strip()
    if not uid_raw.isdigit():
        return None

    record = {
        "user_id": int(uid_raw),
        "language": (row.get("language") or "vi").lower().strip(),
        "essay_text": essay,
        "riasec_scores": pick(["R", "I", "A", "S", "E", "C"]),
        "big5_scores": {
            "O": parse_float((row.get("O", "") or "").strip()),
            "C": parse_float((row.get("C2", "") or "").strip()),  # Big Five 'C' -> C2
            "E": parse_float((row.get("E2", "") or "").strip()),
            "A": parse_float((row.get("A2", "") or "").strip()),
            "N": parse_float((row.get("N", "") or "").strip()),
        },
        "target_jobs": [j.strip() for j in (row.get("target_jobs") or "").split("|") if j.strip()]
        or None,
        "source": (row.get("source") or "survey").strip(),
    }
    return record


def main():
    if not RAW_CSV.exists():
        raise FileNotFoundError(
            "KhÃ´ng tÃ¬m tháº¥y file CSV. HÃ£y Ä‘áº·t 1 trong cÃ¡c file sau:\n"
            "- data/processed/responses_processed.csv (khuyÃªn dÃ¹ng)\n"
            "- data/raw/responses.csv\n"
            "- data/raw/form_responses.csv\n"
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    kept = 0
    skipped_short = 0
    skipped_other = 0

    # DÃ¹ng utf-8-sig Ä‘á»ƒ an toÃ n vá»›i file export tá»« Google Sheets
    with (
        RAW_CSV.open("r", encoding="utf-8-sig", newline="") as f_in,
        OUT_PATH.open("w", encoding="utf-8") as f_out,
    ):
        reader = csv.DictReader(f_in)
        for row in reader:
            rec = to_record(row)
            if not rec:
                essay_clean = basic_clean(row.get("essay_text", ""))
                if not valid_min_length(essay_clean, min_chars=MIN_CHARS):
                    skipped_short += 1
                else:
                    skipped_other += 1
                continue
            f_out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            kept += 1

    print(f"[make_dataset] Input: {RAW_CSV}")
    print(f"[make_dataset] MIN_CHARS = {MIN_CHARS}")
    print(f"[make_dataset] Wrote {kept} records -> {OUT_PATH}")
    if skipped_short or skipped_other:
        print(f"[make_dataset] Skipped (essay too short): {skipped_short}")
        print(f"[make_dataset] Skipped (other reasons): {skipped_other}")


if __name__ == "__main__":
    main()
