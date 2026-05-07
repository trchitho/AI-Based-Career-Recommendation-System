import asyncio
import asyncpg

async def restructure_education_pct():
    DATABASE_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        print('🔧 CHUẨN HÓA CẤU TRÚC BẢNG core.career_education_pct')
        print('=' * 60)
        
        # 1. BACKUP DỮ LIỆU HIỆN TẠI
        print('📦 Tạo backup...')
        await conn.execute('CREATE TABLE IF NOT EXISTS core.career_education_pct_backup AS SELECT * FROM core.career_education_pct;')
        
        # 2. THÊM CỘT MỚI VỚI TÊN CHUẨN
        print('🔧 Thêm cột mới với tên chuẩn production...')
        
        # Thêm cột element_name_en và element_name_vn
        await conn.execute('ALTER TABLE core.career_education_pct ADD COLUMN IF NOT EXISTS element_name_en VARCHAR(255);')
        await conn.execute('ALTER TABLE core.career_education_pct ADD COLUMN IF NOT EXISTS element_name_vn VARCHAR(255);')
        
        # Thêm cột category_description_en và category_description_vn
        await conn.execute('ALTER TABLE core.career_education_pct ADD COLUMN IF NOT EXISTS category_description_en VARCHAR(255);')
        await conn.execute('ALTER TABLE core.career_education_pct ADD COLUMN IF NOT EXISTS category_description_vn VARCHAR(255);')
        
        # 3. COPY DỮ LIỆU TỪ CỘT CŨ SANG CỘT MỚI
        print('📋 Copy dữ liệu từ cột cũ sang cột mới...')
        
        # Copy element_name
        await conn.execute('UPDATE core.career_education_pct SET element_name_en = element_name WHERE element_name_en IS NULL;')
        await conn.execute('UPDATE core.career_education_pct SET element_name_vn = element_name_vi WHERE element_name_vn IS NULL;')
        
        # Copy category_description
        await conn.execute('UPDATE core.career_education_pct SET category_description_en = category_description WHERE category_description_en IS NULL;')
        await conn.execute('UPDATE core.career_education_pct SET category_description_vn = category_description_vi WHERE category_description_vn IS NULL;')
        
        # 4. XÓA CỘT CŨ
        print('🗑️ Xóa cột cũ...')
        await conn.execute('ALTER TABLE core.career_education_pct DROP COLUMN IF EXISTS element_name;')
        await conn.execute('ALTER TABLE core.career_education_pct DROP COLUMN IF EXISTS element_name_vi;')
        await conn.execute('ALTER TABLE core.career_education_pct DROP COLUMN IF EXISTS category_description;')
        await conn.execute('ALTER TABLE core.career_education_pct DROP COLUMN IF EXISTS category_description_vi;')
        
        # 5. ĐẶT LẠI CONSTRAINT
        print('⚙️ Đặt lại constraints...')
        await conn.execute('ALTER TABLE core.career_education_pct ALTER COLUMN element_name_en SET NOT NULL;')
        await conn.execute('ALTER TABLE core.career_education_pct ALTER COLUMN element_name_vn SET NOT NULL;')
        
        # 6. THÊM COMMENT CHO CÁC CỘT MỚI
        print('📝 Thêm comments...')
        await conn.execute("COMMENT ON COLUMN core.career_education_pct.element_name_en IS 'Education element name in English';")
        await conn.execute("COMMENT ON COLUMN core.career_education_pct.element_name_vn IS 'Education element name in Vietnamese';")
        await conn.execute("COMMENT ON COLUMN core.career_education_pct.category_description_en IS 'Education category description in English';")
        await conn.execute("COMMENT ON COLUMN core.career_education_pct.category_description_vn IS 'Education category description in Vietnamese';")
        
        # 7. TẠO LẠI INDEX CHO CỘT TIẾNG VIỆT
        print('🔍 Tạo lại indexes...')
        await conn.execute('DROP INDEX IF EXISTS core.idx_career_education_pct_category_vi_gin;')
        await conn.execute('DROP INDEX IF EXISTS core.idx_career_education_pct_element_vi_gin;')
        
        await conn.execute('''
        CREATE INDEX IF NOT EXISTS idx_career_education_pct_category_vn_gin
            ON core.career_education_pct USING gin
            (to_tsvector('simple'::regconfig, category_description_vn))
            TABLESPACE pg_default;
        ''')
        
        await conn.execute('''
        CREATE INDEX IF NOT EXISTS idx_career_education_pct_element_vn_gin
            ON core.career_education_pct USING gin
            (to_tsvector('simple'::regconfig, element_name_vn))
            TABLESPACE pg_default;
        ''')
        
        print('✅ Chuẩn hóa cấu trúc thành công!')
        
        # 8. KIỂM TRA KẾT QUẢ
        print('\n🔍 KIỂM TRA CẤU TRÚC MỚI:')
        columns_query = '''
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'career_education_pct'
        AND column_name LIKE '%name%' OR column_name LIKE '%description%'
        ORDER BY ordinal_position;
        '''
        columns = await conn.fetch(columns_query)
        
        for col in columns:
            print(f'  - {col["column_name"]}: {col["data_type"]} (nullable: {col["is_nullable"]})')
        
        await conn.close()
        
    except Exception as e:
        print(f'❌ Lỗi: {e}')

if __name__ == '__main__':
    asyncio.run(restructure_education_pct())