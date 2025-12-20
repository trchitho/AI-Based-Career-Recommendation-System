import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface SubscriptionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

const SubscriptionBadge = ({ className = "", showDetails = false }: SubscriptionBadgeProps) => {
  const { subscriptionData, isPremium, planName, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'pro':
        return 'from-purple-500 to-pink-500';
      case 'premium':
        return 'from-orange-500 to-red-500';
      case 'basic':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'pro':
        return '👑';
      case 'premium':
        return '⭐';
      case 'basic':
        return '🚀';
      default:
        return '🆓';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Plan Badge */}
      <div 
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-bold bg-gradient-to-r ${getPlanColor(planName)} shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105`}
        onClick={() => navigate('/pricing')}
      >
        <span className="text-xs">{getPlanIcon(planName)}</span>
        <span>{planName}</span>
        {!isPremium && (
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </div>

      {/* Expiry Info for Premium Users */}
      {isPremium && subscriptionData?.subscription?.expires_at && showDetails && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Expires: {new Date(subscriptionData.subscription.expires_at).toLocaleDateString()}
        </div>
      )}

      {/* Usage Summary for Free Users */}
      {!isPremium && showDetails && subscriptionData?.usage && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          {subscriptionData.usage.map((usage, index) => {
            if (usage.limit <= 0) return null;
            
            const percentage = (usage.current_usage / usage.limit) * 100;
            const isNearLimit = percentage >= 80;
            
            return (
              <div key={index} className={`flex items-center gap-1 ${isNearLimit ? 'text-orange-500' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
                <span>{usage.current_usage}/{usage.limit}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubscriptionBadge;