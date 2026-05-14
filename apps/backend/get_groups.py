import os; from dotenv import load_dotenv; load_dotenv('.env')
from app.core.db import engine
from sqlalchemy import text
with engine.connect() as c:
    rows = c.execute(text('SELECT id, name, slug FROM core.career_groups ORDER BY id')).fetchall()
    for r in rows:
        print(f"{r[0]}|{r[2]}")
