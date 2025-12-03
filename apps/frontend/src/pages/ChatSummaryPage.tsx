import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { profileService } from '../services/profileService';
import { assessmentService } from '../services/assessmentService';

const ChatSummaryPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true); setError(null);
      try {
        const data = await profileService.getProfileData();
        const profile = data.profile;
        const latest = data.assessmentHistory?.[0];
        let results: any = null;
        if (latest?.id) {
          try {
            results = await assessmentService.getResults(latest.id);
          } catch (_) { }
        }

        const lines: string[] = [];
        lines.push(`# User Context`);
        lines.push(`Name: ${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        lines.push(`Email: ${profile.email}`);
        if (profile.date_of_birth) lines.push(`DOB: ${profile.date_of_birth}`);
        lines.push('');
        if (latest?.id) {
          lines.push(`# Latest Assessment`);
          lines.push(`Assessment ID: ${latest.id}`);
        }
        if (results?.scores) {
          lines.push('');
          lines.push(`# Scores`);
          if (results.scores.RIASEC) {
            lines.push(`RIASEC: ${JSON.stringify(results.scores.RIASEC)}`);
          }
          if (results.scores.BIG_FIVE || results.scores.BigFive) {
            lines.push(`BigFive: ${JSON.stringify(results.scores.BIG_FIVE || results.scores.BigFive)}`);
          }
        }
        if (results?.career_recommendations?.length) {
          lines.push('');
          lines.push(`# Recommended Careers`);
          lines.push(`${results.career_recommendations.join(', ')}`);
        }
        setSummary(lines.join('\n'));
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to build summary');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const proceed = () => {
    navigate('/chat', { state: { summary } });
  };

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">

        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
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
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="animate-fade-in-up">

            {/* --- HEADER --- */}
            <div className="text-center mb-10">
              <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
                AI Context Preparation
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                Preparing Your <span className="text-green-600 dark:text-green-500">Assistant</span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
                We are gathering your profile data and assessment results to give the AI Assistant the best context to help you.
              </p>
            </div>

            {/* --- LOADING STATE --- */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div>
                <p className="text-gray-500 font-medium">Compiling your data...</p>
              </div>
            )}

            {/* --- ERROR STATE --- */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
              </div>
            )}

            {/* --- SUMMARY CARD --- */}
            {!loading && !error && (
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-1 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-[28px] p-8 md:p-10">

                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Context Data Preview
                    </h3>
                    <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">Read-only</span>
                  </div>

                  <div className="relative">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-white/10 pointer-events-none"></div>
                    <textarea
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 h-80 bg-white dark:bg-gray-950 text-gray-800 dark:text-green-100/80 font-['JetBrains_Mono'] text-sm leading-relaxed focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none shadow-inner"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      spellCheck={false}
                    />
                  </div>

                  <div className="mt-8 flex justify-end items-center gap-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">
                      This information will be used to personalize your chat experience.
                    </p>
                    <button
                      onClick={proceed}
                      className="group px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                      Start Assistant
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default ChatSummaryPage;