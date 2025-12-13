import { useSubscription } from '../../hooks/useSubscription';

const EnterpriseRoadmapFeatures = () => {
  const { isPremium, planName } = useSubscription();

  // Only show for Enterprise users
  const isEnterprise = planName?.toLowerCase().includes('enterprise') || planName?.toLowerCase().includes('doanh nghiệp');
  
  if (!isPremium || !isEnterprise) return null;

  return (
    <div className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-8 border-2 border-purple-200 dark:border-purple-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-3xl"></div>
      </div>
      
      {/* Enterprise badge */}
      <div className="absolute -top-3 -right-3">
        <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-lg transform rotate-12 flex items-center gap-2">
          <span className="text-lg">👑</span>
          ENTERPRISE
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            🚀 Enterprise Roadmap Features
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Exclusive features available with your Enterprise subscription
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            {
              icon: '📊',
              title: 'Advanced Analytics',
              description: 'Detailed progress tracking and performance metrics for your team',
              color: 'from-blue-500 to-blue-600'
            },
            {
              icon: '👥',
              title: 'Team Management',
              description: 'Assign roadmaps to team members and track their progress',
              color: 'from-green-500 to-green-600'
            },
            {
              icon: '🎯',
              title: 'Custom Milestones',
              description: 'Create company-specific learning objectives and goals',
              color: 'from-purple-500 to-purple-600'
            },
            {
              icon: '🔗',
              title: 'API Integration',
              description: 'Sync roadmap data with your existing HR systems',
              color: 'from-orange-500 to-orange-600'
            },
            {
              icon: '📈',
              title: 'Completion Reports',
              description: 'Generate detailed reports on learning outcomes',
              color: 'from-pink-500 to-pink-600'
            },
            {
              icon: '🎨',
              title: 'White Labeling',
              description: 'Customize the interface with your company branding',
              color: 'from-indigo-500 to-indigo-600'
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-6 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 hover:shadow-lg">
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center text-white text-xl mb-4 shadow-lg`}>
                {feature.icon}
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg">
            Access Enterprise Dashboard
          </button>
          
          <button className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400 font-bold rounded-xl transition-colors border-2 border-purple-200 dark:border-purple-700">
            Contact Account Manager
          </button>
        </div>

        {/* Support Info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              24/7 Enterprise Support Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseRoadmapFeatures;