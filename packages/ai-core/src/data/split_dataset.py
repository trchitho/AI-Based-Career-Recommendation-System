import json
import random
from pathlib import Path

INP = Path("data/processed/train_with_labels.jsonl")  # 1) file nguồn
OUTD = Path("data/processed")  # 2) th mc ch
SEED = 42  # 3) seed cố định
RATIOS = (0.8, 0.1, 0.1)  # train/val/test             # 4) tỉ lệ chia


def main():
    random.seed(SEED)  # 5) c nh th t ngu nhin (ti lp c)
    # 6) c ton b record t JSONL (mi dng l 1 JSON)
    records = [json.loads(line) for line in INP.read_text(encoding="utf-8").splitlines()]
    random.shuffle(records)  # 7) xo trn ngu nhin
    n = len(records)
    # 8) tnh s lng tng phn theo t l (ly phn nguyn)
    n_train = int(n * RATIOS[0])
    n_val = int(n * RATIOS[1])
    # 9) ct list theo s lng  tnh; cn li l test
    splits = {
        "train": records[:n_train],
        "val": records[n_train : n_train + n_val],
        "test": records[n_train + n_val :],
    }
    # 10) m bo th mc c tn ti
    OUTD.mkdir(parents=True, exist_ok=True)
    # 11) ghi ra 3 file JSONL: train.jsonl, val.jsonl, test.jsonl
    for k, recs in splits.items():
        (OUTD / f"{k}.jsonl").write_text(
            "\n".join(json.dumps(r, ensure_ascii=False) for r in recs), encoding="utf-8"
        )
    # 12) in thng k s lng mi phn
    print({k: len(v) for k, v in splits.items()})


if __name__ == "__main__":
    main()


# train: d liu  hc tham s m hnh.
# val (validation): d liu  chn siu tham s (learning rate, s epoch, early stopping, kin trc head)
# khng dng  hc tham s; dng  quyt nh model no tt nht.
# test: d liu nh gi cui cng sau khi mi quyt nh  cht; trnh qu khp (overfit) do nhn thy val nhiu ln.
