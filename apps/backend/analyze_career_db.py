#!/usr/bin/env python3
"""
Analyze career database structure for grouping and levels
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def analyze_career_tables():
    # Database connection
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:123456@localhost:5432/career_db')
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print('🔗 Connected to database')
        
        # 1. Check for career grouping/industry classification
        print('\n📊 ANALYZING CAREER GROUPING/INDUSTRY CLASSIFICATION:')
        print('=' * 60)
        
        # Check career_tags table
        tags_count = await conn.fetchval('SELECT COUNT(*) FROM core.career_tags')
        print(f'📌 Total career tags: {tags_count}')
        
        if tags_count > 0:
            sample_tags = await conn.fetch('SELECT name FROM core.career_tags LIMIT 10')
            print('📋 Sample tags:')
            for tag in sample_tags:
                print(f'   - {tag["name"]}')
        
        # Check career_tag_map for grouping
        tag_map_count = await conn.fetchval('SELECT COUNT(*) FROM core.career_tag_map')
        print(f'🔗 Career-tag mappings: {tag_map_count}')
        
        # Check if we can find industry groupings
        industry_analysis = await conn.fetch('''
            SELECT 
                ct.name as tag_name,
                COUNT(ctm.career_id) as career_count
            FROM core.career_tags ct
            LEFT JOIN core.career_tag_map ctm ON ct.id = ctm.tag_id
            GROUP BY ct.id, ct.name
            ORDER BY career_count DESC
            LIMIT 20
        ''')
        
        print('🏭 Top industry/tag groupings:')
        for row in industry_analysis:
            print(f'   - {row["tag_name"]}: {row["career_count"]} careers')
        
        # 2. Check for career levels/seniority
        print('\n📈 ANALYZING CAREER LEVELS/SENIORITY:')
        print('=' * 60)
        
        # Check career_prep table for job zones (levels)
        job_zones = await conn.fetch('''
            SELECT 
                job_zone,
                COUNT(*) as career_count,
                MIN(education_summary_vi) as sample_education,
                MIN(experience_summary_vi) as sample_experience
            FROM core.career_prep
            GROUP BY job_zone
            ORDER BY job_zone
        ''')
        
        print('🎯 Job Zones (Career Levels):')
        for zone in job_zones:
            print(f'   Zone {zone["job_zone"]}: {zone["career_count"]} careers')
            if zone['sample_education']:
                print(f'      Education: {zone["sample_education"][:100]}...')
            if zone['sample_experience']:
                print(f'      Experience: {zone["sample_experience"][:100]}...')
            print()
        
        # Check career_overview for experience levels
        experience_levels = await conn.fetch('''
            SELECT 
                experience_text_vi,
                COUNT(*) as count
            FROM core.career_overview
            WHERE experience_text_vi IS NOT NULL
            GROUP BY experience_text_vi
            ORDER BY count DESC
            LIMIT 15
        ''')
        
        print('💼 Experience Level Distribution:')
        for exp in experience_levels:
            print(f'   - {exp["experience_text_vi"]}: {exp["count"]} careers')
        
        # 3. Check work activities for skill categorization
        print('\n🔧 ANALYZING WORK ACTIVITIES CATEGORIES:')
        print('=' * 60)
        
        activity_categories = await conn.fetch('''
            SELECT 
                activity_category_vi,
                COUNT(*) as activity_count
            FROM core.career_work_activities_master
            WHERE activity_category_vi IS NOT NULL
            GROUP BY activity_category_vi
            ORDER BY activity_count DESC
        ''')
        
        print('📋 Work Activity Categories:')
        for cat in activity_categories:
            print(f'   - {cat["activity_category_vi"]}: {cat["activity_count"]} activities')
        
        # 4. Check technology categories
        print('\n💻 ANALYZING TECHNOLOGY CATEGORIES:')
        print('=' * 60)
        
        tech_categories = await conn.fetch('''
            SELECT 
                category_vi,
                COUNT(*) as tech_count,
                COUNT(DISTINCT onet_code) as career_count
            FROM core.career_technology
            WHERE category_vi IS NOT NULL
            GROUP BY category_vi
            ORDER BY tech_count DESC
            LIMIT 15
        ''')
        
        print('🔧 Technology Categories:')
        for tech in tech_categories:
            print(f'   - {tech["category_vi"]}: {tech["tech_count"]} technologies, {tech["career_count"]} careers')
        
        # 5. Summary statistics
        print('\n📊 SUMMARY STATISTICS:')
        print('=' * 60)
        
        total_careers = await conn.fetchval('SELECT COUNT(DISTINCT onet_code) FROM core.career_prep')
        total_tags = await conn.fetchval('SELECT COUNT(*) FROM core.career_tags')
        total_job_zones = await conn.fetchval('SELECT COUNT(DISTINCT job_zone) FROM core.career_prep')
        
        print(f'🎯 Total unique careers: {total_careers}')
        print(f'🏷️  Total career tags: {total_tags}')
        print(f'📊 Total job zones (levels): {total_job_zones}')
        
        await conn.close()
        print('\n✅ Analysis complete!')
        
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    asyncio.run(analyze_career_tables())