from pathlib import Path

base = Path("data/processed")

# Ưu tiên *_with_labels.jsonl nếu có
train = base / (
    "train_with_labels.jsonl" if (base / "train_with_labels.jsonl").exists() else "train.jsonl"
)
val = base / ("val_with_labels.jsonl" if (base / "val_with_labels.jsonl").exists() else "val.jsonl")

val.touch(exist_ok=True)

lines = [line for line in train.read_text(encoding="utf-8").splitlines() if line.strip()]

if len(lines) >= 2:
    last = lines.pop()  # chuyển 1 dòng cuối sang val
    train.write_text("\n".join(lines) + "\n", encoding="utf-8")
    with open(val, "a", encoding="utf-8") as f:
        f.write(last + "\n")
    print(f"Moved 1 sample from {train.name} -> {val.name}")
else:
    print(f"Not enough lines in {train.name} to split (len={len(lines)})")
