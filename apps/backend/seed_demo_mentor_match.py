"""Seed demo: mentee (thien74tb) matching mentor (thien64tb) ~80%"""
import sys, json
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv; load_dotenv('.env')
from sqlalchemy import text
from app.core.db import SessionLocal

MENTEE_ID = 142   # thien74tb@gmail.com
MENTOR_ID = 74    # thien64tb@gmail.com

db = SessionLocal()

# ─── 1. MENTOR PROFILE ───────────────────────────────────────────
print("1. Update Mentor Profile...")
mentor_riasec = json.dumps({"R":0.35,"I":0.92,"A":0.55,"S":0.60,"E":0.50,"C":0.78})
mentor_big5   = json.dumps({"openness":0.88,"conscientiousness":0.82,"extraversion":0.55,"agreeableness":0.72,"neuroticism":0.22})
db.execute(text("""
    UPDATE core.mentor_profiles SET
        full_name                = 'Lê Thanh Thiện (Senior DS)',
        current_position         = 'Senior Data Scientist',
        company                  = 'FPT Software',
        bio                      = 'Hơn 6 năm kinh nghiệm DS/ML. Dẫn dắt nhiều dự án AI tại doanh nghiệp lớn. Đam mê chia sẻ và mentor thế hệ trẻ.',
        expertise_areas          = ARRAY['Python','Machine Learning','Deep Learning','SQL','Data Analysis','Statistics','Problem Solving','Communication','Leadership'],
        experience_years         = 6,
        available_hours_per_week = 4,
        preferred_communication  = ARRAY['chat','video'],
        max_mentees              = 5,
        current_mentees_count    = 1,
        is_active                = true,
        riasec_scores            = CAST(:riasec AS jsonb),
        big_five_scores          = CAST(:big5 AS jsonb),
        updated_at               = NOW()
    WHERE user_id = :uid
"""), {"uid": MENTOR_ID, "riasec": mentor_riasec, "big5": mentor_big5})
print("   OK")

# ─── 2. MENTEE PROFILE ───────────────────────────────────────────
print("2. Update Mentee Profile...")
mentee_riasec   = json.dumps({"R":0.28,"I":0.85,"A":0.50,"S":0.62,"E":0.40,"C":0.70})
mentee_big5     = json.dumps({"openness":0.82,"conscientiousness":0.78,"extraversion":0.50,"agreeableness":0.75,"neuroticism":0.28})
db.execute(text("""
    INSERT INTO core.mentee_profiles
        (user_id, full_name, target_career, current_skills, desired_skills,
         riasec_scores, big_five_scores)
    VALUES
        (:uid, 'Lê Thành Thiên', 'Data Scientist',
         ARRAY['Python','SQL','Excel','Statistics','Basic Machine Learning'],
         ARRAY['Machine Learning','Deep Learning','Data Analysis','Problem Solving','Communication','Leadership'],
         CAST(:riasec AS jsonb), CAST(:big5 AS jsonb))
    ON CONFLICT (user_id) DO UPDATE SET
        full_name       = EXCLUDED.full_name,
        target_career   = EXCLUDED.target_career,
        current_skills  = EXCLUDED.current_skills,
        desired_skills  = EXCLUDED.desired_skills,
        riasec_scores   = EXCLUDED.riasec_scores,
        big_five_scores = EXCLUDED.big_five_scores,
        updated_at      = NOW()
"""), {"uid": MENTEE_ID, "riasec": mentee_riasec, "big5": mentee_big5})
print("   OK")

# ─── 3. ASSESSMENT ───────────────────────────────────────────────
print("3. Seed Assessment (RIASEC + BigFive)...")

# Clean old assessments cho session mới
sess_id = db.execute(text(
    "INSERT INTO core.assessment_sessions (user_id) VALUES (:uid) RETURNING id"
), {"uid": MENTEE_ID}).scalar()

riasec_raw = json.dumps({"R":2.1,"I":4.5,"A":3.2,"S":3.8,"E":2.8,"C":4.0})
proc_riasec = json.dumps({"realistic":0.275,"investigative":0.875,"artistic":0.55,
                           "social":0.70,"enterprising":0.45,"conventional":0.75})
career_recs = json.dumps([
    {"id":"1","title":"Nhà khoa học dữ liệu","match":92},
    {"id":"2","title":"Kỹ sư Machine Learning","match":88},
    {"id":"3","title":"Chuyên viên phân tích dữ liệu","match":85},
])

riasec_id = db.execute(text("""
    INSERT INTO core.assessments
        (user_id, a_type, scores, session_id, test_mode,
         processed_riasec_scores, processed_big_five_scores,
         top_interest, career_recommendations)
    VALUES
        (:uid,'RIASEC', CAST(:scores AS jsonb), :sid,'traditional',
         CAST(:pr AS jsonb), '{}'::jsonb, 'I', CAST(:recs AS jsonb))
    RETURNING id
"""), {"uid":MENTEE_ID, "scores":riasec_raw, "sid":sess_id,
       "pr":proc_riasec, "recs":career_recs}).scalar()

big5_raw  = json.dumps({"O":4.3,"C":4.1,"E":3.0,"A":4.0,"N":2.1})
proc_big5 = json.dumps({"openness":0.825,"conscientiousness":0.775,
                         "extraversion":0.50,"agreeableness":0.75,"neuroticism":0.275})
db.execute(text("""
    INSERT INTO core.assessments
        (user_id, a_type, scores, session_id, test_mode,
         processed_riasec_scores, processed_big_five_scores, top_interest)
    VALUES
        (:uid,'BigFive', CAST(:scores AS jsonb), :sid,'traditional',
         '{}'::jsonb, CAST(:pb AS jsonb), 'O')
"""), {"uid":MENTEE_ID, "scores":big5_raw, "sid":sess_id, "pb":proc_big5})
print(f"   OK (assessment_id={riasec_id})")

# ─── 4. CAREER RECOMMENDATIONS ───────────────────────────────────
print("4. Seed Career Recommendations...")
careers = db.execute(text("""
    SELECT id, slug FROM core.careers
    WHERE slug LIKE '%data-scient%' OR slug LIKE '%software-develop%'
       OR slug LIKE '%database-admin%' OR slug LIKE '%statistician%'
       OR slug LIKE '%computer-system%'
    LIMIT 5
""")).fetchall()

db.execute(text("DELETE FROM core.career_recommendations WHERE user_id=:uid AND assessment_id=:aid"),
           {"uid": MENTEE_ID, "aid": riasec_id})

scores_demo = [92.0, 88.5, 85.2, 82.0, 79.5]
for i, (cid, slug) in enumerate(careers):
    db.execute(text("""
        INSERT INTO core.career_recommendations (user_id, assessment_id, career_id, score, rank)
        VALUES (:uid,:aid,:cid,:score,:rank) ON CONFLICT DO NOTHING
    """), {"uid":MENTEE_ID,"aid":riasec_id,"cid":cid,"score":scores_demo[i],"rank":i+1})
print(f"   OK ({len(careers)} careers)")

# ─── 5. FUSED TRAITS ─────────────────────────────────────────────
print("5. Seed Fused Traits...")
def _pg(v): return "{" + ",".join(f"{x:.4f}" for x in v) + "}"

riasec_vec = [0.275,0.875,0.55,0.70,0.45,0.75]
big5_vec   = [0.825,0.775,0.50,0.75,0.275]

db.execute(text(f"""
    INSERT INTO ai.user_trait_fused
        (user_id,riasec_scores_fused,big5_scores_fused,source_components,model_name,built_at)
    VALUES (:uid,'{_pg(riasec_vec)}'::real[],'{_pg(big5_vec)}'::real[],
            '["test"]'::jsonb,'fusion_v1',NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        riasec_scores_fused=EXCLUDED.riasec_scores_fused,
        big5_scores_fused=EXCLUDED.big5_scores_fused, built_at=NOW()
"""), {"uid": MENTEE_ID})

db.execute(text("UPDATE core.users SET riasec_top_dim='I', big5_profile='O+, C+, E-, A+, N-' WHERE id=:uid"),
           {"uid": MENTEE_ID})
print("   OK")

# ─── 6. MENTORSHIP REQUEST ───────────────────────────────────────
print("6. Seed Mentorship Request (pending)...")
mentor_profile_id = db.execute(text("SELECT id FROM core.mentor_profiles WHERE user_id=:uid"),{"uid":MENTOR_ID}).scalar()
mentee_profile_id = db.execute(text("SELECT id FROM core.mentee_profiles WHERE user_id=:uid"),{"uid":MENTEE_ID}).scalar()

if mentor_profile_id and mentee_profile_id:
    db.execute(text("DELETE FROM core.mentorship_requests WHERE mentee_id=:m AND mentor_id=:t"),
               {"m":mentee_profile_id,"t":mentor_profile_id})
    reasons = json.dumps(["Cùng định hướng Data Science & ML","Kỹ năng Python & ML khớp cao",
                           "Phong cách học tập tương đồng (RIASEC: I/C)","Mentor 6 năm kinh nghiệm thực chiến"])
    db.execute(text("""
        INSERT INTO core.mentorship_requests
            (mentee_id, mentor_id, compatibility_score, matching_reasons, message, status, requested_at)
        VALUES
            (:mid,:tid, 80.5, CAST(:r AS jsonb),
             'Chào anh! Em đang theo đuổi Data Science và muốn được mentor về ML và lộ trình nghề nghiệp. Mong anh hỗ trợ!',
             'pending', NOW())
    """), {"mid":mentee_profile_id,"tid":mentor_profile_id,"r":reasons})
    print(f"   OK (mentee_profile={mentee_profile_id}, mentor_profile={mentor_profile_id})")

# ─── 7. ROADMAP PROGRESS ─────────────────────────────────────────
print("7. Seed Roadmap Progress...")
ds_career = db.execute(text("SELECT id FROM core.careers WHERE slug LIKE '%data-scient%' LIMIT 1")).fetchone()
if ds_career:
    roadmap = db.execute(text("SELECT id FROM core.roadmaps WHERE career_id=:cid LIMIT 1"),{"cid":ds_career[0]}).fetchone()
    if roadmap:
        completed = json.dumps(["1","2","3"])
        db.execute(text("""
            INSERT INTO core.user_progress
                (user_id,career_id,roadmap_id,completed_milestones,progress_percentage)
            VALUES (:uid,:cid,:rid, CAST(:comp AS jsonb), 75)
            ON CONFLICT (user_id,career_id) DO UPDATE SET
                completed_milestones=EXCLUDED.completed_milestones,
                progress_percentage=EXCLUDED.progress_percentage
        """), {"uid":MENTEE_ID,"cid":ds_career[0],"rid":roadmap[0],"comp":completed})
        print(f"   OK (75% progress on Data Scientist roadmap)")
    else: print("   SKIP (no roadmap found)")
else: print("   SKIP (no career found)")

db.commit()
db.close()

print()
print("=" * 58)
print("SEED HOÀN TẤT — DỮ LIỆU DEMO CHO HỘI ĐỒNG")
print("=" * 58)
print(f"Mentee : thien74tb@gmail.com (id={MENTEE_ID})")
print(f"  RIASEC : I=87.5%  C=75%  S=70%  A=55%  E=45%  R=27.5%")
print(f"  BigFive: Openness=82.5%  Conscientiousness=77.5%")
print(f"  Target : Data Scientist")
print(f"  Career : DS 92%  |  ML Eng 88.5%  |  Data Analyst 85.2%")
print()
print(f"Mentor  : thien64tb@gmail.com (id={MENTOR_ID})")
print(f"  Vị trí: Senior Data Scientist @ FPT Software (6 năm KN)")
print(f"  Skills : Python, ML, Deep Learning, SQL, Data Analysis...")
print(f"  RIASEC : I=92%  C=78%  S=60%  A=55%  E=50%  R=35%")
print()
print(f"Compatibility: ~80.5%  |  Request: PENDING")
print(f"→ Mentor login vào accept request để demo full flow")
print("=" * 58)
