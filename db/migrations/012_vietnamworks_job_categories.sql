-- =====================================================
-- Migration 012: VietnamWorks Job Categories Integration
-- Tích hợp danh sách ngành nghề từ VietnamWorks.com
-- Date: 2026-05-11
-- =====================================================

-- =====================================================
-- SECTION 1: CREATE TABLES
-- =====================================================

-- Bảng ngành nghề từ VietnamWorks
CREATE TABLE IF NOT EXISTS core.vietnamworks_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    vietnamese_name TEXT NOT NULL,
    category_group TEXT NOT NULL, -- Nhóm chính (Bán Hàng & Kinh Doanh, Kế Toán & Tài chính, etc.)
    description TEXT,
    vietnamworks_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng mapping giữa Career và VietnamWorks Category (many-to-many)
CREATE TABLE IF NOT EXISTS core.career_vietnamworks_mapping (
    id SERIAL PRIMARY KEY,
    career_id BIGINT NOT NULL REFERENCES core.careers(id) ON DELETE CASCADE,
    vietnamworks_category_id INTEGER NOT NULL REFERENCES core.vietnamworks_categories(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.00 to 1.00
    mapping_method TEXT DEFAULT 'manual', -- manual, auto, ml
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(career_id, vietnamworks_category_id)
);

-- =====================================================
-- SECTION 2: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_slug ON core.vietnamworks_categories(slug);
CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_group ON core.vietnamworks_categories(category_group);
CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_active ON core.vietnamworks_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_career_vietnamworks_career ON core.career_vietnamworks_mapping(career_id);
CREATE INDEX IF NOT EXISTS idx_career_vietnamworks_category ON core.career_vietnamworks_mapping(vietnamworks_category_id);
CREATE INDEX IF NOT EXISTS idx_career_vietnamworks_confidence ON core.career_vietnamworks_mapping(confidence_score);

-- =====================================================
-- SECTION 3: SEED VIETNAMWORKS CATEGORIES
-- =====================================================

INSERT INTO core.vietnamworks_categories (name, slug, vietnamese_name, category_group, description, sort_order) VALUES
-- Bán Hàng & Kinh Doanh
('Sales Business Development', 'ban-hang-phat-trien-kinh-doanh', 'Bán Hàng/Phát Triển Kinh Doanh', 'Bán Hàng & Kinh Doanh', 'Các vị trí bán hàng và phát triển kinh doanh', 1),
('Technical Sales', 'ban-hang-ky-thuat', 'Bán Hàng Kỹ Thuật', 'Bán Hàng & Kinh Doanh', 'Bán hàng các sản phẩm kỹ thuật, công nghệ', 2),
('Telesales', 'ban-hang-qua-dien-thoai', 'Bán Hàng Qua Điện Thoại', 'Bán Hàng & Kinh Doanh', 'Bán hàng qua điện thoại và telesales', 3),
('Retail Assistant', 'tro-ly-ban-le', 'Trợ Lý Bán Lẻ', 'Bán Hàng & Kinh Doanh', 'Hỗ trợ bán hàng tại các cửa hàng bán lẻ', 4),

-- Kế Toán & Tài Chính
('General Accounting', 'ke-toan-tong-hop', 'Kế Toán Tổng Hợp', 'Kế Toán & Tài Chính', 'Kế toán tổng hợp và báo cáo tài chính', 10),
('Finance Accounting', 'ke-toan-tai-chinh', 'Kế Toán Tài Chính', 'Kế Toán & Tài Chính', 'Kế toán tài chính và quản lý tài chính', 11),
('Management Accounting', 'ke-toan-quan-tri', 'Kế Toán Quản Trị', 'Kế Toán & Tài Chính', 'Kế toán quản trị và phân tích chi phí', 12),
('Tax Accounting', 'ke-toan-thue', 'Kế Toán Thuế', 'Kế Toán & Tài Chính', 'Kế toán thuế và tư vấn thuế', 13),
('Accounts Receivable', 'ke-toan-cong-no', 'Kế Toán Công Nợ', 'Kế Toán & Tài Chính', 'Quản lý công nợ và thu hồi nợ', 14),
('Cost Accounting', 'ke-toan-chi-phi', 'Kế Toán Chi Phí', 'Kế Toán & Tài Chính', 'Kế toán chi phí và kiểm soát chi phí', 15),
('Payment Accounting', 'ke-toan-thanh-toan', 'Kế Toán Thanh Toán', 'Kế Toán & Tài Chính', 'Kế toán thanh toán và quản lý dòng tiền', 16),
('Revenue Accounting', 'ke-toan-doanh-thu', 'Kế Toán Doanh Thu', 'Kế Toán & Tài Chính', 'Kế toán doanh thu và ghi nhận doanh thu', 17),
('Financial Analysis', 'phan-tich-bao-cao-tai-chinh', 'Phân Tích & Báo Cáo Tài Chính', 'Kế Toán & Tài Chính', 'Phân tích và báo cáo tài chính', 18),
('Financial Control', 'kiem-soat-vien-tai-chinh', 'Kiểm Soát Viên Tài Chính', 'Kế Toán & Tài Chính', 'Kiểm soát tài chính và kiểm toán nội bộ', 19),
('Investment Finance', 'dau-tu-tai-chinh', 'Đầu Tư Tài Chính', 'Kế Toán & Tài Chính', 'Đầu tư và phân tích đầu tư tài chính', 20),
('Credit', 'tin-dung', 'Tín Dụng', 'Kế Toán & Tài Chính', 'Quản lý tín dụng và rủi ro tín dụng', 21),
('Valuation', 'dinh-gia', 'Định Giá', 'Kế Toán & Tài Chính', 'Định giá tài sản và doanh nghiệp', 22),
('Fund Management', 'quan-ly-quy', 'Quản Lý Quỹ', 'Kế Toán & Tài Chính', 'Quản lý quỹ đầu tư và quỹ hưu trí', 23),
('Compensation Benefits', 'luong-thuong-phuc-loi', 'Lương Thưởng & Phúc Lợi', 'Kế Toán & Tài Chính', 'Quản lý lương thưởng và phúc lợi', 24),
('Business Analysis', 'phan-tich-kinh-doanh-phan-tich-he-thong', 'Phân Tích Kinh Doanh/Phân Tích Hệ Thống', 'Kế Toán & Tài Chính', 'Phân tích kinh doanh và hệ thống', 25),
('Audit', 'kiem-toan', 'Kiểm Toán', 'Kế Toán & Tài Chính', 'Kiểm toán và kiểm toán nội bộ', 26),

-- Nhân Sự & Đào Tạo
('Human Resources', 'nhan-su-tong-hop', 'Nhân Sự Tổng Hợp', 'Nhân Sự & Đào Tạo', 'Quản lý nhân sự tổng hợp', 30),
('Recruitment', 'tuyen-dung', 'Tuyển Dụng', 'Nhân Sự & Đào Tạo', 'Tuyển dụng và thu hút nhân tài', 31),
('Training Development', 'dao-tao-va-phat-trien', 'Đào Tạo Và Phát Triển', 'Nhân Sự & Đào Tạo', 'Đào tạo và phát triển nhân viên', 32),
('Teaching', 'giang-day-dao-tao', 'Giảng Dạy/Đào Tạo', 'Nhân Sự & Đào Tạo', 'Giảng dạy và đào tạo chuyên môn', 33),
('Education Management', 'quan-ly-giao-duc', 'Quản Lý Giáo Dục', 'Nhân Sự & Đào Tạo', 'Quản lý giáo dục và đào tạo', 34),
('Education Consulting', 'tu-van-giao-duc', 'Tư Vấn Giáo Dục', 'Nhân Sự & Đào Tạo', 'Tư vấn giáo dục và hướng nghiệp', 35),
('Student Services', 'dich-vu-sinh-vien-ho-tro-hoc-vien', 'Dịch Vụ Sinh Viên/Hỗ Trợ Học Viên', 'Nhân Sự & Đào Tạo', 'Hỗ trợ sinh viên và dịch vụ học tập', 36),
('Employee Engagement', 'gan-ket-nhan-vien', 'Gắn Kết Nhân Viên', 'Nhân Sự & Đào Tạo', 'Gắn kết và phát triển văn hóa doanh nghiệp', 37),
('Performance Management', 'quan-tri-hieu-suat-su-nghiep', 'Quản Trị Hiệu Suất & Sự Nghiệp', 'Nhân Sự & Đào Tạo', 'Quản trị hiệu suất và phát triển sự nghiệp', 38),

-- Công Nghệ Thông Tin
('Software Development', 'phan-mem-may-tinh', 'Phần Mềm Máy Tính', 'Công Nghệ Thông Tin', 'Phát triển phần mềm và ứng dụng', 40),
('Data Science', 'data-engineer-data-analyst-ai', 'Data Engineer/Data Analyst/AI', 'Công Nghệ Thông Tin', 'Khoa học dữ liệu và trí tuệ nhân tạo', 41),
('DevOps', 'system-cloud-devops-engineer', 'System/Cloud/DevOps Engineer', 'Công Nghệ Thông Tin', 'Hệ thống, Cloud và DevOps', 42),
('IT Support', 'it-support-help-desk', 'IT Support/Help Desk', 'Công Nghệ Thông Tin', 'Hỗ trợ kỹ thuật và help desk', 43),
('IT Management', 'quan-ly-cong-nghe-thong-tin', 'Quản Lý Công Nghệ Thông Tin', 'Công Nghệ Thông Tin', 'Quản lý công nghệ thông tin', 44),
('IT Project Management', 'quan-ly-du-an-cong-nghe', 'Quản Lý Dự Án Công Nghệ', 'Công Nghệ Thông Tin', 'Quản lý dự án công nghệ', 45),
('Hardware', 'phan-cung-may-tinh', 'Phần Cứng Máy Tính', 'Công Nghệ Thông Tin', 'Phần cứng máy tính và thiết bị', 46),
('Cybersecurity', 'bao-mat-cong-nghe-thong-tin', 'Bảo Mật Công Nghệ Thông Tin', 'Công Nghệ Thông Tin', 'An ninh mạng và bảo mật thông tin', 47),
('Software Testing', 'qa-qc-software-testing', 'QA/QC/Software Testing', 'Công Nghệ Thông Tin', 'Kiểm thử phần mềm và đảm bảo chất lượng', 48),
('UX UI Design', 'ux-ui-design', 'UX/UI Design', 'Công Nghệ Thông Tin', 'Thiết kế trải nghiệm người dùng và giao diện', 49),

-- Kỹ Thuật & Sản Xuất
('Electrical Engineering', 'ky-thuat-dien-dien-tu', 'Kỹ Thuật Điện/Điện Tử', 'Kỹ Thuật & Sản Xuất', 'Kỹ thuật điện và điện tử', 50),
('Production Planning', 'hoach-dinh-quan-ly-san-xuat', 'Hoạch Định & Quản Lý Sản Xuất', 'Kỹ Thuật & Sản Xuất', 'Hoạch định và quản lý sản xuất', 51),
('Mechanical Engineering', 'co-khi-dien-lanh', 'Cơ Khí & Điện Lạnh', 'Kỹ Thuật & Sản Xuất', 'Cơ khí và điện lạnh công nghiệp', 52),
('Automation', 'co-khi-tu-dong-hoa', 'Cơ Khí Tự Động Hoá', 'Kỹ Thuật & Sản Xuất', 'Tự động hóa và robot công nghiệp', 53),
('Maintenance', 'bao-tri-bao-duong', 'Bảo trì/Bảo Dưỡng', 'Kỹ Thuật & Sản Xuất', 'Bảo trì và bảo dưỡng thiết bị', 54),
('Automotive Engineering', 'ky-thuat-o-to', 'Kỹ Thuật Ô Tô', 'Kỹ Thuật & Sản Xuất', 'Kỹ thuật ô tô và xe cơ giới', 55),
('Chemical Engineering', 'ky-thuat-hoa-hoc', 'Kỹ Thuật Hóa Học', 'Kỹ Thuật & Sản Xuất', 'Kỹ thuật hóa học và quy trình', 56),
('Environmental Engineering', 'ky-thuat-moi-truong', 'Kỹ Thuật Môi Trường', 'Kỹ Thuật & Sản Xuất', 'Kỹ thuật môi trường và xử lý môi trường', 57),
('CNC Engineering', 'ky-thuat-cnc', 'Kỹ Thuật CNC', 'Kỹ Thuật & Sản Xuất', 'Kỹ thuật CNC và gia công chính xác', 58),
('Medical Equipment', 'ky-thuat-vien-y-te', 'Kỹ Thuật Viên Y Tế', 'Kỹ Thuật & Sản Xuất', 'Kỹ thuật thiết bị y tế', 59),
('Production Analysis', 'phan-tich-san-xuat', 'Phân Tích Sản Xuất', 'Kỹ Thuật & Sản Xuất', 'Phân tích và tối ưu hóa sản xuất', 60),

-- Xây Dựng & Kiến Trúc
('Construction', 'xay-dung', 'Xây Dựng', 'Xây Dựng & Kiến Trúc', 'Xây dựng công trình dân dụng và công nghiệp', 70),
('Architecture', 'thiet-ke-kien-truc-hoa-vien-kien-truc', 'Thiết Kế Kiến Trúc/Họa Viên Kiến Trúc', 'Xây Dựng & Kiến Trúc', 'Thiết kế kiến trúc và quy hoạch', 71),
('Interior Design', 'thiet-ke-noi-that', 'Thiết Kế Nội Thất', 'Xây Dựng & Kiến Trúc', 'Thiết kế nội thất và trang trí', 72),
('Project Management', 'phat-trien-du-an-dau-thau', 'Phát Triển Dự Án/Đấu Thầu', 'Xây Dựng & Kiến Trúc', 'Quản lý dự án và đấu thầu', 73),
('Industrial Design', 'thiet-ke-cong-nghiep-ky-thuat', 'Thiết Kế Công Nghiệp/Kỹ Thuật', 'Xây Dựng & Kiến Trúc', 'Thiết kế công nghiệp và kỹ thuật', 74),
('Urban Planning', 'thiet-ke-quy-hoach-do-thi', 'Thiết Kế & Quy Hoạch Đô Thị', 'Xây Dựng & Kiến Trúc', 'Quy hoạch đô thị và phát triển đô thị', 75),
('Construction Law', 'luat-xay-dung', 'Luật Xây Dựng', 'Xây Dựng & Kiến Trúc', 'Luật xây dựng và giấy phép', 76),

-- Marketing & Truyền Thông
('Marketing', 'tiep-thi', 'Tiếp Thị', 'Marketing & Truyền Thông', 'Marketing và tiếp thị kỹ thuật số', 80),
('Digital Marketing', 'tiep-thi-truc-tuyen', 'Tiếp Thị Trực Tuyến', 'Marketing & Truyền Thông', 'Marketing trực tuyến và digital marketing', 81),
('Content Marketing', 'tiep-thi-noi-dung', 'Tiếp Thị Nội Dung', 'Marketing & Truyền Thông', 'Marketing nội dung và sáng tạo', 82),
('Trade Marketing', 'tiep-thi-thuong-mai', 'Tiếp Thị Thương Mại', 'Marketing & Truyền Thông', 'Marketing thương mại và POSM', 83),
('Brand Management', 'quan-ly-thuong-hieu', 'Quản Lý Thương Hiệu', 'Marketing & Truyền Thông', 'Quản lý thương hiệu và communications', 84),
('Public Relations', 'quan-he-cong-chung', 'Quan Hệ Công Chúng', 'Marketing & Truyền Thông', 'Quan hệ công chúng và truyền thông', 85),
('Graphic Design', 'thiet-ke-do-hoa', 'Thiết Kế Đồ Họa', 'Marketing & Truyền Thông', 'Thiết kế đồ họa và sáng tạo', 86),
('Video Editing', 'chinh-sua-video', 'Chỉnh Sửa Video', 'Marketing & Truyền Thông', 'Biên tập video và sản xuất media', 87),
('Art Direction', 'dao-dien-nghe-thuat-nhiep-anh', 'Đạo Diễn Nghệ Thuật/Nhiếp Ảnh', 'Marketing & Truyền Thông', 'Đạo diễn nghệ thuật và nhiếp ảnh', 88),

-- Logistics & Chuỗi Cung Ứng
('Supply Chain', 'quan-ly-chuoi-cung-ung', 'Quản Lý Chuỗi Cung Ứng', 'Logistics & Chuỗi Cung Ứng', 'Quản lý chuỗi cung ứng hoàn chỉnh', 90),
('Import Export', 'xuat-nhap-khau-thu-tuc-hai-quan', 'Xuất Nhập Khẩu & Thủ Tục Hải Quan', 'Logistics & Chuỗi Cung Ứng', 'Xuất nhập khẩu và thủ tục hải quan', 91),
('Transportation', 'van-tai-giao-nhan-hang-hoa', 'Vận Tải/Giao Nhận Hàng Hóa', 'Logistics & Chuỗi Cung Ứng', 'Vận tải và giao nhận hàng hóa', 92),
('Warehouse Management', 'quan-ly-kho-phan-phoi', 'Quản Lý Kho & Phân Phối', 'Logistics & Chuỗi Cung Ứng', 'Quản lý kho và phân phối', 93),
('Procurement', 'thu-mua-quan-tri-hang-ton-kho', 'Thu Mua & Quản Trị Hàng Tồn Kho', 'Logistics & Chuỗi Cung Ứng', 'Thu mua và quản lý hàng tồn kho', 94),
('Order Management', 'quan-ly-don-hang', 'Quản Lý Đơn Hàng', 'Logistics & Chuỗi Cung Ứng', 'Quản lý đơn hàng và xử lý đơn', 95),
('Road Transport', 'van-tai-duong-bo', 'Vận Tải Đường Bộ', 'Logistics & Chuỗi Cung Ứng', 'Vận tải đường bộ và logistics', 96),
('Rail Sea Transport', 'van-tai-duong-sat-hang-hai', 'Vận Tải Đường Sắt & Hàng Hải', 'Logistics & Chuỗi Cung Ứng', 'Vận tải đường sắt và hàng hải', 97),
('Public Transport', 'dich-vu-van-tai-cong-cong', 'Dịch Vụ Vận Tải Công Cộng', 'Logistics & Chuỗi Cung Ứng', 'Dịch vụ vận tải công cộng', 98),
('Fleet Management', 'quan-ly-doi-xe', 'Quản Lý Đội Xe', 'Logistics & Chuỗi Cung Ứng', 'Quản lý đội xe và vận tải', 99),

-- Dịch Vụ Khách Hàng
('Customer Service', 'dich-vu-khach-hang', 'Dịch Vụ Khách Hàng', 'Dịch Vụ Khách Hàng', 'Dịch vụ khách hàng tổng hợp', 100),
('Customer Support', 'dich-vu-ho-tro-khach-hang', 'Dịch Vụ Hỗ Trợ Khách Hàng', 'Dịch Vụ Khách Hàng', 'Hỗ trợ khách hàng kỹ thuật', 101),
('Call Center', 'dich-vu-khach-hang-call-center', 'Dịch Vụ Khách Hàng - Call Center', 'Dịch Vụ Khách Hàng', 'Call center và teleservice', 102),
('Customer Service Guide', 'dich-vu-khach-hang-huong-khach-hang', 'Dịch Vụ Khách Hàng - Hướng Khách Hàng', 'Dịch Vụ Khách Hàng', 'Hướng dẫn và hỗ trợ khách hàng', 103),
('Reception', 'le-tan-tiep-tan', 'Lễ Tân/Tiếp Tân', 'Dịch Vụ Khách Hàng', 'Lễ tân và tiếp tân', 104),

-- Pháp Lý & Tuân Thủ
('Legal Consulting', 'tu-van-phap-ly', 'Tư Vấn Pháp Lý', 'Pháp Lý & Tuân Thủ', 'Tư vấn pháp lý doanh nghiệp', 110),
('Compliance Risk', 'tuan-thu-kiem-soat-rui-ro', 'Tuân Thủ & Kiểm Soát Rủi Ro', 'Pháp Lý & Tuân Thủ', 'Tuân thủ và kiểm soát rủi ro', 111),
('Legal Secretary', 'thu-ky-luat-tro-ly-luat', 'Thư Ký Luật & Trợ Lý Luật', 'Pháp Lý & Tuân Thủ', 'Thư ký pháp lý và trợ lý pháp lý', 112),
('Legal Assistant', 'thu-ky-phap-ly', 'Thư Ký Pháp Lý', 'Pháp Lý & Tuân Thủ', 'Thư ký pháp lý và hỗ trợ pháp lý', 113),
('Banking Finance Law', 'luat-tai-chinh-ngan-hang-thuong-mai', 'Luật Tài Chính Ngân Hàng Thương mại', 'Pháp Lý & Tuân Thủ', 'Luật tài chính ngân hàng', 114),
('Labor Law', 'luat-lao-dong-huu-tri', 'Luật Lao động/Hưu Trí', 'Pháp Lý & Tuân Thủ', 'Luật lao động và bảo hiểm xã hội', 115),
('Intellectual Property', 'luat-so-huu-tri-tue', 'Luật Sở Hữu Trí Tuệ', 'Pháp Lý & Tuân Thủ', 'Luật sở hữu trí tuệ', 116),
('Tax Law', 'luat-thue', 'Luật Thuế', 'Pháp Lý & Tuân Thủ', 'Luật thuế và chính sách thuế', 117),
('Legal Enforcement', 'quan-ly-thi-hanh-phap-luat', 'Quản Lý Thi Hành Pháp Luật', 'Pháp Lý & Tuân Thủ', 'Quản lý thi hành pháp luật', 118),
('Policy Regulation', 'chinh-sach-quy-hoach-quy-dinh', 'Chính sách, Quy hoạch & Quy định', 'Pháp Lý & Tuân Thủ', 'Chính sách và quy định', 119),

-- Quản Lý Cấp Cao
('CEO', 'ceo', 'CEO', 'Quản Lý Cấp Cao', 'Giám đốc điều hành và CEO', 120),
('Senior Management', 'quan-ly-cap-cao', 'Quản Lý Cấp Cao', 'Quản Lý Cấp Cao', 'Quản lý cấp cao và lãnh đạo', 121),
('Regional Management', 'quan-ly-khu-vuc', 'Quản Lý Khu Vực', 'Quản Lý Cấp Cao', 'Quản lý khu vực và vùng', 122),
('Office Management', 'quan-ly-van-phong', 'Quản Lý Văn Phòng', 'Quản Lý Cấp Cao', 'Quản lý văn phòng và hành chính', 123),
('Facility Management', 'quan-ly-co-so-vat-chat', 'Quản Lý Cơ Sở Vật Chất', 'Quản Lý Cấp Cao', 'Quản lý cơ sở vật chất', 124),
('Event Management', 'quan-ly-su-kien', 'Quản Lý Sự Kiện', 'Quản Lý Cấp Cao', 'Quản lý sự kiện và tổ chức', 125),
('Database Administration', 'quan-tri-co-so-du-lieu', 'Quản Trị Cơ Sở Dữ Liệu', 'Quản Lý Cấp Cao', 'Quản trị cơ sở dữ liệu', 126),

-- Y Tế & Dược Phẩm
('Medical Doctor', 'bac-si-dieu-tri-da-khoa-dieu-tri-noi-tru', 'Bác Sĩ/Điều Trị Đa Khoa/Điều Trị Nội Trú', 'Y Tế & Dược Phẩm', 'Bác sĩ đa khoa và điều trị nội trú', 130),
('Nursing', 'y-ta', 'Y Tá', 'Y Tế & Dược Phẩm', 'Y tá và điều dưỡng', 131),
('Pharmacy', 'duoc-si', 'Dược Sĩ', 'Y Tế & Dược Phẩm', 'Dược sĩ và quản lý dược', 132),
('Pharmaceutical Distribution', 'phan-phoi-duoc-pham', 'Phân Phối Dược Phẩm', 'Y Tế & Dược Phẩm', 'Phân phối và kinh doanh dược phẩm', 133),
('Food Technology', 'cong-nghe-thuc-pham', 'Công Nghệ Thực Phẩm', 'Y Tế & Dược Phẩm', 'Công nghệ thực phẩm và an toàn thực phẩm', 134),

-- Bất Động Sản
('Real Estate Development', 'phat-trien-bat-dong-san', 'Phát Triển Bất Động Sản', 'Bất Động Sản', 'Phát triển dự án bất động sản', 140),
('Property Management', 'cho-thue-quan-ly-can-ho', 'Cho Thuê & Quản Lý Căn Hộ', 'Bất Động Sản', 'Quản lý và cho thuê căn hộ', 141),
('Real Estate Analysis', 'phan-tich-du-an-bat-dong-san', 'Phân Tích Dự Án Bất Động Sản', 'Bất Động Sản', 'Phân tích và thẩm định dự án BĐS', 142),
('Retail Management', 'quan-ly-cua-hang', 'Quản Lý Cửa Hàng', 'Bất Động Sản', 'Quản lý cửa hàng bán lẻ', 143),

-- Khách Sạn & Du Lịch
('Front Office', 'bo-phan-tien-sanh-dich-vu-khach-hang', 'Bộ Phận Tiền Sảnh & Dịch Vụ Khách Hàng', 'Khách Sạn & Du Lịch', 'Tiền sảnh và dịch vụ khách hàng', 150),
('Hotel Reservation', 'dat-phong-khach-san', 'Đặt Phòng Khách Sạn', 'Khách Sạn & Du Lịch', 'Đặt phòng và quản lý đặt phòng khách sạn', 151),
('F&B Service', 'quay-bar-do-uong-phuc-vu', 'Quầy Bar/Đồ Uống/Phục vụ', 'Khách Sạn & Du Lịch', 'Phục vụ bar và đồ uống', 152),
('Culinary', 'dau-bep', 'Đầu Bếp', 'Khách Sạn & Du Lịch', 'Đầu bếp và bếp trưởng', 153),
('F&B Management', 'quan-ly-f-b', 'Quản Lý F&B', 'Khách Sạn & Du Lịch', 'Quản lý Food & Beverage', 154),
('Travel Agency', 'cong-ty-kinh-doanh-lu-hanh', 'Công Ty Kinh Doanh Lữ Hành', 'Khách Sạn & Du Lịch', 'Kinh doanh lữ hành và du lịch', 155),
('Travel Agency', 'dai-ly-du-lich', 'Đại Lý Du Lịch', 'Khách Sạn & Du Lịch', 'Đại lý du lịch và tư vấn du lịch', 156),

-- Bảo Hiểm & Tài Chính Ngân Hàng
('Insurance Pricing', 'dinh-phi-bao-hiem', 'Định Phí Bảo Hiểm', 'Bảo Hiểm & Tài Chính Ngân Hàng', 'Định phí bảo hiểm và актуар', 160),
('Insurance Claims', 'boi-thuong-bao-hiem', 'Bồi Thường Bảo Hiểm', 'Bảo Hiểm & Tài Chính Ngân Hàng', 'Bồi thường bảo hiểm và xử lý yêu cầu', 161),
('Securities Trading', 'moi-gioi-giao-dich-chung-khoan', 'Môi Giới & Giao Dịch Chứng Khoán', 'Bảo Hiểm & Tài Chính Ngân Hàng', 'Môi giới và giao dịch chứng khoán', 162),

-- Nông Nghiệp & Tài Nguyên
('Agriculture', 'nong-lam-ngu-nghiep', 'Nông/Lâm/Ngư nghiệp', 'Nông Nghiệp & Tài Nguyên', 'Nông nghiệp, lâm nghiệp và thủy sản', 170),
('Mining', 'khai-thac-mo', 'Khai Thác Mỏ', 'Nông Nghiệp & Tài Nguyên', 'Khai thác mỏ và tài nguyên khoáng sản', 171),
('Utilities', 'dien-nuoc-chat-thai', 'Điện/Nước/Chất Thải', 'Nông Nghiệp & Tài Nguyên', 'Điện, nước và xử lý chất thải', 172),

-- Sản Xuất & Công Nghiệp
('Garment Production', 'phat-trien-san-pham-may-mac', 'Phát Triển Sản Phẩm May Mặc', 'Sản Xuất & Công Nghiệp', 'Sản xuất và phát triển ngành may mặc', 180),
('Biotechnology', 'cong-nghe-sinh-hoc', 'Công Nghệ Sinh Học', 'Sản Xuất & Công Nghiệp', 'Công nghệ sinh học và ứng dụng', 181),
('Printing Publishing', 'in-an-xuat-ban', 'In Ấn & Xuất Bản', 'Sản Xuất & Công Nghiệp', 'In ấn và xuất bản', 182),
('Printing', 'in-an', 'In Ấn', 'Sản Xuất & Công Nghiệp', 'In ấn công nghiệp', 183),
('Guarantee', 'bao-tieu-bao-lanh', 'Bao Tiêu/Bảo Lãnh', 'Sản Xuất & Công Nghiệp', 'Bảo tiêu và bảo lãnh', 184),
('Program Production', 'san-xuat-chuong-trinh', 'Sản Xuất Chương Trình', 'Sản Xuất & Công Nghiệp', 'Sản xuất chương trình truyền thông', 185),

-- Nghiên Cứu & Phân Tích
('Research Development', 'nghien-cuu-phat-trien', 'Nghiên Cứu & Phát Triển', 'Nghiên Cứu & Phân Tích', 'Nghiên cứu và phát triển R&D', 190),
('Market Research', 'nghien-cuu-phan-tich-thi-truong', 'Nghiên Cứu & Phân Tích Thị Trường', 'Nghiên Cứu & Phân Tích', 'Nghiên cứu thị trường và phân tích', 191),
('Academic Research', 'nghien-cuu-hoc-thuat', 'Nghiên Cứu Học Thuật', 'Nghiên Cứu & Phân Tích', 'Nghiên cứu học thuật và khoa học', 192),
('Product Development', 'quan-ly-phat-trien-san-pham', 'Quản Lý & Phát Triển Sản Phẩm', 'Nghiên Cứu & Phân Tích', 'Quản lý và phát triển sản phẩm', 193),

-- Hành Chính & Văn Phòng
('Administration', 'hanh-chinh', 'Hành Chính', 'Hành Chính & Văn Phòng', 'Hành chính và quản lý chung', 200),
('Secretary', 'thu-ky', 'Thư Ký', 'Hành Chính & Văn Phòng', 'Thư ký và trợ lý văn phòng', 201),
('Business Assistant', 'tro-ly-kinh-doanh', 'Trợ Lý Kinh Doanh', 'Hành Chính & Văn Phòng', 'Trợ lý kinh doanh và hành chính', 202),
('Office Management', 'quan-ly-van-phong', 'Quản Lý Văn Phòng', 'Hành Chính & Văn Phòng', 'Quản lý văn phòng và trang thiết bị', 203),

-- An Ninh & Bảo Vệ
('Workplace Safety', 'an-toan-lao-dong', 'An Toàn Lao Động', 'An Ninh & Bảo Vệ', 'An toàn lao động và vệ sinh lao động', 210),
('Security', 'bao-ve', 'Bảo Vệ', 'An Ninh & Bảo Vệ', 'Bảo vệ và an ninh', 211),

-- Các Ngành Nghề Khác
('Other', 'khac', 'Khác', 'Các Ngành Nghề Khác', 'Các ngành nghề khác chưa phân loại', 220),
('NGO', 'ngo-phi-loi-nhuan', 'NGO/Phi Lợi Nhuận', 'Các Ngành Nghề Khác', 'Tổ chức phi lợi nhuận và NGO', 221),
('Aviation', 'dich-vu-hang-khong', 'Dịch Vụ Hàng Không', 'Các Ngành Nghề Khác', 'Dịch vụ hàng không và hàng không', 222),
('Asset Management', 'kinh-doanh-thuong-mai-cho-thue-quan-ly-tai-san', 'Kinh Doanh Thương Mại, Cho Thuê & Quản Lý Tài Sản', 'Các Ngành Nghề Khác', 'Quản lý tài sản và kinh doanh thương mại', 223),
('Fashion Design', 'thiet-ke-thoi-trang-trang-suc', 'Thiết Kế Thời Trang/Trang Sức', 'Các Ngành Nghề Khác', 'Thiết kế thời trang và trang sức', 224),
('Digital Transformation', 'chuyen-doi-so', 'Chuyển Đổi Số', 'Các Ngành Nghề Khác', 'Chuyển đổi số và chuyển đổi công nghệ', 225),
('Risk Consulting', 'tu-van-rui-ro', 'Tư Vấn Rủi Ro', 'Các Ngành Nghề Khác', 'Tư vấn quản lý rủi ro', 226),
('Psychology Counseling', 'tu-van-tam-ly-cong-tac-xa-hoi', 'Tư Vấn Tâm Lý & Công Tác Xã Hội', 'Các Ngành Nghề Khác', 'Tư vấn tâm lý và công tác xã hội', 227),
('Business Consulting', 'ke-hoach-tu-van-doanh-nghiep', 'Kế hoạch/Tư Vấn Doanh Nghiệp', 'Các Ngành Nghề Khác', 'Tư vấn kế hoạch và chiến lược doanh nghiệp', 228),
('Telecommunications', 'vien-thong', 'Viễn Thông', 'Các Ngành Nghề Khác', 'Viễn thông và truyền thông', 229),
('Debt Collection', 'thu-hoi-no', 'Thu Hồi Nợ', 'Các Ngành Nghề Khác', 'Thu hồi nợ và quản lý nợ', 230),
('Coordination', 'dieu-phoi', 'Điều Phối', 'Các Ngành Nghề Khác', 'Điều phối hoạt động và logistics', 231),

-- Các Ngành Nghề Đặc Thù
('Enterprise Customer Service', 'dich-vu-khach-hang-doanh-nghiep', 'Dịch Vụ Khách Hàng Doanh Nghiệp', 'Các Ngành Nghề Đặc Thù', 'Dịch vụ khách hàng doanh nghiệp B2B', 240),
('Account Management', 'quan-ly-tai-khoan-khach-hang', 'Quản Lý Tài Khoản Khách Hàng', 'Các Ngành Nghề Đặc Thù', 'Quản lý tài khoản khách hàng', 241),
('Translation', 'bien-phien-dich', 'Biên Phiên Dịch', 'Các Ngành Nghề Đặc Thù', 'Biên dịch và phiên dịch', 242),
('Information Security', 'an-toan-thong-tin', 'An Toàn Thông Tin', 'Các Ngành Nghề Đặc Thù', 'An toàn thông tin và cyber security', 243),
('Quality Assurance', 'dam-bao-chat-luong-kiem-soat-chat-luong-quan-ly-chat-luong', 'Đảm Bảo Chất Lượng/Kiểm Soát Chất Lượng/Quản Lý Chất Lượng', 'Các Ngành Nghề Đặc Thù', 'Đảm bảo chất lượng và QA/QC', 244)

ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 4: CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_vietnamworks_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_vietnamworks_categories_updated_at
    BEFORE UPDATE ON core.vietnamworks_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_vietnamworks_categories_updated_at();

CREATE OR REPLACE FUNCTION update_career_vietnamworks_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_career_vietnamworks_mapping_updated_at
    BEFORE UPDATE ON core.career_vietnamworks_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_career_vietnamworks_mapping_updated_at();

-- =====================================================
-- SECTION 5: ADD COMMENTS
-- =====================================================

COMMENT ON TABLE core.vietnamworks_categories IS 'Danh mục ngành nghề từ VietnamWorks.com';
COMMENT ON TABLE core.career_vietnamworks_mapping IS 'Mapping giữa Career và VietnamWorks Category (many-to-many)';

COMMENT ON COLUMN core.vietnamworks_categories.slug IS 'Slug duy nhất cho URL';
COMMENT ON COLUMN core.vietnamworks_categories.category_group IS 'Nhóm ngành chính (Bán Hàng & Kinh Doanh, Kế Toán & Tài chính, etc.)';
COMMENT ON COLUMN core.vietnamworks_categories.vietnamworks_url IS 'URL gốc từ VietnamWorks';
COMMENT ON COLUMN core.vietnamworks_categories.sort_order IS 'Thứ tự sắp xếp trong nhóm';

COMMENT ON COLUMN core.career_vietnamworks_mapping.confidence_score IS 'Độ tin cậy của mapping (0.00 to 1.00)';
COMMENT ON COLUMN core.career_vietnamworks_mapping.mapping_method IS 'Phương pháp mapping: manual, auto, ml';

-- =====================================================
-- SECTION 6: VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
    category_count INTEGER;
    group_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM core.vietnamworks_categories;
    SELECT COUNT(DISTINCT category_group) INTO group_count FROM core.vietnamworks_categories;
    
    RAISE NOTICE 'Migration 012 Results:';
    RAISE NOTICE '  VietnamWorks Categories: %', category_count;
    RAISE NOTICE '  Category Groups: %', group_count;
    
    -- Verify expected counts
    IF category_count < 150 THEN
        RAISE WARNING 'Expected at least 150 categories, got %', category_count;
    END IF;
    
    IF group_count != 22 THEN
        RAISE WARNING 'Expected 22 category groups, got %', group_count;
    END IF;
    
    RAISE NOTICE 'Migration 012 completed successfully!';
END $$;

-- =====================================================
-- SECTION 7: SAMPLE MAPPINGS (Optional - can be customized)
-- =====================================================

-- Sample mappings for common careers (can be expanded)
-- These are examples - actual mapping should be done based on career analysis

INSERT INTO core.career_vietnamworks_mapping (career_id, vietnamworks_category_id, confidence_score, mapping_method)
SELECT 
    c.id,
    vwc.id,
    CASE 
        WHEN c.title_en ILIKE '%software%' OR c.title_en ILIKE '%developer%' OR c.title_en ILIKE '%programmer%' THEN 0.9
        WHEN c.title_vi ILIKE '%phần mềm%' OR c.title_vi ILIKE '%lập trình%' OR c.title_vi ILIKE '%developer%' THEN 0.9
        WHEN c.industry_category = 'Computer and Mathematical' THEN 0.8
        ELSE 0.5
    END as confidence_score,
    'auto' as mapping_method
FROM core.careers c
CROSS JOIN core.vietnamworks_categories vwc
WHERE vwc.slug = 'phan-mem-may-tinh'
  AND (
    c.title_en ILIKE '%software%' OR 
    c.title_en ILIKE '%developer%' OR 
    c.title_en ILIKE '%programmer%' OR
    c.title_vi ILIKE '%phần mềm%' OR
    c.title_vi ILIKE '%lập trình%' OR
    c.industry_category = 'Computer and Mathematical'
  )
LIMIT 100
ON CONFLICT (career_id, vietnamworks_category_id) DO NOTHING;

-- =====================================================
-- END OF MIGRATION 012
-- =====================================================
