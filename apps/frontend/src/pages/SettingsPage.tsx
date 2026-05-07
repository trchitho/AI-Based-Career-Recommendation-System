import MainLayout from '../components/layout/MainLayout';
import { useAppTheme } from '../hooks/useAppTheme';

const SettingsPage = () => {
  const { mode, setThemeMode, isLight } = useAppTheme();

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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Chế độ hiển thị</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Chọn chế độ sáng hoặc tối</p>

            {/* Theme Toggle Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setThemeMode('light')}
                className="flex-1 flex items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: isLight ? 'var(--neu-bg)' : 'var(--neu-bg-card)',
                  boxShadow: isLight
                    ? 'inset 4px 4px 9px var(--neu-shadow-dark), inset -4px -4px 9px var(--neu-shadow-light)'
                    : '4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light)',
                  color: 'var(--neu-text)',
                }}
              >
                <span className="text-2xl">☀️</span>
                <div className="text-left">
                  <div className="font-semibold">Sáng</div>
                  <div className="text-xs opacity-70">Giao diện sáng</div>
                </div>
                {isLight && (
                  <div
                    className="ml-auto w-2 h-2 rounded-full"
                    style={{ background: 'var(--neu-accent)' }}
                  />
                )}
              </button>

              <button
                onClick={() => setThemeMode('dark')}
                className="flex-1 flex items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: !isLight ? 'var(--neu-bg)' : 'var(--neu-bg-card)',
                  boxShadow: !isLight
                    ? 'inset 4px 4px 9px var(--neu-shadow-dark), inset -4px -4px 9px var(--neu-shadow-light)'
                    : '4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light)',
                  color: 'var(--neu-text)',
                }}
              >
                <span className="text-2xl">🌙</span>
                <div className="text-left">
                  <div className="font-semibold">Tối</div>
                  <div className="text-xs opacity-70">Giao diện tối</div>
                </div>
                {!isLight && (
                  <div
                    className="ml-auto w-2 h-2 rounded-full"
                    style={{ background: 'var(--neu-accent)' }}
                  />
                )}
              </button>
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
