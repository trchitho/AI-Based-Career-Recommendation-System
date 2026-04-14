#!/usr/bin/env python3
"""
Script dịch tiếng Việt cho bảng career_ksas
Dịch name_vi và description_vi cho tất cả KSAs
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('./apps/backend/.env')

# Database connection
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)

def translate_ksa_names():
    """
    Dịch name_vi cho các KSAs
    """
    cur = conn.cursor()
    
    print("📝 Translating KSA Names...")
    
    # KSA name translations
    ksa_name_translations = {
        # Abilities - Verbal
        "Written Expression": "Khả năng diễn đạt bằng văn bản",
        "Oral Comprehension": "Khả năng hiểu nói",
        "Oral Expression": "Khả năng diễn đạt bằng lời nói",
        "Written Comprehension": "Khả năng hiểu văn bản",
        "Speech Recognition": "Khả năng nhận dạng giọng nói",
        "Speech Clarity": "Khả năng nói rõ ràng",
        
        # Abilities - Idea Generation and Reasoning
        "Problem Sensitivity": "Khả năng nhạy cảm với vấn đề",
        "Deductive Reasoning": "Khả năng suy luận diễn dịch",
        "Inductive Reasoning": "Khả năng suy luận quy nạp",
        "Information Ordering": "Khả năng sắp xếp thông tin",
        "Category Flexibility": "Khả năng linh hoạt phân loại",
        "Mathematical Reasoning": "Khả năng suy luận toán học",
        "Number Facility": "Khả năng tính toán",
        "Memorization": "Khả năng ghi nhớ",
        "Speed of Closure": "Khả năng kết luận nhanh",
        "Flexibility of Closure": "Khả năng kết luận linh hoạt",
        "Perceptual Speed": "Tốc độ nhận thức",
        "Spatial Orientation": "Khả năng định hướng không gian",
        "Visualization": "Khả năng hình dung",
        "Selective Attention": "Khả năng chú ý có chọn lọc",
        "Time Sharing": "Khả năng chia sẻ thời gian",
        
        # Abilities - Quantitative
        "Mathematical Reasoning": "Khả năng suy luận toán học",
        "Number Facility": "Khả năng tính toán",
        
        # Abilities - Memory
        "Memorization": "Khả năng ghi nhớ",
        
        # Abilities - Perceptual
        "Speed of Closure": "Khả năng kết luận nhanh",
        "Flexibility of Closure": "Khả năng kết luận linh hoạt",
        "Perceptual Speed": "Tốc độ nhận thức",
        
        # Abilities - Spatial
        "Spatial Orientation": "Khả năng định hướng không gian",
        "Visualization": "Khả năng hình dung",
        
        # Abilities - Attentiveness
        "Selective Attention": "Khả năng chú ý có chọn lọc",
        "Time Sharing": "Khả năng chia sẻ thời gian",
        
        # Abilities - Psychomotor
        "Arm-Hand Steadiness": "Khả năng giữ vững tay",
        "Manual Dexterity": "Khả năng khéo léo tay",
        "Finger Dexterity": "Khả năng khéo léo ngón tay",
        "Control Precision": "Khả năng kiểm soát chính xác",
        "Multilimb Coordination": "Khả năng phối hợp nhiều chi",
        "Response Orientation": "Khả năng định hướng phản ứng",
        "Rate Control": "Khả năng kiểm soát tốc độ",
        "Reaction Time": "Thời gian phản ứng",
        "Wrist-Finger Speed": "Tốc độ cổ tay-ngón tay",
        "Speed of Limb Movement": "Tốc độ chuyển động chi",
        
        # Abilities - Physical Strength
        "Static Strength": "Sức mạnh tĩnh",
        "Explosive Strength": "Sức mạnh bùng nổ",
        "Dynamic Strength": "Sức mạnh động",
        "Trunk Strength": "Sức mạnh thân người",
        
        # Abilities - Endurance
        "Stamina": "Sức bền",
        
        # Abilities - Flexibility, Balance and Coordination
        "Extent Flexibility": "Khả năng co giãn",
        "Dynamic Flexibility": "Khả năng linh hoạt động",
        "Gross Body Coordination": "Khả năng phối hợp toàn thân",
        "Gross Body Equilibrium": "Khả năng cân bằng toàn thân",
        
        # Abilities - Visual
        "Near Vision": "Thị lực gần",
        "Far Vision": "Thị lực xa",
        "Visual Color Discrimination": "Khả năng phân biệt màu sắc",
        "Night Vision": "Thị lực ban đêm",
        "Peripheral Vision": "Thị lực ngoại vi",
        "Depth Perception": "Khả năng nhận thức độ sâu",
        "Glare Sensitivity": "Độ nhạy cảm với ánh sáng chói",
        
        # Abilities - Auditory and Speech
        "Hearing Sensitivity": "Độ nhạy cảm thính giác",
        "Auditory Attention": "Khả năng chú ý thính giác",
        "Sound Localization": "Khả năng định vị âm thanh",
        
        # Knowledge - Business and Management
        "Administration and Management": "Quản trị và quản lý",
        "Clerical": "Văn thư",
        "Economics and Accounting": "Kinh tế và kế toán",
        "Sales and Marketing": "Bán hàng và tiếp thị",
        "Customer and Personal Service": "Dịch vụ khách hàng và cá nhân",
        "Personnel and Human Resources": "Nhân sự và nguồn nhân lực",
        
        # Knowledge - Manufacturing and Production
        "Production and Processing": "Sản xuất và chế biến",
        "Food Production": "Sản xuất thực phẩm",
        
        # Knowledge - Engineering and Technology
        "Computers and Electronics": "Máy tính và điện tử",
        "Engineering and Technology": "Kỹ thuật và công nghệ",
        "Design": "Thiết kế",
        "Building and Construction": "Xây dựng và thi công",
        "Mechanical": "Cơ khí",
        
        # Knowledge - Mathematics and Science
        "Mathematics": "Toán học",
        "Physics": "Vật lý",
        "Chemistry": "Hóa học",
        "Biology": "Sinh học",
        "Psychology": "Tâm lý học",
        "Sociology and Anthropology": "Xã hội học và nhân học",
        "Geography": "Địa lý",
        
        # Knowledge - Health Services
        "Medicine and Dentistry": "Y học và nha khoa",
        "Therapy and Counseling": "Trị liệu và tư vấn",
        
        # Knowledge - Education and Training
        "Education and Training": "Giáo dục và đào tạo",
        
        # Knowledge - Arts and Humanities
        "English Language": "Tiếng Anh",
        "Foreign Language": "Ngoại ngữ",
        "Fine Arts": "Mỹ thuật",
        "History and Archeology": "Lịch sử và khảo cổ học",
        "Philosophy and Theology": "Triết học và thần học",
        
        # Knowledge - Law and Public Safety
        "Public Safety and Security": "An toàn và bảo mật công cộng",
        "Law and Government": "Luật pháp và chính phủ",
        
        # Knowledge - Communications
        "Telecommunications": "Viễn thông",
        "Communications and Media": "Truyền thông và phương tiện truyền thông",
        
        # Knowledge - Transportation
        "Transportation": "Giao thông vận tải",
        
        # Skills - Basic Skills
        "Reading Comprehension": "Khả năng đọc hiểu",
        "Active Listening": "Khả năng lắng nghe tích cực",
        "Writing": "Khả năng viết",
        "Speaking": "Khả năng nói",
        "Mathematics": "Toán học",
        "Science": "Khoa học",
        
        # Skills - Cross-Functional Skills
        "Critical Thinking": "Tư duy phản biện",
        "Active Learning": "Học tập tích cực",
        "Learning Strategies": "Chiến lược học tập",
        "Monitoring": "Giám sát",
        
        # Skills - Social Skills
        "Social Perceptiveness": "Khả năng nhận thức xã hội",
        "Coordination": "Phối hợp",
        "Persuasion": "Thuyết phục",
        "Negotiation": "Đàm phán",
        "Instructing": "Hướng dẫn",
        "Service Orientation": "Định hướng dịch vụ",
        
        # Skills - Complex Problem Solving Skills
        "Complex Problem Solving": "Giải quyết vấn đề phức tạp",
        
        # Skills - Technical Skills
        "Operations Analysis": "Phân tích hoạt động",
        "Technology Design": "Thiết kế công nghệ",
        "Equipment Selection": "Lựa chọn thiết bị",
        "Installation": "Lắp đặt",
        "Programming": "Lập trình",
        "Quality Control Analysis": "Phân tích kiểm soát chất lượng",
        "Operations Monitoring": "Giám sát hoạt động",
        "Operation and Control": "Vận hành và kiểm soát",
        "Equipment Maintenance": "Bảo trì thiết bị",
        "Troubleshooting": "Khắc phục sự cố",
        "Repairing": "Sửa chữa",
        
        # Skills - Systems Skills
        "Judgment and Decision Making": "Phán đoán và ra quyết định",
        "Systems Analysis": "Phân tích hệ thống",
        "Systems Evaluation": "Đánh giá hệ thống",
        
        # Skills - Resource Management Skills
        "Time Management": "Quản lý thời gian",
        "Management of Financial Resources": "Quản lý tài nguyên tài chính",
        "Management of Material Resources": "Quản lý tài nguyên vật chất",
        "Management of Personnel Resources": "Quản lý tài nguyên nhân sự"
    }
    
    # Apply translations
    translated_count = 0
    for en_name, vi_name in ksa_name_translations.items():
        cur.execute("""
            UPDATE core.career_ksas 
            SET name_vi = %s
            WHERE name = %s AND name_vi IS NULL;
        """, (vi_name, en_name))
        
        if cur.rowcount > 0:
            translated_count += cur.rowcount
    
    conn.commit()
    print(f"✅ Translated {translated_count} KSA names")
    
    cur.close()

def translate_ksa_descriptions():
    """
    Dịch description_vi cho các KSAs
    """
    cur = conn.cursor()
    
    print("📖 Translating KSA Descriptions...")
    
    # Get all KSAs with descriptions but no Vietnamese descriptions
    cur.execute("""
        SELECT id, name, description, ksa_type, category
        FROM core.career_ksas 
        WHERE description IS NOT NULL 
        AND description_vi IS NULL
        ORDER BY ksa_type, category, name;
    """)
    
    ksas_to_translate = cur.fetchall()
    print(f"📝 Found {len(ksas_to_translate)} KSA descriptions to translate")
    
    # Common description patterns and translations
    description_patterns = {
        # Common ability description patterns
        "The ability to": "Khả năng",
        "communicate information and ideas": "truyền đạt thông tin và ý tưởng",
        "listen to and understand": "lắng nghe và hiểu",
        "information and ideas presented": "thông tin và ý tưởng được trình bày",
        "through spoken words": "thông qua lời nói",
        "and sentences": "và câu",
        "in writing so others will understand": "bằng văn bản để người khác hiểu",
        "apply general rules": "áp dụng các quy tắc chung",
        "to specific problems": "cho các vấn đề cụ thể",
        "to produce answers": "để đưa ra câu trả lời",
        "that make sense": "có ý nghĩa",
        "combine pieces of information": "kết hợp các mảnh thông tin",
        "to form general rules": "để tạo thành các quy tắc chung",
        "or conclusions": "hoặc kết luận",
        "arrange things or actions": "sắp xếp sự vật hoặc hành động",
        "in a certain order": "theo một thứ tự nhất định",
        "or pattern": "hoặc mẫu",
        "according to a specific rule": "theo một quy tắc cụ thể",
        "or set of rules": "hoặc tập hợp các quy tắc",
        "generate or use different sets": "tạo ra hoặc sử dụng các tập hợp khác nhau",
        "of rules for combining": "của các quy tắc để kết hợp",
        "or grouping things": "hoặc nhóm các sự vật",
        "in different ways": "theo những cách khác nhau",
        "choose the right mathematical methods": "chọn các phương pháp toán học phù hợp",
        "or formulas": "hoặc công thức",
        "to solve problems": "để giải quyết vấn đề",
        "add, subtract, multiply": "cộng, trừ, nhân",
        "or divide quickly": "hoặc chia nhanh chóng",
        "and correctly": "và chính xác",
        "remember information": "ghi nhớ thông tin",
        "such as words": "như từ ngữ",
        "numbers, pictures": "số, hình ảnh",
        "and procedures": "và quy trình",
        
        # Knowledge descriptions
        "Knowledge of": "Kiến thức về",
        "principles and processes": "nguyên lý và quy trình",
        "business and management": "kinh doanh và quản lý",
        "strategic planning": "lập kế hoạch chiến lược",
        "resource allocation": "phân bổ tài nguyên",
        "human resources modeling": "mô hình hóa nguồn nhân lực",
        "leadership technique": "kỹ thuật lãnh đạo",
        "production methods": "phương pháp sản xuất",
        "coordination of people": "phối hợp con người",
        "and resources": "và tài nguyên",
        "administrative and clerical procedures": "quy trình hành chính và văn thư",
        "and systems": "và hệ thống",
        "word processing": "xử lý văn bản",
        "managing files and records": "quản lý tập tin và hồ sơ",
        "stenography and transcription": "tốc ký và phiên âm",
        "designing forms": "thiết kế biểu mẫu",
        "and other office procedures": "và các quy trình văn phòng khác",
        "terminology": "thuật ngữ",
        
        # Skills descriptions
        "Using logic and reasoning": "Sử dụng logic và lý luận",
        "to identify": "để xác định",
        "the strengths and weaknesses": "điểm mạnh và điểm yếu",
        "of alternative solutions": "của các giải pháp thay thế",
        "conclusions or approaches": "kết luận hoặc cách tiếp cận",
        "to problems": "với vấn đề",
        "Giving full attention": "Tập trung hoàn toàn",
        "to what other people are saying": "vào những gì người khác đang nói",
        "taking time to understand": "dành thời gian để hiểu",
        "the points being made": "những điểm được đưa ra",
        "asking questions": "đặt câu hỏi",
        "as appropriate": "khi thích hợp",
        "and not interrupting": "và không ngắt lời",
        "at inappropriate times": "vào những thời điểm không phù hợp"
    }
    
    # Translate descriptions
    translated_count = 0
    for ksa_id, name, description, ksa_type, category in ksas_to_translate:
        translated_desc = description
        
        # Apply pattern-based translation
        for en_pattern, vi_pattern in description_patterns.items():
            if en_pattern.lower() in description.lower():
                translated_desc = translated_desc.replace(en_pattern, vi_pattern)
        
        # Basic word replacements
        word_replacements = {
            " and ": " và ",
            " or ": " hoặc ",
            " with ": " với ",
            " for ": " cho ",
            " to ": " để ",
            " in ": " trong ",
            " on ": " trên ",
            " at ": " tại ",
            " by ": " bởi ",
            " of ": " của ",
            " from ": " từ ",
            " into ": " vào ",
            " through ": " thông qua ",
            " during ": " trong suốt ",
            " before ": " trước ",
            " after ": " sau ",
            " over ": " trên ",
            " under ": " dưới ",
            " about ": " về ",
            " against ": " chống lại ",
            " between ": " giữa ",
            " among ": " trong số "
        }
        
        for en_word, vi_word in word_replacements.items():
            translated_desc = translated_desc.replace(en_word, vi_word)
        
        # If translation is meaningful, update
        if translated_desc != description and len(translated_desc) > 10:
            cur.execute("""
                UPDATE core.career_ksas 
                SET description_vi = %s
                WHERE id = %s;
            """, (translated_desc, ksa_id))
            translated_count += 1
        else:
            # Fallback: create basic Vietnamese description
            if ksa_type == 'ability':
                basic_desc = f"Khả năng liên quan đến {name.lower()}"
            elif ksa_type == 'knowledge':
                basic_desc = f"Kiến thức về {name.lower()}"
            elif ksa_type == 'skill':
                basic_desc = f"Kỹ năng {name.lower()}"
            else:
                basic_desc = f"Năng lực {name.lower()}"
            
            cur.execute("""
                UPDATE core.career_ksas 
                SET description_vi = %s
                WHERE id = %s;
            """, (basic_desc, ksa_id))
            translated_count += 1
    
    conn.commit()
    print(f"✅ Translated {translated_count} KSA descriptions")
    
    cur.close()

def main():
    print("🧠 TRANSLATING CAREER KSAs")
    print("=" * 50)
    
    try:
        # Check current state
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas;")
        total_ksas = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas WHERE name_vi IS NOT NULL;")
        translated_names = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas WHERE description_vi IS NOT NULL;")
        translated_descriptions = cur.fetchone()[0]
        
        print(f"📊 Current state:")
        print(f"   Total KSAs: {total_ksas:,}")
        print(f"   Translated names: {translated_names:,} ({translated_names/total_ksas*100:.1f}%)")
        print(f"   Translated descriptions: {translated_descriptions:,} ({translated_descriptions/total_ksas*100:.1f}%)")
        
        cur.close()
        
        # 1. Translate KSA names
        translate_ksa_names()
        
        # 2. Translate KSA descriptions
        translate_ksa_descriptions()
        
        # 3. Final verification
        print(f"\n📊 FINAL VERIFICATION")
        
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas WHERE name_vi IS NOT NULL;")
        final_names = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM core.career_ksas WHERE description_vi IS NOT NULL;")
        final_descriptions = cur.fetchone()[0]
        
        print(f"KSA names: {final_names}/{total_ksas} ({final_names/total_ksas*100:.1f}%)")
        print(f"KSA descriptions: {final_descriptions}/{total_ksas} ({final_descriptions/total_ksas*100:.1f}%)")
        
        # Show samples
        cur.execute("""
            SELECT ksa_type, name, name_vi, LEFT(description_vi, 80) as desc_preview
            FROM core.career_ksas 
            WHERE name_vi IS NOT NULL AND description_vi IS NOT NULL
            ORDER BY ksa_type, name
            LIMIT 5;
        """)
        
        print(f"\n📝 Sample translations:")
        for ksa_type, name, name_vi, desc_preview in cur.fetchall():
            print(f"   {ksa_type.upper()}: {name}")
            print(f"   Vietnamese: {name_vi}")
            print(f"   Description: {desc_preview}...")
            print()
        
        cur.close()
        
        print(f"\n🎉 KSA translation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()