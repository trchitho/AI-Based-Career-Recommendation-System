"""
Script dịch lại title_vi trong bảng core.careers
- Backup trước khi làm
- Dùng Google Translate free (deep-translator)
- Post-process để chuẩn hóa chức danh nghề nghiệp tiếng Việt
- Dịch từng dòng, có cache resume
"""

import psycopg2
import time
import re
import json
import os
from deep_translator import GoogleTranslator

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
CACHE_FILE = 'scripts/cache_title_vi.json'
DELAY = 0.4

# ============================================================
# Từ điển chuẩn hóa chức danh nghề nghiệp tiếng Việt
# Ưu tiên cao nhất — áp dụng TRƯỚC khi dịch máy
# ============================================================
MANUAL_DICT = {
    # C-level
    "Chief Executives": "Giám đốc điều hành (CEO)",
    "Chief Sustainability Officers": "Giám đốc phát triển bền vững",
    "Chief Financial Officers": "Giám đốc tài chính (CFO)",
    "Chief Information Officers": "Giám đốc công nghệ thông tin (CIO)",
    "Chief Technology Officers": "Giám đốc công nghệ (CTO)",
    "Chief Operating Officers": "Giám đốc vận hành (COO)",
    "Chief Marketing Officers": "Giám đốc marketing (CMO)",
    "Chief Human Resources Officers": "Giám đốc nhân sự (CHRO)",

    # Management
    "General and Operations Managers": "Quản lý vận hành tổng hợp",
    "Legislators": "Nhà lập pháp",
    "Advertising and Promotions Managers": "Quản lý quảng cáo và khuyến mãi",
    "Marketing Managers": "Quản lý marketing",
    "Sales Managers": "Quản lý kinh doanh",
    "Public Relations Managers": "Quản lý quan hệ công chúng",
    "Fundraising Managers": "Quản lý gây quỹ",
    "Administrative Services Managers": "Quản lý dịch vụ hành chính",
    "Facilities Managers": "Quản lý cơ sở vật chất",
    "Security Managers": "Quản lý an ninh",
    "Computer and Information Systems Managers": "Quản lý hệ thống công nghệ thông tin",
    "Financial Managers": "Quản lý tài chính",
    "Treasurers and Controllers": "Thủ quỹ và kiểm soát viên tài chính",
    "Investment Fund Managers": "Quản lý quỹ đầu tư",
    "Industrial Production Managers": "Quản lý sản xuất công nghiệp",
    "Quality Control Systems Managers": "Quản lý hệ thống kiểm soát chất lượng",
    "Geothermal Production Managers": "Quản lý sản xuất địa nhiệt",
    "Biofuels Production Managers": "Quản lý sản xuất nhiên liệu sinh học",
    "Biomass Power Plant Managers": "Quản lý nhà máy điện sinh khối",
    "Hydroelectric Production Managers": "Quản lý sản xuất thủy điện",
    "Purchasing Managers": "Quản lý mua hàng",
    "Transportation, Storage, and Distribution Managers": "Quản lý vận tải, kho bãi và phân phối",
    "Supply Chain Managers": "Quản lý chuỗi cung ứng",
    "Compensation and Benefits Managers": "Quản lý lương thưởng và phúc lợi",
    "Human Resources Managers": "Quản lý nhân sự",
    "Training and Development Managers": "Quản lý đào tạo và phát triển",
    "Farmers, Ranchers, and Other Agricultural Managers": "Nông dân, chủ trang trại và quản lý nông nghiệp",
    "Construction Managers": "Quản lý xây dựng",
    "Education Administrators, Preschool and Childcare Center/Program": "Quản lý giáo dục mầm non và nhà trẻ",
    "Education Administrators, Kindergarten through Secondary": "Quản lý giáo dục phổ thông",
    "Education Administrators, Postsecondary": "Quản lý giáo dục đại học",
    "Education Administrators, All Other": "Quản lý giáo dục (khác)",
    "Architectural and Engineering Managers": "Quản lý kiến trúc và kỹ thuật",
    "Food Service Managers": "Quản lý dịch vụ ăn uống",
    "Gambling Managers": "Quản lý cơ sở cờ bạc",
    "Lodging Managers": "Quản lý cơ sở lưu trú",
    "Medical and Health Services Managers": "Quản lý dịch vụ y tế",
    "Natural Sciences Managers": "Quản lý khoa học tự nhiên",
    "Postmasters and Mail Superintendents": "Trưởng bưu cục",
    "Property, Real Estate, and Community Association Managers": "Quản lý bất động sản và cộng đồng",
    "Social and Community Service Managers": "Quản lý dịch vụ xã hội và cộng đồng",
    "Emergency Management Directors": "Giám đốc quản lý khẩn cấp",
    "Funeral Home Managers": "Quản lý nhà tang lễ",
    "Wind Energy Development Managers": "Quản lý phát triển năng lượng gió",
    "Solar Energy Installation Managers": "Quản lý lắp đặt năng lượng mặt trời",
    "Managers, All Other": "Quản lý (khác)",

    # Business & Finance
    "Agents and Business Managers of Artists, Performers, and Athletes": "Đại lý và quản lý nghệ sĩ, diễn viên và vận động viên",
    "Buyers and Purchasing Agents, Farm Products": "Nhân viên thu mua nông sản",
    "Wholesale and Retail Buyers, Except Farm Products": "Nhân viên thu mua bán buôn và bán lẻ",
    "Purchasing Agents, Except Wholesale, Retail, and Farm Products": "Nhân viên thu mua (trừ bán buôn, bán lẻ, nông sản)",
    "Claims Adjusters, Examiners, and Investigators": "Chuyên viên giải quyết bồi thường bảo hiểm",
    "Compliance Officers": "Chuyên viên tuân thủ",
    "Cost Estimators": "Chuyên viên dự toán chi phí",
    "Human Resources Specialists": "Chuyên viên nhân sự",
    "Labor Relations Specialists": "Chuyên viên quan hệ lao động",
    "Logisticians": "Chuyên viên logistics",
    "Project Management Specialists": "Chuyên viên quản lý dự án",
    "Management Analysts": "Chuyên viên phân tích quản lý",
    "Meeting, Convention, and Event Planners": "Chuyên viên tổ chức sự kiện và hội nghị",
    "Fundraisers": "Chuyên viên gây quỹ",
    "Compensation, Benefits, and Job Analysis Specialists": "Chuyên viên lương thưởng, phúc lợi và phân tích công việc",
    "Training and Development Specialists": "Chuyên viên đào tạo và phát triển",
    "Market Research Analysts and Marketing Specialists": "Chuyên viên nghiên cứu thị trường và marketing",
    "Business Operations Specialists, All Other": "Chuyên viên vận hành kinh doanh (khác)",
    "Accountants and Auditors": "Kế toán và kiểm toán viên",
    "Appraisers and Assessors of Real Estate": "Thẩm định viên bất động sản",
    "Budget Analysts": "Chuyên viên phân tích ngân sách",
    "Credit Analysts": "Chuyên viên phân tích tín dụng",
    "Financial and Investment Analysts": "Chuyên viên phân tích tài chính và đầu tư",
    "Personal Financial Advisors": "Tư vấn tài chính cá nhân",
    "Insurance Underwriters": "Chuyên viên bảo lãnh bảo hiểm",
    "Financial Examiners": "Thanh tra tài chính",
    "Financial Risk Specialists": "Chuyên viên rủi ro tài chính",
    "Financial Quantitative Analysts": "Chuyên viên phân tích định lượng tài chính",
    "Financial Specialists, All Other": "Chuyên viên tài chính (khác)",

    # IT & Computer
    "Computer and Information Research Scientists": "Nhà khoa học nghiên cứu máy tính và thông tin",
    "Computer Systems Analysts": "Chuyên viên phân tích hệ thống máy tính",
    "Information Security Analysts": "Chuyên viên an toàn thông tin",
    "Computer Programmers": "Lập trình viên máy tính",
    "Software Developers": "Kỹ sư phát triển phần mềm",
    "Software Quality Assurance Analysts and Testers": "Chuyên viên kiểm thử và đảm bảo chất lượng phần mềm",
    "Web Developers": "Lập trình viên web",
    "Web and Digital Interface Designers": "Nhà thiết kế giao diện web và kỹ thuật số",
    "Database Administrators": "Quản trị viên cơ sở dữ liệu",
    "Database Architects": "Kiến trúc sư cơ sở dữ liệu",
    "Network and Computer Systems Administrators": "Quản trị viên mạng và hệ thống máy tính",
    "Computer Network Architects": "Kiến trúc sư mạng máy tính",
    "Computer User Support Specialists": "Chuyên viên hỗ trợ người dùng máy tính",
    "Computer Network Support Specialists": "Chuyên viên hỗ trợ mạng máy tính",
    "Cybersecurity Analysts": "Chuyên viên an ninh mạng",
    "Data Scientists": "Nhà khoa học dữ liệu",
    "Business Intelligence Analysts": "Chuyên viên phân tích kinh doanh thông minh",
    "Computer Occupations, All Other": "Chuyên viên công nghệ thông tin (khác)",

    # Engineering
    "Aerospace Engineers": "Kỹ sư hàng không vũ trụ",
    "Agricultural Engineers": "Kỹ sư nông nghiệp",
    "Bioengineers and Biomedical Engineers": "Kỹ sư sinh học và y sinh",
    "Chemical Engineers": "Kỹ sư hóa học",
    "Civil Engineers": "Kỹ sư xây dựng",
    "Computer Hardware Engineers": "Kỹ sư phần cứng máy tính",
    "Electrical Engineers": "Kỹ sư điện",
    "Electronics Engineers, Except Computer": "Kỹ sư điện tử (trừ máy tính)",
    "Environmental Engineers": "Kỹ sư môi trường",
    "Health and Safety Engineers": "Kỹ sư an toàn và sức khỏe",
    "Industrial Engineers": "Kỹ sư công nghiệp",
    "Marine Engineers and Naval Architects": "Kỹ sư hàng hải và kiến trúc sư tàu thủy",
    "Materials Engineers": "Kỹ sư vật liệu",
    "Mechanical Engineers": "Kỹ sư cơ khí",
    "Mining and Geological Engineers": "Kỹ sư khai thác mỏ và địa chất",
    "Nuclear Engineers": "Kỹ sư hạt nhân",
    "Petroleum Engineers": "Kỹ sư dầu khí",
    "Software Engineers": "Kỹ sư phần mềm",
    "Engineers, All Other": "Kỹ sư (khác)",

    # Healthcare
    "Physicians": "Bác sĩ",
    "Surgeons": "Bác sĩ phẫu thuật",
    "Dentists": "Nha sĩ",
    "Pharmacists": "Dược sĩ",
    "Registered Nurses": "Điều dưỡng viên",
    "Nurse Practitioners": "Y tá thực hành nâng cao",
    "Physician Assistants": "Trợ lý bác sĩ",
    "Physical Therapists": "Chuyên viên vật lý trị liệu",
    "Occupational Therapists": "Chuyên viên trị liệu nghề nghiệp",
    "Speech-Language Pathologists": "Chuyên viên ngôn ngữ trị liệu",
    "Psychologists": "Nhà tâm lý học",
    "Social Workers": "Nhân viên công tác xã hội",
    "Dietitians and Nutritionists": "Chuyên gia dinh dưỡng",
    "Radiologic Technologists": "Kỹ thuật viên X-quang",
    "Medical Laboratory Technologists": "Kỹ thuật viên xét nghiệm y tế",
    "Paramedics": "Nhân viên y tế cấp cứu",
    "Emergency Medical Technicians": "Kỹ thuật viên y tế khẩn cấp",

    # Education
    "Postsecondary Teachers": "Giảng viên đại học",
    "Preschool Teachers": "Giáo viên mầm non",
    "Kindergarten Teachers": "Giáo viên mẫu giáo",
    "Elementary School Teachers": "Giáo viên tiểu học",
    "Middle School Teachers": "Giáo viên trung học cơ sở",
    "High School Teachers": "Giáo viên trung học phổ thông",
    "Special Education Teachers": "Giáo viên giáo dục đặc biệt",
    "Tutors": "Gia sư",
    "Librarians and Media Collections Specialists": "Thủ thư và chuyên viên quản lý tài liệu",

    # Sales
    "Sales Representatives, Wholesale and Manufacturing": "Đại diện kinh doanh bán buôn và sản xuất",
    "Sales Representatives of Services": "Đại diện kinh doanh dịch vụ",
    "Real Estate Brokers": "Môi giới bất động sản",
    "Real Estate Sales Agents": "Nhân viên kinh doanh bất động sản",
    "Insurance Sales Agents": "Nhân viên kinh doanh bảo hiểm",
    "Securities, Commodities, and Financial Services Sales Agents": "Nhân viên kinh doanh chứng khoán và dịch vụ tài chính",
    "Telemarketers": "Nhân viên bán hàng qua điện thoại",
    "Retail Salespersons": "Nhân viên bán lẻ",
    "Cashiers": "Thu ngân",
    "Counter and Rental Clerks": "Nhân viên quầy và cho thuê",
    "Parts Salespersons": "Nhân viên bán phụ tùng",
    "Travel Agents": "Nhân viên tư vấn du lịch",
    "Sales Engineers": "Kỹ sư kinh doanh",

    # Legal
    "Lawyers": "Luật sư",
    "Judges, Magistrate Judges, and Magistrates": "Thẩm phán",
    "Paralegals and Legal Assistants": "Trợ lý pháp lý",
    "Legal Secretaries and Administrative Assistants": "Thư ký pháp lý",
    "Court Reporters and Simultaneous Captioners": "Thư ký tòa án",
    "Title Examiners, Abstractors, and Searchers": "Chuyên viên kiểm tra quyền sở hữu",

    # Arts & Media
    "Graphic Designers": "Nhà thiết kế đồ họa",
    "Interior Designers": "Nhà thiết kế nội thất",
    "Fashion Designers": "Nhà thiết kế thời trang",
    "Industrial Designers": "Nhà thiết kế công nghiệp",
    "Architects": "Kiến trúc sư",
    "Photographers": "Nhiếp ảnh gia",
    "Film and Video Editors": "Biên tập viên phim và video",
    "Actors": "Diễn viên",
    "Musicians and Singers": "Nhạc sĩ và ca sĩ",
    "Writers and Authors": "Nhà văn và tác giả",
    "Technical Writers": "Nhà văn kỹ thuật",
    "Journalists": "Nhà báo",
    "Editors": "Biên tập viên",
    "Translators and Interpreters": "Phiên dịch viên",
    "Public Relations Specialists": "Chuyên viên quan hệ công chúng",
    "Advertising Sales Agents": "Nhân viên kinh doanh quảng cáo",

    # Trades & Technical
    "Electricians": "Thợ điện",
    "Plumbers, Pipefitters, and Steamfitters": "Thợ ống nước và hơi nước",
    "Carpenters": "Thợ mộc",
    "Welders, Cutters, Solderers, and Brazers": "Thợ hàn và cắt kim loại",
    "Machinists": "Thợ tiện",
    "HVAC Mechanics and Installers": "Kỹ thuật viên điều hòa không khí",
    "Automotive Service Technicians and Mechanics": "Kỹ thuật viên sửa chữa ô tô",
    "Aircraft Mechanics and Service Technicians": "Kỹ thuật viên bảo dưỡng máy bay",
    "Construction Laborers": "Công nhân xây dựng",
    "Operating Engineers and Other Construction Equipment Operators": "Thợ vận hành thiết bị xây dựng",

    # Food & Hospitality
    "Chefs and Head Cooks": "Bếp trưởng",
    "Cooks, Restaurant": "Đầu bếp nhà hàng",
    "Cooks, Fast Food": "Đầu bếp thức ăn nhanh",
    "Waiters and Waitresses": "Nhân viên phục vụ bàn",
    "Bartenders": "Pha chế đồ uống (Bartender)",
    "Hotel, Motel, and Resort Desk Clerks": "Nhân viên lễ tân khách sạn",
    "Concierges": "Nhân viên hỗ trợ khách (Concierge)",
    "Housekeeping Cleaners, Except Private Household": "Nhân viên dọn phòng",
    "Food Service Workers": "Nhân viên dịch vụ ăn uống",

    # Transportation
    "Airline Pilots, Copilots, and Flight Engineers": "Phi công và kỹ sư bay",
    "Commercial Pilots": "Phi công thương mại",
    "Air Traffic Controllers": "Kiểm soát viên không lưu",
    "Truck Drivers, Heavy and Tractor-Trailer": "Tài xế xe tải hạng nặng",
    "Delivery Truck Drivers and Driver/Sales Workers": "Tài xế giao hàng",
    "Bus Drivers, Transit and Intercity": "Tài xế xe buýt",
    "Taxi Drivers": "Tài xế taxi",
    "Uber and Rideshare Drivers": "Tài xế công nghệ",
    "Locomotive Engineers": "Lái tàu hỏa",
    "Ship Engineers": "Kỹ sư tàu thủy",

    # Science
    "Biologists": "Nhà sinh vật học",
    "Chemists": "Nhà hóa học",
    "Physicists": "Nhà vật lý học",
    "Geoscientists": "Nhà địa khoa học",
    "Environmental Scientists and Specialists": "Nhà khoa học môi trường",
    "Economists": "Nhà kinh tế học",
    "Sociologists": "Nhà xã hội học",
    "Statisticians": "Nhà thống kê học",
    "Mathematicians": "Nhà toán học",
    "Actuaries": "Chuyên gia tính toán bảo hiểm",

    # Other common
    "Gambling Dealers": "Nhân viên chia bài",
    "Gambling Service Workers, All Other": "Nhân viên dịch vụ cờ bạc (khác)",
    "Slot Supervisors": "Giám sát máy đánh bạc",
    "Gaming Supervisors": "Giám sát trò chơi có thưởng",
    "Parts Salespersons": "Nhân viên bán phụ tùng",
    "Sellers, All Other": "Nhân viên bán hàng (khác)",
    "Sales and Related Workers, All Other": "Nhân viên kinh doanh (khác)",
}

# ============================================================
# Post-processing rules — áp dụng SAU khi dịch máy
# Chuẩn hóa các pattern phổ biến
# ============================================================
POST_PROCESS_RULES = [
    # Bỏ "Các " ở đầu nếu không cần thiết
    (r'^Các (nhà|người|chuyên gia|kỹ sư|bác sĩ|giáo viên|nhân viên|thợ|tài xế|phi công|luật sư|nha sĩ|dược sĩ)', r'\1'),
    # "Người quản lý X" → "Quản lý X"
    (r'^Người quản lý ', 'Quản lý '),
    # "Các nhà quản lý X" → "Quản lý X"
    (r'^Các nhà quản lý ', 'Quản lý '),
    # "Nhà quản lý X" → "Quản lý X"
    (r'^Nhà quản lý ', 'Quản lý '),
    # "Các nhà X" → "Nhà X"
    (r'^Các nhà ', 'Nhà '),
    # "Các kỹ sư X" → "Kỹ sư X"
    (r'^Các kỹ sư ', 'Kỹ sư '),
    # "Các chuyên gia X" → "Chuyên gia X"
    (r'^Các chuyên gia ', 'Chuyên gia '),
    # "Các nhân viên X" → "Nhân viên X"
    (r'^Các nhân viên ', 'Nhân viên '),
    # "tất cả những người khác" / "tất cả các" → "(khác)"
    (r',?\s*tất cả những người khác$', ' (khác)'),
    (r',?\s*tất cả những.*$', ' (khác)'),
    (r',?\s*tất cả các.*$', ' (khác)'),
    # "X tuyến đầu" (First-Line) → "Giám sát trực tiếp X"
    (r'^Giám sát viên (.+) tuyến đầu$', r'Giám sát trực tiếp \1'),
    (r'^Người giám sát (.+) tuyến đầu$', r'Giám sát trực tiếp \1'),
    # "Kim loại và Nhựa" → "kim loại và nhựa" (viết thường)
    (r'\bKim loại và Nhựa\b', 'kim loại và nhựa'),
    (r'\bKim Loại\b', 'kim loại'),
    # Viết thường đầu câu nếu bắt đầu bằng chữ thường (do Google dịch)
    # Capitalize lại
]

# ============================================================
# Fix thủ công cho các bản dịch hay bị sai
# Áp dụng sau post-process
# ============================================================
MANUAL_FIXES = {
    # First-Line Supervisors
    "Giám sát viên cơ khí, thợ lắp đặt và thợ sửa chữa tuyến đầu":
        "Giám sát trực tiếp thợ cơ khí, thợ lắp đặt và thợ sửa chữa",
    "Giám sát viên thợ xây dựng và khai thác tuyến đầu":
        "Giám sát trực tiếp công nhân xây dựng và khai thác",
    "Giám sát viên nhân viên văn phòng và hành chính tuyến đầu":
        "Giám sát trực tiếp nhân viên văn phòng và hành chính",
    "Giám sát viên nhân viên bán hàng tuyến đầu":
        "Giám sát trực tiếp nhân viên kinh doanh",
    "Giám sát viên nhân viên dịch vụ cá nhân tuyến đầu":
        "Giám sát trực tiếp nhân viên dịch vụ cá nhân",
    "Giám sát viên nhân viên sản xuất và vận hành tuyến đầu":
        "Giám sát trực tiếp công nhân sản xuất và vận hành",
    "Giám sát viên nhân viên nông nghiệp tuyến đầu":
        "Giám sát trực tiếp nhân viên nông nghiệp",
    "Giám sát viên nhân viên vận chuyển tuyến đầu":
        "Giám sát trực tiếp nhân viên vận chuyển",
    # Misc fixes
    "Viễn thông An toàn Công cộng": "Nhân viên viễn thông an toàn công cộng",
    "nhà di truyền học": "Nhà di truyền học",
    "vũ công": "Vũ công",
    "Người định vị, vận hành và đấu thầu máy phay và máy bào, kim loại và nhựa":
        "Thợ vận hành máy phay và máy bào (kim loại và nhựa)",
    "Người định vị, vận hành và đấu thầu máy phay và máy bào, Kim loại và Nhựa":
        "Thợ vận hành máy phay và máy bào (kim loại và nhựa)",
    # Capitalize đầu câu bị thiếu
    "nhà khoa học về khí quyển và vũ trụ": "Nhà khoa học khí quyển và vũ trụ",
    "nhà khoa học vật liệu": "Nhà khoa học vật liệu",
    "nhà di truyền học": "Nhà di truyền học",
    "vũ công": "Vũ công",
    # Lặp từ
    "Kỹ thuật viên và kỹ thuật viên xây dựng dân dụng":
        "Kỹ thuật viên và chuyên gia công nghệ xây dựng dân dụng",
    "Người vận hành, vận hành và đấu thầu máy ép đùn, tạo hình, ép và nén":
        "Thợ vận hành máy ép đùn, tạo hình và nén",
    "Người giúp việc và người dọn dẹp nhà cửa": "Nhân viên giúp việc và dọn dẹp",
    # First-Line Supervisors còn sót
    "Giám sát viên tuyến đầu của công nhân xây dựng và khai thác mỏ":
        "Giám sát trực tiếp công nhân xây dựng và khai thác mỏ",
    "Giám sát viên tuyến đầu của thợ cơ khí, thợ lắp đặt và thợ sửa chữa":
        "Giám sát trực tiếp thợ cơ khí, thợ lắp đặt và thợ sửa chữa",
}

def post_process(text: str) -> str:
    """Chuẩn hóa bản dịch sau khi dịch máy."""
    if not text:
        return text
    result = text.strip()
    for pattern, replacement in POST_PROCESS_RULES:
        result = re.sub(pattern, replacement, result)
    # Áp dụng fix thủ công
    if result in MANUAL_FIXES:
        result = MANUAL_FIXES[result]
    # Capitalize chữ cái đầu
    if result and result[0].islower():
        result = result[0].upper() + result[1:]
    return result

def translate_to_vn(text: str) -> str:
    """Dịch text sang tiếng Việt."""
    if not text or not text.strip():
        return text
    # Kiểm tra từ điển thủ công trước
    if text in MANUAL_DICT:
        return MANUAL_DICT[text]
    for attempt in range(3):
        try:
            translator = GoogleTranslator(source='en', target='vi')
            result = translator.translate(text)
            time.sleep(DELAY)
            return post_process(result)
        except Exception as e:
            print(f"    [LỖI lần {attempt+1}] {e}")
            time.sleep(2 * (attempt + 1))
    return text

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # =========================================================
    # BƯỚC 1: BACKUP
    # =========================================================
    print("=" * 60)
    print("BƯỚC 1: Backup bảng core.careers")
    print("=" * 60)

    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'core'
            AND table_name = 'careers_backup_title_vi'
        )
    """)
    if not cur.fetchone()[0]:
        cur.execute("""
            CREATE TABLE core.careers_backup_title_vi
            AS SELECT * FROM core.careers
        """)
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM core.careers_backup_title_vi")
        print(f"✅ Backup: {cur.fetchone()[0]} bản ghi -> core.careers_backup_title_vi")
    else:
        print("✅ Backup đã tồn tại, bỏ qua.")

    # =========================================================
    # BƯỚC 2: Lấy tất cả title_en cần dịch
    # =========================================================
    print("\nBƯỚC 2: Lấy dữ liệu...")
    cur.execute("""
        SELECT id, title_en, title_vi
        FROM core.careers
        WHERE title_en IS NOT NULL
        ORDER BY id
    """)
    all_rows = cur.fetchall()
    print(f"Tổng: {len(all_rows)} bản ghi")

    # Unique title_en
    unique_titles = list(set(r[1] for r in all_rows if r[1]))
    print(f"Unique title_en: {len(unique_titles)}")

    # =========================================================
    # BƯỚC 3: Dịch với cache
    # =========================================================
    print("\nBƯỚC 3: Dịch title_en -> title_vi (thân thiện hơn)...")
    cache = load_cache()

    # Áp dụng từ điển thủ công vào cache trước
    for en, vi in MANUAL_DICT.items():
        cache[en] = vi

    # Re-apply post_process lên toàn bộ cache đã có (fix các bản dịch cũ)
    print("Re-applying post-process lên cache cũ...")
    fixed = 0
    for en in list(cache.keys()):
        old_vi = cache[en]
        new_vi = post_process(old_vi)
        if new_vi != old_vi:
            cache[en] = new_vi
            fixed += 1
    print(f"  Đã fix {fixed} entries trong cache")
    save_cache(cache)

    remaining = [t for t in unique_titles if t not in cache]
    print(f"Từ điển thủ công: {len(MANUAL_DICT)} entries")
    print(f"Đã có cache: {len(cache)}, Còn lại cần dịch: {len(remaining)}")

    for i, title in enumerate(remaining, 1):
        translated = translate_to_vn(title)
        cache[title] = translated
        if i % 10 == 0:
            save_cache(cache)
        if i <= 5 or i % 50 == 0:
            print(f"  [{i}/{len(remaining)}] {title[:50]} -> {translated[:50]}")

    save_cache(cache)
    print(f"✅ Cache: {len(cache)} entries")

    # =========================================================
    # BƯỚC 4: Update DB
    # =========================================================
    print("\nBƯỚC 4: Update DB...")
    updated = 0
    skipped = 0

    for row_id, title_en, title_vi_old in all_rows:
        new_vi = cache.get(title_en)
        if not new_vi:
            skipped += 1
            continue
        if new_vi == title_vi_old:
            skipped += 1
            continue
        cur.execute("""
            UPDATE core.careers
            SET title_vi = %s, updated_at = NOW()
            WHERE id = %s
        """, (new_vi, row_id))
        updated += 1

    conn.commit()
    print(f"✅ Update: {updated} bản ghi, bỏ qua: {skipped}")

    # =========================================================
    # BƯỚC 5: Kiểm tra mẫu
    # =========================================================
    print("\nBƯỚC 5: Mẫu kết quả (20 dòng đầu)...")
    cur.execute("""
        SELECT id, title_en, title_vi
        FROM core.careers
        ORDER BY id
        LIMIT 20
    """)
    for r in cur.fetchall():
        print(f"  id={r[0]}: {r[1]}")
        print(f"         -> {r[2]}")

    cur.close()
    conn.close()
    print("\n✅ Hoàn tất.")

if __name__ == '__main__':
    main()
