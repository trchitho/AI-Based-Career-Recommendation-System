#!/usr/bin/env python3
"""
Script xóa sạch và nạp lại dữ liệu career_overview từ ONET API v2
Sử dụng dữ liệu lương từ bảng core.career_wages_us và core.career_wages_vi
Theo pattern của onet_client_v2.py
"""
import psycopg2
import requests
import json
import time
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
DOTENV_PATH = Path(__file__).resolve().parent / "apps/backend/.env"
load_dotenv(DOTENV_PATH, override=True)

# Database connection
DB = os.getenv("DATABASE_URL", 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8')

# ONET API configuration
ONET_V2_API_KEY = os.getenv("ONET_V2_API_KEY", "E3iQ3-3aFXQ-DoXMc-KAHke")
ONET_V2_BASE_URL = os.getenv("ONET_V2_BASE_URL", "https://api-v2.onetcenter.org")
ONET_V2_TIMEOUT = int(os.getenv("ONET_V2_TIMEOUT", "30"))

class CareerOverviewReloader:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': ONET_V2_API_KEY,
            'Accept': 'application/json',
            'User-Agent': 'Career-AI-System/2.0'
        })
        
        # Đếm số lỗi liên tiếp để dừng khi cần
        self.consecutive_errors = 0
        self.max_consecutive_errors = 5
        
    def clear_career_overview_table(self, conn):
        """Xóa sạch dữ liệu trong bảng core.career_overview"""
        print("🗑️  Đang xóa sạch dữ liệu trong bảng core.career_overview...")
        
        cur = conn.cursor()
        
        # Kiểm tra số lượng records hiện tại
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        current_count = cur.fetchone()[0]
        print(f"   📊 Records hiện tại: {current_count:,}")
        
        if current_count == 0:
            print("   ✅ Bảng đã trống!")
            return
        
        # Xóa tất cả dữ liệu
        cur.execute("TRUNCATE TABLE core.career_overview RESTART IDENTITY")
        conn.commit()
        
        # Kiểm tra lại
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        final_count = cur.fetchone()[0]
        
        print(f"   ✅ Đã xóa thành công: {current_count:,} → {final_count:,} records")
        cur.close()
    
    def get_onet_education_data(self, onet_code):
        """Lấy thông tin education từ ONET API v2 theo pattern onet_client_v2.py"""
        try:
            # Sử dụng endpoint education summary như trong onet_client_v2.py
            url = f"{ONET_V2_BASE_URL}/online/occupations/{onet_code}/summary/education"
            
            # Thêm query parameter bắt buộc
            params = {
                'client': 'github_trchitho_ai_b_1'
            }
            
            response = self.session.get(url, params=params, timeout=ONET_V2_TIMEOUT)
            
            if response.status_code == 200:
                # API thành công - reset counter
                self.consecutive_errors = 0
                data = response.json()
                return self.parse_education_data_from_summary(data)
            elif response.status_code == 403:
                self.consecutive_errors += 1
                print(f"   ❌ API 403 Forbidden cho {onet_code} - Lỗi liên tiếp: {self.consecutive_errors}")
                
                # Nếu 5 lỗi liên tiếp thì dừng
                if self.consecutive_errors >= self.max_consecutive_errors:
                    raise Exception(f"API Key không hợp lệ hoặc hết quota! {self.consecutive_errors} lỗi liên tiếp.")
                
                return None
            elif response.status_code == 404:
                # 404 không phải lỗi key - reset counter
                self.consecutive_errors = 0
                print(f"   ⚠️  Không tìm thấy education data cho {onet_code}")
                return None
            else:
                self.consecutive_errors += 1
                print(f"   ❌ API error {response.status_code} cho {onet_code} - Lỗi liên tiếp: {self.consecutive_errors}")
                
                if self.consecutive_errors >= self.max_consecutive_errors:
                    raise Exception(f"API gặp lỗi liên tục! {self.consecutive_errors} lỗi liên tiếp.")
                
                return None
                
        except Exception as e:
            if "API Key không hợp lệ" in str(e) or "API gặp lỗi liên tục" in str(e):
                raise e  # Re-raise để dừng script
            
            self.consecutive_errors += 1
            print(f"   ❌ Lỗi kết nối cho {onet_code}: {e} - Lỗi liên tiếp: {self.consecutive_errors}")
            
            if self.consecutive_errors >= self.max_consecutive_errors:
                raise Exception(f"Kết nối API thất bại liên tục! {self.consecutive_errors} lỗi liên tiếp.")
            
            return None
    
    def parse_education_data_from_summary(self, data):
        """Parse education data từ ONET API v2 summary response"""
        education_info = {
            'experience_text_en': '',
            'degree_text_en': ''
        }
        
        try:
            # Parse education requirements từ response array
            if 'response' in data and isinstance(data['response'], list):
                degree_parts = []
                experience_parts = []
                
                for item in data['response']:
                    if isinstance(item, dict):
                        category = item.get('category', '').lower()
                        description = item.get('description', '')
                        
                        if 'education' in category or 'degree' in category:
                            if description:
                                degree_parts.append(description)
                        elif 'experience' in category or 'training' in category:
                            if description:
                                experience_parts.append(description)
                
                education_info['degree_text_en'] = ' | '.join(degree_parts) if degree_parts else 'Degree requirements vary by employer'
                education_info['experience_text_en'] = ' | '.join(experience_parts) if experience_parts else 'Experience requirements vary by employer'
            
        except Exception as e:
            print(f"   ⚠️  Lỗi parse education data: {e}")
        
        return education_info
    
    def get_salary_data_from_db(self, conn, onet_code):
        """Lấy dữ liệu lương từ bảng core.career_wages_us và core.career_wages_vi"""
        cur = conn.cursor()
        
        salary_data = {
            'salary_min_en': None,
            'salary_max_en': None, 
            'salary_avg_en': None,
            'salary_min_vn': None,
            'salary_max_vn': None,
            'salary_avg_vn': None,
            'salary_currency_en': 'USD',
            'salary_currency_vn': 'VND'
        }
        
        try:
            # Lấy dữ liệu lương US
            cur.execute("""
                SELECT annual_median, annual_10th_percentile, annual_90th_percentile
                FROM core.career_wages_us 
                WHERE onet_code = %s
                ORDER BY id DESC LIMIT 1
            """, (onet_code,))
            
            us_wages = cur.fetchone()
            if us_wages:
                salary_data['salary_avg_en'] = us_wages[0]  # annual_median
                salary_data['salary_min_en'] = us_wages[1]  # annual_10th_percentile
                salary_data['salary_max_en'] = us_wages[2]  # annual_90th_percentile
            
            # Lấy dữ liệu lương VN
            cur.execute("""
                SELECT annual_median_vnd, annual_min_vnd, annual_max_vnd
                FROM core.career_wages_vi 
                WHERE onet_code = %s
                ORDER BY id DESC LIMIT 1
            """, (onet_code,))
            
            vn_wages = cur.fetchone()
            if vn_wages:
                salary_data['salary_avg_vn'] = vn_wages[0]  # annual_median_vnd
                salary_data['salary_min_vn'] = vn_wages[1]  # annual_min_vnd
                salary_data['salary_max_vn'] = vn_wages[2]  # annual_max_vnd
            
        except Exception as e:
            print(f"   ⚠️  Lỗi lấy salary data từ DB cho {onet_code}: {e}")
        
        cur.close()
        return salary_data
    
    def translate_to_vietnamese(self, text_en):
        """Dịch text tiếng Anh sang tiếng Việt"""
        if not text_en:
            return text_en
            
        # Mapping dịch thuật cơ bản
        translations = {
            # Education levels
            "Bachelor's degree": "Bằng cử nhân",
            "Master's degree": "Bằng thạc sĩ", 
            "Doctoral degree": "Bằng tiến sĩ",
            "Associate degree": "Bằng cao đẳng",
            "High school diploma": "Bằng tốt nghiệp phổ thông",
            "Post-secondary certificate": "Chứng chỉ sau phổ thông",
            "Vocational training": "Đào tạo nghề",
            
            # Experience terms
            "work experience": "kinh nghiệm làm việc",
            "on-the-job training": "đào tạo tại chỗ",
            "internship": "thực tập",
            "apprenticeship": "học nghề",
            "required": "yêu cầu",
            "preferred": "ưu tiên",
            "or equivalent": "hoặc tương đương",
            "related field": "lĩnh vực liên quan",
            
            # Common phrases
            "Degree requirements vary by employer": "Yêu cầu bằng cấp tùy theo nhà tuyển dụng",
            "Experience requirements vary by employer": "Yêu cầu kinh nghiệm tùy theo nhà tuyển dụng",
            "Entry level": "Cấp độ mới vào nghề",
            "Mid-level": "Cấp độ trung cấp", 
            "Senior level": "Cấp độ cao cấp",
            "years of experience": "năm kinh nghiệm",
            "minimum": "tối thiểu",
            "typically": "thường thì",
            "usually": "thường là"
        }
        
        result = text_en
        for en, vi in translations.items():
            result = result.replace(en, vi)
        
        return result
    
    def process_career(self, conn, career_id, onet_code):
        """Xử lý một nghề - lấy dữ liệu từ API và DB"""
        print(f"  🔄 Xử lý Career ID {career_id} - {onet_code}")
        
        # Lấy education data từ ONET API - KHÔNG FALLBACK nếu API lỗi
        education_data = self.get_onet_education_data(onet_code)
        if not education_data:
            # Nếu API không trả về data (404, timeout, etc.) thì dùng default
            # Nhưng nếu API key lỗi thì exception đã được raise ở get_onet_education_data
            education_data = {
                'experience_text_en': 'Experience requirements vary by employer and specific role',
                'degree_text_en': 'Degree requirements vary by employer and specific position'
            }
        
        # Dịch sang tiếng Việt
        experience_text_vn = self.translate_to_vietnamese(education_data['experience_text_en'])
        degree_text_vn = self.translate_to_vietnamese(education_data['degree_text_en'])
        
        # Lấy salary data từ database
        salary_data = self.get_salary_data_from_db(conn, onet_code)
        
        return {
            'career_id': career_id,
            'experience_text_en': education_data['experience_text_en'],
            'experience_text_vn': experience_text_vn,
            'degree_text_en': education_data['degree_text_en'],
            'degree_text_vn': degree_text_vn,
            'salary_min_en': salary_data['salary_min_en'],
            'salary_min_vn': salary_data['salary_min_vn'],
            'salary_max_en': salary_data['salary_max_en'],
            'salary_max_vn': salary_data['salary_max_vn'],
            'salary_avg_en': salary_data['salary_avg_en'],
            'salary_avg_vn': salary_data['salary_avg_vn'],
            'salary_currency_en': salary_data['salary_currency_en'],
            'salary_currency_vn': salary_data['salary_currency_vn'],
            'salary_bands_en': json.dumps([]),
            'salary_bands_vn': json.dumps([])
        }

def main():
    print("=" * 70)
    print("🚀 RELOAD CAREER OVERVIEW FROM API V2")
    print("=" * 70)
    print(f"Bắt đầu lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API Key: {ONET_V2_API_KEY}")
    print(f"Base URL: {ONET_V2_BASE_URL}")
    
    try:
        # Initialize reloader
        reloader = CareerOverviewReloader()
        
        # Connect to database
        conn = psycopg2.connect(DB)
        
        # Step 1: Clear existing data
        reloader.clear_career_overview_table(conn)
        
        # Step 2: Get all careers
        cur = conn.cursor()
        cur.execute("""
            SELECT id, onet_code 
            FROM core.careers 
            WHERE onet_code IS NOT NULL
            ORDER BY id
        """)
        
        careers_to_process = cur.fetchall()
        print(f"\n📊 Số nghề cần xử lý: {len(careers_to_process):,}")
        
        if not careers_to_process:
            print("❌ Không có nghề nào để xử lý!")
            return
        
        processed = 0
        failed = 0
        
        # Step 3: Process each career
        for career_id, onet_code in careers_to_process:
            try:
                # Process career - sẽ raise exception nếu API key lỗi 5 lần liên tiếp
                overview_data = reloader.process_career(conn, career_id, onet_code)
                
                # Insert into database
                cur.execute("""
                    INSERT INTO core.career_overview (
                        id, career_id, experience_text_en, experience_text_vn,
                        degree_text_en, degree_text_vn, salary_min_en, salary_min_vn,
                        salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
                        salary_currency_en, salary_currency_vn, salary_bands_en, salary_bands_vn
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    career_id,  # Use career_id as id
                    overview_data['career_id'],
                    overview_data['experience_text_en'],
                    overview_data['experience_text_vn'],
                    overview_data['degree_text_en'],
                    overview_data['degree_text_vn'],
                    overview_data['salary_min_en'],
                    overview_data['salary_min_vn'],
                    overview_data['salary_max_en'],
                    overview_data['salary_max_vn'],
                    overview_data['salary_avg_en'],
                    overview_data['salary_avg_vn'],
                    overview_data['salary_currency_en'],
                    overview_data['salary_currency_vn'],
                    overview_data['salary_bands_en'],
                    overview_data['salary_bands_vn']
                ))
                
                processed += 1
                
                # Commit every 10 records
                if processed % 10 == 0:
                    conn.commit()
                    print(f"  ✅ Đã xử lý {processed}/{len(careers_to_process)} nghề")
                
                # Rate limiting để tránh spam API
                time.sleep(0.2)
                
            except Exception as e:
                # Kiểm tra nếu là lỗi API key hoặc quota
                if "API Key không hợp lệ" in str(e) or "API gặp lỗi liên tục" in str(e) or "Kết nối API thất bại liên tục" in str(e):
                    print(f"\n❌ DỪNG SCRIPT: {e}")
                    print(f"📊 Đã xử lý được {processed}/{len(careers_to_process)} nghề trước khi dừng")
                    
                    # Commit những gì đã làm được
                    conn.commit()
                    
                    # Verify current count
                    cur.execute("SELECT COUNT(*) FROM core.career_overview")
                    current_count = cur.fetchone()[0]
                    print(f"📊 Tổng overview trong DB hiện tại: {current_count:,}/959")
                    
                    # Đóng kết nối và thoát
                    cur.close()
                    conn.close()
                    return
                else:
                    # Lỗi khác (không phải API key) thì tiếp tục
                    print(f"  ❌ Lỗi xử lý Career ID {career_id}: {e}")
                    failed += 1
                    continue
        
        # Final commit
        conn.commit()
        
        print(f"\n" + "=" * 70)
        print("📊 KẾT QUẢ CUỐI CÙNG:")
        print(f"   - Thành công: {processed:,}/{len(careers_to_process):,}")
        print(f"   - Thất bại: {failed:,}")
        print(f"   - Tỷ lệ thành công: {(processed/len(careers_to_process)*100):.1f}%")
        
        # Verify final count
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        final_count = cur.fetchone()[0]
        print(f"   - Tổng overview trong DB: {final_count:,}/959")
        
        if final_count == 959:
            print("🎉 HOÀN THÀNH 100%! Tất cả 959 nghề đã có overview!")
        else:
            remaining = 959 - final_count
            print(f"⚠️  Còn thiếu {remaining} nghề")
        
        cur.close()
        conn.close()
        
        print(f"\nHoàn thành lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"❌ Lỗi chính: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()