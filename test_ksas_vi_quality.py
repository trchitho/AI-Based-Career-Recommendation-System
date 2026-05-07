"""
TEST SUITE - Kiểm tra chất lượng dịch thuật core.career_ksas
Production-grade: nghiêm ngặt, đầy đủ, không khoan nhượng.

Các test case:
  TC-01: Không có hàng nào name_vn hoặc description_vn là NULL/rỗng
  TC-02: Không có từ tiếng Anh thuần (trừ viết tắt quốc tế) trong name_vn
  TC-03: Không có từ tiếng Anh thuần (trừ viết tắt quốc tế) trong description_vn
  TC-04: name_vn phải có ký tự Unicode tiếng Việt (không mất dấu)
  TC-05: description_vn phải có ký tự Unicode tiếng Việt (không mất dấu)
  TC-06: Không có ký tự lỗi encoding (Ã, â€, ?, □, ký tự thay thế)
  TC-07: Không có ký tự đặc biệt vô nghĩa (~~, ^^, ??, □□)
  TC-08: name_vn không được dài hơn 120 ký tự (tên ngắn gọn)
  TC-09: description_vn không được ngắn hơn 10 ký tự (mô tả đủ nghĩa)
  TC-10: Tổng số records khớp với backup (không mất dữ liệu)
  TC-11: Không có hàng nào name_vn = name_en (chưa dịch)
  TC-12: Không có hàng nào description_vn = description_en (chưa dịch)
  TC-13: Không có từ lai kiểu "teaching người", "adjust hành động"
  TC-14: Tất cả onet_code vẫn còn nguyên (không bị thay đổi)
  TC-15: Tất cả ksa_type vẫn còn nguyên (không bị thay đổi)
"""

import re
import sys
import psycopg2

DB_URL = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"

# ── Viết tắt quốc tế được phép ───────────────────────────────────────────────
ALLOWED_ABBR = {
    "IT","AI","HR","PR","CEO","CFO","CTO","CMO","COO","CIO","CSO",
    "MBA","PHD","STEM","IELTS","TOEFL","GPA","CV","KPI","OKR","API",
    "SQL","ERP","CRM","SAAS","IOT","NGO","UN","WHO","WTO","GDP",
    "USD","VND","RD","B2B","B2C","SOP","KYC","AML","ESG","IPO",
    "ROI","ROE","ROA","USA","UK","EU","CAO","CGO","ADR","LLC","INC","LTD",
    "PC","TV","GPS","USB","PDF","HTML","CSS","JS","PHP","XML","JSON",
    "HTTP","HTTPS","TCP","IP","VPN","LAN","WAN","RAM","CPU","GPU",
    "OS","UI","UX","QA","QC","PM","PO","BA","DBA","SRE","ML","NLP",
    "AR","VR","MR","XR","3D","2D","CAD","CAM","CNC","PLC","SCADA",
    "ISO","IEC","IEEE","ANSI","ASTM","OSHA","FDA","EPA",
    "GMP","GLP","GCP","MSDS","PPE","HVAC","MEP",
    "ECG","EEG","MRI","CT","ICU","ER","OPD","IPD",
    "GAAP","IFRS","VAT","GST","EBITDA","NPV","IRR",
    "SEO","SEM","CPC","CPM","CTR","TOEIC","SAT","ACT","GRE","GMAT",
    "OK","NO","YES","ID","VS","ETC","IE","EG","AM","PM","FM","TV",
}

EN_WORD_RE   = re.compile(r'\b[A-Za-z]{3,}\b')
VIET_CHAR_RE = re.compile(
    r'[àáảãạăắặẳẵằâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ'
    r'ÀÁẢÃẠĂẮẶẲẴẰÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]'
)
ENCODING_ERR_RE = re.compile(r'[Ã\x80-\x9f\ufffd\u0000-\u0008\u000b\u000c\u000e-\u001f]|â€|Â ')
GARBAGE_RE      = re.compile(r'[~^]{2,}|\?{2,}|□{2,}|\*{3,}')
MIXED_RE        = re.compile(
    r'\b(?:teaching|learning|using|adjusting|talking|working|helping|'
    r'performing|applying|analyzing|managing|developing|providing|'
    r'understanding|communicating|operating|maintaining|monitoring|'
    r'evaluating|implementing|designing|creating|planning|coordinating|'
    r'conducting|reviewing|processing|handling|supporting|ensuring|'
    r'identifying|assessing|preparing|executing|delivering|building|'
    r'solving|making|taking|giving|getting|setting|keeping|putting|'
    r'reading|writing|speaking|listening|thinking|deciding|leading|'
    r'training|testing|checking|fixing|running|moving|driving|'
    r'collecting|recording|reporting|calculating|measuring|estimating)\s+'
    r'(?:người|hành|công|việc|thông|kỹ|năng|kiến|thức|khả|năng|các|những|'
    r'một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)',
    re.IGNORECASE
)

# Từ tiếng Việt không dấu thường bị nhận nhầm là tiếng Anh
VN_NO_DIACRITIC = {
    w.upper() for w in [
        "kha","nang","cac","nhau","quy","tac","chung","cho","viec",
        "nhanh","chong","danh","gia","nhieu","doi","tuong","tap","trung",
        "duy","nhat","nguon","thanh","tro","nen","tao","hoac","dung",
        "khac","cua","mot","hai","theo","bang","voi","den","trong",
        "ngoai","truoc","sau","tren","duoi","theo","viet","nam","lam",
        "biet","hieu","bao","gom","cac","loai","phan","chia","ket","hop",
        "thuc","hien","kiem","tra","xem","xet","phat","trien","xay","dung",
        "quan","tri","dieu","hanh","phoi","hop","giao","tiep","lien","lac",
        "thu","thap","phan","tich","danh","gia","bao","cao","lap","ke",
        "hoach","thiet","ke","van","hanh","bao","tri","sua","chua","cai",
        "tien","nang","cao","huan","luyen","dao","tao","huong","dan",
        "ho","tro","giai","quyet","van","de","ra","quyet","dinh",
        "tinh","toan","do","luong","uoc","tinh","thu","thap","xu","ly",
        "thong","tin","quan","sat","giam","sat","kiem","soat","dieu","chinh",
        "van","chuyen","di","chuyen","lap","rap","thao","go","ket","noi",
        "nghe","noi","doc","viet","hoc","day","nghien","cuu","sang","tao",
        "phat","minh","thiet","ke","mo","hinh","thu","nghiem","kiem","nghiem",
    ]
}

def has_english(text: str) -> list[str]:
    """Trả về list từ tiếng Anh không được phép (bỏ qua viết tắt và từ VN không dấu)."""
    if not text:
        return []
    return [
        w for w in EN_WORD_RE.findall(text)
        if w.upper() not in ALLOWED_ABBR and w.upper() not in VN_NO_DIACRITIC
    ]

def has_viet_chars(text: str) -> bool:
    return bool(VIET_CHAR_RE.search(text)) if text else False

# ── Test runner ───────────────────────────────────────────────────────────────
class TestResult:
    def __init__(self, tc_id: str, name: str):
        self.tc_id    = tc_id
        self.name     = name
        self.passed   = False
        self.failures = []
        self.count    = 0

    def fail(self, detail: str):
        self.failures.append(detail)

    def finalize(self):
        self.passed = len(self.failures) == 0

def run_all_tests():
    print("=" * 70)
    print("  TEST SUITE: core.career_ksas - Kiểm tra chất lượng dịch thuật VN")
    print("=" * 70)

    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    # Load toàn bộ dữ liệu
    cur.execute("""
        SELECT id, onet_code, ksa_type,
               name_en, name_vn,
               description_en, description_vn
        FROM core.career_ksas
        ORDER BY id
    """)
    rows = cur.fetchall()
    total = len(rows)
    print(f"\n  Tổng records: {total:,}\n")

    results = []

    # ── TC-01: NULL / rỗng ────────────────────────────────────────────────────
    tc = TestResult("TC-01", "Không có name_vn hoặc description_vn NULL/rỗng")
    for r in rows:
        rid, _, _, _, name_vn, _, desc_vn = r
        if not name_vn or not name_vn.strip():
            tc.fail(f"ID={rid}: name_vn NULL/rỗng")
        if not desc_vn or not desc_vn.strip():
            tc.fail(f"ID={rid}: description_vn NULL/rỗng")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-02: Tiếng Anh trong name_vn ───────────────────────────────────────
    tc = TestResult("TC-02", "name_vn không chứa từ tiếng Anh thuần")
    for r in rows:
        rid, _, _, name_en, name_vn, _, _ = r
        bad = has_english(name_vn or "")
        if bad:
            tc.fail(f"ID={rid} [{name_en[:40]}] → name_vn='{name_vn}' | từ EN: {bad[:3]}")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-03: Tiếng Anh trong description_vn ────────────────────────────────
    tc = TestResult("TC-03", "description_vn không chứa từ tiếng Anh thuần")
    for r in rows:
        rid, _, _, name_en, _, _, desc_vn = r
        bad = has_english(desc_vn or "")
        if bad:
            tc.fail(f"ID={rid} [{name_en[:40]}] → từ EN: {bad[:3]} | '{(desc_vn or '')[:60]}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-04: Dấu tiếng Việt trong name_vn ──────────────────────────────────
    tc = TestResult("TC-04", "name_vn có dấu tiếng Việt (không mất dấu)")
    for r in rows:
        rid, _, _, name_en, name_vn, _, _ = r
        nv = (name_vn or "").strip()
        ne = (name_en or "").strip()
        # Bỏ qua nếu name_en là viết tắt thuần (≤4 ký tự hoặc toàn chữ hoa)
        if len(ne) <= 4 or ne.upper() == ne:
            continue
        if nv and not has_viet_chars(nv):
            tc.fail(f"ID={rid} [{ne[:40]}] → name_vn='{nv}' (không có dấu)")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-05: Dấu tiếng Việt trong description_vn ───────────────────────────
    tc = TestResult("TC-05", "description_vn có dấu tiếng Việt (không mất dấu)")
    for r in rows:
        rid, _, _, name_en, _, _, desc_vn = r
        dv = (desc_vn or "").strip()
        if dv and len(dv) > 10 and not has_viet_chars(dv):
            tc.fail(f"ID={rid} [{name_en[:40]}] → desc_vn='{dv[:60]}' (không có dấu)")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-06: Lỗi encoding ───────────────────────────────────────────────────
    tc = TestResult("TC-06", "Không có ký tự lỗi encoding (Ã, â€, ?, □)")
    for r in rows:
        rid, _, _, name_en, name_vn, _, desc_vn = r
        for field, val in [("name_vn", name_vn), ("description_vn", desc_vn)]:
            if val and ENCODING_ERR_RE.search(val):
                tc.fail(f"ID={rid} [{name_en[:30]}] → {field}='{val[:60]}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-07: Ký tự rác ─────────────────────────────────────────────────────
    tc = TestResult("TC-07", "Không có ký tự rác (~~, ^^, ??, □□)")
    for r in rows:
        rid, _, _, name_en, name_vn, _, desc_vn = r
        for field, val in [("name_vn", name_vn), ("description_vn", desc_vn)]:
            if val and GARBAGE_RE.search(val):
                tc.fail(f"ID={rid} [{name_en[:30]}] → {field}='{val[:60]}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-08: name_vn không quá dài ─────────────────────────────────────────
    tc = TestResult("TC-08", "name_vn ≤ 120 ký tự")
    for r in rows:
        rid, _, _, name_en, name_vn, _, _ = r
        if name_vn and len(name_vn) > 120:
            tc.fail(f"ID={rid} [{name_en[:30]}] → name_vn dài {len(name_vn)} ký tự")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-09: description_vn đủ dài ─────────────────────────────────────────
    tc = TestResult("TC-09", "description_vn ≥ 10 ký tự")
    for r in rows:
        rid, _, _, name_en, _, desc_en, desc_vn = r
        dv = (desc_vn or "").strip()
        de = (desc_en or "").strip()
        if de and len(dv) < 10:
            tc.fail(f"ID={rid} [{name_en[:30]}] → description_vn quá ngắn: '{dv}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-10: Tổng records khớp backup ──────────────────────────────────────
    tc = TestResult("TC-10", "Tổng records khớp với backup (không mất dữ liệu)")
    cur.execute("SELECT COUNT(*) FROM core.career_ksas_backup_20260428")
    backup_cnt = cur.fetchone()[0]
    if total != backup_cnt:
        tc.fail(f"Hiện tại: {total:,} | Backup: {backup_cnt:,} | Chênh: {abs(total-backup_cnt)}")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-11: name_vn ≠ name_en (đã dịch) ───────────────────────────────────
    tc = TestResult("TC-11", "name_vn ≠ name_en (không để nguyên tiếng Anh)")
    for r in rows:
        rid, _, _, name_en, name_vn, _, _ = r
        if name_en and name_vn and name_en.strip().lower() == (name_vn or "").strip().lower():
            tc.fail(f"ID={rid}: name_vn = name_en = '{name_en}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-12: description_vn ≠ description_en ───────────────────────────────
    tc = TestResult("TC-12", "description_vn ≠ description_en (không để nguyên tiếng Anh)")
    for r in rows:
        rid, _, _, name_en, _, desc_en, desc_vn = r
        if desc_en and desc_vn and desc_en.strip().lower() == (desc_vn or "").strip().lower():
            tc.fail(f"ID={rid} [{name_en[:30]}]: description_vn = description_en")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-13: Không có từ lai (mixed language) ───────────────────────────────
    tc = TestResult("TC-13", "Không có từ lai (teaching người, adjust hành động...)")
    for r in rows:
        rid, _, _, name_en, name_vn, _, desc_vn = r
        for field, val in [("name_vn", name_vn), ("description_vn", desc_vn)]:
            if val and MIXED_RE.search(val):
                match = MIXED_RE.search(val)
                tc.fail(f"ID={rid} [{name_en[:30]}] → {field}: '...{match.group()}...'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-14: onet_code không thay đổi ──────────────────────────────────────
    tc = TestResult("TC-14", "onet_code không bị thay đổi so với backup")
    cur.execute("""
        SELECT k.id, k.onet_code, b.onet_code
        FROM core.career_ksas k
        JOIN core.career_ksas_backup_20260428 b ON k.id = b.id
        WHERE k.onet_code != b.onet_code
        LIMIT 10
    """)
    changed = cur.fetchall()
    for row in changed:
        tc.fail(f"ID={row[0]}: onet_code '{row[2]}' → '{row[1]}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    # ── TC-15: ksa_type không thay đổi ───────────────────────────────────────
    tc = TestResult("TC-15", "ksa_type không bị thay đổi so với backup")
    cur.execute("""
        SELECT k.id, k.ksa_type, b.ksa_type
        FROM core.career_ksas k
        JOIN core.career_ksas_backup_20260428 b ON k.id = b.id
        WHERE k.ksa_type != b.ksa_type
        LIMIT 10
    """)
    changed = cur.fetchall()
    for row in changed:
        tc.fail(f"ID={row[0]}: ksa_type '{row[2]}' → '{row[1]}'")
    tc.count = len(tc.failures)
    tc.finalize()
    results.append(tc)

    conn.close()

    # ── In kết quả ───────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  KẾT QUẢ TEST")
    print("=" * 70)

    passed_count = 0
    failed_count = 0
    total_failures = 0

    for tc in results:
        status = "✅ PASS" if tc.passed else "❌ FAIL"
        print(f"\n  {status} | {tc.tc_id}: {tc.name}")
        if not tc.passed:
            failed_count += 1
            total_failures += tc.count
            # Hiển thị tối đa 5 ví dụ lỗi
            for detail in tc.failures[:5]:
                print(f"         → {detail}")
            if len(tc.failures) > 5:
                print(f"         → ... và {len(tc.failures)-5} lỗi nữa")
        else:
            passed_count += 1

    print("\n" + "=" * 70)
    print(f"  TỔNG KẾT: {passed_count}/{len(results)} PASS | {failed_count} FAIL | {total_failures:,} lỗi chi tiết")
    print("=" * 70)

    if failed_count == 0:
        print("\n  🎉 TẤT CẢ TEST PASS - Dữ liệu đạt chuẩn production!")
        return True
    else:
        print(f"\n  ⚠️  CÒN {failed_count} TEST FAIL - Cần xử lý trước khi production!")
        return False

if __name__ == "__main__":
    ok = run_all_tests()
    sys.exit(0 if ok else 1)
