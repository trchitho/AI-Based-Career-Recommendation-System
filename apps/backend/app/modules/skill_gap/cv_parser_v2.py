"""
CV Parser V2 - Improved version with AI-first approach
Đọc toàn bộ CV bằng AI để extract chính xác
Updated to use 3-stream system
"""
import json
import re
from typing import Dict

import PyPDF2
from app.core.gemini_manager import multi_stream_manager


class CVParserV2:
    """Parser cải tiến - dùng AI đọc toàn bộ CV"""

    # TC-PDF-NON-02: Giới hạn trang tối đa cho một CV thông thường
    MAX_CV_PAGES = 10

    def __init__(self, db_session=None):
        self.db = db_session
        self._skill_cache = None
    
    def extract_text_with_ai_vision(self, file_content: bytes, is_pdf: bool = False) -> str:
        """
        Dùng Gemini Vision API để đọc PDF/Image trực tiếp
        Updated to use CV analysis stream
        
        Args:
            file_content: Nội dung file
            is_pdf: True nếu là PDF, False nếu là image
            
        Returns:
            str: Text extracted by AI
        """
        try:
            import io

            from PIL import Image
            
            # Use the dedicated CV analysis stream
            cv_stream = multi_stream_manager.get_cv_stream()
            
            if not cv_stream.is_available():
                print("  ⚠️ CV analysis stream not available")
                return ''
            
            print(f"Using CV analysis stream: {cv_stream.model_name}")
            model = cv_stream.model
            
            prompt = """
Read this CV/Resume image carefully and extract ALL text content.

Extract:
1. Personal Information (Name, Email, Phone)
2. Education
3. Work Experience
4. Skills (ALL technical and soft skills)
5. Projects
6. Any other text

Return the complete text exactly as it appears, maintaining structure.
Use clear formatting with line breaks between sections.
"""
            
            if is_pdf:
                # Convert PDF to images
                try:
                    import pdf2image
                    print("  📄 Converting PDF to images...")
                    images = pdf2image.convert_from_bytes(file_content, first_page=1, last_page=3)
                    
                    full_text = ""
                    for i, img in enumerate(images):
                        print(f"  📸 Processing page {i+1} with AI Vision...")
                        # Use CV stream for content generation
                        response_text = cv_stream.generate_content_with_retry(
                            [prompt, img]
                        )
                        if response_text:
                            full_text += response_text + "\n\n"
                    
                    print(f"  ✅ AI Vision extracted {len(full_text)} characters from PDF")
                    return full_text
                    
                except ImportError:
                    print("  ⚠️ pdf2image not installed")
                    return ''
            else:
                # Direct image processing
                print("  📸 Processing image with AI Vision...")
                img = Image.open(io.BytesIO(file_content))
                
                # Resize if too large (max 4MB for Gemini)
                max_size = (2048, 2048)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    print(f"  🔄 Resizing image from {img.size} to fit {max_size}")
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Use CV stream for content generation
                response_text = cv_stream.generate_content_with_retry([prompt, img])
                
                if response_text:
                    print(f"  ✅ AI Vision extracted {len(response_text)} characters from image")
                    return response_text
                else:
                    print("  ⚠️ AI Vision returned no text")
                    return ""
            
        except Exception as e:
            error_msg = str(e)
            print(f"  ❌ AI Vision extraction failed: {error_msg}")
            
            # Check for fast fail conditions
            if any(keyword in error_msg.lower() for keyword in ['quota', '429', 'rate limit', 'api key', 'expired', 'invalid']):
                print("  ⚡ FAST FAIL - API quota/key issue detected")
            else:
                print("  ⚠️ Unexpected vision error")
                import traceback
                traceback.print_exc()
            
            return ''
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF - tries multiple methods"""
        
        # Method 1: Try PyMuPDF (best)
        text = self._extract_with_pymupdf(file_content)
        if text and len(text) > 50:
            return text
        
        # Method 2: Try pdfplumber
        text = self._extract_with_pdfplumber(file_content)
        if text and len(text) > 50:
            return text
        
        # Method 3: Try PyPDF2
        text = self._extract_with_pypdf2(file_content)
        if text and len(text) > 50:
            return text
        
        # Method 4: AI Vision (last resort)
        print("  ⚠️ All PDF extraction methods failed, trying AI Vision...")
        text = self.extract_text_with_ai_vision(file_content, is_pdf=True)
        
        return text
    
    # ── Pre-check: phát hiện ảnh không có chữ trước khi gọi Gemini ───────

    @staticmethod
    def _quick_has_text(image_bytes: bytes) -> tuple[bool, str]:
        """
        Kiểm tra nhanh (local, miễn phí, không gọi API) xem ảnh có đủ text không.

        Chiến lược 2 tầng:
        1. pytesseract  — nếu Tesseract binary được cài → OCR thật, chính xác nhất
        2. PIL edge-density heuristic — fallback khi không có Tesseract

        Trả về (ok, reason):
            ok=True  → có đủ text, tiếp tục gọi Gemini
            ok=False → ảnh không có text, reject ngay

        Heuristic edge-density:
            Ảnh CV (nhiều chữ) → nhiều cạnh ngang từ dòng chữ → edge_mean cao (> 8)
            Ảnh meme/phong cảnh → ít cạnh dạng text → edge_mean thấp (< 5)
            Ảnh logo/banner đơn giản → rất ít cạnh → edge_mean rất thấp
        """
        import io

        from PIL import Image, ImageFilter, ImageStat

        try:
            img_orig = Image.open(io.BytesIO(image_bytes))
            img = img_orig.convert("L")   # grayscale

            # Scale xuống 600px để xử lý nhanh
            max_dim = 600
            if img.width > max_dim or img.height > max_dim:
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                img_orig.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

            # ── Tầng 1: pytesseract nếu có ────────────────────────────────
            try:
                import pytesseract
                text = pytesseract.image_to_string(
                    img,
                    config="--psm 1 --oem 1",
                    timeout=8,
                )
                words = [w for w in text.split() if len(w) >= 2]
                word_count = len(words)
                print(f"  [PreCheck-OCR] {word_count} words detected")
                if word_count < 15:
                    return False, f"Ảnh chỉ có {word_count} từ, không đủ nội dung CV."
                return True, ""
            except Exception:
                pass  # Tesseract binary chưa cài → dùng heuristic

            # ── Tầng 2: PIL multi-signal heuristic ────────────────────────
            edges = img.filter(ImageFilter.FIND_EDGES)

            # PIL FIND_EDGES luôn tạo pixel=255 tại biên ảnh (zero-padding artifact).
            # Phải crop kết quả edge đi 2px mỗi phía để loại giá trị giả.
            margin = 2
            if edges.width > 2 * margin and edges.height > 2 * margin:
                edges_interior = edges.crop(
                    (margin, margin, edges.width - margin, edges.height - margin)
                )
            else:
                edges_interior = edges

            edge_mean = ImageStat.Stat(edges_interior).mean[0]   # cao = nhiều cạnh = nhiều chữ

            # Phân tích histogram pixel (dùng img gốc để có sample đại diện hơn)
            pixels = img.getflattened_data() if hasattr(img, 'getflattened_data') else list(img.getdata())
            total = len(pixels) or 1

            # Tỷ lệ pixel rất sáng (nền giấy trắng của CV)
            light_ratio = sum(1 for p in pixels if p > 200) / total
            # Tỷ lệ pixel rất tối (mực chữ)
            dark_ratio  = sum(1 for p in pixels if p < 60)  / total

            print(
                f"  [PreCheck] edge={edge_mean:.1f}  "
                f"light={light_ratio:.2f}  dark={dark_ratio:.2f}"
            )

            # ── Quyết định ────────────────────────────────────────────────
            #
            # 2 tín hiệu chính để phân biệt CV vs ảnh không phải CV:
            #
            #  A) edge_mean ≥ 5  → ảnh có nhiều đường nét sắc nét (chữ viết)
            #     - CV thật:      edge 15-40  ✅
            #     - Ảnh trắng:    edge ~2     ❌
            #     - Meme it chữ:  edge ~3     ❌
            #     - Cartoon phức tạp: edge 8+ nhưng thiếu nền trắng → bị chặn bởi B
            #
            #  B) light_ratio ≥ 0.40 → >40% pixel sáng (nền giấy trắng)
            #     - CV thật:      light 0.90+ ✅
            #     - Meme nền be:  light ~0    ❌
            #     - Cartoon màu:  light ~0    ❌
            #     - Phong cảnh:   light 0.1-0.3 ❌

            reasons = []
            if edge_mean < 5.0:
                reasons.append(f"ít đường nét văn bản (score={edge_mean:.0f}/5)")
            if light_ratio < 0.40:
                reasons.append(
                    f"không có nền giấy sáng — ảnh màu hoặc ảnh chụp "
                    f"(chỉ {light_ratio:.0%} pixel sáng, cần ≥40%)"
                )

            if reasons:
                return False, "Ảnh không có đặc điểm của tài liệu CV."

            # ── Tầng 3: Selfie / chân dung người (local, không API) ───────
            is_selfie, selfie_reason = CVParserV2._detect_selfie(img_orig)
            if is_selfie:
                return False, "Ảnh chân dung/selfie, không phải tài liệu CV."

            return True, ""

        except Exception as e:
            print(f"  [PreCheck] Error: {e} - skipping pre-check")
            return True, ""   # Nếu lỗi hẳn thì skip, để Gemini quyết định

    @staticmethod
    def _detect_selfie(img_original) -> tuple[bool, str]:
        """
        TC-NON-03: Phát hiện ảnh chân dung/selfie (local, không API).

        Chiến lược 2 tầng:
        Tier A — OpenCV Haar cascade face detector (nếu cv2 được cài)
        Tier B — Skin tone pixel ratio (PIL RGB, không cần thư viện thêm)

        Trả về (is_selfie, reason):
            is_selfie=True  → reject, đây là ảnh người, không phải CV
            is_selfie=False → OK, không phát hiện khuôn mặt rõ ràng
        """
        # ── Tier A: OpenCV Haar cascade ────────────────────────────────────
        try:
            import cv2
            import numpy as np

            img_gray_arr = np.array(img_original.convert("L"))
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            faces = face_cascade.detectMultiScale(
                img_gray_arr,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
            )
            total_area = (img_gray_arr.shape[0] * img_gray_arr.shape[1]) or 1
            face_area = sum(w * h for (_, _, w, h) in faces)
            face_ratio = face_area / total_area

            print(
                f"  [SelfieCheck-OpenCV] {len(faces)} face(s) detected, "
                f"area_ratio={face_ratio:.2f}"
            )
            if len(faces) > 0 and face_ratio > 0.05:
                return True, (
                    f"phát hiện {len(faces)} khuôn mặt "
                    f"(chiếm {face_ratio:.0%} diện tích ảnh)"
                )
            return False, ""
        except Exception:
            pass  # cv2 chưa cài hoặc cascade load lỗi → dùng heuristic

        # ── Tier B: Skin tone pixel ratio (PIL RGB) ────────────────────────
        try:
            img_rgb = img_original.convert("RGB")
            pixels = list(img_rgb.getdata())
            total = len(pixels) or 1

            skin_count = sum(
                1
                for r, g, b in pixels
                if (
                    r > 95
                    and g > 40
                    and b > 20
                    and r > g
                    and r > b
                    and abs(int(r) - int(g)) > 15
                    and int(r) - int(b) > 15
                )
            )
            skin_ratio = skin_count / total
            print(f"  [SelfieCheck-SkinTone] skin_ratio={skin_ratio:.2f}")

            if skin_ratio > 0.20:   # > 20% pixel tông màu da → khả năng cao là selfie
                return True, (
                    f"phát hiện {skin_ratio:.0%} pixel tông màu da "
                    f"(ngưỡng: >20%) — có thể là ảnh chân dung người"
                )
        except Exception:
            pass

        return False, ""

    # ── TC-IMG-11: Image compression ──────────────────────────────────────

    @staticmethod
    def compress_image_if_needed(
        file_content: bytes,
        max_bytes: int = 4 * 1024 * 1024,   # 4 MB Gemini limit
        max_dim: int = 2048,
    ) -> bytes:
        """
        TC-IMG-11: Nén ảnh về kích thước phù hợp trước khi gửi OCR.

        - Resize nếu chiều rộng hoặc cao > max_dim
        - Giảm JPEG quality lặp đến khi file < max_bytes
        - Trả về bytes đã nén (hoặc bytes gốc nếu đã đủ nhỏ)
        """
        try:
            import io

            from PIL import Image

            img = Image.open(io.BytesIO(file_content))

            # Resize if too large
            if img.size[0] > max_dim or img.size[1] > max_dim:
                print(f"  🔄 [TC-IMG-11] Resizing image {img.size} → max {max_dim}px")
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

            # Convert RGBA/P to RGB for JPEG
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # If already small enough, return as JPEG
            buf = io.BytesIO()
            quality = 85
            img.save(buf, format="JPEG", quality=quality)
            result = buf.getvalue()

            # Reduce quality iteratively until under max_bytes
            while len(result) > max_bytes and quality > 30:
                quality -= 10
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=quality)
                result = buf.getvalue()
                print(f"  🗜️ [TC-IMG-11] Compressed to {len(result)/1024:.0f}KB at quality={quality}")

            print(f"  ✅ [TC-IMG-11] Final image size: {len(result)/1024:.0f}KB")
            return result

        except Exception as e:
            print(f"  ⚠️ [TC-IMG-11] Compression failed, using original: {e}")
            return file_content

    def extract_text_from_image(self, file_content: bytes) -> str:
        """
        TC-IMG-11 / TC-IMG-13 / TC-NON-02: Extract text from image using Gemini Vision.

        Luồng xử lý:
        1. pytesseract pre-check (local, miễn phí) — nếu ảnh < 20 từ → reject ngay,
           KHÔNG gọi Gemini, tiết kiệm token.
        2. Compress ảnh nếu cần (TC-IMG-11).
        3. Gọi Gemini Vision để extract toàn bộ nội dung CV.
        4. Nếu Gemini trả rỗng → raise ValueError (TC-IMG-13).
        5. TC-NON-02: Validate content is actually a CV (not newspaper, receipt, menu, etc.)
        """
        print("  [Image] Pre-checking image before Gemini call...")

        # ── Bước 1: Kiểm tra nhanh LOCAL (KHÔNG tốn Gemini token) ────────────
        has_text, reason = self._quick_has_text(file_content)
        if not has_text:
            raise ValueError(reason)

        print("  [PreCheck] Image has sufficient text - sending to Gemini Vision...")

        # ── Bước 2: Compress trước khi gửi Gemini (TC-IMG-11) ─────────────────
        compressed = self.compress_image_if_needed(file_content)

        text = self.extract_text_with_ai_vision(compressed, is_pdf=False)

        # TC-IMG-13: Detect no-text result
        if not text or not text.strip():
            raise ValueError("Không tìm thấy nội dung văn bản trong ảnh")

        # TC-NON-02: Validate that extracted text is actually CV content
        is_cv, reason = self._is_cv_content(text)
        if not is_cv:
            raise ValueError("Nội dung không giống một hồ sơ nghề nghiệp.")

        return text

    # ── TC-IMG-12: Multi-image merge ──────────────────────────────────────

    def extract_text_from_multiple_images(
        self,
        images: list[bytes],
    ) -> str:
        """
        TC-IMG-12: Xử lý nhiều ảnh là các trang của cùng một CV.

        - Xử lý từng ảnh theo thứ tự trang (index 0, 1, 2, ...)
        - Ghép nối (merge) văn bản với phân cách trang rõ ràng
        - Raises ValueError nếu KHÔNG ảnh nào trích xuất được text
        """
        if not images:
            raise ValueError("Không có ảnh nào được cung cấp")

        merged_parts: list[str] = []

        for i, img_bytes in enumerate(images):
            print(f"  📄 [TC-IMG-12] Processing image page {i + 1}/{len(images)}...")
            try:
                compressed = self.compress_image_if_needed(img_bytes)
                page_text = self.extract_text_with_ai_vision(compressed, is_pdf=False)
                if page_text and page_text.strip():
                    merged_parts.append(page_text.strip())
                    print(f"  ✅ [TC-IMG-12] Page {i + 1}: {len(page_text)} chars extracted")
                else:
                    print(f"  ⚠️ [TC-IMG-12] Page {i + 1}: no text found, skipping")
            except Exception as e:
                print(f"  ⚠️ [TC-IMG-12] Page {i + 1} failed: {e}")

        if not merged_parts:
            raise ValueError("Không tìm thấy nội dung văn bản trong ảnh")

        # Merge with clear page separator
        merged = "\n\n--- Trang tiếp theo ---\n\n".join(merged_parts)
        print(f"  ✅ [TC-IMG-12] Merged {len(merged_parts)} pages → {len(merged)} chars total")
        return merged
    
    def _extract_with_pymupdf(self, file_content: bytes) -> str:
        """Extract using PyMuPDF (fastest and most reliable)"""
        try:
            import fitz  # PyMuPDF
            
            print("  [PyMuPDF] Opening PDF...")
            doc = fitz.open(stream=file_content, filetype="pdf")
            page_count = len(doc)
            print(f"  [PyMuPDF] PDF has {page_count} pages")
            
            # TC-PDF-NON-02: Reject PDFs with > 20 pages (likely books/documents, not CVs)
            if page_count > 20:
                doc.close()
                raise ValueError(f"File PDF có {page_count} trang, vượt quá giới hạn 20 trang.")
            
            text = ""
            for i, page in enumerate(doc):
                print(f"  [PyMuPDF] Extracting page {i+1}...")
                page_text = page.get_text()
                print(f"  [PyMuPDF] Page {i+1} raw length: {len(page_text)} chars")
                
                if page_text:
                    text += page_text + "\n\n"  # Add double newline between pages
                    print(f"  [PyMuPDF] Page {i+1}: Added {len(page_text)} chars")
            
            doc.close()
            
            print(f"  [PyMuPDF] Before cleanup: {len(text)} characters")
            
            # Don't over-cleanup - preserve structure
            # Just normalize multiple spaces to single space
            text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs to single space
            text = re.sub(r'\n\n\n+', '\n\n', text)  # Multiple newlines to double newline
            
            print(f"  ✅ [PyMuPDF] After cleanup: {len(text)} characters")
            return text
            
        except ImportError:
            print("  ⚠️ PyMuPDF not installed (pip install PyMuPDF)")
            return ""
        except ValueError:
            # Re-raise ValueError for page count check
            raise
        except Exception as e:
            print(f"  ⚠️ PyMuPDF failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def _extract_with_pdfplumber(self, file_content: bytes) -> str:
        """Extract using pdfplumber"""
        try:
            from io import BytesIO

            import pdfplumber
            
            print("  [pdfplumber] Opening PDF...")
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                print(f"  [pdfplumber] PDF has {len(pdf.pages)} pages")
                
                text = ""
                for i, page in enumerate(pdf.pages):
                    print(f"  [pdfplumber] Extracting page {i+1}...")
                    page_text = page.extract_text()
                    print(f"  [pdfplumber] Page {i+1} raw length: {len(page_text) if page_text else 0} chars")
                    
                    if page_text:
                        text += page_text + "\n\n"
                        print(f"  [pdfplumber] Page {i+1}: Added {len(page_text)} chars")
                
                print(f"  [pdfplumber] Before cleanup: {len(text)} characters")
                
                # Don't over-cleanup
                text = re.sub(r'[ \t]+', ' ', text)
                text = re.sub(r'\n\n\n+', '\n\n', text)
                
                print(f"  ✅ [pdfplumber] After cleanup: {len(text)} characters")
                return text
                
        except ImportError:
            print("  ⚠️ pdfplumber not installed (pip install pdfplumber)")
            return ""
        except Exception as e:
            print(f"  ⚠️ pdfplumber failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def _extract_with_pypdf2(self, file_content: bytes) -> str:
        """Extract using PyPDF2 (fallback)"""
        try:
            from io import BytesIO
            
            print("  [PyPDF2] Opening PDF...")
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            print(f"  [PyPDF2] PDF has {len(pdf_reader.pages)} pages")
            
            text = ""
            for i, page in enumerate(pdf_reader.pages):
                try:
                    print(f"  [PyPDF2] Extracting page {i+1}...")
                    page_text = page.extract_text()
                    print(f"  [PyPDF2] Page {i+1} raw length: {len(page_text) if page_text else 0} chars")
                    
                    if page_text:
                        # Fix concatenated words
                        page_text = re.sub(r'([a-z])([A-Z])', r'\1 \2', page_text)
                        text += page_text + "\n\n"
                        print(f"  [PyPDF2] Page {i+1}: Added {len(page_text)} chars")
                        
                except Exception as e:
                    print(f"  [PyPDF2] Error on page {i+1}: {e}")
                    continue
            
            print(f"  [PyPDF2] Before cleanup: {len(text)} characters")
            
            # Don't over-cleanup
            text = re.sub(r'[ \t]+', ' ', text)
            text = re.sub(r'\n\n\n+', '\n\n', text)
            
            print(f"  ✅ [PyPDF2] After cleanup: {len(text)} characters")
            return text
            
        except Exception as e:
            print(f"  ⚠️ PyPDF2 failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def extract_all_with_ai(self, text: str, target_career: str = None) -> Dict:
        """
        Dùng AI đọc TOÀN BỘ CV và extract tất cả thông tin
        
        Args:
            text: Full text từ CV
            target_career: Nghề nghiệp mục tiêu (optional)
            
        Returns:
            Dict: {personal_info: {...}, skills: [...]}
        """
        try:
            import json
            import os

            import google.generativeai as genai
            
            # Check if Gemini is enabled
            gemini_enabled = os.getenv('GEMINI_ENABLED', 'true').lower() == 'true'
            if not gemini_enabled:
                print("  ⚠️ Gemini AI is disabled (GEMINI_ENABLED=false)")
                return self._get_fallback_data()
            
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("  ⚠️ GEMINI_API_KEY not found")
                return self._get_fallback_data()
            
            genai.configure(api_key=api_key)
            
            # Get model name from env - use exactly as specified
            model_name = os.getenv('GEMINI_MODEL', 'gemini-flash-latest')
            # Remove any 'models/' prefix if present
            model_name = model_name.replace('models/', '').replace('model/', '')
            
            print(f"Using Gemini model: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            # Use full CV text
            cv_text = text[:20000]  # Up to 20k chars
            
            print("\n📤 SENDING TO AI:")
            print(f"   Text length: {len(cv_text)} chars")
            print(f"   Model: {model_name}")
            print(f"   Target career: {target_career or 'None'}")
            
            career_context = f"\nTarget Career: {target_career}" if target_career else ""
            
            prompt = f"""
You are a professional CV/Resume parser. Read the ENTIRE CV below carefully and extract ALL information.{career_context}

FULL CV TEXT:
{cv_text}

Task: Extract the following information and return as JSON:

1. PERSONAL INFORMATION:
   - name: The person's full name (usually at the top, 2-4 words, NOT a job title)
   - email: Email address (format: xxx@xxx.xxx)
   - phone: Phone number (Vietnamese format: 0XXXXXXXXX or +84XXXXXXXXX)

2. SKILLS: Extract ALL technical and soft skills mentioned in the CV
   - Programming languages: Python, Java, JavaScript, PHP, etc.
   - Frameworks: Laravel, React, Angular, Vue, Django, etc.
   - Databases: MySQL, PostgreSQL, MongoDB, Redis, etc.
   - Tools: Git, Docker, Jira, etc.
   - Soft skills: Communication, Leadership, Teamwork, etc.

Return ONLY valid JSON in this format:
{{
  "personal_info": {{
    "name": "Nguyen Van A",
    "email": "example@email.com",
    "phone": "0900000000"
  }},
  "skills": [
    {{"name": "JavaScript", "category": "Programming"}},
    {{"name": "Python", "category": "Programming"}},
    {{"name": "React", "category": "Frontend"}},
    {{"name": "Node.js", "category": "Backend"}},
    {{"name": "MySQL", "category": "Database"}},
    {{"name": "Git", "category": "DevOps"}},
    {{"name": "Docker", "category": "DevOps"}},
    {{"name": "Communication", "category": "Soft Skills"}},
    {{"name": "Teamwork", "category": "Soft Skills"}}
  ]
}}

CRITICAL RULES:
- Read the ENTIRE CV text above
- Extract the person's ACTUAL NAME (not "carrergoals..." or job titles)
- Include ALL skills you can find in the CV
- Return ONLY valid JSON, no markdown, no explanations
- If information not found, use empty string ""
"""
            
            # Use CV stream for content generation
            cv_stream = multi_stream_manager.get_cv_stream()
            
            if not cv_stream.is_available():
                print("  ⚠️ CV analysis stream not available")
                return {}
            
            response_text = cv_stream.generate_content_with_retry(prompt)
            
            if not response_text:
                print("  ⚠️ AI complete extraction failed")
                return {}
            
            print("\n📥 AI RESPONSE RECEIVED:")
            print(f"   Length: {len(response_text)} chars")
            print("   Preview (first 500 chars):")
            print("-" * 80)
            print(response_text[:500])
            print("-" * 80)
            
            # Parse JSON
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
                print("   ✅ Extracted JSON from markdown code block")
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
                print("   ✅ Extracted JSON from code block")
            
            print("\n🔍 PARSING JSON:")
            print(f"   JSON length: {len(response_text)} chars")
            
            data = json.loads(response_text)
            
            print("   ✅ JSON parsed successfully")
            print(f"   Keys: {list(data.keys())}")
            
            # Validate and clean data
            personal_info = data.get('personal_info', {})
            skills = data.get('skills', [])
            
            print("\n📊 EXTRACTED DATA:")
            print(f"   Personal info keys: {list(personal_info.keys())}")
            print(f"   Skills count: {len(skills)}")
            if skills:
                print(f"   First 5 skills: {[s.get('name') for s in skills[:5]]}")
            
            # Validate name
            name = personal_info.get('name', '').strip()
            if name:
                print(f"\n🔍 VALIDATING NAME: '{name}'")
                # Check if name looks valid
                words = name.split()
                print(f"   Word count: {len(words)}")
                if len(words) < 2 or len(words) > 4:
                    print("   ⚠️ Invalid name format (need 2-4 words)")
                    name = ''
                else:
                    # Check not a job title
                    invalid_keywords = ['engineer', 'developer', 'designer', 'manager', 
                                       'laravel', 'php', 'python', 'backend', 'frontend']
                    if any(kw in name.lower() for kw in invalid_keywords):
                        print("   ⚠️ Name looks like job title")
                        name = ''
                    else:
                        print("   ✅ Name validated successfully")
            
            personal_info['name'] = name
            
            # Add source to skills
            for skill in skills:
                skill['source'] = 'ai'
            
            print("\n✅ AI EXTRACTION COMPLETE:")
            print(f"   - Name: {personal_info.get('name') or 'Not found'}")
            print(f"   - Email: {personal_info.get('email') or 'Not found'}")
            print(f"   - Phone: {personal_info.get('phone') or 'Not found'}")
            print(f"   - Skills: {len(skills)}")
            
            return {
                'personal_info': personal_info,
                'skills': skills
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"  ⚠️ AI complete extraction failed: {error_msg}")
            
            # Check for fast fail conditions
            if any(keyword in error_msg.lower() for keyword in ['quota', '429', 'rate limit', 'api key', 'expired', 'invalid']):
                print("  ⚡ FAST FAIL - API quota/key issue detected, using fallback immediately")
            else:
                print("  ⚠️ Unexpected AI error, using fallback")
                import traceback
                traceback.print_exc()
            
            return self._get_fallback_data()
    
    def _get_fallback_data(self) -> Dict:
        """Fallback data when AI fails"""
        return {
            'personal_info': {'name': '', 'email': '', 'phone': ''},
            'skills': []
        }

    @staticmethod
    def _is_cv_content(text: str) -> tuple[bool, str]:
        """
        Kiểm tra xem văn bản trích xuất có phải là nội dung CV/Resume không.

        Trả về (True, "") nếu là CV, hoặc (False, lý do) nếu không phải.

        Logic:
        - Cần ít nhất 2 trong các nhóm: personal_info, experience, education, contact
        - Nếu có các dấu hiệu NON-CV rõ ràng (roadmap, infographic, quảng cáo) → reject ngay
        - TC-PDF-NON-03: Phát hiện hóa đơn/chứng từ tài chính
        """
        lower = text.lower()

        # ── 0a. TC-PDF-NON-01: Phát hiện văn bản rác / Lorem Ipsum ────────
        if "lorem ipsum" in lower:
            return False, "Nội dung không chứa thông tin nghề nghiệp."

        # Kiểm tra độ đa dạng từ: nếu < 15% từ là duy nhất → văn bản lặp/rác
        words = [w for w in lower.split() if len(w) >= 2]
        if len(words) >= 30:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.12:   # < 12% từ duy nhất → rất lặp lại
                return False, "Nội dung không chứa thông tin nghề nghiệp."

        # ── 0b. TC-PDF-NON-03: Dấu hiệu tài chính (hóa đơn, biên lai, chứng từ) ─────
        financial_keywords = [
            "invoice", "receipt", "bill to", "payment method", "transaction id",
            "account number", "purchase order", "po#", "po-", "subtotal",
            "tax", "total amount", "balance", "credit card", "bank receipt",
            "hóa đơn", "biên lai", "thanh toán", "số tài khoản", "giao dịch",
            "đơn đặt hàng", "tổng tiền", "thuế", "số dư",
        ]
        financial_count = sum(1 for kw in financial_keywords if kw in lower)
        
        if financial_count >= 3:
            return False, "File chứa nội dung tài chính, không phải CV/Resume."

        # ── 1. Dấu hiệu rõ ràng KHÔNG PHẢI CV ────────────────────────────
        # Check for non-CV document types (must be more specific to avoid false positives)
        non_cv_patterns = [
            # Administrative/Official documents (MUST REJECT EARLY - saves tokens!)
            ("thông báo", "thông báo hành chính"),
            ("thong bao", "thông báo hành chính"),
            ("công văn", "công văn"),
            ("cong van", "công văn"),
            ("quyết định", "quyết định"),
            ("quyet dinh", "quyết định"),
            ("giấy chứng nhận", "giấy chứng nhận"),
            ("giay chung nhan", "giấy chứng nhận"),
            ("học phí", "thông báo học phí"),
            ("hoc phi", "thông báo học phí"),
            ("nộp học phí", "thông báo học phí"),
            ("nop hoc phi", "thông báo học phí"),
            ("official notice", "official notice"),
            ("announcement", "announcement"),
            ("notification", "notification"),
            ("circular", "circular"),
            ("memorandum", "memorandum"),
            # Educational materials (check for specific phrases, not just keywords)
            ("learning roadmap", "roadmap"),
            ("course roadmap", "roadmap"),
            ("infographic design", "infographic"),
            ("tutorial document", "tutorial"),
            ("course outline", "course outline"),
            ("course syllabus", "syllabus"),
            # Presentation documents (not just the word "presentation" which appears in CVs)
            ("powerpoint presentation", "presentation"),
            ("slide deck", "slide"),
            ("presentation slides", "presentation"),
            # Food/Restaurant
            ("restaurant menu", "menu"),
            ("food menu", "menu"),
            # Meme/Entertainment
            ("meme", "meme"),
            ("cartoon", "cartoon"),
            ("funny image", "funny"),
            ("joke", "joke"),
            # Explicit non-CV statements (negation patterns)
            ("this is not a cv", "not a cv"),
            ("this is not a resume", "not a resume"),
            ("not a cv", "not a cv"),
            ("not a resume", "not a resume"),
            ("this document is not", "not a cv"),
            ("not applicable", "not applicable"),
            ("no personal details", "no personal details"),
            ("no personal information", "no personal information"),
            ("no professional information", "no professional information"),
            ("rather than a traditional cv", "not a cv"),
            ("rather than a cv", "not a cv"),
        ]
        
        for pattern, label in non_cv_patterns:
            if pattern in lower:
                return False, f"Nội dung có vẻ là '{label}', không phải CV/Resume."

        # ── 1b. Từ chối nếu Gemini mô tả đây là ảnh (không phải tài liệu) ─
        image_description_signals = [
            "based on the image", "the image shows", "this image",
            "in the image", "the picture shows", "this picture",
            "the photo shows", "depicted in",
        ]
        image_signal_count = sum(1 for sig in image_description_signals if sig in lower)
        if image_signal_count >= 1:
            # Gemini đang MÔ TẢ ảnh thay vì extract CV text → không phải CV
            return False, "Đây không phải tài liệu CV."

        # ── 2. Dấu hiệu CV: thông tin liên lạc ───────────────────────────
        has_email = "@" in text and ("." in text.split("@")[-1] if "@" in text else False)
        has_phone = any(kw in lower for kw in [
            "phone", "tel", "mobile", "sdt", "điện thoại", "liên hệ", "contact",
        ])
        has_name_label = any(kw in lower for kw in [
            "name", "full name", "họ tên", "họ và tên", "tên:", "name:",
        ])

        contact_score = sum([has_email, has_phone, has_name_label])

        # ── 3. Dấu hiệu CV: kinh nghiệm / công việc ─────────────────────
        has_experience = any(kw in lower for kw in [
            "experience", "work experience", "employment", "position",
            "kinh nghiệm", "công ty", "company", "employer",
            "worked at", "job title", "chức vụ", "làm việc tại",
        ])

        # ── 4. Dấu hiệu CV: học vấn ─────────────────────────────────────
        has_education = any(kw in lower for kw in [
            "education", "university", "college", "degree", "bachelor", "master", "phd",
            "học vấn", "trường", "đại học", "cao đẳng", "tốt nghiệp", "diploma",
            "gpa", "graduated",
        ])

        # ── 5. Dấu hiệu CV: kỹ năng ─────────────────────────────────────
        has_skills_section = any(kw in lower for kw in [
            "skills", "kỹ năng", "technical skills", "soft skills",
            "proficient in", "expertise",
        ])

        # ── 6. Tổng hợp ──────────────────────────────────────────────────
        positive_signals = sum([
            contact_score >= 1,   # có ít nhất 1 thông tin liên lạc
            has_experience,
            has_education,
            has_skills_section,
        ])

        # TC-PDF-NON-04: Nếu chỉ có contact mà không có experience/education/skills → reject
        if positive_signals == 1 and contact_score >= 1 and not (has_experience or has_education or has_skills_section):
            return False, "File thiếu thông tin nghề nghiệp (kinh nghiệm, học vấn hoặc kỹ năng)."

        if positive_signals >= 2:
            return True, ""

        if positive_signals == 1:
            # Cận biên: chỉ có 1 tín hiệu → reject để tránh xử lý nhầm
            if has_email:
                # Email là tín hiệu mạnh nhất của CV cá nhân
                return True, ""
            return False, "Không tìm thấy đủ nội dung CV."

        return False, "File không chứa nội dung CV/Resume."

    def _ask_gemini_is_cv(self, text: str) -> bool:
        """
        Hỏi Gemini AI xác nhận xem văn bản có phải là CV/Resume không.
        
        Đây là bước validation cuối cùng để tránh false positive với:
        - Đáp án bài thi (TOEIC, IELTS, etc.)
        - Sách giáo khoa, tài liệu học tập
        - Tài liệu kỹ thuật, hướng dẫn
        - Bất kỳ văn bản nào không phải CV
        
        Args:
            text: Văn bản đã extract từ file
            
        Returns:
            bool: True nếu Gemini xác nhận đây là CV/Resume, False nếu không
        """
        # Use first 2000 chars to save tokens (enough to determine document type)
        text_preview = text[:2000] if len(text) > 2000 else text
        
        prompt = f"""
You are a document classifier. Your task is to determine if the following text is a CV/Resume or another type of document.

TEXT TO ANALYZE:
{text_preview}

INSTRUCTIONS:
1. A CV/Resume contains:
   - Personal information (name, contact details)
   - Work experience or employment history
   - Education background
   - Skills or competencies
   - Professional summary or objective

2. NOT a CV/Resume:
   - Test answer keys (TOEIC, IELTS, exam answers)
   - Textbooks or study materials
   - Tutorial documents or course materials
   - Technical documentation
   - News articles or blog posts
   - Any other non-CV document

CRITICAL: Analyze the CONTENT and STRUCTURE, not just keywords.

Return ONLY a JSON response:
{{
  "is_cv": true/false,
  "confidence": 0.0-1.0,
  "document_type": "CV/Resume" or "Test Answer Key" or "Textbook" or "Other",
  "reason": "Brief explanation"
}}

Return ONLY valid JSON, no markdown, no explanations.
"""
        
        try:
            # Get CV analysis stream
            cv_stream = multi_stream_manager.get_cv_stream()
            
            if not cv_stream.is_available():
                print("  ⚠️ CV analysis stream not available, assuming NOT a CV (safe default)")
                return False
            
            print(f"  📤 Sending {len(text_preview)} chars to Gemini for CV validation...")
            response_text = cv_stream.generate_content_with_retry(prompt)
            
            if not response_text:
                print("  ⚠️ No response from Gemini, assuming NOT a CV (safe default)")
                return False
            
            # Parse JSON response
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            is_cv = result.get('is_cv', False)
            confidence = result.get('confidence', 0.0)
            document_type = result.get('document_type', 'Unknown')
            reason = result.get('reason', 'No reason provided')
            
            print("  📥 Gemini response:")
            print(f"     - Is CV: {is_cv}")
            print(f"     - Confidence: {confidence}")
            print(f"     - Document type: {document_type}")
            print(f"     - Reason: {reason}")
            
            # Only accept if confidence is high enough
            if is_cv and confidence >= 0.7:
                return True
            else:
                return False
                
        except json.JSONDecodeError as e:
            print(f"  ❌ Failed to parse Gemini response: {e}")
            print(f"  Raw response: {response_text[:200]}")
            # Safe default: assume NOT a CV if we can't parse response
            return False
        except Exception as e:
            print(f"  ❌ Error calling Gemini: {e}")
            import traceback
            traceback.print_exc()
            # Safe default: assume NOT a CV on error
            return False

    @staticmethod
    def _get_pdf_page_count(file_content: bytes) -> int:
        """
        TC-PDF-NON-02: Đếm số trang của file PDF (local, không gọi API).

        Thử theo thứ tự: PyMuPDF → PyPDF2 → pdfplumber
        Trả về 0 nếu không đọc được (caller sẽ bỏ qua kiểm tra).
        """
        # PyMuPDF — nhanh nhất
        try:
            import fitz
            doc = fitz.open(stream=file_content, filetype="pdf")
            count = len(doc)
            doc.close()
            return count
        except Exception:
            pass

        # PyPDF2 — fallback
        try:
            from io import BytesIO
            reader = PyPDF2.PdfReader(BytesIO(file_content))
            return len(reader.pages)
        except Exception:
            pass

        # pdfplumber — last resort
        try:
            from io import BytesIO as _BIO

            import pdfplumber
            with pdfplumber.open(_BIO(file_content)) as pdf:
                return len(pdf.pages)
        except Exception:
            pass

        return 0  # Không xác định được → bỏ qua giới hạn

    def parse_cv_complete(self, file_content: bytes, file_type: str = 'pdf',
                         target_career: str = None) -> Dict:
        """
        Parse CV hoàn chỉnh - extract tất cả thông tin bằng AI
        
        Args:
            file_content: Nội dung file
            file_type: Loại file ('pdf' hoặc 'image')
            target_career: Nghề nghiệp mục tiêu
            
        Returns:
            Dict: {text, personal_info, skills}
        """
        print("\n" + "="*80)
        print("📄 [CV Parser V2] STARTING PDF EXTRACTION")
        print("="*80)
        print(f"File type: {file_type}")
        print(f"File size: {len(file_content)} bytes")
        print(f"Target career: {target_career}")
        
        # Extract text
        if file_type == 'pdf':
            # TC-PDF-NON-02: Kiểm tra số trang trước khi xử lý
            page_count = self._get_pdf_page_count(file_content)
            print(f"  [PDF] Page count: {page_count}")
            if page_count > self.MAX_CV_PAGES:
                raise ValueError(
                    f"File PDF có {page_count} trang, vượt quá giới hạn {self.MAX_CV_PAGES} trang."
                )

            text = self.extract_text_from_pdf(file_content)

            # TC-PDF-NON-04: PDF chỉ chứa ảnh (không có text layer)
            if not text or len(text.strip()) < 50:
                print("\n[ERROR] PDF yields no text - likely image-only PDF")
                raise ValueError("File PDF không chứa văn bản. Nếu CV là ảnh scan, hãy tải lên JPG/PNG.")
        else:
            # For images, use Gemini Vision directly
            text = self.extract_text_from_image(file_content)

        # CRITICAL: Validate IMMEDIATELY after extraction, BEFORE calling Gemini
        if not text or len(text) < 10:
            print("\n[ERROR] Could not extract text from file")
            raise ValueError("Không thể đọc nội dung từ file.")

        # CRITICAL: Validate content BEFORE calling Gemini (saves tokens!)
        is_cv, reason = self._is_cv_content(text)
        if not is_cv:
            print(f"\n❌ ERROR: File does not appear to be a CV — {reason}")
            raise ValueError(f"File tải lên không phải là CV. {reason}")

        print("\n✅ TEXT EXTRACTION SUCCESSFUL")
        print(f"   Extracted: {len(text)} characters")
        
        # Show preview
        print("\n📝 TEXT PREVIEW (first 500 chars):")
        print("-" * 80)
        print(text[:500])
        print("-" * 80)
        
        # Show last 200 chars too
        print("\n📝 TEXT PREVIEW (last 200 chars):")
        print("-" * 80)
        print(text[-200:] if len(text) > 200 else text)
        print("-" * 80)
        
        # CRITICAL: Ask Gemini to verify if this is actually a CV/Resume
        # This prevents false positives like test answer keys, textbooks, etc.
        print("\n🤖 [GEMINI VALIDATION] Asking AI: Is this a CV/Resume?")
        is_cv_by_ai = self._ask_gemini_is_cv(text)
        if not is_cv_by_ai:
            print("❌ [GEMINI VALIDATION] AI confirmed: This is NOT a CV/Resume")
            raise ValueError("File tải lên không phải là CV/Resume.")
        print("✅ [GEMINI VALIDATION] AI confirmed: This looks like a CV/Resume")
        
        # Use AI to extract everything
        print("\n🤖 [CV Parser V2] STARTING AI EXTRACTION")
        print("="*80)
        result = self.extract_all_with_ai(text, target_career)
        
        result['text'] = text[:500]  # Preview
        
        print("\n" + "="*80)
        print("✅ [CV Parser V2] EXTRACTION COMPLETE")
        print("="*80)
        
        return result
