"""Test the fixed bff_career _fetch_sections directly."""
import sys, os
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv('.env')

import psycopg
from app.api.bff_career import _fetch_sections, _normalize_onet_code

CODE = "25-2051.00"
DB = os.getenv("DATABASE_URL")

print(f"Testing career: {CODE}")
try:
    with psycopg.connect(DB) as conn:
        dto = _fetch_sections(conn, CODE, "vi")
    print(f"OK - title: {dto['title']}")
    print(f"   tasks: {len(dto['sections']['tasks'])}")
    print(f"   skills: {len(dto['sections']['skills'])}")
    print(f"   wages: {dto['sections']['wages']}")
    print(f"   prep: {dto['sections']['preparation']}")
except Exception as e:
    import traceback; traceback.print_exc()
    print(f"FAILED: {e}")
