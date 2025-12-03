import { ReactNode, useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle";
import LanguageSwitcher from "../LanguageSwitcher";
import { useAppSettings } from "../../contexts/AppSettingsContext";
import AppLogo from "../common/AppLogo";
import NotificationCenter from "../notifications/NotificationCenter";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const { t } = useTranslation();
  const app = useAppSettings();

  // State cho Dropdown User
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { to: "/dashboard", label: "Dashboard" },
    { to: "/assessment", label: "Assessment" },
    { to: "/blog", label: "Blog" },
    { to: "/careers", label: "Careers" },
    { to: "/pricing", label: "Pricing" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Lấy tên hiển thị
  const displayName = user?.email?.split('@')[0] || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white transition-colors duration-300">

      {/* CSS Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 h-[72px] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">

          {/* Logo */}
          <div className="flex-shrink-0">
            <AppLogo />
          </div>

          {/* Menu chính giữa (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[15px] font-semibold transition-colors duration-200 ${isActive
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Khu vực bên phải */}
          <div className="flex items-center gap-4">

            {/* Utilities Group */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-gray-700">
              <LanguageSwitcher />
              <ThemeToggle />

              {user && (
                <div className="ml-1">
                  <NotificationCenter />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="hidden lg:inline-flex px-3 py-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
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
                    <div className="w-9 h-9 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm border border-transparent group-hover:border-green-200 transition-all">
                      {displayInitial}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-bold max-w-[100px] truncate leading-none">{displayName}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Dropdown Content */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right z-50">

                      {/* User Info Header inside Dropdown */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>

                      {/* Settings Link (To Profile) */}
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Settings & Profile
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
                        Logout
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
                  <NavLink to="/assessment" className="text-[15px] font-bold bg-green-600 text-white px-6 py-2.5 rounded-full hover:bg-green-700 shadow-lg shadow-green-600/20 hover:-translate-y-0.5 transition-all duration-200">
                    Get started
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="relative z-10 flex-1 w-full">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10 bg-white dark:bg-gray-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6 scale-90 opacity-80 hover:opacity-100 transition-opacity">
            <AppLogo />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {app.footer_html ? (
              <span dangerouslySetInnerHTML={{ __html: app.footer_html }} />
            ) : (
              "© 2025 CareerBridge AI. All rights reserved."
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;