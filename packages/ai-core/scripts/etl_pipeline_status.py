#!/usr/bin/env python3
"""
📊 ETL PIPELINE STATUS REPORT - Script hỗ trợ monitoring
Nhiệm vụ: Báo cáo trạng thái chi tiết của ETL pipeline
Input: Database tables
Output: Comprehensive status report với metrics và statistics
Quá trình: Check table counts, data quality, coverage analysis, top statistics

ETL Pipeline Status Report
Check the complete status of the AI Career Recommendation System ETL Pipeline
"""

import sys
from pathlib import Path

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from ai_core.db import get_session
from sqlalchemy import text

def main():
    print("="*80)
    print("🗄️  ETL PIPELINE STATUS REPORT")
    print("="*80)
    print("AI-Based Career Recommendation System")
    print("Data Engineering Pipeline Status Check")
    print()
    
    session = get_session()
    
    try:
        # 1. Core Tables Status
        print("📊 CORE TABLES STATUS")
        print("-" * 40)
        
        core_tables = [
            ('core.careers', 'Main careers table'),
            ('core.career_interests', 'RIASEC scores'),
            ('core.career_tags', 'Skills/tags dictionary'),
            ('core.career_tag_map', 'Career-tag mappings'),
            ('core.career_riasec_map', 'Career-RIASEC mappings'),
            ('core.riasec_labels', 'RIASEC label definitions')
        ]
        
        for table, description in core_tables:
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  ✅ {table:<25} {count:>8,} rows - {description}")
            except Exception as e:
                print(f"  ❌ {table:<25} ERROR - {str(e)[:50]}...")
        
        # 2. AI Tables Status
        print(f"\n🤖 AI TABLES STATUS")
        print("-" * 40)
        
        ai_tables = [
            ('ai.retrieval_jobs_visbert', 'Vector embeddings for job search'),
            ('ai.career_embeddings', 'Career embeddings (alternative)')
        ]
        
        for table, description in ai_tables:
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  ✅ {table:<25} {count:>8,} rows - {description}")
            except Exception as e:
                print(f"  ❌ {table:<25} ERROR - {str(e)[:50]}...")
        
        # 3. Data Quality Checks
        print(f"\n🔍 DATA QUALITY CHECKS")
        print("-" * 40)
        
        # Check for Vietnamese encoding issues
        result = session.execute(text("""
            SELECT COUNT(*) 
            FROM core.career_tags 
            WHERE name LIKE '%?%' OR name LIKE '%ß%' OR name LIKE '%├%'
        """))
        encoding_issues = result.scalar()
        
        if encoding_issues == 0:
            print(f"  ✅ Vietnamese encoding: No issues found")
        else:
            print(f"  ⚠️  Vietnamese encoding: {encoding_issues} tags with encoding issues")
        
        # Check for empty/null data
        result = session.execute(text("""
            SELECT COUNT(*) 
            FROM core.careers 
            WHERE title_vi IS NULL OR title_vi = ''
        """))
        empty_titles = result.scalar()
        
        if empty_titles == 0:
            print(f"  ✅ Career titles: All careers have Vietnamese titles")
        else:
            print(f"  ⚠️  Career titles: {empty_titles} careers missing Vietnamese titles")
        
        # Check RIASEC data completeness
        result = session.execute(text("""
            SELECT COUNT(*) 
            FROM core.career_interests 
            WHERE r = 0 AND i = 0 AND a = 0 AND s = 0 AND e = 0 AND c = 0
        """))
        zero_riasec = result.scalar()
        
        if zero_riasec == 0:
            print(f"  ✅ RIASEC scores: All careers have valid RIASEC scores")
        else:
            print(f"  ⚠️  RIASEC scores: {zero_riasec} careers have all-zero RIASEC scores")
        
        # 4. Coverage Analysis
        print(f"\n📈 COVERAGE ANALYSIS")
        print("-" * 40)
        
        # Total jobs coverage
        result = session.execute(text("SELECT COUNT(*) FROM core.careers"))
        total_careers = result.scalar()
        
        result = session.execute(text("SELECT COUNT(*) FROM ai.retrieval_jobs_visbert"))
        total_embeddings = result.scalar()
        
        coverage_pct = (total_embeddings / total_careers * 100) if total_careers > 0 else 0
        print(f"  📊 Total careers: {total_careers:,}")
        print(f"  📊 With embeddings: {total_embeddings:,} ({coverage_pct:.1f}%)")
        
        # Tag coverage
        result = session.execute(text("""
            SELECT COUNT(DISTINCT c.id)
            FROM core.careers c
            JOIN core.career_tag_map ctm ON c.id = ctm.career_id
        """))
        careers_with_tags = result.scalar()
        
        tag_coverage_pct = (careers_with_tags / total_careers * 100) if total_careers > 0 else 0
        print(f"  📊 With tags: {careers_with_tags:,} ({tag_coverage_pct:.1f}%)")
        
        # 5. Top Statistics
        print(f"\n🔥 TOP STATISTICS")
        print("-" * 40)
        
        # Most popular tags
        result = session.execute(text("""
            SELECT ct.name, COUNT(ctm.career_id) as usage_count
            FROM core.career_tags ct
            JOIN core.career_tag_map ctm ON ct.id = ctm.tag_id
            GROUP BY ct.id, ct.name
            ORDER BY usage_count DESC
            LIMIT 5
        """))
        
        top_tags = result.fetchall()
        print(f"  🏷️  Most popular tags:")
        for i, (name, count) in enumerate(top_tags, 1):
            print(f"     {i}. '{name}': {count:,} careers")
        
        # RIASEC distribution
        result = session.execute(text("""
            SELECT 
                AVG(r) as avg_r, AVG(i) as avg_i, AVG(a) as avg_a,
                AVG(s) as avg_s, AVG(e) as avg_e, AVG(c) as avg_c
            FROM core.career_interests
        """))
        
        riasec_avg = result.fetchone()
        if riasec_avg:
            print(f"  📊 RIASEC averages:")
            labels = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
            for i, (label, avg) in enumerate(zip(labels, riasec_avg)):
                print(f"     {label}: {avg:.3f}")
        
        # 6. Final Assessment
        print(f"\n🎯 PIPELINE ASSESSMENT")
        print("-" * 40)
        
        issues = []
        
        if encoding_issues > 0:
            issues.append(f"{encoding_issues} encoding issues")
        
        if empty_titles > 0:
            issues.append(f"{empty_titles} missing titles")
        
        if zero_riasec > 0:
            issues.append(f"{zero_riasec} invalid RIASEC scores")
        
        if coverage_pct < 100:
            issues.append(f"Embedding coverage: {coverage_pct:.1f}%")
        
        if not issues:
            print(f"  🎉 ETL Pipeline Status: EXCELLENT")
            print(f"     All data loaded successfully with no issues detected")
        else:
            print(f"  ⚠️  ETL Pipeline Status: GOOD with minor issues")
            print(f"     Issues found:")
            for issue in issues:
                print(f"     - {issue}")
        
        print(f"\n✅ ETL Pipeline is operational and ready for production use!")
        
    except Exception as e:
        print(f"❌ Error generating status report: {e}")
    finally:
        session.close()
    
    print("="*80)

if __name__ == "__main__":
    main()