# Hướng dẫn tích hợp Google Gemini API Chatbot

## Tổng quan
Tài liệu này hướng dẫn tích hợp chatbot sử dụng Google Gemini API vào hệ thống AI-Based Career Recommendation System.

## 1. Cấu hình API Key

### Thêm Gemini API Key vào .env
```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=1000
GEMINI_TEMPERATURE=0.7
```

### Lấy API Key từ Google AI Studio
1. Truy cập [Google AI Studio](https://aistudio.google.com/)
2. Đăng nhập với tài khoản Google
3. Tạo API Key mới
4. Copy API Key và thêm vào file .env

## 2. Cài đặt Dependencies

### Backend (Python)
```bash
pip install google-generativeai
```

### Frontend (React/TypeScript)
```bash
npm install @google/generative-ai
```

## 3. Backend Implementation

### Tạo Gemini Service
Tạo file `apps/backend/app/modules/chatbot/gemini_service.py`:

```python
import google.generativeai as genai
from typing import List, Dict, Optional
import os
from datetime import datetime

class GeminiChatbotService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "1000"))
        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
    def generate_response(self, message: str, context: Optional[str] = None) -> str:
        """Generate response from Gemini API"""
        try:
            # Tạo prompt với context về career counseling
            system_prompt = """
            Bạn là một chatbot tư vấn nghề nghiệp thông minh. Nhiệm vụ của bạn là:
            1. Tư vấn về lựa chọn nghề nghiệp
            2. Đưa ra lời khuyên về phát triển kỹ năng
            3. Hướng dẫn về con đường sự nghiệp
            4. Trả lời các câu hỏi về thị trường lao động
            
            Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích.
            """
            
            full_prompt = f"{system_prompt}\n\nNgười dùng hỏi: {message}"
            if context:
                full_prompt += f"\n\nThông tin bổ sung: {context}"
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=self.max_tokens,
                    temperature=self.temperature,
                )
            )
            
            return response.text
            
        except Exception as e:
            return f"Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn: {str(e)}"
    
    def get_career_advice(self, user_profile: Dict) -> str:
        """Generate personalized career advice based on user profile"""
        skills = user_profile.get('skills', [])
        interests = user_profile.get('interests', [])
        experience = user_profile.get('experience', '')
        
        prompt = f"""
        Dựa trên thông tin sau của người dùng, hãy đưa ra lời khuyên nghề nghiệp cụ thể:
        
        Kỹ năng: {', '.join(skills)}
        Sở thích: {', '.join(interests)}
        Kinh nghiệm: {experience}
        
        Hãy đề xuất:
        1. Các nghề nghiệp phù hợp
        2. Kỹ năng cần phát triển thêm
        3. Lộ trình học tập/phát triển
        """
        
        return self.generate_response(prompt)
```

### Tạo API Routes
Tạo file `apps/backend/app/modules/chatbot/routes.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from .gemini_service import GeminiChatbotService
from ..auth.dependencies import get_current_user

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class CareerAdviceRequest(BaseModel):
    skills: List[str]
    interests: List[str]
    experience: str

class ChatResponse(BaseModel):
    response: str
    timestamp: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_bot(
    chat_message: ChatMessage,
    current_user = Depends(get_current_user)
):
    """Chat với Gemini chatbot"""
    try:
        gemini_service = GeminiChatbotService()
        response = gemini_service.generate_response(
            chat_message.message, 
            chat_message.context
        )
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/career-advice", response_model=ChatResponse)
async def get_career_advice(
    request: CareerAdviceRequest,
    current_user = Depends(get_current_user)
):
    """Lấy lời khuyên nghề nghiệp cá nhân hóa"""
    try:
        gemini_service = GeminiChatbotService()
        user_profile = {
            'skills': request.skills,
            'interests': request.interests,
            'experience': request.experience
        }
        
        advice = gemini_service.get_career_advice(user_profile)
        
        return ChatResponse(
            response=advice,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 4. Frontend Implementation

### Tạo Chatbot Component
Tạo file `apps/frontend/src/components/chatbot/Chatbot.tsx`:

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là chatbot tư vấn nghề nghiệp. Tôi có thể giúp bạn điều gì?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: inputMessage
        })
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, tôi gặp sự cố. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-semibold">Tư vấn nghề nghiệp AI</span>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.sender === 'bot' && <Bot size={16} className="mt-1 flex-shrink-0" />}
                {message.sender === 'user' && <User size={16} className="mt-1 flex-shrink-0" />}
                <div className="text-sm whitespace-pre-wrap">{message.text}</div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Bot size={16} />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Tạo Chatbot Button
Tạo file `apps/frontend/src/components/chatbot/ChatbotButton.tsx`:

```tsx
import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Chatbot } from './Chatbot';

export const ChatbotButton: React.FC = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
      >
        <MessageCircle size={24} />
      </button>

      <Chatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />
    </>
  );
};
```

## 5. Tích hợp vào ứng dụng

### Thêm routes vào backend
Trong file `apps/backend/app/main.py`:

```python
from app.modules.chatbot.routes import router as chatbot_router

app.include_router(chatbot_router)
```

### Thêm component vào frontend
Trong file `apps/frontend/src/App.tsx`:

```tsx
import { ChatbotButton } from './components/chatbot/ChatbotButton';

function App() {
  return (
    <div className="App">
      {/* Existing components */}
      
      {/* Chatbot */}
      <ChatbotButton />
    </div>
  );
}
```

## 6. Cập nhật .env

Thêm các biến môi trường sau vào file `.env`:

```env
# Google Gemini API
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=1000
GEMINI_TEMPERATURE=0.7
```

## 7. Testing

### Test Backend API
```bash
curl -X POST "http://localhost:8000/api/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{"message": "Tôi muốn tư vấn về nghề lập trình"}'
```

### Test Frontend
1. Khởi động frontend: `npm run dev`
2. Click vào nút chatbot ở góc phải màn hình
3. Gửi tin nhắn test

## 8. Tính năng nâng cao

### Lưu lịch sử chat
- Tạo bảng `chat_history` trong database
- Lưu trữ cuộc hội thoại của từng user
- Implement pagination cho tin nhắn cũ

### Tích hợp với hệ thống recommendation
- Sử dụng thông tin user profile để cá nhân hóa câu trả lời
- Kết nối với AI models hiện có
- Đề xuất courses/jobs dựa trên cuộc hội thoại

### Multilingual support
- Detect ngôn ngữ của user
- Trả lời bằng ngôn ngữ tương ứng
- Support cả tiếng Việt và tiếng Anh

## 9. Security & Best Practices

### Rate Limiting
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_with_bot(request: Request, ...):
    # Implementation
```

### Input Validation
- Validate độ dài tin nhắn
- Filter nội dung không phù hợp
- Sanitize user input

### Error Handling
- Graceful fallback khi API fails
- Logging errors cho debugging
- User-friendly error messages

## 10. Deployment

### Environment Variables
Đảm bảo set đúng GEMINI_API_KEY trong production environment.

### Monitoring
- Track API usage và costs
- Monitor response times
- Log user interactions (tuân thủ privacy)

---

Tài liệu này cung cấp framework hoàn chỉnh để tích hợp Google Gemini chatbot vào hệ thống Career Recommendation của bạn. Hãy bắt đầu với implementation cơ bản và dần dần thêm các tính năng nâng cao.