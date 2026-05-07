import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Settings, FileText,
  Briefcase, Zap, HelpCircle, Activity, ChevronLeft,
  ChevronRight, LogOut, ArrowLeft, Menu, X,
} from 'lucide-react';
import { removeAccessToken } from '../../utils/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/admin',                label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { path: '/admin/users',          label: 'Users',          icon: Users },
  { path: '/admin/payments',       label: 'Thanh toán',     icon: CreditCard },
  { path: '/admin/blogs',          label: 'Blogs',          icon: FileText },
  { path: '/admin/careers',        label: 'Careers',        icon: Briefcase },
  { path: '/admin/skills',         label: 'Skills',         icon: Zap },
  { path: '/admin/questions',      label: 'Questions',      icon: HelpCircle },
  { path: '/admin/ai-monitoring',  label: 'AI Monitor',     icon: Activity },
  { path: '/admin/audit-logs',     label: 'Audit Logs',     icon: FileText },
  { path: '/admin/career-trends',  label: 'Career Trends',  icon: Activity },
  { path: '/admin/anomalies',      label: 'Alerts',         icon: HelpCircle },
  { path: '/admin/data-sync',      label: 'Data Sync',      icon: Zap },
  { path: '/admin/notifications',  label: 'Notifications',  icon: Users },
  { path: '/admin/cv-documents',   label: 'CV Docs',        icon: FileText },
  { path: '/admin/settings',       label: 'Settings',       icon: Settings },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]         = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [showLogout, setShowLogout]       = useState(false);

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => { removeAccessToken(); navigate('/login'); };

  const currentPage = NAV_ITEMS.find(n => isActive(n.path, n.exact))?.label ?? 'Admin';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-base tracking-tight">Admin Panel</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => {
          const active = isActive(path, exact);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${active
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className={`flex-shrink-0 ${active ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`} />
              {!collapsed && <span>{label}</span>}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Back to Site' : undefined}
        >
          <ArrowLeft size={18} className="flex-shrink-0 text-slate-400" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
        <button
          onClick={() => setShowLogout(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition-all ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Đăng xuất' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#f8fafc' }}>

      {/* ── Desktop Sidebar ── fixed position, independent of content ── */}
      <aside
        style={{
          width: collapsed ? 64 : 224,
          minHeight: '100vh',
          background: '#1e1b4b',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          maxHeight: '100vh',
          overflowY: 'auto',
          transition: 'width 0.2s',
          zIndex: 30,
        }}
        className="hidden md:flex"
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ position: 'absolute', right: -12, top: 24, width: 24, height: 24, borderRadius: '50%', background: '#1e1b4b', border: '1px solid #4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer', zIndex: 40 }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Mobile Sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-[#1e1b4b] z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0" style={{ height: 56, position: 'sticky', top: 0, zIndex: 20 }}>
          {/* Mobile menu */}
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <h1 className="text-base font-bold text-gray-800 dark:text-white">{currentPage}</h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300">Admin</span>
          </div>
        </header>

        {/* Page content — scrolls independently */}
        <main style={{ flex: 1, padding: '1.5rem', background: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}
          className="dark:bg-gray-900">
          {children}
        </main>
      </div>

      {/* ── Logout confirm ── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Đăng xuất Admin</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
              Bạn có chắc muốn đăng xuất khỏi trang quản trị không?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-lg shadow-red-600/20"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
