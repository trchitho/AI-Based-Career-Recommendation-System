import { useState } from 'react';

interface Seed {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  gradient: string;
}

interface SeedSelectionProps {
  onSeedSelected: (seed: Seed) => void;
}

const SEEDS: Seed[] = [
  {
    id: 'oak',
    name: 'Oak Seed',
    emoji: '🌰',
    description: 'Strong and steady growth',
    color: '#8D6E63',
    gradient: 'from-amber-700 to-amber-900'
  },
  {
    id: 'maple',
    name: 'Maple Seed',
    emoji: '🍁',
    description: 'Vibrant and colorful',
    color: '#D32F2F',
    gradient: 'from-red-500 to-orange-600'
  },
  {
    id: 'cherry',
    name: 'Cherry Seed',
    emoji: '🌸',
    description: 'Beautiful blossoms',
    color: '#EC407A',
    gradient: 'from-pink-400 to-pink-600'
  },
  {
    id: 'pine',
    name: 'Pine Seed',
    emoji: '🌲',
    description: 'Evergreen and resilient',
    color: '#388E3C',
    gradient: 'from-green-600 to-green-800'
  },
  {
    id: 'willow',
    name: 'Willow Seed',
    emoji: '🌿',
    description: 'Graceful and flowing',
    color: '#7CB342',
    gradient: 'from-lime-500 to-green-600'
  }
];

const SeedSelection: React.FC<SeedSelectionProps> = ({ onSeedSelected }) => {
  const [selectedSeed, setSelectedSeed] = useState<Seed | null>(null);
  const [isPlanting, setIsPlanting] = useState(false);

  const handleSeedClick = (seed: Seed) => {
    setSelectedSeed(seed);
  };

  const handlePlant = () => {
    if (!selectedSeed) return;
    
    setIsPlanting(true);
    
    // Animation: seed falls and plants
    setTimeout(() => {
      onSeedSelected(selectedSeed);
    }, 2000);
  };

  return (
    <div className="seed-selection relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-green-100 to-emerald-200 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20">
        {/* Floating particles */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/30 animate-float-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl w-full px-6">
        {!isPlanting ? (
          <>
            {/* Title */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
                🌱 Choose Your Seed
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Select a seed to begin your personality garden journey
              </p>
            </div>

            {/* Seed Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-8">
              {SEEDS.map((seed, index) => (
                <button
                  key={seed.id}
                  onClick={() => handleSeedClick(seed)}
                  className={`group relative p-6 rounded-3xl transition-all duration-300 ${
                    selectedSeed?.id === seed.id
                      ? 'scale-110 shadow-2xl ring-4 ring-white'
                      : 'hover:scale-105 hover:shadow-xl'
                  }`}
                  style={{
                    animation: `fadeInUp 0.6s ease-out forwards`,
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0
                  }}
                >
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${seed.gradient} rounded-3xl opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                  
                  {/* Glow effect */}
                  {selectedSeed?.id === seed.id && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${seed.gradient} rounded-3xl blur-xl opacity-50 animate-pulse`}></div>
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <span className="text-6xl drop-shadow-lg transform group-hover:scale-110 transition-transform">
                      {seed.emoji}
                    </span>
                    <span className="text-white font-bold text-sm text-center">
                      {seed.name}
                    </span>
                    <span className="text-white/80 text-xs text-center leading-tight">
                      {seed.description}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {selectedSeed?.id === seed.id && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected seed info */}
            {selectedSeed && (
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-block bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl px-8 py-4 shadow-xl">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    You selected: <span className="font-bold text-xl">{selectedSeed.emoji} {selectedSeed.name}</span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {selectedSeed.description}
                  </p>
                </div>
              </div>
            )}

            {/* Plant button */}
            {selectedSeed && (
              <div className="text-center animate-fade-in">
                <button
                  onClick={handlePlant}
                  className="group relative px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <span>🌱</span>
                    <span>Plant Your Seed</span>
                    <span>→</span>
                  </span>
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                </button>
              </div>
            )}
          </>
        ) : (
          /* Planting Animation */
          <div className="text-center">
            <div className="relative inline-block">
              {/* Seed falling animation */}
              <div className="text-8xl animate-seed-fall">
                {selectedSeed?.emoji}
              </div>
              
              {/* Ground */}
              <div className="mt-8 w-64 h-4 bg-gradient-to-r from-amber-700 to-amber-900 rounded-full mx-auto"></div>
              
              {/* Sparkles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-2xl animate-sparkle"
                  style={{
                    left: `${50 + (Math.random() - 0.5) * 100}%`,
                    top: `${50 + (Math.random() - 0.5) * 100}%`,
                    animationDelay: `${i * 0.2}s`
                  }}
                >
                  ✨
                </div>
              ))}
            </div>
            
            <p className="mt-8 text-2xl font-bold text-gray-800 dark:text-white animate-pulse">
              Planting your {selectedSeed?.name}...
            </p>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -10px); }
          50% { transform: translate(-5px, -20px); }
          75% { transform: translate(-10px, -10px); }
        }
        
        @keyframes seed-fall {
          0% {
            transform: translateY(-200px) rotate(0deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(0) rotate(360deg);
            opacity: 1;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-float-slow {
          animation: float-slow 15s ease-in-out infinite;
        }
        
        .animate-seed-fall {
          animation: seed-fall 2s ease-out forwards;
        }
        
        .animate-sparkle {
          animation: sparkle 1.5s ease-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SeedSelection;
export type { Seed };
