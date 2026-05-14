
from sqlalchemy import text
from app.core.db import SessionLocal

def check_all_tables():
    db = SessionLocal()
    tables = [
        ('core', 'careers'),
        ('core', 'career_ksas'),
        ('core', 'essay_prompts'),
        ('core', 'career_tasks'),
        ('core', 'career_overview')
    ]
    for schema, table in tables:
        try:
            result = db.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}'"))
            columns = [row[0] for row in result]
            print(f"Table {schema}.{table}: {columns}")
        except Exception as e:
            print(f"Error {table}: {e}")
    db.close()

if __name__ == "__main__":
    check_all_tables()
