#!/usr/bin/env python3
"""
Detailed analysis of career database structure
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def detailed_analysis():
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:123456@localhost:5432/career_db')
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print('🔗 Connected to database')
        
        # 1. Analyze ONET code structure for major groups
        print('\n🏢 ANALYZING ONET CODE STRUCTURE (MAJOR OCCUPATIONAL GROUPS):')
        print('=' * 70)
        
        major_groups = await conn.fetch('''
            SELECT 
                SUBSTRING(onet_code, 1, 2) as major_group,
                COUNT(*) as career_count,
                MIN(education_summary_vi) as sample_education
            FROM core.career_prep
            GROUP BY SUBSTRING(onet_code, 1, 2)
            ORDER BY major_group
        ''')
        
        # ONET Major Groups mapping
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
        
        print('📊 Major Occupational Groups (ONET Classification):')
        for group in major_groups:
            group_code = group['major_group']
            group_name = onet_groups.get(group_code, 'Unknown Group')
            print(f'   {group_code}: {group_name}')
            print(f'      📈 {group["career_count"]} careers')
            if group['sample_education']:
                print(f'      🎓 Education: {group["sample_education"][:80]}...')
            print()
        
        # 2. Detailed Job Zone Analysis
        print('\n📊 DETAILED JOB ZONE ANALYSIS (CAREER LEVELS):')
        print('=' * 70)
        
        job_zone_details = await conn.fetch('''
            SELECT 
                cp.job_zone,
                COUNT(*) as career_count,
                cp.education_summary_vi,
                cp.experience_summary_vi
            FROM core.career_prep cp
            GROUP BY cp.job_zone, cp.education_summary_vi, cp.experience_summary_vi
            ORDER BY cp.job_zone, career_count DESC
        ''')
        
        current_zone = None
        for detail in job_zone_details:
            if detail['job_zone'] != current_zone:
                current_zone = detail['job_zone']
                print(f'\n🎯 JOB ZONE {current_zone}:')
                print('-' * 50)
            
            print(f'   📊 {detail["career_count"]} careers')
            print(f'   🎓 Education: {detail["education_summary_vi"]}')
            print(f'   💼 Experience: {detail["experience_summary_vi"]}')
            print()
        
        # 3. Technology-based career grouping
        print('\n💻 TECHNOLOGY-BASED CAREER GROUPING:')
        print('=' * 70)
        
        tech_career_groups = await conn.fetch('''
            SELECT 
                ct.category_vi,
                COUNT(DISTINCT ct.onet_code) as career_count,
                COUNT(*) as tech_count
            FROM core.career_technology ct
            WHERE ct.category_vi IS NOT NULL
            GROUP BY ct.category_vi
            HAVING COUNT(DISTINCT ct.onet_code) >= 10
            ORDER BY career_count DESC
        ''')
        
        print('🔧 Technology Categories with 10+ Careers:')
        for tech_group in tech_career_groups:
            print(f'   📂 {tech_group["category_vi"]}:')
            print(f'      👥 {tech_group["career_count"]} careers')
            print(f'      🛠️  {tech_group["tech_count"]} technologies')
            print()
        
        # 4. Work Activity based grouping
        print('\n🔧 WORK ACTIVITY BASED GROUPING:')
        print('=' * 70)
        
        activity_groups = await conn.fetch('''
            SELECT 
                wam.activity_category_vi,
                COUNT(DISTINCT was.onet_code) as career_count,
                COUNT(DISTINCT wam.element_id) as activity_count
            FROM core.career_work_activities_master wam
            JOIN core.career_work_activity_summary was ON wam.element_id = was.element_id
            WHERE wam.activity_category_vi IS NOT NULL
            GROUP BY wam.activity_category_vi
            ORDER BY career_count DESC
        ''')
        
        print('📋 Work Activity Categories:')
        for activity in activity_groups:
            print(f'   🎯 {activity["activity_category_vi"]}:')
            print(f'      👥 {activity["career_count"]} careers')
            print(f'      📊 {activity["activity_count"]} activities')
            print()
        
        # 5. Career Level Analysis by Experience Text
        print('\n📈 CAREER SENIORITY LEVELS ANALYSIS:')
        print('=' * 70)
        
        seniority_analysis = await conn.fetch('''
            SELECT 
                CASE 
                    WHEN experience_text_vi ILIKE '%fresher%' OR experience_text_vi ILIKE '%mới%' OR experience_text_vi ILIKE '%few months%' THEN 'Entry Level'
                    WHEN experience_text_vi ILIKE '%junior%' OR experience_text_vi ILIKE '%1-2 year%' OR experience_text_vi ILIKE '%1 year%' THEN 'Junior Level'
                    WHEN experience_text_vi ILIKE '%middle%' OR experience_text_vi ILIKE '%2-4 year%' OR experience_text_vi ILIKE '%considerable%' THEN 'Mid Level'
                    WHEN experience_text_vi ILIKE '%senior%' OR experience_text_vi ILIKE '%5 năm%' OR experience_text_vi ILIKE '%extensive%' THEN 'Senior Level'
                    WHEN experience_text_vi ILIKE '%lead%' OR experience_text_vi ILIKE '%lãnh đạo%' OR experience_text_vi ILIKE '%manager%' THEN 'Leadership Level'
                    ELSE 'Other'
                END as seniority_level,
                COUNT(*) as career_count
            FROM core.career_overview
            WHERE experience_text_vi IS NOT NULL
            GROUP BY 
                CASE 
                    WHEN experience_text_vi ILIKE '%fresher%' OR experience_text_vi ILIKE '%mới%' OR experience_text_vi ILIKE '%few months%' THEN 'Entry Level'
                    WHEN experience_text_vi ILIKE '%junior%' OR experience_text_vi ILIKE '%1-2 year%' OR experience_text_vi ILIKE '%1 year%' THEN 'Junior Level'
                    WHEN experience_text_vi ILIKE '%middle%' OR experience_text_vi ILIKE '%2-4 year%' OR experience_text_vi ILIKE '%considerable%' THEN 'Mid Level'
                    WHEN experience_text_vi ILIKE '%senior%' OR experience_text_vi ILIKE '%5 năm%' OR experience_text_vi ILIKE '%extensive%' THEN 'Senior Level'
                    WHEN experience_text_vi ILIKE '%lead%' OR experience_text_vi ILIKE '%lãnh đạo%' OR experience_text_vi ILIKE '%manager%' THEN 'Leadership Level'
                    ELSE 'Other'
                END
            ORDER BY career_count DESC
        ''')
        
        print('🎯 Seniority Level Distribution:')
        for level in seniority_analysis:
            print(f'   📊 {level["seniority_level"]}: {level["career_count"]} careers')
            print()
        
        await conn.close()
        print('\n✅ Detailed analysis complete!')
        
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    asyncio.run(detailed_analysis())