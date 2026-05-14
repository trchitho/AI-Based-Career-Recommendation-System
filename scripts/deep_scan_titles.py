"""
Scan nghiêm ngặt toàn bộ title_vi — phát hiện MỌI lỗi thực sự
Không false positive: chỉ báo lỗi khi thực sự có vấn đề
"""
import psycopg2
import re

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute("SELECT id, title_en, title_vi FROM core.careers ORDER BY id")
rows = cur.fetchall()
cur.close()
conn.close()

# Từ tiếng Việt hợp lệ có dạng Latin (không phải tiếng Anh)
VN_LATIN_OK = {
    # Từ VN thông dụng
    'và','của','cho','các','trong','với','về','theo','tại','từ','hay','hoặc',
    'nhà','viên','gia','sĩ','trưởng','phó','bộ','khu','vực','ban','hội',
    'đồng','tổng','cục','vụ','phòng','chi','nhánh','trung','tâm','học',
    'sinh','giáo','công','ty','doanh','nghiệp','quản','lý','giám','đốc',
    'nhân','kỹ','thuật','chuyên','điều','phối','hành','chính','tài',
    'kinh','phát','triển','nghiên','cứu','khoa','thông','tin','môi',
    'trường','xây','dựng','giao','thông','vận','tải','nông','lâm',
    'thủy','sản','khai','thác','sản','xuất','chế','biến','thương','mại',
    'dịch','vụ','đào','tạo','tế','sức','khỏe','pháp','luật','ninh',
    'quốc','phòng','văn','hóa','nghệ','thể','thao','lịch','khách',
    'sạn','tư','vấn','hỗ','trợ','tra','thanh','soát','vệ','cứu',
    'hộ','nạn','cháy','chữa','cảnh','sát','quân','đội','hải','quan',
    'thuế','ngân','hàng','bảo','hiểm','chứng','khoán','bất','động',
    'kiến','trúc','thiết','quy','hoạch','địa','chính','môi','giới',
    'định','giá','thẩm','nhận','phân','tích','quản','trị','điện',
    'tử','sinh','hóa','lý','toán','thống','kê','lịch','sử','triết',
    'tâm','xã','nhân','báo','chí','truyền','phim','ảnh','nhạc',
    'thực','phẩm','dược','thiết','bị','máy','móc','khiển','tự','động',
    # Từ kỹ thuật VN hợp lệ
    'quan','tang','chia','nhanh','video','marketing','logistics','diesel',
    'tuabin','quang','minh','dinh','phong','hoang','gian','rang','nung',
    'tinh','trong','nguy','khoan','quay','phanh','mang','thang','phun',
    'nghe','taxi','rong','treo','chia','tang','tang','phlebotomist',
    # Từ chuyên ngành VN
    'radar','sonar','laser','plasma','nano','robot','drone','blockchain',
    'marketing','logistics','diesel','tuabin','photovoltaic',
    # Tên riêng / viết tắt chấp nhận được
    'ceo','cfo','cto','coo','cmo','chro','cio','lp','llp','md','phd',
    'bartender','concierge','freelancer','startup',
}

# Từ tiếng Anh THỰC SỰ — nếu xuất hiện trong title_vi thì là lỗi
REAL_ENGLISH_PATTERNS = [
    # Từ tiếng Anh rõ ràng không phải VN
    r'\b(manager|director|officer|specialist|analyst|coordinator|supervisor|'
    r'engineer|technician|technologist|scientist|researcher|consultant|'
    r'administrator|operator|inspector|examiner|investigator|auditor|'
    r'planner|designer|developer|programmer|architect|contractor|'
    r'representative|agent|broker|dealer|trader|buyer|seller|'
    r'worker|laborer|helper|assistant|aide|attendant|clerk|'
    r'teacher|instructor|professor|trainer|coach|counselor|advisor|'
    r'doctor|physician|nurse|therapist|pharmacist|dentist|'
    r'driver|pilot|captain|operator|mechanic|repairman|'
    r'setter|tender|fabricator|assembler|installer|'
    r'grader|sorter|packer|loader|handler|mover|'
    r'writer|editor|reporter|journalist|photographer|'
    r'artist|performer|musician|actor|dancer|'
    r'manager|supervisor|foreman|superintendent)\b',
    # Pattern "X Thay đổi Y" — dịch từng từ không tự nhiên
    r'\bThay đổi\b.{0,20}\bngười\b',
    # "Sau Trung học" viết hoa giữa câu
    r'(?<!\A),\s*Sau\s+Trung\s+học',
    r'(?<!\A),\s*Sau\s+trung\s+học',
    # Từ tiếng Anh còn sót rõ ràng
    r'\b(postsecondary|secondary|primary|elementary|kindergarten)\b',
    r'\b(except|including|general|related|other|all)\b',
    r'\b(and|or|with|for|the|of|in|on|at|by|from)\b',
]

def find_real_issues(en, vi):
    """Tìm lỗi thực sự trong title_vi."""
    issues = []
    if not vi:
        return ["Trống"]
    if vi.strip() == en.strip():
        return ["Không dịch — giống EN"]

    vi_lower = vi.lower()

    # 1. Kiểm tra từ tiếng Anh thực sự (lowercase, không phải từ VN)
    for pattern in REAL_ENGLISH_PATTERNS:
        matches = re.findall(pattern, vi_lower, re.IGNORECASE)
        if matches:
            issues.append(f"Từ EN: {matches[:2]}")

    # 2. Kiểm tra từ Latin viết thường >= 5 ký tự không phải VN
    latin_lower = re.findall(r'\b[a-z]{5,}\b', vi)
    suspicious = []
    for w in latin_lower:
        if w not in VN_LATIN_OK and not any(c in w for c in 'àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹỵ'):
            suspicious.append(w)
    if suspicious:
        issues.append(f"Latin không rõ: {suspicious[:3]}")

    # 3. Dịch máy móc — pattern "X người Y" khi X là danh từ tiếng Anh
    if re.search(r'\b[A-Z][a-z]+ người\b', vi):
        issues.append("Dịch cứng: 'X người'")

    # 4. Viết hoa bất thường giữa câu (không phải tên riêng)
    # Tìm từ viết hoa ở giữa câu (không phải đầu câu, không phải sau dấu phẩy hợp lệ)
    words = vi.split()
    bad_caps = []
    for i, w in enumerate(words[1:], 1):  # bỏ từ đầu
        if re.match(r'^[A-Z][a-z]{2,}$', w):
            # Cho phép một số từ viết hoa hợp lệ
            if w not in {'Việt', 'Nam', 'Hà', 'Nội', 'Hồ', 'Chí', 'Minh',
                         'Đại', 'Trung', 'Tiểu', 'Mầm', 'Sau', 'Trước',
                         'Bắc', 'Nam', 'Đông', 'Tây', 'CEO', 'CFO', 'CTO',
                         'Bartender', 'Marketing', 'Logistics', 'Diesel',
                         'Blockchain', 'Internet', 'Online', 'Offshore',
                         'Anh', 'Pháp', 'Đức', 'Nhật', 'Hàn', 'Trung',
                         'Mỹ', 'Úc', 'Canada', 'Nga', 'Ý', 'Tây', 'Ban',
                         'Nha', 'Bồ', 'Đào', 'Nha', 'Hà', 'Lan',
                         'Sau', 'Trung', 'Học', 'Viện', 'Khoa',
                         }:
                bad_caps.append(w)
    if bad_caps:
        issues.append(f"Viết hoa giữa câu: {bad_caps[:3]}")

    # 5. Lặp từ có nghĩa (không phải lặp giới từ)
    meaningful_words = [w.lower() for w in words if len(w) > 3 and
                        not any(c in w for c in '()[].,/')]
    from collections import Counter
    counts = Counter(meaningful_words)
    real_dupes = [w for w, c in counts.items() if c >= 2 and
                  w not in {'viên', 'nhân', 'công', 'thợ', 'kỹ', 'thuật',
                             'quản', 'lý', 'giám', 'sát', 'điều', 'phối',
                             'hành', 'chính', 'tài', 'chính', 'kinh',
                             'doanh', 'phát', 'triển', 'nghiên', 'cứu',
                             'khoa', 'học', 'công', 'nghệ', 'thông', 'tin',
                             'môi', 'trường', 'xây', 'dựng', 'giao', 'thông',
                             'vận', 'tải', 'nông', 'nghiệp', 'sản', 'xuất',
                             'thương', 'mại', 'dịch', 'vụ', 'giáo', 'dục',
                             'đào', 'tạo', 'pháp', 'luật', 'văn', 'hóa',
                             'nghệ', 'thuật', 'thể', 'thao', 'tư', 'vấn',
                             'bảo', 'vệ', 'cứu', 'hộ', 'ngân', 'hàng',
                             'bất', 'động', 'kiến', 'trúc', 'thiết', 'kế',
                             'phân', 'tích', 'điện', 'tử', 'sinh', 'học',
                             'hóa', 'học', 'vật', 'lý', 'toán', 'học',
                             'lịch', 'sử', 'tâm', 'lý', 'xã', 'hội',
                             'nhân', 'văn', 'báo', 'chí', 'truyền', 'thông',
                             'thực', 'phẩm', 'dược', 'phẩm', 'máy', 'móc',
                             'người', 'nhà', 'gia', 'sĩ', 'viên', 'thợ',
                             'bác', 'sĩ', 'nha', 'dược', 'điều', 'dưỡng',
                             'kỹ', 'sư', 'lập', 'trình', 'thiết', 'kế',
                             'quản', 'trị', 'hành', 'chính', 'tài', 'chính',
                             'kinh', 'tế', 'thống', 'kê', 'địa', 'lý',
                             'lịch', 'triết', 'học', 'ngôn', 'ngữ',
                             'văn', 'học', 'nghệ', 'nhạc', 'phim', 'ảnh',
                             'thể', 'dục', 'thể', 'thao', 'du', 'lịch',
                             'khách', 'sạn', 'nhà', 'hàng', 'bán', 'lẻ',
                             'bán', 'buôn', 'hỗ', 'trợ', 'thanh', 'tra',
                             'kiểm', 'soát', 'cứu', 'nạn', 'cháy', 'chữa',
                             'cảnh', 'sát', 'quân', 'đội', 'hải', 'quan',
                             'thuế', 'chứng', 'khoán', 'bảo', 'hiểm',
                             'quy', 'hoạch', 'thẩm', 'định', 'chứng', 'nhận',
                             'robot', 'drone', 'laser', 'radar', 'nano',
                             'diesel', 'tuabin', 'quang', 'điện',
                             }]
    if real_dupes:
        issues.append(f"Lặp từ: {real_dupes[:2]}")

    return issues

# Scan
bad = []
for row_id, en, vi in rows:
    issues = find_real_issues(en, vi)
    if issues:
        bad.append((row_id, en, vi, issues))

print(f"Tổng: {len(rows)} bản ghi")
print(f"Có vấn đề: {len(bad)}\n")

if bad:
    print("=" * 70)
    for row_id, en, vi, issues in bad:
        print(f"id={row_id}")
        print(f"  EN: {en}")
        print(f"  VI: {vi}")
        print(f"  ⚠️  {' | '.join(issues)}")
        print()
else:
    print("✅ Không tìm thấy lỗi nào!")
