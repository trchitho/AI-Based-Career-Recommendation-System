import { useState } from 'react';

interface PlantingIntroProps {
  onComplete: () => void;
}

const PlantingIntro: React.FC<PlantingIntroProps> = ({ onComplete }) => {
  const [isPlanting, setIsPlanting] = useState(false);
  const [showSprout, setShowSprout] = useState(false);

  const handlePlantSeed = () => {
    setIsPlanting(true);
    
    // Animation sequence
    setTimeout(() => {
      setShowSprout(true);
    }, 1500);
    
    setTimeout(() => {
      onComplete();
    }, 3500);
  };

  return (
    <div className="planting-intro relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-green-100 to-emerald-200 dark:from-gray-800 dark:via-green-900/30 dark:to-emerald-900/30">
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-2xl">
        {!isPlanting ? (
          <>
            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-fade-in">
              Vườn Tính Cách Của Bạn
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-12 animate-fade-in-delay">
              Trồng một hạt giống kỳ diệu và xem nó phát triển thành cây đại diện cho tính cách độc đáo của bạn
            </p>

            {/* Seed visualization */}
            <div className="mb-12 animate-bounce-slow">
              <div className="inline-block relative">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full shadow-2xl flex items-center justify-center">
                  <span className="text-4xl">🌱</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>

            {/* Plant button */}
            <button
              onClick={handlePlantSeed}
              className="group relative px-12 py-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white text-2xl font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>🌱</span>
                <span>Trồng Hạt Giống</span>
                <span>🌱</span>
              </span>
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            </button>

            {/* Instructions */}
            <div className="mt-12 space-y-4 text-gray-600 dark:text-gray-400">
              <p className="flex items-center justify-center gap-2">
                <span className="text-2xl">✨</span>
                <span>Trả lời câu hỏi bằng cách nuôi dưỡng cây của bạn</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="text-2xl">🌳</span>
                <span>Xem nó phát triển với mỗi lựa chọn bạn đưa ra</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="text-2xl">🎨</span>
                <span>Khám phá cây tính cách độc đáo của bạn</span>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Planting animation */}
            <div className="relative">
              {/* Soil patch */}
              <div className="w-full max-w-md mx-auto h-32 bg-gradient-to-b from-amber-900 to-amber-950 rounded-t-full relative overflow-hidden">
                {/* Soil texture */}
                <div className="absolute inset-0 opacity-30">
                  {[...Array(50)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-amber-700 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`
                      }}
                    />
                  ))}
                </div>

                {/* Seed dropping */}
                <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-1000 ${isPlanting ? 'top-1/2' : '-top-20'}`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full shadow-xl flex items-center justify-center">
                    <span className="text-2xl">🌱</span>
                  </div>
                  
                  {/* Particle trail */}
                  {isPlanting && (
                    <div className="absolute inset-0">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-amber-400 rounded-full animate-particle-trail"
                          style={{
                            left: '50%',
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Ripple effect */}
                {isPlanting && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-32 h-32 border-4 border-amber-600 rounded-full animate-ripple"></div>
                    <div className="w-32 h-32 border-4 border-amber-600 rounded-full animate-ripple animation-delay-300"></div>
                  </div>
                )}

                {/* Sprout emerging */}
                {showSprout && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-sprout-grow">
                    <div className="relative">
                      {/* Stem */}
                      <div className="w-2 h-16 bg-gradient-to-t from-green-700 to-green-500 mx-auto rounded-t-full"></div>
                      
                      {/* Leaves */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2">
                        <div className="w-8 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full -rotate-45 absolute -left-4"></div>
                        <div className="w-8 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full rotate-45 absolute -right-4"></div>
                      </div>
                      
                      {/* Sparkles */}
                      <div className="absolute inset-0">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-sparkle"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${i * 0.2}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="mt-8 text-2xl font-bold text-green-600 dark:text-green-400 animate-fade-in">
                {!showSprout ? 'Đang trồng hạt giống...' : 'Hành trình của bạn bắt đầu! 🌱'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        
        @keyframes sprout-grow {
          from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        @keyframes particle-trail {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(50px); opacity: 0; }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-fade-in-delay { animation: fade-in-delay 1s ease-out 0.3s both; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-ripple { animation: ripple 1.5s ease-out; }
        .animate-sprout-grow { animation: sprout-grow 1s ease-out; }
        .animate-particle-trail { animation: particle-trail 1s ease-out; }
        .animate-sparkle { animation: sparkle 1.5s ease-in-out infinite; }
        .animation-delay-300 { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
};

export default PlantingIntro;
