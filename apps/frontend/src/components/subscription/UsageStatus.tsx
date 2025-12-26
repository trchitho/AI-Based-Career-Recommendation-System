import { useSubscription } from '../../hooks/useSubscription';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useState, useEffect } from 'react';
import { getPaymentHistory, PaymentHistory } from '../../services/paymentService';
import { getAccessToken } from '../../utils/auth';
import RoadmapCapability from './RoadmapCapability';

interface UsageStatusProps {
  className?: string;
}

const UsageStatus = ({ className = "" }: UsageStatusProps) => {
  const { loading } = useSubscription();
  const { usageData } = useUsageTracking();

  // Add payment-based plan detection (same as AssessmentPage)
  const [detectedPlan, setDetectedPlan] = useState<string>('Free');
  const isLoggedIn = !!getAccessToken();

  // Detect user plan from payment history (same logic as PaymentPage)
  const detectUserPlan = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const payments = await getPaymentHistory();
      const successfulPayments = payments.filter((p: PaymentHistory) => p.status === 'success');

      if (successfulPayments.length > 0) {
        const latestPayment = successfulPayments[0];
        const amount = latestPayment?.amount ?? 0;
        const description = latestPayment?.description ?? '';

        if (description.includes('Cơ Bản') ||
          (amount >= 99000 && amount < 250000)) {
          setDetectedPlan('Basic');
        } else if (description.includes('Premium') ||
          (amount >= 250000 && amount < 450000)) {
          setDetectedPlan('Premium');
        } else if (description.includes('Pro') ||
          amount >= 450000) {
          setDetectedPlan('Pro');
        }
      }
    } catch (error) {
      console.error('Failed to detect user plan:', error);
    }
  };

  // Load plan detection on mount
  useEffect(() => {
    if (isLoggedIn) {
      detectUserPlan();
    }
  }, [isLoggedIn]);

  // Enhanced limits based on detected plan
  const getEnhancedLimits = (feature: string, originalLimit: number) => {
    if (detectedPlan === 'Basic') {
      switch (feature) {
        case 'assessment':
          return 20; // Basic plan has 20 assessments
        case 'career_view':
          return 25; // Basic plan can view up to 25 careers (but only 5 per month)
        case 'roadmap_level':
          return 2; // Basic plan can access level 1-2
        default:
          return originalLimit;
      }
    } else if (detectedPlan === 'Premium' || detectedPlan === 'Pro') {
      return -1; // Unlimited for Premium/Pro
    }

    // Free plan defaults
    return originalLimit;
  };

  // Enhanced usage display for Basic plan
  const getEnhancedUsage = (feature: string, originalUsage: number) => {
    if (detectedPlan === 'Basic') {
      switch (feature) {
        case 'career_view':
          // For career_view, show actual usage (how many careers viewed this month)
          return originalUsage; // This will show current usage like 5, 3, etc.
        case 'roadmap_level':
          // For roadmap, show current level accessed, but cap display at limit
          return Math.min(originalUsage, 2);
        default:
          return originalUsage;
      }
    }
    return originalUsage;
  };

  // FIXED: Use actual frontend data instead of forcing to 0
  const getMergedUsageData = () => {
    const frontendData = usageData || [];

    // Use frontend data with proper usage tracking
    if (frontendData.length > 0) {
      return frontendData.map(item => {
        const enhancedLimit = getEnhancedLimits(item.feature, item.limit);
        // Use actual usage from frontend (not forced to 0)
        const enhancedUsage = getEnhancedUsage(item.feature, item.current_usage);
        return {
          ...item,
          current_usage: enhancedUsage,
          limit: enhancedLimit,
          remaining: enhancedLimit > 0 ? Math.max(0, enhancedLimit - enhancedUsage) : -1
        };
      });
    }

    // If no frontend data, return empty (no backend fallback)
    return [];
  };

  const displayUsageData = getMergedUsageData();

  const getFeatureInfo = (feature: string) => {
    switch (feature) {
      case 'career_view':
        return { name: 'Career Views', icon: '👔', color: 'blue' };
      case 'assessment':
        return { name: 'Assessments', icon: '📝', color: 'green' };
      case 'roadmap_level':
        return { name: 'Roadmap Level', icon: '🗺️', color: 'purple' };
      default:
        return { name: feature, icon: '⭐', color: 'gray' };
    }
  };

  const getProgressColor = (usage: number, limit: number, feature: string) => {
    // For career_view in Basic plan, use a more lenient color scheme since it's tracking, not blocking
    if (feature === 'career_view' && detectedPlan === 'Basic' && limit === 25) {
      const percentage = (usage / 25) * 100; // Calculate based on total limit, not monthly
      if (percentage >= 90) return 'bg-orange-500'; // Less alarming than red
      if (percentage >= 70) return 'bg-blue-500';   // Informational blue
      return 'bg-green-500';
    }

    // Default logic for other features
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

  if (displayUsageData.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        📊 Monthly Usage
      </h3>

      <div className="space-y-3">
        {/* Display usage tracking for non-roadmap features */}
        {displayUsageData.filter(usage => usage.feature !== 'roadmap_level').map((usage) => {
          const info = getFeatureInfo(usage.feature);

          // Special handling for career_view in Basic plan
          const displayLimit = usage.limit;
          let percentage = 0;

          if (usage.feature === 'career_view' && detectedPlan === 'Basic' && usage.limit === 25) {
            // Show as X/25 and calculate progress based on total limit (25), not monthly limit
            percentage = (usage.current_usage / usage.limit) * 100;
          } else if (usage.limit > 0) {
            percentage = (usage.current_usage / usage.limit) * 100;
          }

          return (
            <div key={usage.feature} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{info.icon}</span>
                  <span className="text-gray-700 dark:text-gray-300">{info.name}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  {usage.current_usage}/{displayLimit > 0 ? displayLimit : '∞'}
                </span>
              </div>

              {displayLimit > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(usage.current_usage, displayLimit, usage.feature)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              )}

              {usage.remaining === 0 && usage.limit > 0 && detectedPlan === 'Free' && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Free usage limit reached
                </p>
              )}

              {usage.feature === 'career_view' && usage.current_usage >= 5 && usage.limit === 25 && detectedPlan === 'Basic' && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Viewed {usage.current_usage} careers this month. Basic plan allows up to 25 careers
                </p>
              )}

              {usage.current_usage > usage.limit && usage.limit > 0 && usage.feature !== 'career_view' && detectedPlan === 'Basic' && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Basic plan limit exceeded. Upgrade to Premium for unlimited access
                </p>
              )}
            </div>
          );
        })}

        {/* Replace roadmap usage tracking with capability display */}
        <RoadmapCapability />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 {detectedPlan === 'Free'
            ? 'Upgrade to Basic for more usage'
            : detectedPlan === 'Basic'
              ? 'Upgrade to Premium for unlimited access'
              : 'You are on Premium/Pro plan'
          }
        </p>
      </div>
    </div>
  );
};

export default UsageStatus;
