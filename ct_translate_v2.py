import psycopg2
import google.generativeai as genai
import json, time, re, os

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
BATCH_SIZE = 20  # Giảm từ 50 xuống 20 để tiết kiệm quota
PROGRESS_FILE = 'ct_progress.json'

# 13 keys mới + keys cũ (có thể đã reset quota)
API_KEYS = [
    # Keys mới nhất (batch 3)
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
    # Keys batch 2 (có thể đã reset)
    'AIzaSyAVVxKG8mLD8hU9njVYoptbUG9vq4fJwLw',
    'AIzaSyAJYIB07eUoUjkTx29ytlZz4gwox9jESlE',
    'AIzaSyBgiAqDBea4JrCIZRbCbYDFWHyycY0hKW8',
    'AIzaSyAleZ7e9_XGJPd0w5zV5DPfBeQNzjVFo7M',
    'AIzaSyDf2hz_CeKX7IDlCNHAcMa_nXskg5lxsCw',
    'AIzaSyBJBCX5C8GONtGi6tOoRjs1hhqkhUV4hzw',
    'AIzaSyDBTBo4LASyKuNi499q3NTkVTHEjSWvQYk',
    'AIzaSyAgdIp2dN3n7ncRi3h5hRQl1yw5py-SYzQ',
    'AIzaSyAy5HWgIx-4rlTZt8vv-OkL_ANQsppiLzU',
    'AIzaSyCBWowhIm181B569lStlBEXTPRxu-YMT4g',
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
    """Dịch 1 batch, chậm mà chắc"""
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
    
    for attempt in range(3):  # Chỉ thử 3 lần thay vì nhiều
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
            
            # Chỉ return nếu dịch được ít nhất 70%
            if len(result) >= len(tasks) * 0.7:
                return result
            else:
                print(f"  Batch thiếu: {len(result)}/{len(tasks)}, thử lại...")
                time.sleep(2)
                
        except json.JSONDecodeError as e:
            print(f"  JSON error: {str(e)[:50]}")
            time.sleep(2)
        except Exception as e:
            err = str(e)
            if '429' in err or 'quota' in err.lower() or 'RESOURCE_EXHAUSTED' in err:
                mark_dead(key)
                continue
            elif '403' in err or 'leaked' in err.lower():
                mark_dead(key)
                continue
            elif '504' in err or 'timeout' in err.lower():
                print(f"  Timeout, retry...")
                time.sleep(3)
                continue
            else:
                print(f"  Error: {err[:60]}")
                time.sleep(2)
    
    return {}

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_progress(cache):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def main():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()

    # Lấy tasks theo thứ tự ID (ưu tiên rows đầu tiên)
    # Chỉ lấy những tasks chưa có trong cache
    cache = load_progress()
    print(f"Da co trong cache: {len(cache)}")
    
    # Lấy tất cả tasks theo thứ tự ID, loại bỏ những cái đã có trong cache
    cur.execute("""
        SELECT DISTINCT task_en 
        FROM core.career_tasks 
        ORDER BY MIN(id)
    """)
    all_tasks_by_id = [r[0] for r in cur.fetchall()]
    print(f"Tong unique task_en (theo thu tu ID): {len(all_tasks_by_id)}")

    todo = [t for t in all_tasks_by_id if t not in cache]
    print(f"Con can dich: {len(todo)}")
    print(f"So keys: {len(API_KEYS)} | Batch size: {BATCH_SIZE} (cham ma chac)")
    print(f"Uoc tinh: ~{len(todo) // BATCH_SIZE} batches\n")

    batch_count = 0
    for i in range(0, len(todo), BATCH_SIZE):
        batch = todo[i:i+BATCH_SIZE]
        batch_count += 1
        total_batches = (len(todo) + BATCH_SIZE - 1) // BATCH_SIZE
        
        alive_keys = len(API_KEYS) - len(_dead_keys)
        if alive_keys == 0:
            print("Tat ca keys het quota. Dung.")
            break
            
        print(f"Batch {batch_count}/{total_batches} ({len(batch)} tasks)...", end=' ', flush=True)
        
        translations = translate_batch(batch)
        
        if translations:
            # Update cache
            cache.update(translations)
            save_progress(cache)
            
            # Update DB ngay
            for task_en, task_vi in translations.items():
                cur.execute(
                    "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE task_en=%s",
                    (task_vi, task_en)
                )
            conn.commit()
            
            print(f"OK ({len(translations)}/{len(batch)}) | Cache: {len(cache)}/{len(all_tasks_by_id)}")
        else:
            print("FAIL (0 translations)")
        
        # Nghỉ giữa các batch để tiết kiệm quota
        time.sleep(1.5)

    print(f"\nKet qua cuoi: Cache {len(cache)}/{len(all_tasks_by_id)}")
    
    # Kiểm tra DB
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi IS NULL OR task_vi=''")
    print(f"NULL/empty task_vi: {cur.fetchone()[0]}")
    
    cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M'""")
    print(f"Con tieng Anh: {cur.fetchone()[0]}")
    
    cur.close()
    conn.close()
    print("Hoan tat!")

if __name__ == '__main__':
    main()