import google.generativeai as genai
from typing import List, Dict, Optional
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class GeminiChatbotService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-pro")
        self.max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "1000"))
        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        
        # Try to initialize model with fallback
        self.model = self._initialize_model()
    
    def _initialize_model(self):
        """Initialize model with fallback options"""
        fallback_models = [
            self.model_name,
            "models/gemma-3-4b-it",
            "models/gemma-3-1b-it",
            "models/gemini-2.0-flash-lite",
            "models/gemini-flash-lite-latest",
            "models/gemini-2.5-flash-lite",
            "models/gemini-flash-latest"
        ]
        
        for model_name in fallback_models:
            try:
                logger.info(f"Trying to initialize model: {model_name}")
                model = genai.GenerativeModel(model_name)
                
                # Test the model with a simple request
                test_response = model.generate_content(
                    "Test",
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=10,
                        temperature=0.1,
                    )
                )
                
                logger.info(f"Successfully initialized model: {model_name}")
                self.model_name = model_name  # Update the working model name
                return model
                
            except Exception as e:
                logger.warning(f"Failed to initialize model {model_name}: {e}")
                continue
        
        # If all models fail, raise error - API is required
        raise ValueError("Gemini API is required but no working model found. Please check API key and model names.")
        
    def generate_response(self, message: str, context: Optional[str] = None) -> str:
        """Generate response from Gemini API or fallback"""
        
        # API is required - no fallback allowed
        if self.model is None:
            raise ValueError("Gemini API model is required but not available")
        
        try:
            # Create prompt with career counseling context - ALWAYS respond in English
            system_prompt = """
            You are an intelligent career counseling chatbot for the AI-Based Career Recommendation System.
            Your responsibilities are:
            1. Provide career guidance and help users choose suitable careers
            2. Give advice on skill development
            3. Guide users on career paths and learning roadmaps
            4. Answer questions about the job market
            5. Help users understand different industries and professions
            
            IMPORTANT: You MUST ALWAYS respond in English, regardless of the language the user uses.
            Be friendly, professional, and helpful.
            Provide specific and practical advice.
            """
            
            full_prompt = f"{system_prompt}\n\nUser asks: {message}"
            if context:
                full_prompt += f"\n\nAdditional context: {context}"
            
            # Sử dụng max_tokens nếu > 0, nếu không thì không giới hạn
            if self.max_tokens > 0:
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=self.max_tokens,
                        temperature=self.temperature,
                    )
                )
            else:
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self.temperature,
                    )
                )
            
            return response.text
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error generating Gemini response: {error_msg}")
            
            # Always use fallback on any error
            return self._get_fallback_response(message)
    
    def get_career_advice(self, user_profile: Dict) -> str:
        """Generate personalized career advice based on user profile"""
        skills = user_profile.get('skills', [])
        interests = user_profile.get('interests', [])
        experience = user_profile.get('experience', '')
        education = user_profile.get('education', '')
        
        prompt = f"""
        Based on the following user information, provide specific and detailed career advice in English:
        
        Current skills: {', '.join(skills) if skills else 'Not provided'}
        Interests/Passions: {', '.join(interests) if interests else 'Not provided'}
        Work experience: {experience if experience else 'No experience'}
        Education level: {education if education else 'Not provided'}
        
        Please analyze and suggest:
        1. 3-5 most suitable careers for this profile
        2. Skills to develop for each career
        3. Specific learning/development roadmap (6 months, 1 year, 2 years)
        4. Expected salary and career prospects
        5. Recommended courses/certifications
        
        IMPORTANT: Respond in English only.
        """
        
        return self.generate_response(prompt)
    
    def get_skill_development_plan(self, current_skills: List[str], target_job: str) -> str:
        """Generate skill development plan for target job"""
        prompt = f"""
        User currently has these skills: {', '.join(current_skills)}
        Career goal: {target_job}
        
        Create a detailed skill development plan in English:
        1. Skill gap analysis (missing skills)
        2. Learning roadmap for first 6 months
        3. Learning roadmap for 6-12 months
        4. Practical projects to work on
        5. Recommended online/offline courses
        6. How to measure progress
        
        IMPORTANT: Respond in English only. Be specific and actionable.
        """
        
        return self.generate_response(prompt)
    
    def analyze_job_market(self, job_title: str, location: str = "Vietnam") -> str:
        """Analyze job market for specific position"""
        prompt = f"""
        Analyze the job market for position: {job_title} in {location}
        
        Please provide information about:
        1. Current hiring demand
        2. Average salary (junior, mid, senior levels)
        3. Companies actively hiring
        4. Preferred skills
        5. Industry development trends
        6. Tips to stand out in applications
        
        IMPORTANT: Respond in English only. Base on 2024-2025 market data.
        """
        
        return self.generate_response(prompt)
    
    def _get_fallback_response(self, message: str) -> str:
        """Provide comprehensive fallback responses when API is unavailable"""
        message_lower = message.lower()
        
        # Marketing related
        if any(word in message_lower for word in ['marketing', 'advertising', 'digital marketing', 'social media']):
            return """
**Digital Marketing Roadmap:**

**Required Skills:**
1. **Content Creation:** Writing content, basic graphic design
2. **Social Media:** Facebook Ads, Google Ads, TikTok, Instagram
3. **Analytics:** Google Analytics, Facebook Insights
4. **SEO/SEM:** Search engine optimization
5. **Email Marketing:** Mailchimp, automation

**6-Month Roadmap:**
- Month 1-2: Learn marketing fundamentals, content writing
- Month 3-4: Practice Facebook/Google Ads
- Month 5-6: Real projects, build portfolio

**Salary:** $400-800 (junior), $800-1,500 (senior)
**Opportunities:** Agency, in-house, freelance
            """
        
        # Data Science/Analytics
        elif any(word in message_lower for word in ['data', 'analysis', 'analyst', 'scientist', 'ai', 'machine learning']):
            return """
**Data Science Roadmap:**

**Foundation Skills:**
1. **Math/Statistics:** Probability, descriptive statistics
2. **Programming:** Python (pandas, numpy, scikit-learn)
3. **Database:** SQL, NoSQL
4. **Visualization:** Tableau, Power BI, matplotlib
5. **Machine Learning:** Supervised/Unsupervised learning

**12-Month Roadmap:**
- Month 1-3: Python basics + SQL
- Month 4-6: Pandas, numpy, data cleaning
- Month 7-9: Machine Learning algorithms
- Month 10-12: Deep Learning, real projects

**Salary:** $600-1,000 (junior), $1,200-2,500 (senior)
**Opportunities:** Fintech, e-commerce, consulting
            """
        
        # Business/Finance
        elif any(word in message_lower for word in ['business', 'finance', 'accounting', 'financial']):
            return """
**Business/Finance Roadmap:**

**Finance Track:**
- **Skills:** Advanced Excel, financial analysis, reporting
- **Certifications:** CFA, FRM, ACCA
- **Opportunities:** Banking, securities, insurance
- **Salary:** $500-900 (junior), $1,000-2,000 (senior)

**Business Analyst:**
- **Skills:** Process mapping, requirements gathering, SQL
- **Tools:** Visio, JIRA, Power BI
- **Opportunities:** Consulting, IT, manufacturing
- **Salary:** $600-1,000 (junior), $1,200-2,200 (senior)

**Tip:** Combine tech skills with domain knowledge
            """
        
        # Design/Creative
        elif any(word in message_lower for word in ['design', 'ui', 'ux', 'graphic', 'creative']):
            return """
**Design Roadmap:**

**UI/UX Design:**
- **Tools:** Figma, Sketch, Adobe XD
- **Skills:** User research, wireframing, prototyping
- **Portfolio:** 3-5 detailed case studies
- **Salary:** $400-750 (junior), $900-1,750 (senior)

**Graphic Design:**
- **Tools:** Photoshop, Illustrator, InDesign
- **Specialization:** Branding, print design, digital assets
- **Opportunities:** Agency, in-house, freelance
- **Salary:** $300-600 (junior), $750-1,250 (senior)

**Path:** Learn tools → Build portfolio → Internship → Full-time
            """
        
        # Career advice responses
        elif any(word in message_lower for word in ['career', 'advice', 'guidance', 'direction', 'choose']):
            return """
**Career Selection Guide:**

**Step 1: Self-Assessment**
- What are your interests and passions?
- What are your current strengths and skills?
- What's your personality and work style?
- What are your financial and life goals?

**Step 2: Explore Industries**
- **Hot trends 2024:** AI/ML, Cybersecurity, Digital Marketing, Data Science
- **Stable:** Accounting, HR, Education, Healthcare
- **Creative:** Design, Content, Media, Entertainment

**Step 3: Create a Plan**
- Identify skill gaps
- Find courses/certifications
- Build portfolio
- Network and internship

**Question to consider:** What do you want to be doing in 5 years?
            """
        
        # IT/Tech related
        elif any(word in message_lower for word in ['it', 'programming', 'developer', 'python', 'java', 'web', 'mobile', 'software']):
            return """
**IT Career Roadmap:**

**Web Development:**
- **Frontend:** HTML/CSS/JS → React/Vue → TypeScript
- **Backend:** Node.js/Python/Java → Database → API
- **Salary:** $400-750 (junior), $1,000-2,000 (senior)

**Mobile Development:**
- **Native:** Swift (iOS), Kotlin (Android)
- **Cross-platform:** React Native, Flutter
- **Salary:** $500-900 (junior), $1,200-2,200 (senior)

**DevOps/Cloud:**
- **Skills:** Docker, Kubernetes, AWS/Azure
- **Salary:** $750-1,250 (junior), $1,500-3,000 (senior)

**6-Month Roadmap:**
1. Choose one specialization
2. Learn basics for 2-3 months
3. Build real projects for 2-3 months
4. Find internship/junior position
            """
        
        # General greeting
        elif any(word in message_lower for word in ['hello', 'hi', 'hey', 'greetings', 'who are you']):
            return """
**Hello! I'm your AI Career Advisor**

**I can help you with:**
- Career guidance and choosing suitable careers
- Detailed skill development roadmaps
- Job market analysis
- Learning and certification guidance
- Salary information by industry

**Hot Topics:**
- IT/Programming (Web, Mobile, AI/ML)
- Digital Marketing & Social Media
- Data Science & Analytics  
- Design (UI/UX, Graphic)
- Business & Finance

**Ask me:** "How to become a [job title]?" or "What career should I choose?"
            """
        
        # Salary/Income related
        elif any(word in message_lower for word in ['salary', 'income', 'pay', 'money', 'earn']):
            return """
**Salary Information by Industry (2024):**

**IT/Technology:**
- Developer: $400-750 (junior) → $1,000-2,000 (senior)
- Data Scientist: $600-1,000 → $1,200-2,500
- DevOps: $750-1,250 → $1,500-3,000
- Product Manager: $900-1,500 → $2,000-4,000

**Marketing/Sales:**
- Digital Marketing: $400-750 → $750-1,500
- Sales: $400-600 + commission → $1,000-2,000
- Content Creator: $300-500 → $750-1,250

**Finance/Business:**
- Accountant: $350-600 → $750-1,250
- Business Analyst: $600-1,000 → $1,200-2,200
- Investment Banking: $750-1,250 → $2,000-5,000

**Design:**
- Graphic Designer: $300-600 → $750-1,250
- UI/UX Designer: $400-750 → $900-1,750

*Note: Salary depends on experience, company, and skills*
            """
        
        # Skills development
        elif any(word in message_lower for word in ['skill', 'learn', 'course', 'certificate', 'training']):
            return """
**Effective Skill Development:**

**Soft Skills:**
- Communication and presentation
- Teamwork and leadership
- Critical thinking and problem solving
- Time and stress management
- English communication

**Hard Skills:**
- **Tech:** Programming, data analysis, digital tools
- **Business:** Excel, PowerPoint, project management
- **Creative:** Design software, content creation

**Online Learning Platforms:**
- **Free:** Coursera, edX, YouTube, FreeCodeCamp
- **Paid:** Udemy, Pluralsight, LinkedIn Learning

**Tips:** Learn 1-2 skills at a time, practice immediately, build portfolio
            """
        
        # Default fallback
        else:
            return f"""
**I understand you're asking about: "{message[:50]}..."**

**Topics I can help with:**

**Career Guidance:**
- "What career should I choose?"
- "How to become a [job title]?"

**Technology:**
- "How to learn web development?"
- "Is Data Science right for me?"

**Marketing & Business:**
- "How to start with Digital Marketing?"
- "Skills needed for Business Analyst?"

**Salary & Market Info:**
- "Salary for [industry]?"
- "What industries are hot right now?"

**Please ask a more specific question so I can help you better!**
            """    

    def check_quota_status(self) -> Dict:
        """Check current API quota status"""
        try:
            # Simple test call to check if API is working
            test_response = self.model.generate_content(
                "Test",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=10,
                    temperature=0.1,
                )
            )
            return {
                "status": "available",
                "message": "API quota available"
            }
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                return {
                    "status": "quota_exceeded", 
                    "message": "API quota exceeded",
                    "error": error_msg
                }
            return {
                "status": "error",
                "message": "API error",
                "error": error_msg
            }