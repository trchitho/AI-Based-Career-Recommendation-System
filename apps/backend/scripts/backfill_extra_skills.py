"""
Backfill extra_skills for records that have empty extra_skills.
This script uses the updated _current_career_catalog logic.
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:123456@localhost:5433/career_ai"
)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def infer_cv_career_label(cv_skills: list) -> str:
    """Infer career label from CV skills."""
    text_content = " ".join(
        f"{s.get('name', '')} {s.get('category', '')}" 
        for s in (cv_skills or [])
    ).lower()
    
    # IT / Developer careers
    if any(token in text_content for token in ["react", "node", "express", "spring boot", "mongodb", "postgresql", "typescript", "javascript", "fastapi"]):
        if any(token in text_content for token in ["react", "frontend", "typescript", "javascript"]) and any(token in text_content for token in ["node", "express", "backend", "spring boot", "fastapi", "mongodb", "postgresql"]):
            return "Fullstack Web Developer"
        if any(token in text_content for token in ["node", "express", "backend", "spring boot", "fastapi", "mongodb", "postgresql"]):
            return "Backend Developer"
        return "Frontend Developer"
    
    # AI / Data careers
    if any(token in text_content for token in ["pandas", "numpy", "faiss", "nlp", "machine learning", "phobert", "sbert", "data analysis", "data science"]):
        return "AI/Data Developer"
    
    # Sales / Business Development careers
    if any(token in text_content for token in ["sales", "kinh doanh", "bán hàng", "business development", "account manager", "crm", "khách hàng", "doanh số", "chốt sale", "tư vấn bán hàng"]):
        return "Sales/Kinh doanh"
    
    # Marketing careers
    if any(token in text_content for token in ["marketing", "seo", "content", "digital marketing", "quảng cáo", "social media", "brand", "copywriting"]):
        return "Marketing"
    
    # Office / Admin careers
    if any(token in text_content for token in ["admin", "hành chính", "văn phòng", "office", "thư ký", "secretary", "assistant"]):
        return "Office/Hành chính"
    
    return "Nghề hiện tại theo CV"


def get_career_catalog(career_label: str) -> list:
    """Get skill catalog for a career label."""
    label_lower = career_label.lower()

    # IT / Developer careers
    if any(kw in label_lower for kw in ["fullstack", "backend", "frontend", "developer", "lập trình"]):
        return [
            {"name": "Docker", "category": "DevOps", "description_vn": "Docker giúp đóng gói ứng dụng và toàn bộ môi trường chạy vào container, giúp triển khai nhất quán giữa máy local, staging và production."},
            {"name": "CI/CD", "category": "DevOps", "description_vn": "CI/CD là quy trình tự động kiểm thử, build và triển khai mã nguồn, giúp giảm lỗi thủ công và tăng tốc phát hành phần mềm."},
            {"name": "Unit Testing", "category": "Testing", "description_vn": "Unit Testing kiểm thử từng hàm, component hoặc module nhỏ để phát hiện lỗi sớm và bảo vệ logic quan trọng khi refactor."},
            {"name": "Integration Testing", "category": "Testing", "description_vn": "Integration Testing kiểm tra cách API, database, service và frontend phối hợp với nhau trong luồng nghiệp vụ thực tế."},
            {"name": "Redis", "category": "Backend", "description_vn": "Redis là kho dữ liệu in-memory thường dùng cho cache, session, rate limiting và hàng đợi nhẹ để tăng tốc hệ thống web."},
            {"name": "Docker Compose", "category": "DevOps", "description_vn": "Docker Compose giúp định nghĩa và chạy nhiều service như backend, frontend, database, cache trong một môi trường phát triển thống nhất."},
            {"name": "Web Security", "category": "Security", "description_vn": "Web Security bao gồm các kỹ thuật phòng chống XSS, CSRF, SQL/NoSQL injection, lộ token và cấu hình phân quyền sai trong ứng dụng web."},
            {"name": "OAuth2", "category": "Security", "description_vn": "OAuth2 là chuẩn ủy quyền phổ biến để đăng nhập và cấp quyền an toàn qua các nhà cung cấp như Google, GitHub hoặc hệ thống SSO."},
            {"name": "System Design", "category": "Architecture", "description_vn": "System Design là năng lực thiết kế kiến trúc hệ thống có khả năng mở rộng, chịu tải, chia module rõ ràng và kiểm soát rủi ro vận hành."},
            {"name": "Observability", "category": "DevOps", "description_vn": "Observability gồm logging, metrics và tracing để theo dõi sức khỏe hệ thống, phát hiện lỗi và điều tra nguyên nhân khi production gặp sự cố."},
        ]

    # AI / Data careers
    if any(kw in label_lower for kw in ["ai", "data", "machine learning", "ml", "analyst"]):
        return [
            {"name": "SQL nâng cao", "category": "Database", "description_vn": "Viết truy vấn phức tạp với JOIN, subquery, window function để phân tích dữ liệu lớn hiệu quả."},
            {"name": "Python cho Data", "category": "Programming", "description_vn": "Sử dụng pandas, numpy, matplotlib để xử lý, phân tích và trực quan hóa dữ liệu."},
            {"name": "Thống kê ứng dụng", "category": "Analysis", "description_vn": "Hiểu và áp dụng các khái niệm thống kê như phân phối, kiểm định giả thuyết, hồi quy vào phân tích thực tế."},
            {"name": "Data Visualization", "category": "Analysis", "description_vn": "Tạo biểu đồ và dashboard trực quan giúp stakeholder hiểu insight từ dữ liệu."},
            {"name": "ETL Pipeline", "category": "Data Engineering", "description_vn": "Xây dựng quy trình trích xuất, chuyển đổi và nạp dữ liệu từ nhiều nguồn vào data warehouse."},
            {"name": "Machine Learning cơ bản", "category": "AI", "description_vn": "Hiểu và áp dụng các thuật toán ML phổ biến như regression, classification, clustering."},
            {"name": "Feature Engineering", "category": "AI", "description_vn": "Tạo và chọn lọc đặc trưng từ dữ liệu thô để cải thiện hiệu suất mô hình."},
            {"name": "Model Evaluation", "category": "AI", "description_vn": "Đánh giá mô hình bằng các metrics phù hợp và tránh overfitting/underfitting."},
            {"name": "Git cho Data Science", "category": "Tools", "description_vn": "Quản lý phiên bản code và notebook, cộng tác với team qua Git."},
            {"name": "Storytelling với dữ liệu", "category": "Communication", "description_vn": "Trình bày kết quả phân tích một cách thuyết phục cho đối tượng không chuyên kỹ thuật."},
        ]

    # Sales / Business Development careers
    if any(kw in label_lower for kw in ["sales", "kinh doanh", "bán hàng", "business development"]):
        return [
            {"name": "CRM Software", "category": "Tools", "description_vn": "Sử dụng thành thạo phần mềm quản lý khách hàng như Salesforce, HubSpot hoặc Zoho để theo dõi pipeline và chăm sóc khách hàng."},
            {"name": "Kỹ năng đàm phán", "category": "Soft Skills", "description_vn": "Thương lượng giá cả, điều khoản hợp đồng và xử lý phản đối của khách hàng một cách chuyên nghiệp."},
            {"name": "Phân tích thị trường", "category": "Analysis", "description_vn": "Nghiên cứu đối thủ cạnh tranh, xu hướng ngành và nhu cầu khách hàng để xây dựng chiến lược bán hàng hiệu quả."},
            {"name": "Kỹ năng thuyết trình", "category": "Communication", "description_vn": "Trình bày sản phẩm/dịch vụ một cách thuyết phục, tạo ấn tượng tốt với khách hàng tiềm năng."},
            {"name": "Email Marketing", "category": "Marketing", "description_vn": "Viết email chào hàng, follow-up và nurturing hiệu quả để chuyển đổi lead thành khách hàng."},
            {"name": "Social Selling", "category": "Sales", "description_vn": "Sử dụng LinkedIn và mạng xã hội để tìm kiếm, kết nối và xây dựng quan hệ với khách hàng tiềm năng."},
            {"name": "Quản lý thời gian", "category": "Soft Skills", "description_vn": "Ưu tiên công việc, quản lý lịch hẹn và đảm bảo follow-up đúng hạn với nhiều khách hàng cùng lúc."},
            {"name": "Xử lý từ chối", "category": "Sales", "description_vn": "Kỹ thuật vượt qua sự từ chối của khách hàng và chuyển đổi 'không' thành cơ hội."},
            {"name": "Báo cáo doanh số", "category": "Analysis", "description_vn": "Tổng hợp và phân tích số liệu bán hàng, dự báo doanh thu và báo cáo cho quản lý."},
            {"name": "Kỹ năng lắng nghe", "category": "Soft Skills", "description_vn": "Lắng nghe chủ động để hiểu nhu cầu thực sự của khách hàng và đề xuất giải pháp phù hợp."},
        ]

    # Marketing careers
    if any(kw in label_lower for kw in ["marketing", "digital", "content", "seo", "quảng cáo"]):
        return [
            {"name": "Google Analytics", "category": "Tools", "description_vn": "Phân tích traffic website, hành vi người dùng và đo lường hiệu quả chiến dịch marketing."},
            {"name": "SEO", "category": "Marketing", "description_vn": "Tối ưu hóa website để tăng thứ hạng trên công cụ tìm kiếm và thu hút traffic tự nhiên."},
            {"name": "Content Marketing", "category": "Marketing", "description_vn": "Tạo nội dung giá trị để thu hút, giữ chân và chuyển đổi khách hàng mục tiêu."},
            {"name": "Facebook/Google Ads", "category": "Advertising", "description_vn": "Chạy và tối ưu quảng cáo trả phí trên các nền tảng để đạt ROI cao nhất."},
            {"name": "Email Automation", "category": "Marketing", "description_vn": "Thiết lập chuỗi email tự động để nurturing lead và tăng tỷ lệ chuyển đổi."},
            {"name": "Copywriting", "category": "Content", "description_vn": "Viết nội dung quảng cáo, landing page và email thuyết phục để tăng conversion."},
            {"name": "A/B Testing", "category": "Analysis", "description_vn": "Thử nghiệm các phiên bản khác nhau của nội dung/quảng cáo để tìm ra phương án hiệu quả nhất."},
            {"name": "Social Media Management", "category": "Marketing", "description_vn": "Quản lý và phát triển các kênh mạng xã hội của thương hiệu."},
            {"name": "Marketing Analytics", "category": "Analysis", "description_vn": "Đo lường và phân tích hiệu quả các chiến dịch marketing để tối ưu ngân sách."},
            {"name": "Brand Strategy", "category": "Marketing", "description_vn": "Xây dựng và duy trì hình ảnh thương hiệu nhất quán trên các kênh."},
        ]

    # Office / Admin / General careers (fallback)
    return [
        {"name": "Microsoft Excel nâng cao", "category": "Office", "description_vn": "Sử dụng công thức phức tạp, pivot table, VLOOKUP/XLOOKUP và macro để xử lý dữ liệu hiệu quả."},
        {"name": "Kỹ năng giao tiếp", "category": "Soft Skills", "description_vn": "Truyền đạt thông tin rõ ràng, lắng nghe chủ động và xây dựng mối quan hệ tốt với đồng nghiệp và khách hàng."},
        {"name": "Quản lý thời gian", "category": "Soft Skills", "description_vn": "Ưu tiên công việc, lập kế hoạch và hoàn thành deadline một cách hiệu quả."},
        {"name": "Làm việc nhóm", "category": "Soft Skills", "description_vn": "Hợp tác hiệu quả với các thành viên trong team để đạt mục tiêu chung."},
        {"name": "Giải quyết vấn đề", "category": "Soft Skills", "description_vn": "Phân tích tình huống, xác định nguyên nhân gốc rễ và đề xuất giải pháp phù hợp."},
        {"name": "Viết báo cáo", "category": "Communication", "description_vn": "Tổng hợp thông tin và trình bày báo cáo rõ ràng, chuyên nghiệp cho các bên liên quan."},
        {"name": "Thuyết trình", "category": "Communication", "description_vn": "Trình bày ý tưởng và thông tin một cách tự tin, thuyết phục trước nhóm hoặc khách hàng."},
        {"name": "Tư duy phản biện", "category": "Soft Skills", "description_vn": "Đánh giá thông tin một cách khách quan, nhận diện thiên kiến và đưa ra quyết định hợp lý."},
        {"name": "Tiếng Anh giao tiếp", "category": "Language", "description_vn": "Giao tiếp cơ bản bằng tiếng Anh trong môi trường công việc, đọc hiểu tài liệu và email."},
        {"name": "Kỹ năng tổ chức", "category": "Soft Skills", "description_vn": "Sắp xếp công việc, tài liệu và không gian làm việc một cách khoa học để tăng năng suất."},
    ]


def backfill_extra_skills():
    """Backfill extra_skills for records with empty extra_skills."""
    session = Session()
    
    try:
        # Get records with empty extra_skills
        result = session.execute(text("""
            SELECT id, cv_skills, career_id 
            FROM core.skill_gap_analyses 
            WHERE extra_skills = '[]'::jsonb OR extra_skills IS NULL
        """))
        
        records = result.fetchall()
        print(f"Found {len(records)} records with empty extra_skills")
        
        for record in records:
            record_id = record[0]
            cv_skills = record[1] or []
            career_id = record[2]
            
            # Infer career label from CV skills
            career_label = infer_cv_career_label(cv_skills)
            print(f"\nRecord {record_id}: career_id={career_id}, inferred_label={career_label}")
            
            # Get catalog for this career
            catalog = get_career_catalog(career_label)
            
            # Filter out skills already in CV
            cv_skill_names = {s.get('name', '').lower() for s in cv_skills}
            extra_skills = []
            for skill in catalog:
                if skill['name'].lower() not in cv_skill_names:
                    extra_skills.append({
                        **skill,
                        "source": "current_career_catalog",
                        "current_career": career_label,
                        "target_career": career_id,
                    })
                if len(extra_skills) >= 10:
                    break
            
            print(f"  Generated {len(extra_skills)} extra_skills")
            
            # Update record
            import json
            session.execute(
                text("UPDATE core.skill_gap_analyses SET extra_skills = :extra_skills WHERE id = :id"),
                {"extra_skills": json.dumps(extra_skills, ensure_ascii=False), "id": record_id}
            )
            print(f"  Updated record {record_id}")
        
        session.commit()
        print(f"\nBackfill complete! Updated {len(records)} records.")
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()


if __name__ == "__main__":
    backfill_extra_skills()
