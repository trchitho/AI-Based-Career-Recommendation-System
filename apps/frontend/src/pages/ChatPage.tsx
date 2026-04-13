import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ChatHistory } from '../components/chatbot/ChatHistory';

interface Message { role: 'system' | 'user' | 'assistant'; content: string; timestamp?: string }

const ChatPage = () => {
  const location = useLocation();
  const summary = (location.state as any)?.summary as string | undefined;

  const [messages, setMessages] = useState<Message[]>(() =>
    summary ? [{ role: 'system', content: summary }] : []
  );
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PB21 – history sidebar
  const [historyOpen, setHistoryOpen] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── PB20: send message to real API ──────────────────────────────────────
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: userText, timestamp: new Date().toISOString() }]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userText,
          context: summary ?? null,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.response, timestamp: data.timestamp },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Không thể kết nối tới AI. Vui lòng thử lại.');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── PB21: load a session from history ───────────────────────────────────
  const handleSelectSession = async (sid: number) => {
    setHistoryOpen(false);
    setSessionId(sid);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/chatbot/sessions/${sid}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();

      const loaded: Message[] = [];
      for (const msg of data.messages ?? []) {
        loaded.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp,
        });
      }
      setMessages(loaded);
    } catch {
      // non-critical
    }
  };

  const handleNewSession = async () => {
    setHistoryOpen(false);
    setSessionId(null);
    setMessages(summary ? [{ role: 'system', content: summary }] : []);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/chatbot/sessions/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
      }
    } catch {
      // non-critical
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-hidden flex flex-col">

        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#E5E7EB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .typing-dot { animation: typing 1.4s infinite ease-in-out both; }
          .typing-dot:nth-child(1) { animation-delay: -0.32s; }
          .typing-dot:nth-child(2) { animation-delay: -0.16s; }
          @keyframes typing {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
          .prose-chat p { margin: 0.4em 0; }
          .prose-chat ul { list-style: disc; padding-left: 1.25em; margin: 0.4em 0; }
          .prose-chat li { margin: 0.2em 0; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-full">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="text-center flex-1">
              <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-2 border border-green-200 dark:border-green-800">
                AI Assistant
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Career<span className="text-green-600 dark:text-green-500">Chat</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Ask me anything about your career path, skills, or goals.
              </p>
            </div>

            {/* PB21 – History button */}
            <button
              onClick={() => setHistoryOpen(true)}
              title="Lịch sử trò chuyện"
              className="absolute right-4 sm:right-6 lg:right-8 top-6 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-400 hover:text-green-600 transition-all shadow-sm text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Lịch sử</span>
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-3 flex-shrink-0 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* CHAT CONTAINER */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col relative min-h-0">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {messages.filter(m => m.role !== 'system').length === 0 && !summary ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-8">
                  <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bạn muốn hỏi gì hôm nay?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    Thử hỏi về lộ trình nghề nghiệp, kỹ năng cần thiết, hoặc lời khuyên phỏng vấn.
                  </p>
                  {/* Quick prompts */}
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {[
                      'Tôi nên học gì để trở thành Data Scientist?',
                      'Kỹ năng quan trọng nhất cho lập trình viên?',
                      'Làm sao để chuẩn bị phỏng vấn?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => { setInput(prompt); }}
                        className="px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-xs font-medium hover:bg-green-100 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* System context banner */}
                  {messages.filter(m => m.role === 'system').map((m, i) => (
                    <div key={`sys-${i}`} className="flex justify-center mb-4">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs px-4 py-2 rounded-full border border-yellow-100 dark:border-yellow-800/50 shadow-sm max-w-2xl text-center">
                        <span className="font-bold mr-1">Context:</span> {m.content}
                      </div>
                    </div>
                  ))}

                  {/* Chat messages */}
                  {messages.filter(m => m.role !== 'system').map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[80%] md:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                          m.role === 'user'
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                        }`}>
                          {m.role === 'user' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm prose-chat ${
                          m.role === 'user'
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-none'
                            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700 whitespace-pre-wrap'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[80%] gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 flex items-center gap-1 h-12">
                          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Input area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={send} className="relative flex items-center gap-2">
                <input
                  className="flex-1 pl-5 pr-4 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium shadow-inner"
                  placeholder="Nhập câu hỏi của bạn..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
                >
                  <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </form>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                AI có thể mắc lỗi. Hãy xác minh thông tin quan trọng trước khi áp dụng.
              </p>
            </div>
          </div>
        </div>

        {/* PB21 – Chat History modal */}
        <ChatHistory
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          currentSessionId={sessionId}
        />
      </div>
    </MainLayout>
  );
};

export default ChatPage;
