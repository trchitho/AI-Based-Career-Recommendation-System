#!/usr/bin/env python3
"""
Script kiểm tra tình trạng dịch thuật từ ID 12847
"""
import psycopg2
import re

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def main():
    print("=" * 60)
    print("🔍 KIỂM TRA TÌNH TRẠNG DỊCH THUẬT TỪ ID 12847")
    print("=" * 60)
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    # Kiểm tra tổng số tasks từ ID 12847
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id >= 12847")
    total_from_12847 = cur.fetchone()[0]
    print(f"📊 Tổng số tasks từ ID 12847: {total_from_12847:,}")
    
    # Kiểm tra tasks có task_vi NULL hoặc rỗng
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id >= 12847 AND (task_vi IS NULL OR task_vi = '')")
    null_empty = cur.fetchone()[0]
    print(f"📊 Tasks có task_vi NULL/rỗng: {null_empty:,}")
    
    # Kiểm tra tasks có task_vi = task_en (chưa dịch)
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id >= 12847 AND task_vi = task_en")
    same_as_english = cur.fetchone()[0]
    print(f"📊 Tasks có task_vi = task_en: {same_as_english:,}")
    
    # Kiểm tra tasks có từ tiếng Anh trong task_vi
    cur.execute(r"""
        SELECT COUNT(*) 
        FROM core.career_tasks 
        WHERE id >= 12847 
        AND task_vi ~* '\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b'
    """)
    has_english = cur.fetchone()[0]
    print(f"📊 Tasks có từ tiếng Anh trong task_vi: {has_english:,}")
    
    # Lấy 10 ví dụ cụ thể từ ID 12847
    print(f"\n📝 10 ví dụ từ ID 12847:")
    cur.execute("""
        SELECT id, task_en, task_vi 
        FROM core.career_tasks 
        WHERE id >= 12847 
        ORDER BY id 
        LIMIT 10
    """)
    
    for task_id, task_en, task_vi in cur.fetchall():
        status = "✅ OK"
        if not task_vi or task_vi.strip() == '':
            status = "❌ NULL/Rỗng"
        elif task_vi == task_en:
            status = "❌ Chưa dịch"
        elif re.search(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b', task_vi, re.I):
            english_words = re.findall(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b', task_vi, re.I)
            status = f"❌ Có tiếng Anh: {', '.join(english_words[:3])}"
        
        print(f"  ID {task_id}: {status}")
        print(f"    EN: {task_en[:80]}...")
        print(f"    VI: {(task_vi or 'NULL')[:80]}...")
        print()
    
    # Tìm các tasks cần dịch
    print("🔍 Tìm tasks cần dịch từ ID 12847:")
    cur.execute(r"""
        SELECT id, task_en, task_vi
        FROM core.career_tasks 
        WHERE id >= 12847 
        AND (
            task_vi IS NULL 
            OR task_vi = '' 
            OR task_vi = task_en
            OR task_vi ~* '\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b'
        )
        ORDER BY id
        LIMIT 20
    """)
    
    need_translation = cur.fetchall()
    if need_translation:
        print(f"❌ Tìm thấy {len(need_translation)} tasks cần dịch:")
        for task_id, task_en, task_vi in need_translation:
            print(f"  ID {task_id}: {task_en[:50]}...")
            print(f"    VI hiện tại: {(task_vi or 'NULL')[:50]}...")
    else:
        print("✅ Không tìm thấy task nào cần dịch từ ID 12847!")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()