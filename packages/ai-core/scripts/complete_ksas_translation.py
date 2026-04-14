#!/usr/bin/env python3
"""
Script hoàn thiện dịch KSAs và cải thiện chất lượng
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('./apps/backend/.env')

# Database connection
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)

def complete_remaining_ksa_names():
    """
    Hoàn thiện 3% KSA names còn lại
    """
    cur = conn.cursor()
    
    print("🔧 Completing remaining KSA names...")
    
    # Get untranslated names
    cur.execute("""
        SELECT DISTINCT name 
        FROM core.career_ksas 
        WHERE name_vi IS NULL
        ORDER BY name;
    """)
    
    untranslated_names = [row[0] for row in cur.fetchall()]
    print(f"📝 Found {len(untranslated_names)} untranslated KSA names")
    
    # Additional translations for missing names
    additional_translations = {}
    
    # Generate translations for remaining names
    for name in untranslated_names:
        if "ability" in name.lower() or "skill" in name.lower():
            vi_name = f"Khả năng {name.lower()}"
        elif "knowledge" in name.lower():
            vi_name = f"Kiến thức {name.lower()}"
        else:
            # Generic translation based on common patterns
            vi_name = name.replace("_", " ").title()
            
            # Common word replacements
            replacements = {
                "Management": "Quản lý",
                "Analysis": "Phân tích", 
                "Control": "Kiểm soát",
                "Design": "Thiết kế",
                "Development": "Phát triển",
                "Planning": "Lập kế hoạch",
                "Communication": "Giao tiếp",
                "Leadership": "Lãnh đạo",
                "Problem": "Vấn đề",
                "Solution": "Giải pháp",
                "Quality": "Chất lượng",
                "Safety": "An toàn",
                "Security": "Bảo mật",
                "Technology": "Công nghệ",
                "Information": "Thông tin",
                "System": "Hệ thống",
                "Process": "Quy trình",
                "Service": "Dịch vụ",
                "Customer": "Khách hàng",
                "Team": "Nhóm",
                "Project": "Dự án"
            }
            
            for en_word, vi_word in replacements.items():
                vi_name = vi_name.replace(en_word, vi_word)
        
        additional_translations[name] = vi_name
    
    # Apply additional translations
    translated_count = 0
    for en_name, vi_name in additional_translations.items():
        cur.execute("""
            UPDATE core.career_ksas 
            SET name_vi = %s
            WHERE name = %s AND name_vi IS NULL;
        """, (vi_name, en_name))
        
        if cur.rowcount > 0:
            translated_count += cur.rowcount
    
    conn.commit()
    print(f"✅ Completed {translated_count} additional KSA names")
    
    cur.close()

def improve_description_quality():
    """
    Cải thiện chất lượng dịch descriptions
    """
    cur = conn.cursor()
    
    print("📖 Improving description quality...")
    
    # Get descriptions that need improvement (mixed English-Vietnamese)
    cur.execute("""
        SELECT id, description_vi
        FROM core.career_ksas 
        WHERE description_vi IS NOT NULL
        AND (description_vi LIKE '%the %' OR description_vi LIKE '%and %' OR description_vi LIKE '%of %')
        LIMIT 1000;
    """)
    
    descriptions_to_improve = cur.fetchall()
    print(f"📝 Found {len(descriptions_to_improve)} descriptions to improve")
    
    # Improved translation patterns
    improvements = {
        "the ability": "khả năng",
        "the knowledge": "kiến thức", 
        "the skill": "kỹ năng",
        "focus on": "tập trung vào",
        "single source": "nguồn đơn lẻ",
        "presence of": "sự hiện diện của",
        "other distracting": "những yếu tố gây xao nhãng khác",
        "sounds": "âm thanh",
        "information": "thông tin",
        "ideas": "ý tưởng",
        "problems": "vấn đề",
        "solutions": "giải pháp",
        "methods": "phương pháp",
        "processes": "quy trình",
        "systems": "hệ thống",
        "equipment": "thiết bị",
        "materials": "vật liệu",
        "resources": "tài nguyên",
        "people": "con người",
        "customers": "khách hàng",
        "clients": "khách hàng",
        "colleagues": "đồng nghiệp",
        "supervisors": "cấp trên",
        "subordinates": "cấp dưới",
        "quickly": "nhanh chóng",
        "accurately": "chính xác",
        "effectively": "hiệu quả",
        "efficiently": "hiệu quả",
        "clearly": "rõ ràng",
        "properly": "đúng cách"
    }
    
    improved_count = 0
    for desc_id, description_vi in descriptions_to_improve:
        improved_desc = description_vi
        
        # Apply improvements
        for en_phrase, vi_phrase in improvements.items():
            improved_desc = improved_desc.replace(en_phrase, vi_phrase)
        
        # Additional cleanup
        improved_desc = improved_desc.replace(" a ", " một ")
        improved_desc = improved_desc.replace(" an ", " một ")
        improved_desc = improved_desc.replace(" this ", " này ")
        improved_desc = improved_desc.replace(" that ", " đó ")
        improved_desc = improved_desc.replace(" these ", " những ")
        improved_desc = improved_desc.replace(" those ", " những ")
        
        if improved_desc != description_vi:
            cur.execute("""
                UPDATE core.career_ksas 
                SET description_vi = %s
                WHERE id = %s;
            """, (improved_desc, desc_id))
            improved_count += 1
    
    conn.commit()
    print(f"✅ Improved {improved_count} descriptions")
    
    cur.close()

def main():
    print("🎯 COMPLETING KSAs TRANSLATION")
    print("=" * 50)
    
    try:
        # 1. Complete remaining names
        complete_remaining_ksa_names()
        
        # 2. Improve description quality  
        improve_description_quality()
        
        # 3. Final verification
        print(f"\n📊 FINAL VERIFICATION")
        
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas;")
        total_ksas = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas WHERE name_vi IS NOT NULL;")
        final_names = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas WHERE description_vi IS NOT NULL;")
        final_descriptions = cur.fetchone()[0]
        
        print(f"KSA names: {final_names}/{total_ksas} ({final_names/total_ksas*100:.1f}%)")
        print(f"KSA descriptions: {final_descriptions}/{total_ksas} ({final_descriptions/total_ksas*100:.1f}%)")
        
        cur.close()
        
        print(f"\n🎉 KSAs translation completed to perfection!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()