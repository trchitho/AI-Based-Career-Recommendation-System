#!/usr/bin/env python3
import psycopg2
import requests
import time

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

def translate_with_google(text):
    """Dịch với Google Translate API miễn phí"""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': 'vi',
            'tl': 'en', 
            'dt': 't',
            'q': text
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            result = response.json()
            translated = ""
            
            for sentence in result[0]:
                if sentence[0]:
                    translated += sentence[0]
            
            return translated.strip()
        else:
            return None
            
    except Exception as e:
        print(f"❌ Google API Error: {e}")
        return None

def manual_translate_sales_rep():
    """Dịch thủ công cho Sales Representatives"""
    return "They advise customers on technical components suitable for equipment repair or replacement needs. Additionally, they regularly manage inventory levels and maintain communication to provide timely support to customers throughout the usage process."

def main():
    cur = conn.cursor()
    
    print("=== DỊCH HOÀN THIỆN TẤT CẢ DESCRIPTION_EN ===")
    
    # Tạo backup
    cur.execute("DROP TABLE IF EXISTS core.careers_backup_final")
    cur.execute("CREATE TABLE core.careers_backup_final AS SELECT * FROM core.careers")
    conn.commit()
    print("✅ Đã tạo backup: core.careers_backup_final")
    
    # Lấy tất cả records
    cur.execute("""
        SELECT id, onet_code, description_vi
        FROM core.careers 
        WHERE description_vi IS NOT NULL
        ORDER BY id
    """)
    
    records = cur.fetchall()
    total_records = len(records)
    print(f"📊 Tìm thấy {total_records} records cần dịch")
    
    updated_count = 0
    
    for i, (record_id, onet_code, description_vi) in enumerate(records, 1):
        try:
            description_en = None
            
            # Dịch thủ công cho Sales Representatives
            if onet_code == "41-2022.00":
                description_en = manual_translate_sales_rep()
                print(f"\n🎯 SALES REPRESENTATIVES - Dịch thủ công:")
                print(f"   VI: {description_vi}")
                print(f"   EN: {description_en}")
                print("   " + "="*80)
            else:
                # Dùng Google Translate cho các nghề khác
                description_en = translate_with_google(description_vi)
                time.sleep(0.1)  # Tránh rate limit
            
            if description_en:
                # Cập nhật database
                cur.execute("""
                    UPDATE core.careers 
                    SET description_en = %s, updated_at = NOW()
                    WHERE id = %s
                """, (description_en, record_id))
                
                updated_count += 1
                
                # Progress mỗi 100 records
                if i % 100 == 0:
                    print(f"   Đã dịch: {i}/{total_records} records ({i/total_records*100:.1f}%)")
                    conn.commit()
                    
        except Exception as e:
            print(f"❌ Lỗi record {record_id} ({onet_code}): {e}")
            continue
    
    # Commit cuối cùng
    conn.commit()
    
    print(f"\n=== HOÀN THÀNH ===")
    print(f"✅ Đã dịch thành công {updated_count}/{total_records} records")
    
    # Kiểm tra kết quả Sales Representatives
    cur.execute("""
        SELECT description_en
        FROM core.careers 
        WHERE onet_code = '41-2022.00'
    """)
    
    result = cur.fetchone()
    if result:
        print(f"\n🎯 KẾT QUẢ CUỐI CÙNG - SALES REPRESENTATIVES:")
        print(f"   {result[0]}")
    
    # Kiểm tra một vài records khác
    print(f"\n📝 SAMPLE KẾT QUẢ KHÁC:")
    cur.execute("""
        SELECT onet_code, LEFT(description_en, 100) as sample
        FROM core.careers 
        WHERE description_en IS NOT NULL
        ORDER BY id
        LIMIT 5
    """)
    
    for i, (onet, sample) in enumerate(cur.fetchall(), 1):
        print(f"{i}. {onet}: {sample}...")
    
    print(f"\n🎉 HOÀN THÀNH DỊCH HOÀN THIỆN!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()