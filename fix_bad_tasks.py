"""
Fix các tasks còn dịch nửa vời (có tiếng Anh trong task_vi)
Target cụ thể những rows cần sửa
"""
import psycopg2
import google.generativeai as genai
import json, time, re

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

# Keys mới
API_KEYS = [
    'AIzaSyCmDN_-Xp1aKeQe3HfIM543es389noFxIo',
    'AIzaSyBmTXXWX5R8o4f07qKAI-wAhQ1wkqglgc8',
    'AIzaSyDCHWowpvAOBdFxHXjrmkDGqCdsD_WNHFg',
    'AIzaSyBayzyW2IQ6FdS1wFOUdv9P74ADoc6-2VY',
    'AIzaSyCanhYmKcAxCdBvYI3N0rKcem0UUy_qng4',
    'AIzaSyCeId0-zkTkTKi25fnXSIZU8UlYI40uEYM',
    'AIzaSyCKY-ZywUtVVsqmjjbQpGzV28JZ5oOa2a4',
    'AIzaSyChJ4wPMQG-NhYhHT2QWwgH4r4ZuYG-YK8',
    'AIzaSyCGQTU4-vPUZrMMvzYbOLmNTh1eKserUv0',
    'AIzaSyD8wwJbFb1nl64xlry1NJ1Ebk1oVQoGkFg',
    'AIzaSyBfG7skaSH2IZOcmvW04xQo7jke76T-BNs',
    'AIzaSyDXRApvCVigr-syyz3_oMeMmrdSRTlxIg8',
    'AIzaSyBXaLZB1XBvLd1bMVJ-GMhV8n-kF2B_tcE',
]
MODEL_NAME = 'gemini-2.5-flash'
_key_idx = 0

def get_key():
    global _key_idx
    key = API_KEYS[_key_idx % len(API_KEYS)]
    _key_idx += 1
    return key

def translate_single(task_en):
    """Dịch 1 task đơn lẻ"""
    prompt = f"""Bạn là chuyên gia dịch thuật tiếng Anh - tiếng Việt chuyên ngành nghề nghiệp.

Dịch câu mô tả nhiệm vụ công việc sau sang tiếng Việt:
"{task_en}"

Yêu cầu:
- Dịch HOÀN TOÀN sang tiếng Việt, KHÔNG để lại từ tiếng Anh nào
- Dịch đúng nghĩa, sát nghĩa, đúng chuyên ngành
- Câu văn tự nhiên, rõ ràng, chuyên nghiệp
- Chỉ trả về bản dịch tiếng Việt, không giải thích gì thêm"""

    for attempt in range(3):
        try:
            key = get_key()
            genai.configure(api_key=key)
            model = genai.GenerativeModel(MODEL_NAME)
            resp = model.generate_content(prompt)
            translation = resp.text.strip()
            
            # Kiểm tra không còn tiếng Anh
            if not re.search(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at)\b', translation, re.I):
                return translation
            else:
                print(f"  Attempt {attempt+1}: Vẫn còn tiếng Anh, thử lại...")
                time.sleep(1)
        except Exception as e:
            print(f"  Error attempt {attempt+1}: {str(e)[:60]}")
            time.sleep(2)
    
    return None

def main():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()

    # Lấy tất cả tasks còn tiếng Anh
    cur.execute(r"""
        SELECT id, task_en, task_vi 
        FROM core.career_tasks 
        WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\mor\M|\mto\M|\min\M|\mis\M|\mare\M|\mfrom\M|\mby\M|\mas\M|\mat\M'
        ORDER BY id
        LIMIT 50
    """)
    bad_tasks = cur.fetchall()
    
    print(f"Tìm thấy {len(bad_tasks)} tasks cần fix (lấy 50 đầu)")
    
    fixed = 0
    for task_id, task_en, task_vi in bad_tasks:
        print(f"\nID {task_id}:")
        print(f"  EN: {task_en[:80]}...")
        print(f"  VI cũ: {task_vi[:80]}...")
        
        new_vi = translate_single(task_en)
        if new_vi:
            cur.execute(
                "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                (new_vi, task_id)
            )
            conn.commit()
            fixed += 1
            print(f"  VI mới: {new_vi[:80]}... ✓")
        else:
            print(f"  FAIL: Không dịch được")
        
        time.sleep(1)  # Tiết kiệm quota
    
    print(f"\nĐã fix {fixed}/{len(bad_tasks)} tasks")
    
    # Kiểm tra lại
    cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\mor\M'""")
    remaining = cur.fetchone()[0]
    print(f"Còn lại {remaining} tasks có tiếng Anh")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
