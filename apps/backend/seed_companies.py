# -*- coding: utf-8 -*-
"""
seed_companies.py
=================
Doc career_groups.csv va seed cong ty tuyen dung theo tung nhom nganh nghe.
Moi cong ty co: ten, mo ta, vi tri, URL tuyen dung (careers page, LinkedIn,
VietnamWorks, TopCV, ITViec, JobStreet).

Chay: python seed_companies.py
"""
import os, sys, csv
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.orm import Session
from app.core.db import engine, Base
from app.modules.companies.models import Company

# Auto-create table
try:
    Base.metadata.create_all(bind=engine, tables=[Company.__table__])
    print("[OK] companies table ready")
except Exception as e:
    print(f"[WARN] Table init: {e}")

# ==============================================================
#  CAREER GROUPS (from career_groups.csv)
# ==============================================================
GROUPS = [
    {"id":  1, "slug": "management",           "name": "Quan ly",               "onet": "11"},
    {"id":  2, "slug": "business-finance",     "name": "Kinh doanh & Tai chinh", "onet": "13"},
    {"id":  3, "slug": "computer-math",        "name": "Cong nghe thong tin",    "onet": "15"},
    {"id":  4, "slug": "architecture-engineering","name":"Kien truc & Ky thuat", "onet": "17"},
    {"id":  5, "slug": "life-science",         "name": "Khoa hoc tu nhien",      "onet": "19"},
    {"id":  6, "slug": "community-social",     "name": "Dich vu cong dong",      "onet": "21"},
    {"id":  7, "slug": "legal",                "name": "Phap ly",                "onet": "23"},
    {"id":  8, "slug": "education",            "name": "Giao duc",               "onet": "25"},
    {"id":  9, "slug": "arts-media",           "name": "Nghe thuat & Truyen thong","onet":"27"},
    {"id": 10, "slug": "healthcare-practitioners","name":"Y te chuyen nghiep",   "onet": "29"},
    {"id": 11, "slug": "healthcare-support",   "name": "Ho tro y te",            "onet": "31"},
    {"id": 12, "slug": "protective-service",   "name": "Dich vu bao ve",         "onet": "33"},
    {"id": 13, "slug": "food-service",         "name": "Dich vu an uong",        "onet": "35"},
    {"id": 14, "slug": "building-maintenance", "name": "Bao tri toa nha",        "onet": "37"},
    {"id": 15, "slug": "personal-care",        "name": "Cham soc ca nhan",       "onet": "39"},
    {"id": 16, "slug": "sales",                "name": "Ban hang",               "onet": "41"},
    {"id": 17, "slug": "office-admin",         "name": "Hanh chinh van phong",   "onet": "43"},
    {"id": 18, "slug": "farming-forestry",     "name": "Nong nghiep & Lam nghiep","onet":"45"},
    {"id": 19, "slug": "construction",         "name": "Xay dung",               "onet": "47"},
    {"id": 20, "slug": "installation-repair",  "name": "Lap dat & Sua chua",     "onet": "49"},
    {"id": 21, "slug": "production",           "name": "San xuat",               "onet": "51"},
    {"id": 22, "slug": "transportation",       "name": "Van tai",                "onet": "53"},
]

# ==============================================================
#  COMPANIES — keyed by career_group_slug
#  Fields: name, name_vi, description, industry, size, location,
#          careers_url, linkedin_url, vietnamworks_url, topcv_url,
#          itviec_url, jobstreet_url, other_url
# ==============================================================
COMPANIES = {

    # ── 1. Quản lý ────────────────────────────────────────────────
    "management": [
        {"name":"Vingroup","name_vi":"Tập đoàn Vingroup","industry":"Conglomerate","size":"enterprise",
         "location":"Nationwide","description":"Tap doan tu nhan lon nhat Viet Nam. Tuyen quan ly cap trung va cao.",
         "careers_url":"https://careers.vingroup.net","linkedin_url":"https://www.linkedin.com/company/vingroup/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vingroup","topcv_url":"https://www.topcv.vn/cong-ty/vingroup"},
        {"name":"FPT Corporation","name_vi":"Tập đoàn FPT","industry":"Technology & Retail","size":"enterprise",
         "location":"Nationwide","description":"Tap doan cong nghe hang dau. Co hoi quan ly da nganh.",
         "careers_url":"https://fpt.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/fpt-corporation/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/fpt-corporation","topcv_url":"https://www.topcv.vn/cong-ty/fpt"},
        {"name":"Masan Group","name_vi":"Tập đoàn Masan","industry":"FMCG & Retail","size":"enterprise",
         "location":"HCM / Hanoi","description":"Tap doan tieu dung hang dau. Nhieu co hoi quan ly chuoi ban le.",
         "careers_url":"https://masangroup.com/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/masan-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/masan-group","topcv_url":"https://www.topcv.vn/cong-ty/masan"},
        {"name":"Hoa Phat Group","name_vi":"Tập đoàn Hòa Phát","industry":"Steel & Manufacturing","size":"enterprise",
         "location":"Nationwide","description":"Tap doan thep lon nhat Viet Nam. Tuyen quan ly san xuat va van hanh.",
         "careers_url":"https://hoaphat.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hoa-phat-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/hoa-phat","topcv_url":"https://www.topcv.vn/cong-ty/tap-doan-hoa-phat"},
        {"name":"Thaco Group","name_vi":"Trường Hải Auto","industry":"Automotive","size":"enterprise",
         "location":"Nationwide","description":"Tap doan o to va ban le hang dau. Nhieu vi tri quan ly cap cao.",
         "careers_url":"https://thaco.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/thaco/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/thaco","topcv_url":"https://www.topcv.vn/cong-ty/thaco"},
    ],

    # ── 2. Kinh doanh & Tài chính ─────────────────────────────────
    "business-finance": [
        {"name":"Vietcombank","name_vi":"Ngân hàng Ngoại thương Việt Nam","industry":"Banking","size":"enterprise",
         "location":"Nationwide","description":"Ngan hang lon nhat Viet Nam. Tuyen phan tich tai chinh, tin dung.",
         "careers_url":"https://vietcombank.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vietcombank/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vietcombank","topcv_url":"https://www.topcv.vn/cong-ty/vietcombank"},
        {"name":"Techcombank","name_vi":"Ngân hàng Kỹ thương","industry":"Banking","size":"enterprise",
         "location":"HCM / Hanoi","description":"Ngan hang tu nhan hang dau. Chuyen tuyen phan tich RI, kinh doanh.",
         "careers_url":"https://careers.techcombank.com.vn","linkedin_url":"https://www.linkedin.com/company/techcombank/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/techcombank","topcv_url":"https://www.topcv.vn/cong-ty/techcombank"},
        {"name":"PricewaterhouseCoopers Vietnam","name_vi":"PwC Việt Nam","industry":"Consulting","size":"large",
         "location":"HCM / Hanoi","description":"Big4 kiem toan. Tuyen audit, tax, advisory, business consulting.",
         "careers_url":"https://www.pwc.com/vn/en/careers.html","linkedin_url":"https://www.linkedin.com/company/pwc/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/pwc","topcv_url":"https://www.topcv.vn/cong-ty/pwc-vietnam"},
        {"name":"Deloitte Vietnam","name_vi":"Deloitte Việt Nam","industry":"Consulting","size":"large",
         "location":"HCM / Hanoi","description":"Big4 kiem toan. Vi tri phan tich RI, tu van tai chinh, kiem toan.",
         "careers_url":"https://www2.deloitte.com/vn/en/pages/careers/","linkedin_url":"https://www.linkedin.com/company/deloitte/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/deloitte-vietnam","topcv_url":"https://www.topcv.vn/cong-ty/deloitte-vietnam"},
        {"name":"KPMG Vietnam","name_vi":"KPMG Việt Nam","industry":"Consulting","size":"large",
         "location":"HCM / Hanoi","description":"Big4 kiem toan. Tuyen chuyen vien RI kiem toan va tu van.",
         "careers_url":"https://home.kpmg/vn/en/home/careers.html","linkedin_url":"https://www.linkedin.com/company/kpmg/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/kpmg-vietnam","topcv_url":"https://www.topcv.vn/cong-ty/kpmg"},
        {"name":"MoMo","name_vi":"Ví MoMo","industry":"Fintech","size":"large",
         "location":"HCM","description":"Vi dien tu hang dau Viet Nam. Tuyen tai chinh, product, risk analysis.",
         "careers_url":"https://momo.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/momo-e-wallet/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/momo","topcv_url":"https://www.topcv.vn/cong-ty/momo"},
    ],

    # ── 3. Công nghệ thông tin ────────────────────────────────────
    "computer-math": [
        {"name":"FPT Software","name_vi":"FPT Software","industry":"Software Outsourcing","size":"enterprise",
         "location":"Nationwide","description":"Cong ty phan mem lon nhat Viet Nam. Tuyen lap trinh vien, BA, QA.",
         "careers_url":"https://careers.fpt-software.com","linkedin_url":"https://www.linkedin.com/company/fpt-software/jobs/",
         "itviec_url":"https://itviec.com/companies/fpt-software","topcv_url":"https://www.topcv.vn/cong-ty/fpt-software"},
        {"name":"VNG Corporation","name_vi":"VNG Corporation","industry":"Internet Technology","size":"large",
         "location":"HCM","description":"Cong ty internet hang dau Viet Nam (Zalo). Tuyen backend, mobile, AI.",
         "careers_url":"https://www.vng.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vng/jobs/",
         "itviec_url":"https://itviec.com/companies/vng-corporation","topcv_url":"https://www.topcv.vn/cong-ty/vng"},
        {"name":"Tiki","name_vi":"Tiki","industry":"E-commerce","size":"large",
         "location":"HCM","description":"San TMDT lon nhat Viet Nam. Tuyen fullstack, data engineer, ML.",
         "careers_url":"https://tiki.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/tiki-vn/jobs/",
         "itviec_url":"https://itviec.com/companies/tiki","topcv_url":"https://www.topcv.vn/cong-ty/tiki"},
        {"name":"Shopee Vietnam","name_vi":"Shopee Việt Nam","industry":"E-commerce","size":"enterprise",
         "location":"HCM","description":"San TMDT lon. Tuyen backend Java/Go, data science, product.",
         "careers_url":"https://careers.shopee.vn","linkedin_url":"https://www.linkedin.com/company/shopee/jobs/",
         "itviec_url":"https://itviec.com/companies/shopee","vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/shopee"},
        {"name":"Grab Vietnam","name_vi":"Grab Việt Nam","industry":"Super App","size":"enterprise",
         "location":"HCM / Hanoi","description":"Ung dung goi xe, delivery. Tuyen SWE, ML engineer, data analyst.",
         "careers_url":"https://careers.grab.com","linkedin_url":"https://www.linkedin.com/company/grabapp/jobs/",
         "itviec_url":"https://itviec.com/companies/grab","topcv_url":"https://www.topcv.vn/cong-ty/grab"},
        {"name":"KMS Technology","name_vi":"KMS Technology","industry":"Software Services","size":"large",
         "location":"HCM","description":"Cong ty phan mem Viet-My. Tuyen fullstack, QA automation, DevOps.",
         "careers_url":"https://kms-technology.com/careers","linkedin_url":"https://www.linkedin.com/company/kms-technology/jobs/",
         "itviec_url":"https://itviec.com/companies/kms-technology","topcv_url":"https://www.topcv.vn/cong-ty/kms-technology"},
        {"name":"Axon Active Vietnam","name_vi":"Axon Active","industry":"Software Outsourcing","size":"large",
         "location":"Da Nang / HCM","description":"Phan mem outsourcing Thuy Si. Agile/Scrum, tuyen SWE, BA.",
         "careers_url":"https://axonactive.com/careers","linkedin_url":"https://www.linkedin.com/company/axon-active/jobs/",
         "itviec_url":"https://itviec.com/companies/axon-active","topcv_url":"https://www.topcv.vn/cong-ty/axon-active"},
        {"name":"Harvey Nash Vietnam","name_vi":"Harvey Nash Việt Nam","industry":"IT Staffing","size":"large",
         "location":"HCM / Hanoi","description":"Cong ty phan mem Anh. Nhieu vi tri tech va IT outsourcing.",
         "careers_url":"https://harveynashvietnam.com/careers","linkedin_url":"https://www.linkedin.com/company/harvey-nash/jobs/",
         "itviec_url":"https://itviec.com/companies/harvey-nash-vietnam","topcv_url":"https://www.topcv.vn/cong-ty/harvey-nash"},
    ],

    # ── 4. Kiến trúc & Kỹ thuật ──────────────────────────────────
    "architecture-engineering": [
        {"name":"Coteccons","name_vi":"Coteccons","industry":"Construction & Engineering","size":"enterprise",
         "location":"Nationwide","description":"Cong ty xay dung hang dau. Tuyen ky su kien truc, co dien.",
         "careers_url":"https://coteccons.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/coteccons/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/coteccons","topcv_url":"https://www.topcv.vn/cong-ty/coteccons"},
        {"name":"Hoa Binh Construction","name_vi":"Tập đoàn Xây dựng Hòa Bình","industry":"Construction","size":"enterprise",
         "location":"Nationwide","description":"Cong ty xay dung lon. Ky su ket cau, du toan, giam sat cong trinh.",
         "careers_url":"https://hoacom.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hoa-binh-construction-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/hoa-binh-construction","topcv_url":"https://www.topcv.vn/cong-ty/hoa-binh-group"},
        {"name":"Novaland","name_vi":"Novaland","industry":"Real Estate","size":"enterprise",
         "location":"HCM","description":"BDS cao cap. Tuyen ky su xay dung, kiem soat chat luong.",
         "careers_url":"https://novaland.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/novaland/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/novaland","topcv_url":"https://www.topcv.vn/cong-ty/novaland"},
        {"name":"EVN (Electricity of Vietnam)","name_vi":"EVN","industry":"Energy","size":"enterprise",
         "location":"Nationwide","description":"Tap doan dien luc quoc gia. Ky su dien, tu dong hoa, IT.",
         "careers_url":"https://evn.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/electricity-of-vietnam/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/evn","topcv_url":"https://www.topcv.vn/cong-ty/evn"},
        {"name":"Carrier Vietnam","name_vi":"Carrier Việt Nam","industry":"HVAC","size":"large",
         "location":"HCM / Hanoi","description":"Hang dieu hoa khong khi My. Ky su co dien lanh, bao tri.",
         "careers_url":"https://www.carrier.com/carrier/en/vietnam/careers/","linkedin_url":"https://www.linkedin.com/company/carrier/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/carrier","topcv_url":"https://www.topcv.vn/cong-ty/carrier"},
    ],

    # ── 5. Khoa học tự nhiên ──────────────────────────────────────
    "life-science": [
        {"name":"Viettel High Tech","name_vi":"Viettel High Tech","industry":"Defense Technology","size":"enterprise",
         "location":"Hanoi","description":"Nghien cuu cong nghe quoc phong. Tuyen ky su vat ly, hoa hoc, dien tu.",
         "careers_url":"https://viettelgroup.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/viettel/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/viettel","topcv_url":"https://www.topcv.vn/cong-ty/viettel"},
        {"name":"Syngenta Vietnam","name_vi":"Syngenta Việt Nam","industry":"Agriculture Science","size":"large",
         "location":"HCM","description":"Cong ty nong hoa hang dau. Tuyen nghien cuu thuc vat, hoa nong.",
         "careers_url":"https://www.syngenta.com/en/careers","linkedin_url":"https://www.linkedin.com/company/syngenta/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/syngenta-vietnam","topcv_url":"https://www.topcv.vn/cong-ty/syngenta"},
        {"name":"Bureau Veritas Vietnam","name_vi":"Bureau Veritas","industry":"Testing & Inspection","size":"large",
         "location":"HCM / Hanoi","description":"Kiem dinh chat luong quoc te. Tuyen ky thuat vien phong thi nghiem.",
         "careers_url":"https://www.bureauveritas.com/careers","linkedin_url":"https://www.linkedin.com/company/bureau-veritas/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/bureau-veritas","topcv_url":"https://www.topcv.vn/cong-ty/bureau-veritas"},
        {"name":"Viện Hàn lâm KH&CN Việt Nam","name_vi":"VAST","industry":"Research","size":"enterprise",
         "location":"Hanoi","description":"Vien nghien cuu khoa hoc quoc gia. Tuyen nghien cuu sinh vien tiến sĩ.",
         "careers_url":"https://vast.gov.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vietnam-academy-of-science-and-technology/jobs/",
         "other_url":"https://tuyensinh.vast.gov.vn"},
    ],

    # ── 6. Dịch vụ cộng đồng ─────────────────────────────────────
    "community-social": [
        {"name":"UNICEF Vietnam","name_vi":"UNICEF Việt Nam","industry":"International NGO","size":"large",
         "location":"Hanoi","description":"To chuc quoc te ve tre em. Tuyen chuyen gia xa hoi, truyen thong.",
         "careers_url":"https://www.unicef.org/vietnam/careers","linkedin_url":"https://www.linkedin.com/company/unicef/jobs/",
         "other_url":"https://jobs.unicef.org"},
        {"name":"Save the Children Vietnam","name_vi":"Save the Children","industry":"NGO","size":"large",
         "location":"Hanoi / Da Nang","description":"NGO te tre em. Cong tac xa hoi, giao duc, y te cong dong.",
         "careers_url":"https://www.savethechildren.net/careers","linkedin_url":"https://www.linkedin.com/company/save-the-children/jobs/",
         "other_url":"https://stcv.org/vn/careers"},
        {"name":"World Vision Vietnam","name_vi":"World Vision Việt Nam","industry":"NGO","size":"large",
         "location":"Nationwide","description":"NGO phat trien cong dong. Tuyen chuyen vien xa hoi, du an.",
         "careers_url":"https://www.worldvision.org.vn/careers","linkedin_url":"https://www.linkedin.com/company/world-vision/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/world-vision-vietnam"},
        {"name":"Plan International Vietnam","name_vi":"Plan International","industry":"NGO","size":"large",
         "location":"Hanoi","description":"To chuc quyen tre em va binh dang gioi. Tuyen du an, chuyen gia.",
         "careers_url":"https://plan-international.org/vietnam/careers","linkedin_url":"https://www.linkedin.com/company/plan-international/jobs/",
         "other_url":"https://plan-international.org/vietnam/jobs"},
    ],

    # ── 7. Pháp lý ────────────────────────────────────────────────
    "legal": [
        {"name":"Baker McKenzie Vietnam","name_vi":"Baker McKenzie","industry":"Law Firm","size":"large",
         "location":"HCM / Hanoi","description":"Cong ty luat quoc te. Tuyen luat su thuong mai, M&A, FDI.",
         "careers_url":"https://www.bakermckenzie.com/en/careers","linkedin_url":"https://www.linkedin.com/company/baker-mckenzie/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/baker-mckenzie","topcv_url":"https://www.topcv.vn/cong-ty/baker-mckenzie"},
        {"name":"Allens (Linklaters Vietnam)","name_vi":"Linklaters","industry":"Law Firm","size":"large",
         "location":"HCM","description":"Cong ty luat My-Uc. Tap trung FDI, nang luong, M&A.",
         "careers_url":"https://www.allens.com.au/careers","linkedin_url":"https://www.linkedin.com/company/allens/jobs/",
         "other_url":"https://www.linklaters.com/en/careers"},
        {"name":"Indochine Counsel","name_vi":"Indochine Counsel","industry":"Law Firm","size":"SME",
         "location":"HCM / Hanoi","description":"Cong ty luat noi dia hang dau. Thuong mai, dau tu, cong nghe.",
         "careers_url":"https://indochinecounsel.com/careers","linkedin_url":"https://www.linkedin.com/company/indochine-counsel/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/indochine-counsel"},
        {"name":"HSBC Vietnam Legal","name_vi":"HSBC Legal","industry":"Banking Legal","size":"enterprise",
         "location":"HCM","description":"Phong phap ly ngan hang HSBC. AML, KYC, compliance.",
         "careers_url":"https://www.hsbc.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hsbc/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/hsbc"},
    ],

    # ── 8. Giáo dục ───────────────────────────────────────────────
    "education": [
        {"name":"VUS Language Centers","name_vi":"VUS","industry":"Language Education","size":"large",
         "location":"Nationwide","description":"He thong trung tam Anh ngu lon nhat. Tuyen giao vien cac cap.",
         "careers_url":"https://vus.edu.vn/careers","linkedin_url":"https://www.linkedin.com/company/vus/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vus","topcv_url":"https://www.topcv.vn/cong-ty/vus"},
        {"name":"IVY School System","name_vi":"Trường IVY","industry":"K-12 Education","size":"large",
         "location":"HCM / Hanoi","description":"He thong truong tu thuc chat luong cao. Giao vien cac mon.",
         "careers_url":"https://www.ivyschool.edu.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/ivy-school/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/ivy-school"},
        {"name":"RMIT University Vietnam","name_vi":"Đại học RMIT Việt Nam","industry":"Higher Education","size":"large",
         "location":"HCM / Hanoi","description":"Dai hoc Uc. Tuyen giang vien, nghien cuu vien cac linh vuc.",
         "careers_url":"https://www.rmit.edu.vn/careers","linkedin_url":"https://www.linkedin.com/company/rmit-university/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/rmit-university-vietnam"},
        {"name":"Topica Edtech Group","name_vi":"Topica","industry":"EdTech","size":"large",
         "location":"Hanoi / HCM","description":"Giao duc truc tuyen hang dau. Tuyen giang vien, chuyen gia noi dung.",
         "careers_url":"https://topica.net/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/topica-edtech-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/topica"},
        {"name":"British Council Vietnam","name_vi":"Hội đồng Anh","industry":"Cultural Education","size":"large",
         "location":"HCM / Hanoi","description":"To chuc van hoa Anh. Tuyen giang vien tieng Anh va quan ly.",
         "careers_url":"https://www.britishcouncil.vn/careers","linkedin_url":"https://www.linkedin.com/company/british-council/jobs/",
         "other_url":"https://jobs.britishcouncil.org"},
    ],

    # ── 9. Nghệ thuật & Truyền thông ─────────────────────────────
    "arts-media": [
        {"name":"VCCorp","name_vi":"VCCorp","industry":"Media & Technology","size":"large",
         "location":"Hanoi","description":"Cong ty truyen thong lon (Dân Trí, Soha). Tuyen designer, content.",
         "careers_url":"https://vccorp.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vccorp/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vccorp","itviec_url":"https://itviec.com/companies/vccorp"},
        {"name":"VTV Digital","name_vi":"VTV Digital","industry":"Broadcasting","size":"large",
         "location":"Hanoi","description":"Dai truyen hinh quoc gia. Tuyen bien tap vien, ky thuat truyen hinh.",
         "careers_url":"https://vtvdigital.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vtv/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/vtv-digital"},
        {"name":"Dentsu Vietnam","name_vi":"Dentsu Việt Nam","industry":"Advertising","size":"large",
         "location":"HCM","description":"Agency quang cao quoc te. Tuyen creative, account, digital marketing.",
         "careers_url":"https://www.dentsu.com/careers","linkedin_url":"https://www.linkedin.com/company/dentsu/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/dentsu","topcv_url":"https://www.topcv.vn/cong-ty/dentsu"},
        {"name":"Ogilvy Vietnam","name_vi":"Ogilvy Vietnam","industry":"Advertising","size":"large",
         "location":"HCM","description":"Agency quang cao lon. Creative director, copywriter, designer.",
         "careers_url":"https://www.ogilvy.com/talent","linkedin_url":"https://www.linkedin.com/company/ogilvy/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/ogilvy"},
        {"name":"Canifa","name_vi":"Canifa","industry":"Fashion Retail","size":"large",
         "location":"Nationwide","description":"Thuong hieu thoi trang Viet Nam. Tuyen designer thoi trang, visual.",
         "careers_url":"https://canifa.com/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/canifa/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/canifa"},
    ],

    # ── 10. Y tế chuyên nghiệp ────────────────────────────────────
    "healthcare-practitioners": [
        {"name":"Vinmec International Hospital","name_vi":"Bệnh viện Vinmec","industry":"Healthcare","size":"enterprise",
         "location":"Nationwide","description":"He thong benh vien cao cap Vingroup. Bac si, dieu duong, duoc si.",
         "careers_url":"https://www.vinmec.com/vi/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vinmec/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vinmec","topcv_url":"https://www.topcv.vn/cong-ty/vinmec"},
        {"name":"FV Hospital","name_vi":"Bệnh viện FV","industry":"Healthcare","size":"large",
         "location":"HCM","description":"Benh vien Phap-Viet. Bac si chuyen khoa, dieu duong quoc te.",
         "careers_url":"https://www.fvhospital.com/vi/careers","linkedin_url":"https://www.linkedin.com/company/fv-hospital/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/fv-hospital","topcv_url":"https://www.topcv.vn/cong-ty/fv-hospital"},
        {"name":"Bệnh viện Bạch Mai","name_vi":"Bệnh viện Bạch Mai","industry":"Healthcare","size":"enterprise",
         "location":"Hanoi","description":"Benh vien tuyen cuoi lon nhat Mien Bac. Bac si chuyen khoa sau.",
         "careers_url":"https://bachmai.gov.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/bach-mai-hospital/jobs/",
         "other_url":"https://bachmai.gov.vn/tuyen-dung"},
        {"name":"Hoan My Medical Group","name_vi":"Bệnh viện Hoàn Mỹ","industry":"Healthcare","size":"enterprise",
         "location":"Nationwide","description":"Chuoi benh vien tu nhan. Bac si, dieu duong, ky thuat y te.",
         "careers_url":"https://www.hoanmy.com/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hoan-my-medical-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/hoan-my-medical","topcv_url":"https://www.topcv.vn/cong-ty/hoan-my"},
    ],

    # ── 11. Hỗ trợ y tế ──────────────────────────────────────────
    "healthcare-support": [
        {"name":"Vinmec (Support)","name_vi":"Vinmec - Hỗ trợ Y tế","industry":"Healthcare","size":"enterprise",
         "location":"Nationwide","description":"Dieu duong ho tro, ky thuat vien phong thi nghiem, X-quang.",
         "careers_url":"https://www.vinmec.com/vi/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vinmec/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/vinmec"},
        {"name":"Pharmacity","name_vi":"Pharmacity","industry":"Pharmacy Retail","size":"enterprise",
         "location":"Nationwide","description":"Chuoi nha thuoc lon nhat VN. Duoc si, chuyen vien ban hang thuoc.",
         "careers_url":"https://pharmacity.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/pharmacity/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/pharmacity","topcv_url":"https://www.topcv.vn/cong-ty/pharmacity"},
        {"name":"An Khang Pharmacy","name_vi":"Nhà thuốc An Khang","industry":"Pharmacy Retail","size":"large",
         "location":"Nationwide","description":"Chuoi nha thuoc MWG. Duoc si, chuyen vien duoc.",
         "careers_url":"https://ankhang.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/an-khang-pharmacy/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/nha-thuoc-an-khang"},
    ],

    # ── 12. Dịch vụ bảo vệ ───────────────────────────────────────
    "protective-service": [
        {"name":"G4S Vietnam","name_vi":"G4S Việt Nam","industry":"Security Services","size":"enterprise",
         "location":"Nationwide","description":"Cong ty bao ve quoc te. Nhan vien bao ve, quan sat, van chuyen tien.",
         "careers_url":"https://www.g4s.com/en-vn/careers","linkedin_url":"https://www.linkedin.com/company/g4s/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/g4s","topcv_url":"https://www.topcv.vn/cong-ty/g4s"},
        {"name":"Securitas Vietnam","name_vi":"Securitas","industry":"Security Services","size":"large",
         "location":"HCM / Hanoi","description":"Bao ve chuyen nghiep. Kiem soat an ninh, cong nghe giam sat.",
         "careers_url":"https://www.securitas.com/vn/en/careers","linkedin_url":"https://www.linkedin.com/company/securitas/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/securitas"},
        {"name":"Central Group Vietnam Loss Prevention","name_vi":"Central Group - Loss Prevention","industry":"Retail Security","size":"enterprise",
         "location":"Nationwide","description":"Bao ve hang hoa tai he thong BigC, Go!. Quan ly phong chong mat mat.",
         "careers_url":"https://centralgroup.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/central-group-vietnam/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/central-group-vietnam"},
    ],

    # ── 13. Dịch vụ ăn uống ──────────────────────────────────────
    "food-service": [
        {"name":"Pizza 4P's","name_vi":"Pizza 4P's","industry":"Restaurant","size":"large",
         "location":"Nationwide","description":"Chuoi nha hang pizza cao cap Nhat Ban. Dau bep, phuc vu, quan ly.",
         "careers_url":"https://pizza4ps.com/careers","linkedin_url":"https://www.linkedin.com/company/pizza-4ps/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/pizza-4ps","topcv_url":"https://www.topcv.vn/cong-ty/pizza-4ps"},
        {"name":"Golden Gate","name_vi":"Golden Gate F&B","industry":"Restaurant Chain","size":"enterprise",
         "location":"Nationwide","description":"Chuoi nha hang lon nhat VN (Kichi-Kichi, Vuvuzela). Dau bep, quan ly.",
         "careers_url":"https://www.goldengate.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/golden-gate-viet-nam/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/golden-gate","topcv_url":"https://www.topcv.vn/cong-ty/golden-gate"},
        {"name":"InterContinental Hanoi Westlake","name_vi":"InterContinental Hanoi","industry":"Hotel F&B","size":"large",
         "location":"Hanoi","description":"Khach san 5 sao. Dau bep, quan ly nha hang cao cap.",
         "careers_url":"https://careers.ihg.com","linkedin_url":"https://www.linkedin.com/company/intercontinental-hotels-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/intercontinental"},
        {"name":"Starbucks Vietnam","name_vi":"Starbucks Việt Nam","industry":"Coffee Chain","size":"large",
         "location":"HCM / Hanoi","description":"Chuoi ca phe quoc te. Barista, giam sat ca, quan ly cua hang.",
         "careers_url":"https://www.starbucks.vn/careers","linkedin_url":"https://www.linkedin.com/company/starbucks/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/starbucks"},
        {"name":"Highlands Coffee","name_vi":"Highlands Coffee","industry":"Coffee Chain","size":"enterprise",
         "location":"Nationwide","description":"Chuoi ca phe Viet Nam lon nhat. Nhan vien pha che, quan ly.",
         "careers_url":"https://www.highlandscoffee.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/highlands-coffee/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/highlands-coffee"},
    ],

    # ── 14. Bảo trì tòa nhà ──────────────────────────────────────
    "building-maintenance": [
        {"name":"Savills Vietnam","name_vi":"Savills Việt Nam","industry":"Property Management","size":"large",
         "location":"HCM / Hanoi","description":"Quan ly bat dong san quoc te. Ky thuat toa nha, facilities.",
         "careers_url":"https://www.savills.com.vn/careers","linkedin_url":"https://www.linkedin.com/company/savills/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/savills","topcv_url":"https://www.topcv.vn/cong-ty/savills"},
        {"name":"CBRE Vietnam","name_vi":"CBRE Việt Nam","industry":"Property Services","size":"large",
         "location":"HCM / Hanoi","description":"Dich vu bat dong san quoc te. Bao tri co so vat chat, facilities.",
         "careers_url":"https://www.cbre.com.vn/careers","linkedin_url":"https://www.linkedin.com/company/cbre/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/cbre","topcv_url":"https://www.topcv.vn/cong-ty/cbre"},
        {"name":"Ecopark","name_vi":"Ecopark","industry":"Urban Development","size":"enterprise",
         "location":"Hanoi","description":"Do thi sinh thai lon nhat mien Bac. Ky thuat bao tri, canh quan.",
         "careers_url":"https://ecopark.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/ecopark-vietnam/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/ecopark"},
    ],

    # ── 15. Chăm sóc cá nhân ─────────────────────────────────────
    "personal-care": [
        {"name":"California Fitness & Yoga","name_vi":"California Fitness & Yoga","industry":"Fitness","size":"large",
         "location":"Nationwide","description":"Chuoi phong tap lon nhat VN. Huan luyen vien, quan ly phong tap.",
         "careers_url":"https://www.californiafitnessyoga.com/careers","linkedin_url":"https://www.linkedin.com/company/california-fitness-and-yoga/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/california-fitness","topcv_url":"https://www.topcv.vn/cong-ty/california-fitness"},
        {"name":"Six Senses Con Dao","name_vi":"Six Senses Côn Đảo","industry":"Luxury Resort Spa","size":"large",
         "location":"Ba Ria - Vung Tau","description":"Resort 5 sao. Chuyen vien spa, wellness, chao don khach cao cap.",
         "careers_url":"https://www.sixsenses.com/en/careers","linkedin_url":"https://www.linkedin.com/company/six-senses/jobs/",
         "other_url":"https://careers.sixsenses.com"},
        {"name":"HASAKI Beauty","name_vi":"HASAKI","industry":"Beauty Retail","size":"large",
         "location":"Nationwide","description":"Chuoi cham soc sac dep. Chuyen vien lam dep, tu van san pham.",
         "careers_url":"https://hasaki.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hasaki/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/hasaki"},
        {"name":"Juno","name_vi":"Giày Juno","industry":"Fashion Retail","size":"large",
         "location":"Nationwide","description":"Thuong hieu giay dep phu nu. Cham soc khach hang, ban hang.",
         "careers_url":"https://juno.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/juno-fashion/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/juno"},
    ],

    # ── 16. Bán hàng ─────────────────────────────────────────────
    "sales": [
        {"name":"Shopee Vietnam","name_vi":"Shopee Việt Nam","industry":"E-commerce","size":"enterprise",
         "location":"HCM","description":"San TMDT hang dau. Sales manager, KAM, business development.",
         "careers_url":"https://careers.shopee.vn","linkedin_url":"https://www.linkedin.com/company/shopee/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/shopee","topcv_url":"https://www.topcv.vn/cong-ty/shopee"},
        {"name":"Lazada Vietnam","name_vi":"Lazada","industry":"E-commerce","size":"enterprise",
         "location":"HCM","description":"TMDT lon. Key account, seller growth, business development.",
         "careers_url":"https://careers.lazada.vn","linkedin_url":"https://www.linkedin.com/company/lazada/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/lazada","topcv_url":"https://www.topcv.vn/cong-ty/lazada"},
        {"name":"Unilever Vietnam","name_vi":"Unilever Việt Nam","industry":"FMCG","size":"enterprise",
         "location":"HCM","description":"Tap doan FMCG. Sales rep, key account, trade marketing.",
         "careers_url":"https://careers.unilever.com/vn","linkedin_url":"https://www.linkedin.com/company/unilever/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/unilever","topcv_url":"https://www.topcv.vn/cong-ty/unilever"},
        {"name":"P&G Vietnam","name_vi":"P&G Việt Nam","industry":"FMCG","size":"enterprise",
         "location":"HCM","description":"Tap doan san pham tieu dung. Sales, field force, marketing.",
         "careers_url":"https://www.pg.com/careers","linkedin_url":"https://www.linkedin.com/company/p-g/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/pg-vietnam"},
        {"name":"Vinamilk","name_vi":"Vinamilk","industry":"FMCG - Dairy","size":"enterprise",
         "location":"Nationwide","description":"Cong ty sua lon nhat VN. Sales rep, giam sat ban hang, key account.",
         "careers_url":"https://vinamilk.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vinamilk/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vinamilk","topcv_url":"https://www.topcv.vn/cong-ty/vinamilk"},
    ],

    # ── 17. Hành chính văn phòng ──────────────────────────────────
    "office-admin": [
        {"name":"Viettel Group","name_vi":"Tập đoàn Viettel","industry":"Telecommunications","size":"enterprise",
         "location":"Nationwide","description":"Tap doan vien thong lon nhat. Thu ky, hanh chinh van phong.",
         "careers_url":"https://viettelgroup.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/viettel/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/viettel","topcv_url":"https://www.topcv.vn/cong-ty/viettel"},
        {"name":"Adecco Vietnam","name_vi":"Adecco Việt Nam","industry":"HR Staffing","size":"large",
         "location":"HCM / Hanoi","description":"Cong ty nhan su quoc te. Cung cap nhan vien hanh chinh, van phong.",
         "careers_url":"https://www.adecco.com.vn/vi/careers","linkedin_url":"https://www.linkedin.com/company/adecco/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/adecco","topcv_url":"https://www.topcv.vn/cong-ty/adecco"},
        {"name":"ManpowerGroup Vietnam","name_vi":"ManpowerGroup Việt Nam","industry":"HR Staffing","size":"large",
         "location":"HCM / Hanoi","description":"Nhan su quoc te. Chuyen nhan vien hanh chinh, ke toan, thu ky.",
         "careers_url":"https://www.manpower.com.vn/vi/careers","linkedin_url":"https://www.linkedin.com/company/manpowergroup/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/manpowergroup"},
    ],

    # ── 18. Nông nghiệp & Lâm nghiệp ─────────────────────────────
    "farming-forestry": [
        {"name":"VinEco","name_vi":"VinEco","industry":"Agriculture Technology","size":"large",
         "location":"Nationwide","description":"Cong ty nong nghiep Vingroup. Ky su nong nghiep, ky thuat vien.",
         "careers_url":"https://vineco.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vineco/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/vineco"},
        {"name":"Lộc Trời Group","name_vi":"Tập đoàn Lộc Trời","industry":"Agriculture","size":"enterprise",
         "location":"An Giang / Nationwide","description":"Tap doan nong nghiep vung DBSCL. Ky su nong nghiep, thuoc BVTV.",
         "careers_url":"https://www.loctroigroup.com/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/loc-troi-group/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/loc-troi","topcv_url":"https://www.topcv.vn/cong-ty/loc-troi"},
        {"name":"Syngenta Vietnam","name_vi":"Syngenta","industry":"Agribusiness","size":"large",
         "location":"HCM","description":"Cong ty nong hoa My. Ky thuat vien nong nghiep, sale agri.",
         "careers_url":"https://www.syngenta.com/en/careers","linkedin_url":"https://www.linkedin.com/company/syngenta/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/syngenta-vietnam"},
        {"name":"Viện Lâm nghiệp Việt Nam","name_vi":"VNFOREST","industry":"Forestry Research","size":"enterprise",
         "location":"Hanoi","description":"Vien nghien cuu lam nghiep. Tuyen chuyen gia rac rung, GIS.",
         "careers_url":"https://vnforest.gov.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/ministry-of-agriculture-and-rural-development-of-vietnam/jobs/",
         "other_url":"https://vafs.gov.vn"},
    ],

    # ── 19. Xây dựng ─────────────────────────────────────────────
    "construction": [
        {"name":"Coteccons","name_vi":"Coteccons","industry":"General Contractor","size":"enterprise",
         "location":"Nationwide","description":"Nha thau lon nhat VN. Ky su XD, giam sat, du toan cong trinh.",
         "careers_url":"https://coteccons.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/coteccons/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/coteccons","topcv_url":"https://www.topcv.vn/cong-ty/coteccons"},
        {"name":"Hoa Binh Construction","name_vi":"Hòa Bình","industry":"Construction","size":"enterprise",
         "location":"Nationwide","description":"Nha thau hang dau mien Nam. Ky su kien truc, ME, QC.",
         "careers_url":"https://hoacom.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hoa-binh-construction-group/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/tap-doan-xay-dung-hoa-binh"},
        {"name":"Novaland","name_vi":"Novaland","industry":"Real Estate Development","size":"enterprise",
         "location":"HCM / South","description":"Chu dau tu BDS lon. Ky su XD, quan ly du an BDS.",
         "careers_url":"https://novaland.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/novaland/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/novaland"},
        {"name":"VinHomes","name_vi":"Vinhomes","industry":"Real Estate","size":"enterprise",
         "location":"Nationwide","description":"Bat dong san Vingroup. Ky su van hanh, bao tri du an nha o.",
         "careers_url":"https://vinhomes.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vinhomes/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/vinhomes"},
    ],

    # ── 20. Lắp đặt & Sửa chữa ───────────────────────────────────
    "installation-repair": [
        {"name":"Samsung Electronics Vietnam","name_vi":"Samsung Việt Nam","industry":"Electronics","size":"enterprise",
         "location":"Bac Ninh / Thai Nguyen","description":"Nha may Samsung lon nhat TG. Ky thuat vien lap dat, bao tri.",
         "careers_url":"https://samsungvina.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/samsung-electronics/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/samsung-vina","topcv_url":"https://www.topcv.vn/cong-ty/samsung-vina"},
        {"name":"Carrier Vietnam","name_vi":"Carrier","industry":"HVAC","size":"large",
         "location":"HCM","description":"Dieu hoa khong khi. Ky su bao tri, lap dat he thong lanh.",
         "careers_url":"https://www.carrier.com/carrier/en/vietnam/careers","linkedin_url":"https://www.linkedin.com/company/carrier/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/carrier-vietnam"},
        {"name":"Petrolimex","name_vi":"Tập đoàn Xăng dầu VN","industry":"Energy","size":"enterprise",
         "location":"Nationwide","description":"Tap doan xang dau lon nhat. Ky thuat vien bao tri tram xang.",
         "careers_url":"https://petrolimex.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/petrolimex/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/petrolimex"},
    ],

    # ── 21. Sản xuất ─────────────────────────────────────────────
    "production": [
        {"name":"Toyota Vietnam","name_vi":"Toyota Việt Nam","industry":"Automotive","size":"enterprise",
         "location":"Vinh Phuc","description":"Hang xe hoi Nhat Ban. Ky su san xuat, kiem soat chat luong o to.",
         "careers_url":"https://toyota.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/toyota/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/toyota-vietnam","topcv_url":"https://www.topcv.vn/cong-ty/toyota"},
        {"name":"Hoa Phat Group","name_vi":"Hòa Phát","industry":"Steel Manufacturing","size":"enterprise",
         "location":"Nationwide","description":"Thep lon nhat VN. Cong nhan ky thuat, ky su san xuat thep.",
         "careers_url":"https://hoaphat.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/hoa-phat-group/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/tap-doan-hoa-phat"},
        {"name":"Vinfast","name_vi":"VinFast","industry":"Automotive Manufacturing","size":"enterprise",
         "location":"Hai Phong / HCM","description":"Hang xe o to dien Viet Nam. Ky su che tao, chuyen vien chat luong.",
         "careers_url":"https://vinfastcareers.com","linkedin_url":"https://www.linkedin.com/company/vinfast/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/vinfast"},
        {"name":"Intel Products Vietnam","name_vi":"Intel Việt Nam","industry":"Semiconductor","size":"enterprise",
         "location":"HCM","description":"Nha may Intel lon nhat chau A. Ky su QA, ky thuat vien san xuat chip.",
         "careers_url":"https://jobs.intel.com","linkedin_url":"https://www.linkedin.com/company/intel-corporation/jobs/",
         "other_url":"https://www.intel.com/content/www/us/en/jobs/locations/vietnam.html"},
        {"name":"Nestle Vietnam","name_vi":"Nestlé Việt Nam","industry":"Food Manufacturing","size":"enterprise",
         "location":"Dong Nai / HCM","description":"Tap doan thuc pham Thuy Si. Ky su thuc pham, chat luong san xuat.",
         "careers_url":"https://www.nestle.com.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/nestle/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/nestle","topcv_url":"https://www.topcv.vn/cong-ty/nestle-viet-nam"},
    ],

    # ── 22. Vận tải ───────────────────────────────────────────────
    "transportation": [
        {"name":"Vietnam Airlines","name_vi":"Vietnam Airlines","industry":"Aviation","size":"enterprise",
         "location":"Nationwide","description":"Hang hang khong quoc gia. Phi cong, tiet vien, ky thuat may bay.",
         "careers_url":"https://www.vietnamairlines.com/vn/vi/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vietnam-airlines/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/vietnam-airlines","topcv_url":"https://www.topcv.vn/cong-ty/vietnam-airlines"},
        {"name":"DHL Vietnam","name_vi":"DHL Việt Nam","industry":"Logistics","size":"enterprise",
         "location":"Nationwide","description":"Cong ty van chuyen quoc te. Tai xe, quan ly kho, logistics.",
         "careers_url":"https://careers.dhl.com/global/en","linkedin_url":"https://www.linkedin.com/company/dhl/jobs/",
         "vietnamworks_url":"https://www.vietnamworks.com/nha-tuyen-dung/dhl-express-vietnam","topcv_url":"https://www.topcv.vn/cong-ty/dhl"},
        {"name":"Grab Vietnam","name_vi":"Grab Việt Nam","industry":"Ride-hailing & Delivery","size":"enterprise",
         "location":"Nationwide","description":"Ung dung goi xe, GrabFood. Van hanh, logistics, cong nghe.",
         "careers_url":"https://careers.grab.com","linkedin_url":"https://www.linkedin.com/company/grabapp/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/grab"},
        {"name":"Viettel Post","name_vi":"Viettel Post","industry":"Postal & Logistics","size":"enterprise",
         "location":"Nationwide","description":"Buu chinh Viettel. Nhan vien phat hang, giam sat van hanh.",
         "careers_url":"https://viettelpost.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/viettel-post/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/viettel-post"},
        {"name":"Giao Hang Nhanh (GHN)","name_vi":"Giao Hàng Nhanh","industry":"Last-mile Delivery","size":"large",
         "location":"Nationwide","description":"Cong ty giao van toc do cao. Ky thuat van hanh, quan ly kho.",
         "careers_url":"https://ghn.vn/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/ghn/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/ghn"},
        {"name":"Vietjet Air","name_vi":"Vietjet Air","industry":"Aviation","size":"enterprise",
         "location":"HCM / Hanoi","description":"Hang hang khong gia re. Phi cong, tiet vien, ky thuat.",
         "careers_url":"https://www.vietjetair.com/Sites/Web/vi-VN/pages/tuyen-dung","linkedin_url":"https://www.linkedin.com/company/vietjet-air/jobs/",
         "topcv_url":"https://www.topcv.vn/cong-ty/vietjet-air"},
    ],
}


def seed():
    group_map = {g["slug"]: g for g in GROUPS}
    with Session(engine) as db:
        created = 0; skipped = 0

        for slug, companies in COMPANIES.items():
            g = group_map.get(slug)
            if not g:
                print(f"[WARN] Group not found: {slug}")
                continue

            for c in companies:
                existing = db.query(Company).filter(
                    Company.name == c["name"],
                    Company.career_group_slug == slug,
                ).first()

                if existing:
                    skipped += 1
                    continue

                obj = Company(
                    career_group_id=g["id"],
                    career_group_slug=g["slug"],
                    career_group_name=g["name"],
                    onet_major_group=g["onet"],
                    name=c["name"],
                    name_vi=c.get("name_vi"),
                    description=c.get("description"),
                    industry=c.get("industry"),
                    size=c.get("size"),
                    location=c.get("location"),
                    careers_url=c.get("careers_url"),
                    linkedin_url=c.get("linkedin_url"),
                    vietnamworks_url=c.get("vietnamworks_url"),
                    topcv_url=c.get("topcv_url"),
                    itviec_url=c.get("itviec_url"),
                    jobstreet_url=c.get("jobstreet_url"),
                    other_url=c.get("other_url"),
                    is_active=True,
                    verified=True,
                )
                db.add(obj)
                created += 1
                safe_name = c['name'].encode('ascii', 'replace').decode('ascii')
                print(f"  [+] [{slug[:20]:20s}] {safe_name[:45]}")

        db.commit()
        total = db.query(Company).count()
        print(f"\nDone! Created: {created} | Skipped: {skipped} | Total in DB: {total}")

        # Summary by group
        print("\nCompanies per group:")
        for g in GROUPS:
            cnt = db.query(Company).filter(Company.career_group_slug == g["slug"]).count()
            print(f"  {g['id']:2d}. {g['name'][:30]:30s}: {cnt} companies")


if __name__ == "__main__":
    print("Seeding companies by career group...\n")
    seed()
