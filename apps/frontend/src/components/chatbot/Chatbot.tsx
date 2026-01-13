import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, History, RotateCcw, Mic, MicOff, FileText, Crown, Volume2, VolumeX } from 'lucide-react';
import { ChatHistorySimple } from './ChatHistorySimple';
import { PremiumFeaturePrompt } from './PremiumFeaturePrompt';
import { useSubscription } from '../../hooks/useSubscription';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
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
  const { planName } = useSubscription();
  const { hasFeature } = useFeatureAccess();

  // Helper function để format time an toàn
  const formatMessageTime = (timestamp: Date | string | null | undefined): string => {
    try {
      if (!timestamp) return 'Just now';

      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      if (isNaN(date.getTime())) return 'Just now';

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Just now';
    }
  };

  // Initialize messages with a default welcome message
  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize welcome message based on user plan
  useEffect(() => {
    const welcomeText = hasFeature('career_counseling')
      ? 'Hello! I am AI Career Assistant - your 24/7 career counseling virtual assistant powered by Gemini API. I can help you with:\n\n- Career guidance and direction\n- Skills and interests analysis\n- Development roadmap advice\n- Industry trends information\n- Salary and opportunity insights\n- Course recommendations from Coursera, LinkedIn Learning\n\nWhat career direction are you interested in?'
      : 'Hello! I am AI Career Assistant - your smart career counseling assistant. I can help you with:\n\n- Career guidance and direction\n- Assessment results analysis\n- Development roadmap suggestions\n- Basic industry information\n\nUpgrade to Pro Plan to experience:\n- 24/7 AI Assistant with Gemini API\n- Voice interaction\n- Multi-language text-to-speech\n- Create blog from conversations\n\nHow can I help you today?';

    setMessages([{
      id: '1',
      text: welcomeText,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }]);
  }, []); // Empty dependency array - only run once on mount
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingMessageId, setCurrentSpeakingMessageId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('vi-VN');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition for Pro users only
  useEffect(() => {
    const hasCareerCounseling = hasFeature('career_counseling');

    if (hasCareerCounseling && 'webkitSpeechRecognition' in window) {
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
    } else {
      setSpeechRecognition(null);
    }
  }, []); // Empty dependency array - only run once on mount

  // Voice input function - chỉ cho gói Pro
  const startVoiceInput = () => {
    if (!hasFeature('career_counseling')) {
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

  // Language detection function
  const detectLanguage = (text: string): string => {
    // Remove special characters and numbers for better detection
    const cleanText = text.replace(/[^\p{L}\s]/gu, '').toLowerCase();

    // Vietnamese patterns
    const vietnamesePatterns = [
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/,
      /\b(và|của|trong|với|để|từ|về|cho|khi|như|có|được|sẽ|đã|đang|các|những|này|đó|tôi|bạn|chúng|họ)\b/,
      /\b(nghề nghiệp|kỹ năng|phát triển|học tập|công việc|lương|kinh nghiệm|tương lai)\b/
    ];

    // English patterns
    const englishPatterns = [
      /\b(the|and|of|in|to|for|with|on|at|by|from|about|into|through|during|before|after|above|below|between|among|under|over)\b/,
      /\b(career|skills|development|learning|job|salary|experience|future|professional|industry)\b/,
      /\b(you|your|we|our|they|their|this|that|these|those|what|where|when|why|how)\b/
    ];

    // Count matches
    let vietnameseScore = 0;
    let englishScore = 0;

    vietnamesePatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) vietnameseScore += matches.length;
    });

    englishPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) englishScore += matches.length;
    });

    // Check for Vietnamese diacritics (strong indicator)
    const hasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(text);
    if (hasDiacritics) vietnameseScore += 10;

    // Determine language
    if (vietnameseScore > englishScore) {
      return 'vi-VN';
    } else if (englishScore > vietnameseScore) {
      return 'en-US';
    } else {
      // Default to Vietnamese for career counseling context
      return 'vi-VN';
    }
  };

  // Text-to-speech function với stop functionality và language detection
  const speakMessage = (text: string, messageId?: string) => {
    if (!hasFeature('career_counseling')) {
      setPremiumFeature('tts');
      setShowPremiumPrompt(true);
      return;
    }

    // Nếu đang nói cùng message, thì stop
    if (isSpeaking && currentSpeakingMessageId === messageId) {
      stopSpeaking();
      return;
    }

    // Stop any current speech
    if (isSpeaking) {
      stopSpeaking();
    }

    if ('speechSynthesis' in window) {
      // Detect language automatically
      const detectedLang = detectLanguage(text);
      setCurrentLanguage(detectedLang);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = detectedLang;
      utterance.rate = 0.9;

      // Adjust voice settings based on language
      if (detectedLang === 'en-US') {
        utterance.rate = 1.0; // Slightly faster for English
        utterance.pitch = 1.0;
      } else {
        utterance.rate = 0.9; // Slower for Vietnamese
        utterance.pitch = 1.1; // Slightly higher pitch for Vietnamese
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentSpeakingMessageId(messageId || null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
      };

      speechSynthesis.speak(utterance);
    }
  };

  // Stop TTS function
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingMessageId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeaking();
      }
    };
  }, [isSpeaking]);

  // Blog creation function - chỉ cho gói Pro
  const createBlogFromChat = async () => {
    if (!hasFeature('career_counseling')) {
      setPremiumFeature('blog');
      setShowPremiumPrompt(true);
      return;
    }

    if (!blogTitle.trim()) {
      alert('Please enter a blog title!');
      return;
    }

    setIsCreatingBlog(true);

    try {
      // Get all meaningful messages (both user and bot)
      const conversationMessages = messages
        .filter(msg => msg.id !== '1') // Skip welcome message
        .filter(msg => msg.text.trim().length > 10); // At least 10 characters

      if (conversationMessages.length < 2) {
        alert('Need at least 2 messages in the conversation to create a blog!');
        return;
      }

      // Create structured blog content
      let blogContent = `# ${blogTitle}\n\n`;
      blogContent += `*This article was created from a conversation with AI Career Assistant on ${new Date().toLocaleDateString('en-US')}*\n\n`;
      blogContent += `## Conversation Content\n\n`;

      // Add conversation in Q&A format
      let currentQuestion = '';
      conversationMessages.forEach((msg, index) => {
        if (msg.sender === 'user') {
          currentQuestion = msg.text;
          blogContent += `### Question ${Math.floor(index / 2) + 1}\n\n`;
          blogContent += `**${msg.text}**\n\n`;
        } else if (msg.sender === 'bot' && currentQuestion) {
          blogContent += `**Answer:**\n\n`;
          blogContent += `${msg.text}\n\n`;
          blogContent += `---\n\n`;
        }
      });

      // Add conclusion
      blogContent += `## Conclusion\n\n`;
      blogContent += `This conversation provides useful information about ${blogTitle.toLowerCase()}. `;
      blogContent += `For more details, you can continue chatting with AI Career Assistant.\n\n`;
      blogContent += `*Created by AI Career Assistant - Smart Career Counseling System*`;

      // Create blog post
      const blogData = {
        title: blogTitle,
        content_md: blogContent,
        excerpt: `Article created from a conversation about ${blogTitle.toLowerCase()} with AI Career Assistant`,
        category: 'AI Generated',
        tags: ['AI', 'Career', 'Chatbot', 'Career Counseling'],
        is_published: false // Save as draft first
      };

      await blogService.createBlog(blogData);

      alert('Blog created successfully and saved as draft!\n\nYou can go to blog management to edit and publish.');
      setShowBlogCreator(false);
      setBlogTitle('');

    } catch (error: any) {
      console.error('Error creating blog:', error);
      alert('Cannot create blog: ' + (error.response?.data?.detail || error.message));
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
          text: fallbackData.response + '\n\n*Note: This message was not saved to history due to system error*',
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
        text: 'Sorry, I encountered an issue processing your request. Please try again later or check your network connection.',
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

        // Add welcome message based on user plan
        const hasCareerCounseling = hasFeature('career_counseling');
        const welcomeMessage = hasCareerCounseling
          ? 'Hello! I am AI Career Assistant - your 24/7 career counseling virtual assistant powered by Gemini API. I can help you with:\n\n- Career guidance and direction\n- Skills and interests analysis\n- Development roadmap advice\n- Industry trends information\n- Salary and opportunity insights\n- Course recommendations from Coursera, LinkedIn Learning\n\nWhat career direction are you interested in?'
          : 'Hello! I am AI Career Assistant - your smart career counseling assistant. I can help you with:\n\n- Career guidance and direction\n- Assessment results analysis\n- Development roadmap suggestions\n- Basic industry information\n\nUpgrade to Pro Plan to experience:\n- 24/7 AI Assistant with Gemini API\n- Voice interaction\n- Multi-language text-to-speech\n- Create blog from conversations\n\nHow can I help you today?';

        loadedMessages.push({
          id: '1',
          text: welcomeMessage,
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
            title: 'New conversation'
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

      // Reset messages to initial state with welcome message based on plan
      const hasCareerCounseling = hasFeature('career_counseling');
      const welcomeMessage = hasCareerCounseling
        ? 'Hello! I am AI Career Assistant - your 24/7 career counseling virtual assistant powered by Gemini API. I can help you with:\n\n- Career guidance and direction\n- Skills and interests analysis\n- Development roadmap advice\n- Industry trends information\n- Salary and opportunity insights\n- Course recommendations from Coursera, LinkedIn Learning\n\nWhat career direction are you interested in?'
        : 'Hello! I am AI Career Assistant - your smart career counseling assistant. I can help you with:\n\n- Career guidance and direction\n- Assessment results analysis\n- Development roadmap suggestions\n- Basic industry information\n\nUpgrade to Pro Plan to experience:\n- 24/7 AI Assistant with Gemini API\n- Voice interaction\n- Multi-language text-to-speech\n- Create blog from conversations\n\nHow can I help you today?';

      setMessages([{
        id: '1',
        text: welcomeMessage,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      }]);

      setShowHistory(false);

    } catch (error) {
      console.error('Error creating new session:', error);
      // Fallback: reset local state with welcome message based on plan
      setCurrentSessionId(null);
      const hasCareerCounseling = hasFeature('career_counseling');
      const welcomeMessage = hasCareerCounseling
        ? 'Hello! I am AI Career Assistant - your 24/7 career counseling virtual assistant powered by Gemini API. I can help you with:\n\n- Career guidance and direction\n- Skills and interests analysis\n- Development roadmap advice\n- Industry trends information\n- Salary and opportunity insights\n- Course recommendations from Coursera, LinkedIn Learning\n\nWhat career direction are you interested in?'
        : 'Hello! I am AI Career Assistant - your smart career counseling assistant. I can help you with:\n\n- Career guidance and direction\n- Assessment results analysis\n- Development roadmap suggestions\n- Basic industry information\n\nUpgrade to Pro Plan to experience:\n- 24/7 AI Assistant with Gemini API\n- Voice interaction\n- Multi-language text-to-speech\n- Create blog from conversations\n\nHow can I help you today?';

      setMessages([{
        id: '1',
        text: welcomeMessage,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      }]);
      setShowHistory(false);
    }
  };

  const quickActions = [
    {
      label: 'Career Advice',
      action: () => sendMessage('I would like career guidance and advice on choosing a suitable career', 'career-advice')
    },
    {
      label: 'Skill Development',
      action: () => sendMessage('I want to create a skill development plan', 'skill-plan')
    },
    {
      label: 'Job Market',
      action: () => sendMessage('I want to learn about the job market', 'job-analysis')
    }
  ];

  const premiumActions = [
    {
      label: 'Create Blog from Chat',
      action: () => hasFeature('career_counseling') ? setShowBlogCreator(true) : (setPremiumFeature('blog'), setShowPremiumPrompt(true)),
      premium: true
    }
  ];

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-20 right-6 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40 transition-all duration-300 ${isMinimized ? 'w-80 h-12' : 'w-96 h-[600px]'
      }`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${hasFeature('career_counseling') ? 'from-purple-600 to-blue-600' : 'from-blue-600 to-blue-700'} text-white p-4 rounded-t-lg flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            {hasFeature('career_counseling') && (
              <div className="absolute -bottom-1 -right-1">
                <Crown size={12} className="text-yellow-300" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">AI Career Assistant</span>
              {hasFeature('career_counseling') && (
                <span className="text-xs bg-yellow-400 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                  {planName?.includes('Pro') ? 'Pro' : planName}
                </span>
              )}
            </div>
            <div className="text-xs opacity-90">
              {currentSessionId ? `Session #${currentSessionId}` : (hasFeature('career_counseling') ? 'Gemini API - 24/7 Support' : 'Smart Career Counseling')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasFeature('career_counseling') && (
            <button
              onClick={() => setShowBlogCreator(true)}
              className="text-white hover:text-gray-200 p-1 rounded"
              title="Create blog from conversation"
            >
              <FileText size={16} />
            </button>
          )}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="text-red-300 hover:text-red-100 p-1 rounded animate-pulse"
              title="Stop reading"
            >
              <VolumeX size={16} />
            </button>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className="text-white hover:text-gray-200 p-1 rounded"
            title="Chat history"
          >
            <History size={16} />
          </button>
          <button
            onClick={createNewSession}
            className="text-white hover:text-gray-200 p-1 rounded"
            title="New conversation"
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
          {/* Premium Features Bar - hiển thị khi có career_counseling */}
          {hasFeature('career_counseling') && (
            <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Premium Features</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={isRecording ? stopVoiceInput : startVoiceInput}
                    disabled={isLoading}
                    className={`p-1.5 rounded-md transition-colors flex items-center justify-center text-xs ${isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isRecording ? "Stop recording" : "Voice Input"}
                  >
                    {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                  </button>
                  <button
                    onClick={() => setShowBlogCreator(true)}
                    className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    title="Create Blog"
                  >
                    <FileText size={12} />
                  </button>
                  <button
                    onClick={() => {
                      const lastBotMessage = messages.filter(m => m.sender === 'bot').pop();
                      if (lastBotMessage) speakMessage(lastBotMessage.text, lastBotMessage.id);
                    }}
                    className={`p-1.5 rounded-md transition-colors ${isSpeaking ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    title={
                      isSpeaking
                        ? `Stop reading (${currentLanguage === 'vi-VN' ? 'Vietnamese' : 'English'})`
                        : (() => {
                          const lastBotMessage = messages.filter(m => m.sender === 'bot').pop();
                          const lang = lastBotMessage ? detectLanguage(lastBotMessage.text) : 'vi-VN';
                          return `Text-to-Speech (${lang === 'vi-VN' ? 'Vietnamese' : 'English'})`;
                        })()
                    }
                  >
                    {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                </div>
              </div>
            </div>
          )}
          {messages.length <= 1 && (
            <div className="p-3 bg-gray-50 border-b">
              <div className="text-xs text-gray-600 mb-2">Suggestions:</div>
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
              {hasFeature('career_counseling') && (
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
                  className={`max-w-[85%] p-2 rounded-lg shadow-sm ${message.sender === 'user'
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
                      {message.sender === 'bot' && hasFeature('career_counseling') && (
                        <button
                          onClick={() => speakMessage(message.text, message.id)}
                          className={`mt-1 p-1 rounded transition-colors ${isSpeaking && currentSpeakingMessageId === message.id
                            ? 'text-red-500 hover:text-red-700 animate-pulse'
                            : 'text-blue-500 hover:text-blue-700'
                            }`}
                          title={
                            isSpeaking && currentSpeakingMessageId === message.id
                              ? `Stop reading (${currentLanguage === 'vi-VN' ? 'Vietnamese' : 'English'})`
                              : `Read message (${detectLanguage(message.text) === 'vi-VN' ? 'Vietnamese' : 'English'})`
                          }
                        >
                          {isSpeaking && currentSpeakingMessageId === message.id ? (
                            <VolumeX size={12} />
                          ) : (
                            <Volume2 size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs mt-2 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
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
                    <span className="text-xs text-gray-500">Thinking...</span>
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
                placeholder={hasFeature('career_counseling') ? "Type your question or use voice..." : "Type your question..."}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              {hasFeature('career_counseling') && (
                <button
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isRecording
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? "Stop recording" : "Voice recording"}
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
              {hasFeature('career_counseling') ? (
                <span className="flex items-center justify-center gap-1">
                  <Crown size={10} className="text-purple-500" />
                  <span className="text-purple-600 font-medium">Premium Active</span>
                  <span className="text-gray-400">•</span>
                  <span>Voice • TTS</span>
                  {isSpeaking && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600 font-medium">
                        {currentLanguage === 'vi-VN' ? '🇻🇳 VI' : '🇺🇸 EN'}
                      </span>
                    </>
                  )}
                  <span className="text-gray-400">•</span>
                  <span>Blog</span>
                </span>
              ) : (
                "Press Enter to send"
              )}
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
                Create Blog from Chat
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
                Blog Title
              </label>
              <input
                type="text"
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                placeholder="Enter blog title..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-2">
                <strong>Premium Feature:</strong> Create blog from AI conversation content.
              </p>
              <div className="text-xs text-purple-600">
                <strong>Content will include:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>{messages.filter(m => m.sender === 'user' && m.id !== '1').length} of your questions</li>
                  <li>{messages.filter(m => m.sender === 'bot' && m.id !== '1').length} AI responses</li>
                  <li>Easy-to-read Q&A format</li>
                  <li>Saved as draft for editing</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBlogCreator(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createBlogFromChat}
                disabled={isCreatingBlog || !blogTitle.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingBlog ? 'Creating...' : 'Create Blog'}
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