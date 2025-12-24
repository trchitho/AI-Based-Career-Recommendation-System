import { useSubscription } from '../../hooks/useSubscription';

const SubscriptionStatusCard = () => {
  const { subscriptionData, isPremium, planName } = useSubscription();

  const subscription = subscriptionData?.subscription;
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at) : null;

  // Get plan details for styling
  const getPlanDetails = () => {
    const plan = planName?.toLowerCase() || 'free';
    
    if (plan.includes('pro')) {
      return {
        name: 'Pro',
        color: 'from-purple-500 to-pink-500',
        bgColor: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
        borderColor: 'border-purple-200 dark:border-purple-700',
        icon: '👑',
        badge: 'PRO'
      };
    }
    
    if (plan.includes('premium')) {
      return {
        name: 'Premium',
        color: 'from-green-500 to-emerald-500',
        bgColor: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
        borderColor: 'border-green-200 dark:border-green-700',
        icon: '⭐',
        badge: 'PREMIUM'
      };
    }
    
    if (plan.includes('basic') || plan.includes('cơ bản')) {
      return {
        name: 'Basic',
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
        borderColor: 'border-blue-200 dark:border-blue-700',
        icon: '✨',
        badge: 'BASIC'
      };
    }
    
    return {
      name: 'Free',
      color: 'from-gray-400 to-gray-500',
      bgColor: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700',
      borderColor: 'border-gray-200 dark:border-gray-600',
      icon: '🆓',
      badge: 'FREE'
    };
  };

  const planDetails = getPlanDetails();

  return (
    <div className={`bg-gradient-to-br ${planDetails.bgColor} rounded-[24px] p-6 shadow-lg border-2 ${planDetails.borderColor} relative overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className={`w-full h-full bg-gradient-to-br ${planDetails.color} rounded-full blur-2xl`}></div>
      </div>
      
      {/* Premium badge */}
      {isPremium && (
        <div className="absolute -top-2 -right-2">
          <div className={`px-3 py-1 bg-gradient-to-r ${planDetails.color} text-white text-xs font-bold rounded-full shadow-lg transform rotate-12`}>
            {planDetails.badge}
          </div>
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">{planDetails.icon}</span>
            Subscription Status
          </h4>
          
          {isPremium && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-green-600 dark:text-green-400">ACTIVE</span>
            </div>
          )}
        </div>

        {/* Plan info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Plan:</span>
            <span className={`font-bold text-lg bg-gradient-to-r ${planDetails.color} bg-clip-text text-transparent`}>
              {planDetails.name}
            </span>
          </div>

          {isPremium && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
                <span className="text-green-600 dark:text-green-400 font-semibold text-sm">Đã thanh toán</span>
              </div>

              {expiryDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Expires:</span>
                  <span className="text-gray-900 dark:text-white font-semibold text-sm">
                    {expiryDate.toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </>
          )}

          {!isPremium && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Free Plan</span>
            </div>
          )}
        </div>

        {/* Benefits preview */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="space-y-2">
            {isPremium ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Unlimited assessments</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Full career roadmaps</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Priority support</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Limited assessments</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Basic roadmaps only</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4">
          {isPremium ? (
            <button
              onClick={() => window.location.href = '/pricing'}
              className={`w-full px-4 py-2 bg-gradient-to-r ${planDetails.color} hover:shadow-lg text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md text-sm`}
            >
              Manage Subscription
            </button>
          ) : (
            <button
              onClick={() => window.location.href = '/pricing'}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md text-sm"
            >
              Upgrade to Premium ✨
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusCard;