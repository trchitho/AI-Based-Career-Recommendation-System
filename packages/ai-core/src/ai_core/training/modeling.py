import torch.nn as nn
from transformers import AutoModel


class TextRegressor(nn.Module):
    def __init__(
        self, base_model_name: str, out_dim: int, freeze_base: bool = False, pooling: str = "mean"
    ):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(base_model_name)
        hidden = self.backbone.config.hidden_size
        self.dropout = nn.Dropout(0.1)
        self.head = nn.Linear(hidden, out_dim)
        self.pooling = pooling
        if freeze_base:
            for p in self.backbone.parameters():
                p.requires_grad = False

    def forward(self, input_ids, attention_mask):
        out = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        if (
            self.pooling == "cls"
            and hasattr(out, "pooler_output")
            and out.pooler_output is not None
        ):
            pooled = out.pooler_output
        else:
            # fallback mean pooling
            last_hidden = out.last_hidden_state
            mask = attention_mask.unsqueeze(-1)
            pooled = (last_hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-6)
        pooled = self.dropout(pooled)
        preds = self.head(pooled)  # [B, out_dim]
        return preds
