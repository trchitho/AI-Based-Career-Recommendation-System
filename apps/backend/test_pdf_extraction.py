"""
Test PDF extraction với nhiều methods khác nhau
"""
import os


def test_pypdf2(pdf_path):
    """Test PyPDF2"""
    print("\n" + "="*60)
    print("TEST 1: PyPDF2")
    print("="*60)
    
    try:
        import PyPDF2
        
        with open(pdf_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            print(f"Pages: {len(pdf_reader.pages)}")
            
            text = ""
            for i, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                print(f"Page {i+1}: {len(page_text)} chars")
                text += page_text + "\n"
            
            print(f"\nTotal: {len(text)} characters")
            print(f"Preview:\n{text[:500]}")
            
            return text
            
    except Exception as e:
        print(f"❌ PyPDF2 failed: {e}")
        return ""


def test_pdfplumber(pdf_path):
    """Test pdfplumber (better for complex PDFs)"""
    print("\n" + "="*60)
    print("TEST 2: pdfplumber")
    print("="*60)
    
    try:
        import pdfplumber
        
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Pages: {len(pdf.pages)}")
            
            text = ""
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    print(f"Page {i+1}: {len(page_text)} chars")
                    text += page_text + "\n"
                else:
                    print(f"Page {i+1}: No text (might be image)")
            
            print(f"\nTotal: {len(text)} characters")
            print(f"Preview:\n{text[:500]}")
            
            return text
            
    except ImportError:
        print("⚠️ pdfplumber not installed")
        print("Install: pip install pdfplumber")
        return ""
    except Exception as e:
        print(f"❌ pdfplumber failed: {e}")
        return ""


def test_pymupdf(pdf_path):
    """Test PyMuPDF/fitz (fastest and most reliable)"""
    print("\n" + "="*60)
    print("TEST 3: PyMuPDF (fitz)")
    print("="*60)
    
    try:
        import fitz  # PyMuPDF
        
        doc = fitz.open(pdf_path)
        print(f"Pages: {len(doc)}")
        
        text = ""
        for i, page in enumerate(doc):
            page_text = page.get_text()
            print(f"Page {i+1}: {len(page_text)} chars")
            text += page_text + "\n"
        
        doc.close()
        
        print(f"\nTotal: {len(text)} characters")
        print(f"Preview:\n{text[:500]}")
        
        return text
        
    except ImportError:
        print("⚠️ PyMuPDF not installed")
        print("Install: pip install PyMuPDF")
        return ""
    except Exception as e:
        print(f"❌ PyMuPDF failed: {e}")
        return ""


def main():
    print("="*60)
    print("PDF EXTRACTION TEST")
    print("="*60)
    
    # Get PDF path from user
    pdf_path = input("\nEnter PDF file path: ").strip().strip('"')
    
    if not os.path.exists(pdf_path):
        print(f"❌ File not found: {pdf_path}")
        return
    
    print(f"\nTesting PDF: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path)} bytes")
    
    # Test all methods
    results = []
    
    text1 = test_pypdf2(pdf_path)
    results.append(("PyPDF2", len(text1)))
    
    text2 = test_pdfplumber(pdf_path)
    results.append(("pdfplumber", len(text2)))
    
    text3 = test_pymupdf(pdf_path)
    results.append(("PyMuPDF", len(text3)))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    for method, length in results:
        status = "✅" if length > 100 else "❌"
        print(f"{status} {method}: {length} characters")
    
    # Recommendation
    best = max(results, key=lambda x: x[1])
    if best[1] > 100:
        print(f"\n💡 Recommendation: Use {best[0]} (extracted {best[1]} chars)")
    else:
        print("\n⚠️ All methods failed - PDF might be image-based")
        print("   Consider using OCR or AI Vision API")


if __name__ == '__main__':
    main()
