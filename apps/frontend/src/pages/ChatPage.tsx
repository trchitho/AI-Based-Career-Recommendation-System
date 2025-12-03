import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

interface Message { role: 'system' | 'user' | 'assistant'; content: string }

const ChatPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const location = useLocation();
  const summary = (location.state as any)?.summary as string | undefined;
  const [messages, setMessages] = useState<Message[]>(() => summary ? [{ role: 'system', content: summary }] : []);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false); // Added loading state for better UX

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg: Message = { role: 'user', content: input.trim() };
    setMessages((m) => [...m, msg]);
    setInput('');
    setIsTyping(true);

    // Placeholder assistant echo; later replace by backend chatbot API
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', content: 'Assistant (placeholder): I received your message and will process it.' }]);
      setIsTyping(false);
    }, 1500);
  };

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
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
          
          /* Typing Animation */
          .typing-dot {
            animation: typing 1.4s infinite ease-in-out both;
          }
          .typing-dot:nth-child(1) { animation-delay: -0.32s; }
          .typing-dot:nth-child(2) { animation-delay: -0.16s; }
          
          @keyframes typing {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-full">

          {/* --- HEADER --- */}
          <div className="text-center mb-6 flex-shrink-0">
            <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-3 border border-green-200 dark:border-green-800">
              AI Assistant
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Career<span className="text-green-600 dark:text-green-500">Chat</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ask me anything about your career path, skills, or goals.</p>
          </div>

          {/* --- CHAT CONTAINER --- */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col relative">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {messages.length === 0 && !summary ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-8">
                  <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">How can I help you today?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Try asking about specific career paths, required skills for a job, or interview tips.</p>
                </div>
              ) : (
                <>
                  {/* System Message (Summary) */}
                  {messages.filter(m => m.role === 'system').map((m, i) => (
                    <div key={`sys-${i}`} className="flex justify-center mb-6">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs px-4 py-2 rounded-full border border-yellow-100 dark:border-yellow-800/50 shadow-sm max-w-2xl text-center">
                        <span className="font-bold mr-1">Context:</span> {m.content}
                      </div>
                    </div>
                  ))}

                  {/* Chat Messages */}
                  {messages.filter(m => m.role !== 'system').map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[80%] md:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>

                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user'
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
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-none'
                            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                          }`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[80%] gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 flex items-center gap-1 h-12">
                          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={send} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    className="w-full pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium shadow-inner"
                    placeholder="Type your question here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isTyping}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {/* Optional: Attach button could go here */}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
                >
                  <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </form>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                AI can make mistakes. Consider checking important information.
              </p>
            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default ChatPage;