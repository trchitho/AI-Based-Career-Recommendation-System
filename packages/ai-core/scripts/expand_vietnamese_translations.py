#!/usr/bin/env python3
"""
Script mở rộng để dịch thêm nhiều nội dung tiếng Việt
Tập trung vào DWA titles, career tasks và career descriptions
"""

import psycopg2
import os
from dotenv import load_dotenv
import random

# Load environment variables
load_dotenv('./apps/backend/.env')

# Database connection
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("❌ DATABASE_URL not found in environment variables")
    exit(1)

print(f"🔗 Connecting to database: {database_url}")

try:
    conn = psycopg2.connect(database_url)
    print("✅ Database connection successful")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("💡 Make sure PostgreSQL is running on port 5433")
    exit(1)

def expand_dwa_translations():
    """
    Mở rộng dịch DWA titles với nhiều patterns phổ biến hơn
    """
    cur = conn.cursor()
    
    print("🔧 Expanding DWA Titles Vietnamese Translations...")
    
    # Expanded translation patterns
    translation_patterns = {
        # Common verbs and actions
        "Analyze": "Phân tích",
        "Develop": "Phát triển", 
        "Design": "Thiết kế",
        "Prepare": "Chuẩn bị",
        "Review": "Xem xét",
        "Monitor": "Giám sát",
        "Coordinate": "Phối hợp",
        "Evaluate": "Đánh giá",
        "Maintain": "Duy trì",
        "Supervise": "Giám sát",
        "Train": "Đào tạo",
        "Communicate": "Giao tiếp",
        "Document": "Ghi chép",
        "Implement": "Thực hiện",
        "Manage": "Quản lý",
        "Operate": "Vận hành",
        "Install": "Lắp đặt",
        "Configure": "Cấu hình",
        "Troubleshoot": "Khắc phục sự cố",
        "Optimize": "Tối ưu hóa",
        
        # Common objects and subjects
        "systems": "hệ thống",
        "equipment": "thiết bị",
        "software": "phần mềm",
        "hardware": "phần cứng",
        "data": "dữ liệu",
        "information": "thông tin",
        "reports": "báo cáo",
        "procedures": "quy trình",
        "policies": "chính sách",
        "personnel": "nhân viên",
        "customers": "khách hàng",
        "clients": "khách hàng",
        "projects": "dự án",
        "activities": "hoạt động",
        "operations": "hoạt động",
        "performance": "hiệu suất",
        "quality": "chất lượng",
        "safety": "an toàn",
        "security": "bảo mật",
        "requirements": "yêu cầu",
        "specifications": "thông số kỹ thuật",
        
        # Industry-specific terms
        "medical": "y tế",
        "patient": "bệnh nhân",
        "treatment": "điều trị",
        "diagnosis": "chẩn đoán",
        "medication": "thuốc",
        "educational": "giáo dục",
        "student": "học sinh",
        "curriculum": "chương trình giảng dạy",
        "financial": "tài chính",
        "budget": "ngân sách",
        "accounting": "kế toán",
        "legal": "pháp lý",
        "contract": "hợp đồng",
        "engineering": "kỹ thuật",
        "construction": "xây dựng",
        "manufacturing": "sản xuất",
        "research": "nghiên cứu"
    }
    
    # Get untranslated DWA titles
    cur.execute("""
        SELECT DISTINCT dwa_title 
        FROM core.career_dwas 
        WHERE dwa_title_vi IS NULL 
        ORDER BY dwa_title
        LIMIT 500;
    """)
    
    untranslated_titles = [row[0] for row in cur.fetchall()]
    print(f"📝 Found {len(untranslated_titles)} untranslated DWA titles")
    
    # Apply pattern-based translation
    translated_count = 0
    for title in untranslated_titles:
        # Simple pattern matching and replacement
        translated_title = title
        
        # Replace common patterns
        for en_pattern, vi_pattern in translation_patterns.items():
            if en_pattern.lower() in title.lower():
                translated_title = translated_title.replace(en_pattern, vi_pattern)
        
        # Basic sentence structure fixes
        translated_title = translated_title.replace(" or ", " hoặc ")
        translated_title = translated_title.replace(" and ", " và ")
        translated_title = translated_title.replace(" with ", " với ")
        translated_title = translated_title.replace(" for ", " cho ")
        translated_title = translated_title.replace(" to ", " để ")
        
        # Only update if translation looks different from original
        if translated_title != title and len(translated_title) > 10:
            cur.execute("""
                UPDATE core.career_dwas 
                SET dwa_title_vi = %s
                WHERE dwa_title = %s AND dwa_title_vi IS NULL;
            """, (translated_title, title))
            
            if cur.rowcount > 0:
                translated_count += cur.rowcount
    
    conn.commit()
    print(f"✅ Pattern-translated {translated_count} additional DWA titles")
    
    cur.close()

def expand_career_descriptions():
    """
    Mở rộng mô tả nghề nghiệp cho các ngành chính
    """
    cur = conn.cursor()
    
    print("👔 Expanding Career Descriptions...")
    
    # Get careers by major industry groups
    cur.execute("""
        SELECT onet_code, title_en, industry_category
        FROM core.careers 
        WHERE description_vi IS NULL 
        AND industry_category IN ('Management', 'Computer and Mathematical', 'Healthcare', 'Education', 'Engineering')
        ORDER BY industry_category, title_en
        LIMIT 50;
    """)
    
    careers_to_translate = cur.fetchall()
    print(f"📝 Found {len(careers_to_translate)} careers to translate")
    
    # Industry-specific description templates
    description_templates = {
        'Management': "Lập kế hoạch, tổ chức, chỉ đạo và kiểm soát các hoạt động của tổ chức. Đưa ra quyết định chiến lược và đảm bảo hoạt động hiệu quả của các bộ phận.",
        'Computer and Mathematical': "Phát triển, thiết kế và duy trì các hệ thống công nghệ thông tin. Sử dụng kỹ năng lập trình và phân tích để giải quyết các vấn đề kỹ thuật phức tạp.",
        'Healthcare': "Cung cấp dịch vụ chăm sóc sức khỏe, chẩn đoán và điều trị bệnh nhân. Đảm bảo chất lượng dịch vụ y tế và tuân thủ các tiêu chuẩn an toàn.",
        'Education': "Giảng dạy, đào tạo và phát triển chương trình giáo dục. Hỗ trợ học sinh phát triển kiến thức và kỹ năng cần thiết cho tương lai.",
        'Engineering': "Thiết kế, phát triển và thử nghiệm các giải pháp kỹ thuật. Áp dụng nguyên lý khoa học và toán học để giải quyết các vấn đề thực tế."
    }
    
    updated_count = 0
    for onet_code, title_en, industry in careers_to_translate:
        if industry in description_templates:
            base_description = description_templates[industry]
            
            # Customize based on job title keywords
            if 'manager' in title_en.lower() or 'director' in title_en.lower():
                description = f"Quản lý và chỉ đạo các hoạt động chuyên môn. {base_description}"
            elif 'analyst' in title_en.lower():
                description = f"Phân tích và đánh giá dữ liệu chuyên ngành. {base_description}"
            elif 'engineer' in title_en.lower():
                description = f"Thiết kế và phát triển giải pháp kỹ thuật. {base_description}"
            elif 'specialist' in title_en.lower():
                description = f"Chuyên gia trong lĩnh vực cụ thể. {base_description}"
            else:
                description = base_description
            
            cur.execute("""
                UPDATE core.careers 
                SET description_vi = %s
                WHERE onet_code = %s;
            """, (description, onet_code))
            
            if cur.rowcount > 0:
                updated_count += 1
    
    conn.commit()
    print(f"✅ Added descriptions for {updated_count} careers")
    
    cur.close()

def expand_career_tasks():
    """
    Mở rộng dịch career tasks với các mẫu phổ biến
    """
    cur = conn.cursor()
    
    print("📋 Expanding Career Tasks Translations...")
    
    # Common task patterns
    task_patterns = {
        "Plan, direct, or coordinate": "Lập kế hoạch, chỉ đạo hoặc phối hợp",
        "Analyze data": "Phân tích dữ liệu",
        "Develop and implement": "Phát triển và thực hiện",
        "Monitor and evaluate": "Giám sát và đánh giá",
        "Prepare reports": "Chuẩn bị báo cáo",
        "Communicate with": "Giao tiếp với",
        "Review and approve": "Xem xét và phê duyệt",
        "Train and supervise": "Đào tạo và giám sát",
        "Maintain records": "Duy trì hồ sơ",
        "Ensure compliance": "Đảm bảo tuân thủ"
    }
    
    # Get sample tasks to translate
    cur.execute("""
        SELECT DISTINCT LEFT(task_text, 100) as task_sample
        FROM core.career_tasks 
        WHERE task_vi IS NULL 
        ORDER BY task_sample
        LIMIT 100;
    """)
    
    tasks_to_translate = [row[0] for row in cur.fetchall()]
    print(f"📝 Found {len(tasks_to_translate)} task patterns to translate")
    
    # Apply pattern-based translation for tasks
    translated_count = 0
    for task_sample in tasks_to_translate:
        translated_task = task_sample
        
        # Apply common patterns
        for en_pattern, vi_pattern in task_patterns.items():
            if en_pattern.lower() in task_sample.lower():
                translated_task = translated_task.replace(en_pattern, vi_pattern)
        
        # Basic replacements
        translated_task = translated_task.replace(" and ", " và ")
        translated_task = translated_task.replace(" or ", " hoặc ")
        translated_task = translated_task.replace(" with ", " với ")
        
        # Update if translation is meaningful
        if translated_task != task_sample and len(translated_task) > 20:
            cur.execute("""
                UPDATE core.career_tasks 
                SET task_vi = %s
                WHERE LEFT(task_text, 100) = %s AND task_vi IS NULL;
            """, (translated_task, task_sample))
            
            translated_count += cur.rowcount
    
    conn.commit()
    print(f"✅ Pattern-translated {translated_count} career tasks")
    
    cur.close()

def generate_more_alternative_titles():
    """
    Tạo thêm alternative titles cho các nghề phổ biến
    """
    cur = conn.cursor()
    
    print("🏷️ Generating More Alternative Titles...")
    
    # Get careers without alternative titles
    cur.execute("""
        SELECT onet_code, title_en, title_vi, industry_category
        FROM core.careers 
        WHERE alternative_titles_vi IS NULL 
        AND title_vi IS NOT NULL
        ORDER BY industry_category
        LIMIT 100;
    """)
    
    careers_without_alts = cur.fetchall()
    print(f"📝 Found {len(careers_without_alts)} careers without alternative titles")
    
    # Generate alternative titles based on patterns
    updated_count = 0
    for onet_code, title_en, title_vi, industry in careers_without_alts:
        alternatives = []
        
        # Add variations based on title patterns
        if title_vi:
            base_title = title_vi.replace("Các ", "").replace("các ", "")
            
            # Add formal variations
            if "chuyên gia" not in base_title.lower():
                alternatives.append(f"Chuyên gia {base_title.lower()}")
            
            if "nhân viên" not in base_title.lower():
                alternatives.append(f"Nhân viên {base_title.lower()}")
            
            # Industry-specific variations
            if industry == 'Management':
                alternatives.extend([f"Quản lý {base_title.lower()}", f"Trưởng phòng {base_title.lower()}"])
            elif industry == 'Computer and Mathematical':
                alternatives.extend([f"Kỹ sư {base_title.lower()}", f"Lập trình viên {base_title.lower()}"])
            elif industry == 'Healthcare':
                alternatives.extend([f"Bác sĩ {base_title.lower()}", f"Chuyên khoa {base_title.lower()}"])
            elif industry == 'Education':
                alternatives.extend([f"Giảng viên {base_title.lower()}", f"Giáo viên {base_title.lower()}"])
        
        # Remove duplicates and limit to 4 alternatives
        alternatives = list(set(alternatives))[:4]
        
        if alternatives:
            cur.execute("""
                UPDATE core.careers 
                SET alternative_titles_vi = %s
                WHERE onet_code = %s;
            """, (alternatives, onet_code))
            
            if cur.rowcount > 0:
                updated_count += 1
    
    conn.commit()
    print(f"✅ Generated alternative titles for {updated_count} careers")
    
    cur.close()

def main():
    print("🌐 VIETNAMESE LOCALIZATION - EXPANSION SCRIPT")
    print("=" * 60)
    
    try:
        # 1. Expand DWA translations
        expand_dwa_translations()
        
        # 2. Expand career descriptions
        expand_career_descriptions()
        
        # 3. Expand career tasks
        expand_career_tasks()
        
        # 4. Generate more alternative titles
        generate_more_alternative_titles()
        
        # 5. Final summary report
        print(f"\n📊 FINAL SUMMARY REPORT")
        
        cur = conn.cursor()
        
        # Check all translation progress
        cur.execute("SELECT COUNT(*) FROM core.career_education_pct WHERE category_description_vi IS NOT NULL;")
        edu_translated = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM core.career_education_pct;")
        edu_total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.careers WHERE description_vi IS NOT NULL;")
        career_desc_translated = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM core.careers;")
        career_total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_dwas WHERE dwa_title_vi IS NOT NULL;")
        dwa_translated = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM core.career_dwas;")
        dwa_total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi IS NOT NULL;")
        task_translated = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM core.career_tasks;")
        task_total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.careers WHERE alternative_titles_vi IS NOT NULL;")
        alt_titles_translated = cur.fetchone()[0]
        
        print(f"Education categories: {edu_translated}/{edu_total} ({edu_translated/edu_total*100:.1f}%)")
        print(f"Career descriptions: {career_desc_translated}/{career_total} ({career_desc_translated/career_total*100:.1f}%)")
        print(f"DWA titles: {dwa_translated}/{dwa_total} ({dwa_translated/dwa_total*100:.1f}%)")
        print(f"Career tasks: {task_translated}/{task_total} ({task_translated/task_total*100:.1f}%)")
        print(f"Alternative titles: {alt_titles_translated}/{career_total} ({alt_titles_translated/career_total*100:.1f}%)")
        
        # Calculate overall progress
        total_items = edu_total + career_total + dwa_total + task_total + career_total
        translated_items = edu_translated + career_desc_translated + dwa_translated + task_translated + alt_titles_translated
        overall_progress = translated_items / total_items * 100
        
        print(f"\n🎯 OVERALL TRANSLATION PROGRESS: {overall_progress:.1f}%")
        
        cur.close()
        
        print(f"\n💡 RECOMMENDATIONS:")
        print("1. Implement automated translation API for remaining content")
        print("2. Add human review process for critical translations")
        print("3. Create translation memory for consistency")
        print("4. Set up regular translation updates for new content")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    
    finally:
        conn.close()
    
    print(f"\n🎉 Vietnamese localization expansion completed!")

if __name__ == "__main__":
    main()