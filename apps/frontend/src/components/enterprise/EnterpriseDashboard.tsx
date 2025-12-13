import { useSubscription } from '../../hooks/useSubscription';

const EnterpriseDashboard = () => {
  const { isPremium, planName } = useSubscription();

  // Only show for Enterprise users
  const isEnterprise = planName?.toLowerCase().includes('enterprise') || planName?.toLowerCase().includes('doanh nghiệp');
  
  if (!isPremium || !isEnterprise) return null;

  const stats = [
    { label: 'Total Users', value: '1,247', icon: '👥', color: 'text-blue-600' },
    { label: 'Active Assessments', value: '89', icon: '📊', color: 'text-green-600' },
    { label: 'API Calls Today', value: '15,432', icon: '🔗', color: 'text-purple-600' },
    { label: 'Success Rate', value: '99.8%', icon: '✅', color: 'text-emerald-600' }
  ];

  const recentActivity = [
    { user: 'Nguyễn Văn A', action: 'Completed Career Assessment', time: '2 minutes ago', type: 'assessment' },
    { user: 'Trần Thị B', action: 'Viewed Roadmap - Software Engineer', time: '5 minutes ago', type: 'roadmap' },
    { user: 'Lê Văn C', action: 'API Integration - User Sync', time: '10 minutes ago', type: 'api' },
    { user: 'Phạm Thị D', action: 'Generated Career Report', time: '15 minutes ago', type: 'report' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assessment': return '📝';
      case 'roadmap': return '🗺️';
      case 'api': return '🔗';
      case 'report': return '📊';
      default: return '📋';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-purple-200 dark:border-purple-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <span className="text-3xl">👑</span>
              Enterprise Dashboard
            </h2>
            <p className="text-purple-100">Tổng quan hoạt động doanh nghiệp</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-100">Last updated</div>
            <div className="font-bold">{new Date().toLocaleTimeString('vi-VN')}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white">
                  <span>{getActivityIcon(activity.type)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{activity.user}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{activity.action}</p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg">
            <div className="text-2xl mb-2">👥</div>
            <div>Manage Users</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg">
            <div className="text-2xl mb-2">📊</div>
            <div>View Reports</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg">
            <div className="text-2xl mb-2">⚙️</div>
            <div>API Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboard;