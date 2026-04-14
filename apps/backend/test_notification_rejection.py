"""
Test để verify rằng thông báo học phí bị reject NGAY (không tốn token Gemini)
"""
from app.modules.skill_gap.cv_parser_v2 import CVParserV2
import pytest


def test_tuition_notification_rejected_immediately():
    """
    CRITICAL: Thông báo học phí phải bị reject NGAY bởi _is_cv_content()
    KHÔNG được gọi Gemini (tốn token)
    """
    parser = CVParserV2()
    
    # Nội dung thật từ file PDF thông báo học phí Đại học Duy Tân
    notification_text = """
BỘ GIÁO DỤC VÀ ĐÀO TẠO
ĐẠI HỌC DUY TÂN

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Số: 732/TB-ĐHĐT

Đà Nẵng, ngày 22 tháng 10 năm 2025

THÔNG BÁO
(V/v nộp Học phí học kỳ 2 năm học 2025-2026)

Kính gửi:
- Các đơn vị thuộc Đại học Duy Tân;
- Giảng viên, chuyên viên, cố vấn học tập;
- Quỹ phụ huynh và sinh viên đang theo học;

Theo chỉ đạo của thường trực Hội đồng Đại học, Ban Giám đốc Đại học Duy Tân thông
báo cho các đơn vị thuộc Đại học, các giảng viên, chuyên viên, cố vấn học tập, quỹ vị phụ
huynh và sinh viên đang theo học tại Đại học Duy Tân về việc nộp học phí Học kỳ 2 năm học
2025-2026 như sau:

1. Đối với thời hạn nộp học phí: Sinh viên bắt đầu nộp học phí học kỳ 2 năm học 2025-
2026 khi đã hoàn thành việc đăng ký tín chỉ, thời hạn hoàn thành nộp học phí chậm nhất đến
hết ngày 25 tháng 10 năm 2026 theo quyết định số 4792/QĐ-ĐHĐT ngày 01 tháng 12 năm
2022). Mức học phí học kỳ 2 năm học 2025-2026 không thay đổi so với mức học phí của học
kỳ 1 năm học 2025-2026.

2. Đối với trường hợp nộp học phí không đúng quy định:

3. Hình thức nộp học phí: Sinh viên nộp học phí qua tài khoản Ngân hàng TMCP Công
thương Việt Nam (Vietinbank) hoặc Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)
theo hình thức sau:

3.1. Chuyển khoản
Nội dung bắt buộc: "Mã số sinh viên (ghi đầy đủ) + Họ và tên sinh viên + nộp học phí HK
"""
    
    # Test validation logic - phải reject NGAY
    is_cv, reason = parser._is_cv_content(notification_text)
    
    print(f"\n{'='*80}")
    print("TEST: Thông báo học phí phải bị reject NGAY")
    print(f"{'='*80}")
    print(f"Is CV: {is_cv}")
    print(f"Reason: {reason}")
    print(f"{'='*80}\n")
    
    # MUST be rejected
    assert not is_cv, "Thông báo học phí KHÔNG được chấp nhận như CV!"
    assert "thông báo" in reason.lower() or "học phí" in reason.lower(), \
        f"Error message phải đề cập 'thông báo' hoặc 'học phí', got: {reason}"
    
    print("✅ TEST PASSED: Thông báo học phí bị reject NGAY (không tốn token Gemini)")


def test_official_notice_rejected():
    """Test các loại thông báo hành chính khác"""
    parser = CVParserV2()
    
    test_cases = [
        ("THÔNG BÁO\nV/v họp phụ huynh học sinh", "thông báo họp phụ huynh"),
        ("CÔNG VĂN\nSố 123/CV-ĐHĐT", "công văn"),
        ("QUYẾT ĐỊNH\nV/v khen thưởng sinh viên", "quyết định"),
        ("GIẤY CHỨNG NHẬN\nHoàn thành khóa học", "giấy chứng nhận"),
        ("OFFICIAL NOTICE\nRegarding tuition payment", "official notice"),
        ("ANNOUNCEMENT\nSchool closure notification", "announcement"),
    ]
    
    for text, expected_type in test_cases:
        is_cv, reason = parser._is_cv_content(text)
        print(f"\nTest: {expected_type}")
        print(f"  Is CV: {is_cv}")
        print(f"  Reason: {reason}")
        
        assert not is_cv, f"{expected_type} phải bị reject!"
        print(f"  ✅ PASSED")


def test_valid_cv_still_accepted():
    """Đảm bảo CV hợp lệ vẫn được chấp nhận"""
    parser = CVParserV2()
    
    valid_cv = """
NGUYEN VAN A
Email: nguyenvana@email.com
Phone: 0900123456

WORK EXPERIENCE
Software Engineer at ABC Company (2020-2024)
- Developed web applications
- Led team of 5 developers

EDUCATION
Bachelor of Computer Science
University of Technology (2016-2020)

SKILLS
Python, JavaScript, React, Node.js, MySQL
"""
    
    is_cv, reason = parser._is_cv_content(valid_cv)
    
    print(f"\n{'='*80}")
    print("TEST: CV hợp lệ vẫn được chấp nhận")
    print(f"{'='*80}")
    print(f"Is CV: {is_cv}")
    print(f"Reason: {reason if reason else 'Valid CV'}")
    print(f"{'='*80}\n")
    
    assert is_cv, "CV hợp lệ phải được chấp nhận!"
    print("✅ TEST PASSED: CV hợp lệ vẫn được chấp nhận")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("TESTING: Notification Rejection (Token Saving)")
    print("="*80 + "\n")
    
    try:
        test_tuition_notification_rejected_immediately()
        test_official_notice_rejected()
        test_valid_cv_still_accepted()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED!")
        print("="*80)
        print("\nThông báo học phí và các tài liệu hành chính được reject NGAY")
        print("→ TIẾT KIỆM TOKEN GEMINI")
        print("→ XỬ LÝ NHANH HƠN")
        print("="*80 + "\n")
        
    except AssertionError as e:
        print("\n" + "="*80)
        print("❌ TEST FAILED!")
        print("="*80)
        print(f"\nError: {e}")
        print("="*80 + "\n")
        raise
