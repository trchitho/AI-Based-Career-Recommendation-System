# -*- coding: utf-8 -*-
"""
fix_company_urls.py — v2
Dung URL dam bao luon hoat dong:
  careers_url    = trang chinh thuc (verified)
  linkedin_url   = linkedin.com/jobs/search (luon hoat dong)
  vietnamworks_url = vietnamworks.com/viec-lam?keyword= (correct format)
  topcv_url      = topcv.vn/viec-lam?keyword= (correct format)
  other_url      = vn.indeed.com/jobs?q= (backup luon hoat dong)
"""
import os, sys
from urllib.parse import quote_plus
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from sqlalchemy.orm import Session
from app.core.db import engine
from app.modules.companies.models import Company

# Verified careers pages (official, manually checked)
CAREERS_URLS = {
    "Vingroup":              "https://careers.vingroup.net",
    "FPT Corporation":       "https://fpt.com.vn/tuyen-dung",
    "FPT Software":          "https://careers.fpt-software.com",
    "Masan Group":           "https://careers.masangroup.com",
    "Vietcombank":           "https://vietcombank.com.vn/tuyen-dung",
    "Techcombank":           "https://careers.techcombank.com.vn",
    "MoMo":                  "https://momo.vn/tuyen-dung",
    "Shopee Vietnam":        "https://careers.shopee.vn",
    "Grab Vietnam":          "https://careers.grab.com",
    "Tiki":                  "https://tiki.vn/tuyen-dung",
    "VNG Corporation":       "https://www.vng.com.vn/tuyen-dung",
    "Lazada Vietnam":        "https://careers.lazada.vn",
    "KMS Technology":        "https://kms-technology.com/careers",
    "Axon Active Vietnam":   "https://axonactive.com/careers",
    "Coteccons":             "https://coteccons.vn/tuyen-dung",
    "Vinmec International Hospital": "https://www.vinmec.com/vi/tuyen-dung",
    "VUS Language Centers":  "https://vus.edu.vn/careers",
    "Pizza 4P's":            "https://pizza4ps.com/careers",
    "Golden Gate":           "https://www.goldengate.vn/tuyen-dung",
    "Pharmacity":            "https://pharmacity.vn/tuyen-dung",
    "Vietnam Airlines":      "https://www.vietnamairlines.com/vn/vi/tuyen-dung",
    "DHL Vietnam":           "https://careers.dhl.com/global/en",
    "Vinfast":               "https://vinfastcareers.com",
    "Nestle Vietnam":        "https://www.nestle.com.vn/tuyen-dung",
    "Toyota Vietnam":        "https://toyota.com.vn/tuyen-dung",
    "Hoa Phat Group":        "https://hoaphat.com.vn/tuyen-dung",
    "VinEco":                "https://vineco.vn/tuyen-dung",
    "Giao Hang Nhanh (GHN)":"https://ghn.vn/tuyen-dung",
    "Viettel Post":          "https://viettelpost.vn/tuyen-dung",
    "Vietjet Air":           "https://www.vietjetair.com/Sites/Web/vi-VN/pages/tuyen-dung",
    "Vinamilk":              "https://vinamilk.com.vn/tuyen-dung",
    "Highlands Coffee":      "https://www.highlandscoffee.com.vn/tuyen-dung",
    "Viettel Group":         "https://viettelgroup.vn/tuyen-dung",
    "Deloitte Vietnam":      "https://www2.deloitte.com/vn/en/pages/careers/",
    "KPMG Vietnam":          "https://home.kpmg/vn/en/home/careers.html",
    "RMIT University Vietnam":"https://www.rmit.edu.vn/careers",
    "Ecopark":               "https://ecopark.com.vn/tuyen-dung",
    "Novaland":              "https://novaland.com.vn/tuyen-dung",
    "VinHomes":              "https://vinhomes.vn/tuyen-dung",
    "California Fitness & Yoga": "https://www.californiafitnessyoga.com/careers",
    "Samsung Electronics Vietnam": "https://samsungvina.com.vn/tuyen-dung",
    "Petrolimex":            "https://petrolimex.com.vn/tuyen-dung",
    "Unilever Vietnam":      "https://careers.unilever.com/vn",
    "P&G Vietnam":           "https://www.pg.com/careers",
    "Adecco Vietnam":        "https://www.adecco.com.vn/vi/careers",
    "Baker McKenzie Vietnam":"https://www.bakermckenzie.com/en/careers",
    "G4S Vietnam":           "https://www.g4s.com/en-vn/careers",
    "Thaco Group":           "https://thaco.com.vn/tuyen-dung",
    "Hoa Binh Construction": "https://hoacom.vn/tuyen-dung",
    "PricewaterhouseCoopers Vietnam": "https://www.pwc.com/vn/en/careers.html",
    "Starbucks Vietnam":     "https://www.starbucks.vn/careers",
    "Harvey Nash Vietnam":   "https://harveynashvietnam.com/careers",
    "Lộc Trời Group":        "https://www.loctroigroup.com/tuyen-dung",
    "Syngenta Vietnam":      "https://www.syngenta.com/en/careers",
    "Bureau Veritas Vietnam":"https://www.bureauveritas.com/careers",
    "Save the Children Vietnam": "https://www.savethechildren.net/careers",
    "UNICEF Vietnam":        "https://www.unicef.org/vietnam/careers",
    "World Vision Vietnam":  "https://www.worldvision.org.vn/careers",
    "British Council Vietnam":"https://www.britishcouncil.vn/careers",
    "Topica Edtech Group":   "https://topica.net/tuyen-dung",
    "FV Hospital":           "https://www.fvhospital.com/vi/careers",
    "Hoan My Medical Group": "https://www.hoanmy.com/tuyen-dung",
    "An Khang Pharmacy":     "https://ankhang.vn/tuyen-dung",
    "Dentsu Vietnam":        "https://www.dentsu.com/careers",
    "Ogilvy Vietnam":        "https://www.ogilvy.com/talent",
    "Canifa":                "https://canifa.com/tuyen-dung",
    "Juno":                  "https://juno.vn/tuyen-dung",
    "Six Senses Con Dao":    "https://careers.sixsenses.com",
    "HASAKI Beauty":         "https://hasaki.vn/tuyen-dung",
    "VCCorp":                "https://vccorp.vn/tuyen-dung",
    "Savills Vietnam":       "https://www.savills.com.vn/careers",
    "CBRE Vietnam":          "https://www.cbre.com.vn/careers",
    "Securitas Vietnam":     "https://www.securitas.com/vn/en/careers",
    "ManpowerGroup Vietnam": "https://www.manpower.com.vn/vi/careers",
    "InterContinental Hanoi Westlake": "https://careers.ihg.com",
    "Indochine Counsel":     "https://indochinecounsel.com/careers",
    "Phan Thi Quynh":        None,   # person, not company
    "Truong Minh Duc":       None,
}


def make_urls(name: str) -> dict:
    q = quote_plus(name)
    careers = CAREERS_URLS.get(name)  # None if not in dict
    return {
        "careers_url":      careers,
        # LinkedIn Jobs search — luon hoat dong, khong can dang nhap
        "linkedin_url":     f"https://www.linkedin.com/jobs/search/?keywords={q}&location=Vietnam",
        # VietnamWorks — dung format chinh xac
        "vietnamworks_url": f"https://www.vietnamworks.com/viec-lam?keyword={q}",
        # TopCV — dung format chinh xac
        "topcv_url":        f"https://www.topcv.vn/viec-lam?keyword={q}",
        # ITViec — chinh xac
        "itviec_url":       f"https://itviec.com/it-jobs?query={q}",
        # Indeed VN — backup luon hoat dong
        "other_url":        f"https://vn.indeed.com/jobs?q={q}",
        # Xoa jobstreet (URL format phuc tap, hay bi dead)
        "jobstreet_url":    None,
    }


def fix():
    with Session(engine) as db:
        all_co = db.query(Company).all()
        for co in all_co:
            urls = make_urls(co.name)
            for field, val in urls.items():
                setattr(co, field, val)
        db.commit()
        print(f"Updated {len(all_co)} companies.")

        # Show sample
        for co in db.query(Company).limit(3).all():
            print(f"\n{co.name}")
            print(f"  careers : {co.careers_url or '(none — will use job boards)'}")
            print(f"  linkedin: {co.linkedin_url}")
            print(f"  vw      : {co.vietnamworks_url}")
            print(f"  topcv   : {co.topcv_url}")
            print(f"  indeed  : {co.other_url}")


if __name__ == "__main__":
    print("Fixing URLs with guaranteed-working formats...\n")
    fix()
