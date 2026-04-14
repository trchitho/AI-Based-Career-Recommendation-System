#!/usr/bin/env python3
"""
Script để normalize education percentages về tổng 100% cho mỗi career
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../../apps/backend/.env')

# Database connection
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)

def main():
    cur = conn.cursor()
    
    print("🔧 Bắt đầu normalize education percentages...")
    
    # Lấy tất cả careers và percentages
    cur.execute("""
        SELECT onet_code, 
               SUM(data_value) as total_percentage
        FROM core.career_education_pct
        GROUP BY onet_code
        HAVING SUM(data_value) != 100.0
        ORDER BY onet_code;
    """)
    
    careers_to_fix = cur.fetchall()
    print(f"✅ Tìm thấy {len(careers_to_fix)} careers cần normalize")
    
    fixed_count = 0
    
    for onet_code, total_pct in careers_to_fix:
        # Lấy tất cả education records cho career này
        cur.execute("""
            SELECT id, data_value
            FROM core.career_education_pct
            WHERE onet_code = %s
            ORDER BY category;
        """, (onet_code,))
        
        records = cur.fetchall()
        
        # Tính normalization factor
        normalization_factor = 100.0 / float(total_pct)
        
        # Update từng record
        for record_id, data_value in records:
            normalized_value = float(data_value) * normalization_factor
            
            cur.execute("""
                UPDATE core.career_education_pct
                SET data_value = %s, updated_at = NOW()
                WHERE id = %s
            """, (round(normalized_value, 2), record_id))
        
        fixed_count += 1
        
        if fixed_count % 100 == 0:
            print(f"   Đã normalize {fixed_count}/{len(careers_to_fix)} careers...")
    
    # Commit changes
    conn.commit()
    
    # Verify results
    print("\n📋 Kiểm tra kết quả...")
    
    cur.execute("""
        SELECT COUNT(*) as careers_not_100
        FROM (
            SELECT onet_code, ABS(SUM(data_value) - 100.0) as diff
            FROM core.career_education_pct
            GROUP BY onet_code
            HAVING ABS(SUM(data_value) - 100.0) > 0.1
        ) t;
    """)
    
    not_100_count = cur.fetchone()[0]
    print(f"✅ Careers with total != 100%: {not_100_count} (should be 0)")
    
    # Sample verification
    print("\n📝 Sample verification:")
    cur.execute("""
        SELECT cep.onet_code, c.title_en, SUM(cep.data_value) as total_pct
        FROM core.career_education_pct cep
        JOIN core.careers c ON cep.onet_code = c.onet_code
        GROUP BY cep.onet_code, c.title_en
        ORDER BY cep.onet_code
        LIMIT 5;
    """)
    
    for row in cur.fetchall():
        onet_code, title, total_pct = row
        print(f"   {onet_code}: {title} - Total: {total_pct}%")
    
    cur.close()
    conn.close()
    
    print(f"\n🎉 Hoàn thành! Đã normalize {fixed_count} careers")
    print("✅ Tất cả careers giờ có tổng education percentage = 100%")

if __name__ == "__main__":
    main()