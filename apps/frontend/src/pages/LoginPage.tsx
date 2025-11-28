import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAppSettings } from '../contexts/AppSettingsContext';
import api from '../lib/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const app = useAppSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const u = await login(email, password);
      if ((u as any)?.role === 'admin') navigate('/admin');
      else navigate('/home');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 404) setError("Email không tồn tại");
      else if (status === 401) setError("Sai mật khẩu");
      else if (status === 403) setError("Tài khoản đã bị khóa");
      else if (!status || status === 0) setError("Không thể kết nối server");
      else setError(detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);   // QUAN TRỌNG: tắt loading dù có lỗi hay không
    }
  };


  return (
    <div
      className="min-h-screen flex flex-col 
      bg-gradient-to-br from-[#faf7ff] via-[#f8f5ff] to-[#efe8ff]
      dark:from-[#0e0b18] dark:via-[#120f23] dark:to-[#1b1533]
      transition-colors duration-300"
    >

      {/* Background bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[28rem] h-[28rem] -top-40 -left-40 
          bg-purple-400/30 rounded-full blur-[100px] animate-pulse"></div>

        <div className="absolute w-[26rem] h-[26rem] -bottom-40 -right-40 
          bg-purple-500/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>

        <div className="absolute w-[22rem] h-[22rem] top-1/2 left-1/2 
          -translate-x-1/2 -translate-y-1/2 bg-purple-300/20 
          rounded-full blur-[90px] animate-pulse delay-500"></div>
      </div>

      {/* Navbar */}
      <nav
        className="sticky top-0 z-[999999] 
  bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl
  border-b border-gray-200 dark:border-gray-700/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* LEFT — Logo + Title */}
            <div className="flex items-center space-x-3">

              {/* If logo exist → show logo from admin */}
              {app.logo_url ? (
                <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
                  <img
                    src={app.logo_url}
                    alt={app.app_title || "Logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                /* Default purple icon when no logo uploaded */
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 
            rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              )}

              {/* App Title */}
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                {app.app_title || 'CareerBridge AI'}
              </span>
            </div>

            {/* RIGHT — Language + Theme Toggle */}
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

          </div>
        </div>
      </nav>


      {/* Main Section */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md py-12 flex-1">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          {app.logo_url ? (
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
              <img
                src={app.logo_url}
                alt={app.app_title || "Logo"}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 
      rounded-2xl flex items-center justify-center shadow-xl shadow-purple-400/40">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
        </div>


        <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {t('auth.welcomeBack')}
        </h2>

        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          {t('auth.loginSubtitle')}
        </p>

        {/* Card */}
        <div
          className="bg-white/80 dark:bg-gray-800/40 
          backdrop-blur-xl py-8 px-8 rounded-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.05)]
          border border-white/50 dark:border-gray-700/50"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>

            {error && (
              <div className="rounded-lg bg-red-100/60 dark:bg-red-500/10 
                border border-red-300 dark:border-red-500/50 p-3">
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.email')}
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full px-4 py-3 
                  bg-white/70 dark:bg-gray-900/50
                  border border-gray-300 dark:border-gray-700
                  rounded-xl text-gray-900 dark:text-white 
                  placeholder-gray-400
                  focus:ring-2 focus:ring-purple-500 
                  outline-none transition"
              />
            </div>

            {/* Password (with Toggle) */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.password')}
              </label>

              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-4 py-3 
                  bg-white/70 dark:bg-gray-900/50
                  border border-gray-300 dark:border-gray-700
                  rounded-xl text-gray-900 dark:text-white
                  placeholder-gray-400
                  focus:ring-2 focus:ring-purple-500 
                  outline-none transition"
              />

              {/* Eye Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-11 text-gray-500 dark:text-dark-300"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7
                        0-1.07.37-2.144 1.075-3.15M4.22 4.22l15.56 15.56M9.9 
                        9.9A3 3 0 0114.1 14.1" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 
                        8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 
                        7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Sign in */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4
                bg-gradient-to-r from-purple-500 to-purple-600
                text-white rounded-xl font-semibold
                shadow-lg shadow-purple-500/30
                hover:shadow-purple-600/40
                transition-all duration-200 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {t('auth.noAccount')}{' '}
              <Link to="/register"
                className="font-semibold text-purple-600 hover:text-purple-500">
                {t('auth.signUp')}
              </Link>
            </p>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
            <span className="px-4 text-gray-500 dark:text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Google Login */}
          <button
            onClick={() => {
              const redirect = `${window.location.origin}/oauth/callback`;
              const url = `${api.defaults.baseURL}api/auth/google/login?redirect=${encodeURIComponent(redirect)}`;
              window.location.href = url;
            }}
            className="w-full flex items-center justify-center py-3 px-4 
              bg-white dark:bg-gray-800 
              border border-gray-300 dark:border-gray-700
              rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700
              transition text-gray-800 dark:text-gray-200 font-medium"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3">
              <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-36.9-4.6-54.8H272v103.8h147.3c-6.4 34.7-25.9 64.1-55.2 83.7v69.5h89.2c52.2-48 80.2-118.8 80.2-202.2z" />
              <path fill="#34A853" d="M272 544.3c72.7 0 133.8-24.1 178.4-65.7l-89.2-69.5c-24.8 16.7-56.5 26.5-89.2 26.5-68.5 0-126.6-46.2-147.4-108.3H33.5v68.8C77.7 485.7 168.2 544.3 272 544.3z" />
              <path fill="#FBBC05" d="M124.6 327.3c-10.8-31.9-10.8-66.3 0-98.2V160.3H33.5c-39.1 77.8-39.1 169.9 0 247.7l91.1-80.7z" />
              <path fill="#EA4335" d="M272 106.1c37.9-.6 74.4 14.2 101.7 41.1l76.1-76.1C402.8 24.4 339.6-.2 272 0 168.2 0 77.7 58.6 33.5 160.3l91.1 68.8C145.4 152.3 203.5 106.1 272 106.1z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your data is encrypted and secure
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 
        dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 
          text-sm text-gray-700 dark:text-gray-100">
          {app.footer_html ? (
            <div dangerouslySetInnerHTML={{ __html: app.footer_html }} />
          ) : (
            <div>© 2025 CareerBridge AI</div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
