#!/usr/bin/env python3
"""
Script dịch tự động tất cả tasks có từ tiếng Anh từ ID > 12846
Batch size lớn để chạy nhanh hơn
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
BATCH_SIZE = 20  # Tăng batch size để chạy nhanh hơn

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

def has_english_words(text):
    """Kiểm tra xem có từ tiếng Anh không"""
    if not text:
        return False, []
    
    english_words = ['and', 'the', 'of', 'for', 'with', 'or', 'to', 'in', 'is', 'are', 'from', 'by', 'as', 'at', 'on', 'be', 'have', 'has', 'will', 'can', 'may', 'must', 'should', 'would', 'could', 'do', 'does', 'did', 'get', 'make', 'take', 'give', 'go', 'come', 'see', 'know', 'think', 'say', 'tell', 'ask', 'work', 'use', 'find', 'help', 'try', 'call', 'need', 'want', 'look', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull', 'perform', 'duties', 'required', 'customers', 'information', 'services', 'records', 'procedures', 'equipment', 'materials', 'documents', 'applications']
    
    text_lower = text.lower()
    found_words = []
    for word in english_words:
        if word in text_lower:
            found_words.append(word)
    
    return len(found_words) > 0, found_words

def main():
    print("=" * 60)
    print("🌐 DỊCH TỰ ĐỘNG TẤT CẢ TASKS - ID > 12846")
    print("=" * 60)
    print(f"Bắt đầu lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Batch size: {BATCH_SIZE}")
    print()
    
    if not TRANSLATOR_AVAILABLE:
        print("❌ Cần cài đặt: pip install deep-translator")
        return
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    # Đếm tổng số tasks có từ tiếng Anh
    print("🔍 Đếm tasks có từ tiếng Anh...")
    cur.execute("""
        SELECT COUNT(*) FROM core.career_tasks 
        WHERE id > 12846 
        AND (task_vi LIKE '%and%' OR task_vi LIKE '%the%' OR task_vi LIKE '%of%' 
             OR task_vi LIKE '%for%' OR task_vi LIKE '%with%' OR task_vi LIKE '%or%'
             OR task_vi LIKE '%to%' OR task_vi LIKE '%in%' OR task_vi LIKE '%is%'
             OR task_vi LIKE '%are%' OR task_vi LIKE '%from%' OR task_vi LIKE '%by%'
             OR task_vi LIKE '%as%' OR task_vi LIKE '%at%' OR task_vi LIKE '%on%'
             OR task_vi LIKE '%perform%' OR task_vi LIKE '%duties%' OR task_vi LIKE '%required%'
             OR task_vi LIKE '%customers%' OR task_vi LIKE '%information%' OR task_vi LIKE '%services%')
    """)
    total_with_english = cur.fetchone()[0]
    
    print(f"📊 Tìm thấy {total_with_english:,} tasks có từ tiếng Anh")
    
    if total_with_english == 0:
        print("✅ Không có task nào cần dịch!")
        return
    
    # Lấy tasks theo batch và dịch tự động
    offset = 0
    total_fixed = 0
    round_count = 0
    
    while True:
        round_count += 1
        print(f"\n📊 ROUND {round_count} - Offset {offset}")
        
        # Lấy batch tasks
        cur.execute("""
            SELECT id, task_en, task_vi 
            FROM core.career_tasks 
            WHERE id > 12846 
            AND (task_vi LIKE '%and%' OR task_vi LIKE '%the%' OR task_vi LIKE '%of%' 
                 OR task_vi LIKE '%for%' OR task_vi LIKE '%with%' OR task_vi LIKE '%or%'
                 OR task_vi LIKE '%to%' OR task_vi LIKE '%in%' OR task_vi LIKE '%is%'
                 OR task_vi LIKE '%are%' OR task_vi LIKE '%from%' OR task_vi LIKE '%by%'
                 OR task_vi LIKE '%as%' OR task_vi LIKE '%at%' OR task_vi LIKE '%on%'
                 OR task_vi LIKE '%perform%' OR task_vi LIKE '%duties%' OR task_vi LIKE '%required%'
                 OR task_vi LIKE '%customers%' OR task_vi LIKE '%information%' OR task_vi LIKE '%services%')
            ORDER BY id
            LIMIT %s OFFSET %s
        """, (BATCH_SIZE, offset))
        
        batch_tasks = cur.fetchall()
        
        if not batch_tasks:
            print("✅ Không còn tasks nào cần dịch!")
            break
        
        print(f"Xử lý {len(batch_tasks)} tasks (ID {batch_tasks[0][0]} - {batch_tasks[-1][0]})")
        
        batch_fixed = 0
        
        for i, (task_id, task_en, task_vi) in enumerate(batch_tasks):
            print(f"  📝 [{i+1}/{len(batch_tasks)}] ID {task_id}:")
            
            # Kiểm tra từ tiếng Anh hiện có
            has_eng, eng_words = has_english_words(task_vi)
            if has_eng:
                print(f"    ❌ Hiện tại: {task_vi[:60]}... [Có: {', '.join(eng_words[:3])}]")
                
                # Dịch lại từ task_en gốc
                new_translation = translate_text(task_en)
                
                if new_translation and new_translation != task_en:
                    # Kiểm tra bản dịch mới
                    new_has_eng, new_eng_words = has_english_words(new_translation)
                    
                    # Cập nhật nếu bản dịch mới tốt hơn hoặc ít nhất không tệ hơn
                    if len(new_eng_words) <= len(eng_words):
                        cur.execute(
                            "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                            (new_translation, task_id)
                        )
                        conn.commit()
                        batch_fixed += 1
                        total_fixed += 1
                        
                        if new_has_eng:
                            print(f"    ⚠️  Cập nhật: {new_translation[:60]}... [Còn: {', '.join(new_eng_words[:2])}]")
                        else:
                            print(f"    ✅ Cập nhật: {new_translation[:60]}... [100% Tiếng Việt!]")
                    else:
                        print(f"    ⚠️  Bản dịch mới không tốt hơn")
                else:
                    print(f"    ❌ Không dịch được")
            else:
                print(f"    ✅ Đã OK: {task_vi[:60]}...")
            
            # Delay ngắn
            time.sleep(0.5)
        
        print(f"\n✅ Round {round_count}: Fixed {batch_fixed}/{len(batch_tasks)} tasks")
        print(f"📊 Tổng đã fix: {total_fixed:,} tasks")
        
        offset += BATCH_SIZE
        
        # Nghỉ giữa các rounds
        time.sleep(2)
        
        # Giới hạn để tránh chạy quá lâu (có thể bỏ giới hạn này)
        if round_count >= 100:  # Tối đa 100 rounds = 2000 tasks
            print("⏸️  Đã chạy 100 rounds, tạm dừng")
            break
    
    # Thống kê cuối cùng
    print("\n" + "=" * 60)
    print("📈 THỐNG KÊ CUỐI CÙNG")
    print("=" * 60)
    
    # Đếm lại số tasks còn có từ tiếng Anh
    cur.execute("""
        SELECT COUNT(*) FROM core.career_tasks 
        WHERE id > 12846 
        AND (task_vi LIKE '%and%' OR task_vi LIKE '%the%' OR task_vi LIKE '%of%' 
             OR task_vi LIKE '%for%' OR task_vi LIKE '%with%' OR task_vi LIKE '%or%'
             OR task_vi LIKE '%to%' OR task_vi LIKE '%in%' OR task_vi LIKE '%is%'
             OR task_vi LIKE '%are%' OR task_vi LIKE '%from%' OR task_vi LIKE '%by%'
             OR task_vi LIKE '%as%' OR task_vi LIKE '%at%' OR task_vi LIKE '%on%'
             OR task_vi LIKE '%perform%' OR task_vi LIKE '%duties%' OR task_vi LIKE '%required%'
             OR task_vi LIKE '%customers%' OR task_vi LIKE '%information%' OR task_vi LIKE '%services%')
    """)
    remaining_with_english = cur.fetchone()[0]
    
    print(f"   - Ban đầu có từ tiếng Anh: {total_with_english:,}")
    print(f"   - Đã cải thiện: {total_fixed:,}")
    print(f"   - Còn lại có từ tiếng Anh: {remaining_with_english:,}")
    print(f"   - Giảm: {total_with_english - remaining_with_english:,}")
    print(f"   - Số rounds: {round_count}")
    
    if remaining_with_english == 0:
        print("\n🎊 HOÀN THÀNH! Không còn task nào có từ tiếng Anh từ ID > 12846!")
    else:
        print(f"\n⏸️  Còn {remaining_with_english:,} tasks có từ tiếng Anh. Chạy lại script để tiếp tục.")
    
    print(f"Kết thúc lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Script bị dừng bởi người dùng (Ctrl+C)")
    except Exception as e:
        print(f"\n\n❌ Lỗi: {e}")