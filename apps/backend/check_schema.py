from app.core.db import get_db
from sqlalchemy import text
db = next(get_db())

# Check actual column name in voice_performance_metrics
result = db.execute(text("""
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='interview' AND table_name='voice_performance_metrics'
    ORDER BY ordinal_position
"""))
print("voice_performance_metrics columns:")
for row in result.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Check interview_sessions has chk_voice_type constraint
result2 = db.execute(text("""
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema='interview' AND table_name='interview_sessions'
    AND constraint_type='CHECK'
"""))
print("\ninterview_sessions CHECK constraints:")
for row in result2.fetchall():
    print(f"  {row[0]}")

db.close()
