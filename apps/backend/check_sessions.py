import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env')

from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Sessions per user
    rows = conn.execute(text(
        "SELECT s.user_id, u.email, s.status, s.interview_mode, COUNT(*) as cnt "
        "FROM interview.interview_sessions s "
        "LEFT JOIN core.users u ON u.id = s.user_id "
        "GROUP BY s.user_id, u.email, s.status, s.interview_mode "
        "ORDER BY s.user_id, s.status"
    )).fetchall()
    print("=== Sessions per user ===")
    for r in rows:
        email = (r[1] or "")[:30]
        print(f"  user_id={r[0]}  email={email:30}  status={str(r[2]):12}  mode={str(r[3]):6}  count={r[4]}")

    # Recent sessions (ascii-safe)
    recent = conn.execute(text(
        "SELECT id, user_id, status, interview_mode, question_count, overall_score, "
        "to_char(started_at, 'YYYY-MM-DD HH24:MI') as started "
        "FROM interview.interview_sessions "
        "ORDER BY started_at DESC LIMIT 10"
    )).fetchall()
    print("\n=== Last 10 sessions ===")
    for r in recent:
        print(f"  id={r[0]:4}  user={r[1]}  status={str(r[2]):12}  mode={str(r[3]):6}  q={r[4]}  score={r[5]}  at={r[6]}")
