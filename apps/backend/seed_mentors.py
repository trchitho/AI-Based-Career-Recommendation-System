"""
Seed script: tạo mentor profiles giả thực tế để test mentor matching.
Chạy: python seed_mentors.py

Script sẽ:
  1. Tạo user accounts (email/password) nếu chưa tồn tại
  2. Tạo MentorProfile tương ứng với kỹ năng đa dạng
"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.orm import Session

from app.core.db import engine
from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.mentor_matching.models import MentorProfile

MENTORS = [
    {
        "email": "mentor_software@demo.com",
        "full_name": "Nguyễn Minh Khoa",
        "current_position": "Senior Software Engineer",
        "company": "FPT Software",
        "bio": "7 năm kinh nghiệm phát triển phần mềm full-stack. Chuyên về React, Node.js và kiến trúc microservices.",
        "expertise_areas": ["Python", "React", "Node.js", "PostgreSQL", "Docker", "AWS", "REST API", "Microservices"],
        "experience_years": 7,
        "available_hours_per_week": 4,
        "max_mentees": 5,
        "riasec_scores": {"I": 4.2, "E": 3.5, "C": 3.0},
        "big_five_scores": {"openness": 4.0, "conscientiousness": 4.2, "extraversion": 3.3},
    },
    {
        "email": "mentor_data@demo.com",
        "full_name": "Trần Thị Lan Anh",
        "current_position": "Data Scientist",
        "company": "VNG Corporation",
        "bio": "5 năm làm Data Science tại các công ty công nghệ lớn. Chuyên sâu về Machine Learning và phân tích dữ liệu lớn.",
        "expertise_areas": ["Python", "Machine Learning", "TensorFlow", "SQL", "Tableau", "Statistics", "Data Analysis", "Deep Learning"],
        "experience_years": 5,
        "available_hours_per_week": 3,
        "max_mentees": 4,
        "riasec_scores": {"I": 4.8, "R": 3.5, "C": 3.8},
        "big_five_scores": {"openness": 4.5, "conscientiousness": 4.6, "extraversion": 2.8},
    },
    {
        "email": "mentor_ux@demo.com",
        "full_name": "Phạm Hoàng Bảo",
        "current_position": "UX/UI Design Lead",
        "company": "Tiki",
        "bio": "Lead Designer tại Tiki với 6 năm kinh nghiệm. Passion cho user research và design thinking.",
        "expertise_areas": ["Figma", "UX Research", "Prototyping", "User Testing", "Design System", "Adobe XD", "CSS", "Product Design"],
        "experience_years": 6,
        "available_hours_per_week": 5,
        "max_mentees": 5,
        "riasec_scores": {"A": 4.5, "S": 3.8, "I": 3.2},
        "big_five_scores": {"openness": 4.7, "extraversion": 4.0, "agreeableness": 4.2},
    },
    {
        "email": "mentor_pm@demo.com",
        "full_name": "Lê Thành Long",
        "current_position": "Product Manager",
        "company": "Shopee Vietnam",
        "bio": "PM tại Shopee, trước đó từng là kỹ sư phần mềm 3 năm. Hiểu sâu cả technical lẫn business side.",
        "expertise_areas": ["Product Management", "Agile", "Scrum", "SQL", "User Research", "A/B Testing", "Roadmap Planning", "Stakeholder Management"],
        "experience_years": 8,
        "available_hours_per_week": 3,
        "max_mentees": 3,
        "riasec_scores": {"E": 4.5, "I": 3.8, "S": 3.5},
        "big_five_scores": {"extraversion": 4.3, "openness": 4.0, "conscientiousness": 4.4},
    },
    {
        "email": "mentor_devops@demo.com",
        "full_name": "Võ Quốc Hùng",
        "current_position": "DevOps Engineer",
        "company": "Grab Vietnam",
        "bio": "4 năm kinh nghiệm DevOps tại scale lớn. Chuyên về CI/CD, Kubernetes và cloud infrastructure.",
        "expertise_areas": ["Kubernetes", "Docker", "AWS", "CI/CD", "Terraform", "Linux", "Jenkins", "Monitoring"],
        "experience_years": 4,
        "available_hours_per_week": 4,
        "max_mentees": 5,
        "riasec_scores": {"R": 4.0, "I": 4.2, "C": 3.8},
        "big_five_scores": {"conscientiousness": 4.5, "openness": 3.8, "neuroticism": 2.5},
    },
    {
        "email": "mentor_marketing@demo.com",
        "full_name": "Đỗ Thị Hương Giang",
        "current_position": "Digital Marketing Manager",
        "company": "Vinamilk",
        "bio": "9 năm trong ngành marketing. Chuyên về Digital Marketing, SEO/SEM và brand strategy.",
        "expertise_areas": ["Digital Marketing", "SEO", "Google Ads", "Facebook Ads", "Content Marketing", "Analytics", "Email Marketing", "Brand Strategy"],
        "experience_years": 9,
        "available_hours_per_week": 5,
        "max_mentees": 6,
        "riasec_scores": {"E": 4.6, "A": 4.0, "S": 4.2},
        "big_five_scores": {"extraversion": 4.5, "agreeableness": 4.0, "openness": 4.1},
    },
    {
        "email": "mentor_finance@demo.com",
        "full_name": "Bùi Thanh Tú",
        "current_position": "Financial Analyst",
        "company": "Techcombank",
        "bio": "CFA holder, 6 năm kinh nghiệm phân tích tài chính tại ngân hàng và quỹ đầu tư.",
        "expertise_areas": ["Financial Analysis", "Excel", "Bloomberg", "Valuation", "Risk Management", "SQL", "Financial Modeling", "Investment"],
        "experience_years": 6,
        "available_hours_per_week": 3,
        "max_mentees": 4,
        "riasec_scores": {"C": 4.5, "I": 4.2, "E": 3.5},
        "big_five_scores": {"conscientiousness": 4.8, "openness": 3.5, "neuroticism": 2.8},
    },
    {
        "email": "mentor_teacher@demo.com",
        "full_name": "Nguyễn Thị Mai Linh",
        "current_position": "Education Specialist",
        "company": "VUS Language Centers",
        "bio": "10 năm kinh nghiệm giảng dạy và thiết kế chương trình học. Chuyên về early childhood education và curriculum development.",
        "expertise_areas": ["Curriculum Design", "Teaching", "Child Development", "Educational Psychology", "Classroom Management", "Assessment Design", "Microsoft Office", "Learning Management Systems"],
        "experience_years": 10,
        "available_hours_per_week": 6,
        "max_mentees": 8,
        "riasec_scores": {"S": 4.8, "A": 4.2, "E": 3.8},
        "big_five_scores": {"agreeableness": 4.7, "extraversion": 4.0, "conscientiousness": 4.3},
    },
    {
        "email": "mentor_cybersec@demo.com",
        "full_name": "Trương Gia Bảo",
        "current_position": "Cybersecurity Engineer",
        "company": "VNPT",
        "bio": "5 năm trong lĩnh vực bảo mật. Chuyên về penetration testing, SOC và incident response.",
        "expertise_areas": ["Cybersecurity", "Penetration Testing", "Network Security", "Python", "Linux", "SIEM", "Incident Response", "Ethical Hacking"],
        "experience_years": 5,
        "available_hours_per_week": 4,
        "max_mentees": 4,
        "riasec_scores": {"I": 4.5, "R": 4.0, "C": 3.8},
        "big_five_scores": {"openness": 4.2, "conscientiousness": 4.4, "extraversion": 2.9},
    },
    {
        "email": "mentor_hr@demo.com",
        "full_name": "Phan Thị Quỳnh Như",
        "current_position": "HR Business Partner",
        "company": "Masan Group",
        "bio": "8 năm kinh nghiệm HR toàn diện — tuyển dụng, phát triển nhân tài và organizational culture.",
        "expertise_areas": ["Recruitment", "HR Management", "Talent Development", "Employee Relations", "HRIS", "Performance Management", "Training & Development", "Labor Law"],
        "experience_years": 8,
        "available_hours_per_week": 4,
        "max_mentees": 6,
        "riasec_scores": {"S": 4.7, "E": 4.0, "C": 3.5},
        "big_five_scores": {"agreeableness": 4.6, "extraversion": 4.2, "conscientiousness": 4.1},
    },
    {
        "email": "mentor_mobile@demo.com",
        "full_name": "Huỳnh Minh Đức",
        "current_position": "Mobile Developer (iOS/Android)",
        "company": "MoMo",
        "bio": "6 năm phát triển ứng dụng mobile. Chuyên React Native, Flutter và native iOS/Android.",
        "expertise_areas": ["React Native", "Flutter", "Swift", "Kotlin", "Firebase", "REST API", "Git", "App Store Optimization"],
        "experience_years": 6,
        "available_hours_per_week": 5,
        "max_mentees": 5,
        "riasec_scores": {"I": 4.3, "R": 4.0, "C": 3.6},
        "big_five_scores": {"openness": 4.0, "conscientiousness": 4.3, "extraversion": 3.1},
    },
    {
        "email": "mentor_accounting@demo.com",
        "full_name": "Lý Thị Kim Ngân",
        "current_position": "Chief Accountant",
        "company": "PricewaterhouseCoopers Vietnam",
        "bio": "11 năm kinh nghiệm kế toán, kiểm toán tại Big4. ACCA holder, chuyên IFRS và tax planning.",
        "expertise_areas": ["Accounting", "Auditing", "IFRS", "Tax Planning", "Excel", "Financial Reporting", "SAP", "Internal Controls"],
        "experience_years": 11,
        "available_hours_per_week": 3,
        "max_mentees": 4,
        "riasec_scores": {"C": 4.8, "E": 3.5, "I": 3.8},
        "big_five_scores": {"conscientiousness": 4.9, "neuroticism": 2.3, "openness": 3.4},
    },
]


def seed():
    with Session(engine) as db:
        created = 0
        skipped = 0

        for m in MENTORS:
            # 1. Create user if not exists
            user = db.query(User).filter(User.email == m["email"]).first()
            if not user:
                user = User(
                    email=m["email"],
                    password_hash=hash_password("Demo@123456"),
                    full_name=m["full_name"],
                )
                db.add(user)
                db.flush()  # get user.id
                print(f"  [OK] Created user: {m['email']} (id={user.id})")
            else:
                print(f"  [--]  User exists: {m['email']} (id={user.id})")

            # 2. Create mentor profile if not exists
            profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
            if not profile:
                profile = MentorProfile(
                    user_id=user.id,
                    full_name=m["full_name"],
                    current_position=m["current_position"],
                    company=m["company"],
                    bio=m["bio"],
                    expertise_areas=m["expertise_areas"],
                    experience_years=m["experience_years"],
                    available_hours_per_week=m["available_hours_per_week"],
                    preferred_communication=["chat", "video"],
                    max_mentees=m["max_mentees"],
                    current_mentees_count=0,
                    riasec_scores=m.get("riasec_scores", {}),
                    big_five_scores=m.get("big_five_scores", {}),
                    is_active=True,
                )
                db.add(profile)
                created += 1
                print(f"     -> MentorProfile created: {m['current_position']} @ {m['company']}")
            else:
                skipped += 1
                print(f"     -> MentorProfile already exists, skipped.")

        db.commit()
        print(f"\n[OK] Done! Created {created} mentor profiles, skipped {skipped} (already existed).")
        print("   Login password for all demo mentors: Demo@123456")


if __name__ == "__main__":
    print("Seeding mentor profiles...\n")
    seed()
