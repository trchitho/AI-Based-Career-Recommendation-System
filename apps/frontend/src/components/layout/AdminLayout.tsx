import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Settings, FileText,
  Briefcase, Zap, HelpCircle, Activity,
  LogOut, Menu, X, MessageSquare,
} from 'lucide-react';
import { removeAccessToken } from '../../utils/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/admin',                label: 'Tổng quan',         icon: LayoutDashboard, exact: true },
  { path: '/admin/users',          label: 'Người dùng',        icon: Users },
  { path: '/admin/payments',       label: 'Thanh toán',        icon: CreditCard },
  { path: '/admin/blogs',          label: 'Bài viết',          icon: FileText },
  { path: '/admin/careers',        label: 'Nghề nghiệp',       icon: Briefcase },
  { path: '/admin/skills',         label: 'Kỹ năng',           icon: Zap },
  { path: '/admin/questions',      label: 'Câu hỏi',           icon: HelpCircle },
  { path: '/admin/ai-monitoring',  label: 'Giám sát AI',       icon: Activity },
  { path: '/admin/audit-logs',     label: 'Nhật ký',           icon: FileText },
  { path: '/admin/career-trends',  label: 'Xu hướng nghề',     icon: Activity },
  { path: '/admin/anomalies',      label: 'Cảnh báo',          icon: HelpCircle },
  { path: '/admin/data-sync',      label: 'Đồng bộ dữ liệu',  icon: Zap },
  { path: '/admin/notifications',  label: 'Thông báo',         icon: Users },
  { path: '/admin/cv-documents',   label: 'Tài liệu CV',       icon: FileText },
  { path: '/admin/interview',      label: 'Phỏng vấn',         icon: MessageSquare },
  { path: '/admin/settings',       label: 'Cài đặt',           icon: Settings },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => { removeAccessToken(); navigate('/login'); };

  const currentPage = NAV_ITEMS.find(n => isActive(n.path, n.exact))?.label ?? 'Quản trị';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-base tracking-tight">Quản Trị</span>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${active
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon size={18} className={`flex-shrink-0 ${active ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom - only logout */}
      <div className="px-2 py-3 border-t border-white/10">
        <button
          onClick={() => setShowLogout(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', background: '#f8fafc' }}>

      {/* Desktop Sidebar - fixed width, no collapse */}
      <aside
        style={{
          width: 224,
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
          zIndex: 30,
        }}
        className="hidden md:flex"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[min(84vw,18rem)] bg-[#1e1b4b] z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0" style={{ height: 56, position: 'sticky', top: 0, zIndex: 20 }}>
          <button
            type="button"
            aria-label={mobileOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
            aria-expanded={mobileOpen}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <h1 className="min-w-0 truncate text-base font-bold text-gray-800 dark:text-white">{currentPage}</h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 'clamp(1rem, 3vw, 1.5rem)', background: '#f8fafc', minHeight: 'calc(100vh - 56px)', minWidth: 0, maxWidth: '100%' }}
          className="dark:bg-gray-900">
          {children}
        </main>
      </div>

      {/* Logout confirm */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Đăng xuất</h3>
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
