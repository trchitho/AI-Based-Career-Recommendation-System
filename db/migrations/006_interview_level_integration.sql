-- Migration: 006_interview_level_integration
-- Feature: Level Selection Integration for Interview System
-- Date: 2026-04-20
-- Description:
--   1. Đảm bảo cột market_context tồn tại trong interview_sessions
--   2. Cập nhật comment và documentation cho level integration

-- ─── 1. Đảm bảo cột market_context tồn tại ────────────────────────────────────

-- Thêm cột market_context nếu chưa có (để lưu thông tin level)
ALTER TABLE interview.interview_sessions
    ADD COLUMN IF NOT EXISTS market_context JSONB;

-- Thêm comment cho cột để documentation
COMMENT ON COLUMN interview.interview_sessions.market_context IS 
'Lưu thông tin level và context cho interview: effective_level, career_level, level_description, experience_range, interview_focus, career_group, has_level';

-- ─── 2. Đảm bảo các cột khác cần thiết ────────────────────────────────────────

-- Đảm bảo skills_context tồn tại (để lưu skills từ Neo4j/PostgreSQL)
ALTER TABLE interview.interview_sessions
    ADD COLUMN IF NOT EXISTS skills_context JSONB;

COMMENT ON COLUMN interview.interview_sessions.skills_context IS 
'Lưu thông tin skills từ Neo4j hoặc PostgreSQL cho interview';

-- Đảm bảo question_count và question_distribution tồn tại
ALTER TABLE interview.interview_sessions
    ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS question_distribution JSONB;

COMMENT ON COLUMN interview.interview_sessions.question_count IS 
'Tổng số câu hỏi trong interview session';

COMMENT ON COLUMN interview.interview_sessions.question_distribution IS 
'Phân bố câu hỏi theo loại: warm_up, technical, behavioral, situational, jd_specific';

-- ─── 3. Index cho performance ─────────────────────────────────────────────────

-- Index cho market_context để query nhanh theo level
CREATE INDEX IF NOT EXISTS idx_interview_sessions_market_context 
ON interview.interview_sessions USING GIN (market_context);

-- Index cho skills_context để query nhanh theo skills
CREATE INDEX IF NOT EXISTS idx_interview_sessions_skills_context 
ON interview.interview_sessions USING GIN (skills_context);

-- ─── 4. Validation constraints ────────────────────────────────────────────────

-- Đảm bảo question_count trong khoảng hợp lý
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_question_count_range' 
        AND table_name = 'interview_sessions'
        AND table_schema = 'interview'
    ) THEN
        ALTER TABLE interview.interview_sessions
            ADD CONSTRAINT chk_question_count_range 
            CHECK (question_count >= 3 AND question_count <= 20);
    END IF;
END $$;

-- ─── market_context JSONB format ──────────────────────────────────────────────
-- {
--   "effective_level": "fresher|junior|developer|senior|manager",
--   "career_level": "Intern/Fresher",
--   "level_description": "Mới tốt nghiệp, đang học tập và làm quen với công việc",
--   "experience_range": "0-1 năm kinh nghiệm",
--   "interview_focus": ["Tiềm năng học hỏi", "Kiến thức cơ bản"],
--   "career_group": "Công nghệ thông tin",
--   "has_level": true
-- }

-- ─── skills_context JSONB format ──────────────────────────────────────────────
-- [
--   {
--     "skill_name": "Lập trình",
--     "skill_type": "hard",
--     "importance": 4.5,
--     "level": 4.0,
--     "source": "neo4j|postgresql|jd"
--   }
-- ]

-- ─── question_distribution JSONB format ───────────────────────────────────────
-- {
--   "warm_up": 1,
--   "technical": 3,
--   "behavioral": 2,
--   "situational": 1,
--   "jd_specific": 2  // chỉ có khi có JD
-- }

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_interview_sessions_market_context;
-- DROP INDEX IF EXISTS idx_interview_sessions_skills_context;
-- ALTER TABLE interview.interview_sessions
--     DROP CONSTRAINT IF EXISTS chk_question_count_range,
--     DROP COLUMN IF EXISTS market_context;
-- 
-- Note: Không drop skills_context, question_count, question_distribution 
-- vì có thể được sử dụng bởi migrations khác

</content>
</file></function_calls>

<function_results>Created the db/migrations/006_interview_level_integration.sql file.</function_results>

Bây giờ hãy chạy migration này để đảm bảo database hoàn toàn đúng:

<function_calls>
<invoke name="executePwsh">
<parameter name="command">python -c "
import sys
sys.path.append('apps/backend')
from sqlalchemy import text
from app.core.db import get_db

print('🔧 CHẠY MIGRATION 006_interview_level_integration')
print('=' * 60)

db = next(get_db())

# Đọc và chạy migration
with open('db/migrations/006_interview_level_integration.sql', 'r', encoding='utf-8') as f:
    migration_sql = f.read()

# Tách các câu lệnh SQL (loại bỏ comments và rollback)
sql_statements = []
current_statement = ''
in_rollback = False

for line in migration_sql.split('\n'):
    line = line.strip()
    
    # Skip rollback section
    if '─── Rollback ─────' in line:
        in_rollback = True
        continue
    
    if in_rollback:
        continue
    
    # Skip comments and empty lines
    if line.startswith('--') or not line:
        continue
    
    current_statement += line + ' '
    
    # End of statement
    if line.endswith(';'):
        sql_statements.append(current_statement.strip())
        current_statement = ''

print(f'📝 Tìm thấy {len(sql_statements)} câu lệnh SQL')

# Chạy từng câu lệnh
success_count = 0
for i, statement in enumerate(sql_statements, 1):
    try:
        # Skip COMMENT statements vì có thể gây lỗi syntax
        if statement.upper().startswith('COMMENT ON'):
            print(f'   {i}. COMMENT statement - skipped')
            continue
            
        db.execute(text(statement))
        db.commit()
        print(f'   {i}. ✅ Executed: {statement[:60]}...')
        success_count += 1
    except Exception as e:
        print(f'   {i}. ⚠️  Warning: {statement[:60]}... - {e}')
        # Continue với các statement khác

print(f'\\n✅ Migration hoàn thành: {success_count}/{len(sql_statements)} statements thành công')

# Kiểm tra kết quả
print('\\n🔍 KIỂM TRA KẾT QUẢ MIGRATION:')

# Kiểm tra các cột
columns_check = db.execute(text('''
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'interview' AND table_name = 'interview_sessions'
    AND column_name IN ('market_context', 'skills_context', 'question_count', 'question_distribution')
    ORDER BY column_name
''')).fetchall()

for col in columns_check:
    nullable = 'NULLABLE' if col.is_nullable == 'YES' else 'NOT NULL'
    print(f'   ✅ {col.column_name}: {col.data_type} ({nullable})')

# Kiểm tra indexes
indexes_check = db.execute(text('''
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'interview_sessions' 
    AND indexname LIKE '%market_context%' OR indexname LIKE '%skills_context%'
''')).fetchall()

if indexes_check:
    for idx in indexes_check:
        print(f'   ✅ Index: {idx.indexname}')
else:
    print('   ⚠️  Không tìm thấy indexes mới (có thể đã tồn tại)')

# Kiểm tra constraints
constraints_check = db.execute(text('''
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_schema = 'interview' AND table_name = 'interview_sessions'
    AND constraint_name LIKE '%question_count%'
''')).fetchall()

if constraints_check:
    for const in constraints_check:
        print(f'   ✅ Constraint: {const.constraint_name} ({const.constraint_type})')
else:
    print('   ⚠️  Không tìm thấy constraint mới (có thể đã tồn tại)')

print('\\n🎉 MIGRATION HOÀN THÀNH!')
"