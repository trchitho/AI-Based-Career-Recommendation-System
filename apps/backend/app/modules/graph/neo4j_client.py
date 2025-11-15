from __future__ import annotations

import os

try:
    from neo4j import GraphDatabase  # type: ignore
except Exception:
    GraphDatabase = None  # type: ignore


def get_driver():
    url = os.getenv("NEO4J_URL")
    if not url or GraphDatabase is None:
        return None
    user = os.getenv("NEO4J_USER")
    pwd = os.getenv("NEO4J_PASS")
    try:
        return GraphDatabase.driver(url, auth=(user, pwd))
    except Exception:
        return None
