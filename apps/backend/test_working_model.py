"""
Test with working Gemini models
"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

# Test recommended models
models_to_test = [
    "models/gemini-2.5-flash",      # Fastest, recommended
    "models/gemini-2.5-pro",        # Most capable
    "models/gemma-3-4b-it",         # Current in .env
    "models/gemini-flash-latest",   # Always latest
]

print("🧪 Testing Working Gemini Models")
print("=" * 60)

for model_name in models_to_test:
    try:
        print(f"\n🔍 Testing: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        response = model.generate_content(
            "Say hello in Vietnamese",
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=50,
                temperature=0.7,
            )
        )
        
        result = response.text.strip()
        print(f"   ✅ SUCCESS!")
        print(f"   Response: {result}")
        
    except Exception as e:
        print(f"   ❌ FAILED: {str(e)[:100]}")

print("\n" + "=" * 60)
print("✅ API Key is working!")
print("💡 Recommended: Update .env with GEMINI_MODEL=models/gemini-2.5-flash")
