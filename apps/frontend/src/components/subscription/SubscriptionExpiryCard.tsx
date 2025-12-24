import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionExpiryCardProps {
  className?: string;
}

const SubscriptionExpiryCard: React.FC<SubscriptionExpiryCardProps> = ({ className = "" }) => {
  const { subscriptionData, isPremium, planName, loading } = useSubscription();

  if (loading || !isPremium) {
    return null;
  }

  const subscription = subscriptionData?.subscription;
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  
  if (!expiryDate) {
    return null;
  }

  const now = new Date();
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining <= 30; // Warning if less than 30 days
  const isExpired = daysRemaining <= 0;

  // Get activation date from subscription data or calculate from expiry
  const getActivationDate = () => {
    // Try to get from subscription data first
    const subscriptionAny = subscription as any;
    if (subscriptionAny?.created_at) {
      return new Date(subscriptionAny.created_at);
    }
    
    // If not available, calculate from expiry date (subtract 1 year)
    const activationDate = new Date(expiryDate);
    activationDate.setFullYear(activationDate.getFullYear() - 1);
    return activationDate;
  };

  const activationDate = getActivationDate();

  const getStatusColor = () => {
    if (isExpired) return 'from-red-500 to-red-600';
    if (isExpiringSoon) return 'from-orange-500 to-orange-600';
    return 'from-green-500 to-green-600';
  };

  const getStatusIcon = () => {
    if (isExpired) return '❌';
    if (isExpiringSoon) return '⚠️';
    return '✅';
  };

  const getStatusText = () => {
    if (isExpired) return 'Đã hết hạn';
    if (isExpiringSoon) return 'Sắp hết hạn';
    return 'Đang hoạt động';
  };

  // Calculate usage percentage (days used / total days)
  const totalDays = 365;
  const daysUsed = totalDays - Math.max(0, daysRemaining);
  const usagePercentage = Math.max(0, Math.min(100, (daysUsed / totalDays) * 100));

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${getStatusColor()} p-4`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl">{getStatusIcon()}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">{planName} Plan</h3>
              <p className="text-sm opacity-90">{getStatusText()}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.abs(daysRemaining)}</div>
            <div className="text-xs opacity-90">
              {isExpired ? 'ngày trước' : 'ngày còn lại'}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ngày kích hoạt</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {activationDate.toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ngày hết hạn</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {expiryDate.toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Thời gian sử dụng</span>
            <span>{usagePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className={`mt-4 p-3 rounded-lg ${
          isExpired 
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            : isExpiringSoon 
              ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {isExpired ? '🔒' : isExpiringSoon ? '⏰' : '🎉'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                isExpired 
                  ? 'text-red-900 dark:text-red-100'
                  : isExpiringSoon 
                    ? 'text-orange-900 dark:text-orange-100'
                    : 'text-green-900 dark:text-green-100'
              }`}>
                {isExpired 
                  ? 'Gói đã hết hạn'
                  : isExpiringSoon 
                    ? `Gói sắp hết hạn trong ${daysRemaining} ngày`
                    : `Gói còn hiệu lực ${daysRemaining} ngày`
                }
              </p>
              <p className={`text-xs mt-1 ${
                isExpired 
                  ? 'text-red-700 dark:text-red-300'
                  : isExpiringSoon 
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-green-700 dark:text-green-300'
              }`}>
                {isExpired 
                  ? 'Gia hạn ngay để tiếp tục sử dụng tất cả tính năng Premium'
                  : isExpiringSoon 
                    ? 'Gia hạn sớm để không bị gián đoạn dịch vụ'
                    : 'Bạn có thể tiếp tục sử dụng tất cả tính năng Premium'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Renewal Button */}
        {(isExpired || isExpiringSoon) && (
          <div className="mt-4">
            <button
              onClick={() => window.location.href = '/pricing'}
              className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                isExpired 
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isExpired ? '🔄 Gia hạn ngay' : '⚡ Gia hạn sớm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionExpiryCard;