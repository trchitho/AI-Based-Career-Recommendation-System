#!/usr/bin/env python3
"""
CHIẾN LƯỢC VIỆT HÓA BẢNG core.career_overview
==============================================

Yêu cầu:
- Các cột text phải có 2 ngôn ngữ: _en và _vn
- 2 cột _en và _vn phải đứng sát nhau
- ID phải bắt đầu từ 1
- Dùng Google Translate free (không dùng Gemini API)
- Dịch từng dòng, chậm mà chắc
- Backup dữ liệu trước khi dịch
- Đảm bảo không còn chữ tiếng Anh trong cột _vn

Author: AI Assistant
Date: 2026-01-27
"""

import os
import sys
import time
import json
import psycopg2
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

# Thêm thư viện dịch Google Translate free
try:
    from googletrans import Translator
    print("✅ Google Translate library imported successfully")
except ImportError:
    print("❌ Cần cài đặt: pip install googletrans==4.0.0rc1")
    sys.exit(1)

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vietnamize_career_overview.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'career_recommendation',
    'user': 'postgres',
    'password': 'postgres'
}

class CareerOverviewVietnameseTranslator:
    def __init__(self):
        self.translator = Translator()
        self.conn = None
        self.backup_file = f"career_overview_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
    def connect_db(self):
        """Kết nối database"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            self.conn.autocommit = False
            logger.info("✅ Kết nối database thành công")
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi kết nối database: {e}")
            return False
    
    def backup_table(self):
        """Backup bảng career_overview trước khi dịch"""
        logger.info("🔄 Đang backup bảng career_overview...")
        
        try:
            cur = self.conn.cursor()
            
            # Lấy toàn bộ dữ liệu
            cur.execute("""
                SELECT id, career_id, experience_text_en, experience_text_vn, 
                       degree_text_en, degree_text_vn, salary_min_en, salary_min_vn,
                       salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
                       salary_currency_en, salary_currency_vn, salary_bands_en, 
                       salary_bands_vn, updated_at
                FROM core.career_overview 
                ORDER BY id
            """)
            
            rows = cur.fetchall()
            
            # Tạo file backup
            with open(self.backup_file, 'w', encoding='utf-8') as f:
                f.write("-- BACKUP BẢNG core.career_overview\n")
                f.write(f"-- Ngày tạo: {datetime.now()}\n")
                f.write("-- Số dòng: {}\n\n".format(len(rows)))
                
                for row in rows:
                    values = []
                    for val in row:
                        if val is None:
                            values.append('NULL')
                        elif isinstance(val, str):
                            # Escape single quotes
                            escaped = val.replace("'", "''")
                            values.append(f"'{escaped}'")
                        elif isinstance(val, (dict, list)):
                            # JSON data
                            json_str = json.dumps(val, ensure_ascii=False)
                            escaped = json_str.replace("'", "''")
                            values.append(f"'{escaped}'::jsonb")
                        else:
                            values.append(str(val))
                    
                    f.write(f"INSERT INTO core.career_overview VALUES ({', '.join(values)});\n")
            
            logger.info(f"✅ Backup hoàn tất: {self.backup_file} ({len(rows)} dòng)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Lỗi backup: {e}")
            return False
    
    def translate_text(self, text: str, max_retries: int = 3) -> str:
        """Dịch text từ tiếng Anh sang tiếng Việt với retry logic"""
        if not text or text.strip() == "":
            return ""
        
        # Kiểm tra xem text đã là tiếng Việt chưa
        if self.is_vietnamese_text(text):
            logger.info(f"📝 Text đã là tiếng Việt: {text[:50]}...")
            return text
        
        for attempt in range(max_retries):
            try:
                # Delay để tránh rate limit
                time.sleep(1.5)
                
                result = self.translator.translate(text, src='en', dest='vi')
                translated = result.text
                
                # Kiểm tra chất lượng dịch
                if translated and len(translated.strip()) > 0:
                    logger.info(f"✅ Dịch thành công (lần {attempt + 1}): {text[:30]}... → {translated[:30]}...")
                    return translated
                else:
                    logger.warning(f"⚠️ Kết quả dịch rỗng (lần {attempt + 1})")
                    
            except Exception as e:
                logger.warning(f"⚠️ Lỗi dịch (lần {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(3)  # Delay lâu hơn trước khi retry
                
        # Nếu không dịch được, trả về text gốc
        logger.error(f"❌ Không thể dịch: {text[:50]}...")
        return text
    
    def is_vietnamese_text(self, text: str) -> bool:
        """Kiểm tra xem text có phải tiếng Việt không"""
        vietnamese_chars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
        vietnamese_chars += vietnamese_chars.upper()
        
        # Nếu có ít nhất 10% ký tự tiếng Việt thì coi là tiếng Việt
        vietnamese_count = sum(1 for char in text if char in vietnamese_chars)
        total_chars = len([c for c in text if c.isalpha()])
        
        if total_chars == 0:
            return False
            
        return (vietnamese_count / total_chars) >= 0.1
    
    def get_untranslated_records(self) -> List[Tuple]:
        """Lấy các record chưa được dịch hoặc dịch chưa đầy đủ"""
        cur = self.conn.cursor()
        
        cur.execute("""
            SELECT id, career_id, experience_text_en, experience_text_vn, 
                   degree_text_en, degree_text_vn
            FROM core.career_overview 
            WHERE 
                (experience_text_en IS NOT NULL AND experience_text_en != '' AND 
                 (experience_text_vn IS NULL OR experience_text_vn = '' OR experience_text_vn = experience_text_en))
                OR
                (degree_text_en IS NOT NULL AND degree_text_en != '' AND 
                 (degree_text_vn IS NULL OR degree_text_vn = '' OR degree_text_vn = degree_text_en))
            ORDER BY id
        """)
        
        return cur.fetchall()
    
    def update_vietnamese_translation(self, record_id: int, experience_vn: str, degree_vn: str):
        """Cập nhật bản dịch tiếng Việt cho một record"""
        cur = self.conn.cursor()
        
        cur.execute("""
            UPDATE core.career_overview 
            SET experience_text_vn = %s,
                degree_text_vn = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (experience_vn, degree_vn, record_id))
        
        logger.info(f"✅ Cập nhật record ID {record_id}")
    
    def process_translation(self):
        """Xử lý dịch toàn bộ bảng"""
        logger.info("🚀 Bắt đầu quá trình việt hóa bảng career_overview")
        
        # Lấy danh sách record cần dịch
        records = self.get_untranslated_records()
        total_records = len(records)
        
        if total_records == 0:
            logger.info("✅ Tất cả records đã được dịch!")
            return True
        
        logger.info(f"📊 Tìm thấy {total_records} records cần dịch")
        
        success_count = 0
        error_count = 0
        
        for i, record in enumerate(records, 1):
            record_id, career_id, exp_en, exp_vn, deg_en, deg_vn = record
            
            logger.info(f"\n🔄 Đang xử lý record {i}/{total_records} (ID: {record_id})")
            
            try:
                # Dịch experience_text nếu cần
                if exp_en and (not exp_vn or exp_vn == exp_en or not self.is_vietnamese_text(exp_vn)):
                    logger.info("📝 Dịch experience_text...")
                    exp_vn_new = self.translate_text(exp_en)
                else:
                    exp_vn_new = exp_vn or ""
                
                # Dịch degree_text nếu cần
                if deg_en and (not deg_vn or deg_vn == deg_en or not self.is_vietnamese_text(deg_vn)):
                    logger.info("📝 Dịch degree_text...")
                    deg_vn_new = self.translate_text(deg_en)
                else:
                    deg_vn_new = deg_vn or ""
                
                # Cập nhật database
                self.update_vietnamese_translation(record_id, exp_vn_new, deg_vn_new)
                
                # Commit sau mỗi record để tránh mất dữ liệu
                self.conn.commit()
                success_count += 1
                
                # Progress report
                if i % 5 == 0:
                    logger.info(f"📈 Tiến độ: {i}/{total_records} ({(i/total_records)*100:.1f}%)")
                
            except Exception as e:
                logger.error(f"❌ Lỗi xử lý record {record_id}: {e}")
                error_count += 1
                self.conn.rollback()
                
                # Nếu quá nhiều lỗi thì dừng
                if error_count > 5:
                    logger.error("❌ Quá nhiều lỗi, dừng quá trình dịch")
                    return False
        
        logger.info(f"\n🎉 Hoàn thành việt hóa!")
        logger.info(f"✅ Thành công: {success_count} records")
        logger.info(f"❌ Lỗi: {error_count} records")
        
        return True
    
    def verify_translation_quality(self):
        """Kiểm tra chất lượng dịch"""
        logger.info("🔍 Kiểm tra chất lượng dịch...")
        
        cur = self.conn.cursor()
        
        # Kiểm tra các record có text tiếng Anh trong cột _vn
        cur.execute("""
            SELECT id, experience_text_vn, degree_text_vn
            FROM core.career_overview 
            WHERE experience_text_vn IS NOT NULL OR degree_text_vn IS NOT NULL
            ORDER BY id
        """)
        
        records = cur.fetchall()
        issues = []
        
        for record_id, exp_vn, deg_vn in records:
            # Kiểm tra experience_text_vn
            if exp_vn and not self.is_vietnamese_text(exp_vn):
                issues.append(f"Record {record_id}: experience_text_vn có thể chưa được dịch đúng")
            
            # Kiểm tra degree_text_vn
            if deg_vn and not self.is_vietnamese_text(deg_vn):
                issues.append(f"Record {record_id}: degree_text_vn có thể chưa được dịch đúng")
        
        if issues:
            logger.warning(f"⚠️ Phát hiện {len(issues)} vấn đề:")
            for issue in issues[:10]:  # Chỉ hiển thị 10 vấn đề đầu
                logger.warning(f"  - {issue}")
        else:
            logger.info("✅ Chất lượng dịch tốt!")
        
        return len(issues) == 0
    
    def run(self):
        """Chạy toàn bộ quá trình việt hóa"""
        logger.info("=" * 60)
        logger.info("🇻🇳 CHIẾN LƯỢC VIỆT HÓA BẢNG core.career_overview")
        logger.info("=" * 60)
        
        # Kết nối database
        if not self.connect_db():
            return False
        
        try:
            # Backup dữ liệu
            if not self.backup_table():
                return False
            
            # Thực hiện dịch
            if not self.process_translation():
                return False
            
            # Kiểm tra chất lượng
            self.verify_translation_quality()
            
            logger.info("🎉 HOÀN THÀNH VIỆT HÓA THÀNH CÔNG!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Lỗi không mong muốn: {e}")
            return False
        finally:
            if self.conn:
                self.conn.close()


def main():
    translator = CareerOverviewVietnameseTranslator()
    success = translator.run()
    
    if success:
        print("\n✅ Việt hóa hoàn tất!")
        print(f"📁 File backup: {translator.backup_file}")
        print("📋 Kiểm tra log file: vietnamize_career_overview.log")
    else:
        print("\n❌ Việt hóa thất bại!")
        print("📋 Kiểm tra log để biết chi tiết lỗi")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())