import json
from pathlib import Path

import pandas as pd

BASE = Path("data/processed")
OUT = Path("data/nlp")
OUT.mkdir(parents=True, exist_ok=True)

TASKS = {
    "riasec": {
        "dims": ["R", "I", "A", "S", "E", "C"],
        "candidates": ["silver_riasec", "riasec", "labels.riasec", "labels"],
    },
    "big5": {
        "dims": ["O", "C", "E", "A", "N"],
        "candidates": ["silver_big5", "big5", "labels.big5", "labels"],
    },
}


def pick_file(*cands):
    for p in cands:
        p = Path(p)
        if p.exists():
            return p
    return None


def read_jsonl(path: Path):
    rows = []
    with path.open("r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def extract_text(d: dict):
    for k in ["text", "essay_text", "essay", "content"]:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v
    if isinstance(d.get("answers"), list):
        return " ".join(str(x) for x in d["answers"] if x)
    return str(d)


def get_label_dict(row: dict, task_cfg: dict):
    # thá»­ láº§n lÆ°á»£t cÃ¡c á»©ng viÃªn nhÃ¡nh nhÃ£n
    for key in task_cfg["candidates"]:
        if "." in key:
            # vÃ­ dá»¥ 'labels.riasec'
            a, b = key.split(".", 1)
            if isinstance(row.get(a), dict) and isinstance(row[a].get(b), dict):
                return row[a][b]
        else:
            v = row.get(key)
            if isinstance(v, dict):
                return v
    return None  # khÃ´ng tÃ¬m tháº¥y


def to_df(objs, task: str, task_cfg: dict):
    dims = task_cfg["dims"]
    data = {"text": [extract_text(o) for o in objs]}
    # khá»Ÿi táº¡o cá»™t nhÃ£n = None
    for d in dims:
        data[d] = [None] * len(objs)

    for i, o in enumerate(objs):
        ld = get_label_dict(o, task_cfg)
        if ld is None:
            continue
        for d in dims:
            v = ld.get(d)
            data[d][i] = v

    df = pd.DataFrame(data)

    # Ã©p float, cho phÃ©p NaN â†’ masked MSE sáº½ tá»± mask
    for d in dims:
        df[d] = pd.to_numeric(df[d], errors="coerce")

    # náº¿u phÃ¡t hiá»‡n max > 1 â†’ hiá»ƒu lÃ  0â€“100, scale vá» [0,1]
    mx = pd.concat([df[d] for d in dims], axis=1).max().max()
    if pd.notna(mx) and mx > 1.0:
        for d in dims:
            df[d] = df[d] / 100.0

    return df


def write_split(task: str, split: str, src_jsonl: Path):
    if not src_jsonl:
        return
    objs = read_jsonl(src_jsonl)
    if not objs:
        print(f"Skip {task}/{split}: empty")
        return
    df = to_df(objs, task, TASKS[task])
    out = OUT / f"{split}_{task}.csv"
    df.to_csv(out, index=False, encoding="utf-8-sig")
    print(
        f"Wrote {out} shape={df.shape}  NaN-perc="
        + ",".join(f"{c}:{df[c].isna().mean():.2f}" for c in TASKS[task]["dims"])
    )


train_jsonl = pick_file(BASE / "train_with_labels.jsonl", BASE / "train.jsonl")
val_jsonl = pick_file(BASE / "val_with_labels.jsonl", BASE / "val.jsonl")
test_jsonl = pick_file(BASE / "test_with_labels.jsonl", BASE / "test.jsonl")

for task in TASKS:
    write_split(task, "train", train_jsonl)
    write_split(task, "val", val_jsonl)
    write_split(task, "test", test_jsonl)
