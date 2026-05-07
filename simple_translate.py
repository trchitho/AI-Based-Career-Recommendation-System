#!/usr/bin/env python3
"""
Script dịch đơn giản nhất - chỉ dịch những tasks có từ 'and', 'the', 'of'
"""
import psycopg2
import time
from datetime import datetime

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def translate_text(text):
    """Dịch một đoạn text"""
    if not TRANSLATOR_AVAILABLE:
        return None
    
    try:
        translator = GoogleTranslator(source='en', target='vi')
        result = translator.translate(text)
        return result.strip() if result else None
    except Exception as e:
        print(f"    ❌ Lỗi dịch: {str(e)[:50]}")
        return None

def main():
    print("=" * 60)
    print("🌐 DỊCH ĐƠN GIẢN - CHỈ DỊCH TASKS CÓ 'and', 'the', 'of'")
    print("=" * 60)
    
    if not TRANSLATOR_AVAILABLE:
        print("❌ Cần cài: pip install deep-translator")
        return
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    # Đếm tasks có từ 'and'
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%and%'")
    count_and = cur.fetchone()[0]
    
    # Đếm tasks có từ 'the'
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%the%'")
    count_the = cur.fetchone()[0]
    
    # Đếm tasks có từ 'of'
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%of%'")
    count_of = cur.fetchone()[0]
    
    print(f"📊 Tasks có 'and': {count_and}")
    print(f"📊 Tasks có 'the': {count_the}")
    print(f"📊 Tasks có 'of': {count_of}")
    
    # Dịch tasks có từ 'and' trước
    if count_and > 0:
        print(f"\n🔄 Bắt đầu dịch {count_and} tasks có từ 'and'...")
        
        cur.execute("""
            SELECT id, task_en, task_vi 
            FROM core.career_tasks 
            WHERE id > 12846 AND task_vi LIKE '%and%'
            ORDER BY id
            LIMIT 50
        """)
        
        tasks = cur.fetchall()
        print(f"Lấy {len(tasks)} tasks đầu tiên")
        
        fixed_count = 0
        
        for i, (task_id, task_en, task_vi) in enumerate(tasks):
            print(f"\n📝 [{i+1}/50] ID {task_id}:")
            print(f"  Hiện tại: {task_vi[:80]}...")
            
            # Dịch lại
            new_translation = translate_text(task_en)
            
            if new_translation and new_translation != task_en:
                # Kiểm tra xem có cải thiện không
                old_and_count = task_vi.count('and')
                new_and_count = new_translation.count('and')
                
                if new_and_count < old_and_count:
                    # Cập nhật
                    cur.execute(
                        "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                        (new_translation, task_id)
                    )
                    conn.commit()
                    fixed_count += 1
                    print(f"  ✅ CẬP NHẬT! Giảm từ {old_and_count} xuống {new_and_count} từ 'and'")
                    print(f"  Mới: {new_translation[:80]}...")
                else:
                    print(f"  ⚠️  Không cải thiện (vẫn {new_and_count} từ 'and')")
            else:
                print(f"  ❌ Không dịch được")
            
            time.sleep(1)  # Delay
        
        print(f"\n📈 KẾT QUẢ: Đã cải thiện {fixed_count}/50 tasks có từ 'and'")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()