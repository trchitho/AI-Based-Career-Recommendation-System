# tests/test_data_and_labels.py
import json
from pathlib import Path

RIASEC = ["R", "I", "A", "S", "E", "C"]
BIG5 = ["O", "C", "E", "A", "N"]

DATA = Path("data/processed/train_with_labels.jsonl")


def _first_record():
    assert DATA.exists(), f"Missing {DATA}"
    with DATA.open("r", encoding="utf-8") as f:
        line = f.readline().strip()
        assert line, "Dataset is empty"
        return json.loads(line)


def _in_01(x):
    return isinstance(x, int | float) and 0.0 - 1e-9 <= x <= 1.0 + 1e-9


def test_schema_min_fields_exist():
    rec = _first_record()
    assert "user_id" in rec and isinstance(rec["user_id"], int)
    assert rec.get("language") in ("vi", "en")
    assert isinstance(rec.get("essay_text"), str) and len(rec["essay_text"]) >= 10
    assert "silver_riasec" in rec


def test_riasec_big5_ranges_if_present():
    rec = _first_record()
    if rec.get("riasec_scores"):
        for k in RIASEC:
            v = rec["riasec_scores"].get(k)
            if v is not None:
                assert _in_01(v), f"riasec_scores.{k} out of [0,1]: {v}"
    if rec.get("big5_scores"):
        for k in BIG5:
            v = rec["big5_scores"].get(k)
            if v is not None:
                assert _in_01(v), f"big5_scores.{k} out of [0,1]: {v}"


def test_silver_labels_computed_reasonably():
    rec = _first_record()
    sil = rec["silver_riasec"]
    for k in RIASEC:
        v = sil.get(k)
        assert v is not None, f"missing silver_riasec.{k}"
        assert _in_01(v), f"silver_riasec.{k} out of [0,1]: {v}"


def test_target_jobs_format_if_present():
    rec = _first_record()
    tj = rec.get("target_jobs")
    if tj is not None:
        assert isinstance(tj, list)
        assert all(isinstance(x, str) and x.strip() for x in tj)


def test_missing_labels_are_masked_later():
    """Đảm bảo nếu thiếu nhãn gốc thì downstream sẽ mask (check sự hiện diện trường soft label)."""
    rec = _first_record()
    # Chỉ cần chắc chắn pipeline đã thêm silver_riasec để huấn luyện được
    assert "silver_riasec" in rec and isinstance(rec["silver_riasec"], dict)
