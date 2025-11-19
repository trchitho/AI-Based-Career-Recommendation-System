import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAppSettings } from "../contexts/AppSettingsContext";
import api from "../lib/api";

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const app = useAppSettings();

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      navigate("/home");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col 
      bg-gradient-to-br from-[#faf7ff] via-[#f8f5ff] to-[#efe8ff]
      dark:from-[#0e0b18] dark:via-[#120f23] dark:to-[#1b1533]
      transition-colors duration-300"
    >

      {/* Navbar */}
      <nav className="sticky top-0 z-[999999] 
        bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl
        border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">

          {/* Logo */}
          <div className="flex items-center gap-3">
            {app.logo_url ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
                <img src={app.logo_url} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 
                rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            )}

            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {app.app_title || "CareerBridge AI"}
            </span>
          </div>

          {/* Language + Theme */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md py-12 flex-1">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          {app.logo_url ? (
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
              <img src={app.logo_url} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 
              rounded-2xl flex items-center justify-center shadow-xl shadow-purple-400/40">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {t("auth.createAccount")}
        </h2>

        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          Start your personalized career journey today
        </p>

        {/* Form Card */}
        <div className="bg-white/80 dark:bg-gray-800/40 
          backdrop-blur-xl p-8 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.05)]
          border border-white/50 dark:border-gray-700/50">

          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-100/60 dark:bg-red-500/10 
                border border-red-300 dark:border-red-500/50 p-3">
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* FIRST + LAST NAME */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("auth.firstName")}
                </label>

                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="block w-full px-4 py-3 
                    bg-white/70 dark:bg-gray-900/50
                    border border-gray-300 dark:border-gray-700
                    rounded-xl text-gray-900 dark:text-white 
                    placeholder-gray-400
                    focus:ring-2 focus:ring-purple-500 
                    outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("auth.lastName")}
                </label>

                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="block w-full px-4 py-3 
                    bg-white/70 dark:bg-gray-900/50
                    border border-gray-300 dark:border-gray-700
                    rounded-xl text-gray-900 dark:text-white 
                    placeholder-gray-400
                    focus:ring-2 focus:ring-purple-500 
                    outline-none transition"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("auth.email")}
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

            {/* PASSWORD */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("auth.password")}
              </label>

              <input
                type={showPassword ? "text" : "password"}
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

              {/* Eye */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-500 dark:text-gray-300"
              >
                {showPassword ? (
                  // 👁 MẮT ĐANG MỞ
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 
           9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  // 👁 MẮT BỊ GẠCH (HIDE)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7
          0-1.07.37-2.144 1.075-3.15M4.22 4.22l15.56 15.56M9.9 
          9.9A3 3 0 0114.1 14.1" />
                  </svg>
                )}
              </button>

            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("auth.confirmPassword")}
              </label>

              <input
                type={showConfirmPwd ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-4 py-3 
                  bg-white/70 dark:bg-gray-900/50
                  border border-gray-300 dark:border-gray-700
                  rounded-xl text-gray-900 dark:text-white 
                  placeholder-gray-400
                  focus:ring-2 focus:ring-purple-500 
                  outline-none transition"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                className="absolute right-4 top-3 text-gray-500 dark:text-gray-300"
              >
                {showConfirmPwd ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 
           9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7
          0-1.07.37-2.144 1.075-3.15M4.22 4.22l15.56 15.56M9.9 
          9.9A3 3 0 0114.1 14.1" />
                  </svg>
                )}
              </button>

            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 
                bg-gradient-to-r from-purple-500 to-purple-600
                text-white rounded-xl font-semibold
                shadow-lg shadow-purple-500/30
                hover:shadow-purple-600/40
                transition-all"
            >
              {loading ? t("common.loading") : t("auth.signUp")}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-500">
                {t("auth.signIn")}
              </Link>
            </p>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
            <span className="px-4 text-gray-500 dark:text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Google */}
          <button
            onClick={() => {
              const redirect = `${window.location.origin}/oauth/callback`;
              window.location.href = `${api.defaults.baseURL}api/auth/google/login?redirect=${encodeURIComponent(redirect)}`;
            }}
            className="w-full py-3 bg-white dark:bg-gray-800 
              border border-gray-300 dark:border-gray-700
              rounded-xl flex items-center justify-center 
              text-gray-800 dark:text-gray-200 hover:bg-gray-50 
              dark:hover:bg-gray-700 transition"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" />
            Continue with Google
          </button>

          {/* Secure Text */}
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
      <footer className="border-t border-gray-200 dark:border-gray-800 
        bg-white/70 dark:bg-gray-900/50 backdrop-blur py-6 text-center text-sm text-gray-700 dark:text-gray-300">

        {app.footer_html ? (
          <div dangerouslySetInnerHTML={{ __html: app.footer_html }} />
        ) : (
          "© 2025 CareerBridge AI"
        )}
      </footer>
    </div>
  );
};

export default RegisterPage;
