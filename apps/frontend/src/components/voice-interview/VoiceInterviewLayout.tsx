import React from 'react';

interface VoiceInterviewLayoutProps {
    children?: React.ReactNode;
}

export const VoiceInterviewLayout: React.FC<VoiceInterviewLayoutProps> = ({ children }) => {
    return (
        <div className="voice-interview-layout min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" data-testid="voice-interview-layout">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">
                                Voice Interview
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="pulse-animation w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-gray-600">AI Ready</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Avatar Section */}
                    <div className="text-center py-8 bg-gradient-to-r from-blue-500 to-purple-600">
                        <div className="avatar w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg pulse-animation">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">AI Interviewer</h2>
                        <p className="text-blue-100">Sẵn sàng cho cuộc phỏng vấn</p>
                    </div>

                    {/* Interview Content */}
                    <div className="p-8">
                        <div className="interview-text max-w-3xl mx-auto">
                            <div className="text-content" style={{
                                fontSize: '20px',
                                lineHeight: '1.8',
                                maxWidth: '700px',
                                letterSpacing: '0.3px',
                                margin: '0 auto',
                                color: '#1e293b'
                            }}>
                                {children || (
                                    <div className="text-center text-gray-500">
                                        <p className="mb-4">Chào mừng bạn đến với phỏng vấn giọng nói AI!</p>
                                        <p>Hệ thống đang sẵn sàng để bắt đầu cuộc trò chuyện.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Microphone Button */}
                        <div className="text-center mt-8">
                            <button className="mic-button w-20 h-20 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 glow-effect">
                                <svg className="w-10 h-10 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <p className="text-sm text-gray-600 mt-3">Nhấn để bắt đầu ghi âm</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Custom Styles */}
            <style>{`
        .pulse-animation {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .glow-effect {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          animation: glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
          from {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          to {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
        
        .interview-text {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-weight: 400;
        }
        
        .interview-text h1, .interview-text h2, .interview-text h3 {
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .interview-text p {
          margin-bottom: 1rem;
        }
      `}</style>
        </div>
    );
};