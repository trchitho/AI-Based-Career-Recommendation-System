# -*- coding: utf-8 -*-
"""
Map 959 Careers to Enhanced Levels
Tự động phát hiện level phù hợp cho mỗi career dựa trên:
1. Title keywords (highest confidence)
2. Job zone (medium confidence)
3. Experience text (low confidence)
4. Default to middle level (lowest confidence)
"""
import os
import sys
import re
from pathlib import Path
from typing import List, Tuple, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def extract_years_from_text(text: str) -> int:
    """Extract years of experience from text"""
    if not text:
        return 0
    
    # Patterns: "5 years", "5+ years", "5-7 years", "năm kinh nghiệm"
    patterns = [
        r'(\d+)\+?\s*(?:years?|năm)',
        r'(\d+)\s*-\s*\d+\s*(?:years?|năm)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return int(match.group(1))
    
    return 0


def detect_level_for_career(career: dict, group_levels: List[dict]) -> Tuple[Optional[dict], float, str]:
    """
    Detect appropriate level for a career
    Returns: (level, confidence_score, detection_method)
    """
    title = (career.get('title_en') or '').lower()
    
    # 1. Check title keywords (highest confidence 0.9)
    for level in group_levels:
        keywords = level.get('seniority_keywords') or []
        for keyword in keywords:
            if keyword.lower() in title:
                return level, 0.9, 'title_keyword'
    
    # 2. Check job_zone (medium confidence 0.7)
    job_zone = career.get('job_zone')
    if job_zone:
        for level in group_levels:
            job_zone_mapping = level.get('job_zone_mapping') or ''
            if str(job_zone) in job_zone_mapping.split(','):
                return level, 0.7, 'job_zone'
    
    # 3. Check experience text (low confidence 0.6)
    exp_text = career.get('experience_text_vi') or career.get('experience_text_en') or ''
    if exp_text:
        years = extract_years_from_text(exp_text)
        if years > 0:
            for level in group_levels:
                min_exp = level.get('min_exp_years', 0)
                max_exp = level.get('max_exp_years') or 999
                if min_exp <= years <= max_exp:
                    return level, 0.6, 'experience_text'
    
    # 4. Default to middle level (lowest confidence 0.5)
    if group_levels:
        mid_index = len(group_levels) // 2
        return group_levels[mid_index], 0.5, 'default'
    
    return None, 0.0, 'none'


def main():
    """Main mapping function"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("MAPPING 959 CAREERS TO ENHANCED LEVELS")
        print("=" * 60)
        
        # 1. Get all career groups with their levels
        print("\n[1/4] Loading career groups and levels...")
        query = text("""
            SELECT 
                cg.id as group_id,
                cg.slug as group_slug,
                cg.name as group_name,
                cgl.id as level_id,
                cgl.level_order,
                cgl.level_name_vi,
                cgl.level_name_en,
                cgl.level_slug,
                cgl.min_exp_years,
                cgl.max_exp_years,
                cgl.job_zone_mapping,
                cgl.seniority_keywords
            FROM core.career_groups cg
            LEFT JOIN core.career_group_levels cgl ON cg.id = cgl.group_id
            ORDER BY cg.id, cgl.level_order
        """)
        
        result = db.execute(query).fetchall()
        
        # Organize levels by group
        groups_with_levels = {}
        for row in result:
            group_id = row.group_id
            if group_id not in groups_with_levels:
                groups_with_levels[group_id] = {
                    'slug': row.group_slug,
                    'name': row.group_name,
                    'levels': []
                }
            
            if row.level_id:
                groups_with_levels[group_id]['levels'].append({
                    'id': row.level_id,
                    'order': row.level_order,
                    'name_vi': row.level_name_vi,
                    'name_en': row.level_name_en,
                    'slug': row.level_slug,
                    'min_exp_years': row.min_exp_years,
                    'max_exp_years': row.max_exp_years,
                    'job_zone_mapping': row.job_zone_mapping,
                    'seniority_keywords': row.seniority_keywords or []
                })
        
        print(f"   Loaded {len(groups_with_levels)} groups with levels")
        
        # 2. Get all careers with their group mapping
        print("\n[2/4] Loading careers...")
        query = text("""
            SELECT 
                c.id,
                c.title_en,
                c.title_vi,
                c.slug,
                cgm.group_id,
                cp.job_zone,
                co.experience_text_vi,
                co.experience_text as experience_text_en
            FROM core.careers c
            JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            LEFT JOIN core.career_prep cp ON c.onet_code = cp.onet_code
            LEFT JOIN core.career_overview co ON c.id = co.career_id
            ORDER BY c.id
        """)
        
        careers = db.execute(query).fetchall()
        print(f"   Loaded {len(careers)} careers")
        
        # 3. Map each career to appropriate level
        print("\n[3/4] Mapping careers to levels...")
        mappings = []
        stats = {
            'title_keyword': 0,
            'job_zone': 0,
            'experience_text': 0,
            'default': 0,
            'none': 0
        }
        
        for career in careers:
            career_dict = {
                'id': career.id,
                'title_en': career.title_en,
                'title_vi': career.title_vi,
                'slug': career.slug,
                'job_zone': career.job_zone,
                'experience_text_vi': career.experience_text_vi,
                'experience_text_en': career.experience_text_en
            }
            
            group_id = career.group_id
            if group_id not in groups_with_levels:
                print(f"   WARNING: Career {career.id} has invalid group_id {group_id}")
                continue
            
            group_levels = groups_with_levels[group_id]['levels']
            if not group_levels:
                print(f"   WARNING: Group {group_id} has no levels defined")
                continue
            
            level, confidence, method = detect_level_for_career(career_dict, group_levels)
            
            if level:
                mappings.append({
                    'career_id': career.id,
                    'group_level_id': level['id'],
                    'confidence_score': confidence,
                    'detection_method': method
                })
                stats[method] += 1
        
        print(f"   Created {len(mappings)} mappings")
        print(f"   Detection methods:")
        for method, count in stats.items():
            if count > 0:
                percentage = (count / len(mappings) * 100) if mappings else 0
                print(f"     - {method}: {count} ({percentage:.1f}%)")
        
        # 4. Insert mappings into database
        print("\n[4/4] Inserting mappings into database...")
        
        # Clear existing mappings
        db.execute(text("DELETE FROM core.career_level_mapping"))
        db.commit()
        
        # Insert new mappings in batches
        batch_size = 100
        for i in range(0, len(mappings), batch_size):
            batch = mappings[i:i+batch_size]
            
            for mapping in batch:
                query = text("""
                    INSERT INTO core.career_level_mapping 
                    (career_id, group_level_id, is_primary, confidence_score, detection_method)
                    VALUES (:career_id, :group_level_id, TRUE, :confidence_score, :detection_method)
                    ON CONFLICT (career_id, group_level_id) DO UPDATE
                    SET confidence_score = EXCLUDED.confidence_score,
                        detection_method = EXCLUDED.detection_method,
                        updated_at = NOW()
                """)
                
                db.execute(query, mapping)
            
            db.commit()
            print(f"   Inserted batch {i//batch_size + 1}/{(len(mappings)-1)//batch_size + 1}")
        
        # 5. Verification
        print("\n" + "=" * 60)
        print("VERIFICATION")
        print("=" * 60)
        
        query = text("""
            SELECT 
                COUNT(*) as total_mappings,
                COUNT(DISTINCT career_id) as unique_careers,
                COUNT(DISTINCT group_level_id) as unique_levels,
                AVG(confidence_score) as avg_confidence
            FROM core.career_level_mapping
        """)
        
        result = db.execute(query).fetchone()
        print(f"\nTotal mappings: {result.total_mappings}")
        print(f"Unique careers: {result.unique_careers}")
        print(f"Unique levels used: {result.unique_levels}")
        print(f"Average confidence: {result.avg_confidence:.2f}")
        
        # Check coverage
        query = text("""
            SELECT 
                (SELECT COUNT(*) FROM core.careers) as total_careers,
                (SELECT COUNT(DISTINCT career_id) FROM core.career_level_mapping) as mapped_careers
        """)
        
        result = db.execute(query).fetchone()
        coverage = (result.mapped_careers / result.total_careers * 100) if result.total_careers > 0 else 0
        print(f"\nCoverage: {result.mapped_careers}/{result.total_careers} ({coverage:.1f}%)")
        
        # Sample mappings
        print("\nSample mappings:")
        query = text("""
            SELECT 
                c.title_en,
                cg.name as group_name,
                cgl.level_name_en,
                clm.confidence_score,
                clm.detection_method
            FROM core.career_level_mapping clm
            JOIN core.careers c ON clm.career_id = c.id
            JOIN core.career_group_levels cgl ON clm.group_level_id = cgl.id
            JOIN core.career_groups cg ON cgl.group_id = cg.id
            ORDER BY clm.confidence_score DESC
            LIMIT 10
        """)
        
        samples = db.execute(query).fetchall()
        for sample in samples:
            print(f"  - {sample.title_en[:40]:40} | {sample.group_name[:20]:20} | {sample.level_name_en[:20]:20} | {sample.confidence_score:.2f} | {sample.detection_method}")
        
        print("\n" + "=" * 60)
        print("✅ MAPPING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
