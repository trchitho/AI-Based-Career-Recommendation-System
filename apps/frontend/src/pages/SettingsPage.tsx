import MainLayout from '../components/layout/MainLayout';
import { useAppTheme } from '../hooks/useAppTheme';
import { motion } from 'framer-motion';

const SettingsPage = () => {
  const { mode, setThemeMode, isLight } = useAppTheme();

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] py-10 px-4 bg-surface-primary dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-x-hidden font-['Plus_Jakarta_Sans']">
        
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="max-w-3xl mx-auto relative z-10">

          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center sm:text-left"
          >
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Cài đặt hệ thống</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Tuỳ chỉnh giao diện theo sở thích của bạn</p>
          </motion.div>

          {/* Theme Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-[24px] p-8 border border-white/40 dark:border-gray-700/50 shadow-xl"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chế độ hiển thị</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Chọn chế độ sáng hoặc tối để thay đổi toàn bộ không gian làm việc.</p>

            {/* Theme Toggle Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setThemeMode('light')}
                className={`flex-1 flex items-center gap-4 p-5 rounded-[20px] transition-all duration-300 ${isLight ? 'bg-white/60 dark:bg-gray-800/60 shadow-lg border-2 border-indigo-500' : 'glass border border-white/40 dark:border-gray-700/50 hover:shadow-md'}`}
              >
                <span className="text-3xl drop-shadow-md">☀️</span>
                <div className="text-left flex-1">
                  <div className="font-bold text-[15px] text-gray-900 dark:text-white">Chế độ Sáng</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Giao diện nguyên bản</div>
                </div>
                {isLight && (
                  <motion.div layoutId="activeTheme" className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setThemeMode('dark')}
                className={`flex-1 flex items-center gap-4 p-5 rounded-[20px] transition-all duration-300 ${!isLight ? 'bg-white/60 dark:bg-gray-800/60 shadow-lg border-2 border-indigo-500' : 'glass border border-white/40 dark:border-gray-700/50 hover:shadow-md'}`}
              >
                <span className="text-3xl drop-shadow-md">🌙</span>
                <div className="text-left flex-1">
                  <div className="font-bold text-[15px] text-gray-900 dark:text-white">Chế độ Tối</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Dịu mắt ban đêm</div>
                </div>
                {!isLight && (
                  <motion.div layoutId="activeTheme" className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 glass rounded-[24px] p-8 border border-white/40 dark:border-gray-700/50 shadow-xl"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mô phỏng Giao diện</h2>
            <div className="flex flex-wrap gap-4 items-center p-6 bg-white/30 dark:bg-black/20 rounded-2xl border border-white/20 dark:border-white/5">
              {/* Card preview */}
              <div className="glass px-6 py-3 rounded-xl text-sm font-semibold border border-white/40 shadow-sm text-gray-800 dark:text-gray-200">
                Khối nội dung (Glass)
              </div>
              {/* Accent button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-colors"
              >
                Nút thao tác chính
              </motion.button>
              {/* Outline button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Nút phụ
              </motion.button>
            </div>
          </motion.div>

        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
