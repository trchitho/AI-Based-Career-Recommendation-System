"""Scan toàn bộ title_vi để tìm các bản dịch còn lỗi"""
import psycopg2
import re

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute("SELECT id, title_en, title_vi FROM core.careers ORDER BY id")
rows = cur.fetchall()

def is_bad(en, vi):
    """Phát hiện bản dịch có vấn đề thực sự."""
    if not vi:
        return "Trống"
    
    # 1. Còn nguyên tiếng Anh (không dịch gì cả)
    if vi.strip() == en.strip():
        return "Không dịch"
    
    # 2. Dạng "X Y Z" — có từ tiếng Anh thực sự ở đầu hoặc giữa
    # Tìm từ tiếng Anh >= 4 ký tự, có chữ thường, KHÔNG phải từ VN hợp lệ
    vn_words = {
        'khoa', 'thanh', 'khai', 'thuật', 'trung', 'thay', 'phay', 'bào',
        'trang', 'chính', 'hành', 'viên', 'nhân', 'công', 'nghệ', 'thông',
        'quản', 'giám', 'điều', 'phối', 'hành', 'chính', 'tài', 'chính',
        'kinh', 'doanh', 'phát', 'triển', 'nghiên', 'cứu', 'khoa', 'học',
        'môi', 'trường', 'xây', 'dựng', 'giao', 'thông', 'vận', 'tải',
        'nông', 'nghiệp', 'lâm', 'nghiệp', 'thủy', 'sản', 'sản', 'xuất',
        'thương', 'mại', 'dịch', 'vụ', 'giáo', 'dục', 'đào', 'tạo',
        'pháp', 'luật', 'ninh', 'quốc', 'phòng', 'văn', 'hóa', 'nghệ',
        'thể', 'thao', 'lịch', 'khách', 'sạn', 'tư', 'vấn', 'hỗ', 'trợ',
        'bảo', 'vệ', 'cứu', 'hộ', 'cháy', 'chữa', 'cảnh', 'sát',
        'ngân', 'hàng', 'hiểm', 'chứng', 'khoán', 'bất', 'động',
        'kiến', 'trúc', 'thiết', 'quy', 'hoạch', 'định', 'giá', 'thẩm',
        'chứng', 'nhận', 'phân', 'tích', 'quản', 'trị', 'điện', 'tử',
        'sinh', 'học', 'hóa', 'lý', 'toán', 'thống', 'kê', 'địa',
        'lịch', 'sử', 'triết', 'tâm', 'xã', 'hội', 'nhân', 'văn',
        'báo', 'chí', 'truyền', 'thông', 'phim', 'ảnh', 'nhạc',
        'thực', 'phẩm', 'dược', 'phẩm', 'thiết', 'bị', 'máy', 'móc',
        'điều', 'khiển', 'tự', 'động', 'robot', 'nano', 'laser',
        'plasma', 'radar', 'sonar', 'lidar',
    }
    
    # Từ tiếng Anh thực sự: Latin, >= 4 ký tự, có chữ thường, không phải từ VN
    latin_words = re.findall(r'\b[A-Za-z][a-z]{3,}\b', vi)
    real_en = [w for w in latin_words 
               if w.lower() not in vn_words
               and not w[0].isupper()  # bỏ qua từ viết hoa (tên riêng, viết tắt)
               ]
    if real_en:
        return f"Còn EN: {real_en[:2]}"
    
    # 3. Dạng "X Thay đổi Y" — dịch từng từ không tự nhiên
    # Pattern: danh từ tiếng Anh + từ VN + danh từ tiếng Anh
    mixed = re.findall(r'\b[A-Z][a-z]+\b', vi)
    # Lọc bỏ các từ VN viết hoa hợp lệ ở đầu câu
    suspicious = []
    for i, w in enumerate(mixed):
        if i == 0:
            continue  # bỏ qua từ đầu câu
        if w not in {'Việt', 'Nam', 'Hà', 'Nội', 'Hồ', 'Chí', 'Minh', 'Đà', 'Nẵng',
                     'Huế', 'Cần', 'Thơ', 'Bình', 'Dương', 'Đồng', 'Nai', 'Long',
                     'An', 'Tiền', 'Giang', 'Kiên', 'Giang', 'Sóc', 'Trăng',
                     'Quảng', 'Ngãi', 'Bình', 'Định', 'Phú', 'Yên', 'Khánh',
                     'Hòa', 'Ninh', 'Thuận', 'Bình', 'Thuận', 'Tây', 'Ninh',
                     'Vũng', 'Tàu', 'Bà', 'Rịa', 'Lâm', 'Đồng', 'Gia', 'Lai',
                     'Kon', 'Tum', 'Đắk', 'Lắk', 'Nông', 'Buôn', 'Mê', 'Thuột',
                     'Thừa', 'Thiên', 'Quảng', 'Trị', 'Quảng', 'Bình',
                     'Nghệ', 'Thanh', 'Hóa', 'Ninh', 'Bình', 'Nam', 'Định',
                     'Thái', 'Bình', 'Hải', 'Phòng', 'Hưng', 'Yên', 'Bắc',
                     'Ninh', 'Vĩnh', 'Phúc', 'Phú', 'Thọ', 'Yên', 'Bái',
                     'Lào', 'Cai', 'Lai', 'Châu', 'Điện', 'Biên', 'Sơn',
                     'La', 'Hòa', 'Bình', 'Hà', 'Giang', 'Cao', 'Bằng',
                     'Lạng', 'Sơn', 'Quảng', 'Ninh', 'Thái', 'Nguyên',
                     'Bắc', 'Giang', 'Bắc', 'Kạn', 'Tuyên', 'Quang',
                     # Từ VN viết hoa hợp lệ trong chức danh
                     'Bingo', 'Casino', 'Marketing', 'Manager', 'Director',
                     }:
            suspicious.append(w)
    
    if suspicious:
        return f"Từ viết hoa giữa câu: {suspicious[:2]}"
    
    return None

bad_rows = []
for row_id, en, vi in rows:
    reason = is_bad(en, vi)
    if reason:
        bad_rows.append((row_id, en, vi, reason))

print(f"Tổng: {len(rows)} bản ghi")
print(f"Lỗi: {len(bad_rows)} bản ghi\n")

# Nhóm theo loại lỗi
from collections import Counter
reasons = Counter(r[3].split(':')[0].strip() for r in bad_rows)
print("Phân loại lỗi:")
for reason, count in reasons.most_common():
    print(f"  {reason}: {count}")

print(f"\n--- TẤT CẢ {len(bad_rows)} BẢN DỊCH LỖI ---")
for row_id, en, vi, reason in bad_rows:
    print(f"id={row_id} [{reason}]")
    print(f"  EN: {en}")
    print(f"  VI: {vi}")

cur.close()
conn.close()
