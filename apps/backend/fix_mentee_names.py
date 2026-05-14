"""Sync full_name from User -> MenteeProfile where MenteeProfile.full_name is empty."""
import sys; sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv('.env')
from app.core.db import SessionLocal
from app.modules.mentor_matching.models import MenteeProfile
from app.modules.auth.models import User

db = SessionLocal()
updated = 0
try:
    mentees = db.query(MenteeProfile).all()
    for m in mentees:
        user = db.query(User).filter(User.id == m.user_id).first()
        if not user:
            continue
        # If MenteeProfile has no full_name, populate from User
        if not m.full_name:
            name = user.full_name or (user.email.split('@')[0] if user.email else f"User{m.user_id}")
            m.full_name = name
            updated += 1
    db.commit()
    print(f"Updated {updated} mentee profiles with full_name")

    # Also check MentorProfile
    from app.modules.mentor_matching.models import MentorProfile
    mentors = db.query(MentorProfile).filter(MentorProfile.full_name == None).all()
    for mp in mentors:
        user = db.query(User).filter(User.id == mp.user_id).first()
        if user and user.full_name:
            mp.full_name = user.full_name
            updated += 1
    db.commit()
    print(f"Total updated: {updated}")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
