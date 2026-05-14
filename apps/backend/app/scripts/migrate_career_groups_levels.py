#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration Script: Career Groups và Career Levels
Tạo tables và seed dữ liệu từ O*NET
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """Tạo các bảng mới"""
    logger.info("🔨 Creating career_groups and career_levels tables...")
    
    with engine.connect() as conn:
        # Create career_groups table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS core.career_groups (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                onet_major_group TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        
        # Create career_levels table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS core.career_levels (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                order_index INTEGER NOT NULL,
                min_exp INTEGER NOT NULL,
                max_exp INTEGER,
                job_zone_mapping TEXT,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        
        # Create career_group_mapping table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS core.career_group_mapping (
                id SERIAL PRIMARY KEY,
                career_id BIGINT NOT NULL REFERENCES core.careers(id),
                group_id INTEGER NOT NULL REFERENCES core.career_groups(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(career_id, group_id)
            );
        """))
        
        # Create indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_career_groups_slug ON core.career_groups(slug);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_career_groups_onet ON core.career_groups(onet_major_group);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_career_levels_slug ON core.career_levels(slug);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_career_levels_order ON core.career_levels(order_index);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_career_group_mapping_career ON core.career_group_mapping(career_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_career_group_mapping_group ON core.career_group_mapping(group_id);"))
        
        conn.commit()
        logger.info("✅ Tables created successfully")


def seed_career_groups():
    """Seed career groups từ O*NET major groups"""
    logger.info("🌱 Seeding career groups...")
    
    # Mapping O*NET major groups sang tên tiếng Việt
    onet_groups = [
        ("11", "management", "Quản lý", "Các vị trí quản lý và điều hành doanh nghiệp"),
        ("13", "business-finance", "Kinh doanh & Tài chính", "Phân tích kinh doanh, tài chính và các hoạt động liên quan"),
        ("15", "computer-math", "Công nghệ thông tin", "Lập trình, phân tích hệ thống và toán học ứng dụng"),
        ("17", "architecture-engineering", "Kiến trúc & Kỹ thuật", "Thiết kế, xây dựng và kỹ thuật"),
        ("19", "life-science", "Khoa học tự nhiên", "Nghiên cứu khoa học, vật lý, hóa học và sinh học"),
        ("21", "community-social", "Dịch vụ cộng đồng", "Công tác xã hội và dịch vụ cộng đồng"),
        ("23", "legal", "Pháp lý", "Luật sư, thẩm phán và các nghề pháp lý"),
        ("25", "education", "Giáo dục", "Giảng dạy và đào tạo"),
        ("27", "arts-media", "Nghệ thuật & Truyền thông", "Thiết kế, nghệ thuật và truyền thông"),
        ("29", "healthcare-practitioners", "Y tế chuyên nghiệp", "Bác sĩ, y tá và chuyên gia y tế"),
        ("31", "healthcare-support", "Hỗ trợ y tế", "Nhân viên hỗ trợ trong lĩnh vực y tế"),
        ("33", "protective-service", "Dịch vụ bảo vệ", "Cảnh sát, lính cứu hỏa và an ninh"),
        ("35", "food-service", "Dịch vụ ăn uống", "Nấu ăn và phục vụ thực phẩm"),
        ("37", "building-maintenance", "Bảo trì tòa nhà", "Vệ sinh và bảo trì cơ sở vật chất"),
        ("39", "personal-care", "Chăm sóc cá nhân", "Làm đẹp, chăm sóc sức khỏe cá nhân"),
        ("41", "sales", "Bán hàng", "Bán hàng và dịch vụ khách hàng"),
        ("43", "office-admin", "Hành chính văn phòng", "Hỗ trợ hành chính và văn phòng"),
        ("45", "farming-forestry", "Nông nghiệp & Lâm nghiệp", "Nông nghiệp, chăn nuôi và lâm nghiệp"),
        ("47", "construction", "Xây dựng", "Xây dựng và khai thác"),
        ("49", "installation-repair", "Lắp đặt & Sửa chữa", "Bảo trì và sửa chữa thiết bị"),
        ("51", "production", "Sản xuất", "Sản xuất và chế tạo"),
        ("53", "transportation", "Vận tải", "Vận chuyển và di chuyển hàng hóa")
    ]
    
    with engine.connect() as conn:
        # Clear existing data
        conn.execute(text("DELETE FROM core.career_group_mapping;"))
        conn.execute(text("DELETE FROM core.career_groups;"))
        
        # Insert career groups
        for onet_code, slug, name, description in onet_groups:
            conn.execute(text("""
                INSERT INTO core.career_groups (onet_major_group, slug, name, description)
                VALUES (:onet_code, :slug, :name, :description)
                ON CONFLICT (slug) DO NOTHING;
            """), {
                "onet_code": onet_code,
                "slug": slug,
                "name": name,
                "description": description
            })
        
        conn.commit()
        logger.info("✅ Career groups seeded successfully")


def seed_career_levels():
    """Seed career levels"""
    logger.info("🌱 Seeding career levels...")
    
    levels = [
        ("fresher", "Fresher", 1, 0, 1, "1,2", "Người mới bắt đầu, ít hoặc không có kinh nghiệm"),
        ("junior", "Junior", 2, 1, 2, "2,3", "Có kinh nghiệm cơ bản, cần hướng dẫn"),
        ("middle", "Middle", 3, 2, 4, "3,4", "Có kinh nghiệm trung bình, làm việc độc lập"),
        ("senior", "Senior", 4, 4, 6, "4,5", "Có kinh nghiệm cao, có thể dẫn dắt team"),
        ("lead", "Lead", 5, 6, None, "5", "Chuyên gia, quản lý và định hướng chiến lược")
    ]
    
    with engine.connect() as conn:
        # Clear existing data
        conn.execute(text("DELETE FROM core.career_levels;"))
        
        # Insert career levels
        for slug, name, order_index, min_exp, max_exp, job_zone_mapping, description in levels:
            conn.execute(text("""
                INSERT INTO core.career_levels (slug, name, order_index, min_exp, max_exp, job_zone_mapping, description)
                VALUES (:slug, :name, :order_index, :min_exp, :max_exp, :job_zone_mapping, :description)
                ON CONFLICT (slug) DO NOTHING;
            """), {
                "slug": slug,
                "name": name,
                "order_index": order_index,
                "min_exp": min_exp,
                "max_exp": max_exp,
                "job_zone_mapping": job_zone_mapping,
                "description": description
            })
        
        conn.commit()
        logger.info("✅ Career levels seeded successfully")


def map_careers_to_groups():
    """Map careers to groups dựa trên O*NET code"""
    logger.info("🔗 Mapping careers to groups...")
    
    with engine.connect() as conn:
        # Map careers to groups based on first 2 digits of onet_code
        conn.execute(text("""
            INSERT INTO core.career_group_mapping (career_id, group_id)
            SELECT DISTINCT
                c.id as career_id,
                cg.id as group_id
            FROM core.careers c
            JOIN core.career_groups cg ON LEFT(c.onet_code, 2) = cg.onet_major_group
            WHERE c.onet_code IS NOT NULL
            ON CONFLICT (career_id, group_id) DO NOTHING;
        """))
        
        # Map careers without onet_code based on industry_category
        industry_mapping = {
            'Management': 'management',
            'Business and Financial Operations': 'business-finance',
            'Computer and Mathematical': 'computer-math',
            'Architecture and Engineering': 'architecture-engineering',
            'Life, Physical, and Social Science': 'life-science',
            'Community and Social Service': 'community-social',
            'Legal': 'legal',
            'Educational Instruction and Library': 'education',
            'Arts, Design, Entertainment, Sports, and Media': 'arts-media',
            'Healthcare Practitioners and Technical': 'healthcare-practitioners',
            'Healthcare Support': 'healthcare-support',
            'Protective Service': 'protective-service',
            'Food Preparation and Serving Related': 'food-service',
            'Building and Grounds Cleaning and Maintenance': 'building-maintenance',
            'Personal Care and Service': 'personal-care',
            'Sales and Related': 'sales',
            'Office and Administrative Support': 'office-admin',
            'Farming, Fishing, and Forestry': 'farming-forestry',
            'Construction and Extraction': 'construction',
            'Installation, Maintenance, and Repair': 'installation-repair',
            'Production': 'production',
            'Transportation and Material Moving': 'transportation'
        }
        
        for industry_category, group_slug in industry_mapping.items():
            conn.execute(text("""
                INSERT INTO core.career_group_mapping (career_id, group_id)
                SELECT DISTINCT
                    c.id as career_id,
                    cg.id as group_id
                FROM core.careers c
                JOIN core.career_groups cg ON cg.slug = :group_slug
                WHERE c.industry_category = :industry_category
                  AND c.id NOT IN (SELECT career_id FROM core.career_group_mapping)
                ON CONFLICT (career_id, group_id) DO NOTHING;
            """), {
                "group_slug": group_slug,
                "industry_category": industry_category
            })
        
        conn.commit()
        
        # Log statistics
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total_careers,
                COUNT(cgm.career_id) as mapped_careers
            FROM core.careers c
            LEFT JOIN core.career_group_mapping cgm ON c.id = cgm.career_id;
        """)).fetchone()
        
        logger.info(f"✅ Career mapping completed: {result.mapped_careers}/{result.total_careers} careers mapped")


def verify_data():
    """Verify seeded data"""
    logger.info("🔍 Verifying seeded data...")
    
    with engine.connect() as conn:
        # Check career groups
        groups_result = conn.execute(text("SELECT COUNT(*) FROM core.career_groups;")).fetchone()
        logger.info(f"   Career Groups: {groups_result[0]}")
        
        # Check career levels
        levels_result = conn.execute(text("SELECT COUNT(*) FROM core.career_levels;")).fetchone()
        logger.info(f"   Career Levels: {levels_result[0]}")
        
        # Check mappings
        mappings_result = conn.execute(text("SELECT COUNT(*) FROM core.career_group_mapping;")).fetchone()
        logger.info(f"   Career Mappings: {mappings_result[0]}")
        
        # Show group distribution
        logger.info("\n📊 Career distribution by group:")
        distribution = conn.execute(text("""
            SELECT 
                cg.name,
                COUNT(cgm.career_id) as career_count
            FROM core.career_groups cg
            LEFT JOIN core.career_group_mapping cgm ON cg.id = cgm.group_id
            GROUP BY cg.id, cg.name
            ORDER BY career_count DESC;
        """)).fetchall()
        
        for row in distribution:
            logger.info(f"   {row.name}: {row.career_count} careers")


def main():
    """Main migration function"""
    logger.info("🚀 Starting Career Groups & Levels Migration...")
    
    try:
        create_tables()
        seed_career_groups()
        seed_career_levels()
        map_careers_to_groups()
        verify_data()
        
        logger.info("✅ Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    main()