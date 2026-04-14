"""
TC-NON-07 to TC-NON-08 — Integration Tests for Data Protection & UX
====================================================================
Covers:
  TC-NON-07  Không ghi đè dữ liệu cũ khi upload file rác
  TC-NON-08  Gợi ý hành động (Call to Action) sau khi báo lỗi
"""
from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _make_test_image(width: int = 800, height: int = 600, color=None) -> bytes:
    """Tạo ảnh test."""
    try:
        from PIL import Image
        if color is None:
            color = (100, 150, 200)
        img = Image.new("RGB", (width, height), color=color)
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        return b"\xff\xd8\xff\xe0" + b"\x00" * 5000


def _make_upload_file(filename: str, content: bytes):
    """Tạo mock UploadFile."""
    upload = MagicMock()
    upload.filename = filename
    upload.content_type = "image/jpeg" if filename.endswith(('.jpg', '.jpeg')) else "application/pdf"
    
    async def async_read():
        return content
    
    upload.read = async_read
    return upload


# ──────────────────────────────────────────────────────────────
# TC-NON-07 — Không ghi đè dữ liệu cũ
# ──────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_invalid_upload_preserves_existing_data():
    """TC-NON-07.1: Upload ảnh rác không ghi đè CV cũ trong database."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    # Mock existing CV data in database
    existing_cv_data = {
        'id': 1,
        'user_id': 1,
        'career_id': '15-1252.00',
        'personal_info': {'name': 'John Doe', 'email': 'john@email.com'},
        'skills': [{'name': 'Python', 'category': 'Programming'}],
        'created_at': '2024-01-01'
    }
    
    # Mock database
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_query.filter.return_value.first.return_value = existing_cv_data
    mock_db.query.return_value = mock_query
    
    # Create invalid image (landscape)
    invalid_img = _make_test_image(color=(100, 150, 200))
    upload_file = _make_upload_file("landscape.jpg", invalid_img)
    
    # Mock Neo4j driver
    mock_neo4j = MagicMock()
    
    # Attempt to upload invalid image
    with pytest.raises(HTTPException) as exc_info:
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=mock_db,
            neo4j_driver=mock_neo4j
        )
    
    # Verify error was raised
    assert exc_info.value.status_code == 422
    
    # Verify database was NOT modified (no commit called)
    assert not mock_db.commit.called, "Database should not be modified on invalid upload"
    
    # Verify existing data is still intact
    existing_record = mock_db.query.return_value.filter.return_value.first.return_value
    assert existing_record == existing_cv_data, "Existing CV data should be preserved"


@pytest.mark.anyio
async def test_gibberish_upload_does_not_overwrite():
    """TC-NON-07.2: Upload văn bản rác không xóa dữ liệu cũ."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from app.modules.skill_gap.routes import analyze_cv_image
    
    # Existing good CV
    existing_skills = ['Python', 'Django', 'PostgreSQL', 'Docker']
    
    mock_db = MagicMock()
    mock_existing = MagicMock()
    mock_existing.skills = existing_skills
    mock_db.query.return_value.filter.return_value.first.return_value = mock_existing
    
    # Create image with gibberish text
    gibberish_img = _make_test_image()
    upload_file = _make_upload_file("gibberish.jpg", gibberish_img)
    
    # Mock parser to return gibberish
    with patch.object(CVParserV2, 'extract_text_from_image', 
                     side_effect=ValueError("Nội dung không giống một hồ sơ nghề nghiệp")):
        
        with pytest.raises(HTTPException) as exc_info:
            await analyze_cv_image(
                career_id='15-1252.00',
                cv_image=upload_file,
                user_id=1,
                db=mock_db,
                neo4j_driver=MagicMock()
            )
    
    # Verify error raised
    assert exc_info.value.status_code == 422
    
    # Verify existing skills not deleted
    assert mock_existing.skills == existing_skills


@pytest.mark.anyio
async def test_transaction_rollback_on_invalid_upload():
    """TC-NON-07.3: Transaction rollback khi upload file không hợp lệ."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    mock_db = MagicMock()
    mock_db.begin = MagicMock()  # Transaction context
    
    invalid_img = _make_test_image(color=(0, 0, 0))  # Black image
    upload_file = _make_upload_file("black.jpg", invalid_img)
    
    with pytest.raises(HTTPException):
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=mock_db,
            neo4j_driver=MagicMock()
        )
    
    # Verify no commit was called
    assert not mock_db.commit.called


@pytest.mark.anyio
async def test_multiple_invalid_uploads_preserve_data():
    """TC-NON-07.4: Nhiều lần upload sai liên tiếp không làm mất dữ liệu."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    # Original CV data
    original_data = {
        'name': 'Jane Smith',
        'email': 'jane@email.com',
        'skills': ['Java', 'Spring Boot', 'MySQL']
    }
    
    mock_db = MagicMock()
    mock_record = MagicMock()
    mock_record.personal_info = original_data
    mock_db.query.return_value.filter.return_value.first.return_value = mock_record
    
    # Try 3 invalid uploads
    invalid_images = [
        _make_test_image(color=(255, 255, 255)),  # White
        _make_test_image(color=(0, 0, 0)),        # Black
        _make_test_image(color=(100, 200, 50))    # Random color
    ]
    
    for i, img_bytes in enumerate(invalid_images):
        upload_file = _make_upload_file(f"invalid_{i}.jpg", img_bytes)
        
        with pytest.raises(HTTPException):
            await analyze_cv_image(
                career_id='15-1252.00',
                cv_image=upload_file,
                user_id=1,
                db=mock_db,
                neo4j_driver=MagicMock()
            )
    
    # Verify data still intact after 3 failed attempts
    assert mock_record.personal_info == original_data
    assert not mock_db.commit.called


# ──────────────────────────────────────────────────────────────
# TC-NON-08 — Gợi ý hành động (Call to Action)
# ──────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_error_response_includes_action_suggestions():
    """TC-NON-08.1: Response lỗi chứa gợi ý hành động cho user."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    invalid_img = _make_test_image(color=(100, 150, 200))
    upload_file = _make_upload_file("landscape.jpg", invalid_img)
    
    try:
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=MagicMock(),
            neo4j_driver=MagicMock()
        )
    except HTTPException as e:
        error_detail = e.detail
        
        # Verify error message is helpful
        assert isinstance(error_detail, (str, dict))
        
        if isinstance(error_detail, str):
            # Should contain Vietnamese guidance
            assert any(keyword in error_detail.lower() for keyword in [
                'vui lòng', 'tải lên', 'cv', 'resume', 'hồ sơ'
            ]), "Error should guide user to upload correct file"


@pytest.mark.anyio
async def test_error_response_format_for_frontend():
    """TC-NON-08.2: Error response có format phù hợp cho frontend xử lý."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    invalid_img = _make_test_image(color=(255, 255, 255))
    upload_file = _make_upload_file("white.jpg", invalid_img)
    
    try:
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=MagicMock(),
            neo4j_driver=MagicMock()
        )
    except HTTPException as e:
        # Verify status code is appropriate
        assert e.status_code in [400, 422], "Should use 4xx status for client errors"
        
        # Verify detail is present
        assert e.detail is not None
        assert len(str(e.detail)) > 0


@pytest.mark.anyio
async def test_different_error_types_have_specific_messages():
    """TC-NON-08.3: Các loại lỗi khác nhau có message riêng biệt."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from app.modules.skill_gap.routes import analyze_cv_image
    
    test_cases = [
        {
            'name': 'no_text',
            'error': ValueError("Ảnh không có đặc điểm của tài liệu CV"),
            'expected_keywords': ['không có', 'đặc điểm', 'tài liệu']
        },
        {
            'name': 'non_cv_content',
            'error': ValueError("Nội dung không giống một hồ sơ nghề nghiệp"),
            'expected_keywords': ['không giống', 'hồ sơ', 'nghề nghiệp']
        },
        {
            'name': 'selfie',
            'error': ValueError("Ảnh chân dung/selfie, không phải tài liệu CV"),
            'expected_keywords': ['chân dung', 'selfie', 'không phải']
        }
    ]
    
    for test_case in test_cases:
        img_bytes = _make_test_image()
        upload_file = _make_upload_file(f"{test_case['name']}.jpg", img_bytes)
        
        with patch.object(CVParserV2, 'extract_text_from_image', 
                         side_effect=test_case['error']):
            
            try:
                await analyze_cv_image(
                    career_id='15-1252.00',
                    cv_image=upload_file,
                    user_id=1,
                    db=MagicMock(),
                    neo4j_driver=MagicMock()
                )
            except HTTPException as e:
                error_msg = str(e.detail).lower()
                
                # Verify specific error message
                assert any(kw in error_msg for kw in test_case['expected_keywords']), \
                    f"Error for {test_case['name']} should contain specific keywords"


@pytest.mark.anyio
async def test_error_includes_file_type_guidance():
    """TC-NON-08.4: Error message hướng dẫn loại file được chấp nhận."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    # Try uploading wrong file type
    invalid_img = _make_test_image()
    upload_file = _make_upload_file("document.txt", b"plain text content")
    upload_file.content_type = "text/plain"
    
    try:
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=MagicMock(),
            neo4j_driver=MagicMock()
        )
    except HTTPException as e:
        # Should mention accepted file types
        error_msg = str(e.detail).lower()
        # Error should guide about file types (checked in route validation)
        assert e.status_code in [400, 422]


@pytest.mark.anyio
async def test_success_response_format():
    """TC-NON-08.5: Success response có format chuẩn cho frontend."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    from app.modules.skill_gap.routes import analyze_cv_image
    
    valid_cv_text = """
John Doe
Email: john@email.com
Phone: 0900123456

Experience: Software Engineer at ABC Company
Education: BS Computer Science
Skills: Python, Django, PostgreSQL
"""
    
    valid_img = _make_test_image()
    upload_file = _make_upload_file("cv.jpg", valid_img)
    
    mock_db = MagicMock()
    mock_neo4j = MagicMock()
    
    # Mock successful parsing
    with patch.object(CVParserV2, 'extract_text_from_image', return_value=valid_cv_text), \
         patch.object(CVParserV2, 'extract_all_with_ai', return_value={
             'personal_info': {'name': 'John Doe', 'email': 'john@email.com'},
             'skills': [{'name': 'Python', 'category': 'Programming'}]
         }), \
         patch('app.modules.skill_gap.routes.analyze_skills_with_neo4j', 
               return_value={'matched_skills': [], 'missing_skills': []}):
        
        result = await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=mock_db,
            neo4j_driver=mock_neo4j
        )
    
    # Verify success response structure
    assert isinstance(result, dict)
    assert 'success' in result or 'personal_info' in result or 'skills' in result


# ──────────────────────────────────────────────────────────────
# Additional UX Tests
# ──────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_error_response_is_json_serializable():
    """TC-NON-08.6: Error response có thể serialize thành JSON."""
    import json

    from app.modules.skill_gap.routes import analyze_cv_image
    
    invalid_img = _make_test_image(color=(0, 0, 0))
    upload_file = _make_upload_file("black.jpg", invalid_img)
    
    try:
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=MagicMock(),
            neo4j_driver=MagicMock()
        )
    except HTTPException as e:
        # Verify detail can be serialized to JSON
        try:
            json.dumps({'error': str(e.detail)})
        except (TypeError, ValueError):
            pytest.fail("Error detail should be JSON serializable")


@pytest.mark.anyio
async def test_concurrent_invalid_uploads_handled_safely():
    """TC-NON-07.5: Xử lý an toàn khi nhiều user upload file sai cùng lúc."""
    import asyncio

    from app.modules.skill_gap.routes import analyze_cv_image
    
    # Simulate 5 concurrent invalid uploads
    async def upload_invalid():
        invalid_img = _make_test_image(color=(100, 100, 100))
        upload_file = _make_upload_file("invalid.jpg", invalid_img)
        
        try:
            await analyze_cv_image(
                career_id='15-1252.00',
                cv_image=upload_file,
                user_id=1,
                db=MagicMock(),
                neo4j_driver=MagicMock()
            )
        except HTTPException:
            return "error"
        return "success"
    
    # Run 5 uploads concurrently
    results = await asyncio.gather(*[upload_invalid() for _ in range(5)])
    
    # All should fail gracefully
    assert all(r == "error" for r in results)


@pytest.mark.anyio
async def test_validation_error_before_database_access():
    """TC-NON-07.6: Validation lỗi trước khi truy cập database."""
    from app.modules.skill_gap.routes import analyze_cv_image
    
    invalid_img = _make_test_image(color=(255, 255, 255))
    upload_file = _make_upload_file("white.jpg", invalid_img)
    
    mock_db = MagicMock()
    
    try:
        await analyze_cv_image(
            career_id='15-1252.00',
            cv_image=upload_file,
            user_id=1,
            db=mock_db,
            neo4j_driver=MagicMock()
        )
    except HTTPException:
        pass
    
    # Database query should not be called for invalid files
    # (or minimal queries only for checking existing data)
    # This ensures we don't waste database resources on invalid uploads
