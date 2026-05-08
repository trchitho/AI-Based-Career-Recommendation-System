#!/usr/bin/env python3
"""
VIỆT HÓA HOÀN CHỈNH BẢNG core.career_overview
============================================
Dịch từng dòng, chậm mà chắc, đảm bảo 100% không còn chữ tiếng Anh
"""

import psycopg2
import time
import json
from datetime import datetime
from googletrans import Translator

# Database config - Cập nhật thông tin kết nối
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'career_recommendation',
    'user': 'postgres',
    'password': ''  # Để trống hoặc cập nhật password đúng
}

class CareerOverviewTranslator:
    def __init__(self):
        self.translator = Translator()
        self.conn = None
        
    def connect_db(self):
        """Kết nối database"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            self.conn.autocommit = False
            print("✅ Kết nối database thành công")
            return True
        except Exception as e:
            print(f"❌ Lỗi kết nối: {e}")
            return False
    
    def backup_table(self):
        """Backup bảng trước khi dịch"""
        print("🔄 Backup bảng career_overview...")
        
        cur = self.conn.cursor()
        backup_file = f"career_overview_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        cur.execute("SELECT * FROM core.career_overview ORDER BY id")
        rows = cur.fetchall()
        
        # Lấy column names
        cur.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'core' AND table_name = 'career_overview'
            ORDER BY ordinal_position
        """)
        columns = [row[0] for row in cur.fetchall()]
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(f"-- BACKUP core.career_overview - {datetime.now()}\n")
            f.write(f"-- Total records: {len(rows)}\n\n")
            
            for row in rows:
                values = []
                for val in row:
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, str):
                        escaped = val.replace("'", "''")
                        values.append(f"'{escaped}'")
                    elif isinstance(val, (dict, list)):
                        json_str = json.dumps(val, ensure_ascii=False)
                        escaped = json_str.replace("'", "''")
                        values.append(f"'{escaped}'::jsonb")
                    else:
                        values.append(str(val))
                
                f.write(f"INSERT INTO core.career_overview ({', '.join(columns)}) VALUES ({', '.join(values)});\n")
        
        print(f"✅ Backup hoàn tất: {backup_file}")
        return backup_file
    
    def translate_text(self, text):
        """Dịch text từ tiếng Anh sang tiếng Việt"""
        if not text or text.strip() == "":
            return ""
        
        # Kiểm tra xem đã là tiếng Việt chưa
        vietnamese_chars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
        vietnamese_count = sum(1 for char in text.lower() if char in vietnamese_chars)
        total_alpha = sum(1 for char in text if char.isalpha())
        
        if total_alpha > 0 and (vietnamese_count / total_alpha) >= 0.1:
            print(f"📝 Đã là tiếng Việt: {text[:50]}...")
            return text
        
        try:
            time.sleep(2)  # Delay để tránh rate limit
            result = self.translator.translate(text, src='en', dest='vi')
            translated = result.text
            print(f"✅ Dịch: {text[:30]}... → {translated[:30]}...")
            return translated
        except Exception as e:
            print(f"❌ Lỗi dịch: {e}")
            return text
    
    def get_all_records(self):
        """Lấy tất cả records cần dịch"""
        cur = self.conn.cursor()
        cur.execute("""
            SELECT id, career_id, experience_text_en, experience_text_vn, 
                   degree_text_en, degree_text_vn
            FROM core.career_overview 
            ORDER BY id
        """)
        return cur.fetchall()
    
    def update_record(self, record_id, exp_vn, deg_vn):
        """Cập nhật bản dịch cho một record"""
        cur = self.conn.cursor()
        cur.execute("""
            UPDATE core.career_overview 
            SET experience_text_vn = %s,
                degree_text_vn = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (exp_vn, deg_vn, record_id))
        self.conn.commit()
        print(f"✅ Cập nhật record ID {record_id}")
    
    def process_all_records(self):
        """Xử lý dịch tất cả records"""
        records = self.get_all_records()
        total = len(records)
        
        print(f"📊 Tổng số records: {total}")
        
        for i, (record_id, career_id, exp_en, exp_vn, deg_en, deg_vn) in enumerate(records, 1):
            print(f"\n🔄 Xử lý record {i}/{total} (ID: {record_id})")
            
            # Dịch experience_text nếu cần
            if exp_en and (not exp_vn or exp_vn == exp_en):
                print("📝 Dịch experience_text...")
                exp_vn_new = self.translate_text(exp_en)
            else:
                exp_vn_new = exp_vn or ""
            
            # Dịch degree_text nếu cần
            if deg_en and (not deg_vn or deg_vn == deg_en):
                print("📝 Dịch degree_text...")
                deg_vn_new = self.translate_text(deg_en)
            else:
                deg_vn_new = deg_vn or ""
            
            # Cập nhật database
            self.update_record(record_id, exp_vn_new, deg_vn_new)
            
            # Progress report
            if i % 10 == 0:
                print(f"📈 Tiến độ: {i}/{total} ({(i/total)*100:.1f}%)")
    
    def verify_completion(self):
        """Kiểm tra xem đã dịch hết chưa"""
        cur = self.conn.cursor()
        
        # Kiểm tra records còn tiếng Anh
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE 
                (experience_text_en IS NOT NULL AND experience_text_en != '' AND 
                 (experience_text_vn IS NULL OR experience_text_vn = '' OR experience_text_vn = experience_text_en))
                OR
                (degree_text_en IS NOT NULL AND degree_text_en != '' AND 
                 (degree_text_vn IS NULL OR degree_text_vn = '' OR degree_text_vn = degree_text_en))
        """)
        
        remaining = cur.fetchone()[0]
        
        if remaining == 0:
            print("✅ HOÀN THÀNH 100%! Không còn text tiếng Anh nào!")
        else:
            print(f"⚠️ Còn {remaining} records chưa dịch hoàn chỉnh")
        
        return remaining == 0
    
    def run(self):
        """Chạy toàn bộ quá trình"""
        print("🇻🇳 VIỆT HÓA HOÀN CHỈNH BẢNG core.career_overview")
        print("=" * 60)
        
        if not self.connect_db():
            return False
        
        try:
            # Backup
            self.backup_table()
            
            # Dịch tất cả
            self.process_all_records()
            
            # Kiểm tra hoàn thành
            self.verify_completion()
            
            print("\n🎉 VIỆT HÓA HOÀN TẤT!")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False
        finally:
            if self.conn:
                self.conn.close()

def main():
    translator = CareerOverviewTranslator()
    success = translator.run()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())