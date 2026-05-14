interface NatureEnergyBarProps {
  natureEnergy: number;
  growthLevel: number;
  bloomChain: number;
  progress: number;
  questionNumber: number;
  totalQuestions: number;
}

const NatureEnergyBar: React.FC<NatureEnergyBarProps> = ({
  natureEnergy,
  growthLevel,
  bloomChain,
  progress,
  questionNumber,
  totalQuestions
}) => {
  const energyForNextLevel = growthLevel * 100;
  const currentLevelEnergy = natureEnergy % 100;

  return (
    <div className="nature-energy-bar bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border-2 border-white/50">
      <div className="flex items-center justify-between gap-4">
        {/* Growth Level Badge */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {growthLevel}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
              🌱
            </div>
          </div>
          
          {/* Energy Progress */}
          <div className="flex-1 min-w-[150px]">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              <span>Cấp Độ {growthLevel}</span>
              <span>{currentLevelEnergy} / 100</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 transition-all duration-500 relative"
                style={{ width: `${currentLevelEnergy}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloom Chain */}
        {bloomChain > 0 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
            <span>🌸</span>
            <span>{bloomChain}x Chuỗi</span>
          </div>
        )}

        {/* Question Progress */}
        <div className="text-right">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Câu hỏi {questionNumber}/{totalQuestions}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(progress)}% Hoàn thành
          </div>
        </div>

        {/* Total Nature Energy */}
        <div className="text-right">
          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {natureEnergy}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Năng Lượng Tự Nhiên
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mt-3 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default NatureEnergyBar;
