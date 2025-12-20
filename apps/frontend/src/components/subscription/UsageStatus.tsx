import { useSubscription } from '../../hooks/useSubscription';

interface UsageStatusProps {
  className?: string;
}

const UsageStatus = ({ className = "" }: UsageStatusProps) => {
  const { subscriptionData, loading } = useSubscription();
  const usageData = subscriptionData?.usage || [];

  const getFeatureInfo = (feature: string) => {
    switch (feature) {
      case 'career_view':
        return { name: 'Xem nghề nghiệp', icon: '👔', color: 'blue' };
      case 'assessment':
        return { name: 'Test đánh giá', icon: '📝', color: 'green' };
      case 'roadmap_level':
        return { name: 'Roadmap level', icon: '🗺️', color: 'purple' };
      default:
        return { name: feature, icon: '⭐', color: 'gray' };
    }
  };

  const getProgressColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (usageData.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        📊 Sử dụng tháng này
      </h3>
      
      <div className="space-y-3">
        {usageData.map((usage) => {
          const info = getFeatureInfo(usage.feature);
          const percentage = usage.limit > 0 ? (usage.current_usage / usage.limit) * 100 : 0;
          
          return (
            <div key={usage.feature} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{info.icon}</span>
                  <span className="text-gray-700 dark:text-gray-300">{info.name}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  {usage.current_usage}/{usage.limit > 0 ? usage.limit : '∞'}
                </span>
              </div>
              
              {usage.limit > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(usage.current_usage, usage.limit)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              )}
              
              {usage.remaining === 0 && usage.limit > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Đã hết lượt sử dụng miễn phí
                </p>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Nâng cấp Premium để sử dụng không giới hạn
        </p>
      </div>
    </div>
  );
};

export default UsageStatus;