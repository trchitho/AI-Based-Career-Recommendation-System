# file: E:\OneDrive\Desktop\ai-core\scratch_test_infer.py
import json

from src.recsys.neumf.infer import Ranker

r = Ranker(
    model_path="E:/OneDrive/Desktop/ai-core/models/recsys_mlp/best.pt",
    user_feats="E:/OneDrive/Desktop/ai-core/data/processed/user_feats.json",
    item_feats="E:/OneDrive/Desktop/ai-core/data/processed/item_feats.json",
)

# Lấy 20 career bất kỳ từ item_feats để demo
with open("E:/OneDrive/Desktop/ai-core/data/processed/item_feats.json", encoding="utf-8") as f:
    items = list(json.load(f).keys())[:20]

print(r.infer_scores(user_id="2", cand_job_ids=items)[:10])
