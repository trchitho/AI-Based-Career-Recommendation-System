import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")

def run_comments():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    comments = [
        "COMMENT ON TABLE core.vietnamworks_categories IS 'Danh mục ngành nghề từ VietnamWorks.com';",
        "COMMENT ON COLUMN core.vietnamworks_categories.slug IS 'Slug duy nhất cho URL';",
        "COMMENT ON COLUMN core.vietnamworks_categories.category_group IS 'Nhóm ngành chính (Bán Hàng & Kinh Doanh, Kế Toán & Tài chính, etc.)';",
        "COMMENT ON COLUMN core.vietnamworks_categories.vietnamworks_url IS 'URL gốc từ VietnamWorks';",
        "COMMENT ON COLUMN core.vietnamworks_categories.sort_order IS 'Thứ tự sắp xếp trong nhóm';"
    ]
    
    for cmd in comments:
        cur.execute(cmd)
    
    conn.commit()
    cur.close()
    conn.close()
    print("Comments updated.")

if __name__ == "__main__":
    run_comments()
