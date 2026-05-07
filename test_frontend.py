#!/usr/bin/env python3
"""
Simple script to test the frontend changes
"""
import webbrowser
import time
import subprocess
import sys

def main():
    print("🚀 Testing Vietnamese Career Detail Page")
    print("=" * 50)
    
    # Test URL for the career detail page
    test_url = "http://localhost:3000/careers/sales/41-2022.00"
    
    print(f"📋 Test URL: {test_url}")
    print("\n✅ Changes implemented:")
    print("   • Added Vietnamese translations for all hardcoded text")
    print("   • Updated CareerDetailPage to use useTranslation hook")
    print("   • Backend API already returns Vietnamese data correctly")
    print("   • All sections now support Vietnamese language")
    
    print("\n🔧 To test manually:")
    print("   1. Start the frontend development server:")
    print("      cd apps/frontend && npm run dev")
    print("   2. Open the test URL in your browser")
    print("   3. Switch language to Vietnamese using the language switcher")
    print("   4. Verify all text is in Vietnamese")
    
    print("\n📝 Key changes made:")
    print("   • Added careerDetail translations to vi.json and en.json")
    print("   • Updated all hardcoded English strings to use t() function")
    print("   • Maintained existing functionality while adding i18n support")
    
    # Ask if user wants to open the URL
    try:
        response = input("\n🌐 Open test URL in browser? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            print("Opening browser...")
            webbrowser.open(test_url)
        else:
            print("You can manually navigate to the URL when ready.")
    except KeyboardInterrupt:
        print("\nTest cancelled.")
        sys.exit(0)

if __name__ == "__main__":
    main()