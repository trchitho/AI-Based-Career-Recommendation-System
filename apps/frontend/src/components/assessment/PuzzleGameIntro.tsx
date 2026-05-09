import { useState, useEffect } from 'react';

interface PuzzleGameIntroProps {
  onStart: () => void;
  onCancel: () => void;
}

const PuzzleGameIntro = ({ onStart, onCancel }: PuzzleGameIntroProps) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    // Animate puzzle pieces falling
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 4);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center space-y-8 p-8">
      {/* Game Title */}
      <div className="text-center space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-6xl animate-bounce">🧩</span>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Trò Chơi Xếp Hình
          </h1>
          <span className="text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>🧩</span>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
          Hoàn thành đánh giá nghề nghiệp của bạn bằng cách giải các câu đố tương tác!
        </p>
      </div>

      {/* Animated Game Preview */}
      <div className="relative w-full max-w-3xl h-64 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-700">
        {/* Grid background - Tetris style */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-12 grid-rows-7 h-full">
            {[...Array(84)].map((_, i) => (
              <div key={i} className="border border-gray-600"></div>
            ))}
          </div>
        </div>

        {/* Tetris pieces on grid */}
        <div className="absolute inset-0 flex items-end justify-center p-4">
          {/* Bottom placed pieces - building up */}
          <div className="grid grid-cols-12 gap-0.5 w-full">
            {/* Row 1 - Bottom */}
            {[...Array(12)].map((_, i) => (
              <div
                key={`r1-${i}`}
                className={`aspect-square rounded transition-all duration-500 ${
                  i < 8
                    ? 'bg-gradient-to-br from-cyan-500 to-cyan-700'
                    : 'bg-transparent'
                }`}
              />
            ))}
            {/* Row 2 */}
            {[...Array(12)].map((_, i) => (
              <div
                key={`r2-${i}`}
                className={`aspect-square rounded transition-all duration-500 ${
                  i >= 2 && i < 6
                    ? 'bg-gradient-to-br from-yellow-500 to-yellow-700'
                    : i >= 8 && i < 10
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                    : 'bg-transparent'
                }`}
              />
            ))}
            {/* Falling piece - I shape */}
            {animationStep > 0 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={`falling-${i}`}
                    className="aspect-square rounded bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl"
                    style={{
                      gridColumn: `${4 + i} / span 1`,
                      gridRow: `${Math.min(animationStep, 2)} / span 1`,
                      transition: 'all 0.8s ease-in',
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Line clear effect */}
          {animationStep === 3 && (
            <div className="absolute inset-x-0 bottom-16 h-8 bg-white/30 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 bg-yellow-400 rounded-full animate-ping"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: '50%',
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats display */}
        <div className="absolute top-4 right-4 space-y-2">
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <div className="text-cyan-400 font-bold text-xs">Cấp độ: {Math.floor(animationStep / 2) + 1}</div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <div className="text-yellow-400 font-bold text-xs">Combo: {animationStep}x</div>
          </div>
        </div>
      </div>

      {/* How to Play */}
      <div className="w-full max-w-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          Cách Chơi
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="flex gap-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              1
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Đọc Câu Hỏi</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mỗi câu hỏi đánh giá nghề nghiệp hoặc tính cách của bạn
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              2
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Kéo Mảnh Ghép</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kéo mảnh ghép câu trả lời của bạn vào lưới để đặt
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              3
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Xóa Hàng & Combo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hoàn thành hàng/cột để xóa chúng và tạo combo!
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              4
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Bất Ngờ Bí Mật</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Làm chủ hệ thống combo để mở khóa điều gì đó đặc biệt... 🎁
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
              Cơ Chế Tetris
            </span>
            <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
              Hệ Thống Combo
            </span>
            <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
              Lên Cấp & Vật Phẩm
            </span>
            <span className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-semibold">
              Bất Ngờ Ẩn
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-6 items-center">
        <button
          onClick={onCancel}
          className="px-10 py-5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg"
        >
          Quay Lại
        </button>
        <button
          onClick={onStart}
          className="px-16 py-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50"
        >
          Bắt Đầu Trò Chơi →
        </button>
      </div>

      {/* Estimated Time */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">Thời gian ước tính: 10-12 phút</span>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PuzzleGameIntro;
