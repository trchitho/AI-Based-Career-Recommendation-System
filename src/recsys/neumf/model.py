# packages/ai-core/src/recsys/neumf/model.py
import torch.nn as nn


class MLPScore(nn.Module):
    def __init__(self, dim_text=768, use_item_riasec=True):
        in_dim = dim_text * 2 + 6 + 5 + (6 if use_item_riasec else 0)
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 512), nn.ReLU(), nn.Linear(512, 128), nn.ReLU(), nn.Linear(128, 1)
        )

    def forward(self, x):  # x: [B, in_dim]
        return self.net(x).squeeze(-1)
