#!/usr/bin/env python3
"""
Check available Gemini models with current API key
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "apps" / "backend"
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

def check_available_models():
    """Check what Gemini models are available"""
    try:
        import google.generativeai as genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ GEMINI_API_KEY not found in environment")
            return
        
        print(f"🔑 Using API Key: {api_key[:20]}...")
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        print("\n📋 Available Models:")
        print("=" * 50)
        
        # List all available models
        models = genai.list_models()
        
        for model in models:
            print(f"✓ {model.name}")
            if hasattr(model, 'display_name'):
                print(f"  Display Name: {model.display_name}")
            if hasattr(model, 'description'):
                print(f"  Description: {model.description[:100]}...")
            print()
        
        print("\n🧪 Testing Common Model Names:")
        print("=" * 50)
        
        # Test common model names
        test_models = [
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            'models/gemini-2.5-flash',
            'models/gemini-1.5-flash',
            'models/gemini-1.5-pro',
        ]
        
        for model_name in test_models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Hello")
                print(f"✅ {model_name} - WORKS")
            except Exception as e:
                print(f"❌ {model_name} - ERROR: {str(e)[:100]}")
        
    except Exception as e:
        print(f"❌ Error checking models: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_available_models()