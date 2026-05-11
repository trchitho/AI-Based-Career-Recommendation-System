import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAppSettings } from "../contexts/AppSettingsContext";
import api from "../lib/api";
import { authTokenService } from "../services/authTokenService";

const RegisterPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const submitting = loading || verifyingCode;

  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const app = useAppSettings();

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return t('auth.passwordMinLength');
    if (!/[A-Z]/.test(pwd)) return t('auth.passwordNeedsUppercase');
    if (!/[a-z]/.test(pwd)) return t('auth.passwordNeedsLowercase');
    if (!/[0-9]/.test(pwd)) return t('auth.passwordNeedsNumber');
    if (!/[!@$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return t('auth.passwordNeedsSpecial');
    return null;
  };

  const runRegister = async (skipNavigate?: boolean) => {
    setError("");
    setInfo("");
    setDevToken(null);
    setAlreadyRegistered(false);

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t("auth.invalidEmail") || "Please enter a valid email address");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const result = await register(email, password, firstName, lastName);
      if (result?.verificationRequired) {
        setInfo(result.message || "A verification code has been sent to your email. Please enter it below to activate your account.");
        setDevToken(result.devToken || null);
        setCodeSent(true);
        setError("");
        return;
      }
      if (skipNavigate) {
        setInfo("Verification email sent. Please check your inbox to continue.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return;
      }
      navigate("/home");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = err?.response?.data?.message;
      const isObj = typeof detail === "object" && detail !== null;
      const errorCode = isObj ? detail?.error_code : undefined;
      const detailMessage = isObj ? detail?.message : detail;
      const raw = detailMessage || message || err?.message || "";
      let friendly = raw;
      if (errorCode === "EMAIL_NOT_DELIVERABLE") {
        friendly = t("auth.emailNotExist") || "Email does not exist, please change to another email!";
      } else if (errorCode === "EMAIL_ALREADY_REGISTERED") {
        friendly = "Email already exists, please try again with another email.";
      }
      if (!friendly || typeof friendly === "object") {
        if (typeof friendly === "object") {
          // Log the original error object for debugging
          console.error("Registration error details:", friendly, err);
        }
        friendly = "Registration failed. Please try again.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeSent) {
      await handleVerifyCode();
    } else {
      await runRegister(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t("auth.invalidEmail") || "Please enter a valid email address");
      return;
    }
    setVerifying(true);
    await runRegister(true);
    setVerifying(false);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code from your email.");
      return;
    }
    setVerifyingCode(true);
    try {
      await authTokenService.verify(verificationCode.trim());
      setError("");
      setInfo("Email verified successfully. Redirecting to login...");
      setAlreadyRegistered(true);
      setCodeSent(false);
      setTimeout(() => navigate("/login"), 1200);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Invalid or expired code. Please try again.");
    } finally {
      setVerifyingCode(false);
    }
  };

  // ==========================================
  // 2. DESIGN COMPONENTS (ĐỒNG BỘ)
  // ==========================================

  const ModernLogo = () => (
    <Link to="/home" className="flex items-center gap-2 group select-none">
      <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
        career<span className="text-indigo-700">bridge</span><span className="text-indigo-700 text-3xl leading-none">.</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white selection:bg-indigo-50 selection:text-indigo-900 transition-colors duration-base flex flex-col overflow-hidden">

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
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
      <div className="flex-1 flex flex-col items-center justify-center relative px-4 sm:px-6 lg:px-8 pt-24 pb-12">

        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-700/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '4s' }}></div>

        <div className="w-full max-w-[580px] animate-fade-in-up">

          {/* Title & Subtitle */}
          <div className="text-center mb-16">
            <h1 className="text-[44px] font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight leading-none">
              {t("auth.createAccount")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-normal text-[18px]">
              {t('auth.registerSubtitle2')}
            </p>
          </div>

          {/* CARD FORM */}
          <div className="bg-white dark:bg-gray-800 rounded-[28px] shadow-2xl shadow-gray-400/20 dark:shadow-gray-900/50 border-0 px-14 py-12 relative">
            <form className="space-y-7" onSubmit={handleSubmit}>

              {/* Messages (Success/Info) */}
              {info && (
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 p-4 text-sm">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-indigo-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="text-indigo-950 dark:text-indigo-300 font-medium">{info}</p>
                      {alreadyRegistered && (
                        <p className="mt-1 text-indigo-900 dark:text-indigo-400">
                          Go to <Link to="/login" className="font-bold underline hover:no-underline">Login</Link>
                        </p>
                      )}
                      {devToken && (
                        <div className="mt-2 text-xs font-mono text-indigo-800 bg-white/60 dark:bg-black/20 p-1.5 rounded border border-indigo-200 dark:border-indigo-800">
                          Token: {devToken}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Block */}
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex gap-3 items-start">
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-red-600 dark:text-red-300 font-medium leading-tight">{error}</p>
                </div>
              )}

              {/* NAME FIELDS (Grid 2 cols) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                    {t("auth.firstName")}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="block w-full px-4 py-[16px] bg-blue-50 dark:bg-gray-700 border-0 rounded-[18px] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-blue-100 dark:focus:bg-gray-600 outline-none transition-all font-normal text-[15px]"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                    {t("auth.lastName")}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="block w-full px-4 py-[16px] bg-blue-50 dark:bg-gray-700 border-0 rounded-[18px] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-blue-100 dark:focus:bg-gray-600 outline-none transition-all font-normal text-[15px]"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-2.5">
                <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                  {t("auth.email")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full px-4 py-[16px] bg-blue-50 dark:bg-gray-700 border-0 rounded-[18px] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-blue-100 dark:focus:bg-gray-600 outline-none transition-all font-normal text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={verifying}
                    className="px-4 py-[16px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-[18px] font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 whitespace-nowrap border-0"
                  >
                    {verifying ? t("common.sending") : t("auth.verifyEmail")}
                  </button>
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2.5">
                <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-4 py-[16px] bg-blue-50 dark:bg-gray-700 border-0 rounded-[18px] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-blue-100 dark:focus:bg-gray-600 outline-none transition-all font-normal text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[16px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7 0-1.07.37-2.144 1.075-3.15M4.22 4.22l15.56 15.56M9.9 9.9A3 3 0 0114.1 14.1" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2.5">
                <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                  {t("auth.confirmPassword")}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-4 py-[16px] bg-blue-50 dark:bg-gray-700 border-0 rounded-[18px] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-blue-100 dark:focus:bg-gray-600 outline-none transition-all font-normal text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-4 top-[16px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPwd ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4-10-7 0-1.07.37-2.144 1.075-3.15M4.22 4.22l15.56 15.56M9.9 9.9A3 3 0 0114.1 14.1" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Verification code input (inline) */}
              {codeSent && (
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                    {t('auth.verificationCode')}
                  </label>
                  <input
                    type="tel"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder={t('auth.verificationCodePlaceholder')}
                    className="block w-full px-4 py-[16px] bg-blue-50 dark:bg-gray-700 border-0 rounded-[18px] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-blue-100 dark:focus:bg-gray-600 outline-none transition-all font-normal text-[15px]"
                    maxLength={6}
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('auth.verifyCodeHint')}
                  </p>
                  {devToken && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dev code: <span className="font-mono">{devToken}</span>
                    </p>
                  )}
                  {devCode && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dev OTP: <span className="font-mono">{devCode}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-[17px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[18px] font-bold text-[17px] shadow-xl shadow-indigo-500/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-9"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>{codeSent ? t('auth.confirming') : t('auth.processing')}</span>
                  </>
                ) : (
                  <>
                    <span>{t("auth.signUp")}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-7">
                <span className="text-gray-500 dark:text-gray-400 font-normal text-[15px]">{t("auth.hasAccount")} </span>
                <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline transition-colors text-[15px]">
                  {t("auth.signIn")}
                </Link>
              </div>

              {/* Divider */}
              <div className="relative my-9">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                <div className="relative flex justify-center text-[14px]"><span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-normal">{t('auth.orContinueWith')}</span></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => {
                  const redirect = `${window.location.origin}/oauth/callback`;
                  window.location.href = `${api.defaults.baseURL}api/auth/google/login?redirect=${encodeURIComponent(redirect)}`;
                }}
                className="w-full flex items-center justify-center gap-3 py-[17px] px-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-[18px] hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-700 dark:text-white font-semibold text-[16px]"
              >
                <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                  <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-36.9-4.6-54.8H272v103.8h147.3c-6.4 34.7-25.9 64.1-55.2 83.7v69.5h89.2c52.2-48 80.2-118.8 80.2-202.2z" />
                  <path fill="#34A853" d="M272 544.3c72.7 0 133.8-24.1 178.4-65.7l-89.2-69.5c-24.8 16.7-56.5 26.5-89.2 26.5-68.5 0-126.6-46.2-147.4-108.3H33.5v68.8C77.7 485.7 168.2 544.3 272 544.3z" />
                  <path fill="#FBBC05" d="M124.6 327.3c-10.8-31.9-10.8-66.3 0-98.2V160.3H33.5c-39.1 77.8-39.1 169.9 0 247.7l91.1-80.7z" />
                  <path fill="#EA4335" d="M272 106.1c37.9-.6 74.4 14.2 101.7 41.1l76.1-76.1C402.8 24.4 339.6-.2 272 0 168.2 0 77.7 58.6 33.5 160.3l91.1 68.8C145.4 152.3 203.5 106.1 272 106.1z" />
                </svg>
                Google
              </button>

            </form>
          </div>

          {/* Footer Text */}
          <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500 space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="font-medium">{t('auth.secureEncryption')}</span>
            </div>
            <p className="font-normal">© 2025 CareerBridge AI. All rights reserved.</p>
          </div>

        </div>
      </div>

      {/* Simple Footer Bar */}
      <footer className="py-4 text-center border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
        {app.footer_html ? (
          <div dangerouslySetInnerHTML={{ __html: app.footer_html }} />
        ) : (
          <div>© 2025 CareerBridge AI. All rights reserved.</div>
        )}
      </footer>
    </div>
  );
};

export default RegisterPage;
