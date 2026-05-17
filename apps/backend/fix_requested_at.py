import sys; sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv('.env')
from sqlalchemy import text
from app.core.db import SessionLocal
db = SessionLocal()
db.execute(text("UPDATE core.mentorship_requests SET requested_at = NOW() WHERE requested_at IS NULL"))
db.commit()
db.close()
print("OK")
