import os
import psycopg2
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv('apps/backend/.env')

def get_db_connection():
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:123456@localhost:5433/career_ai')
    parts = db_url.replace('postgresql://', '').split('@')
    user_pass = parts[0].split(':')
    host_port_db = parts[1].split('/')
    host_port = host_port_db[0].split(':')
    
    return psycopg2.connect(
        host=host_port[0],
        port=host_port[1] if len(host_port) > 1 else '5432',
        database=host_port_db[1],
        user=user_pass[0],
        password=user_pass[1]
    )

def seed_trends_tables():
    conn = get_db_connection()
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        logger.info("Bắt đầu nạp dữ liệu mẫu cho 5 bảng Xu hướng (Trends)...")
        
        # 1. Bảng careers
        logger.info("Đang nạp dữ liệu bảng core.careers...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS core.careers (
                onet_code VARCHAR(20) PRIMARY KEY,
                title_vi VARCHAR(255),
                title_en VARCHAR(255),
                industry_category VARCHAR(255)
            );
            
            INSERT INTO core.careers (onet_code, title_vi, title_en, industry_category)
            VALUES 
                ('15-1221.00', 'Lập trình viên máy tính', 'Computer Programmer', 'IT & Phần mềm'),
                ('15-1252.00', 'Nhà phát triển phần mềm', 'Software Developer', 'IT & Phần mềm'),
                ('29-1062.00', 'Bác sĩ đa khoa', 'Family Medicine Physician', 'Y tế & Chăm sóc sức khỏe'),
                ('41-4012.00', 'Đại diện bán hàng', 'Sales Representative', 'Kinh doanh & Tiếp thị'),
                ('13-2011.00', 'Kế toán viên', 'Accountant', 'Tài chính & Kế toán'),
                ('11-2021.00', 'Quản lý Marketing', 'Marketing Manager', 'Kinh doanh & Tiếp thị')
            ON CONFLICT (onet_code) DO NOTHING;
        """)

        # 2. Bảng career_wages_vi
        logger.info("Đang nạp dữ liệu bảng core.career_wages_vi...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS core.career_wages_vi (
                id SERIAL PRIMARY KEY,
                onet_code VARCHAR(20),
                experience_level VARCHAR(50),
                monthly_median_vnd NUMERIC,
                annual_median_vnd NUMERIC
            );
            
            INSERT INTO core.career_wages_vi (onet_code, experience_level, monthly_median_vnd, annual_median_vnd)
            VALUES 
                ('15-1221.00', 'Mid', 25000000, 300000000),
                ('15-1252.00', 'Senior', 45000000, 540000000),
                ('29-1062.00', 'Senior', 35000000, 420000000),
                ('41-4012.00', 'Entry', 12000000, 144000000),
                ('13-2011.00', 'Mid', 18000000, 216000000),
                ('11-2021.00', 'Senior', 30000000, 360000000)
            ON CONFLICT DO NOTHING;
        """)

        # 3. Bảng career_work_activities_master
        logger.info("Đang nạp dữ liệu bảng core.career_work_activities_master...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS core.career_work_activities_master (
                element_id VARCHAR(50) PRIMARY KEY,
                element_name VARCHAR(255),
                element_name_vi VARCHAR(255)
            );
            
            INSERT INTO core.career_work_activities_master (element_id, element_name, element_name_vi)
            VALUES 
                ('4.A.1.b.1', 'Interacting With Computers', 'Lập trình & Sử dụng máy tính'),
                ('4.A.2.a.4', 'Analyzing Data or Information', 'Phân tích dữ liệu'),
                ('4.A.4.a.1', 'Performing Administrative Activities', 'Thực hiện công việc hành chính'),
                ('4.A.4.b.4', 'Selling or Influencing Others', 'Bán hàng & Thuyết phục'),
                ('4.A.3.b.6', 'Assisting and Caring for Others', 'Chăm sóc bệnh nhân'),
                ('4.A.4.b.1', 'Coordinating the Work and Activities of Others', 'Quản lý dự án & Điều phối')
            ON CONFLICT (element_id) DO NOTHING;
        """)

        # 4. Bảng career_work_activity_summary
        logger.info("Đang nạp dữ liệu bảng core.career_work_activity_summary...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS core.career_work_activity_summary (
                id SERIAL PRIMARY KEY,
                onet_code VARCHAR(20),
                element_id VARCHAR(50),
                combined_score NUMERIC,
                activity_rank INTEGER
            );
            
            INSERT INTO core.career_work_activity_summary (onet_code, element_id, combined_score, activity_rank)
            VALUES 
                ('15-1221.00', '4.A.1.b.1', 0.95, 1),
                ('15-1252.00', '4.A.1.b.1', 0.98, 1),
                ('15-1252.00', '4.A.2.a.4', 0.85, 2),
                ('29-1062.00', '4.A.3.b.6', 0.92, 1),
                ('41-4012.00', '4.A.4.b.4', 0.88, 1),
                ('13-2011.00', '4.A.2.a.4', 0.80, 1),
                ('11-2021.00', '4.A.4.b.1', 0.90, 1),
                ('11-2021.00', '4.A.4.b.4', 0.85, 2)
            ON CONFLICT DO NOTHING;
        """)

        # 5. Bảng vietnamworks_categories
        logger.info("Đang nạp dữ liệu bảng core.vietnamworks_categories...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS core.vietnamworks_categories (
                id SERIAL PRIMARY KEY,
                category_group VARCHAR(255),
                name VARCHAR(255),
                vietnamese_name VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE
            );
            
            INSERT INTO core.vietnamworks_categories (category_group, name, vietnamese_name)
            VALUES 
                ('IT & Software', 'Software Development', 'Phát triển phần mềm'),
                ('Healthcare', 'Medical Doctor', 'Bác sĩ Y khoa'),
                ('Business', 'Sales', 'Bán hàng / Kinh doanh'),
                ('Finance', 'Accounting', 'Kế toán / Kiểm toán')
            ON CONFLICT DO NOTHING;
        """)

        logger.info("🎉 Đã chạy xong! 5 bảng đã được nạp dữ liệu mẫu thành công để test Trends Page.")
        
    except Exception as e:
        logger.error(f"Lỗi khi nạp dữ liệu: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_trends_tables()
