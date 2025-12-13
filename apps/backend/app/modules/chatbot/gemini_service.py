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
            # Tạo prompt với context về career counseling
            system_prompt = """
            Bạn là một chatbot tư vấn nghề nghiệp thông minh của hệ thống AI-Based Career Recommendation System. 
            Nhiệm vụ của bạn là:
            1. Tư vấn về lựa chọn nghề nghiệp phù hợp
            2. Đưa ra lời khuyên về phát triển kỹ năng
            3. Hướng dẫn về con đường sự nghiệp và lộ trình học tập
            4. Trả lời các câu hỏi về thị trường lao động
            5. Giúp người dùng hiểu rõ hơn về các ngành nghề
            
            Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích. 
            Sử dụng tiếng Việt để giao tiếp với người dùng Việt Nam.
            Đưa ra lời khuyên cụ thể và thực tế.
            """
            
            full_prompt = f"{system_prompt}\n\nNgười dùng hỏi: {message}"
            if context:
                full_prompt += f"\n\nThông tin bổ sung: {context}"
            
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
        Dựa trên thông tin sau của người dùng, hãy đưa ra lời khuyên nghề nghiệp cụ thể và chi tiết:
        
        Kỹ năng hiện tại: {', '.join(skills) if skills else 'Chưa có thông tin'}
        Sở thích/Đam mê: {', '.join(interests) if interests else 'Chưa có thông tin'}
        Kinh nghiệm làm việc: {experience if experience else 'Chưa có kinh nghiệm'}
        Trình độ học vấn: {education if education else 'Chưa có thông tin'}
        
        Hãy phân tích và đề xuất:
        1. 3-5 nghề nghiệp phù hợp nhất với profile này
        2. Kỹ năng cần phát triển thêm cho từng nghề nghiệp
        3. Lộ trình học tập/phát triển cụ thể (6 tháng, 1 năm, 2 năm)
        4. Mức lương dự kiến và triển vọng nghề nghiệp
        5. Các khóa học/chứng chỉ nên theo học
        
        Trả lời bằng tiếng Việt, cụ thể và thực tế.
        """
        
        return self.generate_response(prompt)
    
    def get_skill_development_plan(self, current_skills: List[str], target_job: str) -> str:
        """Generate skill development plan for target job"""
        prompt = f"""
        Người dùng hiện có các kỹ năng: {', '.join(current_skills)}
        Mục tiêu nghề nghiệp: {target_job}
        
        Hãy tạo một kế hoạch phát triển kỹ năng chi tiết:
        1. Phân tích gap kỹ năng (kỹ năng còn thiếu)
        2. Lộ trình học tập 6 tháng đầu
        3. Lộ trình học tập 6-12 tháng
        4. Các dự án thực hành nên làm
        5. Khóa học online/offline đề xuất
        6. Cách đánh giá tiến độ
        
        Trả lời cụ thể và có thể thực hiện được.
        """
        
        return self.generate_response(prompt)
    
    def analyze_job_market(self, job_title: str, location: str = "Việt Nam") -> str:
        """Analyze job market for specific position"""
        prompt = f"""
        Phân tích thị trường việc làm cho vị trí: {job_title} tại {location}
        
        Hãy cung cấp thông tin về:
        1. Nhu cầu tuyển dụng hiện tại
        2. Mức lương trung bình (junior, mid, senior)
        3. Các công ty đang tuyển nhiều
        4. Kỹ năng được ưu tiên
        5. Xu hướng phát triển của ngành
        6. Lời khuyên để nổi bật trong ứng tuyển
        
        Dựa trên thông tin thị trường Việt Nam năm 2024-2025.
        """
        
        return self.generate_response(prompt)
    
    def _get_fallback_response(self, message: str) -> str:
        """Provide comprehensive fallback responses when API is unavailable"""
        message_lower = message.lower()
        
        # Marketing related
        if any(word in message_lower for word in ['marketing', 'quảng cáo', 'digital marketing', 'social media']):
            return """
📢 **Lộ trình Marketing Digital:**

**Kỹ năng cần thiết:**
1. **Content Creation:** Viết content, thiết kế đồ họa cơ bản
2. **Social Media:** Facebook Ads, Google Ads, TikTok, Instagram
3. **Analytics:** Google Analytics, Facebook Insights
4. **SEO/SEM:** Tối ưu hóa tìm kiếm
5. **Email Marketing:** Mailchimp, automation

**Lộ trình 6 tháng:**
• Tháng 1-2: Học nền tảng marketing, content writing
• Tháng 3-4: Thực hành Facebook/Google Ads
• Tháng 5-6: Dự án thực tế, xây dựng portfolio

**Mức lương:** 8-15 triệu (junior), 15-30 triệu (senior)
**Cơ hội:** Agency, in-house, freelance
            """
        
        # Data Science/Analytics
        elif any(word in message_lower for word in ['data', 'phân tích', 'analyst', 'scientist', 'ai', 'machine learning']):
            return """
📊 **Lộ trình Data Science:**

**Kỹ năng nền tảng:**
1. **Toán/Thống kê:** Xác suất, thống kê mô tả
2. **Programming:** Python (pandas, numpy, scikit-learn)
3. **Database:** SQL, NoSQL
4. **Visualization:** Tableau, Power BI, matplotlib
5. **Machine Learning:** Supervised/Unsupervised learning

**Lộ trình 12 tháng:**
• Tháng 1-3: Python cơ bản + SQL
• Tháng 4-6: Pandas, numpy, data cleaning
• Tháng 7-9: Machine Learning algorithms
• Tháng 10-12: Deep Learning, dự án thực tế

**Mức lương:** 12-20 triệu (junior), 25-50 triệu (senior)
**Cơ hội:** Fintech, e-commerce, consulting
            """
        
        # Business/Finance
        elif any(word in message_lower for word in ['kinh doanh', 'business', 'tài chính', 'finance', 'kế toán']):
            return """
💼 **Lộ trình Business/Finance:**

**Ngành Tài chính:**
• **Kỹ năng:** Excel nâng cao, phân tích tài chính, báo cáo
• **Chứng chỉ:** CFA, FRM, ACCA
• **Cơ hội:** Ngân hàng, chứng khoán, bảo hiểm
• **Lương:** 10-18 triệu (junior), 20-40 triệu (senior)

**Business Analyst:**
• **Kỹ năng:** Process mapping, requirements gathering, SQL
• **Tools:** Visio, JIRA, Power BI
• **Cơ hội:** Consulting, IT, manufacturing
• **Lương:** 12-20 triệu (junior), 25-45 triệu (senior)

**Lời khuyên:** Kết hợp kỹ năng tech với domain knowledge
            """
        
        # Design/Creative
        elif any(word in message_lower for word in ['thiết kế', 'design', 'ui', 'ux', 'graphic', 'sáng tạo']):
            return """
🎨 **Lộ trình Design:**

**UI/UX Design:**
• **Tools:** Figma, Sketch, Adobe XD
• **Kỹ năng:** User research, wireframing, prototyping
• **Portfolio:** 3-5 case studies chi tiết
• **Lương:** 8-15 triệu (junior), 18-35 triệu (senior)

**Graphic Design:**
• **Tools:** Photoshop, Illustrator, InDesign
• **Chuyên môn:** Branding, print design, digital assets
• **Cơ hội:** Agency, in-house, freelance
• **Lương:** 6-12 triệu (junior), 15-25 triệu (senior)

**Lộ trình:** Học tools → Xây dựng portfolio → Thực tập → Full-time
            """
        
        # Career advice responses
        elif any(word in message_lower for word in ['nghề nghiệp', 'career', 'tư vấn', 'định hướng', 'chọn ngành']):
            return """
🎯 **Hướng dẫn chọn nghề nghiệp:**

**Bước 1: Tự đánh giá**
• Sở thích và đam mê của bạn?
• Điểm mạnh và kỹ năng hiện tại?
• Tính cách và phong cách làm việc?
• Mục tiêu tài chính và cuộc sống?

**Bước 2: Khám phá ngành nghề**
• **Hot trends 2024:** AI/ML, Cybersecurity, Digital Marketing, Data Science
• **Ổn định:** Kế toán, Nhân sự, Giáo dục, Y tế
• **Sáng tạo:** Design, Content, Media, Entertainment

**Bước 3: Lập kế hoạch**
• Xác định gap kỹ năng
• Tìm khóa học/chứng chỉ
• Xây dựng portfolio
• Networking và thực tập

**Câu hỏi để suy nghĩ:** Bạn muốn làm gì trong 5 năm tới?
            """
        
        # IT/Tech related
        elif any(word in message_lower for word in ['cntt', 'it', 'lập trình', 'developer', 'python', 'java', 'web', 'mobile']):
            return """
💻 **Lộ trình IT toàn diện:**

**Web Development:**
• **Frontend:** HTML/CSS/JS → React/Vue → TypeScript
• **Backend:** Node.js/Python/Java → Database → API
• **Lương:** 8-15 triệu (junior), 20-40 triệu (senior)

**Mobile Development:**
• **Native:** Swift (iOS), Kotlin (Android)
• **Cross-platform:** React Native, Flutter
• **Lương:** 10-18 triệu (junior), 25-45 triệu (senior)

**DevOps/Cloud:**
• **Skills:** Docker, Kubernetes, AWS/Azure
• **Lương:** 15-25 triệu (junior), 30-60 triệu (senior)

**Lộ trình 6 tháng:**
1. Chọn 1 hướng chuyên sâu
2. Học cơ bản 2-3 tháng
3. Làm dự án thực tế 2-3 tháng
4. Tìm internship/junior position
            """
        
        # General greeting
        elif any(word in message_lower for word in ['xin chào', 'hello', 'hi', 'chào', 'bạn là ai']):
            return """
👋 **Chào bạn! Tôi là AI Career Advisor**

**Tôi có thể hỗ trợ bạn:**
• 🎯 Tư vấn chọn nghề nghiệp phù hợp
• 📈 Lộ trình phát triển kỹ năng chi tiết
• 💼 Phân tích thị trường việc làm
• 🎓 Định hướng học tập và chứng chỉ
• 💰 Thông tin mức lương theo ngành

**Các chủ đề hot:**
• IT/Programming (Web, Mobile, AI/ML)
• Marketing Digital & Social Media
• Data Science & Analytics  
• Design (UI/UX, Graphic)
• Business & Finance

**Hãy hỏi tôi:** "Lộ trình trở thành [tên nghề]?" hoặc "Tôi nên học ngành gì?"
            """
        
        # Salary/Income related
        elif any(word in message_lower for word in ['lương', 'salary', 'thu nhập', 'income', 'tiền']):
            return """
💰 **Thông tin mức lương theo ngành (2024):**

**IT/Technology:**
• Developer: 8-15M (junior) → 20-40M (senior)
• Data Scientist: 12-20M → 25-50M
• DevOps: 15-25M → 30-60M
• Product Manager: 18-30M → 40-80M

**Marketing/Sales:**
• Digital Marketing: 8-15M → 15-30M
• Sales: 8-12M + commission → 20-40M
• Content Creator: 6-10M → 15-25M

**Finance/Business:**
• Kế toán: 7-12M → 15-25M
• Business Analyst: 12-20M → 25-45M
• Investment Banking: 15-25M → 40-100M

**Design:**
• Graphic Designer: 6-12M → 15-25M
• UI/UX Designer: 8-15M → 18-35M

*Lưu ý: Mức lương phụ thuộc kinh nghiệm, công ty, và kỹ năng*
            """
        
        # Skills development
        elif any(word in message_lower for word in ['kỹ năng', 'skill', 'học', 'course', 'chứng chỉ']):
            return """
📚 **Phát triển kỹ năng hiệu quả:**

**Kỹ năng mềm (Soft Skills):**
• Giao tiếp và thuyết trình
• Làm việc nhóm và leadership
• Tư duy phản biện và giải quyết vấn đề
• Quản lý thời gian và stress
• Tiếng Anh giao tiếp

**Kỹ năng cứng (Hard Skills):**
• **Tech:** Programming, data analysis, digital tools
• **Business:** Excel, PowerPoint, project management
• **Creative:** Design software, content creation

**Nền tảng học online:**
• **Miễn phí:** Coursera, edX, YouTube, FreeCodeCamp
• **Trả phí:** Udemy, Pluralsight, LinkedIn Learning
• **Việt Nam:** Unica, Edumall, 200Lab

**Lời khuyên:** Học 1-2 kỹ năng cùng lúc, thực hành ngay, xây dựng portfolio
            """
        
        # Default fallback
        else:
            return f"""
🤖 **Tôi hiểu bạn đang quan tâm về: "{message[:50]}..."**

**Một số chủ đề tôi có thể hỗ trợ:**

🎯 **Định hướng nghề nghiệp:**
• "Tôi nên chọn ngành gì?"
• "Lộ trình trở thành [tên nghề]?"

💻 **Công nghệ thông tin:**
• "Học lập trình web như thế nào?"
• "Data Science có phù hợp với tôi?"

📈 **Marketing & Business:**
• "Cách bắt đầu với Digital Marketing?"
• "Kỹ năng cần thiết cho Business Analyst?"

💰 **Thông tin lương & thị trường:**
• "Mức lương ngành [tên ngành]?"
• "Ngành nào đang hot hiện tại?"

**Hãy đặt câu hỏi cụ thể hơn để tôi có thể hỗ trợ bạn tốt nhất!**
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