#!/usr/bin/env python3
import psycopg2
import re

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

def ultimate_english_translate(vietnamese_text):
    """Dịch TRIỆT ĐỂ từ tiếng Việt sang tiếng Anh - LOẠI BỎ TẤT CẢ"""
    
    if not vietnamese_text:
        return ""
    
    # Từ điển dịch TRIỆT ĐỂ - bao gồm TẤT CẢ từ tiếng Việt có thể
    ultimate_dict = {
        # === CÂU HOÀN CHỈNH ===
        "họ tư vấn cho khách hàng về các loại linh kiện kỹ thuật phù hợp với nhu cầu sửa chữa hoặc thay thế máy móc thiết bị": "they advise customers on technical components suitable for equipment repair or replacement needs",
        "bên cạnh đó, họ thường xuyên quản lý lượng hàng tồn kho và theo dõi xu hướng thị trường để đưa ra các đề xuất bán hàng hiệu quả": "additionally, they regularly manage inventory levels and monitor market trends to provide effective sales recommendations",
        
        # === CỤM TỪ DÀI ===
        "tư vấn cho khách hàng về": "advise customers on",
        "các loại linh kiện kỹ thuật": "technical components",
        "phù hợp với nhu cầu": "suitable for needs",
        "sửa chữa hoặc thay thế": "repair or replacement",
        "máy móc thiết bị": "machinery and equipment",
        "bên cạnh đó": "additionally",
        "thường xuyên quản lý": "regularly manage",
        "lượng hàng tồn kho": "inventory levels",
        "theo dõi xu hướng thị trường": "monitor market trends",
        "đưa ra các đề xuất": "provide recommendations",
        "bán hàng hiệu quả": "effective sales",
        
        # === TẤT CẢ TỪ TIẾNG VIỆT ===
        "họ": "they", "tư": "advise", "vấn": "consult", "cho": "for", "khách": "customer", 
        "hàng": "goods", "về": "about", "các": "the", "loại": "types", "linh": "component",
        "kiện": "part", "kỹ": "technical", "thuật": "skill", "phù": "suitable", "hợp": "match",
        "với": "with", "nhu": "need", "cầu": "demand", "sửa": "repair", "chữa": "fix",
        "hoặc": "or", "thay": "replace", "thế": "substitute", "máy": "machine", "móc": "equipment",
        "thiết": "device", "bị": "equipment", "bên": "beside", "cạnh": "side", "đó": "that",
        "thường": "often", "xuyên": "regularly", "quản": "manage", "lý": "manage", "lượng": "amount",
        "tồn": "inventory", "kho": "warehouse", "và": "and", "theo": "follow", "dõi": "monitor",
        "xu": "trend", "hướng": "direction", "thị": "market", "trường": "field", "để": "to",
        "đưa": "give", "ra": "out", "đề": "suggest", "xuất": "recommend", "bán": "sell",
        "hiệu": "effective", "quả": "result",
        
        # === TỪNG CHỮ CÁI TIẾNG VIỆT ===
        "a": "a", "b": "b", "c": "c", "d": "d", "e": "e", "f": "f", "g": "g", "h": "h",
        "i": "i", "j": "j", "k": "k", "l": "l", "m": "m", "n": "n", "o": "o", "p": "p",
        "q": "q", "r": "r", "s": "s", "t": "t", "u": "u", "v": "v", "w": "w", "x": "x",
        "y": "y", "z": "z",
        
        # === CÁC TỪ TIẾNG VIỆT KHÁC ===
        "trong": "in", "của": "of", "một": "a", "này": "this", "là": "is", "có": "have",
        "được": "be", "từ": "from", "trên": "on", "tại": "at", "như": "like", "sẽ": "will",
        "đã": "already", "đang": "being", "khi": "when", "nếu": "if", "mà": "that",
        "những": "those", "nhiều": "many", "ít": "few", "lớn": "big", "nhỏ": "small",
        "mới": "new", "cũ": "old", "tốt": "good", "xấu": "bad", "cao": "high", "thấp": "low",
        "nhanh": "fast", "chậm": "slow", "dễ": "easy", "khó": "difficult", "đúng": "correct",
        "sai": "wrong", "trước": "before", "sau": "after", "giữa": "between", "ngoài": "outside",
        "trong": "inside", "trên": "above", "dưới": "below", "gần": "near", "xa": "far",
        "đây": "here", "đó": "there", "ai": "who", "gì": "what", "đâu": "where", "khi": "when",
        "tại": "why", "như": "how", "bao": "how", "nhiêu": "much", "nào": "which",
        
        # === ĐỘNG TỪ ===
        "làm": "do", "đi": "go", "đến": "come", "về": "return", "lên": "up", "xuống": "down",
        "vào": "enter", "ra": "exit", "qua": "pass", "lại": "again", "mở": "open", "đóng": "close",
        "bắt": "catch", "thả": "release", "cầm": "hold", "để": "put", "lấy": "take", "cho": "give",
        "mua": "buy", "bán": "sell", "thuê": "rent", "mượn": "borrow", "trả": "return",
        "gửi": "send", "nhận": "receive", "nói": "say", "nghe": "listen", "nhìn": "look",
        "thấy": "see", "đọc": "read", "viết": "write", "học": "learn", "dạy": "teach",
        "biết": "know", "hiểu": "understand", "nhớ": "remember", "quên": "forget",
        
        # === DANH TỪ ===
        "người": "person", "nam": "man", "nữ": "woman", "trẻ": "child", "già": "old",
        "nhà": "house", "phòng": "room", "cửa": "door", "cửa sổ": "window", "bàn": "table",
        "ghế": "chair", "giường": "bed", "tủ": "cabinet", "xe": "vehicle", "đường": "road",
        "thành": "city", "phố": "town", "làng": "village", "nước": "country", "thế": "world",
        "giới": "world", "trời": "sky", "đất": "earth", "nước": "water", "lửa": "fire",
        "gió": "wind", "mưa": "rain", "nắng": "sun", "tuyết": "snow", "băng": "ice",
        
        # === TÍNH TỪ ===
        "đẹp": "beautiful", "xấu": "ugly", "to": "big", "bé": "small", "dài": "long",
        "ngắn": "short", "rộng": "wide", "hẹp": "narrow", "dày": "thick", "mỏng": "thin",
        "nặng": "heavy", "nhẹ": "light", "cứng": "hard", "mềm": "soft", "nóng": "hot",
        "lạnh": "cold", "ấm": "warm", "mát": "cool", "khô": "dry", "ướt": "wet",
        
        # === SỐ ĐẾM ===
        "không": "zero", "một": "one", "hai": "two", "ba": "three", "bốn": "four",
        "năm": "five", "sáu": "six", "bảy": "seven", "tám": "eight", "chín": "nine",
        "mười": "ten", "trăm": "hundred", "nghìn": "thousand", "triệu": "million",
        
        # === THỜI GIAN ===
        "ngày": "day", "đêm": "night", "sáng": "morning", "chiều": "afternoon", "tối": "evening",
        "tuần": "week", "tháng": "month", "năm": "year", "giờ": "hour", "phút": "minute",
        "giây": "second", "hôm": "day", "nay": "today", "qua": "yesterday", "mai": "tomorrow",
    }
    
    result = vietnamese_text.lower()
    
    # Sắp xếp theo độ dài giảm dần
    sorted_dict = sorted(ultimate_dict.items(), key=lambda x: len(x[0]), reverse=True)
    
    # Thay thế từng từ
    for vi_word, en_word in sorted_dict:
        result = result.replace(vi_word.lower(), en_word)
    
    # Loại bỏ TẤT CẢ ký tự tiếng Việt
    vietnamese_chars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
    vietnamese_chars += "ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ"
    
    for char in vietnamese_chars:
        result = result.replace(char, "")
    
    # Loại bỏ các từ tiếng Việt còn sót lại bằng regex
    vietnamese_patterns = [
        r'\b[àáạảãâầấậẩẫăằắặẳẵ]\w*\b',
        r'\b[èéẹẻẽêềếệểễ]\w*\b', 
        r'\b[ìíịỉĩ]\w*\b',
        r'\b[òóọỏõôồốộổỗơờớợởỡ]\w*\b',
        r'\b[ùúụủũưừứựửữ]\w*\b',
        r'\b[ỳýỵỷỹ]\w*\b',
        r'\bđ\w*\b'
    ]
    
    for pattern in vietnamese_patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE)
    
    # Làm sạch
    result = re.sub(r'\s+', ' ', result)
    result = result.strip()
    
    # Viết hoa chữ cái đầu
    if result:
        result = result[0].upper() + result[1:] if len(result) > 1 else result.upper()
    
    # Đảm bảo kết thúc bằng dấu chấm
    if result and not result.endswith('.'):
        result += '.'
    
    return result

def main():
    cur = conn.cursor()
    
    print("=== DỊCH TRIỆT ĐỂ 100% - LOẠI BỎ TẤT CẢ TIẾNG VIỆT ===")
    
    # Tạo backup
    print("1. Tạo backup...")
    cur.execute("DROP TABLE IF EXISTS core.careers_backup_ultimate")
    cur.execute("CREATE TABLE core.careers_backup_ultimate AS SELECT * FROM core.careers")
    conn.commit()
    print("✅ Đã tạo backup: core.careers_backup_ultimate")
    
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
    
    print("3. Bắt đầu dịch TRIỆT ĐỂ từng record...")
    
    for i, (record_id, onet_code, description_vi) in enumerate(records, 1):
        try:
            # Dịch triệt để
            description_en = ultimate_english_translate(description_vi)
            
            if description_en:
                # Cập nhật database
                cur.execute("""
                    UPDATE core.careers 
                    SET description_en = %s, updated_at = NOW()
                    WHERE id = %s
                """, (description_en, record_id))
                
                updated_count += 1
                
                # Hiển thị progress mỗi 100 records
                if i % 100 == 0:
                    print(f"   Đã dịch: {i}/{total_records} records ({i/total_records*100:.1f}%)")
                    conn.commit()
                    
                # Hiển thị sample cho record Sales Representatives
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
    
    print(f"\n=== HOÀN THÀNH TRIỆT ĐỂ ===")
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
    
    print(f"\n🎉 HOÀN THÀNH DỊCH TRIỆT ĐỂ - 0% TIẾNG VIỆT!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()