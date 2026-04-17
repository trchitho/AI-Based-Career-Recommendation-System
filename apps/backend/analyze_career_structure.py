#!/usr/bin/env python3
"""
Phân tích cấu trúc database career để tìm thông tin về:
1. Nhóm ngành nghề (industry grouping)
2. Career levels/seniority
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/career_dev')

def main():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print('🔍 PHÂN TÍCH DATABASE CAREER - NHÓM NGÀNH NGHỀ VÀ LEVELS')
        print('=' * 80)
        
        # 1. Kiểm tra bảng careers chính
        print('\n1. 📊 BẢNG CAREERS CHÍNH:')
        try:
            cur.execute('SELECT COUNT(*) FROM core.careers')
            career_count = cur.fetchone()[0]
            print(f'   ✅ Tổng số nghề: {career_count:,}')
            
            # Xem cấu trúc bảng careers
            cur.execute('''
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_schema = 'core' AND table_name = 'careers'
                ORDER BY ordinal_position
            ''')
            columns = cur.fetchall()
            print('   📋 Cấu trúc bảng careers:')
            for col in columns:
                print(f'      - {col[0]}: {col[1]} ({"NULL" if col[2] == "YES" else "NOT NULL"})')
                
        except Exception as e:
            print(f'   ❌ Lỗi truy cập bảng careers: {e}')
        
        # 2. Tìm thông tin về nhóm ngành nghề
        print('\n2. 🏢 PHÂN NHÓM NGÀNH NGHỀ:')
        
        # 2a. Kiểm tra industry_category trong careers
        try:
            cur.execute('''
                SELECT industry_category, COUNT(*) as count
                FROM core.careers 
                WHERE industry_category IS NOT NULL
                GROUP BY industry_category 
                ORDER BY count DESC
            ''')
            industry_cats = cur.fetchall()
            if industry_cats:
                print(f'   ✅ Có {len(industry_cats)} nhóm industry_category:')
                for cat, count in industry_cats[:10]:  # Top 10
                    print(f'      - {cat}: {count} nghề')
            else:
                print('   ❌ Không có dữ liệu industry_category')
        except Exception as e:
            print(f'   ❌ Lỗi kiểm tra industry_category: {e}')
        
        # 2b. Phân tích ONET major groups từ onet_code
        try:
            cur.execute('''
                SELECT 
                    SUBSTRING(onet_code FROM 1 FOR 2) as major_group,
                    COUNT(*) as count
                FROM core.careers 
                WHERE onet_code IS NOT NULL
                GROUP BY SUBSTRING(onet_code FROM 1 FOR 2)
                ORDER BY major_group
            ''')
            major_groups = cur.fetchall()
            print(f'   ✅ Có {len(major_groups)} ONET Major Groups:')
            total_careers = sum(count for _, count in major_groups)
            for group, count in major_groups:
                pct = (count / total_careers * 100) if total_careers > 0 else 0
                print(f'      - Group {group}: {count} nghề ({pct:.1f}%)')
        except Exception as e:
            print(f'   ❌ Lỗi phân tích ONET groups: {e}')
        
        # 2c. Kiểm tra career_tags
        try:
            cur.execute('SELECT COUNT(*) FROM core.career_tags')
            tag_count = cur.fetchone()[0]
            print(f'   ✅ Có {tag_count} career tags')
            
            cur.execute('''
                SELECT ct.name, COUNT(ctm.career_id) as career_count
                FROM core.career_tags ct
                LEFT JOIN core.career_tag_map ctm ON ct.id = ctm.tag_id
                GROUP BY ct.id, ct.name
                ORDER BY career_count DESC
                LIMIT 10
            ''')
            top_tags = cur.fetchall()
            print('   📊 Top 10 tags phổ biến:')
            for tag, count in top_tags:
                print(f'      - {tag}: {count} nghề')
        except Exception as e:
            print(f'   ❌ Lỗi kiểm tra career_tags: {e}')
        
        # 3. Tìm thông tin về career levels
        print('\n3. 📈 CAREER LEVELS/SENIORITY:')
        
        # 3a. Job Zones từ career_prep
        try:
            cur.execute('''
                SELECT 
                    job_zone,
                    COUNT(*) as count,
                    MIN(education_summary_vi) as education_desc
                FROM core.career_prep 
                GROUP BY job_zone 
                ORDER BY job_zone
            ''')
            job_zones = cur.fetchall()
            print(f'   ✅ Có {len(job_zones)} Job Zones:')
            total_prep = sum(count for _, count, _ in job_zones)
            for zone, count, desc in job_zones:
                pct = (count / total_prep * 100) if total_prep > 0 else 0
                print(f'      - Zone {zone}: {count} nghề ({pct:.1f}%) - {desc[:50] if desc else "N/A"}...')
        except Exception as e:
            print(f'   ❌ Lỗi kiểm tra job_zones: {e}')
        
        # 3b. Kiểm tra education levels
        try:
            cur.execute('''
                SELECT 
                    category,
                    category_description_vi,
                    COUNT(DISTINCT onet_code) as career_count,
                    AVG(data_value) as avg_percentage
                FROM core.career_education_pct 
                WHERE category_description_vi IS NOT NULL
                GROUP BY category, category_description_vi
                ORDER BY category
            ''')
            edu_levels = cur.fetchall()
            print(f'   ✅ Có {len(edu_levels)} Education Categories:')
            for cat, desc, count, avg_pct in edu_levels:
                print(f'      - Cat {cat}: {desc} - {count} nghề (avg: {avg_pct:.1f}%)')
        except Exception as e:
            print(f'   ❌ Lỗi kiểm tra education levels: {e}')
        
        # 4. Kiểm tra có bảng nào khác về seniority/levels không
        print('\n4. 🔍 TÌM KIẾM CÁC BẢNG KHÁC VỀ LEVELS:')
        
        try:
            cur.execute('''
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'core' 
                AND (table_name LIKE '%level%' 
                OR table_name LIKE '%senior%'
                OR table_name LIKE '%experience%')
            ''')
            level_tables = cur.fetchall()
            if level_tables:
                print('   ✅ Tìm thấy các bảng liên quan:')
                for table in level_tables:
                    print(f'      - {table[0]}')
            else:
                print('   ❌ Không tìm thấy bảng nào về levels/seniority')
        except Exception as e:
            print(f'   ❌ Lỗi tìm kiếm bảng levels: {e}')
        
        # 5. Kiểm tra career_overview có thông tin experience không
        try:
            cur.execute('''
                SELECT 
                    COUNT(*) as total,
                    COUNT(experience_text_vi) as with_experience,
                    COUNT(degree_text_vi) as with_degree
                FROM core.career_overview
            ''')
            overview_stats = cur.fetchone()
            print(f'   ✅ career_overview: {overview_stats[0]} records')
            print(f'      - Có experience_text_vi: {overview_stats[1]}')
            print(f'      - Có degree_text_vi: {overview_stats[2]}')
            
            # Sample experience texts
            cur.execute('''
                SELECT experience_text_vi 
                FROM core.career_overview 
                WHERE experience_text_vi IS NOT NULL 
                LIMIT 3
            ''')
            exp_samples = cur.fetchall()
            print('   📝 Mẫu experience_text_vi:')
            for i, (exp,) in enumerate(exp_samples, 1):
                print(f'      {i}. {exp[:100]}...')
        except Exception as e:
            print(f'   ❌ Lỗi kiểm tra career_overview: {e}')
        
        # 6. Phân tích chi tiết ONET Major Groups
        print('\n6. 📊 CHI TIẾT ONET MAJOR GROUPS:')
        try:
            # Mapping ONET major groups
            onet_groups = {
                '11': 'Management Occupations',
                '13': 'Business and Financial Operations',
                '15': 'Computer and Mathematical',
                '17': 'Architecture and Engineering',
                '19': 'Life, Physical, and Social Science',
                '21': 'Community and Social Service',
                '23': 'Legal Occupations',
                '25': 'Educational Instruction and Library',
                '27': 'Arts, Design, Entertainment, Sports, and Media',
                '29': 'Healthcare Practitioners and Technical',
                '31': 'Healthcare Support',
                '33': 'Protective Service',
                '35': 'Food Preparation and Serving Related',
                '37': 'Building and Grounds Cleaning and Maintenance',
                '39': 'Personal Care and Service',
                '41': 'Sales and Related',
                '43': 'Office and Administrative Support',
                '45': 'Farming, Fishing, and Forestry',
                '47': 'Construction and Extraction',
                '49': 'Installation, Maintenance, and Repair',
                '51': 'Production',
                '53': 'Transportation and Material Moving'
            }
            
            cur.execute('''
                SELECT 
                    SUBSTRING(onet_code FROM 1 FOR 2) as major_group,
                    COUNT(*) as count
                FROM core.careers 
                WHERE onet_code IS NOT NULL
                GROUP BY SUBSTRING(onet_code FROM 1 FOR 2)
                ORDER BY count DESC
            ''')
            major_groups = cur.fetchall()
            
            print('   📋 Chi tiết từng nhóm:')
            total = sum(count for _, count in major_groups)
            for group, count in major_groups:
                group_name = onet_groups.get(group, 'Unknown')
                pct = (count / total * 100) if total > 0 else 0
                print(f'      - {group}: {group_name} - {count} nghề ({pct:.1f}%)')
                
        except Exception as e:
            print(f'   ❌ Lỗi phân tích chi tiết ONET groups: {e}')
        
        print('\n' + '=' * 80)
        print('✅ HOÀN THÀNH PHÂN TÍCH DATABASE')
        
    except Exception as e:
        print(f'❌ Lỗi kết nối database: {e}')
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    main()