import MainLayout from '../components/layout/MainLayout';
import { useAppTheme, APP_THEMES } from '../hooks/useAppTheme';

const SettingsPage = () => {
  const { themeId, selectTheme } = useAppTheme();

  return (
    <MainLayout>
      <div className="min-h-screen py-10 px-4" style={{ background: 'var(--neu-bg)' }}>
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Cài đặt</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Tuỳ chỉnh giao diện theo sở thích của bạn</p>
          </div>

          {/* Theme Section */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'var(--neu-bg-card)',
              boxShadow: '6px 6px 16px var(--neu-shadow-dark), -6px -6px 16px var(--neu-shadow-light)',
            }}
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Màu nền & giao diện</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Chọn theme áp dụng cho toàn bộ trang web</p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {APP_THEMES.map((theme) => {
                const isSelected = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    onClick={() => selectTheme(theme.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: theme.vars['--neu-bg'],
                      boxShadow: isSelected
                        ? `0 0 0 2.5px ${theme.vars['--neu-accent']}, 4px 4px 10px ${theme.vars['--neu-shadow-dark']}, -4px -4px 10px ${theme.vars['--neu-shadow-light']}`
                        : `4px 4px 10px ${theme.vars['--neu-shadow-dark']}, -4px -4px 10px ${theme.vars['--neu-shadow-light']}`,
                    }}
                  >
                    <span className="text-2xl">{theme.emoji}</span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: theme.vars['--neu-text'] }}
                    >
                      {theme.name}
                    </span>
                    {isSelected && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: theme.vars['--neu-accent'] }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div
            className="mt-6 rounded-2xl p-6"
            style={{
              background: 'var(--neu-bg-card)',
              boxShadow: '6px 6px 16px var(--neu-shadow-dark), -6px -6px 16px var(--neu-shadow-light)',
            }}
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Xem trước</h2>
            <div className="flex flex-wrap gap-3">
              {/* Raised button preview */}
              <div
                className="px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: 'var(--neu-bg-card)',
                  boxShadow: '4px 4px 9px var(--neu-shadow-dark), -4px -4px 9px var(--neu-shadow-light)',
                  color: 'var(--neu-text)',
                }}
              >
                Nút nổi
              </div>
              {/* Inset button preview */}
              <div
                className="px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: 'var(--neu-bg)',
                  boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
                  color: 'var(--neu-accent)',
                }}
              >
                Đang chọn
              </div>
              {/* Accent button */}
              <div
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--neu-accent)' }}
              >
                Accent
              </div>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
