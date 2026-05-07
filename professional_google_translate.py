#!/usr/bin/env python3
import psycopg2
import requests
import time
import json

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

def translate_with_google_api(text, target_lang='en', source_lang='vi'):
    """Dịch văn bản sử dụng Google Translate API miễn phí"""
    try:
        # Sử dụng Google Translate API miễn phí
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': source_lang,
            'tl': target_lang,
            'dt': 't',
            'q': text
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            translated_text = ""
            
            # Ghép các phần dịch lại
            for sentence in result[0]:
                if sentence[0]:
                    translated_text += sentence[0]
            
            return translated_text.strip()
        else:
            print(f"❌ Google API Error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Translation Error: {e}")
        return None

def manual_professional_translate(vietnamese_text):
    """Dịch thủ công chuyên nghiệp cho các trường hợp đặc biệt"""
    
    # Từ điển dịch chuyên nghiệp cho ngành nghề
    professional_dict = {
        # Sales Representatives
        "họ tư vấn cho khách hàng về các loại linh kiện kỹ thuật phù hợp với nhu cầu sửa chữa hoặc thay thế máy móc thiết bị": 
        "they advise customers on technical components suitable for equipment repair or replacement needs",
        
        "bên cạnh đó, họ thường xuyên quản lý lượng hàng tồn kho và duy trì liên lạc để hỗ trợ kịp thời cho khách hàng trong suốt quá trình sử dụng":
        "additionally, they regularly manage inventory levels and maintain communication to provide timely support to customers throughout the usage process",
        
        # Chief Executives  
        "họ chịu trách nhiệm cao nhất về hiệu quả hoạt động và sự phát triển chiến lược dài hạn của toàn bộ đơn vị":
        "they are ultimately responsible for operational efficiency and long-term strategic development of the entire organization",
        
        "các nhiệm vụ chính bao gồm phê duyệt kế hoạch kinh doanh, quản lý nguồn lực cấp cao và đại diện cho tổ chức trước công chúng":
        "key responsibilities include approving business plans, managing senior resources, and representing the organization to the public",
        
        # Sustainability Officers
        "vị trí này tập trung vào việc tích hợp các quy tắc bảo vệ môi trường và trách nhiệm xã hội vào chiến lược kinh doanh cốt lõi":
        "this position focuses on integrating environmental protection regulations and social responsibility into core business strategy",
        
        "họ giám sát việc tuân thủ các quy định về sinh thái và thúc đẩy các sáng kiến xanh nhằm nâng cao giá trị thương hiệu bền vững":
        "they oversee compliance with ecological regulations and promote green initiatives to enhance sustainable brand value",
        
        # General Managers
        "họ giám sát các hoạt động hàng ngày để đảm bảo quy trình sản xuất và cung ứng dịch vụ diễn ra trơn tru và hiệu quả":
        "they supervise daily operations to ensure production processes and service delivery run smoothly and efficiently",
        
        "vai trò này bao gồm việc tối ưu hóa hiệu suất làm việc của các bộ phận, quản lý ngân sách vận hành và điều phối nguồn nhân lực":
        "this role includes optimizing departmental work performance, managing operational budgets, and coordinating human resources",
        
        # Legislators
        "họ đại diện cho cử tri để đề xuất các chính sách công và giám sát hoạt động của cơ quan hành pháp nhằm đảm bảo quyền lợi cho cộng đồng":
        "they represent constituents to propose public policies and oversee executive agency activities to ensure community benefits",
        
        "công việc bao gồm thảo luận tại nghị trường, biểu quyết các dự luật và tham gia các cuộc họp hội đồng địa phương":
        "work includes parliamentary debates, voting on bills, and participating in local council meetings",
        
        # Advertising Managers
        "họ làm việc với các bộ phận sáng tạo để xây dựng các chiến dịch truyền thông hấp dẫn trên nhiều nền tảng khác nhau":
        "they work with creative departments to develop attractive communication campaigns across multiple platforms",
        
        "nhiệm vụ bao gồm đàm phán hợp đồng với đối tác truyền thông, quản lý ngân sách tiếp thị và đánh giá mức độ hiệu quả của từng chiến dịch":
        "tasks include negotiating contracts with media partners, managing marketing budgets, and evaluating the effectiveness of each campaign",
    }
    
    # Kiểm tra xem có câu nào khớp hoàn toàn không
    text_lower = vietnamese_text.lower().strip()
    for vi_text, en_text in professional_dict.items():
        if vi_text.lower() in text_lower:
            return en_text
    
    return None

def main():
    cur = conn.cursor()
    
    print("=== DỊCH CHUYÊN NGHIỆP VỚI GOOGLE TRANSLATE ===")
    
    # Tạo backup
    print("1. Tạo backup...")
    cur.execute("DROP TABLE IF EXISTS core.careers_backup_google")
    cur.execute("CREATE TABLE core.careers_backup_google AS SELECT * FROM core.careers")
    conn.commit()
    print("✅ Đã tạo backup: core.careers_backup_google")
    
    # Lấy tất cả records
    cur.execute("""
        SELECT id, onet_code, description_vi
        FROM core.careers 
        WHERE description_vi IS NOT NULL
        ORDER BY id
    """)
    
    records = cur.fetchall()
    total_records = len(records)
    print(f"2. Tìm thấy {total_records} records cần dịch")
    
    updated_count = 0
    
    print("3. Bắt đầu dịch với Google Translate...")
    
    for i, (record_id, onet_code, description_vi) in enumerate(records, 1):
        try:
            # Thử dịch thủ công trước
            description_en = manual_professional_translate(description_vi)
            
            # Nếu không có trong từ điển thủ công, dùng Google Translate
            if not description_en:
                description_en = translate_with_google_api(description_vi)
                time.sleep(0.1)  # Tránh bị rate limit
            
            if description_en:
                # Cập nhật database
                cur.execute("""
                    UPDATE core.careers 
                    SET description_en = %s, updated_at = NOW()
                    WHERE id = %s
                """, (description_en, record_id))
                
                updated_count += 1
                
                # Hiển thị progress mỗi 50 records
                if i % 50 == 0:
                    print(f"   Đã dịch: {i}/{total_records} records ({i/total_records*100:.1f}%)")
                    conn.commit()
                    
                # Hiển thị sample cho Sales Representatives
                if onet_code == "41-2022.00":
                    print(f"\n   🎯 SALES REPRESENTATIVES (41-2022.00):")
                    print(f"   VI: {description_vi}")
                    print(f"   EN: {description_en}")
                    print("   " + "="*80)
                    
        except Exception as e:
            print(f"❌ Lỗi record {record_id} ({onet_code}): {e}")
            continue
    
    # Commit cuối cùng
    conn.commit()
    
    print(f"\n=== HOÀN THÀNH ===")
    print(f"✅ Đã dịch thành công {updated_count}/{total_records} records")
    
    # Kiểm tra Sales Representatives
    cur.execute("""
        SELECT description_en
        FROM core.careers 
        WHERE onet_code = '41-2022.00'
    """)
    
    result = cur.fetchone()
    if result:
        print(f"\n🎯 KẾT QUẢ CUỐI CÙNG - SALES REPRESENTATIVES:")
        print(f"   {result[0]}")
    
    print(f"\n🎉 HOÀN THÀNH DỊCH CHUYÊN NGHIỆP!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()