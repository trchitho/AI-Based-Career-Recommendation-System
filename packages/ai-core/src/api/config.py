# src/api/config.py
import os
from pathlib import Path

from transformers import AutoModel, AutoTokenizer
import torch

# ---- DB & retrieval config ----
DB_URL      = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
RETR_TABLE  = os.getenv("RETR_TABLE", "ai.retrieval_jobs_visbert")
IVF_PROBES  = int(os.getenv("IVF_PROBES", "32"))
MODEL_DIR   = os.getenv("RETR_MODEL_DIR", "models/vi_sbert_768")
MODEL_PATH  = Path(MODEL_DIR)
TOK_NAME_FILE = MODEL_PATH / "tokenizer_name.txt"


def _read_model_name(p: Path) -> str:
  text = p.read_text(encoding="utf-8-sig").strip()
  return text.lstrip("\ufeff").strip()


if TOK_NAME_FILE.exists():
  MODEL_NAME = _read_model_name(TOK_NAME_FILE)
else:
  MODEL_NAME = MODEL_PATH.as_posix()

print(f"[BOOT] RETR_TABLE={RETR_TABLE} | MODEL_DIR={MODEL_DIR} | MODEL_NAME={MODEL_NAME}")

# ---- lazy load model cho retrieval ----
_retr_tok = None
_retr_mdl = None
_retr_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_retrieval_model():
  global _retr_tok, _retr_mdl
  if _retr_tok is None or _retr_mdl is None:
      _retr_tok = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
      _retr_mdl = AutoModel.from_pretrained(MODEL_NAME).eval().to(_retr_device)
  return _retr_tok, _retr_mdl, _retr_device


# ---- helper cho pgvector / psycopg_pool ----
def get_pg_dsn() -> str:
  """
  Trả về DSN Postgres dùng chung cho các service (pgvector, recsys…)
  """
  return DB_URL
