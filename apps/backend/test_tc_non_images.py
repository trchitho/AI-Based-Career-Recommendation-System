"""
TC-NON-01 to TC-NON-03 — Non-CV Image Detection Tests
======================================================
Covers:
  TC-NON-01  Tải ảnh không có chữ (phong cảnh, trừu tượng) → "Không tìm thấy nội dung văn bản"
  TC-NON-02  Tải ảnh có chữ nhưng không phải CV (báo, hóa đơn, menu) → "Nội dung không giống hồ sơ nghề nghiệp"
  TC-NON-03  Tải ảnh chân dung (Selfie) → "Yêu cầu tải file tài liệu chứa thông tin kỹ năng"
"""
from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _make_test_image(width: int = 800, height: int = 600, mode: str = "RGB", color=None) -> bytes:
    """
    Tạo ảnh test với PIL.
    """
    try:
        from PIL import Image
        if color is None:
            color = (100, 150, 200)
        img = Image.new(mode, (width, height), color=color)
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        # Fallback: minimal JPEG header
        return b"\xff\xd8\xff\xe0" + b"\x00" * 5000


def _make_fake_pdf_bytes(text_content: str, page_count: int = 1) -> bytes:
    """
    Tạo PDF giả với nội dung text cho test.
    Sử dụng reportlab để tạo PDF thật nếu có, fallback về bytes giả.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        for page_num in range(page_count):
            # Add text to each page
            y_position = 750
            lines = text_content.split('\n')
            for line in lines[:30]:  # Max 30 lines per page
                c.drawString(50, y_position, line)
                y_position -= 20
                if y_position < 50:
                    break
            
            c.showPage()
        
        c.save()
        return buffer.getvalue()
    except ImportError:
        # Fallback: minimal PDF structure
        pdf_header = b"%PDF-1.4\n"
        pdf_content = text_content.encode('utf-8', errors='ignore')
        pdf_footer = b"\n%%EOF"
        return pdf_header + pdf_content + pdf_footer


def _make_landscape_image() -> bytes:
    """Tạo ảnh phong cảnh (gradient màu, không có text features)."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (800, 600))
        draw = ImageDraw.Draw(img)
        # Create gradient (sky to ground)
        for y in range(600):
            color = (50 + y // 4, 100 + y // 6, 200 - y // 4)
            draw.line([(0, y), (800, y)], fill=color)
        
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        return _make_test_image(color=(100, 150, 200))


def _make_portrait_image() -> bytes:
    """Tạo ảnh chân dung giả (oval màu da ở giữa)."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (600, 800), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)
        # Draw face-like oval with skin tone
        draw.ellipse([200, 150, 400, 450], fill=(220, 180, 140))  # Skin tone
        # Draw eyes
        draw.ellipse([240, 250, 270, 280], fill=(50, 50, 50))
        draw.ellipse([330, 250, 360, 280], fill=(50, 50, 50))
        
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        return _make_test_image(color=(220, 180, 140))


def _make_document_with_text() -> bytes:
    """Tạo ảnh giống tài liệu có text (nhiều đường ngang, nền trắng)."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (800, 1000), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        # Draw horizontal lines (simulating text)
        for y in range(100, 900, 30):
            draw.rectangle([50, y, 750, y + 15], fill=(0, 0, 0))
        
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        return _make_test_image(color=(255, 255, 255))


# ──────────────────────────────────────────────────────────────
# TC-NON-01 — Ảnh không có chữ (phong cảnh, trừu tượng)
# ──────────────────────────────────────────────────────────────

def test_landscape_image_rejected():
    """TC-NON-01.1: Ảnh phong cảnh không có chữ → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    landscape_img = _make_landscape_image()
    
    # The _quick_has_text pre-check should reject this
    with pytest.raises(ValueError, match="không có|không tìm thấy|không phải"):
        parser.extract_text_from_image(landscape_img)


def test_abstract_image_no_text_rejected():
    """TC-NON-01.2: Ảnh trừu tượng không có text → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    abstract_img = _make_test_image(color=(255, 100, 50))  # Solid color
    
    with pytest.raises(ValueError, match="không có|không tìm thấy|không phải"):
        parser.extract_text_from_image(abstract_img)


def test_blank_white_image_rejected():
    """TC-NON-01.3: Ảnh trắng hoàn toàn → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    white_img = _make_test_image(color=(255, 255, 255))
    
    with pytest.raises(ValueError, match="không có|không tìm thấy|không phải"):
        parser.extract_text_from_image(white_img)


def test_blank_black_image_rejected():
    """TC-NON-01.4: Ảnh đen hoàn toàn → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    black_img = _make_test_image(color=(0, 0, 0))
    
    with pytest.raises(ValueError, match="không có|không tìm thấy|không phải"):
        parser.extract_text_from_image(black_img)


def test_gemini_returns_empty_for_landscape():
    """TC-NON-01.5: Gemini Vision trả rỗng cho ảnh phong cảnh → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    img_bytes = _make_landscape_image()
    
    # Mock pre-check to pass, but Gemini returns empty
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=""):
        
        with pytest.raises(ValueError, match="Không tìm thấy nội dung văn bản"):
            parser.extract_text_from_image(img_bytes)


# ──────────────────────────────────────────────────────────────
# TC-NON-02 — Ảnh có chữ nhưng không phải CV
# ──────────────────────────────────────────────────────────────

def test_newspaper_image_rejected():
    """TC-NON-02.1: Ảnh chụp trang báo → ValueError (không phải CV)."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    newspaper_text = """
DAILY NEWS - January 15, 2024

BREAKING: Technology Advances in AI
By John Reporter

Artificial intelligence continues to evolve rapidly.
Companies are investing billions in AI research.
Experts predict major breakthroughs in the coming years.

Weather: Sunny, 25°C
Sports: Local team wins championship
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    # Mock to pass pre-check and return newspaper text
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=newspaper_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_receipt_image_rejected():
    """TC-NON-02.2: Ảnh hóa đơn siêu thị → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    receipt_text = """
SUPERMARKET RECEIPT
Date: 2024-01-15

Items:
Milk         $3.50
Bread        $2.00
Eggs         $4.50

Subtotal:    $10.00
Tax:         $1.00
Total:       $11.00

Thank you for shopping!
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=receipt_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_restaurant_menu_rejected():
    """TC-NON-02.3: Ảnh menu nhà hàng → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    menu_text = """
RESTAURANT MENU

Appetizers:
- Spring Rolls    $5.00
- Soup            $4.00

Main Courses:
- Grilled Chicken $12.00
- Beef Steak      $18.00
- Vegetarian Pasta $10.00

Desserts:
- Ice Cream       $3.00
- Cake            $4.00

Drinks:
- Coffee          $2.00
- Tea             $2.00
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=menu_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_advertisement_poster_rejected():
    """TC-NON-02.4: Ảnh poster quảng cáo → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    ad_text = """
SALE! SALE! SALE!

50% OFF ALL ITEMS
This Weekend Only!

Visit our store at:
123 Shopping Street

Open 9 AM - 9 PM
Don't miss out!
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=ad_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_book_page_rejected():
    """TC-NON-02.5: Ảnh chụp trang sách → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    book_text = """
Chapter 5: Introduction to Programming

Programming is the process of creating instructions for computers.
There are many programming languages available today.
Each language has its own syntax and use cases.

Python is popular for beginners because of its simple syntax.
Java is widely used in enterprise applications.
JavaScript is essential for web development.

Exercise 5.1: Write a program that prints "Hello World"
Exercise 5.2: Create a function to calculate factorial
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=book_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


# ──────────────────────────────────────────────────────────────
# TC-NON-03 — Ảnh chân dung (Selfie)
# ──────────────────────────────────────────────────────────────

def test_selfie_portrait_rejected():
    """TC-NON-03.1: Ảnh chân dung/selfie → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    portrait_img = _make_portrait_image()
    
    # The _quick_has_text should detect this as selfie via _detect_selfie
    with pytest.raises(ValueError, match="chân dung|selfie|ảnh người|khuôn mặt|không có|đặc điểm"):
        parser.extract_text_from_image(portrait_img)


def test_gemini_describes_portrait_rejected():
    """TC-NON-03.2: Gemini mô tả ảnh chân dung thay vì extract text → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    portrait_description = """
The image shows a professional headshot of a person.
This is a portrait photo with a neutral background.
The person is wearing business attire and smiling.
"""
    
    parser = CVParserV2()
    img_bytes = _make_portrait_image()
    
    # Mock pre-check to pass, but Gemini describes the image
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=portrait_description):
        
        with pytest.raises(ValueError, match="không phải tài liệu CV|ảnh minh họa"):
            parser.extract_text_from_image(img_bytes)


def test_group_photo_rejected():
    """TC-NON-03.3: Ảnh nhóm người → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    # Create image with high skin tone ratio
    group_img = _make_test_image(color=(210, 170, 130))  # Skin tone
    
    with pytest.raises(ValueError, match="chân dung|selfie|ảnh người|không có|không phải"):
        parser.extract_text_from_image(group_img)


def test_id_card_photo_only_rejected():
    """TC-NON-03.4: Ảnh CMND/CCCD (chỉ có ảnh, không có text CV) → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    id_card_text = """
CITIZEN ID CARD
ID Number: 123456789
Name: NGUYEN VAN A
Date of Birth: 01/01/1990
Address: 123 Street, City
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=id_card_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


# ──────────────────────────────────────────────────────────────
# Positive cases: Valid CV images should be accepted
# ──────────────────────────────────────────────────────────────

def test_valid_cv_image_accepted():
    """TC-NON: CV hợp lệ với đầy đủ thông tin → Accept."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_text = """
NGUYEN VAN A
Email: nguyenvana@email.com
Phone: 0900123456

WORK EXPERIENCE
Software Engineer at ABC Company (2020-2023)
- Developed web applications using Python and Django
- Led team of 3 developers

EDUCATION
Bachelor of Computer Science
University of Technology (2016-2020)

SKILLS
Python, Django, JavaScript, React, MySQL, Git
Problem Solving, Teamwork, Communication
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    # Mock to simulate valid CV
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=cv_text):
        
        result = parser.extract_text_from_image(img_bytes)
        assert "NGUYEN VAN A" in result
        assert "Software Engineer" in result


def test_cv_with_photo_and_content_accepted():
    """TC-NON: CV có ảnh chân dung nhỏ + nội dung đầy đủ → Accept."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_with_photo_text = """
[Professional Photo]

TRAN THI B
Email: tranthib@email.com | Phone: 0901234567

PROFESSIONAL SUMMARY
Experienced Full-Stack Developer with 5 years in web development

WORK EXPERIENCE
Senior Developer at XYZ Tech (2019-2024)
- Built scalable microservices architecture
- Mentored junior developers

EDUCATION
Master of Computer Science
Tech University (2017-2019)

TECHNICAL SKILLS
Backend: Python, Java, Node.js, PostgreSQL
Frontend: React, Vue.js, TypeScript
DevOps: Docker, Kubernetes, AWS, CI/CD

SOFT SKILLS
Leadership, Project Management, Agile/Scrum
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=cv_with_photo_text):
        
        result = parser.extract_text_from_image(img_bytes)
        assert "TRAN THI B" in result
        assert "Full-Stack Developer" in result


# ──────────────────────────────────────────────────────────────
# Edge cases
# ──────────────────────────────────────────────────────────────

def test_meme_image_rejected():
    """TC-NON: Ảnh meme có chữ → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    meme_text = """
WHEN YOU FINALLY FIX THE BUG

[Funny image]

BUT IT CREATES 3 MORE BUGS

LOL
"""
    
    parser = CVParserV2()
    img_bytes = _make_test_image()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=meme_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_screenshot_code_rejected():
    """TC-NON: Screenshot code editor → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    code_text = """
def hello_world():
    print("Hello, World!")
    return True

if __name__ == "__main__":
    hello_world()
"""
    
    parser = CVParserV2()
    img_bytes = _make_test_image()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=code_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)



# ──────────────────────────────────────────────────────────────
# TC-NON-04 — Ảnh văn bản rác (Gibberish)
# ──────────────────────────────────────────────────────────────

def test_gibberish_text_image_rejected():
    """TC-NON-04.1: Ảnh chứa ký tự ngẫu nhiên vô nghĩa → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    gibberish_text = """
asdfghjkl qwertyuiop zxcvbnm
lkjhgfdsa poiuytrewq mnbvcxz
asdfasdf qwerty zxcvzxcv
hjklhjkl uiopuiop bnmbnm
asdfghjkl qwertyuiop zxcvbnm
lkjhgfdsa poiuytrewq mnbvcxz
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=gibberish_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_random_characters_rejected():
    """TC-NON-04.2: Ảnh chứa ký tự random không có nghĩa → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    random_text = """
xkcd1234 abcd5678 efgh9012
zzzzaaaa bbbbcccc ddddeeee
1111aaaa 2222bbbb 3333cccc
qqqq1111 wwww2222 eeee3333
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=random_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_keyboard_mashing_rejected():
    """TC-NON-04.3: Ảnh chứa keyboard mashing → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    mashing_text = """
aaaaaaaaaaaa bbbbbbbbbbbb cccccccccccc
dddddddddddd eeeeeeeeeeee ffffffffffff
gggggggggggg hhhhhhhhhhhh iiiiiiiiiiii
jjjjjjjjjjjj kkkkkkkkkkkk llllllllllll
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=mashing_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_lorem_ipsum_image_rejected():
    """TC-NON-04.4: Ảnh chứa Lorem Ipsum → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    lorem_text = """
Lorem ipsum dolor sit amet consectetur adipiscing elit
Sed do eiusmod tempor incididunt ut labore et dolore
Ut enim ad minim veniam quis nostrud exercitation
Duis aute irure dolor in reprehenderit in voluptate
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=lorem_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


# ──────────────────────────────────────────────────────────────
# TC-NON-05 — Ảnh tài liệu khác ngành
# ──────────────────────────────────────────────────────────────

def test_technical_drawing_rejected():
    """TC-NON-05.1: Ảnh bản vẽ kỹ thuật → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    drawing_text = """
TECHNICAL DRAWING
Scale: 1:100
Dimensions: 500mm x 300mm x 200mm

Part A: Base plate
Part B: Support beam
Part C: Mounting bracket

Material: Steel ASTM A36
Tolerance: ±0.5mm
Surface finish: Ra 3.2
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=drawing_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_medical_prescription_rejected():
    """TC-NON-05.2: Ảnh đơn thuốc → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    prescription_text = """
MEDICAL PRESCRIPTION

Patient Name: John Doe
Date: 2024-01-15

Rx:
1. Amoxicillin 500mg - Take 3 times daily
2. Paracetamol 500mg - As needed for pain
3. Vitamin C 1000mg - Once daily

Doctor: Dr. Smith
License: MD-12345
Signature: [Signed]
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=prescription_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_lab_report_rejected():
    """TC-NON-05.3: Ảnh báo cáo xét nghiệm → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    lab_report_text = """
LABORATORY TEST REPORT

Patient: Jane Smith
Test Date: 2024-01-20

Blood Test Results:
- Hemoglobin: 14.5 g/dL (Normal)
- White Blood Cells: 7,500/μL (Normal)
- Platelets: 250,000/μL (Normal)
- Glucose: 95 mg/dL (Normal)

Technician: Lab Tech A
Approved by: Dr. Johnson
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=lab_report_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_legal_contract_rejected():
    """TC-NON-05.4: Ảnh hợp đồng pháp lý → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    contract_text = """
EMPLOYMENT CONTRACT

This Agreement is entered into on January 1, 2024
Between: ABC Company (Employer)
And: John Doe (Employee)

Article 1: Position and Duties
The Employee shall serve as Software Developer

Article 2: Compensation
Monthly salary: $5,000

Article 3: Term
This contract is valid for 12 months

Signatures:
Employer: _______________
Employee: _______________
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=contract_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


def test_architectural_blueprint_rejected():
    """TC-NON-05.5: Ảnh bản vẽ kiến trúc → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    blueprint_text = """
ARCHITECTURAL BLUEPRINT
Project: Residential Building
Scale: 1:50

Floor Plan - Level 1:
- Living Room: 25 sqm
- Kitchen: 15 sqm
- Bedroom 1: 20 sqm
- Bedroom 2: 18 sqm
- Bathroom: 8 sqm

Total Area: 86 sqm
Architect: John Architect
License: AR-54321
"""
    
    parser = CVParserV2()
    img_bytes = _make_document_with_text()
    
    with patch.object(CVParserV2, "_quick_has_text", return_value=(True, "")), \
         patch.object(parser, "compress_image_if_needed", return_value=img_bytes), \
         patch.object(parser, "extract_text_with_ai_vision", return_value=blueprint_text):
        
        with pytest.raises(ValueError, match="không giống|không phải|hồ sơ nghề nghiệp"):
            parser.extract_text_from_image(img_bytes)


# ──────────────────────────────────────────────────────────────
# TC-NON-06 — PDF sách/truyện (Already covered in TC-PDF-NON-02)
# ──────────────────────────────────────────────────────────────

def test_story_book_pdf_rejected():
    """TC-NON-06.1: PDF truyện dài 50 trang → ValueError (page count)."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    
    # Create a 50-page story PDF
    story_text = """
Chapter 1: The Beginning

Once upon a time, in a land far away, there lived a young hero.
The hero embarked on a great adventure to save the kingdom.
Along the way, they met many friends and faced many challenges.

[Story continues for 50 pages...]
"""
    
    pdf_bytes = _make_fake_pdf_bytes(story_text, page_count=50)
    
    # Mock PyMuPDF to report 50 pages
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=50)
    
    with patch('fitz.open', return_value=mock_doc):
        with pytest.raises(ValueError, match="vượt quá giới hạn|quá dài|20 trang"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_novel_pdf_rejected():
    """TC-NON-06.2: PDF tiểu thuyết 100 trang → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    novel_text = "Chapter 1: Introduction. " * 500
    pdf_bytes = _make_fake_pdf_bytes(novel_text, page_count=100)
    
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=100)
    
    with patch('fitz.open', return_value=mock_doc):
        with pytest.raises(ValueError, match="vượt quá giới hạn|quá dài|20 trang"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_textbook_pdf_rejected():
    """TC-NON-06.3: PDF sách giáo khoa 200 trang → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    textbook_text = "Lesson 1: Basic Concepts. " * 1000
    pdf_bytes = _make_fake_pdf_bytes(textbook_text, page_count=200)
    
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=200)
    
    with patch('fitz.open', return_value=mock_doc):
        with pytest.raises(ValueError, match="vượt quá giới hạn|quá dài|20 trang"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_comic_book_pdf_rejected():
    """TC-NON-06.4: PDF truyện tranh 30 trang → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    comic_text = "[Comic panel with dialogue] " * 200
    pdf_bytes = _make_fake_pdf_bytes(comic_text, page_count=30)
    
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=30)
    
    with patch('fitz.open', return_value=mock_doc):
        with pytest.raises(ValueError, match="vượt quá giới hạn|quá dài|20 trang"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


# ──────────────────────────────────────────────────────────────
# FALSE POSITIVE FIX TESTS — Valid CVs with "presentation" in work context
# ──────────────────────────────────────────────────────────────

def test_administrative_cv_with_prepared_presentations_accepted():
    """
    FALSE POSITIVE FIX: Administrative Assistant CV with "prepared presentations" → Accept.
    
    User reported: Valid CV rejected because it contained "prepared over 500 presentations"
    in work experience. This is a valid work task, not a presentation document.
    
    Fix: Changed from keyword "presentation" to phrase "powerpoint presentation"
    """
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_text = """
ADMINISTRATIVE ASSISTANT

Contact Information:
Name: Jane Smith
Email: jane.smith@email.com
Phone: 0901234567

PROFESSIONAL SUMMARY
Experienced Administrative Assistant with 5+ years supporting executive teams.

WORK EXPERIENCE
Administrative Assistant | ABC Corporation | 2019 - Present
- Managed executive calendars and scheduled meetings
- Prepared over 500 presentations, reports, and correspondence documents
- Coordinated travel arrangements and expense reporting

EDUCATION
Bachelor of Business Administration
State University | 2013 - 2017

SKILLS
Microsoft Office Suite, Calendar Management, Communication
"""
    
    parser = CVParserV2()
    is_cv, reason = parser._is_cv_content(cv_text)
    
    # This should be accepted - it's a valid CV
    assert is_cv, f"Valid Administrative CV was incorrectly rejected! Reason: {reason}"


def test_sales_cv_with_delivered_presentations_accepted():
    """
    FALSE POSITIVE FIX: Sales Manager CV with "delivered presentations" → Accept.
    """
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_text = """
SALES MANAGER

Contact: john.doe@email.com | 0912345678

EXPERIENCE
Sales Manager at Tech Solutions (2018-2024)
- Delivered presentations to clients and stakeholders
- Managed sales team of 10 people
- Achieved 150% of sales targets

EDUCATION
MBA in Marketing
Business School (2016-2018)

SKILLS
Sales, Marketing, Leadership, Communication
"""
    
    parser = CVParserV2()
    is_cv, reason = parser._is_cv_content(cv_text)
    
    assert is_cv, f"Valid Sales CV was incorrectly rejected! Reason: {reason}"


def test_marketing_cv_with_presentation_skills_accepted():
    """
    FALSE POSITIVE FIX: Marketing CV with "presentation skills" → Accept.
    """
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_text = """
MARKETING SPECIALIST

Email: marketing@email.com
Phone: 0923456789

WORK EXPERIENCE
Marketing Specialist | Digital Agency | 2020-2024
- Developed marketing campaigns
- Analyzed market trends

EDUCATION
Bachelor of Marketing
University (2016-2020)

SKILLS
Digital Marketing, Content Creation, Presentation Skills, Data Analysis
"""
    
    parser = CVParserV2()
    is_cv, reason = parser._is_cv_content(cv_text)
    
    assert is_cv, f"Valid Marketing CV was incorrectly rejected! Reason: {reason}"


def test_powerpoint_presentation_document_still_rejected():
    """
    FALSE POSITIVE FIX: Ensure actual PowerPoint presentations are still rejected.
    
    This verifies the fix doesn't create false negatives.
    """
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    presentation_text = """
POWERPOINT PRESENTATION

Title: Company Overview 2024

Slide 1: Introduction
Welcome to our company presentation

Slide 2: Our Mission
To provide excellent service

Slide 3: Our Products
- Product A
- Product B

Slide 4: Thank You
Questions and Answers
"""
    
    parser = CVParserV2()
    is_cv, reason = parser._is_cv_content(presentation_text)
    
    # This should still be rejected
    assert not is_cv, "PowerPoint presentation was incorrectly accepted as CV!"
    assert "presentation" in reason.lower(), f"Expected 'presentation' in reason, got: {reason}"
