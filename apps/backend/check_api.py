import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env')

from app.core.db import SessionLocal
from app.modules.interview.services import InterviewService

db = SessionLocal()
try:
    svc = InterviewService(db)
    result = svc.get_user_interviews(user_id=74, limit=5, offset=0)
    print("SUCCESS:", result)
except Exception as e:
    import traceback
    print("ERROR:", e)
    traceback.print_exc()
finally:
    db.close()
