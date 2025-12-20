import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, History, RotateCcw, Mic, MicOff, FileText, Crown, Volume2 } from 'lucide-react';
import { ChatHistorySimple } from './ChatHistorySimple';
import { PremiumFeaturePrompt } from './PremiumFeaturePrompt';
import { useSubscription } from '../../hooks/useSubscription';
import { blogService } from '../../services/blogService';

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
  const { isPremium, planName } = useSubscription();
  
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
  const [isRecording, setIsRecording] = useState(false);
  const [isCreatingBlog, setIsCreatingBlog] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [showBlogCreator, setShowBlogCreator] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState<'voice' | 'blog' | 'tts'>('voice');
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition for premium users
  useEffect(() => {
    if (isPremium && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsRecording(false);
      };
      
      recognition.onerror = () => {
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      setSpeechRecognition(recognition);
    }
  }, [isPremium]);

  // Voice input function
  const startVoiceInput = () => {
    if (!isPremium) {
      setPremiumFeature('voice');
      setShowPremiumPrompt(true);
      return;
    }
    
    if (speechRecognition && !isRecording) {
      setIsRecording(true);
      speechRecognition.start();
    }
  };

  const stopVoiceInput = () => {
    if (speechRecognition && isRecording) {
      speechRecognition.stop();
      setIsRecording(false);
    }
  };

  // Text-to-speech function for premium users
  const speakMessage = (text: string) => {
    if (!isPremium) {
      setPremiumFeature('tts');
      setShowPremiumPrompt(true);
      return;
    }
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // Blog creation function
  const createBlogFromChat = async () => {
    if (!isPremium) {
      setPremiumFeature('blog');
      setShowPremiumPrompt(true);
      return;
    }
    
    if (!blogTitle.trim()) {
      alert('Vui lòng nhập tiêu đề blog!');
      return;
    }
    
    setIsCreatingBlog(true);
    
    try {
      // Get all meaningful messages (both user and bot)
      const conversationMessages = messages
        .filter(msg => msg.id !== '1') // Skip welcome message
        .filter(msg => msg.text.trim().length > 10); // At least 10 characters
      
      if (conversationMessages.length < 2) {
        alert('Cần có ít nhất 2 tin nhắn trong cuộc trò chuyện để tạo blog!');
        return;
      }
      
      // Create structured blog content
      let blogContent = `# ${blogTitle}\n\n`;
      blogContent += `*Bài viết này được tạo từ cuộc trò chuyện với AI Career Assistant vào ${new Date().toLocaleDateString('vi-VN')}*\n\n`;
      blogContent += `## Nội dung cuộc trò chuyện\n\n`;
      
      // Add conversation in Q&A format
      let currentQuestion = '';
      conversationMessages.forEach((msg, index) => {
        if (msg.sender === 'user') {
          currentQuestion = msg.text;
          blogContent += `### Câu hỏi ${Math.floor(index/2) + 1}\n\n`;
          blogContent += `**${msg.text}**\n\n`;
        } else if (msg.sender === 'bot' && currentQuestion) {
          blogContent += `**Trả lời:**\n\n`;
          blogContent += `${msg.text}\n\n`;
          blogContent += `---\n\n`;
        }
      });
      
      // Add conclusion
      blogContent += `## Kết luận\n\n`;
      blogContent += `Cuộc trò chuyện này cung cấp những thông tin hữu ích về ${blogTitle.toLowerCase()}. `;
      blogContent += `Để biết thêm chi tiết, bạn có thể tiếp tục trao đổi với AI Career Assistant.\n\n`;
      blogContent += `*Được tạo bởi AI Career Assistant - Hệ thống tư vấn nghề nghiệp thông minh*`;
      
      // Create blog post
      const blogData = {
        title: blogTitle,
        content_md: blogContent,
        excerpt: `Bài viết được tạo từ cuộc trò chuyện về ${blogTitle.toLowerCase()} với AI Career Assistant`,
        category: 'AI Generated',
        tags: ['AI', 'Career', 'Chatbot', 'Tư vấn nghề nghiệp'],
        is_published: false // Save as draft first
      };
      
      await blogService.createBlog(blogData);
      
      alert('✅ Blog đã được tạo thành công và lưu vào bản nháp!\n\nBạn có thể vào trang quản lý blog để chỉnh sửa và xuất bản.');
      setShowBlogCreator(false);
      setBlogTitle('');
      
    } catch (error: any) {
      console.error('Error creating blog:', error);
      alert('❌ Không thể tạo blog: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsCreatingBlog(false);
    }
  };

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

  const premiumActions = [
    {
      label: '🎤 Tạo blog từ chat',
      action: () => isPremium ? setShowBlogCreator(true) : (setPremiumFeature('blog'), setShowPremiumPrompt(true)),
      premium: true
    }
  ];

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-20 right-6 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40 transition-all duration-300 ${
      isMinimized ? 'w-80 h-12' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${isPremium ? 'from-purple-600 to-blue-600' : 'from-blue-600 to-blue-700'} text-white p-4 rounded-t-lg flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            {isPremium && (
              <div className="absolute -bottom-1 -right-1">
                <Crown size={12} className="text-yellow-300" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">AI Career Assistant</span>
              {isPremium && (
                <span className="text-xs bg-yellow-400 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                  {planName}
                </span>
              )}
            </div>
            <div className="text-xs opacity-90">
              {currentSessionId ? `Session #${currentSessionId}` : 'Tư vấn nghề nghiệp thông minh'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isPremium && (
            <button
              onClick={() => setShowBlogCreator(true)}
              className="text-white hover:text-gray-200 p-1 rounded"
              title="Tạo blog từ cuộc trò chuyện"
            >
              <FileText size={16} />
            </button>
          )}
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
            <div className="p-3 bg-gray-50 border-b">
              <div className="text-xs text-gray-600 mb-2">Gợi ý:</div>
              <div className="flex flex-wrap gap-1 mb-2">
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
              {isPremium && (
                <div>
                  <div className="text-xs text-purple-600 mb-1 font-medium">Premium:</div>
                  <div className="flex flex-wrap gap-1">
                    {premiumActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        disabled={isLoading}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-200 disabled:opacity-50 transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                    <div className="flex-1">
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.text}
                      </div>
                      {message.sender === 'bot' && isPremium && (
                        <button
                          onClick={() => speakMessage(message.text)}
                          className="mt-1 text-blue-500 hover:text-blue-700 p-1 rounded"
                          title="Đọc tin nhắn"
                        >
                          <Volume2 size={12} />
                        </button>
                      )}
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
                placeholder={isPremium ? "Nhập câu hỏi hoặc dùng giọng nói..." : "Nhập câu hỏi..."}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              {isPremium && (
                <button
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                    isRecording 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? "Dừng ghi âm" : "Ghi âm giọng nói"}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {isPremium ? "Enter để gửi • Mic để nói • Premium features enabled" : "Enter để gửi"}
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

      {/* Blog Creator Modal */}
      {showBlogCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="text-purple-600" size={20} />
                Tạo Blog từ Chat
              </h3>
              <button
                onClick={() => setShowBlogCreator(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề blog
              </label>
              <input
                type="text"
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                placeholder="Nhập tiêu đề cho blog..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-2">
                <strong>Tính năng Premium:</strong> Tạo blog từ nội dung cuộc trò chuyện với AI.
              </p>
              <div className="text-xs text-purple-600">
                <strong>Nội dung sẽ bao gồm:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>{messages.filter(m => m.sender === 'user' && m.id !== '1').length} câu hỏi của bạn</li>
                  <li>{messages.filter(m => m.sender === 'bot' && m.id !== '1').length} câu trả lời từ AI</li>
                  <li>Định dạng Q&A dễ đọc</li>
                  <li>Lưu vào bản nháp để chỉnh sửa</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlogCreator(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={createBlogFromChat}
                disabled={isCreatingBlog || !blogTitle.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingBlog ? 'Đang tạo...' : 'Tạo Blog'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Feature Prompt */}
      <PremiumFeaturePrompt
        isOpen={showPremiumPrompt}
        onClose={() => setShowPremiumPrompt(false)}
        feature={premiumFeature}
      />
    </div>
  );
};