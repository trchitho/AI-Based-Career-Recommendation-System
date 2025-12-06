import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAppSettings } from '../contexts/AppSettingsContext';
import api from '../lib/api';

const LoginPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const app = useAppSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifyMsg('');
    setVerifyUrl(null);
    setDevToken(null);
    setLoading(true);

    try {
      const u = await login(email, password);
      if ((u as any)?.role === 'admin') navigate('/admin');
      else navigate('/home');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (detail && typeof detail === 'object') {
        if (detail?.verification_required || detail?.verificationRequired) {
          setVerifyMsg(detail?.message || 'Please verify your email to continue.');
          setVerifyUrl(detail?.verify_url || detail?.verifyUrl || null);
          setDevToken(detail?.dev_token || detail?.devToken || null);
          return;
        }
        if (detail?.message) {
          setError(detail.message);
          return;
        }
      }

      if (status === 404) setError("Email not found");
      else if (status === 401) setError("Incorrect password");
      else if (status === 403) setError(typeof detail === 'string' ? detail : "Account is locked");
      else if (!status || status === 0) setError("Cannot reach server");
      else setError(detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. DESIGN COMPONENTS
  // ==========================================

  // Logo Text chuẩn từ HomePage
  const ModernLogo = () => (
    <Link to="/home" className="flex items-center gap-2 group select-none">
      <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
        career<span className="text-green-500">bridge</span><span className="text-green-500 text-3xl leading-none">.</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-green-100 selection:text-green-900 transition-colors duration-300 flex flex-col overflow-hidden">

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
      `}</style>

      {/* --- HEADER --- */}
      {/* Loại bỏ border-b và chỉnh bg trong suốt hơn để liền mạch */}
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <div className="w-full max-w-[480px] animate-fade-in-up">

          {/* Title & Subtitle */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
              {t('auth.welcomeBack')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-[16px]">
              Enter your credentials to access your account.
            </p>
          </div>

          {/* CARD FORM */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8 sm:p-10 relative">
            <form className="space-y-6" onSubmit={handleSubmit}>

              {/* Messages */}
              {verifyMsg && (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="text-green-800 dark:text-green-300 font-medium">{verifyMsg}</p>
                      {verifyUrl && (
                        <a href={verifyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-green-700 underline hover:no-underline">
                          Verify Email Now
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex gap-3 items-start">
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-red-600 dark:text-red-300 font-medium leading-tight">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium"
                  />
                  <div className="absolute left-4 top-3.5 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between ml-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    {t('auth.password')}
                  </label>
                  <Link to="/forgot" className="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
                    {t('auth.forgotPassword') || 'Forgot?'}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium"
                  />
                  <div className="absolute left-4 top-3.5 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7 0-1.07.37-2.144 1.075-3.15M4.22 4.22l15.56 15.56M9.9 9.9A3 3 0 0114.1 14.1" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>{t('auth.signIn')}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white dark:bg-gray-800 text-gray-500 font-medium">Or continue with</span></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => {
                  const redirect = `${window.location.origin}/oauth/callback`;
                  const url = `${api.defaults.baseURL}api/auth/google/login?redirect=${encodeURIComponent(redirect)}`;
                  window.location.href = url;
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-white font-bold text-[15px]"
              >
                <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                  <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-36.9-4.6-54.8H272v103.8h147.3c-6.4 34.7-25.9 64.1-55.2 83.7v69.5h89.2c52.2-48 80.2-118.8 80.2-202.2z" />
                  <path fill="#34A853" d="M272 544.3c72.7 0 133.8-24.1 178.4-65.7l-89.2-69.5c-24.8 16.7-56.5 26.5-89.2 26.5-68.5 0-126.6-46.2-147.4-108.3H33.5v68.8C77.7 485.7 168.2 544.3 272 544.3z" />
                  <path fill="#FBBC05" d="M124.6 327.3c-10.8-31.9-10.8-66.3 0-98.2V160.3H33.5c-39.1 77.8-39.1 169.9 0 247.7l91.1-80.7z" />
                  <path fill="#EA4335" d="M272 106.1c37.9-.6 74.4 14.2 101.7 41.1l76.1-76.1C402.8 24.4 339.6-.2 272 0 168.2 0 77.7 58.6 33.5 160.3l91.1 68.8C145.4 152.3 203.5 106.1 272 106.1z" />
                </svg>
                Google
              </button>

              {/* Sign Up Link */}
              <div className="text-center pt-4">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Don't have an account? </span>
                <Link to="/register" className="font-bold text-green-500 hover:text-green-600 dark:text-green-400 hover:underline transition-colors">
                  Sign Up
                </Link>
              </div>

            </form>
          </div>

          {/* Footer Text */}
          <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Secure 256-bit Encryption
            </div>
            © 2025 CareerBridge AI. All rights reserved.
          </div>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;