import json
import random
from pathlib import Path

INP = Path("data/processed/train_with_labels.jsonl")  # 1) file nguồn
OUTD = Path("data/processed")  # 2) thư mục đích
SEED = 42  # 3) seed cố định
RATIOS = (0.8, 0.1, 0.1)  # train/val/test             # 4) tỉ lệ chia


def main():
    random.seed(SEED)  # 5) cố định thứ tự ngẫu nhiên (tái lập được)
    # 6) đọc toàn bộ record từ JSONL (mỗi dòng là 1 JSON)
    records = [json.loads(line) for line in INP.read_text(encoding="utf-8").splitlines()]
    random.shuffle(records)  # 7) xáo trộn ngẫu nhiên
    n = len(records)
    # 8) tính số lượng từng phần theo tỉ lệ (lấy phần nguyên)
    n_train = int(n * RATIOS[0])
    n_val = int(n * RATIOS[1])
    # 9) cắt list theo số lượng đã tính; “còn lại” là test
    splits = {
        "train": records[:n_train],
        "val": records[n_train : n_train + n_val],
        "test": records[n_train + n_val :],
    }
    # 10) đảm bảo thư mục có tồn tại
    OUTD.mkdir(parents=True, exist_ok=True)
    # 11) ghi ra 3 file JSONL: train.jsonl, val.jsonl, test.jsonl
    for k, recs in splits.items():
        (OUTD / f"{k}.jsonl").write_text(
            "\n".join(json.dumps(r, ensure_ascii=False) for r in recs), encoding="utf-8"
        )
    # 12) in thống kê số lượng mỗi phần
    print({k: len(v) for k, v in splits.items()})


if __name__ == "__main__":
    main()


# train: dữ liệu để học tham số mô hình.
# val (validation): dữ liệu để chọn siêu tham số (learning rate, số epoch, early stopping, kiến trúc head…)
# không dùng để học tham số; dùng để quyết định “model nào tốt nhất”.
# test: dữ liệu đánh giá cuối cùng sau khi mọi quyết định đã chốt; tránh “quá khớp” (overfit) do nhìn thấy val nhiều lần.
