import { ReactNode } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle";
import LanguageSwitcher from "../LanguageSwitcher";
import { useAppSettings } from "../../contexts/AppSettingsContext";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const app = useAppSettings();

  const navLinks = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/assessment", label: t("nav.assessment") },
    { to: "/blog", label: t("nav.blogs") },
    { to: "/careers", label: t("nav.careers") },
    { to: "/profile", label: t("nav.profile") },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900 transition-colors duration-300">

      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-purple-600 rounded-full blur-3xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-400 rounded-full blur-3xl opacity-5 animate-pulse delay-500"></div>
      </div>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-[999999] bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* LEFT: Logo */}
            <div className="flex items-center gap-6">

              {/* Logo + App Name */}
              <div className="flex items-center gap-3 mr-6 whitespace-nowrap">
                {app.logo_url ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
                    <img
                      src={app.logo_url}
                      alt={app.app_title || "Logo"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                )}

                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {app.app_title || "CareerBridge AI"}
                </span>
              </div>


              {/* NAV LINKS (CSS Thay đổi theo bản bạn thích) */}
              <div className="hidden md:flex gap-3 whitespace-nowrap ml-3">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `relative px-4 py-2 text-gray-700 dark:text-gray-300 capitalize
                       hover:text-gray-900 dark:hover:text-white transition-all duration-300
                       after:content-[''] after:absolute after:left-0 after:bottom-0 
                       after:h-[2px] after:w-0 after:bg-purple-600 after:transition-all after:duration-300
                       hover:after:w-full
                       ${isActive
                        ? "font-bold text-purple-700 dark:text-purple-300 after:w-full"
                        : ""
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}

                {/* ADMIN BUTTON */}
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className="px-3 py-2 border border-purple-400/40 rounded-lg text-purple-600 dark:text-purple-200 hover:bg-purple-500/10 text-sm font-medium"
                  >
                    Admin
                  </NavLink>
                )}
              </div>
            </div>

            {/* RIGHT CONTROLS */}
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ThemeToggle />

              {user?.email && (
                <span className="text-gray-700 dark:text-gray-300 text-sm hidden sm:block">
                  {user.email}
                </span>
              )}

              <button
                onClick={handleLogout}
                className="min-w-[120px] px-4 py-2 
             bg-gray-200/50 dark:bg-gray-700/50 
             hover:bg-gray-300/50 dark:hover:bg-gray-700 
             text-gray-700 dark:text-gray-300 
             hover:text-gray-900 dark:hover:text-white 
             rounded-lg transition-all duration-200 
             flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>

                <span className="truncate">{t("common.logout")}</span>
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <main className="relative z-10 flex-1">{children}</main>

      {/* FOOTER */}
      <footer className="relative z-10 mt-12 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-700 dark:text-gray-100 text-left">
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

export default MainLayout;
