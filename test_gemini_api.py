"""
Test Gemini API Key and Model
Kiểm tra xem API key có hoạt động không và model nào available
"""
import os
from dotenv import load_dotenv

# Load .env
load_dotenv('apps/backend/.env')

def test_gemini_api():
    """Test Gemini API with current key"""
    try:
        import google.generativeai as genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        
        print("="*80)
        print("🔑 TESTING GEMINI API")
        print("="*80)
        print(f"API Key: {api_key[:20]}...{api_key[-10:]}")
        print(f"Model: {model_name}")
        print()
        
        # Configure API
        genai.configure(api_key=api_key)
        
        # Test 1: List available models
        print("📋 Step 1: Listing available models...")
        try:
            models = genai.list_models()
            print("✅ Available models:")
            for model in models:
                if 'gemini' in model.name.lower():
                    print(f"   - {model.name}")
                    print(f"     Display name: {model.display_name}")
                    print(f"     Supported methods: {model.supported_generation_methods}")
                    print()
        except Exception as e:
            print(f"❌ Failed to list models: {e}")
            print()
        
        # Test 2: Try to use the configured model
        print(f"🤖 Step 2: Testing model '{model_name}'...")
        try:
            # Remove 'models/' prefix if present
            clean_model_name = model_name.replace('models/', '')
            
            model = genai.GenerativeModel(clean_model_name)
            
            # Simple test prompt
            test_prompt = "Say 'Hello, I am working!' in one sentence."
            
            print(f"   Sending test prompt: '{test_prompt}'")
            response = model.generate_content(test_prompt)
            
            print(f"✅ Model response: {response.text}")
            print()
            
            # Test 3: Check quota
            print("📊 Step 3: Testing with skill extraction prompt...")
            skill_prompt = """
Extract skills from this text:
"I am a software engineer with experience in Python, JavaScript, React, and Node.js"

Return JSON: {"skills": ["Python", "JavaScript", "React", "Node.js"]}
"""
            response2 = model.generate_content(skill_prompt)
            print(f"✅ Skill extraction response: {response2.text[:200]}...")
            print()
            
            print("="*80)
            print("✅ SUCCESS: API key and model are working!")
            print("="*80)
            return True
            
        except Exception as e:
            print(f"❌ Failed to use model '{model_name}': {e}")
            print()
            
            # Try alternative models
            print("🔄 Trying alternative models...")
            alternative_models = [
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-1.5-pro',
                'gemini-pro'
            ]
            
            for alt_model in alternative_models:
                if alt_model == clean_model_name:
                    continue
                    
                try:
                    print(f"   Testing {alt_model}...")
                    model = genai.GenerativeModel(alt_model)
                    response = model.generate_content("Say hello")
                    print(f"   ✅ {alt_model} works! Response: {response.text[:50]}...")
                    print(f"\n💡 Suggestion: Update .env to use GEMINI_MODEL={alt_model}")
                    return True
                except Exception as e2:
                    print(f"   ❌ {alt_model} failed: {str(e2)[:100]}")
            
            print()
            print("="*80)
            print("❌ FAILED: No working model found")
            print("="*80)
            return False
            
    except ImportError:
        print("❌ google-generativeai not installed")
        print("   Install: pip install google-generativeai")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_quota_info():
    """Display quota information"""
    print("\n📊 QUOTA INFORMATION")
    print("="*80)
    print("Gemini Free Tier Limits:")
    print("  - gemini-2.5-flash: 1,500 requests/day (RECOMMENDED)")
    print("  - gemini-1.5-flash: DEPRECATED - No longer available")
    print("  - gemini-1.5-pro: DEPRECATED - No longer available")
    print("  - gemini-2.0-flash-exp: 10 requests/minute (experimental)")
    print()
    print("To check your usage:")
    print("  https://aistudio.google.com/app/apikey")
    print("="*80)

if __name__ == "__main__":
    success = test_gemini_api()
    check_quota_info()
    
    if success:
        print("\n✅ Your API key is working! You can enable AI matching:")
        print("   Set USE_AI_MATCHING=true in apps/backend/.env")
    else:
        print("\n❌ API key has issues. Recommendations:")
        print("   1. Check if key is correct")
        print("   2. Check if quota is available")
        print("   3. Try creating a new API key at https://aistudio.google.com/")
        print("   4. Use USE_AI_MATCHING=false to disable AI temporarily")
