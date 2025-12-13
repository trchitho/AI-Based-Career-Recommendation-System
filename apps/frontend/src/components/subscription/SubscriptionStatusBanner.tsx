import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionStatusBannerProps {
  className?: string;
}

const SubscriptionStatusBanner = ({ className = "" }: SubscriptionStatusBannerProps) => {
  const { subscriptionData, isPremium, planName, loading, refreshSubscription } = useSubscription();

  if (loading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 border ${
      isPremium 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
        : 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800'
    } ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isPremium 
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 text-white'
          }`}>
            {isPremium ? '⭐' : '⚠️'}
          </div>
          
          <div>
            <h4 className={`font-bold text-sm ${
              isPremium 
                ? 'text-green-900 dark:text-green-100'
                : 'text-orange-900 dark:text-orange-100'
            }`}>
              {isPremium ? `${planName} Plan Active` : 'Free Plan'}
            </h4>
            
            <p className={`text-xs ${
              isPremium 
                ? 'text-green-700 dark:text-green-300'
                : 'text-orange-700 dark:text-orange-300'
            }`}>
              {isPremium 
                ? 'Bạn có quyền truy cập đầy đủ tất cả levels'
                : 'Chỉ có thể xem Level 1. Nâng cấp để mở khóa tất cả.'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {subscriptionData?.subscription?.expires_at && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Hết hạn: {new Date(subscriptionData.subscription.expires_at).toLocaleDateString('vi-VN')}
            </div>
          )}
          
          <button
            onClick={refreshSubscription}
            className="px-2 py-1 bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 rounded text-xs transition-colors"
            title="Refresh subscription status"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          <div>Plan: {planName} | Premium: {isPremium ? 'Yes' : 'No'}</div>
          {subscriptionData?.subscription?.limits && (
            <div>
              Roadmap Limit: {subscriptionData.subscription.limits.roadmap_max_level === -1 ? 'Unlimited' : subscriptionData.subscription.limits.roadmap_max_level}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatusBanner;