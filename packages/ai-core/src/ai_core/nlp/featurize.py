import torch


def mean_pooling(last_hidden_state: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
    # last_hidden_state: [B, T, H], attention_mask: [B, T]
    mask = attention_mask.unsqueeze(-1)  # [B, T, 1]
    summed = (last_hidden_state * mask).sum(dim=1)
    denom = mask.sum(dim=1).clamp(min=1e-6)
    return summed / denom
