#!/usr/bin/env python3
"""
TC-CV Unit Tests - CV Validator
Unit tests cho CVValidator class (không cần FastAPI TestClient)
"""

import os
import sys
import tempfile
import pytest
from pathlib import Path

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.modules.skill_gap.cv_validator import CVValidator, CVValidationError

class TestCVValidator:
    """Unit tests for CVValidator"""
    
    # ==================== TC-CV-01: File Extension Validation ====================
    
    def test_tc_cv_01_valid_pdf_extension(self):
        """TC-CV-01.1: Valid PDF extension"""
        result = CVValidator.validate_extension("test_cv.pdf")
        assert result == ".pdf"
        print("✅ TC-CV-01.1: Valid PDF extension accepted")
    
    def test_tc_cv_01_valid_docx_extension(self):
        """TC-CV-01.2: Valid DOCX extension"""
        result = CVValidator.validate_extension("test_cv.docx")
        assert result == ".docx"
        print("✅ TC-CV-01.2: Valid DOCX extension accepted")
    
    def test_tc_cv_01_valid_jpg_extension(self):
        """TC-CV-01.3: Valid JPG extension"""
        result = CVValidator.validate_extension("test_cv.jpg")
        assert result == ".jpg"
        print("✅ TC-CV-01.3: Valid JPG extension accepted")
    
    def test_tc_cv_01_valid_png_extension(self):
        """TC-CV-01.4: Valid PNG extension"""
        result = CVValidator.validate_extension("test_cv.png")
        assert result == ".png"
        print("✅ TC-CV-01.4: Valid PNG extension accepted")
    
    def test_tc_cv_01_invalid_exe_extension(self):
        """TC-CV-01.5: Invalid EXE extension"""
        with pytest.raises(CVValidationError) as exc_info:
            CVValidator.validate_extension("malicious.exe")
        
        assert "Unsupported file format" in str(exc_info.value.message)
        print("✅ TC-CV-01.5: EXE extension rejected")
    
    def test_tc_cv_01_invalid_zip_extension(self):
        """TC-CV-01.6: Invalid ZIP extension"""
        with pytest.raises(CVValidationError) as exc_info:
            CVValidator.validate_extension("archive.zip")
        
        assert "Unsupported file format" in str(exc_info.value.message)
        print("✅ TC-CV-01.6: ZIP extension rejected")
    
    def test_tc_cv_01_no_extension(self):
        """TC-CV-01.7: No extension"""
        with pytest.raises(CVValidationError) as exc_info:
            CVValidator.validate_extension("cv_no_extension")
        
        assert "must have an extension" in str(exc_info.value.message)
        print("✅ TC-CV-01.7: File without extension rejected")
    
    # ==================== TC-CV-03: Filename Sanitization ====================
    
    def test_tc_cv_03_vietnamese_filename(self):
        """TC-CV-03.1: Vietnamese characters in filename"""
        result = CVValidator.sanitize_filename("CV_Nguyễn_Văn_A.pdf")
        assert ".pdf" in result
        assert ".." not in result
        print(f"✅ TC-CV-03.1: Vietnamese filename sanitized to: {result}")
    
    def test_tc_cv_03_safe_special_chars(self):
        """TC-CV-03.2: Safe special characters"""
        result = CVValidator.sanitize_filename("CV-John_Doe-2024.pdf")
        assert result == "CV-John_Doe-2024.pdf"
        print(f"✅ TC-CV-03.2: Safe special chars preserved: {result}")
    
    def test_tc_cv_03_unsafe_special_chars(self):
        """TC-CV-03.3: Unsafe special characters"""
        result = CVValidator.sanitize_filename("CV!@#$%.pdf")
        assert "!" not in result
        assert "@" not in result
        assert "#" not in result
        assert "$" not in result
        assert ".pdf" in result
        print(f"✅ TC-CV-03.3: Unsafe chars sanitized to: {result}")
    
    def test_tc_cv_03_path_traversal(self):
        """TC-CV-03.4: Path traversal attempt"""
        result = CVValidator.sanitize_filename("../../etc/passwd.pdf")
        assert ".." not in result
        assert "/" not in result or result.count("/") == 0
        assert ".pdf" in result
        print(f"✅ TC-CV-03.4: Path traversal prevented: {result}")
    
    def test_tc_cv_03_unicode_emoji(self):
        """TC-CV-03.5: Unicode emoji"""
        result = CVValidator.sanitize_filename("CV_😀_Resume.pdf")
        # Emoji should be replaced
        assert "😀" not in result
        assert ".pdf" in result
        print(f"✅ TC-CV-03.5: Unicode emoji sanitized to: {result}")
    
    def test_tc_cv_03_very_long_filename(self):
        """TC-CV-03.6: Very long filename"""
        long_name = "CV_" + "A" * 300 + ".pdf"
        result = CVValidator.sanitize_filename(long_name)
        assert len(result) <= 255
        assert ".pdf" in result
        print(f"✅ TC-CV-03.6: Long filename truncated to {len(result)} chars")
    
    def test_tc_cv_03_multiple_dots(self):
        """TC-CV-03.7: Multiple dots in filename"""
        result = CVValidator.sanitize_filename("CV...test...file.pdf")
        # Should handle multiple dots
        assert ".pdf" in result
        print(f"✅ TC-CV-03.7: Multiple dots handled: {result}")
    
    def test_tc_cv_03_windows_path(self):
        """TC-CV-03.8: Windows path separators"""
        result = CVValidator.sanitize_filename("C:\\Users\\Test\\CV.pdf")
        assert "\\" not in result
        assert ":" not in result
        assert ".pdf" in result
        print(f"✅ TC-CV-03.8: Windows path sanitized to: {result}")
    
    def test_tc_cv_03_unix_path(self):
        """TC-CV-03.9: Unix path separators"""
        result = CVValidator.sanitize_filename("/home/user/documents/CV.pdf")
        assert "/" not in result or result.count("/") == 0
        assert ".pdf" in result
        print(f"✅ TC-CV-03.9: Unix path sanitized to: {result}")
    
    def test_tc_cv_03_mixed_case_extension(self):
        """TC-CV-03.10: Mixed case extension"""
        result = CVValidator.sanitize_filename("CV_Test.PDF")
        assert ".PDF" in result or ".pdf" in result
        print(f"✅ TC-CV-03.10: Mixed case extension preserved: {result}")
    
    # ==================== Edge Cases ====================
    
    def test_edge_case_empty_filename(self):
        """Edge case: Empty filename"""
        with pytest.raises(CVValidationError) as exc_info:
            CVValidator.sanitize_filename("")
        
        assert "empty" in str(exc_info.value.message).lower()
        print("✅ Edge case: Empty filename rejected")
    
    def test_edge_case_only_extension(self):
        """Edge case: Only extension"""
        result = CVValidator.sanitize_filename(".pdf")
        assert ".pdf" in result
        print(f"✅ Edge case: Only extension handled: {result}")
    
    def test_edge_case_spaces_only(self):
        """Edge case: Spaces only"""
        result = CVValidator.sanitize_filename("     .pdf")
        assert ".pdf" in result
        print(f"✅ Edge case: Spaces only handled: {result}")
    
    def test_edge_case_special_chars_only(self):
        """Edge case: Special characters only"""
        result = CVValidator.sanitize_filename("!@#$%^&*().pdf")
        assert ".pdf" in result
        # Should have some sanitized content
        assert len(result) > 4  # More than just ".pdf"
        print(f"✅ Edge case: Special chars only sanitized to: {result}")


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("TC-CV Unit Tests - CV Validator")
    print("=" * 60)
    
    # Run pytest
    exit_code = pytest.main([__file__, '-v', '--tb=short', '-s'])
    
    print("\n" + "=" * 60)
    if exit_code == 0:
        print("🎉 ALL UNIT TESTS PASSED!")
    else:
        print("⚠️  SOME TESTS FAILED")
    print("=" * 60)
    
    return exit_code


if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)
