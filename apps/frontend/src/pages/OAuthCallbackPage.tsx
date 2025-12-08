import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();

  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');

    if (access) localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);

    // Go to home after login
    // Thêm một chút delay nhỏ để người dùng kịp nhìn thấy hiệu ứng chuyển cảnh mượt mà nếu muốn, 
    // nhưng ở đây giữ nguyên logic redirect ngay lập tức để tối ưu tốc độ.
    navigate('/home', { replace: true });
  }, [navigate]);

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================

  // Logo Component (Simplified for this page)
  const BrandLogo = () => (
    <div className="flex items-center gap-0.5 select-none group animate-pulse">
      <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">career</span>
      <span className="text-3xl font-extrabold tracking-tight text-green-600 dark:text-green-500">bridge</span>
      <span className="text-4xl font-extrabold text-green-600 dark:text-green-500 leading-none mb-1">.</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white flex flex-col items-center justify-center relative overflow-hidden">

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .bg-dot-pattern {
            background-image: radial-gradient(#D1D5DB 1px, transparent 1px);
            background-size: 24px 24px;
        }
        .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
        }
      `}</style>

      {/* Background Layers */}
      <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-40"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none z-0 animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center">

        {/* Logo */}
        <div className="mb-10 scale-110">
          <BrandLogo />
        </div>

        {/* Spinner & Text */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center w-80">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Authenticating...</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Please wait while we secure your connection and sign you in.
          </p>
        </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-xs text-gray-400 dark:text-gray-600 font-medium">
        Secure Login Processing
      </div>
    </div>
  );
};

export default OAuthCallbackPage;