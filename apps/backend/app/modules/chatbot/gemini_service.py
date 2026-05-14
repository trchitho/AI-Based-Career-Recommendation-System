import logging
import os
from typing import Dict, List, Optional

import google.generativeai as genai
from app.core.gemini_manager import multi_stream_manager

logger = logging.getLogger(__name__)

class GeminiChatbotService:
    def __init__(self):
        # Use the dedicated chatbot stream from multi-stream manager
        self.stream_manager = multi_stream_manager.get_chatbot_stream()
        
        if not self.stream_manager.is_available():
            logger.warning("[WARN] Chatbot Gemini stream not available")
            self.model = None
        else:
            self.model = self.stream_manager.model
            logger.info(f"[OK] Gemini chatbot initialized with model: {self.stream_manager.model_name}")
        
        # Keep these for compatibility
        self.api_key = self.stream_manager.api_key
        self.model_name = self.stream_manager.model_name
        self.max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "1000")) if os.getenv("GEMINI_MAX_TOKENS", "1000") != "-1" else -1
        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
    
    def _initialize_model(self):
        """Initialize model with smart error handling"""
        # First, try to create the model without testing (faster)
        try:
            model = genai.GenerativeModel(self.model_name)
            logger.info(f"Model created: {self.model_name}")
            
            # Quick test to check if API key is valid
            test_response = model.generate_content(
                "Test",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=5,
                    temperature=0.1,
                )
            )
            
            logger.info(f"Successfully initialized model: {self.model_name}")
            return model
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to initialize model {self.model_name}: {error_msg}")
            
            # Check if it's an API key issue (don't try other models)
            if any(keyword in error_msg.lower() for keyword in ['api key', 'expired', 'invalid', 'authentication']):
                logger.error("API key issue detected - not trying fallback models")
                raise ValueError(f"API key expired or invalid: {error_msg}")
            
            # Check if it's a quota issue (don't try other models)
            if any(keyword in error_msg.lower() for keyword in ['quota', '429', 'rate limit']):
                logger.error("Quota exceeded - not trying fallback models")
                raise ValueError(f"API quota exceeded: {error_msg}")
            
            # Only try fallback models for model-specific errors (404, not found, etc.)
            if any(keyword in error_msg.lower() for keyword in ['not found', '404', 'not supported']):
                logger.info("Model not found - trying fallback models")
                return self._try_fallback_models(error_msg)
            
            # For other errors, don't try fallbacks
            raise ValueError(f"Gemini API error: {error_msg}")
    
    def _try_fallback_models(self, original_error: str):
        """Try fallback models only for model-specific errors"""
        fallback_models = [
            "models/gemini-2.5-flash",          # Fast and efficient (2025)
            "models/gemini-flash-latest",       # Always latest
            "models/gemini-2.0-flash",          # Stable alternative
        ]
        
        logger.info(f"Original model {self.model_name} failed with: {original_error}")
        logger.info("Trying fallback models...")
        
        for model_name in fallback_models:
            try:
                logger.info(f"Trying fallback model: {model_name}")
                model = genai.GenerativeModel(model_name)
                
                # Quick test
                test_response = model.generate_content(
                    "Test",
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=5,
                        temperature=0.1,
                    )
                )
                
                logger.info(f"Successfully initialized fallback model: {model_name}")
                self.model_name = model_name  # Update the working model name
                return model
                
            except Exception as e:
                logger.warning(f"Fallback model {model_name} also failed: {e}")
                continue
        
        # If all fallback models fail, raise the original error
        raise ValueError(f"No working Gemini model found. Original error: {original_error}")
        
    def generate_response(self, message: str, context: Optional[str] = None) -> str:
        """Generate response from Gemini API or fallback"""
        
        # Check if stream manager is available
        if not self.stream_manager.is_available():
            logger.warning("Chatbot Gemini stream not available, using fallback response")
            return self._get_fallback_response(message)
        
        try:
            # Create prompt with career counseling context - ALWAYS respond in Vietnamese
            system_prompt = """
            Bạn là chatbot tư vấn nghề nghiệp thông minh của hệ thống AI-Based Career Recommendation System.
            Nhiệm vụ của bạn:
            1. Tư vấn định hướng nghề nghiệp và giúp người dùng chọn nghề phù hợp
            2. Gợi ý phát triển kỹ năng
            3. Hướng dẫn lộ trình nghề nghiệp và lộ trình học tập
            4. Trả lời câu hỏi về thị trường việc làm
            5. Giúp người dùng hiểu các ngành nghề và lĩnh vực khác nhau

            QUAN TRỌNG:
            - Luôn trả lời 100% bằng tiếng Việt tự nhiên, kể cả khi người dùng nhập ngôn ngữ khác.
            - Không mở đầu bằng các câu máy móc như "Tôi hiểu bạn đang hỏi về...".
            - Trả lời như một tin nhắn chat mentor: ngắn gọn, rõ ý, chia đoạn vừa phải.
            - Có thể dùng bullet khi cần, nhưng không lạm dụng markdown đậm ở mọi dòng.
            - Ưu tiên lời khuyên cụ thể, có thể hành động ngay, tránh trả lời chung chung.
            """
            
            full_prompt = f"{system_prompt}\n\nNgười dùng hỏi: {message}"
            if context:
                full_prompt += f"\n\nNgữ cảnh bổ sung: {context}"
            
            # Use the stream manager to generate content
            response_text = self.stream_manager.generate_content_with_retry(
                full_prompt,
                temperature=self.temperature,
                max_output_tokens=self.max_tokens if self.max_tokens > 0 else None
            )
            
            if response_text:
                return response_text
            else:
                logger.warning("Stream manager returned None, using fallback")
                return self._get_fallback_response(message)
            
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
        Dựa trên thông tin người dùng dưới đây, hãy đưa ra tư vấn nghề nghiệp cụ thể và chi tiết bằng tiếng Việt:
        
        Kỹ năng hiện tại: {', '.join(skills) if skills else 'Chưa cung cấp'}
        Sở thích/đam mê: {', '.join(interests) if interests else 'Chưa cung cấp'}
        Kinh nghiệm làm việc: {experience if experience else 'Chưa có kinh nghiệm'}
        Trình độ học vấn: {education if education else 'Chưa cung cấp'}
        
        Hãy phân tích và đề xuất:
        1. 3-5 nghề phù hợp nhất với hồ sơ này
        2. Kỹ năng cần phát triển cho từng nghề
        3. Lộ trình học tập/phát triển cụ thể (6 tháng, 1 năm, 2 năm)
        4. Mức lương tham khảo và triển vọng nghề nghiệp
        5. Khóa học/chứng chỉ nên học
        
        QUAN TRỌNG: Chỉ trả lời bằng tiếng Việt.
        """
        
        return self.generate_response(prompt)
    
    def get_skill_development_plan(self, current_skills: List[str], target_job: str) -> str:
        """Generate skill development plan for target job"""
        prompt = f"""
        Người dùng hiện có các kỹ năng: {', '.join(current_skills)}
        Mục tiêu nghề nghiệp: {target_job}
        
        Hãy tạo kế hoạch phát triển kỹ năng chi tiết bằng tiếng Việt:
        1. Phân tích khoảng cách kỹ năng
        2. Lộ trình học trong 6 tháng đầu
        3. Lộ trình học giai đoạn 6-12 tháng
        4. Dự án thực hành nên làm
        5. Khóa học online/offline nên học
        6. Cách đo lường tiến độ
        
        QUAN TRỌNG: Chỉ trả lời bằng tiếng Việt. Cần cụ thể và có thể hành động.
        """
        
        return self.generate_response(prompt)
    
    def analyze_job_market(self, job_title: str, location: str = "Vietnam") -> str:
        """Analyze job market for specific position"""
        prompt = f"""
        Phân tích thị trường việc làm cho vị trí: {job_title} tại {location}
        
        Hãy cung cấp thông tin về:
        1. Nhu cầu tuyển dụng hiện tại
        2. Mức lương trung bình theo cấp độ junior, mid, senior
        3. Nhóm công ty thường tuyển vị trí này
        4. Kỹ năng được ưu tiên
        5. Xu hướng phát triển của ngành
        6. Mẹo để nổi bật khi ứng tuyển
        
        QUAN TRỌNG: Chỉ trả lời bằng tiếng Việt. Dựa trên bối cảnh thị trường 2024-2025.
        """
        
        return self.generate_response(prompt)
    
    def _get_fallback_response(self, message: str) -> str:
        """Provide comprehensive fallback responses when API is unavailable"""
        message_lower = message.lower()
        
        # Marketing related
        if any(word in message_lower for word in ['marketing', 'advertising', 'digital marketing', 'social media']):
            return """
**Lộ trình Digital Marketing:**

**Kỹ năng cần có:**
1. **Sáng tạo nội dung:** Viết nội dung, thiết kế cơ bản
2. **Mạng xã hội:** Facebook Ads, Google Ads, TikTok, Instagram
3. **Phân tích dữ liệu:** Google Analytics, Facebook Insights
4. **SEO/SEM:** Tối ưu công cụ tìm kiếm và quảng cáo tìm kiếm
5. **Email Marketing:** Mailchimp, automation

**Lộ trình 6 tháng:**
- Tháng 1-2: Học nền tảng marketing và viết nội dung
- Tháng 3-4: Thực hành Facebook Ads/Google Ads
- Tháng 5-6: Làm dự án thật và xây portfolio

**Lương tham khảo:** 10-20 triệu (junior), 20-38 triệu (senior)
**Cơ hội:** Agency, in-house, freelance
            """
        
        # Data Science/Analytics
        elif any(word in message_lower for word in ['data', 'analysis', 'analyst', 'scientist', 'ai', 'machine learning']):
            return """
**Lộ trình Data Science:**

**Nền tảng cần có:**
1. **Toán/xác suất/thống kê:** Xác suất, thống kê mô tả
2. **Lập trình:** Python (pandas, numpy, scikit-learn)
3. **Cơ sở dữ liệu:** SQL, NoSQL
4. **Trực quan hóa:** Tableau, Power BI, matplotlib
5. **Machine Learning:** Học có giám sát và không giám sát

**Lộ trình 12 tháng:**
- Tháng 1-3: Python cơ bản + SQL
- Tháng 4-6: Pandas, numpy, làm sạch dữ liệu
- Tháng 7-9: Thuật toán Machine Learning
- Tháng 10-12: Deep Learning và dự án thực tế

**Lương tham khảo:** 15-25 triệu (junior), 30-60 triệu (senior)
**Cơ hội:** Fintech, thương mại điện tử, tư vấn, sản phẩm công nghệ
            """
        
        # Business/Finance
        elif any(word in message_lower for word in ['business', 'finance', 'accounting', 'financial']):
            return """
**Lộ trình Business/Finance:**

**Nhánh tài chính:**
- **Kỹ năng:** Excel nâng cao, phân tích tài chính, báo cáo
- **Chứng chỉ:** CFA, FRM, ACCA
- **Cơ hội:** Ngân hàng, chứng khoán, bảo hiểm
- **Lương tham khảo:** 12-22 triệu (junior), 25-50 triệu (senior)

**Business Analyst:**
- **Kỹ năng:** Vẽ quy trình, khai thác yêu cầu, SQL
- **Tools:** Visio, JIRA, Power BI
- **Cơ hội:** Consulting, IT, sản xuất
- **Lương tham khảo:** 15-25 triệu (junior), 30-55 triệu (senior)

**Gợi ý:** Kết hợp kỹ năng công nghệ với hiểu biết nghiệp vụ để tăng lợi thế cạnh tranh.
            """
        
        # Design/Creative
        elif any(word in message_lower for word in ['design', 'ui', 'ux', 'graphic', 'creative']):
            return """
**Lộ trình Design:**

**UI/UX Design:**
- **Công cụ:** Figma, Sketch, Adobe XD
- **Kỹ năng:** Nghiên cứu người dùng, wireframe, prototype
- **Portfolio:** 3-5 case study chi tiết
- **Lương tham khảo:** 10-18 triệu (junior), 22-43 triệu (senior)

**Graphic Design:**
- **Công cụ:** Photoshop, Illustrator, InDesign
- **Chuyên môn:** Branding, thiết kế in ấn, digital assets
- **Cơ hội:** Agency, in-house, freelance
- **Lương tham khảo:** 8-15 triệu (junior), 18-32 triệu (senior)

**Lộ trình:** Học công cụ -> xây portfolio -> thực tập -> vị trí full-time
            """
        
        # Career advice responses
        elif any(word in message_lower for word in ['career', 'advice', 'guidance', 'direction', 'choose']):
            return """
**Hướng dẫn chọn nghề:**

**Bước 1: Tự đánh giá**
- Bạn hứng thú và đam mê điều gì?
- Điểm mạnh và kỹ năng hiện tại của bạn là gì?
- Tính cách và phong cách làm việc của bạn ra sao?
- Mục tiêu tài chính và cuộc sống của bạn là gì?

**Bước 2: Khám phá ngành**
- **Xu hướng mạnh:** AI/ML, Cybersecurity, Digital Marketing, Data Science
- **Ổn định:** Kế toán, nhân sự, giáo dục, chăm sóc sức khỏe
- **Sáng tạo:** Design, content, media, giải trí

**Bước 3: Lập kế hoạch**
- Xác định kỹ năng còn thiếu
- Tìm khóa học/chứng chỉ phù hợp
- Xây portfolio
- Mở rộng networking và tìm cơ hội thực tập

**Câu hỏi nên tự trả lời:** 5 năm nữa bạn muốn mình đang làm công việc gì?
            """
        
        # IT/Tech related
        elif any(word in message_lower for word in ['it', 'programming', 'developer', 'python', 'java', 'web', 'mobile', 'software']):
            return """
**Lộ trình nghề IT:**

**Web Development:**
- **Frontend:** HTML/CSS/JS → React/Vue → TypeScript
- **Backend:** Node.js/Python/Java -> Database -> API
- **Lương tham khảo:** 10-18 triệu (junior), 25-50 triệu (senior)

**Mobile Development:**
- **Native:** Swift (iOS), Kotlin (Android)
- **Cross-platform:** React Native, Flutter
- **Lương tham khảo:** 12-22 triệu (junior), 30-55 triệu (senior)

**DevOps/Cloud:**
- **Kỹ năng:** Docker, Kubernetes, AWS/Azure
- **Lương tham khảo:** 18-32 triệu (junior), 38-75 triệu (senior)

**Lộ trình 6 tháng:**
1. Chọn một hướng chuyên môn
2. Học nền tảng trong 2-3 tháng
3. Làm dự án thật trong 2-3 tháng
4. Ứng tuyển thực tập/junior
            """
        
        # General greeting
        elif any(word in message_lower for word in ['hello', 'hi', 'hey', 'greetings', 'who are you']):
            return """
**Xin chào! Tôi là Trợ lý Nghề nghiệp AI của bạn**

**Tôi có thể hỗ trợ bạn:**
- Định hướng nghề nghiệp và chọn nghề phù hợp
- Xây lộ trình phát triển kỹ năng chi tiết
- Phân tích thị trường việc làm
- Gợi ý học tập và chứng chỉ
- Tham khảo mức lương theo ngành

**Chủ đề phổ biến:**
- IT/Lập trình (Web, Mobile, AI/ML)
- Digital Marketing & Social Media
- Data Science & Analytics  
- Design (UI/UX, Graphic)
- Business & Finance

**Bạn có thể hỏi:** "Làm sao để trở thành [tên nghề]?" hoặc "Tôi nên chọn nghề gì?"
            """
        
        # Salary/Income related
        elif any(word in message_lower for word in ['salary', 'income', 'pay', 'money', 'earn']):
            return """
**Thông tin lương tham khảo theo ngành (2024):**

**IT/Công nghệ:**
- Developer: 10-18 triệu (junior) -> 25-50 triệu (senior)
- Data Scientist: 15-25 triệu -> 30-60 triệu
- DevOps: 18-32 triệu -> 38-75 triệu
- Product Manager: 22-38 triệu -> 50-100 triệu

**Marketing/Sales:**
- Digital Marketing: 10-18 triệu -> 18-38 triệu
- Sales: 10-15 triệu + hoa hồng -> 25-50 triệu
- Content Creator: 8-12 triệu -> 18-32 triệu

**Finance/Business:**
- Kế toán: 9-15 triệu -> 18-32 triệu
- Business Analyst: 15-25 triệu -> 30-55 triệu
- Investment Banking: 18-32 triệu -> 50-125 triệu

**Design:**
- Graphic Designer: 8-15 triệu -> 18-32 triệu
- UI/UX Designer: 10-18 triệu -> 22-43 triệu

*Lưu ý: Lương phụ thuộc vào kinh nghiệm, công ty, địa điểm và kỹ năng thực tế.*
            """
        
        # Skills development
        elif any(word in message_lower for word in ['skill', 'learn', 'course', 'certificate', 'training']):
            return """
**Phát triển kỹ năng hiệu quả:**

**Soft Skills:**
- Giao tiếp và thuyết trình
- Làm việc nhóm và lãnh đạo
- Tư duy phản biện và giải quyết vấn đề
- Quản lý thời gian và áp lực
- Giao tiếp tiếng Anh

**Hard Skills:**
- **Công nghệ:** Lập trình, phân tích dữ liệu, công cụ số
- **Kinh doanh:** Excel, PowerPoint, quản lý dự án
- **Sáng tạo:** Phần mềm thiết kế, sáng tạo nội dung

**Nền tảng học online:**
- **Miễn phí:** Coursera, edX, YouTube, FreeCodeCamp
- **Trả phí:** Udemy, Pluralsight, LinkedIn Learning

**Gợi ý:** Mỗi lần chỉ tập trung 1-2 kỹ năng, thực hành ngay và lưu sản phẩm vào portfolio.
            """
        
        # Default fallback
        else:
            return f"""
Bạn muốn được định hướng nghề nghiệp. Mình có thể hỗ trợ tốt hơn nếu bạn cho thêm một vài thông tin:

- Bạn đang học hoặc đang làm lĩnh vực nào?
- Bạn thích làm việc với con người, dữ liệu, công nghệ, kinh doanh hay sáng tạo?
- Bạn muốn ưu tiên lương, sự ổn định, cơ hội thăng tiến hay đúng sở thích?

Bạn có thể nhắn theo mẫu: "Tôi đang học/làm ..., tôi thích ..., điểm mạnh của tôi là ..., tôi muốn mức lương/khu vực làm việc ...".
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
