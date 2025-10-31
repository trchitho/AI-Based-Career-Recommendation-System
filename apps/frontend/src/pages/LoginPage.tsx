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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const app = useAppSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const u = await login(email, password);
      if ((u as any)?.role === 'admin') {
        navigate('/admin');
      } else {
        // Người dùng thường: chuyển tới trang bắt đầu làm bài test
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900 transition-colors duration-300">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-10 animate-pulse"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 dark:opacity-5 animate-pulse delay-500"></div>
      </div>

      {/* Navigation (standalone) */}
      <nav className="sticky top-0 z-[999999] bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {app.app_title || 'CareerBridge AI'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md py-12 flex-1">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/50">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h2 className="text-center text-4xl font-bold text-white mb-2">
          {t('auth.welcomeBack')}
        </h2>
        <p className="text-center text-gray-400 mb-8">
          {t('auth.loginSubtitle')}
        </p>

        <div className="bg-gray-800/50 backdrop-blur-xl py-8 px-8 shadow-2xl rounded-2xl border border-gray-700/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {loading ? t('common.loading') : t('auth.signIn')}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                  {t('auth.signUp')}
                </Link>
              </p>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="px-4 text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Google Sign-In */}
          <button
            onClick={() => {
              const redirect = `${window.location.origin}/oauth/callback`;
              const url = `${api.defaults.baseURL}api/auth/google/login?redirect=${encodeURIComponent(redirect)}`;
              window.location.href = url;
            }}
            className="w-full flex items-center justify-center py-3 px-4 bg-white text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 border border-gray-300"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3"><path d="M533.5 278.4c0-18.5-1.5-36.9-4.6-54.8H272v103.8h147.3c-6.4 34.7-25.9 64.1-55.2 83.7v69.5h89.2c52.2-48 80.2-118.8 80.2-202.2z" fill="#4285F4"/><path d="M272 544.3c72.7 0 133.8-24.1 178.4-65.7l-89.2-69.5c-24.8 16.7-56.5 26.5-89.2 26.5-68.5 0-126.6-46.2-147.4-108.3H33.5v68.8C77.7 485.7 168.2 544.3 272 544.3z" fill="#34A853"/><path d="M124.6 327.3c-10.8-31.9-10.8-66.3 0-98.2V160.3H33.5c-39.1 77.8-39.1 169.9 0 247.7l91.1-80.7z" fill="#FBBC05"/><path d="M272 106.1c37.9-.6 74.4 14.2 101.7 41.1l76.1-76.1C402.8 24.4 339.6-.2 272 0 168.2 0 77.7 58.6 33.5 160.3l91.1 68.8C145.4 152.3 203.5 106.1 272 106.1z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="mt-6 flex items-center justify-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your data is encrypted and secure
          </div>
        </div>
      </div>

      {/* Footer (standalone) */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-600 dark:text-gray-400">
          © 2025 CareerBridge AI
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
