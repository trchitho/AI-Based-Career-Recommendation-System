"""
Fix dứt điểm tất cả title_vi còn lỗi trong core.careers
"""
import psycopg2
import re

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

# Từ điển fix thủ công — key=title_en, value=title_vi đúng
FIXES = {
    # Postsecondary teachers — bỏ "Sau Trung học", thêm "(Đại học)"
    "Computer Science Teachers, Postsecondary": "Giảng viên Khoa học Máy tính (Đại học)",
    "Mathematical Science Teachers, Postsecondary": "Giảng viên Khoa học Toán học (Đại học)",
    "Engineering Teachers, Postsecondary": "Giảng viên Kỹ thuật (Đại học)",
    "Biological Science Teachers, Postsecondary": "Giảng viên Khoa học Sinh học (Đại học)",
    "Atmospheric, Earth, Marine, and Space Sciences Teachers, Postsecondary": "Giảng viên Khoa học Khí quyển, Trái đất, Biển và Vũ trụ (Đại học)",
    "Environmental Science Teachers, Postsecondary": "Giảng viên Khoa học Môi trường (Đại học)",
    "Physics Teachers, Postsecondary": "Giảng viên Vật lý (Đại học)",
    "Economics Teachers, Postsecondary": "Giảng viên Kinh tế (Đại học)",
    "Nursing Instructors and Teachers, Postsecondary": "Giảng viên Điều dưỡng (Đại học)",
    "Education Teachers, Postsecondary": "Giảng viên Giáo dục học (Đại học)",
    "Library Science Teachers, Postsecondary": "Giảng viên Khoa học Thư viện (Đại học)",
    "Criminal Justice and Law Enforcement Teachers, Postsecondary": "Giảng viên Tư pháp Hình sự và Thực thi Pháp luật (Đại học)",
    "Art, Drama, and Music Teachers, Postsecondary": "Giảng viên Nghệ thuật, Kịch nghệ và Âm nhạc (Đại học)",
    "Communications Teachers, Postsecondary": "Giảng viên Truyền thông (Đại học)",
    "English Language and Literature Teachers, Postsecondary": "Giảng viên Ngôn ngữ và Văn học Anh (Đại học)",
    "Family and Consumer Sciences Teachers, Postsecondary": "Giảng viên Khoa học Gia đình và Tiêu dùng (Đại học)",
    "Recreation and Fitness Studies Teachers, Postsecondary": "Giảng viên Giải trí và Thể dục (Đại học)",
    "Career/Technical Education Teachers, Postsecondary": "Giảng viên Giáo dục Nghề nghiệp và Kỹ thuật (Đại học)",
    "Social Work Teachers, Postsecondary": "Giảng viên Công tác Xã hội (Đại học)",

    # Các chức danh bị dịch sai nghĩa
    "Gambling Change Persons and Booth Cashiers": "Nhân viên đổi tiền và thu ngân quầy cờ bạc",
    "Gambling Dealers": "Nhân viên chia bài",
    "Gambling Managers": "Quản lý cơ sở cờ bạc",
    "Gambling Service Workers, All Other": "Nhân viên dịch vụ cờ bạc (khác)",
    "Slot Supervisors": "Giám sát máy đánh bạc",

    "Park Naturalists": "Nhà tự nhiên học công viên",
    "Phlebotomists": "Kỹ thuật viên lấy máu",
    "Funeral Attendants": "Nhân viên phục vụ tang lễ",
    "Morticians, Undertakers, and Funeral Arrangers": "Nhân viên tổ chức và điều hành tang lễ",
    "Funeral Home Managers": "Quản lý nhà tang lễ",

    "Paperhangers": "Thợ dán giấy dán tường",
    "Terrazzo Workers and Finishers": "Thợ lát và hoàn thiện sàn terrazzo",
    "Fiberglass Laminators and Fabricators": "Thợ ép và chế tạo sợi thủy tinh",

    "Log Graders and Scalers": "Nhân viên phân loại và đo lường gỗ tròn",
    "Maintenance and Repair Workers, General": "Công nhân bảo trì và sửa chữa tổng hợp",

    "Pesticide Handlers, Sprayers, and Applicators, Vegetation": "Nhân viên xử lý và phun thuốc trừ sâu thực vật",
    "Coating, Painting, and Spraying Machine Setters, Operators, and Tenders": "Thợ vận hành máy phủ, sơn và phun",
    "Drilling and Boring Machine Tool Setters, Operators, and Tenders, Metal and Plastic": "Thợ vận hành máy khoan và doa (kim loại và nhựa)",
    "Rotary Drill Operators, Oil and Gas": "Thợ vận hành máy khoan xoay dầu khí",
    "Earth Drillers, Except Oil and Gas": "Thợ khoan đất (trừ dầu khí)",
    "Food and Tobacco Roasting, Baking, and Drying Machine Operators and Tenders": "Thợ vận hành máy rang, nướng và sấy thực phẩm và thuốc lá",
    "Furnace, Kiln, Oven, Drier, and Kettle Operators and Tenders": "Thợ vận hành lò nung, lò nướng, máy sấy và nồi hơi",
    "Separating, Filtering, Clarifying, Precipitating, and Still Machine Setters, Operators, and Tenders": "Thợ vận hành máy tách, lọc, làm trong và kết tủa",
    "Extruding and Forming Machine Setters, Operators, and Tenders, Synthetic and Glass Fibers": "Thợ vận hành máy ép đùn và tạo hình sợi tổng hợp và sợi thủy tinh",

    "Bus and Truck Mechanics and Diesel Engine Specialists": "Thợ cơ khí xe buýt, xe tải và chuyên gia động cơ diesel",
    "Wind Turbine Service Technicians": "Kỹ thuật viên bảo dưỡng tuabin gió",
    "Solar Photovoltaic Installers": "Thợ lắp đặt pin năng lượng mặt trời",
    "Elevator and Escalator Installers and Repairers": "Thợ lắp đặt và sửa chữa thang máy và thang cuốn",
    "Hazardous Materials Removal Workers": "Công nhân xử lý và loại bỏ vật liệu nguy hiểm",
    "Electric Motor, Power Tool, and Related Repairers": "Thợ sửa chữa động cơ điện và dụng cụ điện",
    "Audiovisual Equipment Installers and Repairers": "Thợ lắp đặt và sửa chữa thiết bị nghe nhìn",
    "Automotive Body and Related Repairers": "Thợ sửa chữa thân vỏ xe ô tô",

    "Door-to-Door Sales Workers, News and Street Vendors, and Related Workers": "Nhân viên bán hàng tận nhà, người bán báo và hàng rong",
    "Machine Feeders and Offbearers": "Công nhân nạp liệu và lấy sản phẩm máy",
    "Railroad Brake, Signal, and Switch Operators and Locomotive Firers": "Thợ vận hành phanh, tín hiệu và ghi đường sắt",
    "Transportation Inspectors": "Thanh tra giao thông vận tải",

    "Pressers, Textile, Garment, and Related Materials": "Thợ ép dệt may và vật liệu liên quan",

    "Biofuels/Biodiesel Technology and Product Development Managers": "Quản lý phát triển công nghệ và sản phẩm nhiên liệu sinh học",
    "Equal Opportunity Representatives and Officers": "Đại diện và cán bộ cơ hội bình đẳng",
    "Customs Brokers": "Đại lý hải quan",
    "Fraud Examiners, Investigators and Analysts": "Chuyên viên kiểm tra, điều tra và phân tích gian lận",
    "Architects, Except Landscape and Naval": "Kiến trúc sư (trừ cảnh quan và hải quân)",
    "Landscape Architects": "Kiến trúc sư cảnh quan",
    "Photonics Engineers": "Kỹ sư quang tử",
    "Photonics Technicians": "Kỹ thuật viên quang tử",
    "Zoologists and Wildlife Biologists": "Nhà động vật học và sinh vật học hoang dã",
    "Social Scientists and Related Workers, All Other": "Nhà khoa học xã hội và nhân viên liên quan (khác)",
    "Fine Artists, Including Painters, Sculptors, and Illustrators": "Nghệ sĩ mỹ thuật (họa sĩ, nhà điêu khắc và minh họa viên)",
    "Artists and Related Workers, All Other": "Nghệ sĩ và nhân viên liên quan (khác)",
    "Umpires, Referees, and Other Sports Officials": "Trọng tài và cán bộ thể thao",
    "Entertainers and Performers, Sports and Related Workers, All Other": "Nghệ sĩ biểu diễn, vận động viên và nhân viên liên quan (khác)",
    "Critical Care Nurses": "Điều dưỡng chăm sóc tích cực",
    "Radiologists": "Bác sĩ X-quang",
    "Radiologic Technologists and Technicians": "Kỹ thuật viên X-quang",
    "Veterinary Assistants and Laboratory Animal Caretakers": "Trợ lý thú y và người chăm sóc động vật thí nghiệm",
    "Customs and Border Protection Officers": "Cán bộ hải quan và bảo vệ biên giới",
    "Food Preparation and Serving Related Workers, All Other": "Nhân viên chuẩn bị và phục vụ thực phẩm (khác)",
    "First-Line Supervisors of Landscaping, Lawn Service, and Groundskeeping Workers": "Giám sát trực tiếp nhân viên cảnh quan và chăm sóc sân vườn",
    "Landscaping and Groundskeeping Workers": "Nhân viên cảnh quan và chăm sóc sân vườn",
}

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    print(f"Áp dụng {len(FIXES)} bản fix thủ công...")

    updated = 0
    not_found = []

    for title_en, title_vi_new in FIXES.items():
        cur.execute("""
            UPDATE core.careers
            SET title_vi = %s, updated_at = NOW()
            WHERE title_en = %s AND title_vi != %s
        """, (title_vi_new, title_en, title_vi_new))

        if cur.rowcount > 0:
            updated += cur.rowcount
            print(f"  ✅ {title_en}")
            print(f"     -> {title_vi_new}")
        else:
            # Kiểm tra xem có tồn tại không
            cur.execute("SELECT title_vi FROM core.careers WHERE title_en = %s", (title_en,))
            row = cur.fetchone()
            if row:
                print(f"  ⏭️  Đã đúng: {title_en} -> {row[0]}")
            else:
                not_found.append(title_en)

    conn.commit()
    print(f"\n✅ Đã update: {updated} bản ghi")

    if not_found:
        print(f"\n⚠️  Không tìm thấy {len(not_found)} title_en:")
        for t in not_found:
            print(f"  - {t}")

    # =========================================================
    # Kiểm tra lại sau fix
    # =========================================================
    print("\n--- Kiểm tra lại 20 dòng đã fix ---")
    sample_titles = list(FIXES.keys())[:20]
    for title_en in sample_titles:
        cur.execute("SELECT title_vi FROM core.careers WHERE title_en = %s", (title_en,))
        row = cur.fetchone()
        if row:
            print(f"  EN: {title_en}")
            print(f"  VI: {row[0]}")
            print()

    cur.close()
    conn.close()
    print("✅ Hoàn tất fix.")

if __name__ == '__main__':
    main()
