"""
CV Parser V2 - Improved version with AI-first approach
Đọc toàn bộ CV bằng AI để extract chính xác
"""
import re
from typing import List, Dict
import PyPDF2
from io import BytesIO


class CVParserV2:
    """Parser cải tiến - dùng AI đọc toàn bộ CV"""
    
    def __init__(self, db_session=None):
        self.db = db_session
        self._skill_cache = None
    
    def extract_text_with_ai_vision(self, file_content: bytes, is_pdf: bool = False) -> str:
        """
        Dùng Gemini Vision API để đọc PDF/Image trực tiếp
        
        Args:
            file_content: Nội dung file
            is_pdf: True nếu là PDF, False nếu là image
            
        Returns:
            str: Text extracted by AI
        """
        try:
            import google.generativeai as genai
            import os
            from PIL import Image
            import io
            
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("  ⚠️ GEMINI_API_KEY not found")
                return ''
            
            genai.configure(api_key=api_key)
            
            # Use vision model - gemini-2.5-flash supports vision
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            model_name = model_name.replace('models/', '').replace('model/', '')
            
            print(f"  🤖 Using {model_name} for vision...")
            model = genai.GenerativeModel(model_name)
            
            prompt = """
Read this CV/Resume image carefully and extract ALL text content.

Extract:
1. Personal Information (Name, Email, Phone)
2. Education
3. Work Experience
4. Skills (ALL technical and soft skills)
5. Projects
6. Any other text

Return the complete text exactly as it appears, maintaining structure.
Use clear formatting with line breaks between sections.
"""
            
            if is_pdf:
                # Convert PDF to images
                try:
                    import pdf2image
                    print("  📄 Converting PDF to images...")
                    images = pdf2image.convert_from_bytes(file_content, first_page=1, last_page=3)
                    
                    full_text = ""
                    for i, img in enumerate(images):
                        print(f"  📸 Processing page {i+1} with AI Vision...")
                        response = model.generate_content([prompt, img])
                        full_text += response.text + "\n\n"
                    
                    print(f"  ✅ AI Vision extracted {len(full_text)} characters from PDF")
                    return full_text
                    
                except ImportError:
                    print("  ⚠️ pdf2image not installed")
                    return ''
            else:
                # Direct image processing
                print("  📸 Processing image with AI Vision...")
                img = Image.open(io.BytesIO(file_content))
                
                # Resize if too large (max 4MB for Gemini)
                max_size = (2048, 2048)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    print(f"  🔄 Resizing image from {img.size} to fit {max_size}")
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                response = model.generate_content([prompt, img])
                text = response.text
                
                print(f"  ✅ AI Vision extracted {len(text)} characters from image")
                return text
            
        except Exception as e:
            print(f"  ❌ AI Vision extraction failed: {e}")
            import traceback
            traceback.print_exc()
            return ''
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF - tries multiple methods"""
        
        # Method 1: Try PyMuPDF (best)
        text = self._extract_with_pymupdf(file_content)
        if text and len(text) > 50:
            return text
        
        # Method 2: Try pdfplumber
        text = self._extract_with_pdfplumber(file_content)
        if text and len(text) > 50:
            return text
        
        # Method 3: Try PyPDF2
        text = self._extract_with_pypdf2(file_content)
        if text and len(text) > 50:
            return text
        
        # Method 4: AI Vision (last resort)
        print("  ⚠️ All PDF extraction methods failed, trying AI Vision...")
        text = self.extract_text_with_ai_vision(file_content, is_pdf=True)
        
        return text
    
    def extract_text_from_image(self, file_content: bytes) -> str:
        """Extract text from image using Gemini Vision"""
        print("  📸 [Image] Using Gemini Vision to read image CV...")
        return self.extract_text_with_ai_vision(file_content, is_pdf=False)
    
    def _extract_with_pymupdf(self, file_content: bytes) -> str:
        """Extract using PyMuPDF (fastest and most reliable)"""
        try:
            import fitz  # PyMuPDF
            
            print("  [PyMuPDF] Opening PDF...")
            doc = fitz.open(stream=file_content, filetype="pdf")
            print(f"  [PyMuPDF] PDF has {len(doc)} pages")
            
            text = ""
            for i, page in enumerate(doc):
                print(f"  [PyMuPDF] Extracting page {i+1}...")
                page_text = page.get_text()
                print(f"  [PyMuPDF] Page {i+1} raw length: {len(page_text)} chars")
                
                if page_text:
                    text += page_text + "\n\n"  # Add double newline between pages
                    print(f"  [PyMuPDF] Page {i+1}: Added {len(page_text)} chars")
            
            doc.close()
            
            print(f"  [PyMuPDF] Before cleanup: {len(text)} characters")
            
            # Don't over-cleanup - preserve structure
            # Just normalize multiple spaces to single space
            text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs to single space
            text = re.sub(r'\n\n\n+', '\n\n', text)  # Multiple newlines to double newline
            
            print(f"  ✅ [PyMuPDF] After cleanup: {len(text)} characters")
            return text
            
        except ImportError:
            print("  ⚠️ PyMuPDF not installed (pip install PyMuPDF)")
            return ""
        except Exception as e:
            print(f"  ⚠️ PyMuPDF failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def _extract_with_pdfplumber(self, file_content: bytes) -> str:
        """Extract using pdfplumber"""
        try:
            import pdfplumber
            from io import BytesIO
            
            print("  [pdfplumber] Opening PDF...")
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                print(f"  [pdfplumber] PDF has {len(pdf.pages)} pages")
                
                text = ""
                for i, page in enumerate(pdf.pages):
                    print(f"  [pdfplumber] Extracting page {i+1}...")
                    page_text = page.extract_text()
                    print(f"  [pdfplumber] Page {i+1} raw length: {len(page_text) if page_text else 0} chars")
                    
                    if page_text:
                        text += page_text + "\n\n"
                        print(f"  [pdfplumber] Page {i+1}: Added {len(page_text)} chars")
                
                print(f"  [pdfplumber] Before cleanup: {len(text)} characters")
                
                # Don't over-cleanup
                text = re.sub(r'[ \t]+', ' ', text)
                text = re.sub(r'\n\n\n+', '\n\n', text)
                
                print(f"  ✅ [pdfplumber] After cleanup: {len(text)} characters")
                return text
                
        except ImportError:
            print("  ⚠️ pdfplumber not installed (pip install pdfplumber)")
            return ""
        except Exception as e:
            print(f"  ⚠️ pdfplumber failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def _extract_with_pypdf2(self, file_content: bytes) -> str:
        """Extract using PyPDF2 (fallback)"""
        try:
            from io import BytesIO
            
            print("  [PyPDF2] Opening PDF...")
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            print(f"  [PyPDF2] PDF has {len(pdf_reader.pages)} pages")
            
            text = ""
            for i, page in enumerate(pdf_reader.pages):
                try:
                    print(f"  [PyPDF2] Extracting page {i+1}...")
                    page_text = page.extract_text()
                    print(f"  [PyPDF2] Page {i+1} raw length: {len(page_text) if page_text else 0} chars")
                    
                    if page_text:
                        # Fix concatenated words
                        page_text = re.sub(r'([a-z])([A-Z])', r'\1 \2', page_text)
                        text += page_text + "\n\n"
                        print(f"  [PyPDF2] Page {i+1}: Added {len(page_text)} chars")
                        
                except Exception as e:
                    print(f"  [PyPDF2] Error on page {i+1}: {e}")
                    continue
            
            print(f"  [PyPDF2] Before cleanup: {len(text)} characters")
            
            # Don't over-cleanup
            text = re.sub(r'[ \t]+', ' ', text)
            text = re.sub(r'\n\n\n+', '\n\n', text)
            
            print(f"  ✅ [PyPDF2] After cleanup: {len(text)} characters")
            return text
            
        except Exception as e:
            print(f"  ⚠️ PyPDF2 failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def extract_all_with_ai(self, text: str, target_career: str = None) -> Dict:
        """
        Dùng AI đọc TOÀN BỘ CV và extract tất cả thông tin
        
        Args:
            text: Full text từ CV
            target_career: Nghề nghiệp mục tiêu (optional)
            
        Returns:
            Dict: {personal_info: {...}, skills: [...]}
        """
        try:
            import google.generativeai as genai
            import os
            import json
            
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("⚠️ GEMINI_API_KEY not found")
                return self._get_fallback_data()
            
            genai.configure(api_key=api_key)
            
            # Get model name from env - use exactly as specified
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            # Remove any 'models/' prefix if present
            model_name = model_name.replace('models/', '').replace('model/', '')
            
            print(f"  Using Gemini model: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            # Use full CV text
            cv_text = text[:20000]  # Up to 20k chars
            
            print(f"\n📤 SENDING TO AI:")
            print(f"   Text length: {len(cv_text)} chars")
            print(f"   Model: {model_name}")
            print(f"   Target career: {target_career or 'None'}")
            
            career_context = f"\nTarget Career: {target_career}" if target_career else ""
            
            prompt = f"""
You are a professional CV/Resume parser. Read the ENTIRE CV below carefully and extract ALL information.{career_context}

FULL CV TEXT:
{cv_text}

Task: Extract the following information and return as JSON:

1. PERSONAL INFORMATION:
   - name: The person's full name (usually at the top, 2-4 words, NOT a job title)
   - email: Email address (format: xxx@xxx.xxx)
   - phone: Phone number (Vietnamese format: 0XXXXXXXXX or +84XXXXXXXXX)

2. SKILLS: Extract ALL technical and soft skills mentioned in the CV
   - Programming languages: Python, Java, JavaScript, PHP, etc.
   - Frameworks: Laravel, React, Angular, Vue, Django, etc.
   - Databases: MySQL, PostgreSQL, MongoDB, Redis, etc.
   - Tools: Git, Docker, Jira, etc.
   - Soft skills: Communication, Leadership, Teamwork, etc.

Return ONLY valid JSON in this format:
{{
  "personal_info": {{
    "name": "Tran Quoc Vi",
    "email": "vit76404@gmail.com",
    "phone": "0774594729"
  }},
  "skills": [
    {{"name": "JavaScript", "category": "Programming"}},
    {{"name": "PHP", "category": "Programming"}},
    {{"name": "Python", "category": "Programming"}},
    {{"name": "Laravel", "category": "Web Framework"}},
    {{"name": "React", "category": "Frontend"}},
    {{"name": "Node.js", "category": "Backend"}},
    {{"name": "MySQL", "category": "Database"}},
    {{"name": "PostgreSQL", "category": "Database"}},
    {{"name": "MongoDB", "category": "Database"}},
    {{"name": "Git", "category": "DevOps"}},
    {{"name": "Docker", "category": "DevOps"}},
    {{"name": "Redis", "category": "Database"}},
    {{"name": "RabbitMQ", "category": "Message Queue"}},
    {{"name": "Socket", "category": "Real-time"}},
    {{"name": "Material-UI", "category": "UI Library"}},
    {{"name": "Bootstrap", "category": "UI Library"}},
    {{"name": "Redux", "category": "State Management"}},
    {{"name": "Jira", "category": "Project Management"}},
    {{"name": "Communication", "category": "Soft Skills"}},
    {{"name": "Teamwork", "category": "Soft Skills"}}
  ]
}}

CRITICAL RULES:
- Read the ENTIRE CV text above
- Extract the person's ACTUAL NAME (not "carrergoals..." or job titles)
- Include ALL skills you can find in the CV
- Return ONLY valid JSON, no markdown, no explanations
- If information not found, use empty string ""
"""
            
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            print(f"\n📥 AI RESPONSE RECEIVED:")
            print(f"   Length: {len(response_text)} chars")
            print(f"   Preview (first 500 chars):")
            print("-" * 80)
            print(response_text[:500])
            print("-" * 80)
            
            # Parse JSON
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
                print("   ✅ Extracted JSON from markdown code block")
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
                print("   ✅ Extracted JSON from code block")
            
            print(f"\n🔍 PARSING JSON:")
            print(f"   JSON length: {len(response_text)} chars")
            
            data = json.loads(response_text)
            
            print(f"   ✅ JSON parsed successfully")
            print(f"   Keys: {list(data.keys())}")
            
            # Validate and clean data
            personal_info = data.get('personal_info', {})
            skills = data.get('skills', [])
            
            print(f"\n📊 EXTRACTED DATA:")
            print(f"   Personal info keys: {list(personal_info.keys())}")
            print(f"   Skills count: {len(skills)}")
            if skills:
                print(f"   First 5 skills: {[s.get('name') for s in skills[:5]]}")
            
            # Validate name
            name = personal_info.get('name', '').strip()
            if name:
                print(f"\n🔍 VALIDATING NAME: '{name}'")
                # Check if name looks valid
                words = name.split()
                print(f"   Word count: {len(words)}")
                if len(words) < 2 or len(words) > 4:
                    print(f"   ⚠️ Invalid name format (need 2-4 words)")
                    name = ''
                else:
                    # Check not a job title
                    invalid_keywords = ['engineer', 'developer', 'designer', 'manager', 
                                       'laravel', 'php', 'python', 'backend', 'frontend']
                    if any(kw in name.lower() for kw in invalid_keywords):
                        print(f"   ⚠️ Name looks like job title")
                        name = ''
                    else:
                        print(f"   ✅ Name validated successfully")
            
            personal_info['name'] = name
            
            # Add source to skills
            for skill in skills:
                skill['source'] = 'ai'
            
            print(f"\n✅ AI EXTRACTION COMPLETE:")
            print(f"   - Name: {personal_info.get('name') or 'Not found'}")
            print(f"   - Email: {personal_info.get('email') or 'Not found'}")
            print(f"   - Phone: {personal_info.get('phone') or 'Not found'}")
            print(f"   - Skills: {len(skills)}")
            
            return {
                'personal_info': personal_info,
                'skills': skills
            }
            
        except Exception as e:
            print(f"  ⚠️ AI complete extraction failed: {e}")
            import traceback
            traceback.print_exc()
            return self._get_fallback_data()
    
    def _get_fallback_data(self) -> Dict:
        """Fallback data when AI fails"""
        return {
            'personal_info': {'name': '', 'email': '', 'phone': ''},
            'skills': []
        }
    
    def parse_cv_complete(self, file_content: bytes, file_type: str = 'pdf', 
                         target_career: str = None) -> Dict:
        """
        Parse CV hoàn chỉnh - extract tất cả thông tin bằng AI
        
        Args:
            file_content: Nội dung file
            file_type: Loại file ('pdf' hoặc 'image')
            target_career: Nghề nghiệp mục tiêu
            
        Returns:
            Dict: {text, personal_info, skills}
        """
        print("\n" + "="*80)
        print("📄 [CV Parser V2] STARTING PDF EXTRACTION")
        print("="*80)
        print(f"File type: {file_type}")
        print(f"File size: {len(file_content)} bytes")
        print(f"Target career: {target_career}")
        
        # Extract text
        if file_type == 'pdf':
            text = self.extract_text_from_pdf(file_content)
        else:
            # For images, use Gemini Vision directly
            text = self.extract_text_from_image(file_content)
        
        if not text or len(text) < 10:
            print("\n❌ ERROR: Could not extract text from file")
            print("   Returning fallback data")
            return self._get_fallback_data()
        
        print(f"\n✅ TEXT EXTRACTION SUCCESSFUL")
        print(f"   Extracted: {len(text)} characters")
        
        # Show preview
        print(f"\n📝 TEXT PREVIEW (first 500 chars):")
        print("-" * 80)
        print(text[:500])
        print("-" * 80)
        
        # Show last 200 chars too
        print(f"\n📝 TEXT PREVIEW (last 200 chars):")
        print("-" * 80)
        print(text[-200:] if len(text) > 200 else text)
        print("-" * 80)
        
        # Use AI to extract everything
        print("\n🤖 [CV Parser V2] STARTING AI EXTRACTION")
        print("="*80)
        result = self.extract_all_with_ai(text, target_career)
        
        result['text'] = text[:500]  # Preview
        
        print("\n" + "="*80)
        print("✅ [CV Parser V2] EXTRACTION COMPLETE")
        print("="*80)
        
        return result
