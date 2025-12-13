import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { checkFeatureAccess } from '../../services/subscriptionService';

interface PremiumGateProps {
  children: ReactNode;
  feature: 'career_view' | 'assessment' | 'roadmap_level';
  level?: number;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

const PremiumGate = ({
  children,
  feature,
  level,
  fallback,
  showUpgradePrompt = true,
  className = ""
}: PremiumGateProps) => {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState<any>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        
        // Premium users always have access
        if (isPremium) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check access for free users
        const result = await checkFeatureAccess(feature, level);
        setHasAccess(result.allowed);
        setAccessInfo(result);
      } catch (error) {
        console.error('Failed to check feature access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [feature, level, isPremium]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  if (!showUpgradePrompt) {
    return null;
  }

  const getFeatureInfo = (feature: string) => {
    switch (feature) {
      case 'career_view':
        return {
          title: 'Xem Chi Tiết Nghề Nghiệp',
          description: 'Truy cập thông tin đầy đủ về nghề nghiệp và lộ trình phát triển',
          icon: '👔',
          benefits: [
            'Mô tả công việc chi tiết',
            'Yêu cầu kỹ năng cụ thể',
            'Mức lương và cơ hội thăng tiến',
            'Lộ trình học tập 6 levels'
          ]
        };
      case 'assessment':
        return {
          title: 'Test Đánh Giá Không Giới Hạn',
          description: 'Làm bài test tính cách và năng lực bao nhiêu lần cũng được',
          icon: '📝',
          benefits: [
            'Test không giới hạn số lần',
            'Phân tích AI chuyên sâu',
            'Báo cáo chi tiết cá nhân hóa',
            'Theo dõi tiến bộ theo thời gian'
          ]
        };
      case 'roadmap_level':
        return {
          title: 'Roadmap Học Tập Đầy Đủ',
          description: 'Truy cập tất cả 6 levels với tài liệu và bài tập chuyên sâu',
          icon: '🗺️',
          benefits: [
            'Tất cả 6 levels học tập',
            'Tài liệu chuyên môn cao',
            'Bài tập thực hành',
            'Cộng đồng học tập Premium'
          ]
        };
      default:
        return {
          title: 'Tính Năng Premium',
          description: 'Nâng cấp để truy cập tính năng này',
          icon: '⭐',
          benefits: ['Truy cập đầy đủ tính năng']
        };
    }
  };

  const featureInfo = getFeatureInfo(feature);

  return (
    <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 text-center ${className}`}>
      {/* Icon */}
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
        <span className="text-2xl text-white">{featureInfo.icon}</span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {featureInfo.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {accessInfo?.reason || featureInfo.description}
      </p>

      {/* Usage info if available */}
      {accessInfo?.current_usage !== undefined && accessInfo?.limit > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Đã sử dụng</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {accessInfo.current_usage}/{accessInfo.limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((accessInfo.current_usage / accessInfo.limit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
          ✨ Với Premium bạn sẽ có:
        </h4>
        <div className="space-y-2">
          {featureInfo.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/pricing')}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Nâng cấp Premium ngay</span>
          <span>🚀</span>
        </button>
        
        <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
          💝 Chỉ từ 299,000đ/tháng - Hủy bất cứ lúc nào
        </p>
      </div>
    </div>
  );
};

export default PremiumGate;