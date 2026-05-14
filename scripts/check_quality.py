"""
Kiểm tra chất lượng bản dịch title_vi từ cache
- Lấy 20 dòng ngẫu nhiên từ cache
- So sánh EN vs VI để đánh giá
- Phát hiện các bản dịch có vấn đề
"""
import json
import random
import re

CACHE_FILE = 'scripts/cache_title_vi.json'

with open(CACHE_FILE, 'r', encoding='utf-8') as f:
    cache = json.load(f)

print(f"Tổng cache: {len(cache)} entries\n")

# Lấy 20 ngẫu nhiên (bỏ qua từ điển thủ công ngắn)
items = [(en, vi) for en, vi in cache.items() if len(en) > 10]
sample = random.sample(items, min(20, len(items)))

print("=" * 70)
print("20 BẢN DỊCH NGẪU NHIÊN")
print("=" * 70)

issues = []
for i, (en, vi) in enumerate(sample, 1):
    # Phát hiện vấn đề
    problems = []

    # 1. Còn tiếng Anh trong bản dịch (từ Latin >= 4 ký tự, có chữ thường)
    latin_words = re.findall(r'\b[A-Za-z][a-z]{3,}\b', vi)
    vn_ok = {'và', 'của', 'cho', 'các', 'trong', 'với', 'về', 'theo', 'tại',
              'hay', 'hoặc', 'nhà', 'viên', 'gia', 'sĩ', 'trưởng', 'phó'}
    real_en = [w for w in latin_words if w.lower() not in vn_ok]
    if real_en:
        problems.append(f"Còn tiếng Anh: {real_en[:3]}")

    # 2. Bản dịch quá dài so với gốc (dấu hiệu dịch thừa)
    if len(vi) > len(en) * 2.5:
        problems.append("Dịch quá dài")

    # 3. Bản dịch quá ngắn
    if len(vi) < 5:
        problems.append("Dịch quá ngắn")

    # 4. Có "tất cả những" (dịch máy "All Other" không tự nhiên)
    if 'tất cả những' in vi.lower() or 'tất cả các' in vi.lower():
        problems.append("'All Other' dịch chưa tự nhiên")

    # 5. Lặp từ
    words = vi.lower().split()
    if len(words) != len(set(words)) and len(words) > 3:
        dupes = [w for w in set(words) if words.count(w) > 1 and len(w) > 2]
        if dupes:
            problems.append(f"Lặp từ: {dupes[:2]}")

    status = "❌" if problems else "✅"
    print(f"{i:2}. {status} EN: {en}")
    print(f"       VI: {vi}")
    if problems:
        print(f"       ⚠️  {' | '.join(problems)}")
        issues.append((en, vi, problems))
    print()

print("=" * 70)
print(f"Kết quả: {len(issues)}/20 có vấn đề")
if issues:
    print("\nCác bản dịch cần sửa:")
    for en, vi, probs in issues:
        print(f"  - {en} -> {vi}")
        print(f"    Vấn đề: {' | '.join(probs)}")
