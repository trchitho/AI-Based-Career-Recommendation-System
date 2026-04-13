"""
Quick test of gemini-2.5-flash model
"""
import os
import google.generativeai as genai

api_key = os.getenv('GEMINI_API_KEY', 'AIzaSyDhtMJYX_4rTt_P4ifXUK0dQ0EbNHaFOnM')
genai.configure(api_key=api_key)

print("🧪 Testing gemini-2.5-flash model...\n")

try:
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    test_cv = """
    John Doe
    Email: john@example.com
    Phone: 0123456789
    
    Skills: Python, JavaScript, React, Node.js, PostgreSQL, Docker, Git
    """
    
    prompt = f"""
Extract personal info and skills from this CV:

{test_cv}

Return JSON:
{{
  "personal_info": {{"name": "...", "email": "...", "phone": "..."}},
  "skills": [{{"name": "Python", "category": "Programming"}}, ...]
}}
"""
    
    print("📤 Sending request...")
    response = model.generate_content(prompt)
    print("✅ SUCCESS!\n")
    print("📥 Response:")
    print(response.text)
    
except Exception as e:
    print(f"❌ ERROR: {e}")
