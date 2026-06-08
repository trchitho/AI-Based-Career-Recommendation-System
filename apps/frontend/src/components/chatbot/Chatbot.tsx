import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, X, Minus, Maximize2, History, RotateCcw, Mic, MicOff, FileText, Crown, Volume2, VolumeX } from 'lucide-react';
import { ChatHistorySimple } from './ChatHistorySimple';
import { PremiumFeaturePrompt } from './PremiumFeaturePrompt';
import { useSubscription } from '../../hooks/useSubscription';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { blogService } from '../../services/blogService';
import api from '../../lib/api';

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

const getWelcomeMessage = (hasCareerCounseling: boolean) =>
  hasCareerCounseling
    ? 'Xin chào! Tôi là Trợ lý Nghề nghiệp AI - trợ lý tư vấn nghề nghiệp 24/7 được hỗ trợ bởi Gemini API. Tôi có thể giúp bạn:\n\n- Định hướng và lựa chọn nghề nghiệp\n- Phân tích kỹ năng, sở thích và điểm mạnh\n- Gợi ý lộ trình phát triển\n- Cập nhật xu hướng ngành\n- Tham khảo mức lương và cơ hội việc làm\n- Gợi ý khóa học từ Coursera, LinkedIn Learning\n\nBạn đang quan tâm đến hướng nghề nghiệp nào?'
    : 'Xin chào! Tôi là Trợ lý Nghề nghiệp AI - trợ lý tư vấn nghề nghiệp thông minh của bạn. Tôi có thể giúp bạn:\n\n- Định hướng và lựa chọn nghề nghiệp\n- Phân tích kết quả đánh giá\n- Gợi ý lộ trình phát triển\n- Cung cấp thông tin cơ bản về thị trường lao động\n\nNâng cấp gói Pro để sử dụng:\n- Trợ lý AI 24/7 với Gemini API\n- Tương tác bằng giọng nói\n- Đọc văn bản đa ngôn ngữ\n- Tạo bài blog từ cuộc trò chuyện\n\nHôm nay tôi có thể hỗ trợ gì cho bạn?';

const getSpeechRecognitionCtor = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const stripMarkdownForSpeech = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const VietnameseMarkdownMessage: React.FC<{ text: string }> = ({ text }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
      ul: ({ children }) => <ul className="my-2 space-y-1 pl-4 list-disc marker:text-blue-500">{children}</ul>,
      ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-blue-500">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      a: ({ children, href }) => (
        <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline underline-offset-2">
          {children}
        </a>
      ),
    }}
  >
    {text}
  </ReactMarkdown>
);

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const { planName } = useSubscription();
  const { hasFeature } = useFeatureAccess();
  const canUseCareerCounseling = hasFeature('career_counseling');

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

  // Initialize messages with a default welcome message
  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize welcome message based on user plan
  useEffect(() => {
    const welcomeText = getWelcomeMessage(canUseCareerCounseling);

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition for Pro users only
  useEffect(() => {
    if (!canUseCareerCounseling) {
      setSpeechRecognition(null);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionCtor();

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results || [])
          .map((result: any) => result?.[0]?.transcript || '')
          .join(' ')
          .trim();
        if (transcript) {
          setInputMessage(transcript);
        }
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error || event);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setSpeechRecognition(recognition);
      return () => {
        try {
          recognition.abort?.();
        } catch {
          /* ignore cleanup errors */
        }
      };
    } else {
      setSpeechRecognition(null);
    }
  }, [canUseCareerCounseling]);

  // Voice input function - chỉ cho gói Pro
  const startVoiceInput = () => {
    if (!canUseCareerCounseling) {
      setPremiumFeature('voice');
      setShowPremiumPrompt(true);
      return;
    }

    if (speechRecognition && !isRecording) {
      try {
        setIsRecording(true);
        speechRecognition.lang = 'vi-VN';
        speechRecognition.start();
      } catch (error) {
        console.warn('Unable to start speech recognition:', error);
        setIsRecording(false);
      }
    }
  };

  const stopVoiceInput = () => {
    if (speechRecognition && isRecording) {
      speechRecognition.stop();
      setIsRecording(false);
    }
  };

  const isVietnameseVoice = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    const name = voice.name.toLowerCase();
    return lang === 'vi-vn' || lang.startsWith('vi') || /vietnam|vietnamese|việt|viet|hoaimy|namminh/.test(name);
  };

  const getVietnameseVoice = async () => {
    if (!('speechSynthesis' in window)) return null;

    const findVoice = () => window.speechSynthesis.getVoices().find(isVietnameseVoice) || null;
    const existingVoice = findVoice();
    if (existingVoice) return existingVoice;

    return new Promise<SpeechSynthesisVoice | null>((resolve) => {
      let settled = false;
      const finish = (voice: SpeechSynthesisVoice | null) => {
        if (settled) return;
        settled = true;
        window.speechSynthesis.onvoiceschanged = null;
        resolve(voice);
      };

      window.speechSynthesis.onvoiceschanged = () => finish(findVoice());
      window.setTimeout(() => finish(findVoice()), 1200);
    });
  };

  const playBackendVietnameseTts = async (text: string, messageId?: string): Promise<boolean> => {
    const cleanText = stripMarkdownForSpeech(text);
    if (!cleanText) return false;

    const formData = new FormData();
    formData.append('question_text', cleanText);
    formData.append('voice_preference', 'female');

    try {
      const response = await api.post('/api/interview/voice/tts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const data = response.data;
      const audioUrl = data?.audio_url;
      if (!audioUrl || data?.tts_success === false) return false;

      stopSpeaking();

      const resolvedAudioUrl = /^https?:|^data:|^blob:/.test(audioUrl)
        ? audioUrl
        : new URL(
            audioUrl,
            new URL(api.defaults.baseURL || '/', window.location.origin).toString(),
          ).toString();
      const audio = new Audio(resolvedAudioUrl);
      speechAudioRef.current = audio;
      audio.onplay = () => {
        setIsSpeaking(true);
        setCurrentSpeakingMessageId(messageId || null);
      };
      audio.onended = () => {
        if (speechAudioRef.current === audio) speechAudioRef.current = null;
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
      };
      audio.onerror = () => {
        if (speechAudioRef.current === audio) speechAudioRef.current = null;
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
      };
      await audio.play();
      return true;
    } catch (error) {
      console.warn('Backend Vietnamese TTS failed:', error);
      return false;
    }
  };

  // Text-to-speech function: chatbot này luôn đọc bằng tiếng Việt
  const speakMessage = async (text: string, messageId?: string) => {
    if (!canUseCareerCounseling) {
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

    const backendPlayed = await playBackendVietnameseTts(text, messageId);
    if (backendPlayed) return;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
      const vietnameseVoice = await getVietnameseVoice();
      if (!vietnameseVoice) {
        console.warn('No Vietnamese speech synthesis voice found. English/default voice fallback is blocked.');
        window.alert('Trình duyệt chưa có giọng đọc tiếng Việt. Vui lòng cài giọng tiếng Việt cho hệ điều hành/trình duyệt hoặc dùng Edge TTS backend.');
        return;
      }

      utterance.lang = 'vi-VN';
      utterance.voice = vietnameseVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.05;

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
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.currentTime = 0;
      speechAudioRef.current = null;
    }

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
    if (!canUseCareerCounseling) {
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
        alert('Cần ít nhất 2 tin nhắn trong cuộc trò chuyện để tạo blog!');
        return;
      }

      // Create structured blog content
      let blogContent = ` ${blogTitle}\n\n`;
      blogContent += `*Bài viết này được tạo từ cuộc trò chuyện với Trợ lý Nghề nghiệp AI vào ${new Date().toLocaleDateString('vi-VN')}*\n\n`;
      blogContent += ` Nội dung cuộc trò chuyện\n\n`;

      // Add conversation in Q&A format
      let currentQuestion = '';
      conversationMessages.forEach((msg, index) => {
        if (msg.sender === 'user') {
          currentQuestion = msg.text;
          blogContent += ` Câu hỏi ${Math.floor(index / 2) + 1}\n\n`;
          blogContent += `**${msg.text}**\n\n`;
        } else if (msg.sender === 'bot' && currentQuestion) {
          blogContent += `**Trả lời:**\n\n`;
          blogContent += `${msg.text}\n\n`;
          blogContent += `---\n\n`;
        }
      });

      // Add conclusion
      blogContent += ` Kết luận\n\n`;
      blogContent += `Cuộc trò chuyện này cung cấp thông tin hữu ích về ${blogTitle.toLowerCase()}. `;
      blogContent += `Để tìm hiểu sâu hơn, bạn có thể tiếp tục trò chuyện với Trợ lý Nghề nghiệp AI.\n\n`;
      blogContent += `*Được tạo bởi Trợ lý Nghề nghiệp AI - Hệ thống tư vấn nghề nghiệp thông minh*`;

      // Create blog post
      const blogData = {
        title: blogTitle,
        content_md: blogContent,
        excerpt: `Bài viết được tạo từ cuộc trò chuyện về ${blogTitle.toLowerCase()} với Trợ lý Nghề nghiệp AI`,
        category: 'AI tạo',
        tags: ['AI', 'Nghề nghiệp', 'Chatbot', 'Tư vấn nghề nghiệp'],
        is_published: false // Save as draft first
      };

      await blogService.createBlog(blogData);

      alert('Đã tạo blog thành công và lưu dưới dạng bản nháp!\n\nBạn có thể vào phần quản lý blog để chỉnh sửa và xuất bản.');
      setShowBlogCreator(false);
      setBlogTitle('');

    } catch (error: any) {
      console.error('Error creating blog:', error);
      alert('Không thể tạo blog: ' + (error.response?.data?.detail || error.message));
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
      // Sử dụng endpoint chính thức với authentication và database
      const response = await api.post('/api/chatbot/chat', {
          message: textToSend,
          session_id: currentSessionId
      });

      const data = response.data;

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
        text: 'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.',
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
      const response = await api.get(`/api/chatbot/sessions/${sessionId}/messages`);
      if (response.status === 200) {
        const data = response.data;
        const loadedMessages: Message[] = [];

        // Add welcome message based on user plan
        const hasCareerCounseling = canUseCareerCounseling;
        const welcomeMessage = getWelcomeMessage(hasCareerCounseling);

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
        const response = await api.post('/api/chatbot/sessions/new', {
          title: 'Cuộc trò chuyện mới'
        });

        if (response.status === 200 || response.status === 201) {
          const data = response.data;
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
      const hasCareerCounseling = canUseCareerCounseling;
      const welcomeMessage = getWelcomeMessage(hasCareerCounseling);

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
      const hasCareerCounseling = canUseCareerCounseling;
      const welcomeMessage = getWelcomeMessage(hasCareerCounseling);

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
      label: 'Tư vấn nghề nghiệp',
      action: () => sendMessage('Tôi muốn được định hướng và tư vấn cách chọn nghề phù hợp', 'career-advice')
    },
    {
      label: 'Phát triển kỹ năng',
      action: () => sendMessage('Tôi muốn xây dựng kế hoạch phát triển kỹ năng', 'skill-plan')
    },
    {
      label: 'Thị trường việc làm',
      action: () => sendMessage('Tôi muốn tìm hiểu về thị trường việc làm', 'job-analysis')
    }
  ];

  const premiumActions = [
    {
      label: 'Tạo blog từ chat',
      action: () => canUseCareerCounseling ? setShowBlogCreator(true) : (setPremiumFeature('blog'), setShowPremiumPrompt(true)),
      premium: true
    }
  ];

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40 transition-all duration-300 ${isMinimized ? 'h-12' : 'h-[min(72vh,600px)]'}`}
      style={{
        width: 'min(calc(100vw - 24px), 420px)',
        right: 'calc(12px + env(safe-area-inset-right))',
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
      }}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${canUseCareerCounseling ? 'from-purple-600 to-blue-600' : 'from-blue-600 to-blue-700'} text-white p-3 sm:p-4 rounded-t-lg flex justify-between items-center gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <Bot size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white"></div>
            {canUseCareerCounseling && (
              <div className="absolute -bottom-1 -right-1">
                <Crown size={12} className="text-yellow-300" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm truncate">Trợ lý Nghề nghiệp AI</span>
              {canUseCareerCounseling && (
                <span className="text-xs bg-yellow-400 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                  {planName?.includes('Pro') ? 'Pro' : planName}
                </span>
              )}
            </div>
            <div className="text-xs opacity-90 truncate">
              {currentSessionId ? `Phiên ${currentSessionId}` : (canUseCareerCounseling ? 'Gemini API - hỗ trợ 24/7' : 'Tư vấn nghề nghiệp thông minh')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canUseCareerCounseling && (
            <button
              onClick={() => setShowBlogCreator(true)}
              className="text-white hover:text-gray-200 p-1 rounded"
              title="Tạo blog từ cuộc trò chuyện"
            >
              <FileText size={16} />
            </button>
          )}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="text-red-300 hover:text-red-100 p-1 rounded animate-pulse"
              title="Dừng đọc"
            >
              <VolumeX size={16} />
            </button>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className="text-white hover:text-gray-200 p-1 rounded"
            title="Lịch sử chat"
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
            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
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
          {canUseCareerCounseling && (
            <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Tính năng Premium</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={isRecording ? stopVoiceInput : startVoiceInput}
                    disabled={isLoading}
                    className={`p-1.5 rounded-md transition-colors flex items-center justify-center text-xs ${isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isRecording ? "Dừng ghi âm" : "Nhập bằng giọng nói"}
                  >
                    {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                  </button>
                  <button
                    onClick={() => setShowBlogCreator(true)}
                    className="p-1.5 bg-indigo-700 text-white rounded-md hover:bg-indigo-800 transition-colors"
                    title="Tạo blog"
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
                        ? 'Dừng đọc (Tiếng Việt)'
                        : (() => {
                          return 'Đọc văn bản (Tiếng Việt)';
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
              {canUseCareerCounseling && (
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
                      <div className={`text-sm leading-relaxed ${message.sender === 'user' ? 'whitespace-pre-wrap' : ''}`}>
                        {message.sender === 'bot' ? (
                          <VietnameseMarkdownMessage text={message.text} />
                        ) : (
                          message.text
                        )}
                      </div>
                      {message.sender === 'bot' && canUseCareerCounseling && (
                        <button
                          onClick={() => speakMessage(message.text, message.id)}
                          className={`mt-1 p-1 rounded transition-colors ${isSpeaking && currentSpeakingMessageId === message.id
                            ? 'text-red-500 hover:text-red-700 animate-pulse'
                            : 'text-blue-500 hover:text-blue-700'
                            }`}
                          title={
                            isSpeaking && currentSpeakingMessageId === message.id
                              ? 'Dừng đọc (Tiếng Việt)'
                              : 'Đọc tin nhắn (Tiếng Việt)'
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
                    <span className="text-xs text-gray-500">Đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2 min-w-0">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={canUseCareerCounseling ? "Nhập câu hỏi hoặc dùng giọng nói..." : "Nhập câu hỏi của bạn..."}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              {canUseCareerCounseling && (
                <button
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isRecording
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
              {canUseCareerCounseling ? (
                <span className="flex items-center justify-center gap-1">
                  <Crown size={10} className="text-purple-500" />
                  <span className="text-purple-600 font-medium">Premium đang hoạt động</span>
                  <span className="text-gray-400">•</span>
                  <span>Giọng nói • Đọc văn bản</span>
                  {isSpeaking && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600 font-medium">
                        Tiếng Việt
                      </span>
                    </>
                  )}
                  <span className="text-gray-400">•</span>
                  <span>Blog</span>
                </span>
              ) : (
                "Nhấn Enter để gửi"
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
                Tạo blog từ cuộc trò chuyện
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
                placeholder="Nhập tiêu đề blog..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-2">
                <strong>Tính năng Premium:</strong> Tạo blog từ nội dung trò chuyện với AI.
              </p>
              <div className="text-xs text-purple-600">
                <strong>Nội dung sẽ bao gồm:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>{messages.filter(m => m.sender === 'user' && m.id !== '1').length} câu hỏi của bạn</li>
                  <li>{messages.filter(m => m.sender === 'bot' && m.id !== '1').length} phản hồi từ AI</li>
                  <li>Định dạng hỏi đáp dễ đọc</li>
                  <li>Lưu dưới dạng bản nháp để chỉnh sửa</li>
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
                {isCreatingBlog ? 'Đang tạo...' : 'Tạo blog'}
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
