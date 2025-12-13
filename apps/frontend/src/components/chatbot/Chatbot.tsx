import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, History, RotateCcw } from 'lucide-react';
import { ChatHistorySimple } from './ChatHistorySimple';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'career-advice' | 'skill-plan' | 'job-analysis';
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  // Helper function để format time an toàn
  const formatMessageTime = (timestamp: Date | string | null | undefined): string => {
    try {
      if (!timestamp) return 'Vừa xong';
      
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      
      if (isNaN(date.getTime())) return 'Vừa xong';
      
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Vừa xong';
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là chatbot tư vấn nghề nghiệp AI. Tôi có thể giúp bạn:\n\n• Tư vấn lựa chọn nghề nghiệp\n• Lập kế hoạch phát triển kỹ năng\n• Phân tích thị trường việc làm\n• Đưa ra lời khuyên về sự nghiệp\n\nBạn muốn tôi hỗ trợ điều gì?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string, messageType: string = 'text') => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
      type: messageType as any
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');

      // Sử dụng endpoint chính thức với authentication và database
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: textToSend,
          session_id: currentSessionId
        })
      });

      if (!response.ok) {
        // Nếu lỗi auth hoặc server, fallback về test endpoint
        console.warn('Main endpoint failed, using fallback');
        const fallbackResponse = await fetch('/api/chatbot/test-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            message: textToSend
          })
        });
        
        if (!fallbackResponse.ok) {
          throw new Error('Both endpoints failed');
        }
        
        const fallbackData = await fallbackResponse.json();
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: fallbackData.response + '\n\n⚠️ *Lưu ý: Tin nhắn này không được lưu vào lịch sử do lỗi hệ thống*',
          sender: 'bot',
          timestamp: new Date(),
          type: messageType as any
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      const data = await response.json();

      // Cập nhật session_id nếu có
      if (data.session_id && !currentSessionId) {
        setCurrentSessionId(data.session_id);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        type: messageType as any
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/chatbot/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = [];
        
        // Add welcome message
        loadedMessages.push({
          id: '1',
          text: 'Xin chào! Tôi là chatbot tư vấn nghề nghiệp AI. Tôi có thể giúp bạn:\n\n• Tư vấn lựa chọn nghề nghiệp\n• Lập kế hoạch phát triển kỹ năng\n• Phân tích thị trường việc làm\n• Đưa ra lời khuyên về sự nghiệp\n\nBạn muốn tôi hỗ trợ điều gì?',
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        });

        // Add loaded messages với safe date parsing
        data.messages.forEach((msg: any, index: number) => {
          // Safe date parsing
          const safeDate = (dateStr: any) => {
            try {
              if (!dateStr) return new Date();
              const parsed = new Date(dateStr);
              return isNaN(parsed.getTime()) ? new Date() : parsed;
            } catch {
              return new Date();
            }
          };

          // Backend trả về format khác - sử dụng msg.text thay vì msg.message
          const messageText = msg.text || msg.message;
          const messageType = msg.type || msg.message_type || 'text';
          const timestamp = msg.timestamp || msg.created_at;

          // Chỉ thêm message nếu có nội dung và là user message
          if (messageText && messageText.trim() && msg.sender === 'user') {
            loadedMessages.push({
              id: msg.id || `user-${index}`,
              text: messageText,
              sender: 'user',
              timestamp: safeDate(timestamp),
              type: messageType
            });
          }
          
          // Chỉ thêm message nếu có nội dung và là bot message
          if (messageText && messageText.trim() && msg.sender === 'bot') {
            loadedMessages.push({
              id: msg.id || `bot-${index}`,
              text: messageText,
              sender: 'bot',
              timestamp: safeDate(timestamp),
              type: messageType
            });
          }
        });

        setMessages(loadedMessages);
        setCurrentSessionId(sessionId);
        setShowHistory(false);
      } else {
        console.error('Failed to load session messages');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        // Gọi API để tạo session mới
        const response = await fetch('/api/chatbot/sessions/new', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Cuộc trò chuyện mới'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('New session created:', data.session_id);
          setCurrentSessionId(data.session_id);
        } else {
          console.warn('Failed to create new session, will create on first message');
          setCurrentSessionId(null);
        }
      } else {
        // Nếu không có token, chỉ reset local state
        setCurrentSessionId(null);
      }
      
      // Reset messages về trạng thái ban đầu
      setMessages([{
        id: '1',
        text: 'Xin chào! Tôi là chatbot tư vấn nghề nghiệp AI. Tôi có thể giúp bạn:\n\n• Tư vấn lựa chọn nghề nghiệp\n• Lập kế hoạch phát triển kỹ năng\n• Phân tích thị trường việc làm\n• Đưa ra lời khuyên về sự nghiệp\n\nBạn muốn tôi hỗ trợ điều gì?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      }]);
      
      setShowHistory(false);
      
    } catch (error) {
      console.error('Error creating new session:', error);
      // Fallback: chỉ reset local state
      setCurrentSessionId(null);
      setMessages([{
        id: '1',
        text: 'Xin chào! Tôi là chatbot tư vấn nghề nghiệp AI. Tôi có thể giúp bạn:\n\n• Tư vấn lựa chọn nghề nghiệp\n• Lập kế hoạch phát triển kỹ năng\n• Phân tích thị trường việc làm\n• Đưa ra lời khuyên về sự nghiệp\n\nBạn muốn tôi hỗ trợ điều gì?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      }]);
      setShowHistory(false);
    }
  };

  const quickActions = [
    {
      label: 'Tư vấn nghề nghiệp',
      action: () => sendMessage('Tôi muốn được tư vấn về lựa chọn nghề nghiệp phù hợp', 'career-advice')
    },
    {
      label: 'Phát triển kỹ năng',
      action: () => sendMessage('Tôi muốn lập kế hoạch phát triển kỹ năng', 'skill-plan')
    },
    {
      label: 'Thị trường việc làm',
      action: () => sendMessage('Tôi muốn tìm hiểu về thị trường việc làm', 'job-analysis')
    }
  ];

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-20 right-6 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40 transition-all duration-300 ${
      isMinimized ? 'w-72 h-12' : 'w-80 h-[480px]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <span className="font-semibold text-sm">AI Career Assistant</span>
            <div className="text-xs opacity-90">
              {currentSessionId ? `Session #${currentSessionId}` : 'Tư vấn nghề nghiệp thông minh'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(true)}
            className="text-white hover:text-gray-200 p-1 rounded"
            title="Lịch sử trò chuyện"
          >
            <History size={16} />
          </button>
          <button
            onClick={createNewSession}
            className="text-white hover:text-gray-200 p-1 rounded"
            title="Cuộc trò chuyện mới"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-gray-200 p-1 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions - chỉ hiện khi chưa có tin nhắn nào */}
          {messages.length <= 1 && (
            <div className="p-2 bg-gray-50 border-b">
              <div className="text-xs text-gray-600 mb-1">Gợi ý:</div>
              <div className="flex flex-wrap gap-1">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    disabled={isLoading}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 disabled:opacity-50 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-2 rounded-lg shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === 'bot' && (
                      <Bot size={16} className="mt-1 flex-shrink-0 text-blue-600" />
                    )}
                    {message.sender === 'user' && (
                      <User size={16} className="mt-1 flex-shrink-0 text-white" />
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.text}
                    </div>
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow-sm border rounded-bl-sm">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              Enter để gửi
            </div>
          </div>
        </>
      )}

      {/* Chat History Modal */}
      {showHistory && (
        <ChatHistorySimple
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          onSelectSession={loadSessionMessages}
          onNewSession={createNewSession}
          currentSessionId={currentSessionId}
        />
      )}
    </div>
  );
};