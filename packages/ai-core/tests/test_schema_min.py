import json


def test_each_record_has_text_and_silver():
    with open("data/processed/train_with_labels.jsonl", encoding="utf-8") as f:
        line = f.readline()
        assert line, "Dataset trống"
        rec = json.loads(line)
        assert rec["essay_text"]
        assert "silver_riasec" in rec
