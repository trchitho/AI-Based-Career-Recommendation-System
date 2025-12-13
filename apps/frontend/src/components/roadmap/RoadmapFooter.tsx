import { Milestone, UserProgress } from '../../types/roadmap';

interface RoadmapFooterProps {
  milestones: Milestone[];
  userProgress?: UserProgress | undefined;
}

const RoadmapFooter = ({ milestones, userProgress }: RoadmapFooterProps) => {
  return (
    <div className="mt-16 relative">
      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
          50% { box-shadow: 0 0 30px rgba(147, 51, 234, 0.6); }
        }
        @keyframes badge-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        .pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .badge-bounce {
          animation: badge-bounce 2s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 left-20 w-24 h-24 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-xl"></div>
      </div>
      
      {/* Timeline end decoration */}
      <div className="absolute left-8 -top-6 w-0.5 h-6 bg-gradient-to-b from-purple-200 to-transparent dark:from-purple-700"></div>
      <div className="absolute left-6 -top-2 w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg pulse-glow"></div>
      
      {/* Sparkle decorations */}
      <div className="absolute left-4 top-4 text-yellow-400 text-xs animate-pulse">✨</div>
      <div className="absolute right-8 top-8 text-purple-400 text-sm animate-bounce">💫</div>
      <div className="absolute right-16 bottom-16 text-pink-400 text-xs animate-pulse" style={{animationDelay: '1s'}}>⭐</div>
      
      {/* Completion Summary Card */}
      <div className="ml-16 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-700 shadow-xl float-animation pulse-glow">
        <div className="text-center">
          {/* Progress Ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - (userProgress?.completed_milestones?.length || 0) / milestones.length)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {Math.round(((userProgress?.completed_milestones?.length || 0) / milestones.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Completion Stats */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {userProgress?.completed_milestones?.length || 0} / {milestones.length} Milestones Completed
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {userProgress?.completed_milestones?.length === milestones.length 
                ? "🎉 Congratulations! You've completed this learning path!"
                : userProgress?.completed_milestones?.length === 0
                ? "🚀 Ready to start your learning journey?"
                : `💪 Keep going! You're ${Math.round(((userProgress?.completed_milestones?.length || 0) / milestones.length) * 100)}% there!`
              }
            </p>
          </div>

          {/* Achievement Badges */}
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            {userProgress?.completed_milestones?.length === milestones.length && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-semibold shadow-lg badge-bounce">
                <span className="text-lg">🏆</span>
                <span>Path Master</span>
              </div>
            )}
            {(userProgress?.completed_milestones?.length || 0) >= Math.ceil(milestones.length / 2) && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full font-semibold shadow-lg badge-bounce" style={{animationDelay: '0.5s'}}>
                <span className="text-lg">⭐</span>
                <span>Halfway Hero</span>
              </div>
            )}
            {(userProgress?.completed_milestones?.length || 0) >= 1 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-full font-semibold shadow-lg badge-bounce" style={{animationDelay: '1s'}}>
                <span className="text-lg">🎯</span>
                <span>Getting Started</span>
              </div>
            )}
          </div>

          {/* Motivational Quote */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
            <p className="text-gray-700 dark:text-gray-300 italic text-sm">
              {userProgress?.completed_milestones?.length === milestones.length 
                ? "\"Success is not final, failure is not fatal: it is the courage to continue that counts.\" - Winston Churchill"
                : userProgress?.completed_milestones?.length === 0
                ? "\"The journey of a thousand miles begins with one step.\" - Lao Tzu"
                : "\"Progress, not perfection.\" - Keep building your skills one milestone at a time."
              }
            </p>
          </div>

          {/* Next Steps */}
          {userProgress?.completed_milestones?.length !== milestones.length && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🎯 Next Milestone
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {(() => {
                  const nextMilestone = milestones.find(m => 
                    !userProgress?.completed_milestones?.includes(m.order.toString())
                  );
                  return nextMilestone ? nextMilestone.skillName : "All milestones completed!";
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapFooter;