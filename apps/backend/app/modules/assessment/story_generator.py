"""
Story Generator Service using Gemini AI
Generates interactive story scenarios for assessment questions
"""
import os
import logging
import json
from typing import List, Dict, Any
import google.generativeai as genai

logger = logging.getLogger(__name__)

class StoryGeneratorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-pro")
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize Gemini model with fallback - same as chatbot"""
        models_to_try = [
            "models/gemma-3-4b-it",  # Free model, works well
            "models/gemma-3-1b-it",
            "models/gemini-2.0-flash-lite",
            "models/gemini-flash-lite-latest",
            "models/gemini-2.5-flash-lite",
            "models/gemini-flash-latest",
            "gemini-1.5-flash",
            "gemini-pro"
        ]
        
        for model_name in models_to_try:
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
                
                logger.info(f"Successfully initialized Gemini model: {model_name}")
                self.model = model
                return
            except Exception as e:
                logger.warning(f"Failed to initialize model {model_name}: {e}")
                continue
        
        raise ValueError("No working Gemini model found")
    
    def generate_group_story(self, questions: List[Dict[str, Any]], group_index: int) -> Dict[str, Any]:
        """
        Generate a connected story for a group of 5 questions
        
        Args:
            questions: List of question dicts with id, question_text, dimension
            group_index: Index of the question group
            
        Returns:
            Dict with groupScenario and questionScenarios
        """
        try:
            prompt = self._build_group_prompt(questions, group_index)
            response = self.model.generate_content(prompt)
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json\n', '').replace('```', '')
            elif response_text.startswith('```'):
                response_text = response_text.replace('```\n', '').replace('```', '')
            
            result = json.loads(response_text)
            
            return {
                'groupScenario': {
                    'emoji': result.get('groupScenario', {}).get('emoji', '📖'),
                    'title': result.get('groupScenario', {}).get('title', 'Tình Huống'),
                    'introduction': result.get('groupScenario', {}).get('introduction', 'Hãy trải nghiệm các tình huống sau...')
                },
                'questionScenarios': [
                    {
                        'emoji': q.get('emoji', '💭'),
                        'title': q.get('title', f'Câu hỏi {idx + 1}'),
                        'context': q.get('context', 'Trong tình huống này...'),
                        'situation': q.get('situation', questions[idx].get('question_text', ''))
                    }
                    for idx, q in enumerate(result.get('questions', []))
                ]
            }
            
        except Exception as e:
            logger.error(f"Error generating group story: {e}")
            return self._get_fallback_group_story(questions, group_index)
    
    def _build_group_prompt(self, questions: List[Dict[str, Any]], group_index: int) -> str:
        """Build prompt for Gemini AI"""
        questions_list = '\n'.join([
            f"{idx + 1}. \"{q.get('question_text', '')}\" ({q.get('dimension', 'general')})"
            for idx, q in enumerate(questions)
        ])
        
        return f"""
Bạn là một chuyên gia tạo câu chuyện tương tác cho bài đánh giá nghề nghiệp.

NHIỆM VỤ: Tạo một câu chuyện liên kết cho nhóm 5 câu hỏi sau, biến chúng thành một tình huống thực tế, sinh động.

NHÓM CÂU HỎI {group_index + 1}:
{questions_list}

YÊU CẦU:
1. Tạo một bối cảnh chung (scenario) cho cả nhóm 5 câu hỏi
2. Mỗi câu hỏi là một phần của câu chuyện đó
3. Câu chuyện phải mạch lạc, liên kết với nhau
4. Sử dụng ngôn ngữ Việt Nam tự nhiên, thân thiện
5. Tạo cảm giác như người dùng đang trải nghiệm một tình huống thực tế

TRẢ VỀ JSON FORMAT (chỉ JSON, không có text khác):
{{
  "groupScenario": {{
    "emoji": "emoji phù hợp với nhóm (ví dụ: 🏢, 🎨, 🔬, 🤝)",
    "title": "Tiêu đề cho nhóm tình huống (3-6 từ, tiếng Việt)",
    "introduction": "Giới thiệu bối cảnh chung cho 5 câu hỏi (2-3 câu, tiếng Việt)"
  }},
  "questions": [
    {{
      "emoji": "emoji cho câu hỏi 1",
      "title": "Tiêu đề ngắn (3-5 từ)",
      "context": "Kịch bản/bối cảnh chi tiết của tình huống (2-3 câu, mô tả sinh động)",
      "situation": "Câu hỏi ngắn gọn dựa trên câu hỏi gốc (1 câu)"
    }}
  ]
}}

VÍ DỤ:
Nhóm câu hỏi về công việc văn phòng:
{{
  "groupScenario": {{
    "emoji": "🏢",
    "title": "Một Ngày Tại Công Ty",
    "introduction": "Bạn là một nhân viên mới tại một công ty công nghệ. Hôm nay là ngày đầu tiên và bạn sẽ trải qua nhiều tình huống khác nhau."
  }},
  "questions": [
    {{
      "emoji": "💻",
      "title": "Sắp Xếp Công Việc",
      "context": "Sáng sớm, bạn nhận được một danh sách dài các nhiệm vụ cần hoàn thành trong tuần này. Có những công việc khẩn cấp, có những việc quan trọng nhưng không gấp, và cả những việc nhỏ lẻ. Bạn cần quyết định cách tổ chức công việc.",
      "situation": "Bạn thích lập kế hoạch chi tiết và sắp xếp công việc theo thứ tự ưu tiên."
    }}
  ]
}}

BẮT ĐẦU TẠO CHO NHÓM CÂU HỎI TRÊN:
"""
    
    def _get_fallback_group_story(self, questions: List[Dict[str, Any]], group_index: int) -> Dict[str, Any]:
        """Fallback scenarios when AI fails"""
        dimensions = [q.get('dimension', '').lower() for q in questions if q.get('dimension')]
        
        group_themes = {
            'realistic': {
                'emoji': '🔧',
                'title': 'Thử Thách Kỹ Thuật',
                'introduction': 'Bạn đang làm việc trong một xưởng với nhiều công cụ và thiết bị. Hãy trải nghiệm các tình huống sau.'
            },
            'investigative': {
                'emoji': '🔬',
                'title': 'Phòng Nghiên Cứu',
                'introduction': 'Bạn là một nhà nghiên cứu trong phòng thí nghiệm. Hôm nay bạn sẽ đối mặt với nhiều thử thách khoa học.'
            },
            'artistic': {
                'emoji': '🎨',
                'title': 'Studio Sáng Tạo',
                'introduction': 'Bạn bước vào một studio nghệ thuật đầy cảm hứng. Hãy khám phá khả năng sáng tạo của bạn.'
            },
            'social': {
                'emoji': '🤝',
                'title': 'Trung Tâm Cộng Đồng',
                'introduction': 'Bạn đang làm việc tại trung tâm cộng đồng. Nhiều người cần sự giúp đỡ và hỗ trợ từ bạn.'
            },
            'enterprising': {
                'emoji': '💼',
                'title': 'Văn Phòng Kinh Doanh',
                'introduction': 'Bạn là một nhân viên trong công ty. Hôm nay có nhiều quyết định quan trọng cần được đưa ra.'
            },
            'conventional': {
                'emoji': '📊',
                'title': 'Phòng Phân Tích Dữ Liệu',
                'introduction': 'Bạn làm việc với số liệu và biểu đồ. Hãy sử dụng kỹ năng tổ chức và phân tích của bạn.'
            }
        }
        
        # Find matching theme
        group_scenario = group_themes['conventional']  # default
        for dim in dimensions:
            if dim in group_themes:
                group_scenario = group_themes[dim]
                break
        
        # Generate scenarios for each question
        question_scenarios = []
        for idx, q in enumerate(questions):
            question_scenarios.append({
                'emoji': '💭',
                'title': f'Tình Huống {idx + 1}',
                'context': 'Hãy suy nghĩ về tình huống này...',
                'situation': q.get('question_text', '')
            })
        
        return {
            'groupScenario': group_scenario,
            'questionScenarios': question_scenarios
        }
