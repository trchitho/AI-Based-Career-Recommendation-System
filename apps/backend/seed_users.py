# -*- coding: utf-8 -*-
"""
Seed script: tao 30 user mentee co du lieu day du de test mentor matching.
Chay: python seed_users.py

Moi user se co:
  - User account (email/password)
  - Assessment (RIASEC + Big Five scores)
  - MenteeProfile (target_career, current_skills, desired_skills)
  - UserProgress (hoan thanh 1-3 buoc roadmap, nguon Source2 matching)
"""

import os, sys, random
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.db import engine
from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.assessments.models import Assessment
from app.modules.mentor_matching.models import MenteeProfile
from app.modules.roadmap.models import UserProgress

# ── Careers co roadmap trong DB ──────────────────────────────────────────────
CAREERS_WITH_ROADMAP = [
    {"career_id": 327,  "slug": "25-2012-00", "title": "Kindergarten Teachers, Except Special Education",
     "roadmap_id": 925, "keywords": ["Teaching", "Education", "Child Development", "Curriculum", "Classroom Management"]},
    {"career_id": 238,  "slug": "19-3039-02", "title": "Neuropsychologists",
     "roadmap_id": 926, "keywords": ["Psychology", "Research", "Data Analysis", "Statistics", "Clinical Assessment"]},
    {"career_id": 137,  "slug": "15-2021-00", "title": "Mathematicians",
     "roadmap_id": 927, "keywords": ["Mathematics", "Statistics", "Python", "Research", "Algorithms"]},
    {"career_id": 462,  "slug": "29-2031-00", "title": "Cardiovascular Technologists and Technicians",
     "roadmap_id": 929, "keywords": ["Healthcare", "Medical Imaging", "Patient Care", "Biology", "Equipment Operation"]},
    {"career_id": 955,  "slug": "53-7071-00", "title": "Gas Compressor and Gas Pumping Station Operators",
     "roadmap_id": 924, "keywords": ["Engineering", "Safety", "Mechanical Systems", "Operations", "Maintenance"]},
    {"career_id": 959,  "slug": "53-7121-00", "title": "Tank Car Truck and Ship Loaders",
     "roadmap_id": 928, "keywords": ["Logistics", "Safety", "Operations", "Equipment", "Quality Control"]},
]

# ── Pool ky nang theo nganh ───────────────────────────────────────────────────
SKILL_POOL = {
    "tech":      ["Python", "JavaScript", "React", "SQL", "Docker", "AWS", "Git", "Node.js", "TypeScript", "MongoDB"],
    "data":      ["Python", "Machine Learning", "SQL", "TensorFlow", "Pandas", "Statistics", "Tableau", "Data Analysis", "R", "Excel"],
    "design":    ["Figma", "UX Research", "Prototyping", "Adobe XD", "CSS", "User Testing", "Design System", "Sketch"],
    "business":  ["Excel", "PowerPoint", "Project Management", "Agile", "Communication", "Leadership", "Marketing", "Finance"],
    "education": ["Teaching", "Curriculum Design", "Microsoft Office", "Child Development", "Assessment Design", "Learning Management"],
    "health":    ["Patient Care", "Medical Terminology", "Biology", "Clinical Assessment", "Data Entry", "HIPAA Compliance"],
    "math":      ["Mathematics", "Statistics", "Python", "R", "MATLAB", "Algorithms", "Research", "LaTeX"],
    "engineering":["AutoCAD", "Safety Procedures", "Mechanical Systems", "Operations", "Quality Control", "Maintenance", "Engineering"],
}

# ── 30 user profiles ──────────────────────────────────────────────────────────
USERS = [
    # ── Nganh Giao duc ──────────────────────────────────
    {"email": "user_edu01@test.com", "full_name": "Nguyen Thi Thu Ha",
     "target_career": "Kindergarten Teachers, Except Special Education",
     "current": ["Microsoft Office", "Communication", "Child Development"],
     "desired":  ["Curriculum Design", "Classroom Management", "Assessment Design", "Teaching"],
     "riasec": {"S": 4.8, "A": 4.2, "E": 3.5, "I": 2.8, "R": 2.0, "C": 3.1},
     "big5":   {"openness": 4.3, "conscientiousness": 4.5, "extraversion": 4.0, "agreeableness": 4.7, "neuroticism": 2.8}},

    {"email": "user_edu02@test.com", "full_name": "Pham Thi Lan Phuong",
     "target_career": "Kindergarten Teachers, Except Special Education",
     "current": ["Teaching", "Child Development", "Communication"],
     "desired":  ["Learning Management Systems", "Curriculum Design", "Educational Psychology", "Microsoft Office"],
     "riasec": {"S": 4.6, "A": 3.8, "E": 4.0, "I": 3.2, "R": 2.5, "C": 3.4},
     "big5":   {"openness": 4.0, "conscientiousness": 4.3, "extraversion": 4.2, "agreeableness": 4.5, "neuroticism": 3.0}},

    {"email": "user_edu03@test.com", "full_name": "Tran Van Duc Anh",
     "target_career": "Kindergarten Teachers, Except Special Education",
     "current": ["Communication", "Leadership", "Microsoft Office"],
     "desired":  ["Child Development", "Teaching", "Curriculum Design", "Classroom Management"],
     "riasec": {"S": 4.4, "E": 4.1, "A": 3.5, "I": 2.9, "C": 3.0, "R": 2.2},
     "big5":   {"openness": 3.8, "conscientiousness": 4.1, "extraversion": 4.4, "agreeableness": 4.3, "neuroticism": 2.6}},

    {"email": "user_edu04@test.com", "full_name": "Le Thi Bich Ngoc",
     "target_career": "Kindergarten Teachers, Except Special Education",
     "current": ["Assessment Design", "Communication", "Microsoft Office"],
     "desired":  ["Teaching", "Child Development", "Curriculum Design"],
     "riasec": {"S": 4.9, "A": 4.0, "C": 3.3, "E": 3.2, "I": 2.7, "R": 2.1},
     "big5":   {"openness": 4.1, "conscientiousness": 4.6, "extraversion": 3.7, "agreeableness": 4.8, "neuroticism": 2.5}},

    {"email": "user_edu05@test.com", "full_name": "Ho Thi Thanh Van",
     "target_career": "Kindergarten Teachers, Except Special Education",
     "current": ["Child Development", "Teaching"],
     "desired":  ["Learning Management Systems", "Classroom Management", "Assessment Design", "Curriculum Design"],
     "riasec": {"S": 4.7, "A": 4.3, "E": 3.8, "I": 3.0, "C": 3.5, "R": 2.3},
     "big5":   {"openness": 4.4, "conscientiousness": 4.2, "extraversion": 3.9, "agreeableness": 4.6, "neuroticism": 2.9}},

    # ── Tam ly hoc / Neuropsychology ────────────────────
    {"email": "user_psych01@test.com", "full_name": "Vo Minh Tuan Kiet",
     "target_career": "Neuropsychologists",
     "current": ["Research", "Statistics", "Data Analysis"],
     "desired":  ["Clinical Assessment", "Psychology", "Python", "Neuroscience", "SPSS"],
     "riasec": {"I": 4.7, "S": 3.8, "A": 3.5, "C": 3.2, "R": 3.0, "E": 2.5},
     "big5":   {"openness": 4.6, "conscientiousness": 4.4, "extraversion": 2.9, "agreeableness": 3.7, "neuroticism": 3.2}},

    {"email": "user_psych02@test.com", "full_name": "Dang Thi Kim Ngan",
     "target_career": "Neuropsychologists",
     "current": ["Psychology", "Communication", "Research"],
     "desired":  ["Clinical Assessment", "Statistics", "Data Analysis", "Neuroscience"],
     "riasec": {"I": 4.5, "S": 4.2, "A": 3.8, "C": 3.5, "R": 2.8, "E": 3.0},
     "big5":   {"openness": 4.5, "conscientiousness": 4.2, "extraversion": 3.1, "agreeableness": 4.0, "neuroticism": 3.0}},

    {"email": "user_psych03@test.com", "full_name": "Nguyen Phuoc Thinh",
     "target_career": "Neuropsychologists",
     "current": ["Statistics", "SPSS", "Excel"],
     "desired":  ["Psychology", "Clinical Assessment", "Research", "Data Analysis", "Python"],
     "riasec": {"I": 4.8, "C": 4.0, "R": 3.5, "S": 3.2, "A": 2.8, "E": 2.5},
     "big5":   {"openness": 4.3, "conscientiousness": 4.7, "extraversion": 2.6, "agreeableness": 3.5, "neuroticism": 3.5}},

    # ── Toan hoc ────────────────────────────────────────
    {"email": "user_math01@test.com", "full_name": "Bui Xuan Truong",
     "target_career": "Mathematicians",
     "current": ["Mathematics", "Python", "Statistics"],
     "desired":  ["R", "MATLAB", "Algorithms", "Machine Learning", "Research"],
     "riasec": {"I": 4.9, "R": 4.2, "C": 4.0, "A": 2.5, "S": 2.8, "E": 2.3},
     "big5":   {"openness": 4.7, "conscientiousness": 4.5, "extraversion": 2.5, "agreeableness": 3.3, "neuroticism": 3.1}},

    {"email": "user_math02@test.com", "full_name": "Ly Thanh Phong",
     "target_career": "Mathematicians",
     "current": ["Mathematics", "LaTeX", "Research"],
     "desired":  ["Statistics", "Python", "R", "MATLAB", "Algorithms"],
     "riasec": {"I": 4.8, "C": 4.1, "R": 3.8, "A": 2.7, "S": 2.5, "E": 2.0},
     "big5":   {"openness": 4.5, "conscientiousness": 4.6, "extraversion": 2.3, "agreeableness": 3.1, "neuroticism": 3.3}},

    {"email": "user_math03@test.com", "full_name": "Tran Thi Khanh Linh",
     "target_career": "Mathematicians",
     "current": ["Statistics", "Python", "Excel"],
     "desired":  ["Mathematics", "MATLAB", "Algorithms", "R", "LaTeX"],
     "riasec": {"I": 4.6, "R": 4.0, "C": 3.8, "E": 2.8, "S": 3.0, "A": 2.9},
     "big5":   {"openness": 4.4, "conscientiousness": 4.3, "extraversion": 2.8, "agreeableness": 3.4, "neuroticism": 2.9}},

    # ── Y te / Cardiovascular ────────────────────────────
    {"email": "user_health01@test.com", "full_name": "Nguyen Thi Huong Giang",
     "target_career": "Cardiovascular Technologists and Technicians",
     "current": ["Patient Care", "Biology", "Communication"],
     "desired":  ["Medical Imaging", "Clinical Assessment", "HIPAA Compliance", "Equipment Operation", "Data Entry"],
     "riasec": {"R": 3.8, "S": 4.5, "I": 3.5, "C": 3.8, "A": 2.5, "E": 3.0},
     "big5":   {"openness": 3.5, "conscientiousness": 4.5, "extraversion": 3.2, "agreeableness": 4.4, "neuroticism": 2.7}},

    {"email": "user_health02@test.com", "full_name": "Phan Van Minh Duc",
     "target_career": "Cardiovascular Technologists and Technicians",
     "current": ["Biology", "Data Entry", "Microsoft Office"],
     "desired":  ["Patient Care", "Medical Imaging", "Equipment Operation", "Clinical Assessment"],
     "riasec": {"R": 4.0, "I": 3.8, "S": 4.2, "C": 3.5, "A": 2.3, "E": 2.8},
     "big5":   {"openness": 3.7, "conscientiousness": 4.4, "extraversion": 2.9, "agreeableness": 4.2, "neuroticism": 2.8}},

    {"email": "user_health03@test.com", "full_name": "Vo Thi Bich Hang",
     "target_career": "Cardiovascular Technologists and Technicians",
     "current": ["Patient Care", "Medical Terminology"],
     "desired":  ["Medical Imaging", "Clinical Assessment", "Equipment Operation", "HIPAA Compliance"],
     "riasec": {"S": 4.6, "R": 3.7, "C": 3.9, "I": 3.4, "E": 2.9, "A": 2.6},
     "big5":   {"openness": 3.6, "conscientiousness": 4.6, "extraversion": 3.0, "agreeableness": 4.5, "neuroticism": 2.6}},

    # ── Ky thuat / Engineering ────────────────────────────
    {"email": "user_eng01@test.com", "full_name": "Duong Quoc Hung",
     "target_career": "Gas Compressor and Gas Pumping Station Operators",
     "current": ["Safety Procedures", "Operations", "Mechanical Systems"],
     "desired":  ["Quality Control", "Maintenance", "Engineering", "Equipment Operation", "AutoCAD"],
     "riasec": {"R": 4.5, "C": 4.0, "I": 3.3, "E": 2.8, "S": 3.0, "A": 2.1},
     "big5":   {"openness": 3.2, "conscientiousness": 4.6, "extraversion": 2.8, "agreeableness": 3.5, "neuroticism": 2.4}},

    {"email": "user_eng02@test.com", "full_name": "Le Van Thanh Tung",
     "target_career": "Gas Compressor and Gas Pumping Station Operators",
     "current": ["Maintenance", "Safety Procedures"],
     "desired":  ["Engineering", "Mechanical Systems", "Operations", "Quality Control", "AutoCAD"],
     "riasec": {"R": 4.7, "I": 3.5, "C": 3.8, "E": 2.5, "S": 2.9, "A": 2.0},
     "big5":   {"openness": 3.1, "conscientiousness": 4.7, "extraversion": 2.5, "agreeableness": 3.3, "neuroticism": 2.5}},

    # ── Logistics ─────────────────────────────────────────
    {"email": "user_log01@test.com", "full_name": "Ngo Thi Phuong Mai",
     "target_career": "Tank Car Truck and Ship Loaders",
     "current": ["Safety Procedures", "Operations", "Quality Control"],
     "desired":  ["Logistics", "Equipment Operation", "Maintenance", "Engineering"],
     "riasec": {"R": 4.3, "C": 4.1, "E": 3.2, "S": 3.0, "I": 2.8, "A": 2.2},
     "big5":   {"openness": 3.0, "conscientiousness": 4.5, "extraversion": 3.1, "agreeableness": 3.7, "neuroticism": 2.6}},

    {"email": "user_log02@test.com", "full_name": "Truong Minh Khoa",
     "target_career": "Tank Car Truck and Ship Loaders",
     "current": ["Equipment Operation", "Safety Procedures"],
     "desired":  ["Logistics", "Operations", "Quality Control", "Maintenance"],
     "riasec": {"R": 4.5, "C": 3.9, "I": 2.9, "S": 2.7, "E": 3.1, "A": 2.0},
     "big5":   {"openness": 2.9, "conscientiousness": 4.4, "extraversion": 2.9, "agreeableness": 3.5, "neuroticism": 2.7}},

    # ── CNTT / Software ───────────────────────────────────
    {"email": "user_sw01@test.com", "full_name": "Hoang Duc Manh",
     "target_career": "Software Developer",
     "current": ["Python", "Git", "SQL"],
     "desired":  ["React", "Node.js", "Docker", "AWS", "TypeScript"],
     "riasec": {"I": 4.5, "R": 4.0, "C": 3.5, "E": 2.8, "A": 2.5, "S": 2.9},
     "big5":   {"openness": 4.2, "conscientiousness": 4.3, "extraversion": 2.7, "agreeableness": 3.4, "neuroticism": 3.0}},

    {"email": "user_sw02@test.com", "full_name": "Nguyen Khanh Vy",
     "target_career": "Software Developer",
     "current": ["JavaScript", "HTML", "CSS"],
     "desired":  ["React", "TypeScript", "Node.js", "SQL", "Git"],
     "riasec": {"I": 4.3, "R": 3.8, "C": 3.7, "A": 3.0, "S": 3.2, "E": 2.6},
     "big5":   {"openness": 4.0, "conscientiousness": 4.1, "extraversion": 2.9, "agreeableness": 3.7, "neuroticism": 2.8}},

    {"email": "user_sw03@test.com", "full_name": "Dinh Xuan Nam",
     "target_career": "Software Developer",
     "current": ["Python", "SQL", "Excel"],
     "desired":  ["Machine Learning", "Docker", "AWS", "React", "REST API"],
     "riasec": {"I": 4.6, "R": 4.2, "C": 3.8, "E": 2.5, "S": 2.6, "A": 2.4},
     "big5":   {"openness": 4.4, "conscientiousness": 4.5, "extraversion": 2.4, "agreeableness": 3.2, "neuroticism": 3.1}},

    # ── Data Science ──────────────────────────────────────
    {"email": "user_ds01@test.com", "full_name": "Pham Bao Chau",
     "target_career": "Data Scientist",
     "current": ["Python", "SQL", "Excel", "Statistics"],
     "desired":  ["Machine Learning", "TensorFlow", "Tableau", "Data Analysis", "Deep Learning"],
     "riasec": {"I": 4.7, "R": 3.8, "C": 4.1, "A": 2.7, "S": 2.9, "E": 2.4},
     "big5":   {"openness": 4.5, "conscientiousness": 4.4, "extraversion": 2.6, "agreeableness": 3.3, "neuroticism": 3.0}},

    {"email": "user_ds02@test.com", "full_name": "Vuong Thi Thanh Thuy",
     "target_career": "Data Scientist",
     "current": ["Statistics", "R", "Excel"],
     "desired":  ["Python", "Machine Learning", "SQL", "Tableau", "TensorFlow"],
     "riasec": {"I": 4.5, "C": 4.2, "R": 3.5, "A": 2.8, "S": 3.1, "E": 2.2},
     "big5":   {"openness": 4.3, "conscientiousness": 4.6, "extraversion": 2.4, "agreeableness": 3.5, "neuroticism": 2.9}},

    # ── UX/UI Design ──────────────────────────────────────
    {"email": "user_ux01@test.com", "full_name": "Cao Thi Thu Trang",
     "target_career": "UX Designer",
     "current": ["Figma", "CSS", "Communication"],
     "desired":  ["UX Research", "Prototyping", "User Testing", "Design System", "Adobe XD"],
     "riasec": {"A": 4.6, "S": 4.0, "I": 3.3, "E": 3.5, "C": 2.8, "R": 2.2},
     "big5":   {"openness": 4.7, "conscientiousness": 3.9, "extraversion": 3.8, "agreeableness": 4.1, "neuroticism": 2.9}},

    {"email": "user_ux02@test.com", "full_name": "Ly Hoang Bao Long",
     "target_career": "UX Designer",
     "current": ["Adobe XD", "Communication", "Excel"],
     "desired":  ["Figma", "UX Research", "Prototyping", "User Testing", "Design System"],
     "riasec": {"A": 4.4, "S": 3.8, "I": 3.5, "E": 3.7, "C": 2.9, "R": 2.3},
     "big5":   {"openness": 4.6, "conscientiousness": 3.7, "extraversion": 4.0, "agreeableness": 4.0, "neuroticism": 2.7}},

    # ── Marketing ─────────────────────────────────────────
    {"email": "user_mkt01@test.com", "full_name": "Le Thi Quynh Anh",
     "target_career": "Digital Marketing Manager",
     "current": ["Content Marketing", "Excel", "Communication"],
     "desired":  ["SEO", "Google Ads", "Facebook Ads", "Analytics", "Email Marketing"],
     "riasec": {"E": 4.5, "A": 4.1, "S": 3.8, "C": 3.2, "I": 2.9, "R": 2.0},
     "big5":   {"openness": 4.2, "conscientiousness": 4.0, "extraversion": 4.5, "agreeableness": 4.0, "neuroticism": 2.8}},

    {"email": "user_mkt02@test.com", "full_name": "Nguyen Thanh Dat",
     "target_career": "Digital Marketing Manager",
     "current": ["Facebook Ads", "Content Marketing"],
     "desired":  ["SEO", "Google Ads", "Analytics", "Email Marketing", "Brand Strategy"],
     "riasec": {"E": 4.6, "S": 3.9, "A": 3.7, "C": 3.0, "I": 2.7, "R": 2.1},
     "big5":   {"openness": 4.0, "conscientiousness": 3.9, "extraversion": 4.6, "agreeableness": 3.8, "neuroticism": 3.0}},

    # ── Product Management ────────────────────────────────
    {"email": "user_pm01@test.com", "full_name": "Trinh Thi Ngoc Han",
     "target_career": "Product Manager",
     "current": ["Communication", "Excel", "SQL"],
     "desired":  ["Product Management", "Agile", "Scrum", "A/B Testing", "User Research"],
     "riasec": {"E": 4.3, "I": 3.8, "S": 3.7, "C": 3.5, "A": 3.2, "R": 2.5},
     "big5":   {"openness": 4.1, "conscientiousness": 4.3, "extraversion": 4.2, "agreeableness": 3.9, "neuroticism": 2.7}},

    {"email": "user_pm02@test.com", "full_name": "Huynh Van Khai",
     "target_career": "Product Manager",
     "current": ["Agile", "Communication", "SQL"],
     "desired":  ["Product Management", "Scrum", "A/B Testing", "Roadmap Planning", "Stakeholder Management"],
     "riasec": {"E": 4.5, "I": 3.6, "S": 3.9, "C": 3.4, "A": 3.1, "R": 2.4},
     "big5":   {"openness": 4.0, "conscientiousness": 4.4, "extraversion": 4.3, "agreeableness": 3.7, "neuroticism": 2.6}},

    # ── DevOps ────────────────────────────────────────────
    {"email": "user_devops01@test.com", "full_name": "Thai Duc Trung",
     "target_career": "DevOps Engineer",
     "current": ["Linux", "Git", "Python"],
     "desired":  ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
     "riasec": {"R": 4.4, "I": 4.2, "C": 3.9, "E": 2.5, "S": 2.7, "A": 2.1},
     "big5":   {"openness": 4.0, "conscientiousness": 4.5, "extraversion": 2.5, "agreeableness": 3.3, "neuroticism": 2.6}},

    # ── HR ───────────────────────────────────────────────
    {"email": "user_hr01@test.com", "full_name": "Dong Thi Bao Ngoc",
     "target_career": "HR Business Partner",
     "current": ["Communication", "Excel", "Microsoft Office"],
     "desired":  ["Recruitment", "Talent Development", "HRIS", "Performance Management", "Labor Law"],
     "riasec": {"S": 4.6, "E": 4.0, "C": 3.7, "A": 4.2, "I": 2.8, "R": 2.0},
     "big5":   {"openness": 3.8, "conscientiousness": 4.2, "extraversion": 4.1, "agreeableness": 4.5, "neuroticism": 2.9}},
]


def get_milestones_for_roadmap(db, roadmap_id: int):
    """Lay danh sach order_no cua milestones trong roadmap."""
    rows = db.execute(
        text("SELECT order_no FROM core.roadmap_milestones WHERE roadmap_id = :rid ORDER BY order_no"),
        {"rid": roadmap_id}
    ).fetchall()
    return [r[0] for r in rows]


def seed():
    with Session(engine) as db:
        created_users = 0
        created_mentees = 0
        created_progress = 0
        skipped = 0

        # Build map: career title -> career info
        career_map = {c["title"].lower(): c for c in CAREERS_WITH_ROADMAP}

        for u in USERS:
            # 1. Create user
            user = db.query(User).filter(User.email == u["email"]).first()
            if not user:
                user = User(
                    email=u["email"],
                    password_hash=hash_password("Test@123456"),
                    full_name=u["full_name"],
                )
                db.add(user)
                db.flush()
                created_users += 1
                print(f"[+] User: {u['email']} (id={user.id})")
            else:
                print(f"[=] User exists: {u['email']} (id={user.id})")

            # 2. Create Assessment with RIASEC + Big Five
            existing_assess = db.query(Assessment).filter(
                Assessment.user_id == user.id,
                Assessment.a_type == "RIASEC"
            ).first()
            if not existing_assess:
                assess = Assessment(
                    user_id=user.id,
                    a_type="RIASEC",
                    scores=u["riasec"],
                    processed_riasec_scores=u["riasec"],
                    processed_big_five_scores=u["big5"],
                    top_interest=max(u["riasec"], key=u["riasec"].get),
                    career_recommendations=[{
                        "title_en": u["target_career"],
                        "career_title": u["target_career"],
                        "score": round(random.uniform(0.65, 0.95), 2),
                    }],
                )
                db.add(assess)
                db.flush()

            # 3. Create MenteeProfile
            mentee = db.query(MenteeProfile).filter(MenteeProfile.user_id == user.id).first()
            if not mentee:
                mentee = MenteeProfile(
                    user_id=user.id,
                    full_name=u["full_name"],
                    target_career=u["target_career"],
                    current_skills=u["current"],
                    desired_skills=u["desired"],
                    learning_style=random.choice(["flexible", "structured", "project-based"]),
                    preferred_mentor_experience=random.choice(["junior", "senior", "executive"]),
                    riasec_scores=u["riasec"],
                    big_five_scores=u["big5"],
                )
                db.add(mentee)
                created_mentees += 1

            # 4. Create UserProgress for careers that have roadmaps
            target_lower = u["target_career"].lower()
            matched_career = career_map.get(target_lower)
            if matched_career:
                existing_prog = db.query(UserProgress).filter(
                    UserProgress.user_id == user.id,
                    UserProgress.career_id == matched_career["career_id"],
                ).first()
                if not existing_prog:
                    milestones = get_milestones_for_roadmap(db, matched_career["roadmap_id"])
                    if milestones:
                        # Hoan thanh ngau nhien 1-3 buoc dau
                        n_complete = random.randint(1, min(3, len(milestones)))
                        completed = [str(m) for m in milestones[:n_complete]]
                        pct = round(n_complete / len(milestones) * 100, 1)
                        prog = UserProgress(
                            user_id=user.id,
                            career_id=matched_career["career_id"],
                            roadmap_id=matched_career["roadmap_id"],
                            completed_milestones=completed,
                            milestone_completions={str(m): "completed" for m in milestones[:n_complete]},
                            progress_percentage=str(pct),
                        )
                        db.add(prog)
                        created_progress += 1
                        print(f"    -> Progress: {n_complete}/{len(milestones)} steps ({pct}%) for {matched_career['title'][:40]}")

        db.commit()
        print(f"\nDone!")
        print(f"  Created users     : {created_users}")
        print(f"  Created mentees   : {created_mentees}")
        print(f"  Created progress  : {created_progress}")
        print(f"  Skipped (existed) : {skipped}")
        print(f"  Login password    : Test@123456")


if __name__ == "__main__":
    print("Seeding test users for mentor matching...\n")
    seed()
