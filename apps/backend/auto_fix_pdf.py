"""
Auto fix PDF extraction - Install libraries and restart
"""
import subprocess
import sys
import os

def install_package(package):
    """Install a package using pip"""
    print(f"\n📦 Installing {package}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package, "-q"])
        print(f"✅ {package} installed successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def main():
    print("="*60)
    print("AUTO FIX PDF EXTRACTION")
    print("="*60)
    print("\nThis script will:")
    print("1. Install PyMuPDF (best PDF library)")
    print("2. Install pdfplumber (backup)")
    print("3. Check installation")
    print("\n" + "="*60)
    
    input("\nPress Enter to continue...")
    
    # Install packages
    packages = [
        "PyMuPDF",
        "pdfplumber"
    ]
    
    success_count = 0
    for package in packages:
        if install_package(package):
            success_count += 1
    
    print("\n" + "="*60)
    print("INSTALLATION SUMMARY")
    print("="*60)
    print(f"✅ {success_count}/{len(packages)} packages installed successfully")
    
    # Test imports
    print("\n" + "="*60)
    print("TESTING IMPORTS")
    print("="*60)
    
    try:
        import fitz
        print("✅ PyMuPDF (fitz) - OK")
    except ImportError:
        print("❌ PyMuPDF (fitz) - FAILED")
    
    try:
        import pdfplumber
        print("✅ pdfplumber - OK")
    except ImportError:
        print("❌ pdfplumber - FAILED")
    
    print("\n" + "="*60)
    print("NEXT STEPS")
    print("="*60)
    print("\n1. Restart backend:")
    print("   Ctrl+C to stop current backend")
    print("   python -m uvicorn app.main:app --reload --port 8000")
    print("\n2. Upload CV again")
    print("\n3. Check backend console for:")
    print("   [PyMuPDF] PDF has X pages")
    print("   ✅ [PyMuPDF] Total: XXXX characters")
    print("\n" + "="*60)
    
    input("\nPress Enter to exit...")

if __name__ == '__main__':
    main()
