#!/usr/bin/env python3
"""
Script dịch lại những tasks có từ tiếng Anh từ ID > 12846
"""
import psycopg2
import time
import re
from datetime import datetime

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False
    print("⚠️  Cần cài: pip install deep-translator")

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
    print("🌐 DỊCH LẠI TASKS CÓ TỪ TIẾNG ANH TỪ ID > 12846")
    print("=" * 60)
    print(f"Bắt đầu lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    if not TRANSLATOR_AVAILABLE:
        print("❌ Cần cài đặt thư viện: pip install deep-translator")
        return
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    # Tìm tất cả tasks có từ tiếng Anh từ ID > 12846
    print("🔍 Tìm tasks có từ tiếng Anh từ ID > 12846...")
    cur.execute(r"""
        SELECT id, task_en, task_vi
        FROM core.career_tasks 
        WHERE id > 12846 
        AND task_vi ~* '\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b'
        ORDER BY id
    """)
    
    tasks_with_english = cur.fetchall()
    total_tasks = len(tasks_with_english)
    
    if total_tasks == 0:
        print("✅ Không tìm thấy task nào có từ tiếng Anh từ ID > 12846!")
        return
    
    print(f"📊 Tìm thấy {total_tasks:,} tasks có từ tiếng Anh")
    print()
    
    # Dịch từng task
    fixed_count = 0
    
    for i, (task_id, task_en, task_vi) in enumerate(tasks_with_english):
        print(f"📝 [{i+1}/{total_tasks}] ID {task_id}:")
        
        # Hiển thị từ tiếng Anh hiện có
        english_words = re.findall(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b', task_vi, re.I)
        print(f"  ❌ Hiện tại: {task_vi[:80]}...")
        print(f"  🔤 Từ tiếng Anh: {', '.join(english_words[:5])}")
        
        # Dịch lại từ task_en gốc
        print(f"  🔄 Dịch lại từ: {task_en[:60]}...")
        new_translation = translate_text(task_en)
        
        if new_translation and new_translation != task_en:
            # Kiểm tra xem bản dịch mới có còn từ tiếng Anh không
            new_english_words = re.findall(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b', new_translation, re.I)
            
            if len(new_english_words) < len(english_words):
                # Bản dịch mới tốt hơn
                cur.execute(
                    "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                    (new_translation, task_id)
                )
                conn.commit()
                fixed_count += 1
                
                print(f"  ✅ Cập nhật: {new_translation[:80]}...")
                if new_english_words:
                    print(f"  ⚠️  Vẫn còn: {', '.join(new_english_words[:3])}")
                else:
                    print(f"  🎉 Hoàn toàn tiếng Việt!")
            else:
                print(f"  ⚠️  Bản dịch mới không tốt hơn: {new_translation[:60]}...")
        else:
            print(f"  ❌ Không dịch được")
        
        print()
        
        # Delay để tránh rate limit
        time.sleep(2)
        
        # Hiển thị tiến độ mỗi 10 tasks
        if (i + 1) % 10 == 0:
            print(f"📊 Tiến độ: {i+1}/{total_tasks} ({((i+1)/total_tasks)*100:.1f}%) - Đã fix: {fixed_count}")
            print("-" * 40)
    
    # Thống kê cuối cùng
    print("=" * 60)
    print("📈 THỐNG KÊ CUỐI CÙNG")
    print("=" * 60)
    print(f"   - Tổng tasks có từ tiếng Anh: {total_tasks:,}")
    print(f"   - Đã cải thiện: {fixed_count:,}")
    print(f"   - Tỷ lệ cải thiện: {(fixed_count/total_tasks)*100:.1f}%")
    
    # Kiểm tra lại
    cur.execute(r"""
        SELECT COUNT(*)
        FROM core.career_tasks 
        WHERE id > 12846 
        AND task_vi ~* '\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b'
    """)
    remaining = cur.fetchone()[0]
    
    print(f"   - Còn lại có từ tiếng Anh: {remaining:,}")
    
    if remaining == 0:
        print("\n🎊 HOÀN THÀNH! Không còn task nào có từ tiếng Anh từ ID > 12846!")
    else:
        print(f"\n⏸️  Còn {remaining:,} tasks cần dịch tiếp.")
    
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