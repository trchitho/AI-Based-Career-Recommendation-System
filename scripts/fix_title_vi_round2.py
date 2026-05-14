"""Fix dứt điểm vòng 2 — tất cả lỗi còn lại"""
import psycopg2

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

# key = title_en, value = title_vi đúng
FIXES = {
    # Postsecondary còn sót (chưa fix vòng 1)
    "Business Teachers, Postsecondary": "Giảng viên Kinh doanh (Đại học)",
    "Architecture Teachers, Postsecondary": "Giảng viên Kiến trúc (Đại học)",
    "Agricultural Sciences Teachers, Postsecondary": "Giảng viên Khoa học Nông nghiệp (Đại học)",
    "Forestry and Conservation Science Teachers, Postsecondary": "Giảng viên Lâm nghiệp và Khoa học Bảo tồn (Đại học)",
    "Chemistry Teachers, Postsecondary": "Giảng viên Hóa học (Đại học)",
    "Anthropology and Archeology Teachers, Postsecondary": "Giảng viên Nhân chủng học và Khảo cổ học (Đại học)",
    "Area, Ethnic, and Cultural Studies Teachers, Postsecondary": "Giảng viên Nghiên cứu Khu vực, Dân tộc và Văn hóa (Đại học)",
    "Geography Teachers, Postsecondary": "Giảng viên Địa lý (Đại học)",
    "Political Science Teachers, Postsecondary": "Giảng viên Khoa học Chính trị (Đại học)",
    "Psychology Teachers, Postsecondary": "Giảng viên Tâm lý học (Đại học)",
    "Sociology Teachers, Postsecondary": "Giảng viên Xã hội học (Đại học)",
    "Health Specialties Teachers, Postsecondary": "Giảng viên Chuyên ngành Sức khỏe (Đại học)",
    "Law Teachers, Postsecondary": "Giảng viên Luật (Đại học)",
    "Foreign Language and Literature Teachers, Postsecondary": "Giảng viên Ngoại ngữ và Văn học (Đại học)",
    "History Teachers, Postsecondary": "Giảng viên Lịch sử (Đại học)",
    "Philosophy and Religion Teachers, Postsecondary": "Giảng viên Triết học và Tôn giáo (Đại học)",
    "Teaching Assistants, Postsecondary": "Trợ giảng (Đại học)",

    # Lặp từ / dịch sai nghĩa
    "Entertainment and Recreation Managers, Except Gambling": "Quản lý giải trí và vui chơi (trừ cờ bạc)",
    "Arbitrators, Mediators, and Conciliators": "Trọng tài, hòa giải viên và người dàn xếp",
    "Social and Human Service Assistants": "Trợ lý dịch vụ xã hội và hỗ trợ cộng đồng",
    "Adult Basic Education, Adult Secondary Education, and English as a Second Language Instructors":
        "Giảng viên Giáo dục cơ bản, Giáo dục trung học dành cho người lớn và Tiếng Anh như ngôn ngữ thứ hai",
    "Teaching Assistants, Preschool, Elementary, Middle, and Secondary School, Except Special Education":
        "Trợ giảng bậc mầm non, tiểu học, trung học cơ sở và trung học phổ thông (trừ giáo dục đặc biệt)",
    "First-Line Supervisors of Entertainment and Recreation Workers, Except Gambling Services":
        "Giám sát trực tiếp nhân viên giải trí và vui chơi (trừ dịch vụ cờ bạc)",
    "Amusement and Recreation Attendants": "Nhân viên phục vụ khu vui chơi và giải trí",
    "Costume Attendants": "Nhân viên phục trang",
    "Locker Room, Coatroom, and Dressing Room Attendants": "Nhân viên phòng thay đồ và phòng để đồ",
    "Exercise Trainers and Group Fitness Instructors": "Huấn luyện viên thể dục và hướng dẫn viên thể hình nhóm",
    "Low Vision Therapists, Orientation and Mobility Specialists, and Vision Rehabilitation Therapists":
        "Nhà trị liệu thị lực kém, chuyên gia định hướng và vận động, và nhà trị liệu phục hồi thị giác",
    "Licensed Practical and Licensed Vocational Nurses": "Y tá thực hành và y tá dạy nghề được cấp phép",
    "Farmworkers, Farm, Ranch, and Aquacultural Animals":
        "Công nhân nông trại, chăn nuôi và nuôi trồng thủy sản",
    "Plumbers, Pipefitters, and Steamfitters": "Thợ ống nước, ống dẫn và hơi nước",
    "Plasterers and Stucco Masons": "Thợ trát tường và xây vữa",
    "Watch and Clock Repairers": "Thợ sửa đồng hồ đeo tay và đồng hồ treo tường",
    "Butchers and Meat Cutters": "Người bán thịt và thợ pha lóc thịt",
    "Grinding, Lapping, Polishing, and Buffing Machine Tool Setters, Operators, and Tenders, Metal and Plastic":
        "Thợ vận hành máy mài, đánh bóng và đánh bóng bề mặt (kim loại và nhựa)",
    "Lathe and Turning Machine Tool Setters, Operators, and Tenders, Metal and Plastic":
        "Thợ vận hành máy tiện (kim loại và nhựa)",
    "Printing Press Operators": "Thợ vận hành máy in",
    "Print Binding and Finishing Workers": "Công nhân đóng sách và hoàn thiện ấn phẩm",
    "Laundry and Dry-Cleaning Workers": "Công nhân giặt ủi và giặt khô",
    "Sewers, Hand": "Thợ may tay",
    "Fabric and Apparel Patternmakers": "Người tạo mẫu vải và quần áo",
    "Water and Wastewater Treatment Plant and System Operators":
        "Thợ vận hành nhà máy và hệ thống xử lý nước và nước thải",
    "Mixing and Blending Machine Setters, Operators, and Tenders":
        "Thợ vận hành máy trộn và pha trộn",
    "Painting, Coating, and Decorating Workers": "Công nhân sơn, phủ và trang trí",
    "Computer Numerically Controlled Tool Operators": "Thợ vận hành máy công cụ CNC (điều khiển số)",
    "Cooling and Freezing Equipment Operators and Tenders":
        "Thợ vận hành thiết bị làm lạnh và cấp đông",
    "Etchers and Engravers": "Thợ khắc axit và thợ khắc chạm",
    "Laborers and Freight, Stock, and Material Movers, Hand":
        "Công nhân bốc vác và vận chuyển hàng hóa, kho bãi và vật liệu bằng tay",
    "Packers and Packagers, Hand": "Thợ đóng gói và bao bì bằng tay",
    "Manicurists and Pedicurists": "Thợ làm móng tay và chân",
    "Makeup Artists, Theatrical and Performance": "Nghệ sĩ trang điểm sân khấu và biểu diễn",

    # Viết hoa giữa câu
    "Spa Managers": "Quản lý spa",
    "Brownfield Redevelopment Specialists and Site Managers":
        "Chuyên gia tái phát triển khu đất ô nhiễm và quản lý địa điểm",
    "Robotics Engineers": "Kỹ sư robot",
    "Family Medicine Physicians": "Bác sĩ y học gia đình",
    "Opticians, Dispensing": "Chuyên gia nhãn khoa và pha chế kính",
    "Rail Yard Engineers, Dinkey Operators, and Hostlers":
        "Kỹ sư sân đường sắt, thợ vận hành đầu máy nhỏ và nhân viên dồn tàu",
    "Biological Science Teachers, Postsecondary": "Giảng viên Khoa học Sinh học (Đại học)",
    "Economics Teachers, Postsecondary": "Giảng viên Kinh tế (Đại học)",
    "Family and Consumer Sciences Teachers, Postsecondary":
        "Giảng viên Khoa học Gia đình và Tiêu dùng (Đại học)",

    # Lặp từ khác
    "Mining and Geological Engineers, Including Mining Safety Engineers":
        "Kỹ sư khai thác mỏ và địa chất (bao gồm kỹ sư an toàn mỏ)",
    "Elevator and Escalator Installers and Repairers":
        "Thợ lắp đặt và sửa chữa thang máy và thang cuốn",

    # Terrazzo — giữ nguyên tên kỹ thuật
    "Terrazzo Workers and Finishers": "Thợ lát và hoàn thiện sàn terrazzo",

    # Farm/trang trại — false positive, giữ nguyên
    # "trang" trong "trang trại" là VN hợp lệ — không cần fix
}

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    print(f"Áp dụng {len(FIXES)} bản fix vòng 2...")
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
            print(f"  ✅ {title_en[:60]}")
            print(f"     -> {title_vi_new}")
        else:
            cur.execute("SELECT title_vi FROM core.careers WHERE title_en = %s", (title_en,))
            row = cur.fetchone()
            if row:
                pass  # đã đúng
            else:
                not_found.append(title_en)

    conn.commit()
    print(f"\n✅ Đã update: {updated} bản ghi")
    if not_found:
        print(f"⚠️  Không tìm thấy: {not_found}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
