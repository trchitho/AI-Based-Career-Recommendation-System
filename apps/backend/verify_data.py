"""
Verify data in gamification tables
"""
import sys
sys.path.append('.')

from app.core.db import SessionLocal
from app.modules.assessments.gamification_models import AssessmentGamificationSession

db = SessionLocal()

print("=" * 60)
print("VERIFYING DATA IN DATABASE")
print("=" * 60)

# Query all records
sessions = db.query(AssessmentGamificationSession).all()

print(f"\nTotal records in assessment_gamification_sessions: {len(sessions)}")

for session in sessions:
    print(f"\n--- Record ID: {session.id} ---")
    print(f"User ID: {session.user_id}")
    print(f"Assessment Session ID: {session.assessment_session_id}")
    print(f"Quiz Mode: {session.quiz_mode}")
    print(f"XP Earned: {session.xp_earned}")
    print(f"Questions Answered: {session.questions_answered}")
    print(f"Started At: {session.started_at}")
    print(f"Completed At: {session.completed_at}")
    print(f"Extra Data: {session.extra_data}")

db.close()

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
