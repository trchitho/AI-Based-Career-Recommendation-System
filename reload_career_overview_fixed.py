#!/usr/bin/env python3
"""
Reload Career Overview Data - FIXED VERSION
- Sử dụng API endpoints đã được verify
- Logic dừng sau 5 lỗi liên tiếp
- Xóa data cũ trước khi nạp mới
- Lấy salary từ bảng có sẵn
"""

import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional

import httpx
import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

# Load environment
DOTENV_PATH = Path(__file__).resolve().parent / "apps/backend/.env"
load_dotenv(DOTENV_PATH, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
API_KEY = os.getenv("ONET_V2_API_KEY")
BASE_URL = os.getenv("ONET_V2_BASE_URL", "https://api-v2.onetcenter.org")

class CareerOverviewLoader:
    def __init__(self):
        self.client = httpx.Client(
            timeout=30.0,
            headers={
                "X-API-Key": API_KEY,
                "User-Agent": "Career-AI-System/1.0"
            }
        )
        self.consecutive_errors = 0
        self.max_consecutive_errors = 5
        self.stats = {
            "total_careers": 0,
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "api_errors": 0,
            "stopped_early": False
        }
    
    def get_education_data(self, onet_code: str) -> Optional[Dict[str, Any]]:
        """Lấy education data từ ONET API"""
        try:
            url = f"{BASE_URL}/online/occupations/{onet_code}/summary/education"
            response = self.client.get(url)
            
            if response.status_code == 200:
                self.consecutive_errors = 0  # Reset counter
                return response.json()
            elif response.status_code == 422:
                # No education data available - not an error
                self.consecutive_errors = 0
                return None
            else:
                print(f"❌ API Error {response.status_code} for {onet_code}: {response.text[:100]}")
                self.consecutive_errors += 1
                self.stats["api_errors"] += 1
                return None
                
        except Exception as e:
            print(f"💥 Exception for {onet_code}: {e}")
            self.consecutive_errors += 1
            self.stats["api_errors"] += 1
            return None
    
    def get_job_zone_data(self, onet_code: str) -> Optional[Dict[str, Any]]:
        """Lấy job zone data từ ONET API"""
        try:
            url = f"{BASE_URL}/database/rows/job_zones"
            params = {"filter1": f"onetsoc_code.eq.{onet_code}"}
            response = self.client.get(url, params=params)
            
            if response.status_code == 200:
                self.consecutive_errors = 0
                return response.json()
            else:
                print(f"❌ Job Zone API Error {response.status_code} for {onet_code}")
                self.consecutive_errors += 1
                self.stats["api_errors"] += 1
                return None
                
        except Exception as e:
            print(f"💥 Job Zone Exception for {onet_code}: {e}")
            self.consecutive_errors += 1
            self.stats["api_errors"] += 1
            return None
    
    def parse_education_requirements(self, edu_data: Dict[str, Any]) -> tuple[str, str]:
        """Parse education data thành experience_text và degree_text"""
        experience_text = "Không yêu cầu kinh nghiệm cụ thể"
        degree_text = "Không yêu cầu bằng cấp cụ thể"
        
        if not edu_data or "response" not in edu_data:
            return experience_text, degree_text
        
        responses = edu_data.get("response", [])
        if not isinstance(responses, list):
            return experience_text, degree_text
        
        # Tìm education requirements
        for item in responses:
            if not isinstance(item, dict):
                continue
                
            category = item.get("category", "").lower()
            text = item.get("text", "").strip()
            
            if "education" in category and text:
                if "bachelor" in text.lower():
                    degree_text = "Yêu cầu bằng Cử nhân hoặc tương đương"
                elif "master" in text.lower():
                    degree_text = "Yêu cầu bằng Thạc sĩ hoặc tương đương"
                elif "doctoral" in text.lower() or "phd" in text.lower():
                    degree_text = "Yêu cầu bằng Tiến sĩ hoặc tương đương"
                elif "associate" in text.lower():
                    degree_text = "Yêu cầu bằng Cao đẳng hoặc tương đương"
                elif "high school" in text.lower():
                    degree_text = "Yêu cầu tốt nghiệp Trung học phổ thông"
                else:
                    degree_text = f"Yêu cầu: {text}"
            
            elif "experience" in category and text:
                if "no experience" in text.lower() or "none" in text.lower():
                    experience_text = "Không yêu cầu kinh nghiệm"
                elif "1-2 year" in text.lower():
                    experience_text = "Yêu cầu 1-2 năm kinh nghiệm"
                elif "3-5 year" in text.lower():
                    experience_text = "Yêu cầu 3-5 năm kinh nghiệm"
                elif "5+ year" in text.lower() or "more than 5" in text.lower():
                    experience_text = "Yêu cầu trên 5 năm kinh nghiệm"
                else:
                    experience_text = f"Kinh nghiệm: {text}"
        
        return experience_text, degree_text
    
    def get_salary_data(self, conn: psycopg.Connection, onet_code: str) -> Dict[str, Any]:
        """Lấy salary data từ bảng có sẵn"""
        import json
        
        salary_data = {
            "salary_min": None, "salary_max": None, "salary_avg": None, "salary_currency": "VND",
            "salary_min_en": None, "salary_max_en": None, "salary_avg_en": None, "salary_currency_en": "USD",
            "salary_bands": None, "salary_bands_en": None
        }
        
        with conn.cursor(row_factory=dict_row) as cur:
            # Vietnam salary
            cur.execute("""
                SELECT annual_median_vnd, annual_min_vnd, annual_max_vnd,
                       monthly_median_vnd, monthly_min_vnd, monthly_max_vnd
                FROM core.career_wages_vi 
                WHERE onet_code = %s
            """, (onet_code,))
            vi_wages = cur.fetchone()
            
            if vi_wages and vi_wages["annual_min_vnd"]:
                salary_data.update({
                    "salary_min": vi_wages["annual_min_vnd"],
                    "salary_max": vi_wages["annual_max_vnd"], 
                    "salary_avg": vi_wages["annual_median_vnd"],
                    "salary_bands": json.dumps([{
                        "type": "monthly",
                        "min": vi_wages["monthly_min_vnd"],
                        "max": vi_wages["monthly_max_vnd"],
                        "currency": "VND"
                    }]) if vi_wages["monthly_min_vnd"] else json.dumps([])
                })
            
            # US salary
            cur.execute("""
                SELECT annual_median, annual_10th_percentile, annual_90th_percentile,
                       hourly_median
                FROM core.career_wages_us 
                WHERE onet_code = %s
            """, (onet_code,))
            us_wages = cur.fetchone()
            
            if us_wages and us_wages["annual_median"]:
                salary_data.update({
                    "salary_min_en": us_wages["annual_10th_percentile"],
                    "salary_max_en": us_wages["annual_90th_percentile"],
                    "salary_avg_en": us_wages["annual_median"],
                    "salary_bands_en": json.dumps([{
                        "type": "hourly",
                        "rate": float(us_wages["hourly_median"]),
                        "currency": "USD"
                    }]) if us_wages["hourly_median"] else json.dumps([])
                })
        
        return salary_data
    
    def process_career(self, conn: psycopg.Connection, career_id: int, onet_code: str, title: str) -> bool:
        """Xử lý 1 career và trả về True nếu thành công"""
        
        # Kiểm tra dừng sớm
        if self.consecutive_errors >= self.max_consecutive_errors:
            print(f"\n🛑 STOPPING: {self.consecutive_errors} consecutive API errors!")
            self.stats["stopped_early"] = True
            return False
        
        print(f"📋 Processing: {onet_code} - {title}")
        
        # 1. Lấy education data từ API
        edu_data = self.get_education_data(onet_code)
        experience_text, degree_text = self.parse_education_requirements(edu_data)
        
        # 2. Lấy salary data từ database
        salary_data = self.get_salary_data(conn, onet_code)
        
        # 3. Insert/Update career_overview với schema mới
        try:
            with conn.cursor() as cur:
                # Lấy ID max hiện tại và tăng lên 1
                cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM core.career_overview")
                new_id = cur.fetchone()[0]
                
                cur.execute("""
                    INSERT INTO core.career_overview (
                        id, career_id, 
                        experience_text_en, experience_text_vn,
                        degree_text_en, degree_text_vn,
                        salary_min_en, salary_max_en, salary_avg_en, salary_currency_en,
                        salary_min_vn, salary_max_vn, salary_avg_vn, salary_currency_vn,
                        salary_bands_en, salary_bands_vn,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                    ON CONFLICT (career_id) DO UPDATE SET
                        experience_text_en = EXCLUDED.experience_text_en,
                        experience_text_vn = EXCLUDED.experience_text_vn,
                        degree_text_en = EXCLUDED.degree_text_en,
                        degree_text_vn = EXCLUDED.degree_text_vn,
                        salary_min_en = EXCLUDED.salary_min_en,
                        salary_max_en = EXCLUDED.salary_max_en,
                        salary_avg_en = EXCLUDED.salary_avg_en,
                        salary_currency_en = EXCLUDED.salary_currency_en,
                        salary_min_vn = EXCLUDED.salary_min_vn,
                        salary_max_vn = EXCLUDED.salary_max_vn,
                        salary_avg_vn = EXCLUDED.salary_avg_vn,
                        salary_currency_vn = EXCLUDED.salary_currency_vn,
                        salary_bands_en = EXCLUDED.salary_bands_en,
                        salary_bands_vn = EXCLUDED.salary_bands_vn,
                        updated_at = NOW()
                """, (
                    new_id, career_id,
                    experience_text, experience_text,  # EN và VN giống nhau
                    degree_text, degree_text,  # EN và VN giống nhau
                    salary_data["salary_min_en"], salary_data["salary_max_en"], salary_data["salary_avg_en"], salary_data["salary_currency_en"],
                    salary_data["salary_min"], salary_data["salary_max"], salary_data["salary_avg"], salary_data["salary_currency"],
                    salary_data["salary_bands_en"], salary_data["salary_bands"]
                ))
            
            conn.commit()
            print(f"✅ Success: {onet_code}")
            self.stats["successful"] += 1
            return True
            
        except Exception as e:
            print(f"💥 Database error for {onet_code}: {e}")
            self.stats["failed"] += 1
            return False
    
    def clear_existing_data(self, conn: psycopg.Connection):
        """Xóa data cũ trong career_overview"""
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM core.career_overview")
            old_count = cur.fetchone()[0]
            
            if old_count > 0:
                print(f"🗑️  Clearing {old_count} existing records...")
                cur.execute("DELETE FROM core.career_overview")
                conn.commit()
                print(f"✅ Cleared {old_count} records")
            else:
                print("ℹ️  No existing data to clear")
    
    def run(self):
        """Main execution"""
        if not DATABASE_URL or not API_KEY:
            print("❌ Missing DATABASE_URL or ONET_V2_API_KEY")
            return
        
        print("🚀 Starting Career Overview Reload...")
        print(f"🔑 API Key: {API_KEY}")
        print(f"🗄️  Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
        print("=" * 60)
        
        try:
            with psycopg.connect(DATABASE_URL) as conn:
                # 1. Clear existing data
                self.clear_existing_data(conn)
                
                # 2. Get all careers
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute("""
                        SELECT id, onet_code, title_en 
                        FROM core.careers 
                        WHERE onet_code IS NOT NULL 
                        ORDER BY id
                    """)
                    careers = cur.fetchall()
                
                self.stats["total_careers"] = len(careers)
                print(f"📊 Found {self.stats['total_careers']} careers to process")
                
                # 3. Process each career
                for i, career in enumerate(careers, 1):
                    if self.stats["stopped_early"]:
                        break
                    
                    self.stats["processed"] += 1
                    print(f"\n[{i}/{self.stats['total_careers']}] ", end="")
                    
                    success = self.process_career(
                        conn, 
                        career["id"], 
                        career["onet_code"], 
                        career["title_en"]
                    )
                    
                    if not success:
                        self.stats["failed"] += 1
                    
                    # Small delay to avoid rate limiting
                    time.sleep(0.2)
                
                # 4. Final stats
                self.print_final_stats()
                
        except Exception as e:
            print(f"💥 Fatal error: {e}")
        finally:
            self.client.close()
    
    def print_final_stats(self):
        """In thống kê cuối cùng"""
        print("\n" + "="*60)
        print("📊 FINAL STATISTICS:")
        print(f"   Total careers: {self.stats['total_careers']}")
        print(f"   Processed: {self.stats['processed']}")
        print(f"   Successful: {self.stats['successful']}")
        print(f"   Failed: {self.stats['failed']}")
        print(f"   API errors: {self.stats['api_errors']}")
        print(f"   Success rate: {self.stats['successful']/self.stats['processed']*100:.1f}%" if self.stats['processed'] > 0 else "   Success rate: 0%")
        print(f"   Stopped early: {self.stats['stopped_early']}")
        
        if self.stats["successful"] > 0:
            print(f"\n✅ Successfully loaded overview data for {self.stats['successful']} careers!")
        
        if self.stats["stopped_early"]:
            print(f"\n⚠️  Process stopped early due to {self.max_consecutive_errors} consecutive API errors")
            print("   This may indicate API quota limits or temporary issues")

if __name__ == "__main__":
    loader = CareerOverviewLoader()
    loader.run()