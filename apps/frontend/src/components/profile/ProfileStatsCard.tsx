import { useSubscription } from '../../hooks/useSubscription';

interface ProfileStatsCardProps {
  assessmentCount?: number;
}

const ProfileStatsCard = ({ assessmentCount = 0 }: ProfileStatsCardProps) => {
  const { isPremium } = useSubscription();

  const stats = [
    {
      label: 'Assessments Taken',
      value: assessmentCount,
      icon: '📊',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Career Matches',
      value: assessmentCount > 0 ? Math.min(assessmentCount * 5, 25) : 0,
      icon: '🎯',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Roadmaps Viewed',
      value: assessmentCount > 0 ? Math.min(assessmentCount * 2, 10) : 0,
      icon: '🗺️',
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  const achievements = [
    {
      name: 'First Assessment',
      description: 'Completed your first career assessment',
      icon: '🏆',
      unlocked: assessmentCount >= 1,
      color: 'from-yellow-400 to-orange-500'
    },
    {
      name: 'Career Explorer',
      description: 'Completed 3 assessments',
      icon: '🌟',
      unlocked: assessmentCount >= 3,
      color: 'from-blue-400 to-purple-500'
    },
    {
      name: 'Premium Member',
      description: 'Upgraded to Premium plan',
      icon: '💎',
      unlocked: isPremium,
      color: 'from-green-400 to-emerald-500'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
        Your Progress
      </h4>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</span>
            </div>
            <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="space-y-3">
        <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Achievements
        </h5>
        
        {achievements.map((achievement, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              achievement.unlocked 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 opacity-60'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              achievement.unlocked 
                ? `bg-gradient-to-r ${achievement.color} shadow-lg` 
                : 'bg-gray-200 dark:bg-gray-600'
            }`}>
              <span className={`text-lg ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
                {achievement.icon}
              </span>
            </div>
            
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                achievement.unlocked 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {achievement.name}
              </p>
              <p className={`text-xs ${
                achievement.unlocked 
                  ? 'text-gray-600 dark:text-gray-300' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {achievement.description}
              </p>
            </div>
            
            {achievement.unlocked && (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress encouragement */}
      {assessmentCount === 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Start your journey!
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Take your first assessment to unlock achievements
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/assessment'}
            className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md text-sm"
          >
            Take Assessment
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileStatsCard;