import json
from pathlib import Path
from typing import Any

import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer

TASK2CFG = {
    "riasec": {"key": "silver_riasec", "dims": ["R", "I", "A", "S", "E", "C"]},
    "big5": {"key": "silver_big5", "dims": ["O", "C", "E", "A", "N"]},
}


class JsonlRegDataset(Dataset):
    def __init__(
        self, jsonl_path: Path, tokenizer: AutoTokenizer, task: str, max_length: int = 256
    ):
        self.rows = [
            json.loads(line) for line in jsonl_path.read_text(encoding="utf-8").splitlines()
        ]
        self.tok = tokenizer
        self.task = task
        self.cfg = TASK2CFG[task]
        self.max_length = max_length

    def __len__(self):
        return len(self.rows)

    def _get_target(self, row: dict[str, Any]):
        label_dict: dict[str, Any] | None = row.get(self.cfg["key"])
        dims = self.cfg["dims"]
        y = []
        m = []
        if label_dict is None:
            # KhÃ´ng cÃ³ nhÃ£n -> mask 0 háº¿t
            for _ in dims:
                y.append(0.0)
                m.append(0.0)
        else:
            for d in dims:
                v = label_dict.get(d, None)
                if v is None:
                    y.append(0.0)
                    m.append(0.0)
                else:
                    y.append(float(v))
                    m.append(1.0)
        return torch.tensor(y, dtype=torch.float32), torch.tensor(m, dtype=torch.float32)

    def __getitem__(self, idx):
        row = self.rows[idx]
        text = row["essay_text"]
        enc = self.tok(
            text,
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors=None,
        )
        y, mask = self._get_target(row)
        item = {
            "input_ids": torch.tensor(enc["input_ids"], dtype=torch.long),
            "attention_mask": torch.tensor(enc["attention_mask"], dtype=torch.long),
            "labels": y,
            "label_mask": mask,
        }
        return item
