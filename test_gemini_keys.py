"""
Test Gemini API keys to ensure they're working
"""
import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv('apps/backend/.env')

def test_api_key(key_name, api_key, model_name="gemini-flash-latest"):
    """Test a single API key"""
    if not api_key:
        print(f"❌ {key_name}: No API key provided")
        return False
    
    try:
        print(f"🔧 Testing {key_name}...")
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Create model
        model = genai.GenerativeModel(model_name)
        
        # Test with simple prompt
        response = model.generate_content(
            "Hello, respond with just 'OK' if you can understand this.",
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=10,
                temperature=0.1,
            )
        )
        
        result = response.text.strip()
        print(f"✅ {key_name}: Working (Response: '{result}')")
        return True
        
    except Exception as e:
        error_msg = str(e).lower()
        if 'api key' in error_msg or 'expired' in error_msg or 'invalid' in error_msg:
            print(f"❌ {key_name}: API Key Invalid/Expired - {e}")
        elif 'quota' in error_msg or '429' in error_msg:
            print(f"⚠️ {key_name}: Quota Exceeded - {e}")
        else:
            print(f"❌ {key_name}: Error - {e}")
        return False

def main():
    """Test all Gemini API keys"""
    print("🔍 TESTING GEMINI API KEYS")
    print("="*50)
    
    # Get API keys from environment
    keys_to_test = [
        ("GEMINI_CHATBOT_API_KEY", os.getenv('GEMINI_CHATBOT_API_KEY')),
        ("GEMINI_ASSESSMENT_API_KEY", os.getenv('GEMINI_ASSESSMENT_API_KEY')),
        ("GEMINI_CV_API_KEY", os.getenv('GEMINI_CV_API_KEY')),
        ("GEMINI_API_KEY (Legacy)", os.getenv('GEMINI_API_KEY')),
        ("GEMINI_CHATBOT_BACKUP_KEY", os.getenv('GEMINI_CHATBOT_BACKUP_KEY')),
        ("GEMINI_ASSESSMENT_BACKUP_KEY", os.getenv('GEMINI_ASSESSMENT_BACKUP_KEY')),
        ("GEMINI_CV_BACKUP_KEY", os.getenv('GEMINI_CV_BACKUP_KEY')),
    ]
    
    working_keys = 0
    total_keys = 0
    
    for key_name, api_key in keys_to_test:
        if api_key:
            total_keys += 1
            if test_api_key(key_name, api_key):
                working_keys += 1
        else:
            print(f"⚠️ {key_name}: Not configured")
    
    print("\n" + "="*50)
    print(f"📊 SUMMARY: {working_keys}/{total_keys} API keys working")
    
    if working_keys > 0:
        print("✅ At least one API key is working - system should function")
        print("\n🔧 Next steps:")
        print("   1. Restart backend server to reload new keys")
        print("   2. Test assessment functionality")
        print("   3. Monitor for any remaining errors")
    else:
        print("❌ No working API keys found!")
        print("\n🔧 Troubleshooting:")
        print("   1. Check if API keys are valid and not expired")
        print("   2. Verify Google Cloud project has Gemini API enabled")
        print("   3. Check quota limits in Google Cloud Console")
    
    return working_keys > 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)