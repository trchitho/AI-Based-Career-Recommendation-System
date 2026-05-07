"""
Fix tasks theo thứ tự ID - ưu tiên rows đầu tiên
Chỉ dịch những tasks còn tiếng Anh
"""
import psycopg2
import google.generativeai as genai
import json, time, re

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
BATCH_SIZE = 10  # Batch nhỏ để tiết kiệm quota

# 13 Keys mới hoàn toàn
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
_dead_keys = set()

def get_key():
    global _key_idx
    alive = [k for k in API_KEYS if k not in _dead_keys]
    if not alive:
        return None
    key = alive[_key_idx % len(alive)]
    _key_idx += 1
    return key

def mark_dead(key):
    _dead_keys.add(key)
    alive = len(API_KEYS) - len(_dead_keys)
    print(f"  [KEY DEAD] ...{key[-6:]} | Còn sống: {alive}/{len(API_KEYS)}")

def clean_json(text):
    text = text.strip()
    text = re.sub(r'^```[a-z]*\s*', '', text)
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()

def translate_batch(tasks):
    """Dịch batch tasks"""
    numbered = '\n'.join(f'{i+1}. {t}' for i, t in enumerate(tasks))
    prompt = (
        "Ban la chuyen gia dich thuat tieng Anh - tieng Viet chuyen nganh nghe nghiep.\n\n"
        "Dich cac mo ta nhiem vu cong viec sau sang tieng Viet. Yeu cau bat buoc:\n"
        "- Dich HOAN TOAN sang tieng Viet, KHONG de lai bat ky tu tieng Anh nao\n"
        "- Dich dung nghia, sat nghia, dung chuyen nganh nghe nghiep\n"
        "- Cau van tu nhien, ro rang, chuyen nghiep\n"
        "- Giu nguyen y nghia goc, khong them bot noi dung\n"
        "- Tra ve JSON object voi key la so thu tu (1, 2, 3...) va value la ban dich tieng Viet\n\n"
        f"Cac nhiem vu can dich:\n{numbered}\n\n"
        'Tra ve JSON thuan tuy, khong co markdown:\n{"1": "ban dich 1", "2": "ban dich 2", ...}'
    )
    
    for attempt in range(3):
        key = get_key()
        if key is None:
            print("  [ALL KEYS DEAD] Dung lai.")
            return {}
        
        try:
            genai.configure(api_key=key)
            model = genai.GenerativeModel(MODEL_NAME)
            resp = model.generate_content(prompt)
            text = clean_json(resp.text)
            data = json.loads(text)
            
            result = {}
            for i, task in enumerate(tasks):
                k = str(i + 1)
                if k in data and data[k] and data[k].strip():
                    result[task] = data[k].strip()
            
            if len(result) >= len(tasks) * 0.8:  # Chấp nhận 80% thành công
                return result
            else:
                print(f"  Batch thiếu: {len(result)}/{len(tasks)}, thử lại...")
                time.sleep(3)
                
        except json.JSONDecodeError as e:
            print(f"  JSON error: {str(e)[:50]}")
            time.sleep(3)
        except Exception as e:
            err = str(e)
            if '429' in err or 'quota' in err.lower() or 'RESOURCE_EXHAUSTED' in err:
                mark_dead(key)
                time.sleep(5)  # Chờ lâu hơn khi hết quota
                continue
            elif '403' in err or 'leaked' in err.lower():
                mark_dead(key)
                continue
            elif '504' in err or 'timeout' in err.lower():
                print(f"  Timeout, retry...")
                time.sleep(5)
                continue
            else:
                print(f"  Error: {err[:60]}")
                time.sleep(3)
    
    return {}

def main():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()

    # Lấy tasks còn tiếng Anh, theo thứ tự ID tăng dần (ưu tiên rows đầu)
    cur.execute(r"""
        SELECT id, task_en 
        FROM core.career_tasks 
        WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\mor\M|\mto\M|\min\M|\mis\M|\mare\M|\mfrom\M|\mby\M|\mas\M|\mat\M'
        ORDER BY id
        LIMIT 200
    """)
    bad_tasks = cur.fetchall()
    
    print(f"Tim thay {len(bad_tasks)} tasks con tieng Anh (lay 200 dau theo ID)")
    print(f"So keys: {len(API_KEYS)} | Batch size: {BATCH_SIZE}")
    print(f"ID range: {bad_tasks[0][0]} - {bad_tasks[-1][0]}\n")

    # Nhóm thành batches
    task_en_list = [task_en for _, task_en in bad_tasks]
    id_map = {task_en: task_id for task_id, task_en in bad_tasks}
    
    batch_count = 0
    fixed = 0
    
    for i in range(0, len(task_en_list), BATCH_SIZE):
        batch = task_en_list[i:i+BATCH_SIZE]
        batch_count += 1
        total_batches = (len(task_en_list) + BATCH_SIZE - 1) // BATCH_SIZE
        
        alive_keys = len(API_KEYS) - len(_dead_keys)
        if alive_keys == 0:
            print("Tat ca keys het quota. Dung.")
            break
        
        # Hiển thị ID range của batch
        batch_ids = [id_map[task] for task in batch]
        id_range = f"ID {min(batch_ids)}-{max(batch_ids)}"
        
        print(f"Batch {batch_count}/{total_batches} ({id_range})...", end=' ', flush=True)
        
        translations = translate_batch(batch)
        
        if translations:
            # Update DB ngay
            for task_en, task_vi in translations.items():
                task_id = id_map[task_en]
                cur.execute(
                    "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                    (task_vi, task_id)
                )
                fixed += 1
            conn.commit()
            
            print(f"OK ({len(translations)}/{len(batch)}) | Fixed: {fixed}")
        else:
            print("FAIL (0 translations)")
        
        time.sleep(3)  # Chậm mà chắc - tiết kiệm quota

    print(f"\nDa fix {fixed} tasks")
    
    # Kiểm tra lại 5 rows đầu
    print("\n5 rows dau sau khi fix:")
    cur.execute("SELECT id, task_vi FROM core.career_tasks ORDER BY id LIMIT 5")
    for task_id, task_vi in cur.fetchall():
        has_english = bool(re.search(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at)\b', task_vi, re.I))
        status = "❌ Còn tiếng Anh" if has_english else "✅ OK"
        print(f"  ID {task_id}: {task_vi[:80]}... {status}")
    
    # Tổng kết
    cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\mor\M'""")
    remaining = cur.fetchone()[0]
    print(f"\nCon lai {remaining} tasks co tieng Anh")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()