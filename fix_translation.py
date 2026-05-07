#!/usr/bin/env python3
"""
Script dịch đơn giản nhất cho tasks có từ tiếng Anh từ ID > 12846
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
    print("🌐 FIX TRANSLATION - ID > 12846")
    print("=" * 60)
    
    if not TRANSLATOR_AVAILABLE:
        print("❌ Cần cài: pip install deep-translator")
        return
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    # Lấy 20 tasks đầu tiên có từ 'and'
    print("🔍 Lấy 20 tasks có từ 'and' đầu tiên...")
    cur.execute("""
        SELECT id, task_en, task_vi 
        FROM core.career_tasks 
        WHERE id > 12846 AND task_vi LIKE '%and%'
        ORDER BY id
        LIMIT 20
    """)
    
    tasks = cur.fetchall()
    print(f"📊 Tìm thấy {len(tasks)} tasks")
    
    fixed_count = 0
    
    for i, (task_id, task_en, task_vi) in enumerate(tasks):
        print(f"\n📝 [{i+1}/20] ID {task_id}:")
        print(f"  Hiện tại: {task_vi[:100]}...")
        print(f"  Gốc EN: {task_en[:100]}...")
        
        # Dịch lại
        new_translation = translate_text(task_en)
        
        if new_translation and new_translation != task_en:
            print(f"  Dịch mới: {new_translation[:100]}...")
            
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
                print(f"  ✅ ĐÃ CẬP NHẬT! (Giảm từ {old_and_count} xuống {new_and_count} từ 'and')")
            else:
                print(f"  ⚠️  Không cải thiện (vẫn {new_and_count} từ 'and')")
        else:
            print(f"  ❌ Không dịch được")
        
        time.sleep(2)  # Delay
    
    print(f"\n📈 KẾT QUẢ: Đã cải thiện {fixed_count}/20 tasks")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()