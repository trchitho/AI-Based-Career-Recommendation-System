"""
TC-PDF-NON-01 to TC-PDF-NON-04 — Non-CV PDF Detection Tests
============================================================
Covers:
  TC-PDF-NON-01  PDF văn bản rác (Lorem Ipsum) → "Nội dung không chứa thông tin nghề nghiệp"
  TC-PDF-NON-02  PDF quá dài (>20 trang) → Reject due to page limit
  TC-PDF-NON-03  PDF Hóa đơn/Chứng từ → Detect financial data, not CV
  TC-PDF-NON-04  PDF chỉ có ảnh chân dung → Require skills and education info
"""
from __future__ import annotations

import io
from io import BytesIO
from unittest.mock import MagicMock, patch
import pytest


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _make_fake_pdf_bytes(text_content: str, page_count: int = 1) -> bytes:
    """
    Tạo PDF giả với nội dung text cho test.
    Sử dụng reportlab để tạo PDF thật nếu có, fallback về bytes giả.
    """
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        
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


# ──────────────────────────────────────────────────────────────
# TC-PDF-NON-01 — PDF văn bản rác (Lorem Ipsum)
# ──────────────────────────────────────────────────────────────

def test_lorem_ipsum_pdf_rejected():
    """TC-PDF-NON-01.1: PDF chứa toàn Lorem Ipsum → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    lorem_text = """
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
Duis aute irure dolor in reprehenderit in voluptate velit esse.
Cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.
Lorem ipsum dolor sit amet consectetur adipiscing elit sed do.
Eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(lorem_text)
    
    # Mock extract methods to return lorem text
    with patch.object(parser, '_extract_with_pymupdf', return_value=lorem_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=lorem_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=lorem_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_repeated_text_pdf_rejected():
    """TC-PDF-NON-01.2: PDF văn bản lặp đi lặp lại → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    repeated_text = "Test test test. " * 100  # Văn bản lặp lại
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(repeated_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=repeated_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=repeated_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=repeated_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_no_professional_info_pdf_rejected():
    """TC-PDF-NON-01.3: PDF không có thông tin nghề nghiệp → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    random_text = """
This is a random document about nothing in particular.
It contains some text but no professional information.
No skills, no experience, no education details.
Just random words and sentences that mean nothing.
This document is not a CV or resume at all.
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(random_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=random_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=random_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=random_text):
        
        # Match any of the possible error messages for non-CV content
        with pytest.raises(ValueError, match="không chứa nội dung CV|không phải|File không"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_valid_cv_with_lorem_snippet_accepted():
    """TC-PDF-NON-01.4: CV hợp lệ có đoạn Lorem ngắn → vẫn accept."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_with_lorem = """
John Doe
Email: john.doe@email.com
Phone: 0900123456

Work Experience:
Software Engineer at ABC Company (2020-2023)
- Developed web applications using Python and Django
- Lorem ipsum dolor sit amet (sample project description)

Education:
Bachelor of Computer Science
University of Technology (2016-2020)

Skills:
Python, Django, JavaScript, React, MySQL, Git
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(cv_with_lorem)
    
    # Mock AI extraction to return valid data
    mock_ai_result = {
        'personal_info': {
            'name': 'John Doe',
            'email': 'john.doe@email.com',
            'phone': '0900123456'
        },
        'skills': [
            {'name': 'Python', 'category': 'Programming', 'source': 'ai'},
            {'name': 'Django', 'category': 'Backend', 'source': 'ai'},
        ]
    }
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=cv_with_lorem), \
         patch.object(parser, 'extract_all_with_ai', return_value=mock_ai_result):
        
        result = parser.parse_cv_complete(pdf_bytes, file_type='pdf')
        assert result['personal_info']['name'] == 'John Doe'


# ──────────────────────────────────────────────────────────────
# TC-PDF-NON-02 — PDF quá dài (>20 trang)
# ──────────────────────────────────────────────────────────────

def test_pdf_over_20_pages_rejected():
    """TC-PDF-NON-02.1: PDF > 20 trang → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    
    # Create a 25-page PDF
    long_text = "Page content. " * 100
    pdf_bytes = _make_fake_pdf_bytes(long_text, page_count=25)
    
    # Mock PyMuPDF to report 25 pages
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=25)
    
    with patch('fitz.open', return_value=mock_doc):
        with pytest.raises(ValueError, match="vượt quá giới hạn|quá dài|20 trang"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_pdf_exactly_20_pages_accepted():
    """TC-PDF-NON-02.2: PDF đúng 20 trang → accept."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    cv_text = """
Jane Smith
Email: jane@email.com
Phone: 0901234567

Experience: Software Developer
Education: BS Computer Science
Skills: Python, Java, SQL
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(cv_text, page_count=20)
    
    # Mock extraction
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=20)
    mock_page = MagicMock()
    mock_page.get_text = MagicMock(return_value=cv_text)
    mock_doc.__iter__ = MagicMock(return_value=iter([mock_page] * 20))
    
    mock_ai_result = {
        'personal_info': {'name': 'Jane Smith', 'email': 'jane@email.com', 'phone': '0901234567'},
        'skills': [{'name': 'Python', 'category': 'Programming', 'source': 'ai'}]
    }
    
    with patch('fitz.open', return_value=mock_doc), \
         patch.object(parser, 'extract_all_with_ai', return_value=mock_ai_result):
        
        result = parser.parse_cv_complete(pdf_bytes, file_type='pdf')
        assert result['personal_info']['name'] == 'Jane Smith'


def test_pdf_book_50_pages_rejected():
    """TC-PDF-NON-02.3: PDF sách 50 trang → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    parser = CVParserV2()
    book_text = "Chapter 1: Introduction. " * 200
    pdf_bytes = _make_fake_pdf_bytes(book_text, page_count=50)
    
    mock_doc = MagicMock()
    mock_doc.__len__ = MagicMock(return_value=50)
    
    with patch('fitz.open', return_value=mock_doc):
        with pytest.raises(ValueError, match="vượt quá giới hạn|quá dài|20 trang"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


# ──────────────────────────────────────────────────────────────
# TC-PDF-NON-03 — PDF Hóa đơn/Chứng từ
# ──────────────────────────────────────────────────────────────

def test_invoice_pdf_rejected():
    """TC-PDF-NON-03.1: PDF hóa đơn → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    invoice_text = """
INVOICE #12345
Date: 2024-01-15

Bill To:
ABC Company
123 Street, City

Items:
Product A    $100.00
Product B    $200.00
Tax          $30.00
Total        $330.00

Payment Method: Credit Card
Thank you for your business!
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(invoice_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=invoice_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=invoice_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=invoice_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_bank_receipt_pdf_rejected():
    """TC-PDF-NON-03.2: PDF biên lai ngân hàng → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    receipt_text = """
BANK RECEIPT
Transaction ID: TXN987654321
Date: 2024-01-20

Account Number: 1234567890
Transaction Type: Transfer
Amount: $1,000.00
Balance: $5,000.00

From: John Doe
To: Jane Smith
Reference: Payment for services

Thank you for banking with us.
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(receipt_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=receipt_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=receipt_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=receipt_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_purchase_order_pdf_rejected():
    """TC-PDF-NON-03.3: PDF đơn đặt hàng → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    po_text = """
PURCHASE ORDER #PO-2024-001
Date: 2024-01-25

Vendor: XYZ Supplies Inc.
Delivery Address: 456 Business Ave

Items Ordered:
- Office Supplies    Qty: 50    Price: $500
- Computer Equipment Qty: 10    Price: $2000

Subtotal: $2,500
Shipping: $100
Total: $2,600

Approved by: Manager Name
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(po_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=po_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=po_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=po_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


# ──────────────────────────────────────────────────────────────
# TC-PDF-NON-04 — PDF chỉ có ảnh chân dung
# ──────────────────────────────────────────────────────────────

def test_portrait_only_pdf_rejected():
    """TC-PDF-NON-04.1: PDF chỉ có ảnh chân dung, không text → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    # Gemini Vision mô tả ảnh thay vì extract CV text
    portrait_description = """
The image shows a professional headshot of a person.
This is a portrait photo with a neutral background.
The person is wearing business attire.
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes("")  # Empty text
    
    # Mock extraction to return portrait description
    with patch.object(parser, '_extract_with_pymupdf', return_value=""), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=""), \
         patch.object(parser, '_extract_with_pypdf2', return_value=""), \
         patch.object(parser, 'extract_text_with_ai_vision', return_value=portrait_description):
        
        with pytest.raises(ValueError, match="không phải là CV|không phải tài liệu CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_photo_no_skills_rejected():
    """TC-PDF-NON-04.2: PDF có tên và ảnh nhưng không có kỹ năng/học vấn → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    minimal_text = """
John Doe
Phone: 0900000000
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(minimal_text)
    
    # Mock all extraction methods to return the minimal text
    with patch.object(parser, '_extract_with_pymupdf', return_value=minimal_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=minimal_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=minimal_text), \
         patch.object(parser, 'extract_text_with_ai_vision', return_value=minimal_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_cv_with_portrait_and_content_accepted():
    """TC-PDF-NON-04.3: CV có ảnh chân dung + thông tin đầy đủ → accept."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    full_cv_text = """
Michael Johnson
Email: michael.j@email.com
Phone: 0912345678

[Professional Photo]

Work Experience:
Senior Developer at Tech Corp (2019-2024)
- Led team of 5 developers
- Built scalable microservices

Education:
Master of Computer Science
Stanford University (2017-2019)

Skills:
Python, Java, Kubernetes, AWS, Docker
Leadership, Project Management
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(full_cv_text)
    
    mock_ai_result = {
        'personal_info': {
            'name': 'Michael Johnson',
            'email': 'michael.j@email.com',
            'phone': '0912345678'
        },
        'skills': [
            {'name': 'Python', 'category': 'Programming', 'source': 'ai'},
            {'name': 'Java', 'category': 'Programming', 'source': 'ai'},
            {'name': 'Kubernetes', 'category': 'DevOps', 'source': 'ai'},
        ]
    }
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=full_cv_text), \
         patch.object(parser, 'extract_all_with_ai', return_value=mock_ai_result):
        
        result = parser.parse_cv_complete(pdf_bytes, file_type='pdf')
        assert result['personal_info']['name'] == 'Michael Johnson'
        assert len(result['skills']) >= 3


# ──────────────────────────────────────────────────────────────
# Additional edge cases
# ──────────────────────────────────────────────────────────────

def test_roadmap_infographic_rejected():
    """TC-PDF-NON: PDF roadmap/infographic → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    roadmap_text = """
PYTHON DEVELOPER ROADMAP 2024

Step 1: Learn Python Basics
Step 2: Master Django/Flask
Step 3: Learn Databases
Step 4: DevOps & Cloud

This is a learning roadmap, not a CV.
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(roadmap_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=roadmap_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=roadmap_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=roadmap_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')


def test_tutorial_document_rejected():
    """TC-PDF-NON: PDF hướng dẫn/tutorial → ValueError."""
    from app.modules.skill_gap.cv_parser_v2 import CVParserV2
    
    tutorial_text = """
PYTHON TUTORIAL FOR BEGINNERS

Chapter 1: Introduction to Python
Python is a high-level programming language.

Chapter 2: Variables and Data Types
Learn about strings, integers, and lists.

Chapter 3: Control Flow
If statements, loops, and functions.
"""
    
    parser = CVParserV2()
    pdf_bytes = _make_fake_pdf_bytes(tutorial_text)
    
    with patch.object(parser, '_extract_with_pymupdf', return_value=tutorial_text), \
         patch.object(parser, '_extract_with_pdfplumber', return_value=tutorial_text), \
         patch.object(parser, '_extract_with_pypdf2', return_value=tutorial_text):
        
        with pytest.raises(ValueError, match="không phải là CV"):
            parser.parse_cv_complete(pdf_bytes, file_type='pdf')
