import sys; sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv('.env')
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.mentor_matching.models import MentorProfile, MenteeProfile

db = SessionLocal()
user = db.query(User).filter(User.id == 74).first()
if user:
    print(f"User 74: full_name={user.full_name!r}, email={user.email}")

mp = db.query(MentorProfile).filter(MentorProfile.user_id == 74).first()
if mp:
    print(f"MentorProfile: full_name={mp.full_name!r}, position={mp.current_position!r}")

mentee = db.query(MenteeProfile).filter(MenteeProfile.user_id == 74).first()
if mentee:
    print(f"MenteeProfile: full_name={mentee.full_name!r}, target={mentee.target_career!r}")

# Also check what sessions exist for user 74
from app.modules.chat.schedule_models import MentorSession
from sqlalchemy import or_
sessions = db.query(MentorSession).filter(
    or_(MentorSession.mentor_id == 74, MentorSession.mentee_id == 74)
).all()
print(f"\nSessions for user 74: {len(sessions)}")
for s in sessions[:5]:
    print(f"  id={s.id} mentor={s.mentor_id} mentee={s.mentee_id} status={s.status}")
db.close()
