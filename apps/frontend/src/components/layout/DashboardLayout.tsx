// components/layout/DashboardLayout.tsx
import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from './MainLayout';

interface DashboardLayoutProps {
  children: ReactNode;
}

const sidebarItems = [
  // Removed "Tổng quan" - Dashboard link already exists in top navigation
  // {
  //   label: 'Tổng quan',
  //   to: '/dashboard',
  //   icon: (
  //     <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
  //         d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  //     </svg>
  //   ),
  // },
  {
    label: 'Phân tích kỹ năng',
    to: '/skill-gap',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Learning Roadmap',
    to: '/careers',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    label: 'Nghề nghiệp',
    to: '/recommendations',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Thanh toán',
    to: '/pricing',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: 'Bài viết',
    to: '/blog',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    to: '/profile',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = user?.email?.split('@')[0] || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <MainLayout>
      <div className="db-shell" style={{ display: 'flex', minHeight: 'calc(100vh - 82px)', position: 'relative' }}>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div
            className="db-overlay"
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          style={{
            width: collapsed ? 64 : 240,
            minWidth: collapsed ? 64 : 240,
            transition: 'width 0.25s ease, min-width 0.25s ease',
            background: 'var(--neu-bg)',
            boxShadow: '4px 0 16px var(--neu-shadow-dark)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem 0',
            position: 'sticky',
            top: 82,
            height: 'calc(100vh - 82px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            zIndex: 30,
          }}
          className="db-sidebar hidden md:flex"
        >
          {/* Collapse toggle */}
          <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: '0 0.75rem 1rem' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 30, height: 30,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--neu-bg)',
                boxShadow: '3px 3px 8px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)',
                color: 'var(--neu-text-muted)',
                transition: 'all 0.2s',
              }}
              title={collapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 0.6rem' }}>
            {sidebarItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '0.65rem' : '0.65rem 0.9rem',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--neu-accent)' : 'var(--neu-text-muted)',
                  background: isActive ? 'var(--neu-bg-card)' : 'transparent',
                  boxShadow: isActive
                    ? 'inset 3px 3px 7px var(--neu-shadow-dark), inset -3px -3px 7px var(--neu-shadow-light)'
                    : 'none',
                  transition: 'all 0.18s ease',
                })}
                title={collapsed ? item.label : undefined}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          {!collapsed && (
            <div style={{
              margin: '1rem 0.6rem 0',
              padding: '0.85rem 0.9rem',
              borderRadius: 14,
              background: 'var(--neu-bg)',
              boxShadow: '3px 3px 8px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 34, height: 34,
                borderRadius: '50%',
                background: 'var(--neu-accent)',
                color: 'var(--neu-btn-text, #fff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem',
                flexShrink: 0,
              }}>
                {displayInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--neu-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--neu-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neu-text-muted)', padding: 4, flexShrink: 0 }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </aside>

        {/* Mobile sidebar */}
        <aside
          style={{
            position: 'fixed',
            top: 82,
            left: mobileOpen ? 0 : -260,
            width: 240,
            height: 'calc(100vh - 82px)',
            background: 'var(--neu-bg)',
            boxShadow: '4px 0 16px var(--neu-shadow-dark)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem 0.6rem',
            zIndex: 41,
            transition: 'left 0.25s ease',
            overflowY: 'auto',
          }}
          className="db-sidebar-mobile md:hidden"
        >
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sidebarItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.65rem 0.9rem',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
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

        {/* Mobile toggle button */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed',
            bottom: 24,
            left: 16,
            zIndex: 50,
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'var(--neu-accent)',
            color: 'var(--neu-btn-text, #fff)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '4px 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </MainLayout>
  );
};

export default DashboardLayout;
