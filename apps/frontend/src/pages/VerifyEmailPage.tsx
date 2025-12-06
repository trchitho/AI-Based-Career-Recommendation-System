import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { authTokenService } from '../services/authTokenService';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';

const VerifyEmailPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const [token, setToken] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, [location.search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authTokenService.verify(token);
      setDone('Email verified successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================

  // Logo Text chuẩn
  const ModernLogo = () => (
    <Link to="/home" className="flex items-center gap-2 group select-none">
      <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
        career<span className="text-green-500">bridge</span><span className="text-green-500 text-3xl leading-none">.</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white transition-colors duration-300 flex flex-col overflow-hidden">

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
      `}</style>

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/0 dark:bg-gray-900/0 backdrop-blur-none py-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <ModernLogo />

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-4 sm:px-6 lg:px-8 pt-20 pb-8">

        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '4s' }}></div>

        <div className="w-full max-w-[480px] animate-fade-in-up">

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
              Verify Email
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-[16px]">
              Enter your verification token below to activate your account.
            </p>
          </div>

          {/* CARD FORM */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8 sm:p-10 relative">
            <form className="space-y-6" onSubmit={submit}>

              {/* Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                  Verification Token
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your token here"
                    className="block w-full pl-4 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-[16px] shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Account</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </>
                )}
              </button>

              {/* Messages */}
              {done && (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-green-800 dark:text-green-300 font-bold text-lg mb-1">Verified!</p>
                  <p className="text-green-700 dark:text-green-400 mb-4">{done}</p>
                  <Link to="/login" className="inline-block px-6 py-2 bg-green-600 text-white rounded-full font-bold text-sm shadow-md hover:bg-green-700 transition-colors">
                    Go to Login
                  </Link>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex gap-3 items-start">
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-red-600 dark:text-red-300 font-medium leading-tight">{error}</p>
                </div>
              )}

            </form>
          </div>

          {/* Footer Text */}
          <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
            © 2025 CareerBridge AI. All rights reserved.
          </div>

        </div>
      </div>

    </div>
  );
};

export default VerifyEmailPage;