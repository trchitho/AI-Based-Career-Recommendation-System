#!/usr/bin/env python3
"""
Kiểm tra đơn giản tasks từ ID > 12846
"""
import psycopg2

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def main():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    print("🔍 Kiểm tra 20 tasks đầu tiên từ ID > 12846:")
    cur.execute("""
        SELECT id, task_en, task_vi 
        FROM core.career_tasks 
        WHERE id > 12846 
        ORDER BY id 
        LIMIT 20
    """)
    
    for task_id, task_en, task_vi in cur.fetchall():
        print(f"\nID {task_id}:")
        print(f"  EN: {task_en}")
        print(f"  VI: {task_vi}")
        
        # Kiểm tra từ tiếng Anh
        if 'and' in task_vi or 'the' in task_vi or 'of' in task_vi:
            print(f"  ❌ CÓ TỪ TIẾNG ANH!")
        else:
            print(f"  ✅ OK")
    
    # Đếm tổng số
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846")
    total = cur.fetchone()[0]
    print(f"\n📊 Tổng số tasks từ ID > 12846: {total}")
    
    # Kiểm tra có từ 'and'
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%and%'")
    has_and = cur.fetchone()[0]
    print(f"📊 Tasks có từ 'and': {has_and}")
    
    # Kiểm tra có từ 'the'
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%the%'")
    has_the = cur.fetchone()[0]
    print(f"📊 Tasks có từ 'the': {has_the}")
    
    # Kiểm tra có từ 'of'
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%of%'")
    has_of = cur.fetchone()[0]
    print(f"📊 Tasks có từ 'of': {has_of}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()