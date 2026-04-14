"""
Test script to check available Gemini models
"""
import os
import google.generativeai as genai

# Load API key
api_key = os.getenv('GEMINI_API_KEY', 'AIzaSyDhtMJYX_4rTt_P4ifXUK0dQ0EbNHaFOnM')
genai.configure(api_key=api_key)

print("🔍 Checking available Gemini models...\n")

# List all available models
models = genai.list_models()

print("📋 Available models for generateContent:\n")
for model in models:
    if 'generateContent' in model.supported_generation_methods:
        print(f"  ✅ {model.name}")
        print(f"     Display name: {model.display_name}")
        print(f"     Description: {model.description[:100]}...")
        print()

print("\n🧪 Testing models...\n")

# Test different model names
test_models = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'models/gemini-2.5-flash',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-flash-latest',
]

for model_name in test_models:
    try:
        print(f"Testing: {model_name}...", end=" ")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say 'OK' if you can read this.")
        print(f"✅ WORKS - Response: {response.text.strip()[:50]}")
    except Exception as e:
        error_msg = str(e)
        if '404' in error_msg:
            print(f"❌ 404 Not Found")
        else:
            print(f"❌ Error: {error_msg[:80]}")

print("\n✅ Test complete!")
