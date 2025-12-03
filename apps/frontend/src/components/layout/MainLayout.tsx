import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle";
import LanguageSwitcher from "../LanguageSwitcher";
import { useAppSettings } from "../../contexts/AppSettingsContext";
import AppLogo from "../common/AppLogo";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const { t } = useTranslation();
  const app = useAppSettings();

  const navLinks = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/assessment", label: t("nav.assessment") },
    { to: "/blog", label: t("nav.blogs") },
    { to: "/careers", label: t("nav.careers") },
    { to: "/profile", label: t("nav.profile") },
    { to: "/pricing", label: "Pricing" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5EFE7] dark:bg-gray-900 transition-colors duration-300">

      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-64 h-64 -top-32 -left-32 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-50"></div>
        <div className="absolute w-96 h-96 top-20 right-10 bg-[#D4C4B0] dark:bg-gray-800 rounded-full opacity-30"></div>
        <div className="absolute w-48 h-48 bottom-20 left-1/4 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-40"></div>
      </div>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-[999999] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* LEFT: Logo + Nav */}
            <div className="flex items-center space-x-6">
              <AppLogo size="sm" showText={true} linkTo="/home" className="flex-shrink-0" />

              {/* NAV LINKS */}
              <div className="hidden md:flex space-x-1">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `px-3 py-2 text-sm rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-[#4A7C59] dark:bg-green-600 text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* RIGHT CONTROLS */}
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <ThemeToggle />

              {user?.email && (
                <span className="text-gray-700 dark:text-gray-300 text-sm hidden lg:block max-w-[150px] truncate">
                  {user.email}
                </span>
              )}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="px-3 py-2 bg-[#4A7C59]/20 dark:bg-green-600/20 text-[#4A7C59] dark:text-green-400 border border-[#4A7C59]/50 dark:border-green-600/50 rounded-lg hover:bg-[#4A7C59]/30 dark:hover:bg-green-600/30 transition-colors text-xs font-medium hidden xl:block"
                >
                  Admin
                </NavLink>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200 flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">{t("common.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <main className="relative z-10 flex-1">{children}</main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-gray-300 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-gray-800 dark:text-gray-100 text-left">
          {app.footer_html ? (
            <div className="app-footer" dangerouslySetInnerHTML={{ __html: app.footer_html }} />
          ) : (
            <div>© 2025 CareerBridge AI</div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
