"""
Interactive script to setup Gemini API key
Run: python setup_gemini.py
"""
import os
import sys

import requests
from dotenv import load_dotenv, set_key


def test_api_key(api_key: str) -> bool:
    """Test if API key works"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": "Hello"}]
        }]
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            return True
        else:
            print(f"   ❌ Error {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

def main():
    print("=" * 70)
    print("🔧 GEMINI API KEY SETUP WIZARD")
    print("=" * 70)
    print()
    
    # Load current .env
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)
    
    current_key = os.getenv("GEMINI_API_KEY", "")
    
    if current_key:
        print(f"📌 Current API key: {current_key[:20]}...{current_key[-4:]}")
        print()
    
    print("📋 INSTRUCTIONS:")
    print("   1. Visit: https://aistudio.google.com/app/apikey")
    print("   2. Click 'Create API Key'")
    print("   3. Select 'Create API key in new project'")
    print("   4. Copy the API key")
    print()
    
    # Get new API key from user
    new_key = input("🔑 Paste your NEW API key here (or press Enter to skip): ").strip()
    
    if not new_key:
        print("\n⚠️  No API key provided. Exiting...")
        return
    
    # Validate format
    if not new_key.startswith("AIzaSy") or len(new_key) < 30:
        print("\n❌ Invalid API key format!")
        print("   API key should start with 'AIzaSy' and be ~39 characters long")
        return
    
    print(f"\n✓ API key format looks valid (length: {len(new_key)})")
    print("\n🧪 Testing API key...")
    
    if test_api_key(new_key):
        print("\n✅ SUCCESS! API key is working!")
        
        # Update .env file
        print("\n💾 Updating .env file...")
        set_key(env_path, "GEMINI_API_KEY", new_key)
        set_key(env_path, "GEMINI_MODEL", "gemini-2.5-flash")
        
        print("✅ .env file updated successfully!")
        print()
        print("=" * 70)
        print("🎉 SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("📝 NEXT STEPS:")
        print("   1. Restart your backend server (Ctrl+C then restart)")
        print("   2. Test the Interactive Assessment feature")
        print("   3. AI-generated stories should now work!")
        print()
        print("⚠️  SECURITY REMINDER:")
        print("   • DO NOT commit .env file to Git")
        print("   • DO NOT share your API key publicly")
        print("   • Add .env to .gitignore")
        print()
        
    else:
        print("\n❌ API key test FAILED!")
        print()
        print("🔧 TROUBLESHOOTING:")
        print("   1. Make sure you copied the ENTIRE key")
        print("   2. Check if key is from a NEW project")
        print("   3. Wait a few minutes and try again")
        print("   4. Visit: https://aistudio.google.com/app/apikey")
        print("   5. Delete old keys and create a new one")
        print()
        print("💡 ALTERNATIVE:")
        print("   The app works without AI (uses fallback scenarios)")
        print("   Just leave GEMINI_API_KEY empty in .env")
        print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
