"""
CV Parser - Giai đoạn 1
Trích xuất kỹ năng từ CV (PDF/Word) sử dụng NLP
"""
import re
from typing import List, Dict, Set
import PyPDF2
from io import BytesIO


class CVParser:
    """Parser để trích xuất kỹ năng từ CV"""
    
    def __init__(self, db_session=None):
        """
        Initialize CV Parser
        
        Args:
            db_session: SQLAlchemy session để query skills từ database (optional)
        """
        self.db = db_session
        self._skill_cache = None
    
    def _load_skills_from_database(self) -> Dict[str, str]:
        """
        Load danh sách skills từ database (core.career_ksas)
        
        Returns:
            Dict[str, str]: Dict mapping skill_name -> category
        """
        if self._skill_cache is not None:
            return self._skill_cache
        
        if not self.db:
            print("⚠️ No database session, using fallback skills")
            return self._get_fallback_skills()
        
        try:
            from app.modules.content.models import CareerKSA
            from sqlalchemy import select
            
            # Query skills with their categories from database
            stmt = select(CareerKSA.name, CareerKSA.category).distinct()
            result = self.db.execute(stmt)
            
            # Build dict: skill_name (lowercase) -> category
            skills_dict = {}
            for name, category in result:
                skill_lower = name.lower()
                # Use first category found for each skill
                if skill_lower not in skills_dict:
                    skills_dict[skill_lower] = category or 'Other'
            
            print(f"✅ Loaded {len(skills_dict)} skills with categories from database")
            self._skill_cache = skills_dict
            return skills_dict
            
        except Exception as e:
            print(f"⚠️ Error loading skills from database: {e}")
            return self._get_fallback_skills()
    
    def _get_fallback_skills(self) -> Dict[str, str]:
        """
        Fallback skill dict khi không có database
        Chỉ giữ một số skills cơ bản nhất để demo vẫn chạy được
        """
        return {
            # Top 20 most common skills - minimal fallback
            'python': 'Programming',
            'java': 'Programming',
            'javascript': 'Programming',
            'sql': 'Database',
            'html': 'Web Development',
            'css': 'Web Development',
            'react': 'Web Development',
            'git': 'DevOps',
            'docker': 'DevOps',
            'aws': 'Cloud',
            'communication': 'Soft Skills',
            'leadership': 'Soft Skills',
            'teamwork': 'Soft Skills',
            'problem solving': 'Soft Skills',
            'project management': 'Soft Skills',
            'agile': 'Soft Skills',
            'machine learning': 'Data Science',
            'data analysis': 'Data Science',
            'excel': 'Office',
            'english': 'Language',
        }
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """
        Trích xuất text từ PDF với xử lý spaces tốt hơn
        
        Args:
            file_content: Nội dung file PDF dạng bytes
            
        Returns:
            str: Text đã trích xuất
        """
        try:
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                
                # Fix common PDF extraction issues
                # Sometimes words are concatenated without spaces
                # Add space before capital letters that follow lowercase
                import re
                page_text = re.sub(r'([a-z])([A-Z])', r'\1 \2', page_text)
                
                text += page_text + "\n"
            
            # Additional cleanup
            # Remove excessive whitespace but keep single spaces
            text = re.sub(r'\s+', ' ', text)
            text = re.sub(r'\n\s*\n', '\n', text)
            
            return text  # Keep original case for name extraction
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
    
    def extract_text_from_image(self, file_content: bytes) -> str:
        """
        Trích xuất text từ image sử dụng OCR
        
        Args:
            file_content: Nội dung file image dạng bytes
            
        Returns:
            str: Text đã trích xuất
        """
        try:
            # Try to import OCR libraries
            try:
                from PIL import Image
                import pytesseract
            except ImportError:
                print("⚠️ OCR libraries not installed")
                print("   Install: pip install pytesseract pillow")
                print("   Also install Tesseract: https://github.com/tesseract-ocr/tesseract")
                return self._get_fallback_text()
            
            # Open and process image
            image = Image.open(BytesIO(file_content))
            
            # Perform OCR
            text = pytesseract.image_to_string(image, lang='eng')
            
            print(f"✅ OCR extracted {len(text)} characters")
            return text.lower()
            
        except Exception as e:
            print(f"❌ Error in OCR: {e}")
            return self._get_fallback_text()
    
    def _get_fallback_text(self) -> str:
        """Fallback text when OCR is not available"""
        return """
        sample cv - ocr not available
        skills: python javascript react nodejs sql git docker
        experience: software engineer
        education: computer science
        """
    
    def extract_skills(self, text: str) -> List[Dict[str, any]]:
        """
        Trích xuất kỹ năng từ text sử dụng keyword matching
        
        Args:
            text: Text từ CV
            
        Returns:
            List[Dict]: Danh sách kỹ năng đã trích xuất
        """
        text_lower = text.lower()  # Convert to lowercase for matching
        found_skills = {}  # skill_name -> category
        
        # Load skills từ database hoặc fallback
        skills_dict = self._load_skills_from_database()
        
        print(f"  Searching for skills in text ({len(text)} chars)...")
        print(f"  Text preview: {text[:200]}...")
        
        # Tìm kiếm các kỹ năng trong text
        for skill, category in skills_dict.items():
            # Try both word boundary and simple contains for better matching
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower, re.IGNORECASE):
                found_skills[skill] = category
        
        # Convert to list of dicts
        skills_list = [
            {
                'name': skill.title(),  # Capitalize for better display
                'category': category,
                'source': 'cv'
            }
            for skill, category in sorted(found_skills.items())
        ]
        
        print(f"  Found skills: {[s['name'] for s in skills_list[:10]]}")
        
        return skills_list
    
    def parse_cv(self, file_content: bytes, file_type: str = 'pdf') -> Dict:
        """
        Parse CV và trích xuất kỹ năng + thông tin cá nhân
        
        Args:
            file_content: Nội dung file
            file_type: Loại file ('pdf' hoặc 'docx')
            
        Returns:
            Dict: Kết quả parse CV
        """
        if file_type == 'pdf':
            text = self.extract_text_from_pdf(file_content)
        elif file_type == 'image':
            text = self.extract_text_from_image(file_content)
        else:
            # TODO: Implement DOCX parser
            text = ""
        
        # Extract personal information
        personal_info = self.extract_personal_info(text)
        
        # Extract skills
        skills = self.extract_skills(text)
        
        return {
            'text': text[:500],  # First 500 chars for preview
            'personal_info': personal_info,
            'skills': skills,
            'total_skills': len(skills)
        }


    def extract_skills_with_ai(self, text: str, target_career: str = None) -> List[Dict[str, any]]:
        """
        NER Engine - Sử dụng AI (Gemini) để trích xuất kỹ năng từ CV
        
        Args:
            text: Text từ CV
            target_career: Nghề nghiệp mục tiêu (optional, để AI focus vào skills liên quan)
            
        Returns:
            List[Dict]: Danh sách kỹ năng được AI phát hiện
        """
        try:
            import google.generativeai as genai
            import os
            
            # Get API key from environment
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("⚠️ GEMINI_API_KEY not found in environment")
                return []
            
            # Configure Gemini
            genai.configure(api_key=api_key)
            
            # Get model name from env - use exactly as specified
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            # Remove 'models/' prefix if present
            if model_name.startswith('models/'):
                model_name = model_name.replace('models/', '')
            
            print(f"  Using Gemini model: {model_name}")
            
            model = genai.GenerativeModel(model_name)
            
            # Enhanced prompt with NER focus
            career_context = f"\nTarget Career: {target_career}" if target_career else ""
            
            prompt = f"""
You are a Named Entity Recognition (NER) system specialized in extracting skills from CVs/Resumes.

Task: Extract ALL skills, technologies, tools, and competencies mentioned in this CV.{career_context}

CV Text:
{text[:3000]}

Instructions:
1. Extract TECHNICAL SKILLS: Programming languages, frameworks, tools, technologies
2. Extract SOFT SKILLS: Communication, leadership, teamwork, problem-solving
3. Extract DOMAIN KNOWLEDGE: Industry-specific knowledge and methodologies
4. Use the EXACT terminology from the CV (e.g., "Python", not "python programming")
5. Include skill variations (e.g., "JavaScript", "JS", "Node.js" are separate)

Return ONLY a JSON array in this format:
[
  {{"name": "Python", "category": "Programming", "context": "3 years experience"}},
  {{"name": "React", "category": "Web Development", "context": "Frontend development"}},
  {{"name": "Leadership", "category": "Soft Skills", "context": "Team lead"}},
  ...
]

Categories:
- Programming: Python, Java, C++, JavaScript, etc.
- Web Development: React, Angular, HTML, CSS, Node.js, etc.
- Database: SQL, MongoDB, PostgreSQL, MySQL, etc.
- Cloud/DevOps: AWS, Docker, Kubernetes, CI/CD, etc.
- Data Science: Machine Learning, TensorFlow, Pandas, NumPy, etc.
- Design: Figma, Photoshop, UI/UX, etc.
- Soft Skills: Leadership, Communication, Teamwork, Problem Solving, etc.
- Technical: Any other technical skills
- Other: Anything else

Return ONLY the JSON array, no explanations.
"""
            
            # Call AI
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse JSON response
            import json
            # Remove markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            skills = json.loads(response_text)
            
            # Add source tag and normalize
            for skill in skills:
                skill['source'] = 'ai'
                # Remove context if too long
                if 'context' in skill and len(skill.get('context', '')) > 100:
                    skill['context'] = skill['context'][:100] + '...'
            
            print(f"  ✅ NER Engine extracted {len(skills)} skills")
            return skills
            
        except Exception as e:
            print(f"  ⚠️ NER Engine failed: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def normalize_skills(self, skills: List[Dict[str, any]]) -> List[Dict[str, any]]:
        """
        Normalization Layer - Chuẩn hóa kỹ năng theo chuẩn ONET
        
        Args:
            skills: Danh sách kỹ năng raw từ CV
            
        Returns:
            List[Dict]: Danh sách kỹ năng đã chuẩn hóa
        """
        print("  � Normalizing skills...")
        
        # Skill normalization rules
        normalization_map = {
            # Programming languages
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'golang': 'go',
            'c#': 'csharp',
            'c++': 'cplusplus',
            
            # Frameworks
            'reactjs': 'react',
            'react.js': 'react',
            'vuejs': 'vue',
            'vue.js': 'vue',
            'angularjs': 'angular',
            'nodejs': 'node.js',
            'node': 'node.js',
            
            # Databases
            'postgres': 'postgresql',
            'mongo': 'mongodb',
            'mysql': 'mysql',
            
            # Cloud
            'amazon web services': 'aws',
            'google cloud': 'gcp',
            'azure': 'microsoft azure',
            
            # Soft skills
            'communicate': 'communication',
            'lead': 'leadership',
            'manage': 'management',
            'analyze': 'analysis',
        }
        
        normalized_skills = {}
        
        for skill in skills:
            skill_name = skill['name'].lower().strip()
            
            # Apply normalization
            normalized_name = normalization_map.get(skill_name, skill_name)
            
            # Use normalized name as key to remove duplicates
            if normalized_name not in normalized_skills:
                normalized_skills[normalized_name] = {
                    'name': normalized_name.title(),  # Capitalize
                    'category': skill.get('category', 'Other'),
                    'source': skill.get('source', 'unknown'),
                    'context': skill.get('context', '')
                }
            else:
                # Merge sources if duplicate
                existing = normalized_skills[normalized_name]
                if existing['source'] != skill.get('source'):
                    existing['source'] = 'multiple'
        
        result = list(normalized_skills.values())
        print(f"  ✅ Normalized to {len(result)} unique skills")
        return result
    
    def extract_personal_info(self, text: str) -> Dict[str, str]:
        """
        Trích xuất thông tin cá nhân từ CV (Họ tên, Email, SĐT)
        
        Args:
            text: Text từ CV
            
        Returns:
            Dict: Thông tin cá nhân
        """
        info = {
            'name': '',
            'email': '',
            'phone': ''
        }
        
        try:
            # Extract email using regex (most reliable)
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            email_match = re.search(email_pattern, text, re.IGNORECASE)
            if email_match:
                info['email'] = email_match.group(0)
            
            # Extract phone number (Vietnamese format)
            # Supports: 0123456789, +84123456789, (012) 345-6789, etc.
            phone_pattern = r'(?:\+84|0)[\d\s.-]{9,15}'
            phone_matches = re.findall(phone_pattern, text)
            if phone_matches:
                # Clean phone number - take first valid one
                for phone in phone_matches:
                    phone_clean = re.sub(r'[\s.-]', '', phone)  # Remove spaces, dots, dashes
                    # Validate length (should be 10-11 digits)
                    if 10 <= len(phone_clean) <= 11 and phone_clean.isdigit():
                        info['phone'] = phone_clean
                        break
            
            # Extract name - ALWAYS use AI for better accuracy
            # Regex is unreliable for names, especially with PDF extraction issues
            info['name'] = self._extract_name_with_ai(text)
            
            # Fallback: If AI fails and we have email, extract name from email
            if not info['name'] and info['email']:
                email_name = info['email'].split('@')[0]
                # Convert email username to readable name (basic)
                # e.g., vit76404 -> Vit (not perfect but better than nothing)
                if not email_name.isdigit():
                    info['name'] = email_name.replace('.', ' ').replace('_', ' ').title()
            
            print(f"  📋 Personal Info Extracted:")
            print(f"     - Name: {info['name'] or 'Not found'}")
            print(f"     - Email: {info['email'] or 'Not found'}")
            print(f"     - Phone: {info['phone'] or 'Not found'}")
            
        except Exception as e:
            print(f"  ⚠️ Error extracting personal info: {e}")
        
        return info
    
    def _extract_name_with_ai(self, text: str) -> str:
        """
        Sử dụng AI để trích xuất tên từ CV - đọc toàn bộ CV
        
        Args:
            text: Text từ CV (full text)
            
        Returns:
            str: Tên người dùng
        """
        try:
            import google.generativeai as genai
            import os
            
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                return ''
            
            genai.configure(api_key=api_key)
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            if model_name.startswith('models/'):
                model_name = model_name.replace('models/', '')
            
            model = genai.GenerativeModel(model_name)
            
            # Use full text for better accuracy (up to 10000 chars)
            cv_text = text[:10000]
            
            # Enhanced prompt for better name extraction
            prompt = f"""
You are extracting personal information from a CV/Resume.

Task: Find and return ONLY the person's full name.

FULL CV TEXT:
{cv_text}

Instructions:
1. Read the ENTIRE CV text above carefully
2. The person's name is usually at the very top of the CV
3. Look for patterns like:
   - "Name: [Name]"
   - "Full Name: [Name]"
   - "Họ tên: [Name]"
   - Or just the name at the beginning before any other information
4. The name should be 2-4 words (First Middle Last)
5. Ignore job titles (Software Engineer, Developer, etc.)
6. Ignore company names
7. Ignore skills or technologies (Laravel, PHP, Python, etc.)

Return ONLY the person's full name in proper format: "First Last" or "First Middle Last"

If you cannot find a clear person's name, return "Unknown"

Examples of VALID names:
- "Tran Quoc Vi"
- "Nguyen Van An"
- "John Smith"
- "Le Thanh Thien"

Examples of INVALID (do NOT return):
- "carrergoalswithabasicknowledgeofphpandlaravel"
- "Software Engineer"
- "Laravel Developer"
- "Backend Developer"

Return ONLY the name, nothing else.
"""
            
            response = model.generate_content(prompt)
            name = response.text.strip()
            
            # Validate the extracted name
            if name and name.lower() != 'unknown':
                # Remove quotes if present
                name = name.strip('"\'')
                
                # Check if it looks like a valid name
                words = name.split()
                if 2 <= len(words) <= 4:
                    # Check each word starts with capital letter
                    if all(word and word[0].isupper() for word in words):
                        # Check it's not a job title or skill
                        invalid_keywords = ['engineer', 'developer', 'designer', 'manager', 'analyst', 
                                           'specialist', 'consultant', 'architect', 'administrator',
                                           'laravel', 'php', 'python', 'java', 'react', 'backend',
                                           'frontend', 'fullstack', 'senior', 'junior', 'lead']
                        
                        name_lower = name.lower()
                        if not any(keyword in name_lower for keyword in invalid_keywords):
                            print(f"  ✅ AI extracted name: {name}")
                            return name
            
            print(f"  ⚠️ AI extracted invalid name: '{name}', using fallback")
            
        except Exception as e:
            print(f"  ⚠️ AI name extraction failed: {e}")
        
        return ''
    
    def extract_skills_hybrid(self, text: str, target_career: str = None) -> List[Dict[str, any]]:
        """
        Pipeline: Keyword Matching + NER Engine + Normalization
        
        Args:
            text: Text từ CV
            target_career: Nghề nghiệp mục tiêu (optional)
            
        Returns:
            List[Dict]: Danh sách kỹ năng đã chuẩn hóa
        """
        print("🔍 [Skill Extraction Pipeline] Starting...")
        
        # Step 1: Keyword matching (fast, basic)
        keyword_skills = self.extract_skills(text)
        print(f"  📋 Step 1 - Keyword matching: {len(keyword_skills)} skills")
        
        # Step 2: NER Engine (AI, comprehensive)
        ai_skills = self.extract_skills_with_ai(text, target_career)
        print(f"  🤖 Step 2 - NER Engine: {len(ai_skills)} skills")
        
        # Step 3: Merge results
        skills_dict = {}
        
        # Add keyword skills
        for skill in keyword_skills:
            skill_name_lower = skill['name'].lower()
            skills_dict[skill_name_lower] = skill
        
        # Add AI skills (merge if duplicate)
        for skill in ai_skills:
            skill_name_lower = skill['name'].lower()
            if skill_name_lower in skills_dict:
                # Skill found by both methods - mark as verified
                skills_dict[skill_name_lower]['source'] = 'verified'
                # Update category if AI provides better one
                if skill.get('category') and skill['category'] != 'Other':
                    skills_dict[skill_name_lower]['category'] = skill['category']
                # Keep context from AI
                if skill.get('context'):
                    skills_dict[skill_name_lower]['context'] = skill['context']
            else:
                # New skill found only by AI
                skills_dict[skill_name_lower] = skill
        
        merged_skills = list(skills_dict.values())
        print(f"  ✅ Step 3 - Merged: {len(merged_skills)} skills")
        
        # Step 4: Normalization
        normalized_skills = self.normalize_skills(merged_skills)
        
        # Stats
        verified_count = sum(1 for s in normalized_skills if s['source'] == 'verified')
        ai_only_count = sum(1 for s in normalized_skills if s['source'] == 'ai')
        keyword_only_count = sum(1 for s in normalized_skills if s['source'] == 'cv')
        
        print(f"  📊 Final Stats:")
        print(f"     - Verified (both methods): {verified_count}")
        print(f"     - AI only: {ai_only_count}")
        print(f"     - Keyword only: {keyword_only_count}")
        print(f"     - Total: {len(normalized_skills)}")
        
        return normalized_skills
        def extract_personal_info(self, text: str) -> Dict[str, str]:
            """
            Trích xuất thông tin cá nhân từ CV (Họ tên, Email, SĐT)

            Args:
                text: Text từ CV

            Returns:
                Dict: Thông tin cá nhân
            """
            info = {
                'name': '',
                'email': '',
                'phone': ''
            }

            try:
                # Extract email using regex
                email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
                email_match = re.search(email_pattern, text)
                if email_match:
                    info['email'] = email_match.group(0)

                # Extract phone number (Vietnamese format)
                # Supports: 0123456789, +84123456789, (012) 345-6789, etc.
                phone_pattern = r'(?:\+84|0)(?:\d[\s.-]?){9,10}'
                phone_match = re.search(phone_pattern, text)
                if phone_match:
                    # Clean phone number
                    phone = phone_match.group(0)
                    phone = re.sub(r'[\s.-]', '', phone)  # Remove spaces, dots, dashes
                    info['phone'] = phone

                # Extract name - try to find name near common keywords
                # Look for patterns like "Name:", "Họ tên:", or at the beginning of CV
                name_patterns = [
                    r'(?:name|họ tên|full name|tên)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
                    r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',  # Name at start (2-4 words)
                ]

                for pattern in name_patterns:
                    name_match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                    if name_match:
                        info['name'] = name_match.group(1).strip()
                        break

                # If still no name, try AI extraction
                if not info['name']:
                    info['name'] = self._extract_name_with_ai(text)

                print(f"  📋 Personal Info Extracted:")
                print(f"     - Name: {info['name'] or 'Not found'}")
                print(f"     - Email: {info['email'] or 'Not found'}")
                print(f"     - Phone: {info['phone'] or 'Not found'}")

            except Exception as e:
                print(f"  ⚠️ Error extracting personal info: {e}")

            return info

        def _extract_name_with_ai(self, text: str) -> str:
            """
            Sử dụng AI để trích xuất tên từ CV

            Args:
                text: Text từ CV

            Returns:
                str: Tên người dùng
            """
            try:
                import google.generativeai as genai
                import os

                api_key = os.getenv('GEMINI_API_KEY')
                if not api_key:
                    return ''

                genai.configure(api_key=api_key)
                model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
                if model_name.startswith('models/'):
                    model_name = model_name.replace('models/', '')

                model = genai.GenerativeModel(model_name)

                prompt = f"""
    Extract the person's full name from this CV text. Return ONLY the name, nothing else.

    CV Text (first 1000 chars):
    {text[:1000]}

    Return only the full name in this format: "First Last" or "First Middle Last"
    If no name found, return "Unknown"
    """

                response = model.generate_content(prompt)
                name = response.text.strip()

                # Clean up response
                if name and name.lower() != 'unknown' and len(name) < 100:
                    return name

            except Exception as e:
                print(f"  ⚠️ AI name extraction failed: {e}")

            return ''

