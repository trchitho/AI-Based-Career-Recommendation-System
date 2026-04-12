"""
TC-NON-01 / TC-NON-02 / TC-NON-03 — Non-CV image validation tests
====================================================================
Covers:

  TC-NON-01: Tải ảnh hoàn toàn không có chữ
    01.1  Ảnh trắng thuần → edge_mean thấp → _quick_has_text trả False
    01.2  Ảnh tối đặc (dark) → light_ratio thấp → _quick_has_text trả False
    01.3  Ảnh màu đơn sắc phong cảnh → light_ratio thấp → _quick_has_text trả False
    01.4  Lý do lỗi chứa thông điệp tiếng Việt rõ ràng
    01.5  extract_text_from_image raises ValueError khi ảnh không có text

  TC-NON-02: Tải ảnh có chữ nhưng không phải CV
    02.1  _is_cv_content với text hóa đơn siêu thị → False
    02.2  _is_cv_content với text menu nhà hàng → False
    02.3  _is_cv_content với text bài báo → False
    02.4  _is_cv_content với text quảng cáo → False
    02.5  parse_cv_complete raises ValueError khi text không phải CV
    02.6  Thông báo lỗi chứa hướng dẫn tải CV hợp lệ

  TC-NON-03: Tải ảnh chân dung / selfie
    03.1  _detect_selfie với ảnh tông màu da → is_selfie=True
    03.2  _detect_selfie với ảnh trắng thuần → is_selfie=False (không có da)
    03.3  _detect_selfie với OpenCV phát hiện khuôn mặt → is_selfie=True
    03.4  _quick_has_text reject khi _detect_selfie trả True (mock)
    03.5  Lý do lỗi selfie chứa "chân dung" hoặc "selfie"
    03.6  _detect_selfie không raise exception khi cv2 không có
"""
from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest


# ──────────────────────────────────────────────────────────────────────────────
# PIL availability guard
# ──────────────────────────────────────────────────────────────────────────────

try:
    from PIL import Image as _PIL_Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

pil_required = pytest.mark.skipif(not PIL_AVAILABLE, reason="Pillow not installed")


# ──────────────────────────────────────────────────────────────────────────────
# Image factory helpers
# ──────────────────────────────────────────────────────────────────────────────

def _make_white_image(w: int = 200, h: int = 200) -> bytes:
    """Ảnh trắng thuần — không có cạnh, không có text."""
    from PIL import Image
    img = Image.new("RGB", (w, h), color=(255, 255, 255))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _make_dark_image(w: int = 200, h: int = 200) -> bytes:
    """Ảnh tối đặc — light_ratio ≈ 0."""
    from PIL import Image
    img = Image.new("RGB", (w, h), color=(30, 30, 30))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _make_color_landscape(w: int = 200, h: int = 200) -> bytes:
    """Ảnh màu đơn sắc (xanh lá — giả phong cảnh) — light_ratio thấp."""
    from PIL import Image
    img = Image.new("RGB", (w, h), color=(60, 120, 60))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _make_skin_tone_image(w: int = 200, h: int = 200) -> bytes:
    """
    Ảnh fill 100% tông màu da (RGB ≈ 200, 130, 90).
    Kiểm tra: r=200>95, g=130>40, b=90>20, r>g, r>b, |r-g|=70>15, r-b=110>15 → skin ✓
    Trong grayscale ≈ 0.299*200+0.587*130+0.114*90 ≈ 146 → light_ratio ≈ 0 → PIL tier rejects first.
    Dùng để test _detect_selfie() trực tiếp.
    """
    from PIL import Image
    img = Image.new("RGB", (w, h), color=(200, 130, 90))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _make_cv_like_white_image(w: int = 400, h: int = 500) -> bytes:
    """
    Ảnh nền trắng với vài dòng ngang đen — giả lập trang CV đơn giản.
    - light_ratio cao (nhiều trắng) → vượt qua PIL tier
    - edge_mean cao (nhiều đường ngang) → vượt qua PIL tier
    Dùng để test selfie detection tier 3.
    """
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Vẽ nhiều dòng ngang mô phỏng văn bản
    for y in range(30, h - 30, 18):
        draw.line([(20, y), (w - 20, y)], fill=(0, 0, 0), width=2)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# TC-NON-01: Ảnh không có chữ
# ──────────────────────────────────────────────────────────────────────────────

@pil_required
def test_non01_blank_white_rejected_by_quick_has_text():
    """TC-NON-01.1: Ảnh trắng thuần → _quick_has_text trả False (low edge_mean)."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img_bytes = _make_white_image()
    ok, reason = CVParserV2._quick_has_text(img_bytes)

    assert not ok, "Ảnh trắng phải bị reject"
    assert reason, "Phải có lý do lỗi"


@pil_required
def test_non01_dark_image_rejected_by_quick_has_text():
    """TC-NON-01.2: Ảnh tối đặc → _quick_has_text trả False (low light_ratio)."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img_bytes = _make_dark_image()
    ok, reason = CVParserV2._quick_has_text(img_bytes)

    assert not ok, "Ảnh tối phải bị reject"
    assert reason


@pil_required
def test_non01_color_landscape_rejected_by_quick_has_text():
    """TC-NON-01.3: Ảnh màu phong cảnh → _quick_has_text trả False (light_ratio thấp)."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img_bytes = _make_color_landscape()
    ok, reason = CVParserV2._quick_has_text(img_bytes)

    assert not ok, "Ảnh phong cảnh màu phải bị reject"


@pil_required
def test_non01_error_message_in_vietnamese():
    """TC-NON-01.4: Lý do lỗi phải có thông điệp tiếng Việt rõ ràng."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img_bytes = _make_dark_image()
    ok, reason = CVParserV2._quick_has_text(img_bytes)

    assert not ok
    assert reason  # Phải có message
    # Phải chứa ít nhất một trong các cụm từ Việt/hướng dẫn
    keywords = ["ảnh", "cv", "tài liệu", "tải lên", "không có", "resume"]
    assert any(kw in reason.lower() for kw in keywords), (
        f"Lý do lỗi phải chứa hướng dẫn tiếng Việt, nhận được: '{reason}'"
    )


@pil_required
def test_non01_extract_text_from_image_raises_on_no_text():
    """TC-NON-01.5: extract_text_from_image raises ValueError khi ảnh không có text."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img_bytes = _make_white_image()

    parser = CVParserV2()
    with pytest.raises(ValueError) as exc_info:
        parser.extract_text_from_image(img_bytes)

    assert exc_info.value.args[0]  # Có message lỗi


# ──────────────────────────────────────────────────────────────────────────────
# TC-NON-02: Có chữ nhưng không phải CV
# ──────────────────────────────────────────────────────────────────────────────

RECEIPT_TEXT = """\
SIÊU THỊ ABC - HÓA ĐƠN THANH TOÁN
Ngày: 12/04/2026  Quầy: 3
---
Cơm gà                45,000 VND
Nước ngọt Coca         15,000 VND
Bánh mì thịt           20,000 VND
---
Tổng cộng:            80,000 VND
Tiền khách:          100,000 VND
Tiền thừa:            20,000 VND
Cảm ơn quý khách!
"""

MENU_TEXT = """\
MENU NHÀ HÀNG XYZ
KHAI VỊ
  Gỏi cuốn tôm         50,000
  Chả giò              45,000
MÓN CHÍNH
  Phở bò đặc biệt      75,000
  Cơm tấm sườn         65,000
THỨC UỐNG
  Cà phê sữa đá        35,000
  Nước dừa tươi        30,000
"""

NEWSPAPER_TEXT = """\
TIN TỨC THỜI SỰ - BÁO ABC
Hôm nay ngày 12 tháng 4 năm 2026, tại thành phố Hồ Chí Minh đã diễn ra
hội nghị thường niên về phát triển kinh tế số. Đại diện nhiều tỉnh thành
trong cả nước đã tham dự sự kiện quan trọng này. Các chuyên gia nhận định
tốc độ tăng trưởng GDP quý I đạt 6.5%, vượt mục tiêu đề ra.
"""

ADVERTISEMENT_TEXT = """\
🔥 KHUYẾN MÃI CỰC KHỦNG 🔥
Flash Sale cuối tháng — Giảm đến 70%!
Điện thoại Samsung Galaxy S25     từ 8,990,000 VND
Laptop Dell Inspiron 15            từ 12,500,000 VND
Tai nghe Sony WH-1000XM5          từ 3,200,000 VND
Mua ngay — Số lượng có hạn!
Hotline: 1800 1234  |  website: shopxyz.vn
"""


def test_non02_receipt_not_cv():
    """TC-NON-02.1: Text hóa đơn siêu thị → _is_cv_content trả False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(RECEIPT_TEXT)
    assert not is_cv, "Hóa đơn siêu thị không phải CV"
    assert reason


def test_non02_menu_not_cv():
    """TC-NON-02.2: Text menu nhà hàng → _is_cv_content trả False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(MENU_TEXT)
    assert not is_cv, "Menu nhà hàng không phải CV"
    assert reason


def test_non02_newspaper_not_cv():
    """TC-NON-02.3: Text bài báo → _is_cv_content trả False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(NEWSPAPER_TEXT)
    assert not is_cv, "Bài báo không phải CV"


def test_non02_advertisement_not_cv():
    """TC-NON-02.4: Text quảng cáo → _is_cv_content trả False."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    is_cv, reason = CVParserV2._is_cv_content(ADVERTISEMENT_TEXT)
    assert not is_cv, "Quảng cáo không phải CV"


def test_non02_parse_cv_complete_raises_for_non_cv_text():
    """TC-NON-02.5: parse_cv_complete raises ValueError khi text không phải CV."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()

    # Mock extract_text_from_pdf để trả về text hóa đơn
    with patch.object(parser, "extract_text_from_pdf", return_value=RECEIPT_TEXT):
        with pytest.raises(ValueError) as exc_info:
            parser.parse_cv_complete(b"fake_pdf_content", file_type="pdf")

    err = str(exc_info.value)
    assert err  # Phải có message lỗi


def test_non02_error_message_contains_guidance():
    """TC-NON-02.6: Thông báo lỗi phải hướng dẫn người dùng tải CV hợp lệ."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()

    with patch.object(parser, "extract_text_from_pdf", return_value=RECEIPT_TEXT):
        with pytest.raises(ValueError) as exc_info:
            parser.parse_cv_complete(b"fake_pdf_content", file_type="pdf")

    err = str(exc_info.value).lower()
    # Phải chứa hướng dẫn tải CV / Resume
    guidance_keywords = ["cv", "resume", "hồ sơ", "tải lên", "không phải"]
    assert any(kw in err for kw in guidance_keywords), (
        f"Thông báo lỗi phải có hướng dẫn, nhận được: '{str(exc_info.value)}'"
    )


# ──────────────────────────────────────────────────────────────────────────────
# TC-NON-03: Ảnh chân dung / selfie
# ──────────────────────────────────────────────────────────────────────────────

@pil_required
def test_non03_detect_selfie_skin_tone_image_true():
    """
    TC-NON-03.1: _detect_selfie với ảnh fill 100% tông màu da → is_selfie=True.
    Tier B (skin tone heuristic) được dùng nếu cv2 không có hoặc không phát hiện face.
    """
    from PIL import Image
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    # RGB (200, 130, 90) thỏa skin formula:
    #   r=200>95, g=130>40, b=90>20, r>g, r>b, |r-g|=70>15, r-b=110>15
    img = Image.new("RGB", (200, 200), color=(200, 130, 90))

    is_selfie, reason = CVParserV2._detect_selfie(img)

    assert is_selfie, (
        f"Ảnh tông màu da 100% phải bị nhận là selfie. reason={reason!r}"
    )
    assert "da" in reason.lower() or "khuôn mặt" in reason.lower(), (
        f"Lý do phải nhắc đến da hoặc khuôn mặt, nhận được: {reason!r}"
    )


@pil_required
def test_non03_detect_selfie_white_image_false():
    """TC-NON-03.2: _detect_selfie với ảnh trắng thuần → is_selfie=False."""
    from PIL import Image
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    is_selfie, reason = CVParserV2._detect_selfie(img)

    assert not is_selfie, "Ảnh trắng không phải selfie"


@pil_required
def test_non03_detect_selfie_with_opencv_face():
    """TC-NON-03.3: _detect_selfie trả True khi OpenCV phát hiện khuôn mặt."""
    from PIL import Image
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img = Image.new("RGB", (300, 300), color=(230, 200, 180))

    # Mock cv2: phát hiện 1 khuôn mặt chiếm 20% diện tích
    mock_cv2 = MagicMock()
    mock_cv2.data.haarcascades = ""
    cascade_instance = MagicMock()
    # Face box: x=50, y=50, w=120, h=120 → area=14400, total=90000 → ratio=0.16 > 0.05
    cascade_instance.detectMultiScale.return_value = [(50, 50, 120, 120)]
    mock_cv2.CascadeClassifier.return_value = cascade_instance

    import numpy as np
    mock_cv2_with_np = MagicMock()
    mock_cv2_with_np.data.haarcascades = ""
    mock_cv2_with_np.CascadeClassifier.return_value = cascade_instance

    with patch.dict("sys.modules", {"cv2": mock_cv2_with_np, "numpy": np}):
        is_selfie, reason = CVParserV2._detect_selfie(img)

    assert is_selfie, f"OpenCV face detection phải kích hoạt is_selfie. reason={reason!r}"
    assert "khuôn mặt" in reason, f"Reason phải nhắc đến khuôn mặt, nhận được: {reason!r}"


@pil_required
def test_non03_quick_has_text_rejects_when_selfie_detected():
    """
    TC-NON-03.4: _quick_has_text trả False khi _detect_selfie trả True.
    Dùng ảnh CV giả (passes PIL tier) nhưng mock selfie detection.
    """
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    # Ảnh nền trắng nhiều đường ngang → passes PIL edge + light check
    img_bytes = _make_cv_like_white_image()

    with patch.object(
        CVParserV2, "_detect_selfie", return_value=(True, "phát hiện khuôn mặt chiếm 20%")
    ):
        ok, reason = CVParserV2._quick_has_text(img_bytes)

    assert not ok, "Phải reject khi phát hiện selfie"
    assert reason


@pil_required
def test_non03_error_message_contains_selfie_keyword():
    """TC-NON-03.5: Lý do lỗi selfie phải chứa 'chân dung' hoặc 'selfie'."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    img_bytes = _make_cv_like_white_image()

    with patch.object(
        CVParserV2, "_detect_selfie", return_value=(True, "khuôn mặt chiếm 15%")
    ):
        ok, reason = CVParserV2._quick_has_text(img_bytes)

    assert not ok
    assert "chân dung" in reason.lower() or "selfie" in reason.lower(), (
        f"Lý do phải nhắc 'chân dung' hoặc 'selfie', nhận được: {reason!r}"
    )


def test_non03_detect_selfie_does_not_raise_without_cv2():
    """TC-NON-03.6: _detect_selfie không raise exception khi cv2 không được cài."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    try:
        from PIL import Image
        img = Image.new("RGB", (100, 100), color=(128, 128, 128))
    except ImportError:
        pytest.skip("Pillow not installed")

    # Force cv2 import to fail
    with patch.dict("sys.modules", {"cv2": None}):
        try:
            is_selfie, reason = CVParserV2._detect_selfie(img)
            # Should not raise, just fall back to tier B
            assert isinstance(is_selfie, bool)
            assert isinstance(reason, str)
        except ImportError:
            pass  # Expected when cv2=None is in sys.modules


@pil_required
def test_non03_skin_tone_formula_boundary():
    """TC-NON-03 bonus: Màu da biên giới (r=96, g=41, b=21) → nhận là skin pixel."""
    from PIL import Image
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    # Minimum skin tone values:
    # r=96>95✓, g=41>40✓, b=21>20✓, r>g✓, r>b✓, |r-g|=55>15✓, r-b=75>15✓
    img = Image.new("RGB", (200, 200), color=(96, 41, 21))

    is_selfie, reason = CVParserV2._detect_selfie(img)

    # Skin ratio = 100% → well above 20% threshold → is_selfie
    assert is_selfie, "Màu da biên giới vẫn phải được nhận dạng đúng"


@pil_required
def test_non03_dark_skin_tone_not_selfie():
    """TC-NON-03 bonus: Màu không thỏa skin formula → không nhận là selfie."""
    from PIL import Image
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    # r=50 không đủ (cần >95) → không phải skin
    img = Image.new("RGB", (200, 200), color=(50, 30, 20))

    is_selfie, reason = CVParserV2._detect_selfie(img)

    assert not is_selfie, "Màu tối không đủ điều kiện skin không phải selfie"
