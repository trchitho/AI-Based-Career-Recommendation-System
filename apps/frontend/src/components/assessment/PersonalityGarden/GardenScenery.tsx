import { useState, useEffect } from 'react';
import { TreeGrowthState } from './types/garden.types';

interface GardenSceneryProps {
  timeOfDay: 'morning' | 'noon' | 'afternoon' | 'evening';
  isAnswering: boolean;
  treeGrowth: TreeGrowthState;
}

const GardenScenery: React.FC<GardenSceneryProps> = ({ timeOfDay, isAnswering, treeGrowth }) => {
  const [gardenerMood, setGardenerMood] = useState<'neutral' | 'happy'>('neutral');

  // Gardener becomes happy when answering
  useEffect(() => {
    if (isAnswering) {
      setGardenerMood('happy');
      const timer = setTimeout(() => {
        setGardenerMood('neutral');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAnswering]);

  // Get grass color based on time of day
  const getGrassColor = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'from-green-400 to-green-500';
      case 'noon':
        return 'from-green-500 to-green-600';
      case 'afternoon':
        return 'from-green-600 to-green-700';
      case 'evening':
        return 'from-green-700 to-green-800';
      default:
        return 'from-green-500 to-green-600';
    }
  };

  return (
    <>
      {/* Clouds and Birds - IN MIDDLE OF SCREEN */}
      <div className="absolute top-0 left-0 right-0 h-screen pointer-events-none z-5">
        {/* Clouds - HIGH IN SKY (8%-18% from top) */}
        <div className="absolute top-[8%] left-12 text-5xl animate-float filter drop-shadow-lg" style={{ animationDuration: '20s', opacity: 0.7 }}>
          ☁️
        </div>
        <div className="absolute top-[10%] right-24 text-6xl animate-float filter drop-shadow-lg" style={{ animationDuration: '25s', animationDelay: '5s', opacity: 0.65 }}>
          ☁️
        </div>
        <div className="absolute top-[12%] left-1/3 text-4xl animate-float filter drop-shadow-lg" style={{ animationDuration: '30s', animationDelay: '10s', opacity: 0.6 }}>
          ☁️
        </div>
        <div className="absolute top-[14%] right-1/3 text-5xl animate-float filter drop-shadow-lg" style={{ animationDuration: '22s', animationDelay: '3s', opacity: 0.68 }}>
          ☁️
        </div>
        <div className="absolute top-[16%] left-2/3 text-4xl animate-float filter drop-shadow-lg" style={{ animationDuration: '28s', animationDelay: '7s', opacity: 0.62 }}>
          ☁️
        </div>

        {/* Birds flying - HIGH IN SKY (15%-22% from top) */}
        <div className="absolute top-[15%] left-1/4 text-3xl animate-bird-fly z-20 filter drop-shadow-lg" style={{ animationDuration: '15s' }}>
          🐦
        </div>
        <div className="absolute top-[18%] right-1/3 text-2xl animate-bird-fly z-20 filter drop-shadow-lg" style={{ animationDuration: '18s', animationDelay: '3s' }}>
          🕊️
        </div>
        <div className="absolute top-[20%] left-1/2 text-2xl animate-bird-fly z-20 filter drop-shadow-lg" style={{ animationDuration: '20s', animationDelay: '6s' }}>
          🐦
        </div>
        <div className="absolute top-[22%] left-2/3 text-xl animate-bird-fly z-20 filter drop-shadow-lg" style={{ animationDuration: '16s', animationDelay: '9s' }}>
          🕊️
        </div>

        {/* Butterflies - ABOVE TREE AREA (30%-40% from top) */}
        {timeOfDay !== 'evening' && (
          <>
            <div className="absolute top-[30%] left-1/4 text-3xl animate-butterfly z-15 filter drop-shadow-xl" style={{ animationDuration: '8s' }}>
              🦋
            </div>
            <div className="absolute top-[35%] right-1/3 text-2xl animate-butterfly z-15 filter drop-shadow-xl" style={{ animationDuration: '10s', animationDelay: '2s' }}>
              🦋
            </div>
          </>
        )}

        {/* Fireflies at evening - BRIGHT */}
        {timeOfDay === 'evening' && (
          <>
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 bg-yellow-300 rounded-full animate-pulse shadow-2xl z-20"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${30 + Math.random() * 40}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  boxShadow: '0 0 20px rgba(253, 224, 71, 0.8), 0 0 40px rgba(253, 224, 71, 0.6)'
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Ground elements - AT BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 h-64 overflow-visible pointer-events-none z-5">
      {/* Ground/Grass - VISIBLE */}
      <div className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t ${getGrassColor()} z-5`}>
        {/* Grass blades */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-1.5 bg-green-800"
            style={{
              left: `${Math.random() * 100}%`,
              height: `${20 + Math.random() * 30}px`,
              transform: `rotate(${-20 + Math.random() * 40}deg)`,
              opacity: 0.8
            }}
          />
        ))}
      </div>

      {/* Background trees (left side) - MORE TREES */}
      <div className="absolute left-8 bottom-32 z-5 transform translate-y-0">
        <div className="text-9xl filter drop-shadow-2xl">🌳</div>
      </div>

      <div className="absolute left-24 bottom-32 z-5 transform translate-y-0">
        <div className="text-7xl filter drop-shadow-xl">🌲</div>
      </div>

      <div className="absolute left-40 bottom-32 z-5 transform translate-y-0">
        <div className="text-8xl filter drop-shadow-xl">🌳</div>
      </div>
      
      <div className="absolute left-56 bottom-32 z-5 transform translate-y-0">
        <div className="text-6xl filter drop-shadow-xl">🌲</div>
      </div>

      <div className="absolute left-72 bottom-32 z-5 transform translate-y-0">
        <div className="text-7xl filter drop-shadow-xl">🌳</div>
      </div>

      <div className="absolute left-96 bottom-32 z-5 transform translate-y-0">
        <div className="text-8xl filter drop-shadow-xl">🌲</div>
      </div>

      {/* Background trees (right side) - MORE TREES */}
      <div className="absolute right-8 bottom-32 z-5 transform translate-y-0">
        <div className="text-9xl filter drop-shadow-2xl">🌳</div>
      </div>

      <div className="absolute right-24 bottom-32 z-5 transform translate-y-0">
        <div className="text-7xl filter drop-shadow-xl">🌲</div>
      </div>

      <div className="absolute right-40 bottom-32 z-5 transform translate-y-0">
        <div className="text-8xl filter drop-shadow-xl">🌳</div>
      </div>
      
      <div className="absolute right-56 bottom-32 z-5 transform translate-y-0">
        <div className="text-6xl filter drop-shadow-xl">🌲</div>
      </div>

      <div className="absolute right-72 bottom-32 z-5 transform translate-y-0">
        <div className="text-7xl filter drop-shadow-xl">🌳</div>
      </div>

      <div className="absolute right-96 bottom-32 z-5 transform translate-y-0">
        <div className="text-8xl filter drop-shadow-xl">🌲</div>
      </div>

      {/* Flower plants with stems - ADJUSTED to new grass height */}
      <div className="absolute left-16 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          {/* Stem at bottom, touching grass */}
          <div className="w-1 h-12 bg-green-700"></div>
          {/* Flower on top of stem */}
          <div className="text-3xl animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>
            🌸
          </div>
        </div>
      </div>
      
      <div className="absolute left-36 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-10 bg-green-700"></div>
          <div className="text-2xl animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>
            🌼
          </div>
        </div>
      </div>
      
      <div className="absolute left-52 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-11 bg-green-700"></div>
          <div className="text-2xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.2s' }}>
            🌷
          </div>
        </div>
      </div>
      
      <div className="absolute left-72 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-9 bg-green-700"></div>
          <div className="text-xl animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.8s' }}>
            🌹
          </div>
        </div>
      </div>
      
      <div className="absolute right-20 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-12 bg-green-700"></div>
          <div className="text-3xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.2s' }}>
            🌺
          </div>
        </div>
      </div>
      
      <div className="absolute right-44 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-10 bg-green-700"></div>
          <div className="text-2xl animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3.8s' }}>
            🌻
          </div>
        </div>
      </div>
      
      <div className="absolute right-64 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-11 bg-green-700"></div>
          <div className="text-2xl animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '3.3s' }}>
            🌸
          </div>
        </div>
      </div>
      
      <div className="absolute right-80 bottom-32 z-15 filter drop-shadow-lg">
        <div className="flex flex-col-reverse items-center">
          <div className="w-1 h-9 bg-green-700"></div>
          <div className="text-xl animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.6s' }}>
            🌼
          </div>
        </div>
      </div>

      {/* Bushes - MORE BUSHES */}
      <div className="absolute left-48 bottom-32 text-6xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute left-64 bottom-32 text-5xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute left-80 bottom-32 text-6xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute left-1/3 bottom-32 text-5xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute right-48 bottom-32 text-6xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute right-64 bottom-32 text-5xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute right-80 bottom-32 text-6xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>
      <div className="absolute right-1/3 bottom-32 text-5xl z-15 filter drop-shadow-xl transform translate-y-0">🌿</div>

      {/* Fence/Border decoration - LYING ON GRASS SURFACE */}
      {/* Standing logs - slightly above grass */}
      <div className="absolute left-4 bottom-28 text-5xl z-10 filter drop-shadow-lg">🪵</div>
      <div className="absolute right-4 bottom-28 text-5xl z-10 filter drop-shadow-lg">🪵</div>
      
      {/* Logs lying on ground - horizontal, TOUCHING GRASS TOP */}
      <div className="absolute left-20 bottom-28 text-4xl z-10 filter drop-shadow-lg transform rotate-90" style={{ marginBottom: '-1rem' }}>🪵</div>
      <div className="absolute left-1/3 bottom-28 text-3xl z-10 filter drop-shadow-lg transform rotate-90" style={{ marginBottom: '-0.75rem' }}>🪵</div>
      <div className="absolute right-1/4 bottom-28 text-4xl z-10 filter drop-shadow-lg transform rotate-90" style={{ marginBottom: '-1rem' }}>🪵</div>
      <div className="absolute right-16 bottom-28 text-3xl z-10 filter drop-shadow-lg transform rotate-90" style={{ marginBottom: '-0.75rem' }}>🪵</div>
      
      {/* Some logs at different angles, TOUCHING GRASS TOP */}
      <div className="absolute left-1/2 -translate-x-32 bottom-28 text-3xl z-10 filter drop-shadow-lg transform rotate-45" style={{ marginBottom: '-0.75rem' }}>🪵</div>
      <div className="absolute left-1/2 translate-x-32 bottom-28 text-3xl z-10 filter drop-shadow-lg transform -rotate-45" style={{ marginBottom: '-0.75rem' }}>🪵</div>

      {/* Gardener Character (User) - MAXIMUM VISIBILITY */}
      <div className="absolute left-1/4 bottom-44 z-50 flex items-center gap-4" style={{ pointerEvents: 'auto' }}>
        <div className={`transition-all duration-500 ${isAnswering ? 'scale-125' : 'scale-100'}`}>
          {/* Character - HUGE AND CLEAR */}
          <div className="relative">
            <div className="text-9xl filter drop-shadow-2xl" style={{ 
              WebkitTextStroke: '2px white',
              textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.6)'
            }}>
              {gardenerMood === 'happy' ? '🧑‍🌾' : '👨‍🌾'}
            </div>
            
            {/* Happy animation when answering */}
            {isAnswering && (
              <>
                {/* Hearts floating up */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-float-up text-4xl filter drop-shadow-xl">
                  ❤️
                </div>
                <div className="absolute -top-20 left-1/3 animate-float-up text-3xl filter drop-shadow-xl" style={{ animationDelay: '0.2s' }}>
                  💚
                </div>
                <div className="absolute -top-18 left-2/3 animate-float-up text-3xl filter drop-shadow-xl" style={{ animationDelay: '0.4s' }}>
                  💛
                </div>
              </>
            )}
          </div>

          {/* Gardener tools */}
          <div className="absolute -right-12 top-8 text-5xl transform rotate-45 filter drop-shadow-xl">
            🪴
          </div>
        </div>

        {/* Gardener label - to the right of gardener */}
        <div className="self-end mb-8">
          <div className="bg-white dark:bg-gray-800 px-5 py-2.5 rounded-full text-base font-black text-green-600 dark:text-green-400 shadow-2xl border-4 border-green-400 inline-flex items-center gap-2">
            <span className="text-xl">👤</span>
            <span>Bạn</span>
          </div>
        </div>
      </div>
      
      {/* Tree Stage Indicator - in the sky area, centered, higher */}
      <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-5 py-2.5 rounded-full text-base font-bold text-gray-700 dark:text-gray-300 shadow-xl border-2 border-white/50">
          {treeGrowth.stage === 'seed' && '🌱 Hạt Giống'}
          {treeGrowth.stage === 'sprout' && '🌱 Mầm Non'}
          {treeGrowth.stage === 'seedling' && '🌿 Cây Con'}
          {treeGrowth.stage === 'young-plant' && '🌿 Cây Non'}
          {treeGrowth.stage === 'young-tree' && '🌳 Cây Trẻ'}
          {treeGrowth.stage === 'blooming-tree' && '🌸 Cây Nở Hoa'}
          {treeGrowth.stage === 'personality-tree' && '✨ Cây Tính Cách'}
        </div>
      </div>

      {/* Watering can (when watering) - VERY VISIBLE */}
      {isAnswering && (
        <div className="absolute left-1/4 bottom-56 animate-bounce z-50">
          <div className="text-6xl filter drop-shadow-2xl">🚿</div>
        </div>
      )}

      {/* Ground Animals - WALKING ON GRASS - VERY SLOW */}
      {/* Rabbit hopping */}
      <div className="absolute bottom-32 z-20 animate-walk-ground text-5xl filter drop-shadow-xl" style={{ animationDuration: '60s' }}>
        🐰
      </div>
      
      {/* Fox walking */}
      <div className="absolute bottom-32 z-20 animate-walk-ground text-5xl filter drop-shadow-xl" style={{ animationDuration: '70s', animationDelay: '15s' }}>
        🦊
      </div>
      
      {/* Cat walking */}
      <div className="absolute bottom-32 z-20 animate-walk-ground text-5xl filter drop-shadow-xl" style={{ animationDuration: '65s', animationDelay: '20s' }}>
        🐱
      </div>
      
      {/* Dog running */}
      <div className="absolute bottom-32 z-20 animate-walk-ground text-5xl filter drop-shadow-xl" style={{ animationDuration: '55s', animationDelay: '25s' }}>
        🐕
      </div>
      
      {/* Frog hopping */}
      <div className="absolute bottom-32 z-20 animate-walk-ground text-4xl filter drop-shadow-xl" style={{ animationDuration: '68s', animationDelay: '30s' }}>
        🐸
      </div>
      
      {/* Turtle walking slowly */}
      <div className="absolute bottom-32 z-20 animate-walk-ground text-4xl filter drop-shadow-xl" style={{ animationDuration: '80s', animationDelay: '10s' }}>
        🐢
      </div>

      {/* Squirrels - ONLY on left side trees that work correctly */}
      {/* Left side squirrels - only these 2 are positioned correctly */}
      <div className="absolute left-8 bottom-40 z-20 animate-bounce text-4xl filter drop-shadow-xl" style={{ animationDuration: '2s', animationDelay: '0s' }}>
        🐿️
      </div>
      <div className="absolute left-24 bottom-38 z-20 animate-bounce text-3xl filter drop-shadow-xl" style={{ animationDuration: '2.3s', animationDelay: '0.8s' }}>
        🐿️
      </div>
      
      {/* Hedgehogs UNDER trees on ground */}
      <div className="absolute left-60 bottom-32 z-20 animate-pulse text-4xl filter drop-shadow-xl" style={{ animationDuration: '3s', animationDelay: '0s' }}>
        🦔
      </div>
      <div className="absolute left-80 bottom-32 z-20 animate-pulse text-3xl filter drop-shadow-xl" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
        🦔
      </div>
      <div className="absolute right-48 bottom-32 z-20 animate-pulse text-4xl filter drop-shadow-xl" style={{ animationDuration: '3.2s', animationDelay: '0.5s' }}>
        🦔
      </div>
      <div className="absolute right-68 bottom-32 z-20 animate-pulse text-3xl filter drop-shadow-xl" style={{ animationDuration: '3.8s', animationDelay: '1.2s' }}>
        🦔
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1.8);
            opacity: 0;
          }
        }
        
        @keyframes butterfly {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(50px, -40px) rotate(20deg);
          }
          50% {
            transform: translate(100px, 0) rotate(-20deg);
          }
          75% {
            transform: translate(50px, 40px) rotate(20deg);
          }
        }
        
        @keyframes bird-fly {
          0% {
            transform: translateX(-100px) translateY(0) scaleX(1);
          }
          25% {
            transform: translateX(25vw) translateY(-20px) scaleX(1);
          }
          50% {
            transform: translateX(50vw) translateY(10px) scaleX(-1);
          }
          75% {
            transform: translateX(75vw) translateY(-15px) scaleX(-1);
          }
          100% {
            transform: translateX(100vw) translateY(0) scaleX(-1);
          }
        }
        
        @keyframes walk-ground {
          0% {
            left: -100px;
            transform: scaleX(1);
          }
          15% {
            left: 15%;
            transform: scaleX(1);
          }
          20% {
            left: 15%;
            transform: scaleX(1) translateY(-10px);
          }
          25% {
            left: 15%;
            transform: scaleX(1) translateY(0);
          }
          30% {
            left: 15%;
            transform: scaleX(1);
          }
          45% {
            left: 50%;
            transform: scaleX(-1);
          }
          55% {
            left: 50%;
            transform: scaleX(-1);
          }
          60% {
            left: 50%;
            transform: scaleX(-1) translateY(-10px);
          }
          65% {
            left: 50%;
            transform: scaleX(-1) translateY(0);
          }
          70% {
            left: 50%;
            transform: scaleX(-1);
          }
          85% {
            left: 85%;
            transform: scaleX(-1);
          }
          90% {
            left: 85%;
            transform: scaleX(-1) translateY(-10px);
          }
          95% {
            left: 85%;
            transform: scaleX(-1) translateY(0);
          }
          100% {
            left: calc(100% + 100px);
            transform: scaleX(-1);
          }
        }
        
        .animate-float-up {
          animation: float-up 1.8s ease-out forwards;
        }
        
        .animate-butterfly {
          animation: butterfly 8s ease-in-out infinite;
        }
        
        .animate-bird-fly {
          animation: bird-fly 15s linear infinite;
        }
        
        .animate-walk-ground {
          animation: walk-ground 15s linear infinite;
        }
      `}</style>
      </div>
    </>
  );
};

export default GardenScenery;
