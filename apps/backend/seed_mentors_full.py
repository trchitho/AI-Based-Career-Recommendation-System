# -*- coding: utf-8 -*-
"""
seed_mentors_full.py
====================
Tao mentor profiles tuong thich voi tat ca 22 nganh nghe trong DB.
- Moi nganh: 2 mentor voi skills + career match dua tren thuat toan:
    Skill overlap 50% + Career match 30% + Personality cosine 20%
- Tat ca tai khoan duoc verify (is_email_verified = True)
- Verify luon cac tai khoan cu (mentors + users da tao truoc do)

Chay: python seed_mentors_full.py
"""

import os, sys, json
from datetime import datetime, timezone
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.orm import Session
from app.core.db import engine
from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.mentor_matching.models import MentorProfile

# ==============================================================
#  MENTOR DATA — 2 mentors × 22 industry categories = 44 mentors
#  expertise_areas  → keyword overlap (Skill 50%)
#  current_position → career title overlap (Career 30%)
#  riasec_scores    → cosine similarity (Personality 20%)
# ==============================================================
MENTORS = [

    # ── 1. Management ─────────────────────────────────────────────
    {
        "email": "m_mgmt01@mentornet.vn", "full_name": "Nguyen Duc Thanh",
        "position": "General and Operations Manager", "company": "Vingroup",
        "bio": "15 nam quan ly hoat dong doanh nghiep lon. Chuyen ve chien luoc, van hanh va phat trien to chuc.",
        "expertise": ["Strategic Planning", "Operations Management", "Leadership", "Team Building",
                      "Project Management", "Stakeholder Management", "Budgeting", "KPI Management"],
        "exp": 15, "hours": 4, "max": 5,
        "riasec": {"E": 4.8, "C": 4.2, "S": 3.8, "I": 3.2, "R": 2.5, "A": 2.0},
        "big5": {"extraversion": 4.5, "conscientiousness": 4.7, "openness": 3.6, "agreeableness": 3.8, "neuroticism": 2.2},
    },
    {
        "email": "m_mgmt02@mentornet.vn", "full_name": "Tran Thi Lan",
        "position": "Human Resources Manager", "company": "Masan Group",
        "bio": "Chuyen gia HR voi 12 nam kinh nghiem. Toan bo vong doi nhan vien: tuyen dung, dao tao, giu chan.",
        "expertise": ["Human Resources Management", "Recruitment", "Talent Development",
                      "Employee Relations", "Performance Management", "Compensation", "Labor Law", "HRIS"],
        "exp": 12, "hours": 3, "max": 5,
        "riasec": {"S": 4.6, "E": 4.1, "C": 3.9, "I": 3.0, "R": 2.2, "A": 2.8},
        "big5": {"agreeableness": 4.6, "conscientiousness": 4.3, "extraversion": 4.0, "openness": 3.5, "neuroticism": 2.5},
    },

    # ── 2. Business and Financial Operations ──────────────────────
    {
        "email": "m_biz01@mentornet.vn", "full_name": "Le Minh Khoa",
        "position": "Management Analyst", "company": "McKinsey Vietnam",
        "bio": "10 nam tu van chien luoc cho Fortune 500. Chuyen ve phan tich kinh doanh va toi uu hoa quy trinh.",
        "expertise": ["Business Analysis", "Financial Modeling", "Strategic Consulting",
                      "Data Analysis", "Process Optimization", "Excel", "PowerPoint", "Market Research"],
        "exp": 10, "hours": 3, "max": 4,
        "riasec": {"I": 4.5, "E": 4.0, "C": 4.2, "S": 3.2, "R": 2.8, "A": 2.5},
        "big5": {"conscientiousness": 4.7, "openness": 4.2, "extraversion": 3.8, "agreeableness": 3.5, "neuroticism": 2.3},
    },
    {
        "email": "m_biz02@mentornet.vn", "full_name": "Pham Hong Nhung",
        "position": "Project Management Specialist", "company": "FPT Software",
        "bio": "PMP certified. 8 nam quan ly du an phan mem quy mo lon tai cac cong ty cong nghe hang dau.",
        "expertise": ["Project Management", "Agile", "Scrum", "Risk Management",
                      "Stakeholder Communication", "JIRA", "MS Project", "Resource Planning"],
        "exp": 8, "hours": 4, "max": 5,
        "riasec": {"C": 4.4, "E": 4.0, "I": 3.8, "S": 3.5, "R": 3.0, "A": 2.2},
        "big5": {"conscientiousness": 4.8, "openness": 3.7, "extraversion": 3.6, "agreeableness": 4.0, "neuroticism": 2.0},
    },

    # ── 3. Computer and Mathematical ──────────────────────────────
    {
        "email": "m_cs01@mentornet.vn", "full_name": "Hoang Duc Manh",
        "position": "Senior Software Developer", "company": "Google Vietnam",
        "bio": "9 nam phat trien phan mem tai Big Tech. Full-stack Python/React. Open source contributor.",
        "expertise": ["Python", "JavaScript", "React", "Node.js", "PostgreSQL", "Docker",
                      "AWS", "System Design", "REST API", "Microservices", "Git"],
        "exp": 9, "hours": 5, "max": 5,
        "riasec": {"I": 4.7, "R": 4.3, "C": 3.8, "A": 2.5, "S": 2.8, "E": 2.5},
        "big5": {"openness": 4.5, "conscientiousness": 4.4, "extraversion": 2.8, "agreeableness": 3.5, "neuroticism": 2.8},
    },
    {
        "email": "m_cs02@mentornet.vn", "full_name": "Vo Thi Kim Anh",
        "position": "Data Scientist", "company": "VNG Corporation",
        "bio": "6 nam nghien cuu va ung dung Machine Learning tai cac cong ty cong nghe. Chuyen NLP va Computer Vision.",
        "expertise": ["Machine Learning", "Deep Learning", "Python", "TensorFlow", "PyTorch",
                      "SQL", "Data Analysis", "Statistics", "NLP", "Computer Vision", "Pandas"],
        "exp": 6, "hours": 4, "max": 4,
        "riasec": {"I": 4.9, "R": 4.0, "C": 4.1, "A": 2.8, "S": 2.5, "E": 2.2},
        "big5": {"openness": 4.7, "conscientiousness": 4.5, "extraversion": 2.5, "agreeableness": 3.3, "neuroticism": 3.0},
    },

    # ── 4. Architecture and Engineering ───────────────────────────
    {
        "email": "m_eng01@mentornet.vn", "full_name": "Bui Quoc Hung",
        "position": "Civil Engineer", "company": "Coteccons",
        "bio": "12 nam thiet ke va giam sat cong trinh dan dung. PE licensed. Chuyen ket cau be tong.",
        "expertise": ["Civil Engineering", "Structural Analysis", "AutoCAD", "SAP2000",
                      "Construction Management", "Building Codes", "Geotechnical Engineering",
                      "Project Supervision", "Cost Estimation"],
        "exp": 12, "hours": 3, "max": 5,
        "riasec": {"R": 4.6, "I": 4.2, "C": 4.0, "E": 3.0, "S": 2.5, "A": 2.2},
        "big5": {"conscientiousness": 4.8, "openness": 3.5, "extraversion": 2.8, "agreeableness": 3.5, "neuroticism": 2.3},
    },
    {
        "email": "m_eng02@mentornet.vn", "full_name": "Do Thi Phuong Linh",
        "position": "Electrical Engineer", "company": "EVN",
        "bio": "10 nam thiet ke he thong dien cong nghiep va dan dung. Chuyen power distribution va automation.",
        "expertise": ["Electrical Engineering", "Power Systems", "AutoCAD Electrical",
                      "PLC Programming", "SCADA", "Industrial Automation", "Safety Standards",
                      "Energy Management", "Circuit Design"],
        "exp": 10, "hours": 3, "max": 4,
        "riasec": {"R": 4.5, "I": 4.4, "C": 3.8, "E": 2.8, "S": 2.5, "A": 2.0},
        "big5": {"conscientiousness": 4.6, "openness": 3.8, "extraversion": 2.6, "agreeableness": 3.8, "neuroticism": 2.5},
    },

    # ── 5. Life, Physical, and Social Science ─────────────────────
    {
        "email": "m_sci01@mentornet.vn", "full_name": "Nguyen Thi Bao Chau",
        "position": "Research Scientist", "company": "Viện Khoa học Việt Nam",
        "bio": "PhD Hoa hoc. 8 nam nghien cuu vat lieu moi va ung dung cong nghiep. 20+ bai bao ISI.",
        "expertise": ["Chemistry", "Materials Science", "Laboratory Research",
                      "Scientific Writing", "Data Analysis", "SPSS", "Spectroscopy",
                      "Research Methodology", "Grant Writing"],
        "exp": 8, "hours": 3, "max": 4,
        "riasec": {"I": 4.9, "R": 4.3, "C": 3.5, "A": 3.2, "S": 2.8, "E": 2.0},
        "big5": {"openness": 4.8, "conscientiousness": 4.5, "extraversion": 2.3, "agreeableness": 3.8, "neuroticism": 3.0},
    },
    {
        "email": "m_sci02@mentornet.vn", "full_name": "Tran Van Duc",
        "position": "Environmental Scientist", "company": "Bộ Tài nguyên Môi trường",
        "bio": "10 nam nghien cuu moi truong va chinh sach. Chuyen quan ly chat thai va danh gia tac dong moi truong.",
        "expertise": ["Environmental Science", "Environmental Impact Assessment",
                      "Waste Management", "GIS", "Environmental Regulations",
                      "Water Quality Analysis", "Air Quality Monitoring", "Sustainability"],
        "exp": 10, "hours": 4, "max": 5,
        "riasec": {"I": 4.5, "R": 4.0, "S": 3.5, "C": 3.8, "E": 2.8, "A": 2.5},
        "big5": {"openness": 4.3, "conscientiousness": 4.4, "extraversion": 2.8, "agreeableness": 4.0, "neuroticism": 2.8},
    },

    # ── 6. Healthcare Practitioners and Technical ─────────────────
    {
        "email": "m_health01@mentornet.vn", "full_name": "Le Thi Huong Giang",
        "position": "Registered Nurse", "company": "Bệnh viện Bạch Mai",
        "bio": "15 nam kinh nghiem dieu duong cap cuu. Chuyen ICU, cham soc benh nhan da chan thuong.",
        "expertise": ["Patient Care", "Clinical Assessment", "Medical Procedures",
                      "Emergency Care", "Medication Administration", "Electronic Health Records",
                      "HIPAA Compliance", "Critical Care", "Patient Education"],
        "exp": 15, "hours": 3, "max": 5,
        "riasec": {"S": 4.8, "R": 4.0, "C": 3.8, "I": 3.5, "E": 2.8, "A": 2.5},
        "big5": {"agreeableness": 4.7, "conscientiousness": 4.5, "extraversion": 3.5, "openness": 3.3, "neuroticism": 2.8},
    },
    {
        "email": "m_health02@mentornet.vn", "full_name": "Pham Duc Trung",
        "position": "Medical Laboratory Technician", "company": "Bệnh viện Nhi Trung ương",
        "bio": "10 nam xet nghiem lam sang. Chuyen huyet hoc, sinh hoa va vi sinh vat.",
        "expertise": ["Clinical Laboratory Science", "Hematology", "Biochemistry",
                      "Microbiology", "PCR Testing", "Blood Banking",
                      "Laboratory Equipment", "Quality Control", "Medical Terminology"],
        "exp": 10, "hours": 3, "max": 4,
        "riasec": {"R": 4.3, "I": 4.5, "C": 4.0, "S": 3.2, "E": 2.5, "A": 2.0},
        "big5": {"conscientiousness": 4.7, "openness": 3.8, "extraversion": 2.6, "agreeableness": 3.8, "neuroticism": 2.5},
    },

    # ── 7. Educational Instruction and Library ────────────────────
    {
        "email": "m_edu01@mentornet.vn", "full_name": "Nguyen Thi Thu Ha",
        "position": "Kindergarten Teacher", "company": "Trường Mầm non Hoa Sen",
        "bio": "18 nam giang day mam non. Chuyen ve phat trien tre em, thiet ke chuong trinh hoc va quan ly lop hoc.",
        "expertise": ["Early Childhood Education", "Curriculum Design", "Child Development",
                      "Classroom Management", "Teaching Strategies", "Assessment Design",
                      "Parent Communication", "Special Needs Education", "Play-Based Learning"],
        "exp": 18, "hours": 4, "max": 6,
        "riasec": {"S": 4.9, "A": 4.2, "E": 3.8, "I": 2.8, "C": 3.0, "R": 2.2},
        "big5": {"agreeableness": 4.8, "extraversion": 4.1, "conscientiousness": 4.3, "openness": 4.0, "neuroticism": 2.5},
    },
    {
        "email": "m_edu02@mentornet.vn", "full_name": "Vo Thi Bich Ngoc",
        "position": "Postsecondary Teacher", "company": "Đại học Bách Khoa Hà Nội",
        "bio": "PhD Giao duc. 12 nam giang day dai hoc. Nghien cuu ve phuong phap day hoc hien dai va e-learning.",
        "expertise": ["Higher Education", "Curriculum Development", "Academic Research",
                      "E-Learning", "Student Assessment", "Learning Management Systems",
                      "Instructional Design", "Educational Technology", "Mentoring"],
        "exp": 12, "hours": 4, "max": 5,
        "riasec": {"I": 4.5, "S": 4.2, "A": 3.8, "E": 3.5, "C": 3.2, "R": 2.5},
        "big5": {"openness": 4.6, "agreeableness": 4.2, "conscientiousness": 4.4, "extraversion": 3.5, "neuroticism": 2.8},
    },

    # ── 8. Arts, Design, Entertainment, Sports, and Media ─────────
    {
        "email": "m_art01@mentornet.vn", "full_name": "Cao Minh Tuan",
        "position": "UX Designer", "company": "Tiki",
        "bio": "8 nam thiet ke UX/UI cho cac san pham so tu 0 den 10 trieu users. Master Figma va design system.",
        "expertise": ["UX Design", "UI Design", "Figma", "Prototyping", "User Research",
                      "Usability Testing", "Design System", "Adobe XD", "CSS",
                      "Product Design", "Accessibility"],
        "exp": 8, "hours": 4, "max": 5,
        "riasec": {"A": 4.8, "I": 3.8, "E": 3.5, "S": 3.2, "R": 2.5, "C": 2.8},
        "big5": {"openness": 4.9, "conscientiousness": 3.8, "extraversion": 3.5, "agreeableness": 4.0, "neuroticism": 2.8},
    },
    {
        "email": "m_art02@mentornet.vn", "full_name": "Nguyen Hoang Bao",
        "position": "Graphic Designer", "company": "VCCorp",
        "bio": "10 nam thiet ke do hoa cho truyen thong va quang cao. Chuyen brand identity va creative campaign.",
        "expertise": ["Graphic Design", "Adobe Illustrator", "Adobe Photoshop",
                      "Brand Identity", "Typography", "Color Theory", "Layout Design",
                      "Print Design", "Digital Marketing Design", "Adobe InDesign"],
        "exp": 10, "hours": 3, "max": 5,
        "riasec": {"A": 4.9, "E": 3.2, "S": 3.5, "I": 3.0, "R": 2.8, "C": 2.5},
        "big5": {"openness": 4.8, "agreeableness": 3.8, "extraversion": 3.2, "conscientiousness": 3.5, "neuroticism": 3.0},
    },

    # ── 9. Sales and Related ──────────────────────────────────────
    {
        "email": "m_sales01@mentornet.vn", "full_name": "Trinh Van Nam",
        "position": "Sales Manager", "company": "Shopee Vietnam",
        "bio": "12 nam ban hang B2B/B2C trong linh vuc e-commerce. Xay dung team ban hang tu 0 len 50 nguoi.",
        "expertise": ["Sales Strategy", "B2B Sales", "B2C Sales", "CRM", "Salesforce",
                      "Negotiation", "Account Management", "Sales Analytics",
                      "Team Leadership", "Revenue Growth", "Customer Acquisition"],
        "exp": 12, "hours": 4, "max": 5,
        "riasec": {"E": 4.9, "S": 4.2, "C": 3.5, "I": 3.0, "R": 2.5, "A": 2.8},
        "big5": {"extraversion": 4.8, "agreeableness": 3.8, "conscientiousness": 4.0, "openness": 3.5, "neuroticism": 2.5},
    },
    {
        "email": "m_sales02@mentornet.vn", "full_name": "Do Thi My Linh",
        "position": "Real Estate Agent", "company": "CBRE Vietnam",
        "bio": "9 nam kinh doanh bat dong san cao cap. Chuyen thuong mai va van phong cho thue tai TP.HCM.",
        "expertise": ["Real Estate", "Property Management", "Sales Negotiation",
                      "Market Analysis", "Customer Relations", "Contract Management",
                      "Property Valuation", "Leasing", "Investment Analysis"],
        "exp": 9, "hours": 3, "max": 4,
        "riasec": {"E": 4.7, "S": 4.0, "C": 3.8, "I": 3.2, "R": 2.5, "A": 2.2},
        "big5": {"extraversion": 4.5, "agreeableness": 4.2, "conscientiousness": 4.0, "openness": 3.3, "neuroticism": 2.8},
    },

    # ── 10. Office and Administrative Support ────────────────────
    {
        "email": "m_admin01@mentornet.vn", "full_name": "Nguyen Thi Lan Phuong",
        "position": "Administrative Services Manager", "company": "PricewaterhouseCoopers Vietnam",
        "bio": "14 nam quan ly hanh chinh tai cong ty quoc te. Chuyen van phong, hop dong va compliance.",
        "expertise": ["Administrative Management", "Office Administration",
                      "Records Management", "Microsoft Office", "Scheduling",
                      "Vendor Management", "Compliance", "Budget Management", "Reporting"],
        "exp": 14, "hours": 3, "max": 5,
        "riasec": {"C": 4.7, "E": 3.8, "S": 3.5, "I": 3.0, "R": 2.5, "A": 2.2},
        "big5": {"conscientiousness": 4.9, "agreeableness": 4.0, "extraversion": 3.3, "openness": 3.0, "neuroticism": 2.2},
    },
    {
        "email": "m_admin02@mentornet.vn", "full_name": "Le Van Thanh",
        "position": "Bookkeeping Clerk", "company": "Deloitte Vietnam",
        "bio": "10 nam ke toan va quan ly so sach cho cac cong ty lon. CPA holder. Chuyen IFRS va thue.",
        "expertise": ["Bookkeeping", "Accounting", "Excel", "QuickBooks",
                      "Financial Reporting", "Accounts Payable", "Accounts Receivable",
                      "Tax Preparation", "IFRS", "Payroll"],
        "exp": 10, "hours": 3, "max": 5,
        "riasec": {"C": 4.8, "I": 3.8, "R": 3.0, "E": 2.8, "S": 3.2, "A": 2.0},
        "big5": {"conscientiousness": 4.9, "openness": 3.2, "extraversion": 2.5, "agreeableness": 3.8, "neuroticism": 2.3},
    },

    # ── 11. Community and Social Service ─────────────────────────
    {
        "email": "m_social01@mentornet.vn", "full_name": "Phan Thi Quynh",
        "position": "Social Worker", "company": "UNICEF Vietnam",
        "bio": "10 nam cong tac xa hoi cho tre em va gia dinh de bi ton thuong. Master Cong tac xa hoi.",
        "expertise": ["Social Work", "Case Management", "Counseling",
                      "Community Outreach", "Child Protection", "Family Support",
                      "Crisis Intervention", "Grant Writing", "NGO Management"],
        "exp": 10, "hours": 4, "max": 6,
        "riasec": {"S": 4.9, "A": 3.8, "I": 3.5, "E": 3.2, "C": 2.8, "R": 2.0},
        "big5": {"agreeableness": 4.8, "openness": 4.2, "extraversion": 3.8, "conscientiousness": 4.0, "neuroticism": 2.8},
    },
    {
        "email": "m_social02@mentornet.vn", "full_name": "Truong Minh Duc",
        "position": "Mental Health Counselor", "company": "Phòng khám Tâm lý Hà Nội",
        "bio": "8 nam tu van tam ly lam sang. Chuyen lo au, tram cam va quan he. CBT certified.",
        "expertise": ["Mental Health Counseling", "Psychology", "CBT Therapy",
                      "Crisis Intervention", "Psychotherapy", "Clinical Assessment",
                      "Trauma-Informed Care", "Group Therapy", "Documentation"],
        "exp": 8, "hours": 3, "max": 4,
        "riasec": {"S": 4.8, "I": 4.3, "A": 3.5, "E": 3.0, "C": 3.2, "R": 2.2},
        "big5": {"agreeableness": 4.7, "openness": 4.4, "conscientiousness": 4.2, "extraversion": 3.2, "neuroticism": 3.0},
    },

    # ── 12. Legal ────────────────────────────────────────────────
    {
        "email": "m_legal01@mentornet.vn", "full_name": "Hoang Thi Kim Ngan",
        "position": "Lawyer", "company": "Baker McKenzie Vietnam",
        "bio": "12 nam luat su thuong mai quoc te. Chuyen M&A, hop dong dau tu nuoc ngoai va tranh chap thuong mai.",
        "expertise": ["Commercial Law", "Contract Law", "M&A", "Corporate Law",
                      "Foreign Investment", "Dispute Resolution", "Due Diligence",
                      "Legal Research", "Negotiation", "Compliance"],
        "exp": 12, "hours": 3, "max": 4,
        "riasec": {"E": 4.5, "I": 4.3, "C": 4.0, "S": 3.2, "A": 2.8, "R": 2.5},
        "big5": {"conscientiousness": 4.8, "openness": 4.0, "extraversion": 3.8, "agreeableness": 3.2, "neuroticism": 2.5},
    },
    {
        "email": "m_legal02@mentornet.vn", "full_name": "Vu Duc Minh",
        "position": "Compliance Officer", "company": "HSBC Vietnam",
        "bio": "9 nam tuan thu phap ly trong linh vuc ngan hang. Chuyen AML/KYC va quy dinh NHNN.",
        "expertise": ["Compliance", "Regulatory Affairs", "AML", "KYC",
                      "Banking Regulations", "Risk Assessment", "Internal Audit",
                      "Legal Research", "Policy Writing", "Financial Compliance"],
        "exp": 9, "hours": 3, "max": 4,
        "riasec": {"C": 4.6, "I": 4.2, "E": 3.5, "S": 3.0, "R": 2.8, "A": 2.2},
        "big5": {"conscientiousness": 4.9, "openness": 3.5, "extraversion": 2.8, "agreeableness": 3.8, "neuroticism": 2.3},
    },

    # ── 13. Installation, Maintenance, and Repair ────────────────
    {
        "email": "m_maint01@mentornet.vn", "full_name": "Dang Van Khanh",
        "position": "Industrial Machinery Mechanic", "company": "Samsung Vietnam",
        "bio": "14 nam bao tri may moc cong nghiep trong nha may san xuat. Chuyen CNC va robot cong nghiep.",
        "expertise": ["Industrial Machinery", "CNC Machine Operation", "Preventive Maintenance",
                      "Hydraulics", "Pneumatics", "Welding", "PLC", "Robotics",
                      "Troubleshooting", "Safety Procedures"],
        "exp": 14, "hours": 3, "max": 5,
        "riasec": {"R": 4.8, "I": 4.0, "C": 3.8, "E": 2.5, "S": 2.8, "A": 2.0},
        "big5": {"conscientiousness": 4.6, "openness": 3.3, "extraversion": 2.5, "agreeableness": 3.8, "neuroticism": 2.5},
    },
    {
        "email": "m_maint02@mentornet.vn", "full_name": "Bui Thi Thanh Hoa",
        "position": "HVAC Technician", "company": "Carrier Vietnam",
        "bio": "10 nam lap dat va sua chua he thong dieu hoa khong khi thuong mai. Chuyen chiller va VRF.",
        "expertise": ["HVAC", "Refrigeration", "Air Conditioning Installation",
                      "Electrical Systems", "Troubleshooting", "Preventive Maintenance",
                      "Safety Standards", "Blueprint Reading", "Customer Service"],
        "exp": 10, "hours": 3, "max": 4,
        "riasec": {"R": 4.6, "I": 3.8, "C": 3.5, "E": 2.8, "S": 3.0, "A": 2.0},
        "big5": {"conscientiousness": 4.5, "openness": 3.0, "extraversion": 2.8, "agreeableness": 4.0, "neuroticism": 2.5},
    },

    # ── 14. Production ───────────────────────────────────────────
    {
        "email": "m_prod01@mentornet.vn", "full_name": "Nguyen Van Son",
        "position": "Quality Control Systems Manager", "company": "Toyota Vietnam",
        "bio": "15 nam quan ly chat luong san xuat o to. Lean Six Sigma Black Belt. ISO 9001 Lead Auditor.",
        "expertise": ["Quality Management", "ISO 9001", "Lean Manufacturing", "Six Sigma",
                      "Statistical Process Control", "Root Cause Analysis",
                      "Quality Audit", "FMEA", "5S", "Kaizen"],
        "exp": 15, "hours": 3, "max": 5,
        "riasec": {"C": 4.7, "R": 4.2, "I": 4.0, "E": 3.0, "S": 2.8, "A": 2.2},
        "big5": {"conscientiousness": 4.9, "openness": 3.5, "extraversion": 2.8, "agreeableness": 3.5, "neuroticism": 2.2},
    },
    {
        "email": "m_prod02@mentornet.vn", "full_name": "Tran Thi Hong",
        "position": "Industrial Production Manager", "company": "Hoa Phat Group",
        "bio": "11 nam dieu hanh san xuat thep. Chuyen toi uu hoa hieu suat va quan ly chuoi cung ung.",
        "expertise": ["Production Management", "Manufacturing Operations",
                      "Supply Chain Management", "Inventory Control", "Safety Management",
                      "ERP Systems", "Cost Reduction", "Team Leadership", "KPI Tracking"],
        "exp": 11, "hours": 4, "max": 5,
        "riasec": {"E": 4.3, "C": 4.5, "R": 3.8, "I": 3.2, "S": 3.0, "A": 2.0},
        "big5": {"conscientiousness": 4.7, "openness": 3.2, "extraversion": 3.5, "agreeableness": 3.8, "neuroticism": 2.3},
    },

    # ── 15. Transportation and Material Moving ────────────────────
    {
        "email": "m_trans01@mentornet.vn", "full_name": "Le Hoang Nam",
        "position": "Logistician", "company": "DHL Vietnam",
        "bio": "12 nam quan ly logistics quoc te. Chuyen import/export, thong quan va toi uu chuoi cung ung.",
        "expertise": ["Logistics", "Supply Chain Management", "Import/Export",
                      "Customs Clearance", "Warehouse Management", "SAP",
                      "Freight Management", "Inventory Optimization", "Trade Compliance"],
        "exp": 12, "hours": 4, "max": 5,
        "riasec": {"C": 4.4, "E": 3.8, "R": 3.5, "I": 3.5, "S": 3.0, "A": 2.2},
        "big5": {"conscientiousness": 4.6, "openness": 3.3, "extraversion": 3.2, "agreeableness": 3.8, "neuroticism": 2.5},
    },
    {
        "email": "m_trans02@mentornet.vn", "full_name": "Pham Thi Ngoc Bich",
        "position": "Supply Chain Manager", "company": "Grab Vietnam",
        "bio": "9 nam quan ly chuoi cung ung trong linh vuc cong nghe. Chuyen last-mile delivery va toi uu van hanh.",
        "expertise": ["Supply Chain Management", "Operations Management",
                      "Vendor Management", "Data Analysis", "Process Improvement",
                      "E-commerce Logistics", "Demand Planning", "Cost Optimization", "Excel"],
        "exp": 9, "hours": 3, "max": 4,
        "riasec": {"C": 4.3, "I": 4.0, "E": 3.8, "R": 3.2, "S": 3.2, "A": 2.5},
        "big5": {"conscientiousness": 4.5, "openness": 3.8, "extraversion": 3.5, "agreeableness": 4.0, "neuroticism": 2.5},
    },

    # ── 16. Construction and Extraction ──────────────────────────
    {
        "email": "m_const01@mentornet.vn", "full_name": "Nguyen Duc Trong",
        "position": "Construction Manager", "company": "Novaland",
        "bio": "16 nam quan ly du an xay dung bat dong san tu 100 ty den 2000 ty. PMP va RCC certified.",
        "expertise": ["Construction Management", "Project Planning", "Cost Control",
                      "Subcontractor Management", "Site Supervision", "Building Codes",
                      "Safety Management", "MS Project", "AutoCAD", "Contract Management"],
        "exp": 16, "hours": 3, "max": 5,
        "riasec": {"E": 4.4, "R": 4.3, "C": 4.0, "I": 3.2, "S": 3.0, "A": 2.2},
        "big5": {"conscientiousness": 4.8, "extraversion": 3.8, "openness": 3.2, "agreeableness": 3.5, "neuroticism": 2.3},
    },
    {
        "email": "m_const02@mentornet.vn", "full_name": "Doan Thi Thu Trang",
        "position": "Environmental Compliance Inspector", "company": "Bộ Xây dựng",
        "bio": "8 nam kiem tra tuan thu moi truong trong xay dung. Chuyen danh gia va giam sat an toan cong trinh.",
        "expertise": ["Environmental Compliance", "Site Inspection", "Regulatory Compliance",
                      "Environmental Law", "Construction Safety", "Documentation",
                      "Report Writing", "Site Assessment", "Waste Management"],
        "exp": 8, "hours": 4, "max": 5,
        "riasec": {"C": 4.5, "I": 4.2, "R": 3.8, "E": 3.0, "S": 3.2, "A": 2.5},
        "big5": {"conscientiousness": 4.7, "openness": 3.5, "agreeableness": 4.0, "extraversion": 2.8, "neuroticism": 2.5},
    },

    # ── 17. Protective Service ────────────────────────────────────
    {
        "email": "m_protect01@mentornet.vn", "full_name": "Vu Xuan Truong",
        "position": "Security Manager", "company": "G4S Vietnam",
        "bio": "20 nam bao ve an ninh doanh nghiep. Chuyen giam sat, ung pho su co va dao tao nhan vien bao ve.",
        "expertise": ["Security Management", "Physical Security", "Risk Assessment",
                      "Emergency Response", "CCTV Systems", "Access Control",
                      "Security Training", "Incident Investigation", "Crisis Management"],
        "exp": 20, "hours": 3, "max": 5,
        "riasec": {"E": 4.3, "R": 4.5, "C": 4.0, "S": 3.5, "I": 3.0, "A": 2.0},
        "big5": {"conscientiousness": 4.8, "openness": 2.8, "extraversion": 3.5, "agreeableness": 3.2, "neuroticism": 2.2},
    },
    {
        "email": "m_protect02@mentornet.vn", "full_name": "Ho Thi Ngoc Anh",
        "position": "Loss Prevention Manager", "company": "Central Group Vietnam",
        "bio": "11 nam quan ly phong chong mat mat trong ban le. Chuyen dieu tra, giam sat va xu ly gian lan.",
        "expertise": ["Loss Prevention", "Retail Security", "Fraud Investigation",
                      "CCTV Monitoring", "Inventory Control", "Employee Training",
                      "Risk Management", "Criminal Investigations", "Compliance"],
        "exp": 11, "hours": 3, "max": 4,
        "riasec": {"C": 4.4, "E": 3.8, "R": 4.0, "I": 3.8, "S": 3.2, "A": 2.2},
        "big5": {"conscientiousness": 4.7, "openness": 3.2, "extraversion": 3.0, "agreeableness": 3.5, "neuroticism": 2.5},
    },

    # ── 18. Healthcare Support ────────────────────────────────────
    {
        "email": "m_healthsup01@mentornet.vn", "full_name": "Ly Thi Mai",
        "position": "Occupational Therapy Assistant", "company": "Bệnh viện Phục hồi chức năng",
        "bio": "8 nam ho tro phuc hoi chuc nang cho benh nhan phau thuat va tai nan. Chuyen tri lieu nghe nghiep.",
        "expertise": ["Occupational Therapy", "Patient Rehabilitation", "Therapeutic Exercises",
                      "Assistive Technology", "Patient Assessment", "Treatment Planning",
                      "Documentation", "Patient Education", "Interdisciplinary Collaboration"],
        "exp": 8, "hours": 4, "max": 5,
        "riasec": {"S": 4.7, "R": 3.8, "I": 3.5, "C": 3.5, "E": 2.8, "A": 2.5},
        "big5": {"agreeableness": 4.7, "conscientiousness": 4.4, "extraversion": 3.2, "openness": 3.5, "neuroticism": 2.8},
    },
    {
        "email": "m_healthsup02@mentornet.vn", "full_name": "Phan Van Quoc",
        "position": "Physical Therapy Aide", "company": "Vinmec",
        "bio": "7 nam ho tro vat ly tri lieu cho benh nhan chinh hinh va phau thuat. Dang hoc chuyen khoa.",
        "expertise": ["Physical Therapy", "Patient Care", "Therapeutic Exercises",
                      "Hydrotherapy", "Equipment Operation", "Patient Mobility Assistance",
                      "Treatment Documentation", "Basic Medical Procedures"],
        "exp": 7, "hours": 4, "max": 5,
        "riasec": {"S": 4.5, "R": 4.2, "I": 3.5, "C": 3.2, "E": 2.8, "A": 2.5},
        "big5": {"agreeableness": 4.5, "conscientiousness": 4.2, "openness": 3.2, "extraversion": 3.0, "neuroticism": 2.8},
    },

    # ── 19. Personal Care and Service ────────────────────────────
    {
        "email": "m_personal01@mentornet.vn", "full_name": "Nguyen Thi Bao Yen",
        "position": "Fitness and Wellness Coordinator", "company": "California Fitness Vietnam",
        "bio": "9 nam huong dan the duc va quan ly trung tam the duc. Chuyen thiet ke chuong trinh luyen tap.",
        "expertise": ["Fitness Training", "Wellness Coaching", "Exercise Programming",
                      "Nutrition Guidance", "Group Fitness", "Personal Training",
                      "Health Assessment", "Motivational Coaching", "Client Relations"],
        "exp": 9, "hours": 4, "max": 6,
        "riasec": {"S": 4.6, "E": 4.0, "R": 3.8, "A": 3.5, "I": 3.0, "C": 2.8},
        "big5": {"extraversion": 4.5, "agreeableness": 4.2, "openness": 3.8, "conscientiousness": 4.0, "neuroticism": 2.5},
    },
    {
        "email": "m_personal02@mentornet.vn", "full_name": "Tran Duc Tai",
        "position": "Spa Manager", "company": "Six Senses Vietnam",
        "bio": "11 nam quan ly spa cao cap. Chuyen cham soc khach hang VIP va phat trien dich vu wellness.",
        "expertise": ["Spa Management", "Customer Service", "Team Leadership",
                      "Beauty Treatments", "Wellness Services", "Revenue Management",
                      "Staff Training", "Client Relations", "Operations Management"],
        "exp": 11, "hours": 3, "max": 5,
        "riasec": {"S": 4.5, "E": 4.2, "A": 4.0, "I": 2.8, "C": 3.2, "R": 2.5},
        "big5": {"agreeableness": 4.5, "extraversion": 4.3, "openness": 4.0, "conscientiousness": 3.8, "neuroticism": 2.8},
    },

    # ── 20. Food Preparation and Serving Related ──────────────────
    {
        "email": "m_food01@mentornet.vn", "full_name": "Le Van Hai",
        "position": "Food Service Manager", "company": "Pizza 4P's Vietnam",
        "bio": "13 nam quan ly nha hang cao cap. Chuyen van hanh bep, quan ly thuc don va dao tao dau bep.",
        "expertise": ["Food Service Management", "Restaurant Operations", "Menu Development",
                      "Kitchen Management", "Food Safety", "HACCP", "Staff Training",
                      "Cost Control", "Customer Service", "Inventory Management"],
        "exp": 13, "hours": 3, "max": 5,
        "riasec": {"E": 4.2, "R": 3.8, "S": 4.0, "C": 3.8, "A": 3.5, "I": 2.8},
        "big5": {"extraversion": 4.0, "conscientiousness": 4.5, "agreeableness": 4.2, "openness": 3.5, "neuroticism": 2.5},
    },
    {
        "email": "m_food02@mentornet.vn", "full_name": "Nguyen Thi Kim Chi",
        "position": "Chef", "company": "InterContinental Hanoi",
        "bio": "15 nam nau an tai khach san 5 sao. Chuyen am thuc Viet Nam va dau bep Tay theo phong cach fusion.",
        "expertise": ["Culinary Arts", "Menu Planning", "Food Presentation",
                      "French Cuisine", "Vietnamese Cuisine", "Baking and Pastry",
                      "Kitchen Safety", "Food Cost Management", "Team Leadership"],
        "exp": 15, "hours": 3, "max": 4,
        "riasec": {"R": 4.3, "A": 4.5, "E": 3.5, "S": 3.8, "I": 3.0, "C": 3.2},
        "big5": {"openness": 4.5, "conscientiousness": 4.3, "agreeableness": 4.0, "extraversion": 3.5, "neuroticism": 2.8},
    },

    # ── 21. Building and Grounds Cleaning and Maintenance ─────────
    {
        "email": "m_build01@mentornet.vn", "full_name": "Pham Thi Hong Hanh",
        "position": "Facilities Manager", "company": "Savills Vietnam",
        "bio": "12 nam quan ly co so vat chat cho toa nha van phong hang A tai Ha Noi va TP.HCM.",
        "expertise": ["Facilities Management", "Building Maintenance", "Property Management",
                      "Contractor Management", "Budget Management", "Safety Compliance",
                      "Energy Management", "Space Planning", "Vendor Relations"],
        "exp": 12, "hours": 3, "max": 5,
        "riasec": {"C": 4.4, "E": 3.8, "R": 3.8, "I": 3.2, "S": 3.2, "A": 2.2},
        "big5": {"conscientiousness": 4.7, "openness": 3.2, "extraversion": 3.2, "agreeableness": 3.8, "neuroticism": 2.5},
    },
    {
        "email": "m_build02@mentornet.vn", "full_name": "Vu Minh Cuong",
        "position": "Grounds Maintenance Manager", "company": "Ecopark",
        "bio": "10 nam quan ly canh quan va bao tri mat bang khu do thi xanh. Chuyen thiet ke canh quan ben vung.",
        "expertise": ["Landscape Management", "Grounds Maintenance", "Irrigation Systems",
                      "Horticulture", "Equipment Operation", "Pesticide Application",
                      "Team Supervision", "Budget Control", "Environmental Safety"],
        "exp": 10, "hours": 3, "max": 4,
        "riasec": {"R": 4.5, "C": 3.8, "I": 3.2, "E": 3.0, "S": 3.5, "A": 2.5},
        "big5": {"conscientiousness": 4.5, "openness": 3.0, "extraversion": 2.8, "agreeableness": 4.0, "neuroticism": 2.5},
    },

    # ── 22. Farming, Fishing, and Forestry ───────────────────────
    {
        "email": "m_farm01@mentornet.vn", "full_name": "Do Van Loi",
        "position": "Agricultural Manager", "company": "VinEco",
        "bio": "14 nam quan ly trang trai nong nghiep cong nghe cao. Chuyen nong nghiep sach va GlobalGAP.",
        "expertise": ["Agricultural Management", "Crop Production", "Irrigation Management",
                      "Pest Control", "Farm Equipment", "GlobalGAP", "Organic Farming",
                      "Soil Science", "Agricultural Technology", "Supply Chain"],
        "exp": 14, "hours": 3, "max": 5,
        "riasec": {"R": 4.6, "I": 3.8, "C": 3.5, "E": 3.2, "S": 3.0, "A": 2.2},
        "big5": {"conscientiousness": 4.6, "openness": 3.5, "extraversion": 2.8, "agreeableness": 3.8, "neuroticism": 2.5},
    },
    {
        "email": "m_farm02@mentornet.vn", "full_name": "Nguyen Thi Cam Tu",
        "position": "Forester", "company": "Viện Nghiên cứu Lâm nghiệp",
        "bio": "9 nam nghien cuu va quan ly rung nhiet doi. Chuyen GIS ung dung trong quan ly rung va bao ton.",
        "expertise": ["Forestry", "Forest Management", "GIS", "Environmental Conservation",
                      "Timber Harvesting", "Wildlife Management", "Remote Sensing",
                      "Reforestation", "Biodiversity Assessment", "Carbon Credits"],
        "exp": 9, "hours": 4, "max": 5,
        "riasec": {"R": 4.5, "I": 4.3, "C": 3.5, "S": 3.2, "E": 2.8, "A": 2.5},
        "big5": {"openness": 4.2, "conscientiousness": 4.3, "extraversion": 2.5, "agreeableness": 4.0, "neuroticism": 2.8},
    },
]


def verify_all_users(db: Session) -> int:
    """Verify all existing user accounts."""
    from sqlalchemy import text
    result = db.execute(text("""
        UPDATE core.users
        SET is_email_verified = true,
            email_verified_at = NOW()
        WHERE is_email_verified = false OR is_email_verified IS NULL
    """))
    db.commit()
    return result.rowcount


def seed():
    now = datetime.now(timezone.utc)

    with Session(engine) as db:
        print("\n[1] Verifying all existing user accounts...")
        verified = verify_all_users(db)
        print(f"    Verified {verified} accounts")

        print("\n[2] Creating mentor accounts and profiles...")
        created_users = 0
        created_mentors = 0
        skipped = 0

        for m in MENTORS:
            # Create / get user
            user = db.query(User).filter(User.email == m["email"]).first()
            if not user:
                user = User(
                    email=m["email"],
                    password_hash=hash_password("Mentor@2026!"),
                    full_name=m["full_name"],
                    is_email_verified=True,
                    email_verified_at=now,
                )
                db.add(user)
                db.flush()
                created_users += 1
            else:
                # Verify existing account
                user.is_email_verified = True
                user.email_verified_at = now

            # Create / update mentor profile
            profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
            if not profile:
                profile = MentorProfile(
                    user_id=user.id,
                    full_name=m["full_name"],
                    current_position=m["position"],
                    company=m["company"],
                    bio=m["bio"],
                    expertise_areas=m["expertise"],
                    experience_years=m["exp"],
                    available_hours_per_week=m["hours"],
                    preferred_communication=["chat", "video"],
                    max_mentees=m["max"],
                    current_mentees_count=0,
                    riasec_scores=m["riasec"],
                    big_five_scores=m["big5"],
                    is_active=True,
                )
                db.add(profile)
                created_mentors += 1
                print(f"    [+] {m['full_name'][:30]:30s} | {m['position'][:35]:35s}")
            else:
                # Update existing profile
                profile.riasec_scores = m["riasec"]
                profile.big_five_scores = m["big5"]
                profile.expertise_areas = m["expertise"]
                profile.is_active = True
                skipped += 1
                print(f"    [=] {m['full_name'][:30]:30s} | already exists, updated scores")

        db.commit()

        print(f"\n[3] Summary:")
        print(f"    Created users    : {created_users}")
        print(f"    Created mentors  : {created_mentors}")
        print(f"    Updated existing : {skipped}")
        print(f"    Total mentors    : {created_mentors + skipped}")
        print(f"    Login password   : Mentor@2026!")
        print(f"\n    Matching algorithm coverage:")
        print(f"      - Skill overlap (50%): {len(MENTORS)} mentors x avg {sum(len(m['expertise']) for m in MENTORS)//len(MENTORS)} skills")
        print(f"      - Career match  (30%): All positions mapped to DB career titles")
        print(f"      - Personality   (20%): RIASEC + Big Five scores for cosine similarity")
        print(f"      Industries covered: 22 categories")


if __name__ == "__main__":
    print("Seeding full mentor dataset with binary serialization support...\n")
    seed()
