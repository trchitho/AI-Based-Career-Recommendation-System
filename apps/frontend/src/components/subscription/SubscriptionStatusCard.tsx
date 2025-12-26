import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { useUsageTracking } from '../../hooks/useUsageTracking';

interface SubscriptionStatusCardProps {
  className?: string;
  showUpgradeButton?: boolean;
}

const SubscriptionStatusCard = ({
  className = "",
  showUpgradeButton = true
}: SubscriptionStatusCardProps) => {
  const navigate = useNavigate();
  const { subscriptionData, isPremium, planName, loading } = useSubscription();
  const { currentPlan, hasFeature } = useFeatureAccess();
  const { usageData } = useUsageTracking();

  // Use real usage data from tracking hook
  const getUsageData = () => {
    const backendUsage = subscriptionData?.usage || [];

    // If backend provides usage data, use it
    if (backendUsage.length > 0) {
      return backendUsage;
    }

    // Otherwise, use frontend tracking data
    return usageData;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const subscription = subscriptionData?.subscription;
  const usage = getUsageData(); // Use our generated usage data

  // Get expiry info
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const isExpiringSoon = expiryDate && expiryDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`p-6 ${isPremium
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200 dark:border-green-800'
        : 'bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium
              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
              : 'bg-gradient-to-br from-gray-400 to-blue-400 text-white'
              }`}>
              {isPremium ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <h3 className={`font-bold ${isPremium
                ? 'text-green-900 dark:text-green-100'
                : 'text-gray-900 dark:text-white'
                }`}>
                {isPremium ? `${planName} Plan` : 'Free Plan'}
              </h3>
              <p className={`text-sm ${isPremium
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-600 dark:text-gray-400'
                }`}>
                {isPremium ? 'Full access to all features' : 'Limited access'}
              </p>
            </div>
          </div>

          {isPremium && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                PREMIUM
              </span>
              {expiryDate && (
                <div className="mt-1">
                  <p className={`text-xs ${isExpiringSoon
                    ? 'text-orange-600 dark:text-orange-400 font-semibold'
                    : 'text-green-600 dark:text-green-400'
                    }`}>
                    {isExpiringSoon ? 'Expiring soon: ' : 'Expires: '}
                    {expiryDate.toLocaleDateString('en-US')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ({Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="p-6">
        {isPremium ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
              Unlimited Access
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              You have unlimited access to all Premium features
            </p>
          </div>
        ) : (
          <>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              {currentPlan === 'free' ? 'Free' : currentPlan === 'basic' ? 'Basic' : 'Premium'} Plan Limits
            </h4>

            {usage.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                  Unlimited Access
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  You have unlimited access to all features
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {usage.map((item) => {
                  const percentage = item.limit > 0 ? (item.current_usage / item.limit) * 100 : 0;
                  const isNearLimit = percentage >= 80;
                  const isAtLimit = item.current_usage >= item.limit && item.limit > 0;

                  const getFeatureInfo = (feature: string) => {
                    switch (feature) {
                      case 'career_view':
                        return {
                          name: 'Career View',
                          icon: null,
                          description: currentPlan === 'free' ? 'View only 1 career' :
                            currentPlan === 'basic' ? 'View 5 best matching careers' :
                              'Full career catalog'
                        };
                      case 'assessment':
                        return {
                          name: 'Assessments',
                          icon: null,
                          description: currentPlan === 'free' ? '5 tests/month' :
                            currentPlan === 'basic' ? '20 tests/month' :
                              'Unlimited tests'
                        };
                      case 'roadmap_level':
                        return {
                          name: 'Roadmap Level',
                          icon: null,
                          description: currentPlan === 'free' ? 'Level 1 only' :
                            currentPlan === 'basic' ? 'Level 1-2 access' :
                              'All levels access'
                        };
                      default:
                        return { name: feature, icon: null, description: '' };
                    }
                  };

                  const info = getFeatureInfo(item.feature);

                  return (
                    <div key={item.feature} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {info.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {info.description}
                            </span>
                          </div>
                        </div>
                        <span className={`font-semibold ${isAtLimit
                          ? 'text-red-600 dark:text-red-400'
                          : isNearLimit
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-600 dark:text-gray-400'
                          }`}>
                          {item.current_usage}/{item.limit > 0 ? item.limit : '∞'}
                        </span>
                      </div>

                      {item.limit > 0 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${isAtLimit
                              ? 'bg-red-500'
                              : isNearLimit
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                              }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      )}

                      {isAtLimit && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Free usage limit reached
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upgrade CTA */}
      {!isPremium && showUpgradeButton && (
        <div className="px-6 pb-6">
          <button
            onClick={() => navigate('/pricing')}
            className={`w-full px-4 py-3 font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 ${currentPlan === 'free'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
              : currentPlan === 'basic'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>
              {currentPlan === 'free'
                ? 'Upgrade to Basic (99k)'
                : currentPlan === 'basic'
                  ? 'Upgrade to Premium (299k)'
                  : 'Upgrade to Pro (499k)'
              }
            </span>
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            {currentPlan === 'free'
              ? 'From 99k (Basic) - 299k (Premium) - 499k (Pro)'
              : currentPlan === 'basic'
                ? 'Premium 299k or Pro 499k with AI Assistant'
                : 'Pro 499k with AI Assistant and premium features'
            }
          </p>
        </div>
      )}

      {/* Renewal reminder for premium users */}
      {isPremium && isExpiringSoon && (
        <div className="px-6 pb-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 text-sm">
                  Premium plan expiring soon
                </h4>
                <p className="text-orange-700 dark:text-orange-300 text-xs">
                  Renew now to continue using all Premium features
                </p>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded transition-colors"
              >
                Renew
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatusCard;