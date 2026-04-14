"""
TC-PDF-NON-01 / 02 / 03 / 04 — PDF non-CV validation tests
=============================================================
Covers:

  TC-PDF-NON-01: PDF văn bản rác (Lorem Ipsum / ký tự vô nghĩa)
    01.1  _is_cv_content("Lorem ipsum dolor...") → False, thông báo nghề nghiệp
    01.2  _is_cv_content văn bản lặp (word repeated 50x) → False
    01.3  parse_cv_complete raises ValueError khi text là Lorem Ipsum (mock extraction)
    01.4  Thông báo lỗi chứa "nghề nghiệp" hoặc "nội dung"

  TC-PDF-NON-02: PDF quá nhiều trang (sách / truyện)
    02.1  _get_pdf_page_count trả đúng số trang
    02.2  _get_pdf_page_count trả 0 khi file không hợp lệ
    02.3  parse_cv_complete raises ValueError khi page_count > MAX_CV_PAGES
    02.4  Thông báo lỗi chứa số trang và giới hạn cho phép
    02.5  parse_cv_complete KHÔNG raise khi page_count == MAX_CV_PAGES
    02.6  MAX_CV_PAGES = 10 là hằng số trên class

  TC-PDF-NON-03: PDF hóa đơn / chứng từ tài chính
    03.1  _is_cv_content hóa đơn thanh toán → False, nhắc "tài chính"
    03.2  _is_cv_content biên lai ngân hàng → False
    03.3  _is_cv_content purchase order → False
    03.4  parse_cv_complete raises ValueError cho PDF hóa đơn (mock)
    03.5  Thông báo lỗi chứa "tài chính" hoặc "hóa đơn"

  TC-PDF-NON-04: PDF chỉ có ảnh chân dung (không có text layer)
    04.1  parse_cv_complete raises ValueError khi PDF trả text rỗng
    04.2  Thông báo lỗi đề cập "ảnh scan" hoặc "text" để hướng dẫn dùng JPG/PNG
    04.3  parse_cv_complete raises khi text < 50 ký tự (quá ngắn)
"""
from __future__ import annotations

from unittest.mock import patch

import pytest

# ──────────────────────────────────────────────────────────────────────────────
# Sample texts
# ──────────────────────────────────────────────────────────────────────────────

LOREM_IPSUM = (
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod "
    "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, "
    "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo "
    "consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse "
    "cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat "
    "non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
)

REPEATED_JUNK = " ".join(["test"] * 60)   # "test test test ..." × 60 → 1 unique / 60 = 1.7%

INVOICE_TEXT = """\
INVOICE #INV-2026-0042
Bill To: Nguyen Van B  |  123 ABC Street
Invoice Date: 2026-04-12
Payment Method: Bank Transfer

Description                   Qty   Unit Price    Total
Web Development Service        1    5,000,000     5,000,000
UI/UX Design Package           1    2,500,000     2,500,000

Subtotal:                                        7,500,000 VND
Tax (10%):                                         750,000 VND
Total Amount:                                    8,250,000 VND

Account Number: 0123456789
Transaction ID: TXN20260412001
Thank you for your business!
"""

BANK_RECEIPT_TEXT = """\
NGÂN HÀNG TECHCOMBANK
BIÊN LAI GIAO DỊCH
Số tài khoản: 19037812345678
Loại giao dịch: Chuyển khoản nội địa
Số tiền: 1,500,000 VND
Phí giao dịch: 0 VND
Tổng tiền: 1,500,000 VND
Số dư còn lại: 24,350,000 VND
Ngày giao dịch: 12/04/2026 09:30:15
Mã giao dịch: TCB20260412093015
Trạng thái: Thành công
"""

PURCHASE_ORDER_TEXT = """\
PURCHASE ORDER  PO# PO-2026-0099
Vendor: Cong ty TNHH XYZ
Bill To: ABC Corporation

Item          Description           Qty    Unit Price   Total
LAPTOP-001    Dell Latitude 7490     5      25,000,000   125,000,000
MOUSE-002     Logitech MX3           5         500,000     2,500,000

Subtotal:                                              127,500,000 VND
Tax (8%):                                               10,200,000 VND
Total Amount Due:                                      137,700,000 VND

Payment Terms: Net 30 days
PO-# PO-2026-0099  |  Date: 2026-04-12
"""


# ──────────────────────────────────────────────────────────────────────────────
# TC-PDF-NON-01: Lorem Ipsum / junk text
# ──────────────────────────────────────────────────────────────────────────────

def test_pdf_non01_lorem_ipsum_rejected():
    """TC-PDF-NON-01.1: _is_cv_content với Lorem Ipsum → False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(LOREM_IPSUM)

    assert not is_cv, "Lorem Ipsum không phải CV"
    assert reason


def test_pdf_non01_lorem_ipsum_error_mentions_occupation():
    """TC-PDF-NON-01.1: Thông báo lỗi Lorem Ipsum chứa 'nghề nghiệp' hoặc 'nội dung'."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    _, reason = CVParserV2._is_cv_content(LOREM_IPSUM)

    keywords = ["nghề nghiệp", "nội dung", "lorem ipsum", "cv", "resume"]
    assert any(kw in reason.lower() for kw in keywords), (
        f"Lý do phải nhắc đến nghề nghiệp/nội dung, nhận được: {reason!r}"
    )


def test_pdf_non01_repeated_junk_rejected():
    """TC-PDF-NON-01.2: Văn bản lặp 60× một từ → _is_cv_content trả False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(REPEATED_JUNK)

    assert not is_cv, f"Văn bản lặp phải bị reject. reason={reason!r}"
    assert reason


def test_pdf_non01_parse_cv_complete_raises_for_lorem():
    """TC-PDF-NON-01.3: parse_cv_complete raises ValueError khi text là Lorem Ipsum."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(parser, "extract_text_from_pdf", return_value=LOREM_IPSUM):
        # Also mock page count to not trigger that check
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    assert exc_info.value.args[0]


def test_pdf_non01_error_message_guidance():
    """TC-PDF-NON-01.4: Thông báo lỗi Lorem Ipsum hướng dẫn tải CV hợp lệ."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(parser, "extract_text_from_pdf", return_value=LOREM_IPSUM):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    err = str(exc_info.value).lower()
    guidance = ["cv", "resume", "hồ sơ", "tải lên", "không phải"]
    assert any(kw in err for kw in guidance), (
        f"Lỗi phải có hướng dẫn, nhận được: {str(exc_info.value)!r}"
    )


# ──────────────────────────────────────────────────────────────────────────────
# TC-PDF-NON-02: PDF quá nhiều trang
# ──────────────────────────────────────────────────────────────────────────────

def _make_multi_page_pdf(num_pages: int) -> bytes:
    """Tạo PDF có num_pages trang bằng PyPDF2 (mỗi trang trắng)."""
    try:
        from io import BytesIO

        import PyPDF2

        writer = PyPDF2.PdfWriter()
        for _ in range(num_pages):
            writer.add_blank_page(width=595, height=842)

        buf = BytesIO()
        writer.write(buf)
        return buf.getvalue()
    except Exception:
        return b""   # Fallback: empty bytes (test will use mock)


def test_pdf_non02_max_cv_pages_constant():
    """TC-PDF-NON-02.6: MAX_CV_PAGES == 10 là hằng số trên class."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    assert CVParserV2.MAX_CV_PAGES == 10


def test_pdf_non02_get_page_count_correct():
    """TC-PDF-NON-02.1: _get_pdf_page_count trả đúng số trang cho PDF 3 trang."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    pdf_bytes = _make_multi_page_pdf(3)
    if not pdf_bytes:
        pytest.skip("PyPDF2 PdfWriter not available")

    count = CVParserV2._get_pdf_page_count(pdf_bytes)
    assert count == 3, f"Expected 3 pages, got {count}"


def test_pdf_non02_get_page_count_invalid_file():
    """TC-PDF-NON-02.2: _get_pdf_page_count trả 0 khi file không hợp lệ."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    count = CVParserV2._get_pdf_page_count(b"not a pdf file")
    assert count == 0, f"Invalid PDF should return 0, got {count}"


def test_pdf_non02_rejects_pdf_over_limit():
    """TC-PDF-NON-02.3: parse_cv_complete raises ValueError khi page_count > MAX_CV_PAGES."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    too_many_pages = CVParserV2.MAX_CV_PAGES + 5   # e.g., 15

    with patch.object(CVParserV2, "_get_pdf_page_count", return_value=too_many_pages):
        with pytest.raises(ValueError) as exc_info:
            parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    err = str(exc_info.value)
    assert str(too_many_pages) in err, "Lỗi phải nêu số trang thực tế"
    assert str(CVParserV2.MAX_CV_PAGES) in err, "Lỗi phải nêu giới hạn trang"


def test_pdf_non02_error_contains_page_info():
    """TC-PDF-NON-02.4: Thông báo lỗi chứa số trang và giới hạn."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(CVParserV2, "_get_pdf_page_count", return_value=25):
        with pytest.raises(ValueError) as exc_info:
            parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    err = str(exc_info.value)
    # Phải chứa số trang thực và giới hạn
    assert "25" in err
    assert "10" in err


def test_pdf_non02_accepts_pdf_at_exact_limit():
    """TC-PDF-NON-02.5: parse_cv_complete KHÔNG raise khi page_count == MAX_CV_PAGES."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    CV_TEXT = "John Doe\njohn@email.com\nExperience: Software Engineer at ABC\nSkills: Python, Java"
    parser = CVParserV2()

    with patch.object(CVParserV2, "_get_pdf_page_count", return_value=CVParserV2.MAX_CV_PAGES):
        with patch.object(parser, "extract_text_from_pdf", return_value=CV_TEXT):
            with patch.object(parser, "extract_all_with_ai", return_value={"personal_info": {}, "skills": []}):
                with patch.object(parser, "_ask_gemini_is_cv", return_value=True):
                    # Should NOT raise
                    result = parser.parse_cv_complete(b"fake_pdf", file_type="pdf")
                    assert result is not None


# ──────────────────────────────────────────────────────────────────────────────
# TC-PDF-NON-03: PDF hóa đơn / chứng từ tài chính
# ──────────────────────────────────────────────────────────────────────────────

def test_pdf_non03_invoice_rejected():
    """TC-PDF-NON-03.1: _is_cv_content hóa đơn thanh toán → False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(INVOICE_TEXT)

    assert not is_cv, "Hóa đơn không phải CV"
    assert reason


def test_pdf_non03_invoice_error_mentions_financial():
    """TC-PDF-NON-03.1: Thông báo lỗi hóa đơn chứa 'tài chính' hoặc 'hóa đơn'."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    _, reason = CVParserV2._is_cv_content(INVOICE_TEXT)

    keywords = ["tài chính", "hóa đơn", "biên lai", "chứng từ", "financial"]
    assert any(kw in reason.lower() for kw in keywords), (
        f"Lý do phải nhắc 'tài chính/hóa đơn', nhận được: {reason!r}"
    )


def test_pdf_non03_bank_receipt_rejected():
    """TC-PDF-NON-03.2: _is_cv_content biên lai ngân hàng → False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(BANK_RECEIPT_TEXT)
    assert not is_cv, "Biên lai ngân hàng không phải CV"


def test_pdf_non03_purchase_order_rejected():
    """TC-PDF-NON-03.3: _is_cv_content purchase order → False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(PURCHASE_ORDER_TEXT)
    assert not is_cv, "Purchase order không phải CV"


def test_pdf_non03_parse_cv_complete_raises_for_invoice():
    """TC-PDF-NON-03.4: parse_cv_complete raises ValueError cho PDF hóa đơn."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(parser, "extract_text_from_pdf", return_value=INVOICE_TEXT):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    assert exc_info.value.args[0]


def test_pdf_non03_error_message_financial_context():
    """TC-PDF-NON-03.5: Thông báo lỗi chứa 'tài chính' hoặc 'hóa đơn'."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(parser, "extract_text_from_pdf", return_value=INVOICE_TEXT):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    err = str(exc_info.value).lower()
    assert "tài chính" in err or "hóa đơn" in err or "biên lai" in err or "financial" in err, (
        f"Lỗi phải nhắc tài chính/hóa đơn, nhận được: {str(exc_info.value)!r}"
    )


# ──────────────────────────────────────────────────────────────────────────────
# TC-PDF-NON-04: PDF chỉ có ảnh (không có text layer)
# ──────────────────────────────────────────────────────────────────────────────

def test_pdf_non04_empty_text_raises():
    """TC-PDF-NON-04.1: parse_cv_complete raises ValueError khi PDF trả text rỗng."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(parser, "extract_text_from_pdf", return_value=""):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    assert exc_info.value.args[0]


def test_pdf_non04_error_message_mentions_image_scan():
    """TC-PDF-NON-04.2: Thông báo lỗi đề cập 'ảnh scan' hoặc hướng dẫn dùng JPG/PNG."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with patch.object(parser, "extract_text_from_pdf", return_value=""):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    err = str(exc_info.value).lower()
    # Phải hướng dẫn người dùng
    hints = ["ảnh scan", "jpg", "png", "hình ảnh", "image", "text layer", "văn bản"]
    assert any(h in err for h in hints), (
        f"Lỗi phải đề cập scan/JPG/PNG, nhận được: {str(exc_info.value)!r}"
    )


def test_pdf_non04_very_short_text_raises():
    """TC-PDF-NON-04.3: parse_cv_complete raises khi PDF chỉ trả < 50 ký tự text."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    # Ít hơn 50 ký tự → coi như không có text layer
    short_text = "Name: John"   # 10 chars

    with patch.object(parser, "extract_text_from_pdf", return_value=short_text):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError) as exc_info:
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")

    assert exc_info.value.args[0]


def test_pdf_non04_whitespace_only_text_raises():
    """TC-PDF-NON-04 bonus: Text chỉ là whitespace/newlines → cũng raise ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    whitespace_text = "   \n\n\t   \n   "

    with patch.object(parser, "extract_text_from_pdf", return_value=whitespace_text):
        with patch.object(CVParserV2, "_get_pdf_page_count", return_value=1):
            with pytest.raises(ValueError):
                parser.parse_cv_complete(b"fake_pdf", file_type="pdf")
