import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';

type QuizMode = 'standard' | 'game' | null;

const QuizModeSelectorPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<QuizMode>(null);

  const handleModeSelect = (mode: QuizMode) => {
    setSelectedMode(mode);
  };

  const handleStart = () => {
    if (!selectedMode) return;
    navigate(`/assessment?mode=${selectedMode}`);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-hidden flex flex-col">
        
        {/* Background Styles */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(74, 124, 89, 0.3); } 50% { box-shadow: 0 0 40px rgba(74, 124, 89, 0.6); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
          .bg-grid-pattern {
            background-image: radial-gradient(rgba(74, 124, 89, 0.1) 1px, transparent 1px);
            background-size: 32px 32px;
          }
          .dark .bg-grid-pattern {
            background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-green-400/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        {/* Main Container */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">
          <div className="w-full max-w-6xl">
            
            {/* Header */}
            <div className="text-center mb-12 animate-fade-in-up">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-6 border border-purple-200 dark:border-purple-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                🎮 Game Modes
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-gray-900 via-purple-800 to-pink-800 dark:from-white dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-6 leading-tight">
                Choose Your Game
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-medium max-w-3xl mx-auto">
                Select a game mode for your assessment. All modes provide accurate career orientation results.
              </p>
            </div>

            {/* Game Mode Cards */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              
              {/* Puzzle Game */}
              <div 
                onClick={() => handleModeSelect('standard')}
                className={`group relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border-2 p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl ${
                  selectedMode === 'standard' 
                    ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {selectedMode === 'standard' && (
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Puzzle Game</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Interactive & Fun</p>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  Complete career interest puzzles by matching pieces. Each piece reveals insights about your personality!
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Drag & drop puzzle pieces</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Progressive difficulty</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>XP rewards per puzzle</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>~12 minutes</span>
                  </div>
                </div>
              </div>

              {/* Animated Quiz Game */}
              <div 
                onClick={() => handleModeSelect('game')}
                className={`group relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border-2 p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl ${
                  selectedMode === 'game' 
                    ? 'border-purple-500 dark:border-purple-400 ring-4 ring-purple-500/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                }`}
              >
                {selectedMode === 'game' && (
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Animated Quiz</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">Smooth & Engaging</p>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  Answer questions with beautiful animations, emoji scales, and instant visual feedback. Engaging and fun!
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Smooth transitions</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Emoji-based scales</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>XP rewards</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>~10 minutes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 text-lg mb-2">
                    Same Results, Different Experience
                  </h4>
                  <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                    Both modes use identical questions and assessment algorithms. Your career orientation results will be exactly the same regardless of which mode you choose. The only difference is how you interact with the quiz.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleStart}
                disabled={!selectedMode}
                className={`group relative px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all duration-300 overflow-hidden ${
                  selectedMode
                    ? 'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-2 cursor-pointer'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {selectedMode && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
                <span className="relative z-10 flex items-center gap-3">
                  Start Assessment
                  <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default QuizModeSelectorPage;
