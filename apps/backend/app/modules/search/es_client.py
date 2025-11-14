from __future__ import annotations
from typing import Any, Optional
import os

try:
    from elasticsearch import Elasticsearch  # type: ignore
except Exception:
    Elasticsearch = None  # type: ignore


def get_es_client() -> Optional[Any]:
    url = os.getenv("ES_URL")
    if not url or Elasticsearch is None:
        return None
    user = os.getenv("ES_USER")
    pwd = os.getenv("ES_PASS")
    opts = {"hosts": [url]}
    if user and pwd:
        opts["basic_auth"] = (user, pwd)
    try:
        return Elasticsearch(**opts)
    except Exception:
        return None

