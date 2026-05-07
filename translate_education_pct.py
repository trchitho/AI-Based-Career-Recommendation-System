import asyncio
import asyncpg
import re

# Dictionary dịch thuật chuyên ngành giáo dục
EDUCATION_TRANSLATION_DICT = {
    # Element names (Education levels)
    "Education": "Trình độ học vấn",
    "Training": "Đào tạo",
    "Experience": "Kinh nghiệm",
    "Related Experience": "Kinh nghiệm liên quan",
    "On-Site or In-Plant Training": "Đào tạo tại chỗ hoặc trong nhà máy",
    "On-the-Job Training": "Đào tạo trong công việc",
    
    # Category descriptions (Detailed education levels)
    "High school diploma or equivalent": "Tốt nghiệp trung học phổ thông hoặc tương đương",
    "Some college, no degree or Associate degree": "Học đại học một phần hoặc bằng cao đẳng",
    "Bachelor's degree required": "Yêu cầu bằng cử nhân",
    "Master's degree required": "Yêu cầu bằng thạc sĩ", 
    "Doctoral or professional degree required": "Yêu cầu bằng tiến sĩ hoặc bằng chuyên nghiệp",
    "Post-secondary certificate": "Chứng chỉ sau trung học",
    "Vocational training": "Đào tạo nghề",
    "Technical training": "Đào tạo kỹ thuật",
    "Professional certification": "Chứng chỉ chuyên nghiệp",
    "Continuing education": "Giáo dục thường xuyên",
    "Apprenticeship": "Học nghề",
    "Internship": "Thực tập",
    
    # Experience levels
    "None": "Không có",
    "Less than 1 month": "Dưới 1 tháng",
    "1 to 3 months": "1 đến 3 tháng",
    "3 to 6 months": "3 đến 6 tháng", 
    "6 months to 1 year": "6 tháng đến 1 năm",
    "1 to 2 years": "1 đến 2 năm",
    "2 to 4 years": "2 đến 4 năm",
    "4 to 6 years": "4 đến 6 năm",
    "6 to 8 years": "6 đến 8 năm",
    "8 to 10 years": "8 đến 10 năm",
    "More than 10 years": "Hơn 10 năm",
    
    # Training types
    "Short-term on-the-job training": "Đào tạo ngắn hạn trong công việc",
    "Moderate-term on-the-job training": "Đào tạo trung hạn trong công việc", 
    "Long-term on-the-job training": "Đào tạo dài hạn trong công việc",
    "Extensive preparation needed": "Cần chuẩn bị kỹ lưỡng",
    "Postsecondary non-degree award": "Giải thưởng sau trung học không cấp bằng",
    "Some college courses": "Một số khóa học đại học",
    "Associate degree": "Bằng cao đẳng",
    "Bachelor's degree": "Bằng cử nhân",
    "Master's degree": "Bằng thạc sĩ",
    "Doctoral degree": "Bằng tiến sĩ",
    "Professional degree": "Bằng chuyên nghiệp",
    "First professional degree": "Bằng chuyên nghiệp đầu tiên",
    
    # Common education terms
    "degree": "bằng cấp",
    "diploma": "bằng tốt nghiệp",
    "certificate": "chứng chỉ",
    "certification": "chứng nhận",
    "license": "giấy phép",
    "qualification": "trình độ",
    "credential": "thông tin xác thực",
    "training": "đào tạo",
    "education": "giáo dục",
    "experience": "kinh nghiệm",
    "background": "nền tảng",
    "preparation": "chuẩn bị",
    "requirement": "yêu cầu",
    "needed": "cần thiết",
    "required": "yêu cầu",
    "equivalent": "tương đương",
    "related": "liên quan",
    "relevant": "có liên quan",
    "appropriate": "phù hợp",
    "suitable": "thích hợp",
    "adequate": "đầy đủ",
    "sufficient": "đủ",
    "minimum": "tối thiểu",
    "preferred": "ưu tiên",
    "desirable": "mong muốn",
    "optional": "tùy chọn",
    "recommended": "khuyến nghị",
    "suggested": "đề xuất",
    
    # Time periods
    "month": "tháng",
    "months": "tháng", 
    "year": "năm",
    "years": "năm",
    "week": "tuần",
    "weeks": "tuần",
    "day": "ngày",
    "days": "ngày",
    "hour": "giờ",
    "hours": "giờ",
    
    # Quantifiers
    "less than": "dưới",
    "more than": "hơn",
    "up to": "lên đến",
    "over": "trên",
    "under": "dưới",
    "between": "giữa",
    "from": "từ",
    "to": "đến",
    "and": "và",
    "or": "hoặc",
    "some": "một số",
    "several": "vài",
    "many": "nhiều",
    "most": "hầu hết",
    "all": "tất cả",
    "any": "bất kỳ",
    "no": "không",
    "none": "không có"
}

def translate_education_text(english_text):
    """
    Dịch text giáo dục từ tiếng Anh sang tiếng Việt chuyên ngành
    """
    if not english_text:
        return ""
    
    # Kiểm tra trong dictionary trước
    if english_text in EDUCATION_TRANSLATION_DICT:
        return EDUCATION_TRANSLATION_DICT[english_text]
    
    # Nếu không có trong dictionary, dịch theo pattern
    text = english_text.lower().strip()
    
    # Áp dụng các pattern từ dictionary
    translated = text
    for english_term, vietnamese_term in EDUCATION_TRANSLATION_DICT.items():
        # Sử dụng word boundary để tránh thay thế nhầm
        pattern = r'\b' + re.escape(english_term.lower()) + r'\b'
        translated = re.sub(pattern, vietnamese_term, translated, flags=re.IGNORECASE)
    
    # Capitalize first letter
    if translated:
        translated = translated[0].upper() + translated[1:]
    
    return translated

async def translate_all_education_pct():
    DATABASE_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        print('🌐 BẮT ĐẦU DỊCH TOÀN BỘ EDUCATION PCT')
        print('=' * 50)
        
        # Lấy tất cả records cần dịch
        query = '''
        SELECT id, element_name_en, element_name_vn, category_description_en, category_description_vn 
        FROM core.career_education_pct 
        ORDER BY id;
        '''
        records = await conn.fetch(query)
        
        total_records = len(records)
        print(f'📊 Tổng số records cần dịch: {total_records}')
        
        # Dịch từng batch
        batch_size = 100
        translated_count = 0
        
        for i in range(0, total_records, batch_size):
            batch = records[i:i + batch_size]
            
            print(f'🔄 Đang dịch batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size}...')
            
            # Chuẩn bị batch update
            updates = []
            for record in batch:
                record_id = record['id']
                
                # Dịch element_name
                element_en = record['element_name_en']
                element_vn_new = translate_education_text(element_en)
                
                # Dịch category_description
                category_en = record['category_description_en']
                category_vn_new = translate_education_text(category_en) if category_en else None
                
                # Chỉ update nếu có thay đổi
                current_element_vn = record['element_name_vn']
                current_category_vn = record['category_description_vn']
                
                if (element_vn_new != current_element_vn) or (category_vn_new != current_category_vn):
                    updates.append((record_id, element_vn_new, category_vn_new))
                    translated_count += 1
            
            # Thực hiện batch update
            if updates:
                update_query = '''
                UPDATE core.career_education_pct 
                SET element_name_vn = $2, 
                    category_description_vn = $3,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $1;
                '''
                await conn.executemany(update_query, updates)
            
            # Progress report
            progress = ((i + len(batch)) / total_records) * 100
            print(f'   ✅ Hoàn thành: {progress:.1f}% ({translated_count} records đã dịch)')
            
            # Nghỉ ngắn để tránh overload
            await asyncio.sleep(0.1)
        
        print(f'\n🎉 HOÀN THÀNH DỊCH THUẬT!')
        print(f'📈 Tổng số records đã dịch: {translated_count}/{total_records}')
        
        await conn.close()
        
    except Exception as e:
        print(f'❌ Lỗi: {e}')

if __name__ == '__main__':
    asyncio.run(translate_all_education_pct())