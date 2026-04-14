"""
Test script for Gemini API key
Run: python test_gemini_api.py
"""
import os
import sys

import google.generativeai as genai
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def test_gemini_api():
    """Test Gemini API with current configuration"""
    
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ ERROR: GEMINI_API_KEY not found in .env file")
        return False
    
    print(f"✓ API Key found: {api_key[:20]}...{api_key[-4:]}")
    print(f"✓ API Key length: {len(api_key)} characters")
    print()
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Test different models
    models_to_test = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
        "models/gemini-2.5-flash",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
    ]
    
    print("Testing Gemini models...")
    print("=" * 60)
    
    working_models = []
    
    for model_name in models_to_test:
        try:
            print(f"\n🔍 Testing: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            # Simple test
            response = model.generate_content(
                "Say 'Hello' in one word",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=10,
                    temperature=0.1,
                )
            )
            
            result = response.text.strip()
            print(f"   ✅ SUCCESS! Response: {result}")
            working_models.append(model_name)
            
        except Exception as e:
            error_msg = str(e)
            print(f"   ❌ FAILED: {error_msg[:100]}")
    
    print("\n" + "=" * 60)
    print("\n📊 SUMMARY:")
    print(f"   Total models tested: {len(models_to_test)}")
    print(f"   Working models: {len(working_models)}")
    
    if working_models:
        print("\n✅ WORKING MODELS:")
        for model in working_models:
            print(f"   • {model}")
        print("\n🎉 SUCCESS! Your API key is valid and working!")
        print(f"💡 Recommended model: {working_models[0]}")
        return True
    else:
        print("\n❌ NO WORKING MODELS FOUND")
        print("\n🔧 TROUBLESHOOTING:")
        print("   1. Check if API key is correct")
        print("   2. Visit: https://aistudio.google.com/app/apikey")
        print("   3. Create a new API key")
        print("   4. Update GEMINI_API_KEY in .env file")
        print("   5. Make sure API key is not expired or leaked")
        return False

if __name__ == "__main__":
    print("🧪 Gemini API Key Test Script")
    print("=" * 60)
    print()
    
    success = test_gemini_api()
    
    sys.exit(0 if success else 1)
