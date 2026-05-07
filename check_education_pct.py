import asyncio
import asyncpg

async def check_education_pct():
    DATABASE_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        print('🔍 KIỂM TRA BẢNG core.career_education_pct')
        print('=' * 50)
        
        # 1. Kiểm tra cấu trúc bảng
        print('✅ CẤU TRÚC BẢNG:')
        columns_query = '''
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'career_education_pct'
        ORDER BY ordinal_position;
        '''
        columns = await conn.fetch(columns_query)
        
        for col in columns:
            print(f'  - {col["column_name"]}: {col["data_type"]} (nullable: {col["is_nullable"]})')
        
        # 2. Kiểm tra số lượng records
        count_query = 'SELECT COUNT(*) as total FROM core.career_education_pct;'
        total_count = await conn.fetchval(count_query)
        print(f'\n✅ TỔNG SỐ RECORDS: {total_count}')
        
        # 3. Kiểm tra ID sequence
        id_query = 'SELECT MIN(id) as min_id, MAX(id) as max_id FROM core.career_education_pct;'
        id_result = await conn.fetchrow(id_query)
        print(f'✅ ID RANGE: {id_result["min_id"]} - {id_result["max_id"]}')
        
        # 4. Kiểm tra dữ liệu mẫu
        print('\n✅ DỮ LIỆU MẪU (5 records đầu):')
        sample_query = '''
        SELECT id, onet_code, element_name, category_description, category_description_vi, element_name_vi 
        FROM core.career_education_pct 
        ORDER BY id 
        LIMIT 5;
        '''
        samples = await conn.fetch(sample_query)
        
        for sample in samples:
            print(f'  ID: {sample["id"]}')
            print(f'  ONET: {sample["onet_code"]}')
            print(f'  Element EN: {sample["element_name"]}')
            print(f'  Element VI: {sample["element_name_vi"]}')
            print(f'  Category EN: {sample["category_description"]}')
            print(f'  Category VI: {sample["category_description_vi"]}')
            print('  ---')
        
        # 5. Kiểm tra các cột tiếng Việt
        print('\n✅ KIỂM TRA CỘT TIẾNG VIỆT:')
        vi_check_query = '''
        SELECT 
            COUNT(*) as total,
            COUNT(category_description_vi) as has_cat_vi,
            COUNT(element_name_vi) as has_elem_vi,
            COUNT(CASE WHEN category_description_vi IS NOT NULL AND category_description_vi != '' THEN 1 END) as non_empty_cat_vi,
            COUNT(CASE WHEN element_name_vi IS NOT NULL AND element_name_vi != '' THEN 1 END) as non_empty_elem_vi
        FROM core.career_education_pct;
        '''
        vi_stats = await conn.fetchrow(vi_check_query)
        
        print(f'  Total records: {vi_stats["total"]}')
        print(f'  Has category_description_vi: {vi_stats["has_cat_vi"]}')
        print(f'  Has element_name_vi: {vi_stats["has_elem_vi"]}')
        print(f'  Non-empty category_description_vi: {vi_stats["non_empty_cat_vi"]}')
        print(f'  Non-empty element_name_vi: {vi_stats["non_empty_elem_vi"]}')
        
        # 6. Kiểm tra records có chứa tiếng Anh trong cột VI
        english_check_query = '''
        SELECT COUNT(*) as english_in_vi
        FROM core.career_education_pct 
        WHERE category_description_vi ~ '[A-Za-z]{3,}' OR element_name_vi ~ '[A-Za-z]{3,}';
        '''
        english_count = await conn.fetchval(english_check_query)
        print(f'  Records có tiếng Anh trong VI: {english_count}')
        
        await conn.close()
        
    except Exception as e:
        print(f'❌ Lỗi kết nối database: {e}')

if __name__ == '__main__':
    asyncio.run(check_education_pct())