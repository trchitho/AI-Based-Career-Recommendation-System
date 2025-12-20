import React, { useState, useEffect } from 'react';
import { MessageCircle, Bot, X } from 'lucide-react';
import { Chatbot } from './Chatbot';

export const ChatbotButton: React.FC = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Show welcome message after 3 seconds, only once per session
    const hasSeenWelcome = sessionStorage.getItem('chatbot-welcome-shown');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(true);
        sessionStorage.setItem('chatbot-welcome-shown', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
    return;
  }, []);

  const handleToggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
    setShowWelcome(false);
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  return (
    <>
      {/* Floating Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleToggleChatbot}
          className={`relative bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group ${
            isChatbotOpen ? 'bg-gray-500' : ''
          }`}
          title="AI Tư vấn nghề nghiệp"
        >
          {/* Main Icon */}
          <div className="relative">
            {isChatbotOpen ? (
              <X size={20} className="transition-transform duration-200" />
            ) : (
              <MessageCircle size={20} className="transition-transform duration-200" />
            )}
          </div>
          
          {/* Online indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          
          {/* Pulse effect when not opened */}
          {!isChatbotOpen && (
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
          )}
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            AI Tư vấn nghề nghiệp
            <div className="absolute top-full right-3 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>

      {/* Welcome popup */}
      {showWelcome && !isChatbotOpen && (
        <div className="fixed bottom-20 right-6 z-40 animate-bounce-in">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 max-w-xs relative">
            <button
              onClick={handleCloseWelcome}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center"
            >
              <X size={12} />
            </button>
            
            <div className="flex items-start gap-2 pr-4">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-800 mb-1">
                  Xin chào! 👋
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  Tôi có thể tư vấn nghề nghiệp cho bạn. Hãy click để chat!
                </div>
              </div>
            </div>
            
            {/* Arrow pointing to button */}
            <div className="absolute -bottom-1 right-6 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-white"></div>
            <div className="absolute bottom-0 right-6 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-200"></div>
          </div>
        </div>
      )}

      {/* Chatbot Component */}
      <Chatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />


    </>
  );
};