#!/usr/bin/env python3
"""
Phân tích chi tiết về career levels và seniority trong database
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
        
        print('🔍 PHÂN TÍCH CHI TIẾT CAREER LEVELS VÀ SENIORITY')
        print('=' * 80)
        
        # 1. Phân tích experience_text_vi trong career_overview
        print('\n1. 📈 PHÂN TÍCH EXPERIENCE REQUIREMENTS:')
        try:
            cur.execute('''
                SELECT 
                    experience_text_vi,
                    COUNT(*) as count
                FROM core.career_overview 
                WHERE experience_text_vi IS NOT NULL
                GROUP BY experience_text_vi
                ORDER BY count DESC
            ''')
            exp_patterns = cur.fetchall()
            print(f'   ✅ Có {len(exp_patterns)} pattern experience khác nhau:')
            for exp, count in exp_patterns[:10]:
                print(f'      - {count} nghề: {exp[:80]}...')
                
        except Exception as e:
            print(f'   ❌ Lỗi phân tích experience: {e}')
        
        # 2. Phân tích degree_text_vi
        print('\n2. 🎓 PHÂN TÍCH DEGREE REQUIREMENTS:')
        try:
            cur.execute('''
                SELECT 
                    degree_text_vi,
                    COUNT(*) as count
                FROM core.career_overview 
                WHERE degree_text_vi IS NOT NULL
                GROUP BY degree_text_vi
                ORDER BY count DESC
            ''')
            degree_patterns = cur.fetchall()
            print(f'   ✅ Có {len(degree_patterns)} pattern degree khác nhau:')
            for degree, count in degree_patterns[:10]:
                print(f'      - {count} nghề: {degree[:80]}...')
                
        except Exception as e:
            print(f'   ❌ Lỗi phân tích degree: {e}')
        
        # 3. Phân tích Job Zones chi tiết
        print('\n3. 🎯 PHÂN TÍCH JOB ZONES CHI TIẾT:')
        try:
            cur.execute('''
                SELECT 
                    cp.job_zone,
                    cp.education_summary_vi,
                    cp.experience_summary_vi,
                    COUNT(*) as count
                FROM core.career_prep cp
                GROUP BY cp.job_zone, cp.education_summary_vi, cp.experience_summary_vi
                ORDER BY cp.job_zone
            ''')
            job_zone_details = cur.fetchall()
            
            current_zone = None
            for zone, edu, exp, count in job_zone_details:
                if zone != current_zone:
                    print(f'\n   📊 JOB ZONE {zone}:')
                    current_zone = zone
                print(f'      - {count} nghề')
                print(f'        📚 Học vấn: {edu[:100] if edu else "N/A"}...')
                print(f'        💼 Kinh nghiệm: {exp[:100] if exp else "N/A"}...')
                
        except Exception as e:
            print(f'   ❌ Lỗi phân tích job zones: {e}')
        
        # 4. Tìm kiếm keywords về seniority trong các bảng
        print('\n4. 🔍 TÌM KIẾM KEYWORDS VỀ SENIORITY:')
        
        # 4a. Trong career_overview
        try:
            seniority_keywords = ['fresher', 'junior', 'senior', 'lead', 'manager', 'director', 'entry', 'experienced', 'năm kinh nghiệm']
            
            for keyword in seniority_keywords:
                cur.execute('''
                    SELECT COUNT(*) 
                    FROM core.career_overview 
                    WHERE LOWER(experience_text_vi) LIKE %s
                ''', (f'%{keyword.lower()}%',))
                count = cur.fetchone()[0]
                if count > 0:
                    print(f'   ✅ "{keyword}": {count} nghề có trong experience_text_vi')
                    
        except Exception as e:
            print(f'   ❌ Lỗi tìm kiếm keywords: {e}')
        
        # 4b. Trong career_tasks
        try:
            print('\n   📋 Tìm trong career_tasks:')
            for keyword in ['senior', 'junior', 'lead', 'manager']:
                cur.execute('''
                    SELECT COUNT(DISTINCT onet_code) 
                    FROM core.career_tasks 
                    WHERE LOWER(task_vi) LIKE %s OR LOWER(task_en) LIKE %s
                ''', (f'%{keyword.lower()}%', f'%{keyword.lower()}%'))
                count = cur.fetchone()[0]
                if count > 0:
                    print(f'      - "{keyword}": {count} nghề có trong tasks')
                    
        except Exception as e:
            print(f'   ❌ Lỗi tìm kiếm trong tasks: {e}')
        
        # 5. Phân tích technology categories để tìm levels
        print('\n5. 💻 PHÂN TÍCH TECHNOLOGY CATEGORIES:')
        try:
            cur.execute('''
                SELECT 
                    category_vi,
                    COUNT(DISTINCT onet_code) as career_count,
                    COUNT(*) as tech_count
                FROM core.career_technology 
                WHERE category_vi IS NOT NULL
                GROUP BY category_vi
                ORDER BY career_count DESC
                LIMIT 15
            ''')
            tech_cats = cur.fetchall()
            print('   📊 Top technology categories:')
            for cat, career_count, tech_count in tech_cats:
                print(f'      - {cat}: {career_count} nghề, {tech_count} công nghệ')
                
        except Exception as e:
            print(f'   ❌ Lỗi phân tích technology: {e}')
        
        # 6. Tìm pattern trong title để xác định levels
        print('\n6. 🏷️ PHÂN TÍCH TITLE PATTERNS:')
        try:
            level_patterns = ['senior', 'junior', 'lead', 'manager', 'director', 'chief', 'head', 'supervisor', 'coordinator', 'specialist', 'analyst', 'assistant']
            
            for pattern in level_patterns:
                cur.execute('''
                    SELECT COUNT(*) 
                    FROM core.careers 
                    WHERE LOWER(title_en) LIKE %s OR LOWER(title_vi) LIKE %s
                ''', (f'%{pattern}%', f'%{pattern}%'))
                count = cur.fetchone()[0]
                if count > 0:
                    print(f'   ✅ "{pattern}": {count} nghề có trong title')
                    
                    # Show examples
                    cur.execute('''
                        SELECT title_en, title_vi 
                        FROM core.careers 
                        WHERE LOWER(title_en) LIKE %s OR LOWER(title_vi) LIKE %s
                        LIMIT 3
                    ''', (f'%{pattern}%', f'%{pattern}%'))
                    examples = cur.fetchall()
                    for title_en, title_vi in examples:
                        print(f'      - {title_en} / {title_vi}')
                    print()
                    
        except Exception as e:
            print(f'   ❌ Lỗi phân tích title patterns: {e}')
        
        # 7. Phân tích alternative titles
        print('\n7. 🔄 PHÂN TÍCH ALTERNATIVE TITLES:')
        try:
            cur.execute('''
                SELECT COUNT(*) 
                FROM core.careers 
                WHERE alternative_titles_en IS NOT NULL 
                AND array_length(alternative_titles_en, 1) > 0
            ''')
            alt_en_count = cur.fetchone()[0]
            
            cur.execute('''
                SELECT COUNT(*) 
                FROM core.careers 
                WHERE alternative_titles_vi IS NOT NULL 
                AND array_length(alternative_titles_vi, 1) > 0
            ''')
            alt_vi_count = cur.fetchone()[0]
            
            print(f'   ✅ Có alternative_titles_en: {alt_en_count} nghề')
            print(f'   ✅ Có alternative_titles_vi: {alt_vi_count} nghề')
            
            # Sample alternative titles with level indicators
            cur.execute('''
                SELECT title_en, alternative_titles_en
                FROM core.careers 
                WHERE alternative_titles_en IS NOT NULL 
                AND (
                    array_to_string(alternative_titles_en, ' ') ILIKE '%senior%' OR
                    array_to_string(alternative_titles_en, ' ') ILIKE '%junior%' OR
                    array_to_string(alternative_titles_en, ' ') ILIKE '%lead%' OR
                    array_to_string(alternative_titles_en, ' ') ILIKE '%manager%'
                )
                LIMIT 5
            ''')
            level_alts = cur.fetchall()
            
            if level_alts:
                print('   📝 Mẫu alternative titles có level indicators:')
                for title, alts in level_alts:
                    print(f'      - {title}:')
                    for alt in alts:
                        print(f'        • {alt}')
                    print()
                    
        except Exception as e:
            print(f'   ❌ Lỗi phân tích alternative titles: {e}')
        
        print('\n' + '=' * 80)
        print('✅ HOÀN THÀNH PHÂN TÍCH CHI TIẾT CAREER LEVELS')
        
    except Exception as e:
        print(f'❌ Lỗi kết nối database: {e}')
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    main()