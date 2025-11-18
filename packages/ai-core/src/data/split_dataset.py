import json
import random
from pathlib import Path

INP = Path("data/processed/train_with_labels.jsonl")  # 1) file nguá»“n
OUTD = Path("data/processed")  # 2) thÆ° má»¥c Ä‘Ã­ch
SEED = 42  # 3) seed cá»‘ Ä‘á»‹nh
RATIOS = (0.8, 0.1, 0.1)  # train/val/test             # 4) tá»‰ lá»‡ chia


def main():
    random.seed(SEED)  # 5) cá»‘ Ä‘á»‹nh thá»© tá»± ngáº«u nhiÃªn (tÃ¡i láº­p Ä‘Æ°á»£c)
    # 6) Ä‘á»c toÃ n bá»™ record tá»« JSONL (má»—i dÃ²ng lÃ  1 JSON)
    records = [json.loads(line) for line in INP.read_text(encoding="utf-8").splitlines()]
    random.shuffle(records)  # 7) xÃ¡o trá»™n ngáº«u nhiÃªn
    n = len(records)
    # 8) tÃ­nh sá»‘ lÆ°á»£ng tá»«ng pháº§n theo tá»‰ lá»‡ (láº¥y pháº§n nguyÃªn)
    n_train = int(n * RATIOS[0])
    n_val = int(n * RATIOS[1])
    # 9) cáº¯t list theo sá»‘ lÆ°á»£ng Ä‘Ã£ tÃ­nh; â€œcÃ²n láº¡iâ€ lÃ  test
    splits = {
        "train": records[:n_train],
        "val": records[n_train : n_train + n_val],
        "test": records[n_train + n_val :],
    }
    # 10) Ä‘áº£m báº£o thÆ° má»¥c cÃ³ tá»“n táº¡i
    OUTD.mkdir(parents=True, exist_ok=True)
    # 11) ghi ra 3 file JSONL: train.jsonl, val.jsonl, test.jsonl
    for k, recs in splits.items():
        (OUTD / f"{k}.jsonl").write_text(
            "\n".join(json.dumps(r, ensure_ascii=False) for r in recs), encoding="utf-8"
        )
    # 12) in thá»‘ng kÃª sá»‘ lÆ°á»£ng má»—i pháº§n
    print({k: len(v) for k, v in splits.items()})


if __name__ == "__main__":
    main()


# train: dá»¯ liá»‡u Ä‘á»ƒ há»c tham sá»‘ mÃ´ hÃ¬nh.
# val (validation): dá»¯ liá»‡u Ä‘á»ƒ chá»n siÃªu tham sá»‘ (learning rate, sá»‘ epoch, early stopping, kiáº¿n trÃºc headâ€¦)
# khÃ´ng dÃ¹ng Ä‘á»ƒ há»c tham sá»‘; dÃ¹ng Ä‘á»ƒ quyáº¿t Ä‘á»‹nh â€œmodel nÃ o tá»‘t nháº¥tâ€.
# test: dá»¯ liá»‡u Ä‘Ã¡nh giÃ¡ cuá»‘i cÃ¹ng sau khi má»i quyáº¿t Ä‘á»‹nh Ä‘Ã£ chá»‘t; trÃ¡nh â€œquÃ¡ khá»›pâ€ (overfit) do nhÃ¬n tháº¥y val nhiá»u láº§n.
