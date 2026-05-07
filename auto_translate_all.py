#!/usr/bin/env python3
"""
Script tự động dịch HẾT TẤT CẢ tasks có từ tiếng Anh từ ID > 12846
Batch size 50 để chạy nhanh hơn
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
BATCH_SIZE = 50  # Batch size lớn để chạy nhanh

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

def count_english_words(text):
    """Đếm số từ tiếng Anh trong text"""
    if not text:
        return 0
    
    english_words = ['and', 'the', 'of', 'for', 'with', 'or', 'to', 'in', 'is', 'are', 'from', 'by', 'as', 'at', 'on', 'perform', 'duties', 'required', 'customers', 'information', 'services']
    
    text_lower = text.lower()
    count = 0
    for word in english_words:
        count += text_lower.count(word)
    
    return count

def main():
    print("=" * 60)
    print("🚀 TỰ ĐỘNG DỊCH HẾT TẤT CẢ TASKS - ID > 12846")
    print("=" * 60)
    print(f"Bắt đầu lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Batch size: {BATCH_SIZE}")
    print()
    
    if not TRANSLATOR_AVAILABLE:
        print("❌ Cần cài đặt: pip install deep-translator")
        return
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    total_fixed = 0
    round_count = 0
    
    # Danh sách các từ tiếng Anh cần dịch
    english_words_to_fix = ['and', 'the', 'of', 'for', 'with', 'or', 'to', 'in', 'is', 'are', 'from', 'by', 'as', 'at', 'on', 'perform', 'duties', 'required', 'customers', 'information', 'services']
    
    for word in english_words_to_fix:
        print(f"\n🔄 DỊCH TẤT CẢ TASKS CÓ TỪ '{word.upper()}'")
        print("=" * 50)
        
        # Đếm số tasks có từ này
        cur.execute(f"SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%{word}%'")
        total_with_word = cur.fetchone()[0]
        
        if total_with_word == 0:
            print(f"✅ Không có task nào có từ '{word}'")
            continue
        
        print(f"📊 Tìm thấy {total_with_word:,} tasks có từ '{word}'")
        
        offset = 0
        word_fixed = 0
        
        while True:
            round_count += 1
            print(f"\n📊 Round {round_count} - Từ '{word}' - Offset {offset}")
            
            # Lấy batch tasks có từ này
            cur.execute(f"""
                SELECT id, task_en, task_vi 
                FROM core.career_tasks 
                WHERE id > 12846 AND task_vi LIKE '%{word}%'
                ORDER BY id
                LIMIT {BATCH_SIZE} OFFSET {offset}
            """)
            
            batch_tasks = cur.fetchall()
            
            if not batch_tasks:
                print(f"✅ Đã dịch hết tất cả tasks có từ '{word}'!")
                break
            
            print(f"Xử lý {len(batch_tasks)} tasks (ID {batch_tasks[0][0]} - {batch_tasks[-1][0]})")
            
            batch_fixed = 0
            
            for i, (task_id, task_en, task_vi) in enumerate(batch_tasks):
                # Đếm từ tiếng Anh hiện có
                old_count = count_english_words(task_vi)
                
                if old_count > 0:
                    # Dịch lại từ task_en gốc
                    new_translation = translate_text(task_en)
                    
                    if new_translation and new_translation != task_en:
                        # Đếm từ tiếng Anh trong bản dịch mới
                        new_count = count_english_words(new_translation)
                        
                        # Cập nhật nếu bản dịch mới tốt hơn hoặc bằng
                        if new_count <= old_count:
                            cur.execute(
                                "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                                (new_translation, task_id)
                            )
                            conn.commit()
                            batch_fixed += 1
                            word_fixed += 1
                            total_fixed += 1
                            
                            if new_count == 0:
                                print(f"  ✅ ID {task_id}: 100% Tiếng Việt! (Giảm {old_count} từ)")
                            else:
                                print(f"  ⚠️  ID {task_id}: Cải thiện (Giảm từ {old_count} xuống {new_count} từ)")
                        else:
                            print(f"  ⚠️  ID {task_id}: Bản dịch mới không tốt hơn")
                    else:
                        print(f"  ❌ ID {task_id}: Không dịch được")
                else:
                    print(f"  ✅ ID {task_id}: Đã OK")
                
                # Delay ngắn để tránh rate limit
                if i % 10 == 0:  # Delay mỗi 10 tasks
                    time.sleep(1)
            
            print(f"✅ Batch: Fixed {batch_fixed}/{len(batch_tasks)} tasks")
            
            offset += BATCH_SIZE
            
            # Nghỉ giữa các batches
            time.sleep(2)
        
        print(f"🎉 Hoàn thành từ '{word}': Đã cải thiện {word_fixed:,} tasks")
    
    # Thống kê cuối cùng
    print("\n" + "=" * 60)
    print("🎊 HOÀN THÀNH TẤT CẢ!")
    print("=" * 60)
    
    # Đếm lại tổng số tasks còn có từ tiếng Anh
    remaining_counts = {}
    total_remaining = 0
    
    for word in english_words_to_fix:
        cur.execute(f"SELECT COUNT(*) FROM core.career_tasks WHERE id > 12846 AND task_vi LIKE '%{word}%'")
        count = cur.fetchone()[0]
        remaining_counts[word] = count
        total_remaining += count
    
    print(f"📈 THỐNG KÊ CUỐI CÙNG:")
    print(f"   - Tổng đã cải thiện: {total_fixed:,} tasks")
    print(f"   - Số rounds: {round_count}")
    
    print(f"\n📊 TASKS CÒN LẠI CÓ TỪ TIẾNG ANH:")
    for word, count in remaining_counts.items():
        if count > 0:
            print(f"   - '{word}': {count:,} tasks")
    
    if total_remaining == 0:
        print("\n🎊 CHÚC MỪNG! ĐÃ DỊCH HOÀN THÀNH 100% TẤT CẢ TASKS!")
        print("🌟 Không còn một từ tiếng Anh nào từ ID > 12846!")
    else:
        print(f"\n⏸️  Còn {total_remaining:,} tasks có từ tiếng Anh. Chạy lại script để tiếp tục.")
    
    print(f"\nKết thúc lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Script bị dừng bởi người dùng (Ctrl+C)")
        print("💡 Có thể chạy lại script để tiếp tục từ chỗ dừng")
    except Exception as e:
        print(f"\n\n❌ Lỗi: {e}")
        print("💡 Có thể chạy lại script để tiếp tục")