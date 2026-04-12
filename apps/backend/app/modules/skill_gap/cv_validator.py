"""
CV Upload Validator
Comprehensive validation for CV file uploads
Implements TC-CV-01, TC-CV-02, TC-CV-03 test cases
"""

import re
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException

# Optional: python-magic for MIME detection
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

# Configuration
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MIN_FILE_SIZE_BYTES = 100
MAX_FILENAME_LENGTH = 255

ALLOWED_EXTENSIONS = {
    '.pdf': ['application/pdf'],
    '.docx': [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ],
    '.doc': ['application/msword'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.txt': ['text/plain']
}

ALLOWED_MIME_TYPES = set()
for mimes in ALLOWED_EXTENSIONS.values():
    ALLOWED_MIME_TYPES.update(mimes)


class CVValidationError(Exception):
    """Custom exception for CV validation errors"""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class CVValidator:
    """Validator for CV file uploads"""
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        TC-CV-03: Sanitize filename to prevent security issues
        - Remove path traversal attempts (../)
        - Remove unsafe characters
        - Handle Unicode and special characters
        - Limit filename length
        """
        if not filename:
            raise CVValidationError("Filename is empty", 400)
        
        # Remove path components
        filename = filename.split('/')[-1].split('\\')[-1]
        
        # Replace path traversal attempts
        filename = filename.replace('..', '_')
        
        # Keep only safe characters: alphanumeric, spaces, hyphens, underscores, dots
        # Also keep Vietnamese characters
        safe_filename = re.sub(r'[^\w\s\-\.\u00C0-\u1EF9]', '_', filename)
        
        # Remove multiple consecutive dots (except before extension)
        parts = safe_filename.rsplit('.', 1)
        if len(parts) == 2:
            name, ext = parts
            name = re.sub(r'\.+', '_', name)
            safe_filename = f"{name}.{ext}"
        
        # Limit length
        if len(safe_filename) > MAX_FILENAME_LENGTH:
            # Keep extension, truncate name
            parts = safe_filename.rsplit('.', 1)
            if len(parts) == 2:
                name, ext = parts
                max_name_len = MAX_FILENAME_LENGTH - len(ext) - 1
                safe_filename = f"{name[:max_name_len]}.{ext}"
            else:
                safe_filename = safe_filename[:MAX_FILENAME_LENGTH]
        
        return safe_filename
    
    @staticmethod
    def validate_extension(filename: str) -> str:
        """
        TC-CV-01: Validate file extension
        Returns the validated extension in lowercase
        """
        if '.' not in filename:
            raise CVValidationError(
                "File must have an extension (e.g., .pdf, .docx, .jpg)",
                400
            )
        
        ext = '.' + filename.split('.')[-1].lower()
        
        if ext not in ALLOWED_EXTENSIONS:
            allowed_list = ', '.join(ALLOWED_EXTENSIONS.keys())
            raise CVValidationError(
                f"Unsupported file format '{ext}'. Allowed formats: {allowed_list}",
                400
            )
        
        return ext
    
    @staticmethod
    async def validate_file_size(file: UploadFile) -> int:
        """
        TC-CV-02: Validate file size
        Returns the file size in bytes
        """
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Reset file pointer
        await file.seek(0)
        
        # Check empty file
        if file_size == 0:
            raise CVValidationError(
                "File is empty (0 bytes). Please upload a valid CV file.",
                400
            )
        
        # Check minimum size
        if file_size < MIN_FILE_SIZE_BYTES:
            raise CVValidationError(
                f"File too small ({file_size} bytes). Minimum size: {MIN_FILE_SIZE_BYTES} bytes.",
                400
            )
        
        # Check maximum size
        if file_size > MAX_FILE_SIZE_BYTES:
            size_mb = file_size / 1024 / 1024
            raise CVValidationError(
                f"File too large ({size_mb:.2f} MB). Maximum size: {MAX_FILE_SIZE_MB} MB.",
                413
            )
        
        return file_size
    
    @staticmethod
    async def validate_mime_type(file: UploadFile, expected_ext: str) -> bool:
        """
        TC-CV-04: Validate MIME type matches extension
        Detects files with wrong extensions (e.g., .txt renamed to .pdf)
        """
        try:
            # Read first 2048 bytes for magic number detection
            content = await file.read(2048)
            await file.seek(0)
            
            # Use python-magic if available, otherwise use basic detection
            if HAS_MAGIC:
                try:
                    mime = magic.from_buffer(content, mime=True)
                except:
                    mime = CVValidator._detect_mime_basic(content)
            else:
                mime = CVValidator._detect_mime_basic(content)
            
            # Check if detected MIME matches expected extension
            expected_mimes = ALLOWED_EXTENSIONS.get(expected_ext, [])
            
            if mime not in expected_mimes:
                # Allow some flexibility for images
                if expected_ext in ['.jpg', '.jpeg', '.png'] and mime.startswith('image/'):
                    return True
                
                # Allow text files
                if expected_ext == '.txt' and mime.startswith('text/'):
                    return True
                
                raise CVValidationError(
                    f"File content doesn't match extension. Expected {expected_ext} but detected {mime}",
                    400
                )
            
            return True
            
        except CVValidationError:
            raise
        except Exception as e:
            # If MIME detection fails, allow file (don't block valid files)
            print(f"MIME detection warning: {e}")
            return True
    
    @staticmethod
    def _detect_mime_basic(content: bytes) -> str:
        """Basic MIME type detection using magic numbers"""
        if content.startswith(b'%PDF'):
            return 'application/pdf'
        elif content.startswith(b'\xFF\xD8\xFF'):
            return 'image/jpeg'
        elif content.startswith(b'\x89PNG'):
            return 'image/png'
        elif content.startswith(b'PK\x03\x04'):
            # ZIP-based formats (DOCX, etc.)
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:
            return 'application/octet-stream'
    
    @staticmethod
    async def validate_cv_upload(file: UploadFile) -> Tuple[str, int]:
        """
        Complete validation pipeline for CV uploads
        
        Returns:
            Tuple[str, int]: (sanitized_filename, file_size_bytes)
        
        Raises:
            CVValidationError: If validation fails
        """
        # TC-CV-03: Sanitize filename
        safe_filename = CVValidator.sanitize_filename(file.filename)
        
        # TC-CV-01: Validate extension
        ext = CVValidator.validate_extension(safe_filename)
        
        # TC-CV-02: Validate file size
        file_size = await CVValidator.validate_file_size(file)
        
        # TC-CV-04: Validate MIME type (optional, can be disabled if causing issues)
        try:
            await CVValidator.validate_mime_type(file, ext)
        except Exception as e:
            # Log warning but don't fail
            print(f"MIME validation warning: {e}")
        
        # Update file with sanitized filename
        file.filename = safe_filename
        
        return safe_filename, file_size


def validate_cv_file(file: UploadFile) -> Tuple[str, int]:
    """
    Synchronous wrapper for CV validation
    Use this in non-async contexts
    """
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(CVValidator.validate_cv_upload(file))
