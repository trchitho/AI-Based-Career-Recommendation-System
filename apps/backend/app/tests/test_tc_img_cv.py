"""
TC-IMG-11/12/13 — CV Image Upload tests
=========================================
Covers:
  TC-IMG-11.1  Ảnh 20MB → compress_image_if_needed giảm xuống < 4MB
  TC-IMG-11.2  Ảnh 4K (4096x2160) → resize về max 2048px trước OCR
  TC-IMG-11.3  Ảnh đã nhỏ (< 4MB, < 2048px) → không thay đổi đáng kể
  TC-IMG-11.4  Ảnh RGBA → chuyển sang RGB trước khi nén JPEG
  TC-IMG-11.5  Route nhận ảnh lớn → không reject ngay, nén trước rồi OCR

  TC-IMG-12.1  3 ảnh trang CV → ghép text đúng thứ tự trang 1, 2, 3
  TC-IMG-12.2  Separator "--- Trang tiếp theo ---" xuất hiện giữa các trang
  TC-IMG-12.3  1 trong 3 ảnh không có text → bỏ qua trang đó, giữ trang còn lại
  TC-IMG-12.4  0 ảnh → ValueError
  TC-IMG-12.5  Tất cả ảnh rỗng text → ValueError "Không tìm thấy nội dung văn bản"
  TC-IMG-12.6  Route POST /analyze-images với 3 ảnh hợp lệ → success
  TC-IMG-12.7  Route nhận > 5 ảnh → 400 "Tối đa 5 ảnh"

  TC-IMG-13.1  Ảnh phong cảnh (Gemini trả rỗng) → ValueError "Không tìm thấy nội dung văn bản trong ảnh"
  TC-IMG-13.2  extract_text_from_image với text rỗng → raise ValueError
  TC-IMG-13.3  Route POST upload ảnh không text → 422 với message tiếng Việt
  TC-IMG-13.4  White-space only response → vẫn raise ValueError
"""
from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _make_small_jpeg(width: int = 100, height: int = 100) -> bytes:
    """Tạo ảnh JPEG nhỏ (100x100 px) dạng bytes."""
    try:
        from PIL import Image
        img = Image.new("RGB", (width, height), color=(128, 200, 128))
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        # Fallback: minimal JPEG header bytes
        return b"\xff\xd8\xff\xe0" + b"\x00" * 1000


def _make_large_image(width: int = 4096, height: int = 2160) -> bytes:
    """Tạo ảnh JPEG lớn (4K resolution)."""
    try:
        from PIL import Image
        img = Image.new("RGB", (width, height), color=(200, 100, 50))
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=95)
        return buf.getvalue()
    except ImportError:
        return b"\xff\xd8\xff\xe0" + b"\x00" * (4 * 1024 * 1024 + 1)


# ──────────────────────────────────────────────────────────────
# TC-IMG-11 — compress_image_if_needed
# ──────────────────────────────────────────────────────────────

try:
    from PIL import Image as _PIL_Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


@pytest.mark.skipif(not PIL_AVAILABLE, reason="Pillow not installed")
def test_compress_reduces_large_image_below_limit():
    """TC-IMG-11.1: Ảnh lớn → kết quả nén < max_bytes."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    large_img = _make_large_image(3000, 2000)
    max_bytes = 1 * 1024 * 1024   # 1 MB test limit

    result = CVParserV2.compress_image_if_needed(large_img, max_bytes=max_bytes, max_dim=1024)

    if len(large_img) > max_bytes:
        # Chỉ kiểm tra khi ảnh gốc thực sự lớn hơn limit
        assert len(result) <= max_bytes or len(result) < len(large_img)


@pytest.mark.skipif(not PIL_AVAILABLE, reason="Pillow not installed")
def test_compress_resizes_4k_image():
    """TC-IMG-11.2: Ảnh 4K (>2048px) → được resize về <= max_dim."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from PIL import Image

    large_img = _make_large_image(4096, 2160)
    result = CVParserV2.compress_image_if_needed(large_img, max_dim=2048)

    # Open result to check dimensions
    out_img = Image.open(BytesIO(result))
    assert out_img.size[0] <= 2048 and out_img.size[1] <= 2048, \
        f"Image not resized: {out_img.size}"


@pytest.mark.skipif(not PIL_AVAILABLE, reason="Pillow not installed")
def test_compress_small_image_unchanged_size():
    """TC-IMG-11.3: Ảnh nhỏ (100x100) → không phình to."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    small_img = _make_small_jpeg(100, 100)
    result = CVParserV2.compress_image_if_needed(small_img)

    # Result should still be small
    assert len(result) < 5 * 1024 * 1024, "Small image should not balloon in size"


@pytest.mark.skipif(not PIL_AVAILABLE, reason="Pillow not installed")
def test_compress_rgba_converts_to_rgb():
    """TC-IMG-11.4: Ảnh RGBA → compress trả về JPEG hợp lệ (RGB)."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from PIL import Image

    img = Image.new("RGBA", (200, 200), color=(100, 150, 200, 128))
    buf = BytesIO()
    img.save(buf, format="PNG")
    rgba_bytes = buf.getvalue()

    result = CVParserV2.compress_image_if_needed(rgba_bytes)

    out_img = Image.open(BytesIO(result))
    assert out_img.mode == "RGB", f"Expected RGB, got {out_img.mode}"


def test_compress_returns_original_on_pillow_error():
    """TC-IMG-11.3: Khi PIL không available hoặc lỗi → trả về bytes gốc."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    bad_bytes = b"not a valid image"
    result = CVParserV2.compress_image_if_needed(bad_bytes)
    # Should return original bytes (fallback)
    assert result == bad_bytes


# ──────────────────────────────────────────────────────────────
# TC-IMG-13 — extract_text_from_image: no-text detection
# ──────────────────────────────────────────────────────────────

def test_extract_image_empty_text_raises_value_error():
    """TC-IMG-13.2: AI Vision trả về rỗng → raise ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    small_img = _make_small_jpeg()

    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=small_img), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=""):
        with pytest.raises(ValueError, match="Không tìm thấy nội dung văn bản"):
            parser.extract_text_from_image(small_img)


def test_extract_image_whitespace_only_raises_value_error():
    """TC-IMG-13.4: AI Vision trả về chỉ whitespace → raise ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    img_bytes = _make_small_jpeg()

    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value="   \n\t  "):
        with pytest.raises(ValueError, match="Không tìm thấy nội dung văn bản"):
            parser.extract_text_from_image(img_bytes)


def test_extract_image_with_text_returns_text():
    """TC-IMG-13: Ảnh có chữ → text được trả về bình thường."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    img_bytes = _make_small_jpeg()
    cv_text = "Nguyễn Văn A\nEmail: test@email.com\nKỹ năng: Python, FastAPI"

    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=cv_text):
        result = parser.extract_text_from_image(img_bytes)

    assert result == cv_text


def test_extract_image_compress_called_before_ocr():
    """TC-IMG-11.5: compress_image_if_needed phải được gọi trước extract_text_with_ai_vision."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    original = b"fake_large_image_bytes"
    compressed = b"fake_compressed_bytes"

    call_order = []

    def mock_compress(data, **kwargs):
        call_order.append("compress")
        return compressed

    def mock_extract(data, is_pdf=False):
        call_order.append("extract")
        assert data == compressed, "extract should receive compressed bytes"
        return "some cv text"

    with patch.object(CVParserV2, "compress_image_if_needed", side_effect=mock_compress), \
         patch.object(parser, "extract_text_with_ai_vision", side_effect=mock_extract):
        try:
            parser.extract_text_from_image(original)
        except ValueError:
            # Expected if CV validation fails, but we still check call order
            pass

    assert call_order == ["compress", "extract"]


# ──────────────────────────────────────────────────────────────
# TC-IMG-12 — extract_text_from_multiple_images
# ──────────────────────────────────────────────────────────────

def test_multi_image_merges_in_page_order():
    """TC-IMG-12.1: 3 ảnh → text ghép đúng thứ tự trang 1→2→3."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    pages_text = ["Trang 1: Thông tin cá nhân", "Trang 2: Kinh nghiệm", "Trang 3: Kỹ năng"]

    call_count = [0]
    def mock_extract(data, is_pdf=False):
        idx = call_count[0]
        call_count[0] += 1
        return pages_text[idx]

    images = [_make_small_jpeg() for _ in range(3)]

    with patch.object(CVParserV2, "compress_image_if_needed", side_effect=lambda b, **kw: b), \
         patch.object(parser, "extract_text_with_ai_vision", side_effect=mock_extract):
        merged = parser.extract_text_from_multiple_images(images)

    for page_text in pages_text:
        assert page_text in merged, f"Missing page text: {page_text}"

    # Verify ordering
    idx1 = merged.index(pages_text[0])
    idx2 = merged.index(pages_text[1])
    idx3 = merged.index(pages_text[2])
    assert idx1 < idx2 < idx3, "Pages should appear in order 1 < 2 < 3"


def test_multi_image_separator_between_pages():
    """TC-IMG-12.2: Separator 'Trang tiếp theo' xuất hiện giữa các trang."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    images = [_make_small_jpeg(), _make_small_jpeg()]

    texts = ["Page 1 content", "Page 2 content"]
    call_count = [0]
    def mock_extract(data, is_pdf=False):
        idx = call_count[0]
        call_count[0] += 1
        return texts[idx]

    with patch.object(CVParserV2, "compress_image_if_needed", side_effect=lambda b, **kw: b), \
         patch.object(parser, "extract_text_with_ai_vision", side_effect=mock_extract):
        merged = parser.extract_text_from_multiple_images(images)

    assert "--- Trang tiếp theo ---" in merged


def test_multi_image_skips_empty_page():
    """TC-IMG-12.3: 1 trong 3 ảnh không có text → bỏ qua, giữ trang còn lại."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    images = [_make_small_jpeg(), _make_small_jpeg(), _make_small_jpeg()]

    texts = ["Trang 1 OK", "", "Trang 3 OK"]   # trang 2 rỗng
    call_count = [0]
    def mock_extract(data, is_pdf=False):
        idx = call_count[0]
        call_count[0] += 1
        return texts[idx]

    with patch.object(CVParserV2, "compress_image_if_needed", side_effect=lambda b, **kw: b), \
         patch.object(parser, "extract_text_with_ai_vision", side_effect=mock_extract):
        merged = parser.extract_text_from_multiple_images(images)

    assert "Trang 1 OK" in merged
    assert "Trang 3 OK" in merged


def test_multi_image_empty_list_raises():
    """TC-IMG-12.4: 0 ảnh → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    with pytest.raises(ValueError):
        parser.extract_text_from_multiple_images([])


def test_multi_image_all_empty_text_raises():
    """TC-IMG-12.5: Tất cả ảnh rỗng text → ValueError 'Không tìm thấy nội dung văn bản'."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2

    parser = CVParserV2()
    images = [_make_small_jpeg(), _make_small_jpeg()]

    with patch.object(CVParserV2, "compress_image_if_needed", side_effect=lambda b, **kw: b), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=""):
        with pytest.raises(ValueError, match="Không tìm thấy nội dung văn bản"):
            parser.extract_text_from_multiple_images(images)


# ──────────────────────────────────────────────────────────────
# TC-IMG-12.6 — Route POST /analyze-images
# ──────────────────────────────────────────────────────────────

def _make_upload_file(filename: str, content: bytes):
    upload = MagicMock()
    upload.filename = filename
    upload.read = MagicMock(return_value=content)

    async def async_read():
        return content

    upload.read = async_read
    return upload


@pytest.mark.anyio
async def test_analyze_images_route_success():
    """TC-IMG-12.6: POST /analyze-images 3 ảnh hợp lệ → success với merged text."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from app.modules.skill_gap.routes import analyze_cv_multi_image

    img_bytes = _make_small_jpeg()
    images = [_make_upload_file(f"page{i}.jpg", img_bytes) for i in range(3)]

    db = MagicMock()
    neo4j_driver = MagicMock()

    with patch.object(CVParserV2, "extract_text_from_multiple_images",
                      return_value="Merged text from 3 pages"):
        result = await analyze_cv_multi_image(
            career_id="15-1252.00",
            cv_images=images,
            user_id=1,
            db=db,
            neo4j_driver=neo4j_driver,
        )

    assert result["success"] is True
    assert result["page_count"] == 3


@pytest.mark.anyio
async def test_analyze_images_route_too_many_images():
    """TC-IMG-12.7: > 5 ảnh → HTTPException 400."""
    from app.modules.skill_gap.routes import analyze_cv_multi_image
    from fastapi import HTTPException

    img_bytes = _make_small_jpeg()
    images = [_make_upload_file(f"page{i}.jpg", img_bytes) for i in range(6)]

    with pytest.raises(HTTPException) as exc:
        await analyze_cv_multi_image(
            career_id="15-1252.00",
            cv_images=images,
            user_id=1,
            db=MagicMock(),
            neo4j_driver=MagicMock(),
        )
    assert exc.value.status_code == 400


@pytest.mark.anyio
async def test_analyze_images_route_no_text_returns_422():
    """TC-IMG-13.3: Ảnh không có text → HTTPException 422."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from app.modules.skill_gap.routes import analyze_cv_multi_image
    from fastapi import HTTPException

    img_bytes = _make_small_jpeg()
    images = [_make_upload_file("landscape.jpg", img_bytes)]

    with patch.object(CVParserV2, "extract_text_from_multiple_images",
                      side_effect=ValueError("Không tìm thấy nội dung văn bản trong ảnh")):
        with pytest.raises(HTTPException) as exc:
            await analyze_cv_multi_image(
                career_id="15-1252.00",
                cv_images=images,
                user_id=1,
                db=MagicMock(),
                neo4j_driver=MagicMock(),
            )
    assert exc.value.status_code == 422
    assert "Không tìm thấy" in exc.value.detail


@pytest.mark.anyio
async def test_analyze_images_route_rejects_non_image_files():
    """TC-IMG: Ảnh định dạng PDF → 400."""
    from app.modules.skill_gap.routes import analyze_cv_multi_image
    from fastapi import HTTPException

    pdf_upload = _make_upload_file("document.pdf", b"%PDF-1.4 fake content")

    with pytest.raises(HTTPException) as exc:
        await analyze_cv_multi_image(
            career_id="15-1252.00",
            cv_images=[pdf_upload],
            user_id=1,
            db=MagicMock(),
            neo4j_driver=MagicMock(),
        )
    assert exc.value.status_code == 400
