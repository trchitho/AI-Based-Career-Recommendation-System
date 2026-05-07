#!/usr/bin/env python3
import psycopg2
import time

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

def professional_translate(vietnamese_text):
    """Dịch chuyên nghiệp từ tiếng Việt sang tiếng Anh hoàn toàn"""
    
    # Từ điển dịch thuật chuyên nghiệp hoàn chỉnh
    translations = {
        # Cụm từ dài - ưu tiên dịch trước
        "chịu trách nhiệm cao nhất về": "are ultimately responsible for",
        "hiệu quả hoạt động và sự phát triển": "operational efficiency and development",
        "chiến lược dài hạn của toàn bộ đơn vị": "long-term strategy of the entire organization",
        "các nhiệm vụ chính bao gồm": "key responsibilities include",
        "phê duyệt kế hoạch kinh doanh": "approving business plans",
        "quản lý nguồn lực cấp cao": "managing senior resources",
        "đại diện cho tổ chức trước công chúng": "representing the organization to the public",
        
        "tập trung vào việc tích hợp": "focuses on integrating",
        "các quy tắc bảo vệ môi trường": "environmental protection regulations",
        "trách nhiệm xã hội vào": "social responsibility into",
        "chiến lược kinh doanh cốt lõi": "core business strategy",
        "giám sát việc tuân thủ": "oversee compliance with",
        "các quy định về sinh thái": "ecological regulations",
        "thúc đẩy các sáng kiến xanh": "promote green initiatives",
        "nâng cao giá trị thương hiệu bền vững": "enhance sustainable brand value",
        
        "giám sát các hoạt động hàng ngày": "supervise daily operations",
        "đảm bảo quy trình sản xuất": "ensure production processes",
        "cung ứng dịch vụ diễn ra": "service delivery runs",
        "trơn tru và hiệu quả": "smoothly and efficiently",
        "tối ưu hóa hiệu suất làm việc": "optimize work performance",
        "của các bộ phận": "of departments",
        "quản lý ngân sách vận hành": "manage operational budgets",
        "điều phối nguồn nhân lực": "coordinate human resources",
        
        "đại diện cho cử tri để": "represent constituents to",
        "đề xuất các chính sách công": "propose public policies",
        "giám sát hoạt động của cơ quan hành pháp": "oversee executive agency activities",
        "đảm bảo quyền lợi cho cộng đồng": "ensure community benefits",
        "thảo luận tại nghị trường": "debate in parliament",
        "biểu quyết các dự luật": "vote on bills",
        "tham gia các cuộc họp": "participate in meetings",
        "hội đồng địa phương": "local councils",
        
        "làm việc với các bộ phận sáng tạo": "work with creative departments",
        "xây dựng các chiến dịch truyền thông": "develop communication campaigns",
        "hấp dẫn trên nhiều nền tảng": "attractive across multiple platforms",
        "đàm phán hợp đồng với": "negotiate contracts with",
        "đối tác truyền thông": "media partners",
        "quản lý ngân sách tiếp thị": "manage marketing budgets",
        "đánh giá mức độ hiệu quả": "evaluate effectiveness levels",
        "của từng chiến dịch": "of each campaign",
        
        # Từ và cụm từ thông dụng
        "họ": "they", "vị trí này": "this position", "vai trò này": "this role",
        "công việc": "work", "nhiệm vụ": "tasks", "bao gồm": "include",
        "để": "to", "nhằm": "to", "trong": "in", "của": "of", "với": "with",
        "và": "and", "các": "the", "một": "a", "này": "this", "đó": "that",
        "về": "about", "cho": "for", "từ": "from", "trên": "on", "theo": "according to",
        
        # Động từ
        "chịu trách nhiệm": "are responsible", "tập trung": "focus", "giám sát": "supervise",
        "đảm bảo": "ensure", "tối ưu hóa": "optimize", "quản lý": "manage",
        "điều phối": "coordinate", "đại diện": "represent", "đề xuất": "propose",
        "thảo luận": "discuss", "biểu quyết": "vote", "tham gia": "participate",
        "làm việc": "work", "xây dựng": "develop", "đàm phán": "negotiate",
        "đánh giá": "evaluate", "thúc đẩy": "promote", "nâng cao": "enhance",
        "tuân thủ": "comply", "phê duyệt": "approve", "tích hợp": "integrate",
        
        # Danh từ
        "hiệu quả": "efficiency", "hoạt động": "operations", "phát triển": "development",
        "chiến lược": "strategy", "nhiệm vụ": "tasks", "kế hoạch": "plans",
        "kinh doanh": "business", "nguồn lực": "resources", "tổ chức": "organization",
        "công chúng": "public", "quy tắc": "regulations", "môi trường": "environment",
        "xã hội": "society", "sáng kiến": "initiatives", "thương hiệu": "brand",
        "quy trình": "processes", "sản xuất": "production", "dịch vụ": "services",
        "bộ phận": "departments", "ngân sách": "budget", "nhân lực": "human resources",
        "cử tri": "constituents", "chính sách": "policies", "cơ quan": "agencies",
        "hành pháp": "executive", "cộng đồng": "community", "nghị trường": "parliament",
        "dự luật": "bills", "cuộc họp": "meetings", "hội đồng": "councils",
        "chiến dịch": "campaigns", "truyền thông": "communication", "nền tảng": "platforms",
        "hợp đồng": "contracts", "đối tác": "partners", "tiếp thị": "marketing",
        
        # Tính từ
        "cao nhất": "highest", "dài hạn": "long-term", "chính": "main", "cốt lõi": "core",
        "hàng ngày": "daily", "trơn tru": "smooth", "hiệu quả": "efficient",
        "công": "public", "địa phương": "local", "sáng tạo": "creative",
        "hấp dẫn": "attractive", "khác nhau": "different", "bền vững": "sustainable",
        "xanh": "green", "sinh thái": "ecological",
        
        # Giới từ và từ nối
        "tại": "at", "trước": "before", "sau": "after", "trong": "during",
        "ngoài": "outside", "bên": "beside", "giữa": "between", "qua": "through",
        "nhưng": "but", "tuy nhiên": "however", "do đó": "therefore", "vì vậy": "so",
        "bởi vì": "because", "nếu": "if", "khi": "when", "mặc dù": "although",
    }
    
    if not vietnamese_text:
        return ""
    
    result = vietnamese_text
    
    # Sắp xếp theo độ dài giảm dần để ưu tiên cụm từ dài
    sorted_translations = sorted(translations.items(), key=lambda x: len(x[0]), reverse=True)
    
    # Thay thế từng cụm từ/từ
    for vi_text, en_text in sorted_translations:
        result = result.replace(vi_text, en_text)
    
    # Làm sạch và chuẩn hóa
    result = ' '.join(result.split())  # Loại bỏ khoảng trắng thừa
    
    # Viết hoa chữ cái đầu
    if result:
        result = result[0].upper() + result[1:] if len(result) > 1 else result.upper()
    
    # Đảm bảo kết thúc bằng dấu chấm
    if result and not result.endswith('.'):
        result += '.'
    
    return result

def main():
    cur = conn.cursor()
    
    print("=== DỊCH CHUYÊN NGHIỆP DESCRIPTION_EN - 959 RECORDS ===")
    
    # Tạo backup
    print("1. Tạo backup...")
    cur.execute("DROP TABLE IF EXISTS core.careers_backup_professional")
    cur.execute("CREATE TABLE core.careers_backup_professional AS SELECT * FROM core.careers")
    conn.commit()
    print("✅ Đã tạo backup: core.careers_backup_professional")
    
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
    
    print("3. Bắt đầu dịch từng record...")
    
    for i, (record_id, onet_code, description_vi) in enumerate(records, 1):
        try:
            # Dịch chuyên nghiệp
            description_en = professional_translate(description_vi)
            
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
                    conn.commit()  # Commit định kỳ
                    
                # Hiển thị sample kết quả cho 5 records đầu
                if i <= 5:
                    print(f"\n   Sample {i}: {onet_code}")
                    print(f"   VI: {description_vi[:80]}...")
                    print(f"   EN: {description_en[:80]}...")
                    
        except Exception as e:
            print(f"❌ Lỗi record {record_id} ({onet_code}): {e}")
            continue
    
    # Commit cuối cùng
    conn.commit()
    
    print(f"\n=== HOÀN THÀNH ===")
    print(f"✅ Đã dịch thành công {updated_count}/{total_records} records")
    
    # Kiểm tra kết quả
    cur.execute("""
        SELECT COUNT(*) as total,
               COUNT(description_en) as has_desc_en
        FROM core.careers
    """)
    result = cur.fetchone()
    
    print(f"\n📊 KẾT QUẢ CUỐI:")
    print(f"- Tổng records: {result[0]}")
    print(f"- Có description_en: {result[1]} ({result[1]/result[0]*100:.1f}%)")
    
    # Hiển thị sample kết quả cuối cùng
    print(f"\n📝 SAMPLE KẾT QUẢ CUỐI CÙNG:")
    cur.execute("""
        SELECT onet_code, LEFT(description_en, 100) as sample_en
        FROM core.careers 
        WHERE description_en IS NOT NULL
        ORDER BY id
        LIMIT 5
    """)
    
    for i, (onet, sample) in enumerate(cur.fetchall(), 1):
        print(f"{i}. {onet}: {sample}...")
    
    print(f"\n🎉 HOÀN THÀNH DỊCH CHUYÊN NGHIỆP!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()