"""
Gemini API utilities với retry logic và quota management
Updated to use Multi-Stream Manager for CV Analysis
"""
import json
from typing import Optional

from app.core.gemini_manager import multi_stream_manager


class GeminiAPIManager:
    """Manager cho Gemini API với retry logic và quota handling - Updated for CV Stream"""
    
    def __init__(self):
        # Use the dedicated CV analysis stream from multi-stream manager
        self.stream_manager = multi_stream_manager.get_cv_stream()
        
        # Keep these for compatibility
        self.api_key = self.stream_manager.api_key
        self.model_name = self.stream_manager.model_name
        self.max_retries = self.stream_manager.max_retries
        self.retry_delay = self.stream_manager.retry_delay
        self.enabled = self.stream_manager.enabled
        self.fast_fail = self.stream_manager.fast_fail
        self.model = self.stream_manager.model
        
        print("🔧 CV Analysis Gemini Manager initialized")
        print(f"   Stream available: {'✅' if self.stream_manager.is_available() else '❌'}")
        print(f"   Model: {self.model_name}")
        print(f"   Fast fail: {self.fast_fail}")
    
    def is_available(self) -> bool:
        """Check if Gemini API is available"""
        return self.stream_manager.is_available()
    
    def generate_content_with_retry(self, prompt: str, **kwargs) -> Optional[str]:
        """
        Generate content với retry logic - FAST FAIL cho quota exceeded
        Now uses the dedicated CV stream
        """
        return self.stream_manager.generate_content_with_retry(prompt, **kwargs)
    
    def extract_skills_from_cv(self, text: str, target_career: str = None) -> list:
        """Extract skills from CV using AI"""
        if not self.is_available():
            return []
        
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
        
        print(f"  🤖 Using Gemini model: {self.model_name}")
        response_text = self.generate_content_with_retry(prompt)
        
        if not response_text:
            return []
        
        try:
            # Parse JSON response
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
            
        except json.JSONDecodeError as e:
            print(f"  ❌ Failed to parse JSON response: {e}")
            return []
    
    def extract_personal_info(self, text: str) -> dict:
        """Extract personal information from CV"""
        if not self.is_available():
            return {}
        
        prompt = f"""
You are extracting personal information from a CV/Resume.

Task: Find and return personal information as JSON.

FULL CV TEXT:
{text[:5000]}

Instructions:
1. Extract name, email, phone from the CV
2. The person's name is usually at the very top
3. Look for email patterns: xxx@xxx.xxx
4. Look for phone patterns: Vietnamese format

Return ONLY valid JSON:
{{
  "name": "Full Name",
  "email": "email@domain.com", 
  "phone": "0123456789"
}}

If information not found, use empty string "".
Return ONLY JSON, no explanations.
"""
        
        response_text = self.generate_content_with_retry(prompt)
        
        if not response_text:
            return {}
        
        try:
            # Parse JSON response
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            personal_info = json.loads(response_text)
            print(f"  ✅ AI extracted personal info: {personal_info}")
            return personal_info
            
        except json.JSONDecodeError as e:
            print(f"  ❌ Failed to parse personal info JSON: {e}")
            return {}
    
    def semantic_skill_matching(self, cv_skills: list, job_skills: list, career_name: str) -> Optional[dict]:
        """Perform semantic skill matching"""
        if not self.is_available():
            return None
        
        cv_skill_names = [s['name'] for s in cv_skills]
        job_skill_names = [s['name'] for s in job_skills]
        
        prompt = f"""
You are an expert career analyst. Analyze the skill match between a CV and job requirements.

Career: {career_name}

Job Required Skills:
{', '.join(job_skill_names)}

CV Skills:
{', '.join(cv_skill_names)}

Task: Match CV skills to job requirements using semantic understanding.

For example:
- "AutoCAD" matches "Computer-aided design software" or "CAD software"
- "GPS" matches "GPS Technology" or "Geographic positioning"
- "Python" matches "Programming" or "Software development"

Return JSON with:
{{
  "matched_pairs": [
    {{"cv_skill": "AutoCAD", "job_skill": "CAD software", "confidence": 0.95, "reason": "AutoCAD is a CAD software"}},
    ...
  ],
  "unmatched_cv_skills": ["skill1", "skill2"],
  "unmatched_job_skills": ["skill1", "skill2"],
  "overall_match_percentage": 75.5
}}

CRITICAL: Return ONLY valid JSON, no markdown, no explanations.
"""
        
        print(f"  🤖 AI analyzing semantic skill matching for {career_name}...")
        response_text = self.generate_content_with_retry(prompt)
        
        if not response_text:
            return None
        
        try:
            # Parse JSON response
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            print(f"  ✅ AI found {len(result.get('matched_pairs', []))} semantic matches")
            return result
            
        except json.JSONDecodeError as e:
            print(f"  ❌ Failed to parse semantic matching JSON: {e}")
            return None

# Global instance
gemini_manager = GeminiAPIManager()