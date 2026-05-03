import { ReactNode, useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle";
import { useAppSettings } from "../../contexts/AppSettingsContext";
import AppLogo from "../common/AppLogo";
import AppFooter from "./AppFooter";
import NotificationCenter from "../notifications/NotificationCenter";

// Pages that should NOT show the sidebar (public / auth pages)
const NO_SIDEBAR_PATHS = ['/', '/login', '/register', '/forgot-password', '/verify', '/oauth'];

const sidebarItems = [
  {
    label: 'Tổng quan',
    to: '/dashboard',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'Phân tích kỹ năng',
    to: '/skill-gap',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: 'Learning Roadmap',
    to: '/careers',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  },
  {
    label: 'Nghề nghiệp',
    to: '/recommendations',
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
  {
    label: 'Profile',
    to: '/profile',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
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
  const showSidebar = !!user && !NO_SIDEBAR_PATHS.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  // State cho Dropdown User
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State cho Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

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
    { to: "/dashboard",       label: "Dashboard" },
    { to: "/assessment",      label: "Assessment" },
    { to: "/careers",         label: "Market" },
    { to: "/mentor-matching", label: "Mentors" },
    { to: "/interview",       label: "Interviews" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Lấy tên hiển thị
  const displayName = user?.email?.split('@')[0] || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white transition-colors duration-300" style={{ background: 'var(--neu-bg, f0f2f5)' }}>

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full pt-3 pb-2 px-3 sm:px-6 transition-all duration-300"
        style={{ background: 'transparent' }}
      >
        <div className="mx-auto h-[76px] flex justify-between items-center gap-3 px-5 sm:px-7"
          style={{
            background: 'var(--neu-bg)',
            borderRadius: '20px',
            boxShadow: '6px 6px 16px var(--neu-shadow-dark, c8cdd6), -6px -6px 16px var(--neu-shadow-light, fff)',
          }}
        >

          {/* Logo */}
          <div className="flex-shrink-0">
            <AppLogo />
          </div>

          {/* Menu chính giữa (Desktop) */}
          <nav
            className="hidden md:flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl min-w-0 flex-shrink"
            style={{
              background: 'var(--neu-bg)',
              boxShadow: 'inset 3px 3px 8px var(--neu-shadow-dark), inset -3px -3px 8px var(--neu-shadow-light)',
            }}
          >
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[14px] font-medium px-3.5 py-2 rounded-xl transition-all duration-200 select-none whitespace-nowrap ${
                    isActive
                      ? "text-indigo-800 dark:text-indigo-400 font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`
                }
                style={({ isActive }) => isActive ? ({
                  background: 'var(--neu-bg-card)',
                  boxShadow: '4px 4px 9px var(--neu-shadow-dark), -4px -4px 9px var(--neu-shadow-light)',
                }) : ({})}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Khu vực bên phải */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Hamburger Button (Mobile) */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Utilities Group (hidden on mobile — accessible via mobile menu) */}
            <div className="hidden md:flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-gray-700">
              {user && (
                <div className="ml-1">
                  <NotificationCenter />
                </div>
              )}
            </div>

            {/* Mobile only */}
            <div className="flex md:hidden items-center gap-1">
              {user && <NotificationCenter />}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="hidden lg:inline-flex px-3 py-1 text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-full dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800"
                >
                  Admin
                </NavLink>
              )}

              {/* User Dropdown Menu */}
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 cursor-pointer group p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950 rounded-full flex items-center justify-center text-indigo-900 dark:text-indigo-300 font-bold text-sm border border-transparent group-hover:border-indigo-200 transition-all">
                      {displayInitial}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-bold max-w-[100px] truncate leading-none">{displayName}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Dropdown Content */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right z-50 border-0" style={{ background: 'var(--neu-bg)', boxShadow: '10px 10px 24px var(--neu-shadow-dark), -10px -10px 24px var(--neu-shadow-light)' }}>

                      {/* User Info Header inside Dropdown */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>

                      {/* Profile Link */}
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-indigo-800 dark:hover:text-indigo-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Hồ sơ
                      </Link>

                      {/* Settings Link */}
                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-indigo-800 dark:hover:text-indigo-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Cài đặt
                      </Link>

                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-left"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {t('common.logout')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Nút Login/Get Started nếu chưa đăng nhập
                <div className="flex items-center gap-3">
                  <NavLink to="/login" className="hidden sm:block text-[15px] font-bold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-4 py-2 transition-colors">
                    {t('auth.signIn')}
                  </NavLink>
                  <NavLink to="/assessment" className="text-[15px] font-bold bg-indigo-800 text-white px-6 py-2.5 rounded-full hover:bg-indigo-900 shadow-lg shadow-indigo-900/20 hover:-translate-y-0.5 transition-all duration-200">
                    {t('nav.getStarted')}
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute top-[72px] left-0 right-0 py-4 px-4"
            style={{ background: 'var(--neu-bg)', boxShadow: '0 8px 20px var(--neu-shadow-dark)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nav Links */}
            <nav className="flex flex-col gap-1 mb-4">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-[15px] font-semibold transition-all ${
                      isActive ? "text-indigo-800 dark:text-indigo-400" : "text-gray-700 dark:text-gray-200"
                    }`
                  }
                  style={({ isActive }) => ({
                    background: 'var(--neu-bg)',
                    boxShadow: isActive
                      ? 'inset 3px 3px 7px var(--neu-shadow-dark), inset -3px -3px 7px var(--neu-shadow-light)'
                      : '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-[15px] font-semibold text-indigo-900 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                >
                  Admin Panel
                </NavLink>
              )}
            </nav>

            {/* User section in mobile menu */}
            {user ? (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col gap-1">
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-[15px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t('nav.settingsProfile')}
                </Link>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="px-4 py-3 rounded-xl text-[15px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 text-left"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  {t('common.logout')}
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col gap-2">
                <NavLink
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full px-4 py-3 rounded-xl text-[15px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                >
                  {t('auth.signIn')}
                </NavLink>
                <NavLink
                  to="/assessment"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full px-4 py-3 rounded-full text-[15px] font-bold bg-indigo-800 text-white hover:bg-indigo-900 transition-colors text-center"
                >
                  {t('nav.getStarted')}
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE CONTENT + SIDEBAR */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>

        {/* ── Sidebar (only for authenticated pages) ── */}
        {showSidebar && (
          <>
            {/* Mobile overlay */}
            {sidebarMobileOpen && (
              <div
                onClick={() => setSidebarMobileOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
              />
            )}

            {/* Desktop sidebar */}
            <aside
              className="hidden md:flex"
              style={{
                width: sidebarCollapsed ? 64 : 232,
                minWidth: sidebarCollapsed ? 64 : 232,
                flexDirection: 'column',
                background: 'var(--neu-bg)',
                boxShadow: '4px 0 14px var(--neu-shadow-dark)',
                padding: '1.1rem 0',
                position: 'sticky',
                top: 82,
                height: 'calc(100vh - 82px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: 30,
                transition: 'width 0.25s ease, min-width 0.25s ease',
                flexShrink: 0,
              }}
            >
              {/* Collapse toggle */}
              <div style={{ display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-end', padding: '0 0.7rem 0.9rem' }}>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--neu-bg-card)',
                    border: '1.5px solid var(--neu-shadow-dark)',
                    boxShadow: 'none',
                    color: 'var(--neu-accent)',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--neu-accent)';
                    (e.currentTarget as HTMLElement).style.color = 'fff';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--neu-accent)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--neu-bg-card)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--neu-accent)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--neu-shadow-dark)';
                  }}
                  title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* Nav items */}
              <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 0.55rem' }}>
                {sidebarItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    title={sidebarCollapsed ? item.label : undefined}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center',
                      gap: 10,
                      padding: sidebarCollapsed ? '0.6rem' : '0.6rem 0.85rem',
                      borderRadius: 11,
                      textDecoration: 'none',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.865rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      color: isActive ? 'var(--neu-accent)' : 'var(--neu-text-muted)',
                      background: isActive ? 'var(--neu-bg-card)' : 'transparent',
                      boxShadow: isActive
                        ? 'inset 3px 3px 7px var(--neu-shadow-dark), inset -3px -3px 7px var(--neu-shadow-light)'
                        : 'none',
                      transition: 'all 0.18s ease',
                    })}
                  >
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </nav>

              {/* User footer */}
              {!sidebarCollapsed && user && (
                <div style={{
                  margin: '0.9rem 0.55rem 0',
                  padding: '0.8rem 0.85rem',
                  borderRadius: 13,
                  background: 'var(--neu-bg)',
                  boxShadow: '3px 3px 8px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)',
                  display: 'flex', alignItems: 'center', gap: 9,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--neu-accent)', color: 'var(--neu-btn-text, fff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                  }}>
                    {displayInitial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--neu-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--neu-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Đăng xuất"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neu-text-muted)', padding: 3, flexShrink: 0 }}
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </aside>

            {/* Mobile sidebar drawer */}
            <aside
              className="md:hidden"
              style={{
                position: 'fixed',
                top: 82,
                left: sidebarMobileOpen ? 0 : -248,
                width: 232,
                height: 'calc(100vh - 82px)',
                background: 'var(--neu-bg)',
                boxShadow: '4px 0 16px var(--neu-shadow-dark)',
                display: 'flex', flexDirection: 'column',
                padding: '1rem 0.55rem',
                zIndex: 41,
                transition: 'left 0.25s ease',
                overflowY: 'auto',
              }}
            >
              <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {sidebarItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    onClick={() => setSidebarMobileOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0.6rem 0.85rem', borderRadius: 11,
                      textDecoration: 'none',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.865rem',
                      color: isActive ? 'var(--neu-accent)' : 'var(--neu-text-muted)',
                      background: isActive ? 'var(--neu-bg-card)' : 'transparent',
                      boxShadow: isActive
                        ? 'inset 3px 3px 7px var(--neu-shadow-dark), inset -3px -3px 7px var(--neu-shadow-light)'
                        : 'none',
                    })}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>

            {/* Mobile FAB */}
            <button
              className="md:hidden"
              onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
              style={{
                position: 'fixed', bottom: 24, left: 16, zIndex: 50,
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--neu-accent)', color: 'var(--neu-btn-text, fff)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '4px 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </>
        )}

        <main className="relative z-10 flex-1 w-full" style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* FOOTER */}
      <AppFooter />
    </div>
  );
};

export default MainLayout;