import psycopg2
import google.generativeai as genai
import json, time, re, os
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
BATCH_SIZE = 50
PROGRESS_FILE = 'ct_progress.json'
MAX_WORKERS = 6

API_KEYS = [
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
    'AIzaSyAi0ffCWz35cKEZpF2DQ41aTcR1Bs94Krs',
    'AIzaSyDc7-bxSs7ZJNRsOLGqYf4RxSDhhc6ZzHQ',
    'AIzaSyASIOaagnGaLQuSz7yy_kTGfuJVDh4qihw',
    'AIzaSyA23CASjMx2rPYvGrUKneHOhSzl4IU7HiU',
    'AIzaSyA28p1gK_wKZJt8HO07HPayDwKY8UXP-i8',
    'AIzaSyBK_eCB8VMU6t2cgrVByF5j-glNXaJs4nI',
    'AIzaSyD1SOQ1ZIJksneCA5wT99NC4qimmoWZNBc',
    'AIzaSyCy2V_vSON0gT5vPhIjr3JHqdsmTXAfm1g',
    'AIzaSyAyd5PTbkYs7e7WJQpsXZnFSn3WeixKFLs',
    'AIzaSyCVk-GJ9rQNDCkUUmeIwHDdTz7u1qqKd5k',
    'AIzaSyAaxW4HxQ4ZyaZZ24ZPBsnL3zw6N91jAKs',
    'AIzaSyCt8L4L5r3BMc6M6p0LnfBtM6nlMnyr79A',
    'AIzaSyAC84PhpO84AMk3ZZPl2yqXNsQu9Uuu9vk',
    'AIzaSyDP6VdLbPLkftQIJE66Heg7iOetCbzhcyQ',
    'AIzaSyBXf0ToDkoE9XQlGMqg2uEXWOowlZDm9YQ',
    'AIzaSyCaZRLEKspq7d3sqEMBM3xcNumiSe154NQ',
    'AIzaSyBaZECi0X9CzXihjg44AYO5BTud3yMoYi8',
]
MODEL_NAME = 'gemini-2.5-flash'

_key_lock = Lock()
_key_idx = 0
_dead_keys = set()   # Keys đã hết quota hôm nay

def get_key():
    """Lấy key còn sống, bỏ qua dead keys"""
    global _key_idx
    with _key_lock:
        alive = [k for k in API_KEYS if k not in _dead_keys]
        if not alive:
            return None
        key = alive[_key_idx % len(alive)]
        _key_idx += 1
        return key

def mark_dead(key):
    with _key_lock:
        _dead_keys.add(key)
        alive = len(API_KEYS) - len(_dead_keys)
        print(f"\n  [KEY DEAD] ...{key[-6:]} | Còn sống: {alive}/{len(API_KEYS)}")

def clean_json(text):
    text = text.strip()
    text = re.sub(r'^```[a-z]*\s*', '', text)
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()

def translate_batch(tasks):
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
    for attempt in range(len(API_KEYS) + 1):
        key = get_key()
        if key is None:
            print("\n  [ALL KEYS DEAD] Dung lai.")
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
                if k in data and data[k]:
                    result[task] = data[k]
            return result
        except json.JSONDecodeError:
            time.sleep(1)
            continue
        except Exception as e:
            err = str(e)
            if '429' in err or 'quota' in err.lower() or 'RESOURCE_EXHAUSTED' in err:
                mark_dead(key)
                continue
            elif '403' in err or 'leaked' in err.lower():
                mark_dead(key)
                continue
            elif '504' in err or 'timeout' in err.lower():
                time.sleep(2)
                continue
            else:
                time.sleep(1)
                continue
    return {}

_cache_lock = Lock()
_db_lock = Lock()

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_progress(cache):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def process_batch(args):
    batch_idx, batch, total_batches, cache, conn = args

    # Kiểm tra còn key sống không
    if not [k for k in API_KEYS if k not in _dead_keys]:
        return batch_idx, 0, len(batch), True  # signal stop

    translations = translate_batch(batch)

    with _cache_lock:
        cache.update(translations)
        save_progress(cache)

    if translations:
        with _db_lock:
            cur = conn.cursor()
            for task_en, task_vi in translations.items():
                if task_vi and task_vi.strip():
                    cur.execute(
                        "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE task_en=%s",
                        (task_vi.strip(), task_en)
                    )
            conn.commit()
            cur.close()

    return batch_idx, len(translations), len(batch), False

def main():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT task_en FROM core.career_tasks ORDER BY task_en")
    all_tasks = [r[0] for r in cur.fetchall()]
    cur.close()
    print(f"Tong unique task_en: {len(all_tasks)}")

    cache = load_progress()
    print(f"Da co trong cache: {len(cache)}")

    todo = [t for t in all_tasks if t not in cache]
    print(f"Con can dich: {len(todo)}")
    print(f"So keys: {len(API_KEYS)} | Workers: {MAX_WORKERS}\n")

    batches = [todo[i:i+BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    total_batches = len(batches)
    print(f"Tong {total_batches} batches\n")

    completed = 0
    all_dead = False
    args_list = [(i, b, total_batches, cache, conn) for i, b in enumerate(batches)]

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_batch, args): args[0] for args in args_list}
        for future in as_completed(futures):
            try:
                batch_idx, got, total, stop = future.result()
                completed += 1
                pct = completed * 100 // total_batches
                alive_keys = len(API_KEYS) - len(_dead_keys)
                print(f"  [{pct:3d}%] Batch {batch_idx+1}/{total_batches}: {got}/{total} | Cache: {len(cache)}/{len(all_tasks)} | Keys: {alive_keys}")
                if stop or alive_keys == 0:
                    print("\n  Tat ca keys het quota. Dung.")
                    executor.shutdown(wait=False, cancel_futures=True)
                    break
            except Exception as e:
                print(f"  Batch error: {e}")

    print(f"\nKet qua: Cache {len(cache)}/{len(all_tasks)}")
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi IS NULL OR task_vi=''")
    print(f"NULL/empty: {cur.fetchone()[0]}")
    cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M'""")
    print(f"Con tieng Anh: {cur.fetchone()[0]}")
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()


API_KEYS = [
    # Keys mới nhất (batch 2)
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
    # Keys batch 1
    'AIzaSyAi0ffCWz35cKEZpF2DQ41aTcR1Bs94Krs',
    'AIzaSyDc7-bxSs7ZJNRsOLGqYf4RxSDhhc6ZzHQ',
    'AIzaSyASIOaagnGaLQuSz7yy_kTGfuJVDh4qihw',
    'AIzaSyA23CASjMx2rPYvGrUKneHOhSzl4IU7HiU',
    'AIzaSyA28p1gK_wKZJt8HO07HPayDwKY8UXP-i8',
    'AIzaSyBK_eCB8VMU6t2cgrVByF5j-glNXaJs4nI',
    'AIzaSyD1SOQ1ZIJksneCA5wT99NC4qimmoWZNBc',
    'AIzaSyCy2V_vSON0gT5vPhIjr3JHqdsmTXAfm1g',
    'AIzaSyAyd5PTbkYs7e7WJQpsXZnFSn3WeixKFLs',
    'AIzaSyCVk-GJ9rQNDCkUUmeIwHDdTz7u1qqKd5k',
    'AIzaSyAaxW4HxQ4ZyaZZ24ZPBsnL3zw6N91jAKs',
    'AIzaSyCt8L4L5r3BMc6M6p0LnfBtM6nlMnyr79A',
    'AIzaSyAC84PhpO84AMk3ZZPl2yqXNsQu9Uuu9vk',
    # Keys cũ
    'AIzaSyDP6VdLbPLkftQIJE66Heg7iOetCbzhcyQ',
    'AIzaSyBXf0ToDkoE9XQlGMqg2uEXWOowlZDm9YQ',
    'AIzaSyCaZRLEKspq7d3sqEMBM3xcNumiSe154NQ',
    'AIzaSyBaZECi0X9CzXihjg44AYO5BTud3yMoYi8',
]
MODEL_NAME = 'gemini-2.5-flash'

# Thread-safe key rotation
_key_lock = Lock()
_key_idx = 0

def get_key():
    global _key_idx
    with _key_lock:
        key = API_KEYS[_key_idx % len(API_KEYS)]
        _key_idx += 1
        return key

def clean_json(text):
    text = text.strip()
    text = re.sub(r'^```[a-z]*\s*', '', text)
    text = re.sub(r'\s*```\s*$', '', text)
    return text.strip()

def translate_batch(tasks, batch_label=''):
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
    for attempt in range(4):
        try:
            key = get_key()
            genai.configure(api_key=key)
            model = genai.GenerativeModel(MODEL_NAME)
            resp = model.generate_content(prompt)
            text = clean_json(resp.text)
            data = json.loads(text)
            result = {}
            for i, task in enumerate(tasks):
                k = str(i + 1)
                if k in data and data[k]:
                    result[task] = data[k]
            return result
        except json.JSONDecodeError as e:
            time.sleep(1)
        except Exception as e:
            err = str(e)
            if '429' in err or 'quota' in err.lower():
                time.sleep(3)
            else:
                time.sleep(1)
    return {}

# Thread-safe cache + DB update
_cache_lock = Lock()
_db_lock = Lock()

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_progress(cache):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def process_batch(args):
    batch_idx, batch, total_batches, cache, conn = args
    label = f"Batch {batch_idx+1}/{total_batches}"
    translations = translate_batch(batch, label)

    if len(translations) < len(batch) * 0.7:
        t2 = translate_batch(batch, label + '-retry')
        translations.update(t2)

    # Update cache
    with _cache_lock:
        cache.update(translations)
        save_progress(cache)

    # Update DB
    if translations:
        with _db_lock:
            cur = conn.cursor()
            for task_en, task_vi in translations.items():
                if task_vi and task_vi.strip():
                    cur.execute(
                        "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE task_en=%s",
                        (task_vi.strip(), task_en)
                    )
            conn.commit()
            cur.close()

    return batch_idx, len(translations), len(batch)

def main():
    conn = psycopg2.connect(DB)

    cur = conn.cursor()
    cur.execute("SELECT DISTINCT task_en FROM core.career_tasks ORDER BY task_en")
    all_tasks = [r[0] for r in cur.fetchall()]
    cur.close()
    print(f"Tong unique task_en: {len(all_tasks)}")

    cache = load_progress()
    print(f"Da co trong cache: {len(cache)}")

    todo = [t for t in all_tasks if t not in cache]
    print(f"Con can dich: {len(todo)}")
    print(f"Chay {MAX_WORKERS} workers song song")

    # Chia batches
    batches = [todo[i:i+BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    total_batches = len(batches)
    print(f"Tong {total_batches} batches\n")

    completed = 0
    args_list = [(i, b, total_batches, cache, conn) for i, b in enumerate(batches)]

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_batch, args): args[0] for args in args_list}
        for future in as_completed(futures):
            try:
                batch_idx, got, total = future.result()
                completed += 1
                pct = completed * 100 // total_batches
                cached_now = len(cache)
                print(f"  [{pct:3d}%] Batch {batch_idx+1}/{total_batches}: {got}/{total} | Cache: {cached_now}/{len(all_tasks)}")
            except Exception as e:
                print(f"  Batch error: {e}")

    print(f"\nHoan tat! Cache: {len(cache)}/{len(all_tasks)}")

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi IS NULL OR task_vi=''")
    print(f"NULL/empty task_vi: {cur.fetchone()[0]}")
    cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M'""")
    print(f"Con tieng Anh: {cur.fetchone()[0]}")
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()


