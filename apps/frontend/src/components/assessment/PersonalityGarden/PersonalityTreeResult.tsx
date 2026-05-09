import { useState, useEffect } from 'react';
import { Question } from '../../../types/assessment';
import { TreeGrowthState } from './types/garden.types';
import TreeCanvas from './TreeCanvas';

interface PersonalityTreeResultProps {
  responses: Map<string, string | number>;
  questions: Question[];
  treeGrowth: TreeGrowthState;
  natureEnergy: number;
  growthLevel: number;
  onComplete: () => void;
}

const PersonalityTreeResult: React.FC<PersonalityTreeResultProps> = ({
  responses,
  questions,
  treeGrowth,
  natureEnergy,
  growthLevel,
  onComplete
}) => {
  const [showTree, setShowTree] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Cinematic reveal sequence
    setTimeout(() => setShowTree(true), 500);
    setTimeout(() => setShowStats(true), 2000);
    setTimeout(() => setShowButton(true), 3000);
  }, []);

  return (
    <div className="personality-tree-result relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Magical background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-300 via-pink-200 to-orange-200 dark:from-purple-900 dark:via-pink-900 dark:to-orange-900">
        {/* Animated particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 3}s`
              }}
            >
              <div className="w-2 h-2 bg-yellow-300 rounded-full blur-sm"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl w-full px-4">
        {/* Title */}
        <div className={`text-center mb-8 transition-all duration-1000 ${showTree ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-gradient">
            Your Personality Tree
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300">
            A unique reflection of who you are ✨
          </p>
        </div>

        {/* Tree display */}
        <div className={`mb-8 transition-all duration-1000 ${showTree ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-2 border-white/50">
            <TreeCanvas
              growth={{
                ...treeGrowth,
                height: 100,
                stage: 'personality-tree'
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-all duration-1000 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Questions Answered */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-center">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
          </div>

          {/* Growth Level */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-center">
            <div className="text-3xl mb-2">🌱</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Level {growthLevel}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Growth Level</div>
          </div>

          {/* Nature Energy */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-center">
            <div className="text-3xl mb-2">✨</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{natureEnergy}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Nature Energy</div>
          </div>

          {/* Tree Stage */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-center">
            <div className="text-3xl mb-2">🌳</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Complete</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Fully Grown</div>
          </div>
        </div>

        {/* Achievement badges */}
        <div className={`mb-8 transition-all duration-1000 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              🏆 Achievements Unlocked
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                🌱 Tree Grower
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                ✨ Self-Discovery
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                🎯 Assessment Complete
              </div>
              {growthLevel >= 5 && (
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  🏅 Growth Master
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Continue button */}
        {showButton && (
          <div className="text-center animate-fade-in">
            <button
              onClick={onComplete}
              className="group relative px-12 py-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white text-2xl font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>✨</span>
                <span>View My Analysis</span>
                <span>✨</span>
              </span>
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            </button>

            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Discover your career recommendations and personality insights
            </p>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float-sparkle {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          25% { transform: translate(10px, -10px); opacity: 0.6; }
          50% { transform: translate(-5px, -20px); opacity: 1; }
          75% { transform: translate(-10px, -10px); opacity: 0.6; }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float-sparkle {
          animation: float-sparkle 6s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PersonalityTreeResult;
