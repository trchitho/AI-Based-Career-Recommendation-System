# src/ai_core/recsys/neumf/model.py
from __future__ import annotations

import torch
import torch.nn as nn


class MLPScore(nn.Module):
    """
    MLP ranker:
    - input = concat(user_text, item_text, user_riasec, user_big5, item_riasec)
    """

    def __init__(
        self,
        dim_text: int = 768,
        use_item_riasec: bool = True,
        hidden_dims=(512, 128),
    ):
        super().__init__()
        extra = 6 + 5 + (6 if use_item_riasec else 0)
        in_dim = dim_text * 2 + extra

        layers = []
        last = in_dim
        for h in hidden_dims:
            layers.append(nn.Linear(last, h))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(0.1))
            last = h
        layers.append(nn.Linear(last, 1))  # logit

        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: [B, in_dim]
        return: [B] logit
        """
        return self.net(x).squeeze(-1)
