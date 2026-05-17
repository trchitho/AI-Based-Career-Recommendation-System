import { ReactNode, useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useAppSettings } from "../../contexts/AppSettingsContext";
import AppLogo from "../common/AppLogo";
import AppFooter from "./AppFooter";
import NotificationCenter from "../notifications/NotificationCenter";
import ScrollIndicator from "../common/ScrollIndicator";
import { useScrollBehavior } from "../../hooks/useScrollBehavior";
import { useAnalysisLock } from "../../contexts/AnalysisLockContext";

// Pages that should NOT show the sidebar (public / auth pages)
const NO_SIDEBAR_PATHS = ['/', '/home', '/login', '/register', '/forgot-password', '/verify', '/oauth'];

// Pages that show sidebar but auto-collapse it
const AUTO_COLLAPSE_PATHS = ['/careers', '/pricing', '/blog'];

// Fullscreen pages — hide BOTH sidebar AND header for distraction-free experience.
// Active interview screens (text/voice chat) need full canvas.
const FULLSCREEN_PATHS = ['/interview/'];

const isFullscreenPath = (pathname: string): boolean => {
  // Match active interview rooms but NOT /interview (selection list) or /interview/history
  if (pathname === '/interview' || pathname === '/interview/') return false;
  if (pathname.startsWith('/interview/history')) return false;
  if (pathname.startsWith('/interview/results')) return false;
  if (pathname.startsWith('/interview/selection')) return false;
  if (pathname.startsWith('/interview/device-test')) return false;
  return FULLSCREEN_PATHS.some(p => pathname.startsWith(p));
};

const sidebarItems = [
  {
    label: 'Phân tích kỹ năng',
    to: '/skill-gap',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: 'Lộ trình học tập',
    to: '/learning-path',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  },
  {
    label: 'Nghề nghiệp',
    to: '/careers',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  },
  {
    label: 'Thanh toán',
    to: '/pricing',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    label: 'Bài viết',
    to: '/blog',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
  },
];

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const { t } = useTranslation();
  const app = useAppSettings();

  const location = useLocation();
  const { isLocked: analysisLocked } = useAnalysisLock();
  const fullscreen = isFullscreenPath(location.pathname);
  const showSidebar = !!user && !analysisLocked && !fullscreen && !NO_SIDEBAR_PATHS.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  // State cho Dropdown User
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State cho Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar collapse state - tách biệt mobile và desktop với localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Track whether collapse was triggered automatically (not by user)
  const autoCollapsedRef = useRef(false);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Auto-collapse sidebar on AUTO_COLLAPSE_PATHS, restore when leaving
  useEffect(() => {
    const isAutoCollapsePath = AUTO_COLLAPSE_PATHS.some(p =>
      location.pathname.startsWith(p)
    );
    if (isAutoCollapsePath) {
      if (!sidebarCollapsed) {
        autoCollapsedRef.current = true;
        setSidebarCollapsed(true);
      }
    } else {
      if (autoCollapsedRef.current) {
        autoCollapsedRef.current = false;
        setSidebarCollapsed(false);
      }
    }
  }, [location.pathname]);

  // Đóng mobile sidebar khi resize sang desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navLinks = [
    { to: "/dashboard", label: "Tổng quan" },
    { to: "/assessment", label: "Đánh giá" },
    { to: "/trends", label: "Xu hướng" },
    { to: "/recommendations", label: "Nghề phù hợp" },
    { to: "/mentor-matching", label: "Cố vấn" },
    { to: "/interview", label: "Phỏng vấn" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Lấy tên hiển thị
  const displayName = (user as any)?.full_name?.trim() || user?.email?.split('@')[0] || 'User';
  // Lấy chữ cái đầu của tên cuối (last word) trong họ tên — vd "Pham thuong" → "T"
  const _nameParts = displayName.split(/\s+/).filter(Boolean);
  const displayInitial = (_nameParts[_nameParts.length - 1] || displayName).charAt(0).toUpperCase();

  // Scroll behavior hook
  const { scrollY, isScrolled, isScrollingUp, isScrollingDown } = useScrollBehavior(20);

  return (
    <div className={`w-full flex font-['Inter'] text-gray-900 dark:text-white transition-colors duration-300 ${fullscreen ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'}`} style={{ background: 'var(--neu-bg, #f0f2f5)' }}>

      {/* Scroll Progress Indicator */}
      <ScrollIndicator />

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        :root {
          --color-primary: #6d28d9;
          --color-primary-glow: rgba(109, 40, 217, 0.35);
        }
      `}</style>

      {/* SIDEBAR - Fixed left side, full height */}
      {showSidebar && (
        <>
          {/* Mobile overlay */}
          <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${mobileSidebarOpen ? 'block' : 'hidden'
              }`}
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Sidebar */}
          <aside
            className={`fixed left-0 top-[72px] h-[calc(100vh-72px)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:w-16' : 'md:w-52'
              } ${mobileSidebarOpen ? 'w-52 translate-x-0' : 'w-52 -translate-x-full md:translate-x-0'
              }`}
          >
            {/* Sidebar content */}
            <div className="flex-1 flex flex-col p-4">

              {/* Toggle button */}
              <div className={`flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'} mb-4`}>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 space-y-2">
                {sidebarItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => {
                      // Đóng mobile sidebar khi click vào navigation item trên mobile
                      if (window.innerWidth < 768) {
                        setMobileSidebarOpen(false);
                      }
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sidebarCollapsed ? 'justify-center w-10 h-10 mx-auto' : ''
                      } ${isActive
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`
                    }
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </nav>

              {/* User info at bottom */}
              {user && (
                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${sidebarCollapsed ? 'justify-center' : ''
                    }`}>
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {displayInitial}
                    </div>
                    {!sidebarCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                          title="Đăng xuất"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 min-w-0 flex flex-col ${fullscreen ? 'h-screen overflow-hidden' : ''} ${showSidebar && !sidebarCollapsed ? 'md:ml-52' : showSidebar && sidebarCollapsed ? 'md:ml-16' : 'ml-0'
        }`}>

        {/* HEADER */}
        {!analysisLocked && !fullscreen && (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300 ease-in-out bg-[#ffffff] dark:bg-[rgba(15,23,42,0.9)] border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_8px_28px_rgba(15,23,42,0.04)] h-[72px] flex items-center`}>
          <div className="w-full px-6 md:px-10 lg:px-14">
            <div className="flex items-center justify-between h-full relative">

              {/* Logo */}
              <div className="flex-shrink-0 flex-1 flex justify-start">
                <AppLogo className="hover:-translate-y-[1px] transition-transform duration-250 ease-out" />
              </div>

              {/* Desktop Navigation - KHÔNG ảnh hưởng đến sidebar state */}
              <nav className="hidden md:flex items-center space-x-2 lg:space-x-4 whitespace-nowrap">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `relative px-3 py-[10px] rounded-full text-[13px] lg:text-[14px] leading-none transition-all duration-250 ease-out cursor-pointer group outline-none whitespace-nowrap ${isActive
                        ? "text-[#4f46e5] dark:text-[#a78bfa] font-[700] bg-transparent"
                        : "text-[#64748b] dark:text-[#cbd5e1] font-[600] hover:text-[#4f46e5] dark:hover:text-[#a78bfa] hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(139,92,246,0.14)] hover:-translate-y-[1px] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>{item.label}</span>
                        {/* Active Underline */}
                        {isActive && (
                          <span
                            className="absolute -bottom-[16px] left-1/2 -translate-x-1/2 w-[92px] h-[4px] rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#3b82f6] shadow-[0_0_14px_rgba(139,92,246,0.45),0_0_26px_rgba(59,130,246,0.28)]"
                          />
                        )}
                        {/* Hover Underline (Non-active) */}
                        {!isActive && (
                          <span
                            className="absolute -bottom-[12px] left-1/2 -translate-x-1/2 w-0 h-[2px] rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] transition-all duration-300 ease-out group-hover:w-[34px]"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-4 flex-1 justify-end">
                {/* Mobile menu button */}
                <button
                  className="md:hidden p-2 text-gray-600 dark:text-gray-400 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Notifications */}
                {user && (
                  <div className="flex items-center">
                    <NotificationCenter />
                  </div>
                )}

                {/* User menu */}
                {user ? (
                  <div className="relative ml-2" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-center w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] shadow-[0_10px_24px_rgba(79,70,229,0.28)] hover:-translate-y-[1px] hover:scale-[1.03] hover:shadow-[0_14px_30px_rgba(79,70,229,0.34)] transition-all duration-250 ease-out border-none outline-none"
                    >
                      <span className="text-white text-[16px] font-bold">
                        {displayInitial}
                      </span>
                    </button>

                    {isDropdownOpen && (
                      <div
                        className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                        style={{ top: 64, right: 12, width: 'auto', minWidth: 200, animation: 'ddFade 0.15s ease-out' }}
                      >
                        <style>{`@keyframes ddFade{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>

                        {/* User info */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>

                        {/* Menu */}
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Hồ sơ cá nhân
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Cài đặt
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                          <button
                            onClick={() => { setIsDropdownOpen(false); handleLogout(); }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Đăng xuất
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <NavLink
                      to="/login"
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:scale-105"
                    >
                      Đăng nhập
                    </NavLink>
                    <NavLink
                      to="/assessment"
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Bắt đầu
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 animate-fade-in-scale">
              <nav className="px-4 py-4 space-y-2">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${isActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </header>
        )}

        {/* Spacer for fixed header */}
        {!analysisLocked && !fullscreen && <div className="h-20"></div>}

        {/* PAGE CONTENT */}
        <main className={`flex-1 ${fullscreen ? 'overflow-hidden min-h-0' : ''}`}>
          {children}
        </main>

        {/* FOOTER */}
        {!analysisLocked && !fullscreen && <AppFooter />}
      </div>
    </div>
  );
};

export default MainLayout;