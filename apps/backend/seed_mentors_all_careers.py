# -*- coding: utf-8 -*-
"""
seed_mentors_all_careers.py
===========================
Tạo mentor profiles phủ tất cả 22 nhóm ngành nghề.
Mỗi nhóm có 3 mentors với kỹ năng thực từ ONET database.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import engine
from app.core.security import hash_password

# ── Mentor data per career group ─────────────────────────────────
MENTOR_GROUPS = [
    {
        "group": "Computer and Mathematical",
        "mentors": [
            {"name": "Nguyen Minh Khoa", "position": "Senior Software Engineer", "company": "FPT Software",
             "bio": "10 nam kinh nghiem phat trien phan mem, chuyen ve backend va cloud architecture.",
             "skills": ["Python", "Java", "Microservices", "AWS", "Docker", "Kubernetes", "REST API", "SQL", "Git"],
             "exp": 10},
            {"name": "Tran Thi Lan Anh", "position": "Data Scientist", "company": "VinAI Research",
             "bio": "Chuyen gia Machine Learning va AI, tung lam viec tai Singapore va Viet Nam.",
             "skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "Data Analysis", "Statistics", "NLP"],
             "exp": 7},
            {"name": "Le Van Duc", "position": "Cybersecurity Analyst", "company": "Viettel Cyber Security",
             "bio": "Chuyen gia bao mat mang va kiem thu xam nhap voi 8 nam kinh nghiem.",
             "skills": ["Network Security", "Penetration Testing", "SIEM", "Python", "Linux", "Firewall", "Incident Response"],
             "exp": 8},
        ]
    },
    {
        "group": "Business and Financial Operations",
        "mentors": [
            {"name": "Pham Hoang Nam", "position": "Financial Analyst", "company": "Techcombank",
             "bio": "Phan tich tai chinh doanh nghiep, mo hinh dinh gia va quan ly rui ro.",
             "skills": ["Financial Modeling", "Excel", "SQL", "Risk Analysis", "Bloomberg", "Accounting", "Forecasting"],
             "exp": 8},
            {"name": "Vo Thi Thu Hoa", "position": "Business Analyst", "company": "Momo",
             "bio": "Phan tich yeu cau nghiep vu, cau noi giua business va IT trong fintech.",
             "skills": ["Requirements Analysis", "SQL", "Tableau", "PowerBI", "Process Modeling", "Agile", "JIRA"],
             "exp": 6},
            {"name": "Dinh Quoc Bao", "position": "Senior Accountant", "company": "Deloitte Vietnam",
             "bio": "Ke toan cao cap, kiem toan tai chinh va tu van thue cho doanh nghiep lon.",
             "skills": ["Accounting", "Auditing", "Tax", "IFRS", "SAP", "Financial Reporting", "Excel"],
             "exp": 9},
        ]
    },
    {
        "group": "Management",
        "mentors": [
            {"name": "Nguyen Van Thanh", "position": "Product Manager", "company": "Tiki",
             "bio": "PM e-commerce voi 8 nam kinh nghiem, qua ly san pham tu 0 len 1 trieu users.",
             "skills": ["Product Strategy", "Agile", "Scrum", "Data Analysis", "User Research", "Roadmap", "OKRs"],
             "exp": 8},
            {"name": "Bui Thi Ngoc Mai", "position": "Operations Manager", "company": "Grab Vietnam",
             "bio": "Quan ly van hanh quy mo lon, toi uu quy trinh va nang cao hieu suat team.",
             "skills": ["Operations Management", "Process Improvement", "Leadership", "KPI", "Lean", "Six Sigma"],
             "exp": 10},
            {"name": "Hoang Minh Tuan", "position": "General Manager", "company": "Vinfast",
             "bio": "Quan ly toan dien don vi kinh doanh, chien luoc va phat trien to chuc.",
             "skills": ["Strategic Planning", "P&L Management", "Team Leadership", "Business Development", "Negotiation"],
             "exp": 12},
        ]
    },
    {
        "group": "Healthcare Practitioners and Technical",
        "mentors": [
            {"name": "Dr. Nguyen Thi Phuong", "position": "Medical Doctor", "company": "Benh vien Bach Mai",
             "bio": "Bac si noi khoa voi 12 nam kinh nghiem lam sang, nghien cuu y hoc.",
             "skills": ["Clinical Medicine", "Diagnosis", "Patient Care", "Internal Medicine", "Medical Research", "EMR"],
             "exp": 12},
            {"name": "Le Thi Kim Chi", "position": "Registered Nurse", "company": "Vinmec International Hospital",
             "bio": "Dieu duong cap cao chuyen khoa ICU, dao tao ky nang dieu duong lam sang.",
             "skills": ["Patient Care", "ICU", "Medical Procedures", "Clinical Assessment", "Healthcare Documentation"],
             "exp": 9},
            {"name": "Tran Quoc Viet", "position": "Pharmacist", "company": "Pharmacity",
             "bio": "Duoc si lam sang voi chuyen mon ve duoc lieu, tu van thuoc va quan ly nha thuoc.",
             "skills": ["Pharmacology", "Drug Dispensing", "Patient Counseling", "Medication Management", "Pharmacy Operations"],
             "exp": 7},
        ]
    },
    {
        "group": "Educational Instruction and Library",
        "mentors": [
            {"name": "Nguyen Thi Bich Ngoc", "position": "University Lecturer", "company": "Dai hoc Quoc gia Ha Noi",
             "bio": "Giang vien dai hoc, nghien cuu khoa hoc giao duc va phuong phap day hoc hien dai.",
             "skills": ["Teaching", "Curriculum Development", "Research", "Academic Writing", "Instructional Design", "E-learning"],
             "exp": 11},
            {"name": "Pham Van Hung", "position": "High School Teacher", "company": "Truong THPT Chu Van An",
             "bio": "Giao vien toan 15 nam kinh nghiem, chuyen gia on thi dai hoc va giao duc STEM.",
             "skills": ["Mathematics", "Teaching", "Curriculum Planning", "Student Assessment", "STEM Education"],
             "exp": 15},
            {"name": "Le Thi Thanh Loan", "position": "Instructional Designer", "company": "Topica",
             "bio": "Thiet ke chuong trinh hoc truc tuyen, ung dung cong nghe vao giao duc.",
             "skills": ["Instructional Design", "E-learning", "LMS", "Video Production", "Content Development", "Articulate 360"],
             "exp": 6},
        ]
    },
    {
        "group": "Architecture and Engineering",
        "mentors": [
            {"name": "Vo Dinh Khanh", "position": "Civil Engineer", "company": "Cienco 4",
             "bio": "Ky su cau duong 10 nam kinh nghiem, du an ha tang giao thong lon.",
             "skills": ["AutoCAD", "Civil 3D", "Structural Analysis", "Project Management", "Construction Management"],
             "exp": 10},
            {"name": "Nguyen Thi Huong Giang", "position": "Architect", "company": "Vo Trong Nghia Architects",
             "bio": "Kien truc su thiet ke cong trinh xanh, noi tieng voi kien truc tre va hien dai.",
             "skills": ["AutoCAD", "Revit", "SketchUp", "3D Max", "Green Architecture", "Urban Design", "BIM"],
             "exp": 8},
            {"name": "Tran Minh Hai", "position": "Electrical Engineer", "company": "EVN",
             "bio": "Ky su dien, chuyen ve he thong dien cong nghiep va nang luong tai tao.",
             "skills": ["Electrical Systems", "AutoCAD Electrical", "PLC", "SCADA", "Power Systems", "Renewable Energy"],
             "exp": 9},
        ]
    },
    {
        "group": "Arts, Design, Entertainment, Sports, and Media",
        "mentors": [
            {"name": "Dao Thi Minh Hoa", "position": "UX/UI Designer", "company": "KMS Technology",
             "bio": "Designer voi 7 nam kinh nghiem thiet ke san pham so, chuyen Figma va Design Systems.",
             "skills": ["Figma", "UI Design", "UX Research", "Prototyping", "Design Systems", "Adobe XD", "User Testing"],
             "exp": 7},
            {"name": "Nguyen Hoang Long", "position": "Graphic Designer", "company": "Ogilvy Vietnam",
             "bio": "Designer sang tao trong linh vuc quang cao, brand identity va digital marketing.",
             "skills": ["Photoshop", "Illustrator", "InDesign", "Brand Design", "Typography", "Print Design", "Digital Art"],
             "exp": 8},
            {"name": "Pham Thi Bao Chau", "position": "Content Creator", "company": "VTV Digital",
             "bio": "Producer noi dung so va video, chuyen san xuat phim tai lieu va short-form content.",
             "skills": ["Video Production", "Premiere Pro", "After Effects", "Storytelling", "Social Media", "YouTube Strategy"],
             "exp": 6},
        ]
    },
    {
        "group": "Sales and Related",
        "mentors": [
            {"name": "Le Van Quang", "position": "Sales Manager", "company": "Sacombank",
             "bio": "Quan ly doi kinh doanh B2B voi 9 nam kinh nghiem, chuyen gia dao tao sales.",
             "skills": ["B2B Sales", "CRM", "Negotiation", "Account Management", "Sales Forecasting", "Team Management"],
             "exp": 9},
            {"name": "Truong Thi Lan", "position": "Business Development Manager", "company": "VNG Corporation",
             "bio": "Phat trien kinh doanh, xay dung doi tac chien luoc trong linh vuc cong nghe.",
             "skills": ["Business Development", "Partnership", "Market Analysis", "Proposal Writing", "Networking", "CRM"],
             "exp": 7},
            {"name": "Ngo Duc Minh", "position": "E-commerce Manager", "company": "Lazada Vietnam",
             "bio": "Quan ly san E-commerce, toi uu hoa ti le chuyen doi va chien luoc thuong mai dien tu.",
             "skills": ["E-commerce", "Digital Marketing", "SEO", "Data Analysis", "Shopee", "Lazada", "Performance Marketing"],
             "exp": 6},
        ]
    },
    {
        "group": "Community and Social Service",
        "mentors": [
            {"name": "Nguyen Thi Lan Phuong", "position": "Social Worker", "company": "UNICEF Vietnam",
             "bio": "Chuyen gia cong tac xa hoi, bao ve tre em va ho tro gia dinh kho khan.",
             "skills": ["Social Work", "Case Management", "Community Outreach", "Counseling", "Program Development", "NGO"],
             "exp": 8},
            {"name": "Tran Duc Anh", "position": "Counseling Psychologist", "company": "Phong kham tam ly Ha Noi",
             "bio": "Chuyen gia tam ly lam sang, tu van tam ly ca nhan va nhom.",
             "skills": ["Psychology", "Counseling", "CBT", "Mental Health", "Crisis Intervention", "Group Therapy"],
             "exp": 7},
            {"name": "Vo Thi Kim Ngan", "position": "Community Development Officer", "company": "CARE Vietnam",
             "bio": "Phat trien cong dong tai dia phuong kho khan, tu van chinh sach xa hoi.",
             "skills": ["Community Development", "Project Management", "Stakeholder Engagement", "Report Writing", "M&E"],
             "exp": 6},
        ]
    },
    {
        "group": "Legal",
        "mentors": [
            {"name": "Luong Van Khanh", "position": "Corporate Lawyer", "company": "VILAF Law Firm",
             "bio": "Luat su doanh nghiep 10 nam kinh nghiem, chuyen M&A, dau tu nuoc ngoai, hop dong.",
             "skills": ["Corporate Law", "M&A", "Contract Law", "FDI", "Litigation", "Legal Research", "Due Diligence"],
             "exp": 10},
            {"name": "Nguyen Thi My Duyen", "position": "Legal Consultant", "company": "Ernst & Young Vietnam",
             "bio": "Tu van phap ly thue va luat doanh nghiep, ho tro startup va doanh nghiep lon.",
             "skills": ["Tax Law", "Business Law", "Compliance", "Legal Advisory", "Contract Drafting", "Regulatory"],
             "exp": 8},
            {"name": "Do Xuan Trung", "position": "IP Attorney", "company": "IP Vietnam",
             "bio": "Luat su so huu tri tue, dang ky nhan hieu, sang che va quyen tac gia.",
             "skills": ["Intellectual Property", "Patent Law", "Trademark", "Copyright", "IP Strategy", "Legal Drafting"],
             "exp": 7},
        ]
    },
    {
        "group": "Life, Physical, and Social Science",
        "mentors": [
            {"name": "Dr. Tran Thi Thanh Hoa", "position": "Research Scientist", "company": "Vien Khoa hoc Viet Nam",
             "bio": "Nghien cuu khoa hoc co ban, chuyen hoa sinh phan tu va cong nghe sinh hoc.",
             "skills": ["Research", "Laboratory Skills", "Data Analysis", "Scientific Writing", "Biochemistry", "PCR", "ELISA"],
             "exp": 11},
            {"name": "Pham Quoc Thinh", "position": "Environmental Scientist", "company": "Trung tam Quan trac Moi truong",
             "bio": "Chuyen gia moi truong, danh gia tac dong moi truong va xu ly nuoc thai.",
             "skills": ["Environmental Assessment", "Water Quality", "GIS", "Environmental Monitoring", "Report Writing", "ISO 14001"],
             "exp": 8},
            {"name": "Le Thi Bich Phuong", "position": "Social Researcher", "company": "ISEAS Vietnam",
             "bio": "Nghien cuu xa hoi hoc, chuyen ve phuong phap nghien cuu dinh tinh va dinh luong.",
             "skills": ["Social Research", "SPSS", "Survey Design", "Qualitative Research", "Data Analysis", "Academic Writing"],
             "exp": 7},
        ]
    },
    {
        "group": "Healthcare Support",
        "mentors": [
            {"name": "Nguyen Van Phuc", "position": "Physical Therapist", "company": "Benh vien Phuc hoi chuc nang",
             "bio": "Chuyen gia vat ly tri lieu, phuc hoi chuc nang cho benh nhan tai nan va phau thuat.",
             "skills": ["Physical Therapy", "Rehabilitation", "Exercise Therapy", "Manual Therapy", "Patient Assessment"],
             "exp": 8},
            {"name": "Bui Thi Xuan", "position": "Medical Laboratory Technician", "company": "Medlatec",
             "bio": "Ky thuat vien xet nghiem y khoa, chuyen phan tich mau va sinh hoa lam sang.",
             "skills": ["Laboratory Analysis", "Hematology", "Biochemistry", "Medical Devices", "Quality Control", "PCR"],
             "exp": 6},
            {"name": "Cao Thi Phuong Linh", "position": "Occupational Therapist", "company": "Benh vien Nhi Trung uong",
             "bio": "Nha tri lieu nghe nghiep cho tre em va nguoi lon, chuyen phuc hoi chuc nang ban tay.",
             "skills": ["Occupational Therapy", "Pediatric Therapy", "ADL Training", "Sensory Integration", "Home Modification"],
             "exp": 5},
        ]
    },
    {
        "group": "Transportation and Material Moving",
        "mentors": [
            {"name": "Nguyen Dinh Cuong", "position": "Logistics Manager", "company": "DHL Express Vietnam",
             "bio": "Quan ly logistics va chuoi cung ung, toi uu van chuyen va kho van 10 nam.",
             "skills": ["Logistics", "Supply Chain", "Warehouse Management", "SAP", "Route Optimization", "3PL Management"],
             "exp": 10},
            {"name": "Tran Thanh Binh", "position": "Supply Chain Analyst", "company": "Samsung Vietnam",
             "bio": "Phan tich chuoi cung ung toan cau, toi uu ton kho va giam chi phi van chuyen.",
             "skills": ["Supply Chain Analysis", "Demand Forecasting", "ERP", "Excel", "PowerBI", "Lean Manufacturing"],
             "exp": 7},
            {"name": "Le Hoang Son", "position": "Fleet Manager", "company": "Viettel Post",
             "bio": "Quan ly doi xe, giam sat van chuyen va toi uu hieu qua doi giao hang.",
             "skills": ["Fleet Management", "Route Planning", "GPS Tracking", "Vehicle Maintenance", "Driver Management"],
             "exp": 8},
        ]
    },
    {
        "group": "Construction and Extraction",
        "mentors": [
            {"name": "Nguyen Huu Nghia", "position": "Construction Project Manager", "company": "Coteccons",
             "bio": "PM xay dung 12 nam kinh nghiem, chuyen quan ly thi cong cao tang va ha tang.",
             "skills": ["Construction Management", "AutoCAD", "MS Project", "Safety Management", "Cost Estimation", "BIM"],
             "exp": 12},
            {"name": "Pham Dinh Kien", "position": "Structural Engineer", "company": "AECOM Vietnam",
             "bio": "Ky su ket cau, tinh toan va thiet ke ket cau cong trinh dan dung va cong nghiep.",
             "skills": ["Structural Analysis", "ETABS", "SAP2000", "AutoCAD", "Revit Structure", "Concrete Design", "Steel Design"],
             "exp": 9},
            {"name": "Do Van Quyen", "position": "MEP Engineer", "company": "Hyundai Engineering Vietnam",
             "bio": "Ky su co dien lanh, thiet ke he thong MEP cho cong trinh thuong mai va khu dan cu.",
             "skills": ["MEP Engineering", "HVAC", "Plumbing", "Electrical Systems", "AutoCAD MEP", "Revit MEP", "Fire Protection"],
             "exp": 8},
        ]
    },
    {
        "group": "Office and Administrative Support",
        "mentors": [
            {"name": "Truong Thi Bich Nhu", "position": "Office Manager", "company": "Masan Group",
             "bio": "Quan ly van phong va hanh chinh cho tap doan lon, to chuc su kien noi bo.",
             "skills": ["Office Management", "Administrative Support", "Excel", "Document Management", "Event Planning", "HR Support"],
             "exp": 8},
            {"name": "Nguyen Thi Quynh Trang", "position": "Executive Assistant", "company": "Vingroup",
             "bio": "Thu ky dieu hanh cap cao, ho tro CEO va BOD, quan ly lich trinh va tai lieu mat.",
             "skills": ["Executive Support", "Calendar Management", "Travel Coordination", "Confidential Handling", "MS Office", "English"],
             "exp": 7},
            {"name": "Ha Minh Duc", "position": "HR Administrator", "company": "Unilever Vietnam",
             "bio": "Quan ly nhan su, tuyen dung va phat trien nhan su cho cong ty nuoc ngoai.",
             "skills": ["HR Management", "Recruitment", "Payroll", "Labor Law", "HRIS", "Performance Review", "Training"],
             "exp": 6},
        ]
    },
    {
        "group": "Production",
        "mentors": [
            {"name": "Tran Van Minh", "position": "Production Manager", "company": "Hoa Phat Group",
             "bio": "Quan ly san xuat cong nghiep nang 10 nam, toi uu hieu suat nha may.",
             "skills": ["Production Management", "Lean Manufacturing", "Six Sigma", "ISO 9001", "5S", "TPM", "OEE"],
             "exp": 10},
            {"name": "Nguyen Thi Hong Hanh", "position": "Quality Manager", "company": "Phu Nhuan Jewelry",
             "bio": "Quan ly chat luong san pham, xay dung he thong QC/QA cho nganh san xuat.",
             "skills": ["Quality Management", "ISO 9001", "QC Tools", "Statistical Process Control", "Auditing", "FMEA"],
             "exp": 8},
            {"name": "Le Quoc Hung", "position": "Industrial Engineer", "company": "Toyota Vietnam",
             "bio": "Ky su cong nghiep, thiet ke quy trinh san xuat va toi uu hoa nang suat lao dong.",
             "skills": ["Industrial Engineering", "Process Design", "Time Study", "AutoCAD", "Lean", "Kaizen", "Ergonomics"],
             "exp": 9},
        ]
    },
    {
        "group": "Installation, Maintenance, and Repair",
        "mentors": [
            {"name": "Nguyen Thanh Tung", "position": "HVAC Technician", "company": "Daikin Vietnam",
             "bio": "Ky thuat vien lanh may lanh, bao tri va lap dat he thong dieu hoa cong nghiep.",
             "skills": ["HVAC", "Refrigeration", "Electrical Systems", "Troubleshooting", "Preventive Maintenance", "Safety"],
             "exp": 8},
            {"name": "Pham Ngoc Tien", "position": "Automotive Mechanic", "company": "Toyota Service Center",
             "bio": "Ky thuat vien o to, chuyen sua chua dong co va he thong dien o to hien dai.",
             "skills": ["Automotive Repair", "Engine Diagnostics", "OBD", "Electrical Systems", "Brake Systems", "Hybrid Technology"],
             "exp": 10},
            {"name": "Vo Thi Thu Ha", "position": "IT Support Technician", "company": "CMC Telecom",
             "bio": "Ho tro ky thuat IT, quan tri mang LAN/WAN va xu ly su co phan cung.",
             "skills": ["IT Support", "Network Administration", "Windows Server", "Linux", "Help Desk", "Hardware Troubleshooting"],
             "exp": 6},
        ]
    },
    {
        "group": "Protective Service",
        "mentors": [
            {"name": "Tran Van Son", "position": "Security Manager", "company": "G4S Vietnam",
             "bio": "Quan ly an ninh bao ve cho khu cong nghiep va toa nha van phong.",
             "skills": ["Security Management", "Risk Assessment", "CCTV", "Access Control", "Emergency Response", "Team Leadership"],
             "exp": 12},
            {"name": "Nguyen Thi Thu Hien", "position": "Fire Safety Officer", "company": "Chubb Fire",
             "bio": "Chuyen gia an toan chay no, kiem tra va dao tao phong chay chua chay.",
             "skills": ["Fire Safety", "Safety Inspection", "Emergency Planning", "Training", "NFPA Standards", "Risk Assessment"],
             "exp": 8},
            {"name": "Le Dinh Phuong", "position": "Industrial Safety Inspector", "company": "Ministry of Labor",
             "bio": "Thanh tra an toan lao dong, tuan thu quy dinh ATLDD va phat hien rui ro.",
             "skills": ["Industrial Safety", "OSHA", "Safety Auditing", "Risk Management", "Investigation", "Training"],
             "exp": 9},
        ]
    },
    {
        "group": "Personal Care and Service",
        "mentors": [
            {"name": "Nguyen Thi Kieu Trang", "position": "Hotel Manager", "company": "Vinpearl Hotel",
             "bio": "Quan ly khach san 5 sao, dich vu khach hang va van hanh khach san cao cap.",
             "skills": ["Hotel Management", "Customer Service", "Revenue Management", "PMS", "Staff Training", "F&B"],
             "exp": 9},
            {"name": "Bui Thi Ngoc Anh", "position": "Beauty Salon Manager", "company": "Lan Anh Beauty",
             "bio": "Chuyen gia lam dep, quan ly salon toc va spa voi tieu chuan quoc te.",
             "skills": ["Cosmetology", "Salon Management", "Customer Relations", "Beauty Techniques", "Inventory Management"],
             "exp": 7},
            {"name": "Hoang Van Lam", "position": "Fitness Trainer", "company": "California Fitness",
             "bio": "Huan luyen vien the luc ca nhan, dinh duong the thao va suc khoe toan dien.",
             "skills": ["Personal Training", "Fitness Assessment", "Nutrition", "Exercise Programming", "Injury Prevention", "Coaching"],
             "exp": 6},
        ]
    },
    {
        "group": "Food Preparation and Serving Related",
        "mentors": [
            {"name": "Tran Thi Cam Tu", "position": "Executive Chef", "company": "Sofitel Legend Metropole",
             "bio": "Bep truong khach san 5 sao, chuyen am thuc Viet Nam hien dai va am thuc tay.",
             "skills": ["Culinary Arts", "Menu Development", "Food Safety", "Kitchen Management", "Cost Control", "HACCP"],
             "exp": 14},
            {"name": "Nguyen Van Loc", "position": "Restaurant Manager", "company": "Pho 24",
             "bio": "Quan ly nha hang chuoi, dich vu khach hang va van hanh F&B chuyen nghiep.",
             "skills": ["Restaurant Management", "Customer Service", "Staff Training", "POS Systems", "Inventory", "Scheduling"],
             "exp": 8},
            {"name": "Do Thi Bich Hang", "position": "Pastry Chef", "company": "Marriott Vietnam",
             "bio": "Bep truong banh ngot, chuyen banh phap va chocolate cho khach san quoc te.",
             "skills": ["Pastry Arts", "Chocolate Work", "Bread Making", "Plating", "Food Costing", "Allergen Management"],
             "exp": 9},
        ]
    },
    {
        "group": "Farming, Fishing, and Forestry",
        "mentors": [
            {"name": "Nguyen Van Toan", "position": "Agricultural Engineer", "company": "Lam Dong Department of Agriculture",
             "bio": "Ky su nong nghiep, chuyen trong rau sach cong nghe cao va nong nghiep huu co.",
             "skills": ["Agriculture", "Crop Management", "Soil Science", "Hydroponics", "Irrigation", "Pest Management"],
             "exp": 10},
            {"name": "Le Thi Hoa", "position": "Aquaculture Technician", "company": "Minh Phu Seafood",
             "bio": "Ky thuat nuoi trong thuy san, chuyen ve tom và ca tra xuat khau.",
             "skills": ["Aquaculture", "Fish Farming", "Water Quality", "Feed Management", "Disease Control", "Export Standards"],
             "exp": 8},
            {"name": "Pham Dinh Son", "position": "Forestry Officer", "company": "Vietnam Forestry University",
             "bio": "Chuyen gia lam nghiep, quan ly rung ben vung va phuc hoi he sinh thai.",
             "skills": ["Forestry", "Forest Management", "GIS", "Carbon Credit", "Biodiversity", "REDD+", "Remote Sensing"],
             "exp": 9},
        ]
    },
    {
        "group": "Building and Grounds Cleaning and Maintenance",
        "mentors": [
            {"name": "Tran Van Cuong", "position": "Facilities Manager", "company": "Savills Property Management",
             "bio": "Quan ly toa nha van phong hang A, bao tri he thong ky thuat va ve sinh cong nghiep.",
             "skills": ["Facilities Management", "Building Maintenance", "HVAC", "Electrical", "Contract Management", "BMS"],
             "exp": 10},
            {"name": "Nguyen Thi Lan", "position": "Cleaning Supervisor", "company": "ISS Facility Services",
             "bio": "Giam sat dich vu ve sinh cong nghiep cho trung tam thuong mai va khu cong nghiep.",
             "skills": ["Cleaning Services", "Team Supervision", "Chemical Safety", "Quality Control", "Scheduling", "Training"],
             "exp": 7},
            {"name": "Ho Van Quoc", "position": "Landscape Designer", "company": "Hoa Vien Landscaping",
             "bio": "Thiet ke canh quan va cham soc cay xanh cho du an bat dong san cao cap.",
             "skills": ["Landscape Design", "Plant Knowledge", "Irrigation Systems", "AutoCAD", "Project Management", "Sustainability"],
             "exp": 8},
        ]
    },
]


def create_mentor_user(db, email: str, full_name: str, index: int) -> int:
    """Create a new user for a mentor, return user_id."""
    pwd = hash_password("MentorPass2026!")
    result = db.execute(text("""
        INSERT INTO core.users (email, full_name, password_hash, role, created_at)
        VALUES (:email, :name, :pwd, 'user', NOW())
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id
    """), {"email": email, "name": full_name, "pwd": pwd})
    db.flush()
    row = result.fetchone()
    return row[0] if row else None


def seed():
    total_created = 0
    total_skipped = 0

    with Session(engine) as db:
        for group_data in MENTOR_GROUPS:
            group = group_data["group"]
            print(f"\n[Group] {group}")

            for i, m in enumerate(group_data["mentors"]):
                email = f"mentor_{group.lower().replace(' ', '_').replace(',', '').replace('and', '')[:20]}_{i+1}@careerdev.vn"
                email = email.replace("__", "_")

                # Create user
                user_id = create_mentor_user(db, email, m["name"], i)
                if not user_id:
                    print(f"  [SKIP] Could not create user for {m['name']}")
                    total_skipped += 1
                    continue

                # Check if mentor profile exists
                existing = db.execute(text(
                    "SELECT id FROM core.mentor_profiles WHERE user_id = :uid"
                ), {"uid": user_id}).fetchone()

                if existing:
                    total_skipped += 1
                    print(f"  [SKIP] {m['name']} already has mentor profile")
                    continue

                # Create mentor profile — use psycopg2 array literal
                from sqlalchemy import text as _t
                skills_literal = "{" + ",".join(f'"{s}"' for s in m["skills"]) + "}"
                db.execute(_t("""
                    INSERT INTO core.mentor_profiles
                    (user_id, full_name, current_position, company, bio, expertise_areas,
                     experience_years, available_hours_per_week, preferred_communication,
                     max_mentees, current_mentees_count, is_active, created_at, updated_at)
                    VALUES (:uid, :name, :pos, :co, :bio, CAST(:skills AS text[]),
                            :exp, 4, ARRAY['video','chat'], 5, 0, true, NOW(), NOW())
                """), {
                    "uid": user_id,
                    "name": m["name"],
                    "pos": m["position"],
                    "co": m["company"],
                    "bio": m["bio"],
                    "skills": skills_literal,
                    "exp": m["exp"],
                })

                total_created += 1
                print(f"  [OK] {m['name']} — {m['position']} @ {m['company']}")

        db.commit()

    print(f"\n{'='*50}")
    print(f"DONE: {total_created} mentors created, {total_skipped} skipped")
    print(f"Total career groups covered: {len(MENTOR_GROUPS)}")

    # Rebuild Neo4j graph
    print("\nRebuilding Neo4j graph...")
    try:
        from build_career_graph import (
            create_indexes, build_career_nodes, build_mentor_nodes,
            build_mentee_nodes, build_roadmap_progress, build_assessment_interests
        )
        create_indexes()
        build_career_nodes()
        build_mentor_nodes()
        build_mentee_nodes()
        build_roadmap_progress()
        build_assessment_interests()
        print("Neo4j graph rebuilt successfully!")
    except Exception as e:
        print(f"Neo4j rebuild failed (can run manually): {e}")


if __name__ == '__main__':
    seed()
