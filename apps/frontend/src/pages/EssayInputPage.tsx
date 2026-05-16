import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { assessmentService } from '../services/assessmentService';

const EssayInputPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const [text, setText] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    setLoading(true);

    try {
      // Giả định assessmentId 'latest' được BE hỗ trợ như code gốc
      await assessmentService.submitEssay({ assessmentId: 'latest', essayText: text, lang: 'en' });
      setDone('Bài luận đã được gửi thành công để phân tích NLP.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Không thể gửi bài luận');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface-primary dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-x-hidden pb-20">

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
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="animate-fade-in-up">

            {/* --- HEADER --- */}
            <div className="text-center mb-10">
              <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6 border border-indigo-200 dark:border-indigo-800">
                Personal Statement
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                Tell us about <span className="text-indigo-800 dark:text-indigo-700">yourself</span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
                Share your goals, experiences, and aspirations. Our AI will analyze your writing to provide deeper career insights.
              </p>
            </div>

            {/* --- CARD FORM --- */}
            <div className="bg-white dark:bg-gray-800 rounded-card-hero p-8 md:p-10 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden">

              {/* Decorative Top Line */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-700 to-indigo-600"></div>

              <form onSubmit={submit} className="space-y-6">

                {/* Text Area */}
                <div>
                  <label htmlFor="essay" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Your Essay
                  </label>
                  <div className="relative">
                    <textarea
                      id="essay"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-2xl px-6 py-5 h-64 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all resize-none font-medium text-lg leading-relaxed"
                      placeholder="Start typing here... Write about your career goals, strengths, and what drives you."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={loading || !!done}
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-semibold text-gray-400 pointer-events-none bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-md backdrop-blur-sm">
                      {text.length} chars
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {done && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/50 rounded-full flex items-center justify-center text-indigo-800 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-indigo-900 dark:text-indigo-300 font-medium">{done}</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2">
                  {!done ? (
                    <button
                      type="submit"
                      disabled={loading || text.length < 10}
                      className="w-full py-4 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          Submit Essay
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => window.history.back()} // Hoặc navigate về dashboard
                      className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      Return to Dashboard
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default EssayInputPage;