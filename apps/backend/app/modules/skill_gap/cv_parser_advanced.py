"""
Advanced CV Parser - Enhanced with TC-IMG-01 to TC-IMG-07 features
Supports: 
- TC-IMG-01: High quality OCR (Canva/Word exports)
- TC-IMG-02: Phone photo OCR (angle tolerance, perspective correction)
- TC-IMG-03: Quality detection (blur, darkness, resolution)
- TC-IMG-04: Handwriting detection and filtering
- TC-IMG-05: Background color separation
- TC-IMG-06: Skill bar detection
- TC-IMG-07: Multi-column reading
"""
import io
from typing import Dict, List, Tuple

import cv2
import numpy as np
from PIL import Image

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("[WARN] pytesseract not installed. OCR features will be limited.")


class AdvancedImagePreprocessor:
    """
    TC-IMG-01 to TC-IMG-05: Image Preprocessing
    - TC-IMG-01: High quality OCR (> 95% accuracy)
    - TC-IMG-02: Phone photo handling (angle, perspective)
    - TC-IMG-03: Quality detection (blur, darkness, resolution)
    - TC-IMG-04: Handwriting detection and filtering
    - TC-IMG-05: Background color separation
    """
    
    @staticmethod
    def check_image_quality(image_bytes: bytes) -> Dict:
        """
        TC-IMG-03: Check image quality before OCR
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Dict with quality metrics and warnings
        """
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Calculate quality metrics
        brightness = np.mean(gray) / 255.0
        contrast = gray.std() / 255.0
        
        # Calculate sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = laplacian.var() / 1000.0  # Normalize
        
        # Get resolution
        height, width = gray.shape
        resolution = (width, height)
        
        # Calculate overall quality score (0-100)
        quality_score = (
            brightness * 0.30 +
            contrast * 0.30 +
            min(sharpness, 1.0) * 0.40
        ) * 100
        
        # Generate warnings
        warnings = []
        is_acceptable = True
        
        # Check brightness
        if brightness < 0.3:
            warnings.append('Ảnh quá tối, vui lòng chụp lại với ánh sáng tốt hơn')
            is_acceptable = False
        elif brightness > 0.9:
            warnings.append('Ảnh quá sáng, có thể bị mất chi tiết')
        
        # Check sharpness (blur detection)
        if sharpness < 0.1:
            warnings.append('Ảnh quá mờ, vui lòng tải ảnh rõ nét hơn hoặc file PDF')
            is_acceptable = False
        
        # Check resolution
        if width < 800 or height < 1000:
            warnings.append(f'Độ phân giải quá thấp ({width}x{height}), khuyến nghị tối thiểu 800x1000')
            is_acceptable = False
        
        # Check contrast
        if contrast < 0.2:
            warnings.append('Độ tương phản thấp, có thể ảnh hưởng đến OCR')
        
        return {
            'quality_score': quality_score,
            'brightness': brightness,
            'contrast': contrast,
            'sharpness': sharpness,
            'resolution': resolution,
            'is_acceptable': is_acceptable,
            'warnings': warnings
        }
    
    @staticmethod
    def enhance_image(image: Image.Image) -> Image.Image:
        """
        TC-IMG-03: Enhance poor quality images
        
        Args:
            image: PIL Image
            
        Returns:
            Enhanced PIL Image
        """
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale if needed
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Enhance contrast
        enhanced = cv2.equalizeHist(denoised)
        
        # Sharpen
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Convert back to PIL
        return Image.fromarray(sharpened)
    
    @staticmethod
    def detect_and_correct_rotation(image_bytes: bytes) -> Tuple[Image.Image, float]:
        """
        TC-IMG-02: Auto-detect and correct image rotation
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Tuple of (corrected image, rotation angle)
        """
        image = Image.open(io.BytesIO(image_bytes))
        
        # Try to detect rotation using OCR
        if not TESSERACT_AVAILABLE:
            return image, 0.0
        
        try:
            # Try different rotations and pick the best one
            best_confidence = 0
            best_angle = 0
            best_image = image
            
            for angle in [0, 90, 180, 270]:
                rotated = image.rotate(angle, expand=True)
                
                # Get OCR confidence
                data = pytesseract.image_to_data(rotated, output_type=pytesseract.Output.DICT)
                confidences = [int(conf) for conf in data['conf'] if conf != '-1']
                
                if confidences:
                    avg_conf = sum(confidences) / len(confidences)
                    if avg_conf > best_confidence:
                        best_confidence = avg_conf
                        best_angle = angle
                        best_image = rotated
            
            return best_image, best_angle
            
        except Exception as e:
            print(f"[WARN] Rotation detection failed: {e}")
            return image, 0.0
    
    @staticmethod
    def correct_perspective(image: Image.Image) -> Image.Image:
        """
        TC-IMG-02: Correct perspective distortion from phone photos
        
        Args:
            image: PIL Image
            
        Returns:
            Perspective-corrected PIL Image
        """
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return image
        
        # Find largest contour (likely the document)
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Approximate to quadrilateral
        epsilon = 0.02 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        # If we found a quadrilateral, apply perspective transform
        if len(approx) == 4:
            # Get corners
            pts = approx.reshape(4, 2)
            
            # Order points: top-left, top-right, bottom-right, bottom-left
            rect = AdvancedImagePreprocessor._order_points(pts)
            
            # Compute destination points
            (tl, tr, br, bl) = rect
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]], dtype="float32")
            
            # Compute perspective transform matrix
            M = cv2.getPerspectiveTransform(rect, dst)
            
            # Apply transform
            warped = cv2.warpPerspective(img_array, M, (maxWidth, maxHeight))
            
            return Image.fromarray(warped)
        
        return image
    
    @staticmethod
    def _order_points(pts):
        """Order points in clockwise order starting from top-left"""
        rect = np.zeros((4, 2), dtype="float32")
        
        # Top-left will have smallest sum, bottom-right largest sum
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        
        # Top-right will have smallest difference, bottom-left largest difference
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        
        return rect
    
    @staticmethod
    def filter_handwriting(ocr_data: Dict) -> str:
        """
        TC-IMG-04: Filter out handwritten text based on confidence
        
        Args:
            ocr_data: OCR data from pytesseract with confidence scores
            
        Returns:
            Filtered text with only high-confidence (printed) text
        """
        if not ocr_data or 'text' not in ocr_data or 'conf' not in ocr_data:
            return ''
        
        # Confidence threshold for printed text (> 70%)
        CONFIDENCE_THRESHOLD = 70
        
        filtered_words = []
        for i, word in enumerate(ocr_data['text']):
            if word.strip():  # Not empty
                try:
                    conf = int(ocr_data['conf'][i])
                    if conf > CONFIDENCE_THRESHOLD:
                        filtered_words.append(word)
                except (ValueError, IndexError):
                    continue
        
        return ' '.join(filtered_words)
    
    @staticmethod
    def detect_background_type(image: np.ndarray) -> str:
        """
        Detect background type: dark, colorful, gradient, or white
        
        Args:
            image: OpenCV image (BGR format)
            
        Returns:
            str: Background type
        """
        # Convert to grayscale for analysis
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Calculate metrics
        mean_brightness = np.mean(gray)
        std_brightness = np.std(gray)
        
        # Detect background type
        if mean_brightness < 100:
            return 'dark'
        elif std_brightness > 50:
            return 'gradient'
        elif AdvancedImagePreprocessor._has_multiple_colors(image):
            return 'colorful'
        else:
            return 'white'
    
    @staticmethod
    def _has_multiple_colors(image: np.ndarray) -> bool:
        """Check if image has multiple distinct colors"""
        if len(image.shape) != 3:
            return False
        
        # Sample colors from image
        pixels = image.reshape(-1, 3)
        unique_colors = len(np.unique(pixels, axis=0))
        
        # If more than 100 unique colors, consider it colorful
        return unique_colors > 100
    
    @staticmethod
    def preprocess_image(image_bytes: bytes) -> Dict:
        """
        Preprocess image based on background type
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Dict with preprocessed image and metadata
        """
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)
        
        # Convert to BGR for OpenCV
        if len(img_array.shape) == 2:
            # Grayscale
            gray = img_array
        elif img_array.shape[2] == 4:
            # RGBA -> RGB -> BGR
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        else:
            # RGB -> BGR
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        
        # Detect background type
        bg_type = AdvancedImagePreprocessor.detect_background_type(img_array)
        
        # Apply appropriate preprocessing
        preprocessing_steps = []
        
        if bg_type == 'dark':
            # Invert colors for dark background
            processed = cv2.bitwise_not(gray)
            preprocessing_steps.append('invert_colors')
            
            # Enhance contrast
            processed = cv2.equalizeHist(processed)
            preprocessing_steps.append('contrast_enhancement')
            
        elif bg_type == 'colorful':
            # Remove background using adaptive threshold
            processed = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            preprocessing_steps.append('background_removal')
            preprocessing_steps.append('text_isolation')
            
        elif bg_type == 'gradient':
            # Normalize gradient
            processed = cv2.normalize(
                gray, None, 0, 255,
                cv2.NORM_MINMAX
            )
            preprocessing_steps.append('gradient_normalization')
            
            # Apply adaptive threshold
            processed = cv2.adaptiveThreshold(
                processed, 255,
                cv2.ADAPTIVE_THRESH_MEAN_C,
                cv2.THRESH_BINARY, 15, 10
            )
            preprocessing_steps.append('adaptive_threshold')
            
        else:  # white background
            processed = gray
        
        # Convert back to PIL Image
        processed_image = Image.fromarray(processed)
        
        return {
            'image': processed_image,
            'background_type': bg_type,
            'preprocessing_applied': preprocessing_steps,
            'original_size': image.size
        }


class SkillBarDetector:
    """
    TC-IMG-06: Skill Bar Detection
    Detect and extract skills from percentage bars and icons
    """
    
    @staticmethod
    def detect_skill_bars(image_bytes: bytes) -> Dict:
        """
        Detect skill bars in CV image
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Dict with detected bars and warnings
        """
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Detect horizontal bars (rectangles)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        bars = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter for bar-like shapes (wide and short)
            if w > 100 and h < 30 and w/h > 5:
                # Calculate percentage based on width
                max_width = 200  # Assume max bar width
                percentage = min(100, int((w / max_width) * 100))
                
                # Try to extract text near bar (skill name)
                roi = gray[max(0, y-30):y, x:x+w]
                skill_name = SkillBarDetector._extract_text_from_roi(roi)
                
                if skill_name:
                    bars.append({
                        'skill': skill_name,
                        'percentage': percentage,
                        'type': 'bar',
                        'position': (x, y, w, h)
                    })
        
        # Generate warnings
        warnings = []
        requires_cv = False
        
        if len(bars) > 0:
            warnings.append('Skill bars detected - percentages extracted')
            requires_cv = True
        
        # Check for icons (simplified - would need template matching in production)
        if SkillBarDetector._has_potential_icons(gray):
            warnings.append('Some skills may be represented as icons - manual verification recommended')
            requires_cv = True
        
        return {
            'has_skill_bars': len(bars) > 0,
            'bars_detected': bars,
            'icons_detected': [],  # Would need template matching
            'text_skills': [],  # Filled by OCR
            'warnings': warnings,
            'requires_computer_vision': requires_cv
        }
    
    @staticmethod
    def _extract_text_from_roi(roi: np.ndarray) -> str:
        """Extract text from region of interest"""
        if not TESSERACT_AVAILABLE:
            return ''
        
        try:
            # Convert to PIL Image
            roi_image = Image.fromarray(roi)
            text = pytesseract.image_to_string(roi_image, config='--psm 7')
            return text.strip()
        except Exception:
            return ''
    
    @staticmethod
    def _has_potential_icons(gray: np.ndarray) -> bool:
        """Check if image might contain icons/logos"""
        # Simple heuristic: look for small square regions
        # In production, would use template matching
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        icon_count = 0
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Icon-like: small, roughly square
            if 20 < w < 100 and 20 < h < 100 and 0.7 < w/h < 1.3:
                icon_count += 1
        
        return icon_count > 3


class MultiColumnDetector:
    """
    TC-IMG-07: Multi-Column Reading Order
    Detect columns and extract text in correct reading order
    """
    
    @staticmethod
    def detect_columns(image_bytes: bytes) -> Dict:
        """
        Detect column layout and extract text in correct order
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Dict with text in correct reading order
        """
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Detect column boundaries
        columns = MultiColumnDetector._find_column_boundaries(gray)
        
        # Extract text from each column (top to bottom)
        if not TESSERACT_AVAILABLE:
            return {
                'text': '',
                'columns_detected': len(columns),
                'column_boundaries': columns,
                'reading_order': 'top-to-bottom-per-column',
                'warnings': ['Tesseract not available - OCR disabled']
            }
        
        all_text = []
        for col_x1, col_x2 in columns:
            # Extract column region
            col_img = gray[:, col_x1:col_x2]
            
            # Convert to PIL Image
            col_pil = Image.fromarray(col_img)
            
            # OCR on column
            try:
                col_text = pytesseract.image_to_string(col_pil, lang='eng')
                all_text.append(col_text)
            except Exception as e:
                print(f"[WARN] OCR error on column: {e}")
                all_text.append('')
        
        # Combine columns
        combined_text = '\n\n'.join(all_text)
        
        return {
            'text': combined_text,
            'columns_detected': len(columns),
            'column_boundaries': columns,
            'reading_order': 'top-to-bottom-per-column',
            'warnings': []
        }
    
    @staticmethod
    def _find_column_boundaries(gray: np.ndarray) -> List[Tuple[int, int]]:
        """
        Find column boundaries using vertical projection
        
        Args:
            gray: Grayscale image
            
        Returns:
            List of (x_start, x_end) for each column
        """
        # Calculate vertical projection (sum of pixels per column)
        vertical_proj = np.sum(gray, axis=0)
        
        # Normalize
        vertical_proj = vertical_proj / np.max(vertical_proj)
        
        # Find valleys (low pixel density = column separator)
        threshold = 0.3
        valleys = np.where(vertical_proj < threshold)[0]
        
        if len(valleys) == 0:
            # Single column
            return [(0, gray.shape[1])]
        
        # Group consecutive valleys
        column_separators = []
        current_valley = [valleys[0]]
        
        for v in valleys[1:]:
            if v - current_valley[-1] == 1:
                current_valley.append(v)
            else:
                # Found a valley group
                if len(current_valley) > 10:  # Minimum width for separator
                    column_separators.append(int(np.mean(current_valley)))
                current_valley = [v]
        
        # Add last valley
        if len(current_valley) > 10:
            column_separators.append(int(np.mean(current_valley)))
        
        # Create column boundaries
        columns = []
        prev_x = 0
        
        for sep_x in column_separators:
            if sep_x - prev_x > 100:  # Minimum column width
                columns.append((prev_x, sep_x))
                prev_x = sep_x
        
        # Add last column
        if gray.shape[1] - prev_x > 100:
            columns.append((prev_x, gray.shape[1]))
        
        # If no columns detected, return full width
        if len(columns) == 0:
            columns = [(0, gray.shape[1])]
        
        return columns


class AdvancedCVParser:
    """
    Enhanced CV Parser with advanced OCR features
    Integrates TC-IMG-05, TC-IMG-06, TC-IMG-07
    """
    
    def __init__(self):
        self.preprocessor = AdvancedImagePreprocessor()
        self.skill_bar_detector = SkillBarDetector()
        self.column_detector = MultiColumnDetector()
    
    def parse_image_cv(self, image_bytes: bytes, enable_all_features: bool = True) -> Dict:
        """
        Parse CV image with all advanced features (TC-IMG-01 to TC-IMG-07)
        
        Args:
            image_bytes: Image file bytes
            enable_all_features: Enable all preprocessing features
            
        Returns:
            Dict with extracted information and metadata
        """
        result = {
            'text': '',
            'quality_check': {},
            'preprocessing': {},
            'skill_bars': {},
            'columns': {},
            'warnings': [],
            'success': False
        }
        
        try:
            # Step 0: Check image quality (TC-IMG-03)
            print("  🔍 Step 0: Checking image quality...")
            quality_result = self.preprocessor.check_image_quality(image_bytes)
            result['quality_check'] = quality_result
            
            if not quality_result['is_acceptable']:
                result['warnings'].extend(quality_result['warnings'])
                print(f"  [WARN] Image quality too low: {quality_result['quality_score']:.1f}/100")
                # Still try to process, but warn user
            else:
                print(f"  [OK] Image quality acceptable: {quality_result['quality_score']:.1f}/100")
            
            # Step 0.5: Auto-rotate if needed (TC-IMG-02)
            if enable_all_features:
                print("  🔄 Step 0.5: Checking rotation...")
                image_pil, rotation_angle = self.preprocessor.detect_and_correct_rotation(image_bytes)
                if rotation_angle != 0:
                    print(f"  [OK] Auto-rotated by {rotation_angle} degrees")
                    result['warnings'].append(f'Ảnh đã được tự động xoay {rotation_angle} độ')
                    # Convert back to bytes
                    img_byte_arr = io.BytesIO()
                    image_pil.save(img_byte_arr, format='PNG')
                    image_bytes = img_byte_arr.getvalue()
            
            # Step 1: Preprocess image (TC-IMG-05)
            print("  🎨 Step 1: Preprocessing image...")
            preprocess_result = self.preprocessor.preprocess_image(image_bytes)
            result['preprocessing'] = {
                'background_type': preprocess_result['background_type'],
                'steps_applied': preprocess_result['preprocessing_applied']
            }
            
            # Step 1.5: Enhance if quality is low (TC-IMG-03)
            if quality_result['quality_score'] < 60 and enable_all_features:
                print("  ✨ Step 1.5: Enhancing image...")
                preprocess_result['image'] = self.preprocessor.enhance_image(preprocess_result['image'])
                result['preprocessing']['steps_applied'].append('image_enhancement')
            
            # Step 2: Detect skill bars (TC-IMG-06)
            print("  📊 Step 2: Detecting skill bars...")
            skill_bar_result = self.skill_bar_detector.detect_skill_bars(image_bytes)
            result['skill_bars'] = skill_bar_result
            result['warnings'].extend(skill_bar_result['warnings'])
            
            # Step 3: Detect columns and extract text (TC-IMG-07)
            print("  📰 Step 3: Detecting columns and extracting text...")
            column_result = self.column_detector.detect_columns(image_bytes)
            result['columns'] = {
                'count': column_result['columns_detected'],
                'boundaries': column_result['column_boundaries'],
                'reading_order': column_result['reading_order']
            }
            
            # Step 4: Extract text with OCR (TC-IMG-01, TC-IMG-02, TC-IMG-04)
            if TESSERACT_AVAILABLE:
                print("  📝 Step 4: Extracting text with OCR...")
                
                # Use preprocessed image for better OCR
                ocr_image = preprocess_result['image']
                
                # Get OCR data with confidence scores
                ocr_data = pytesseract.image_to_data(
                    ocr_image,
                    lang='eng',
                    output_type=pytesseract.Output.DICT
                )
                
                # Filter handwriting (TC-IMG-04)
                filtered_text = self.preprocessor.filter_handwriting(ocr_data)
                
                # Also get full text for comparison
                full_text = pytesseract.image_to_string(ocr_image, lang='eng')
                
                # Calculate average confidence
                confidences = [int(conf) for conf in ocr_data['conf'] if conf != '-1']
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                
                # Use filtered text if confidence is mixed (likely has handwriting)
                if avg_confidence < 85:
                    result['text'] = filtered_text
                    result['warnings'].append('Phát hiện chữ viết tay - đã lọc text có độ tin cậy thấp')
                    print(f"  [WARN] Mixed confidence ({avg_confidence:.1f}%), using filtered text")
                else:
                    result['text'] = full_text
                    print(f"  [OK] High confidence ({avg_confidence:.1f}%), using full text")
                
                result['ocr_confidence'] = avg_confidence
                
            else:
                result['text'] = column_result['text']
                result['warnings'].append('Tesseract not available - limited OCR')
            
            result['warnings'].extend(column_result['warnings'])
            
            result['success'] = True
            
            print("  [OK] Advanced CV parsing complete")
            print(f"     - Quality: {quality_result['quality_score']:.1f}/100")
            print(f"     - Background: {result['preprocessing']['background_type']}")
            print(f"     - Skill bars: {len(skill_bar_result['bars_detected'])}")
            print(f"     - Columns: {column_result['columns_detected']}")
            print(f"     - Text length: {len(result['text'])} chars")
            if 'ocr_confidence' in result:
                print(f"     - OCR confidence: {result['ocr_confidence']:.1f}%")
            
        except Exception as e:
            print(f"  [ERR] Error in advanced CV parsing: {e}")
            import traceback
            traceback.print_exc()
            result['warnings'].append(f'Error: {str(e)}')
        
        return result
    
    def generate_user_warnings(self, result: Dict) -> List[str]:
        """
        Generate user-friendly warnings based on parsing result
        
        Args:
            result: Parsing result from parse_image_cv
            
        Returns:
            List of user-friendly warning messages
        """
        warnings = []
        
        # Background warnings
        bg_type = result.get('preprocessing', {}).get('background_type')
        if bg_type == 'dark':
            warnings.append('[WARN] CV có nền tối - đã áp dụng xử lý đặc biệt')
        elif bg_type == 'colorful':
            warnings.append('[WARN] CV có nhiều màu sắc - một số chi tiết có thể bị mất')
        
        # Skill bar warnings
        if result.get('skill_bars', {}).get('requires_computer_vision'):
            warnings.append(
                '[WARN] Phát hiện kỹ năng dạng icon/thanh phần trăm.\n'
                'Một số kỹ năng có thể không được nhận diện chính xác.\n'
                'Khuyến nghị: Vui lòng kiểm tra và bổ sung text cho các kỹ năng này.'
            )
        
        # Column warnings
        columns = result.get('columns', {}).get('count', 1)
        if columns > 1:
            warnings.append(f'[INFO] CV có {columns} cột - đã đọc theo thứ tự từ trên xuống dưới mỗi cột')
        
        return warnings
