import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';

interface PremiumFeatureShowcaseProps {
  className?: string;
  compact?: boolean;
}

const PremiumFeatureShowcase = ({ className = "", compact = false }: PremiumFeatureShowcaseProps) => {
  const navigate = useNavigate();
  const { isPremium, planName } = useSubscription();

  if (isPremium) {
    return (
      <div className={`bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
              🎉 {planName} Active
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Bạn đang tận hưởng tất cả tính năng Premium. Cảm ơn bạn đã tin tưởng!
            </p>
          </div>
          <div className="text-green-600 dark:text-green-400">
            <span className="text-2xl">⭐</span>
          </div>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: '🔓',
      title: 'Xem tất cả nghề nghiệp',
      description: 'Truy cập không giới hạn hàng trăm nghề nghiệp và lộ trình chi tiết',
      color: 'text-blue-600'
    },
    {
      icon: '📝',
      title: 'Test không giới hạn',
      description: 'Làm bài đánh giá tính cách và năng lực bao nhiêu lần cũng được',
      color: 'text-green-600'
    },
    {
      icon: '🗺️',
      title: 'Roadmap đầy đủ 6 levels',
      description: 'Học từ cơ bản đến chuyên gia với tài liệu và bài tập thực hành',
      color: 'text-purple-600'
    },
    {
      icon: '🎯',
      title: 'Phân tích AI chuyên sâu',
      description: 'Nhận insights cá nhân hóa và gợi ý phát triển sự nghiệp',
      color: 'text-orange-600'
    }
  ];

  if (compact) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white">
              <span className="text-lg">✨</span>
            </div>
            <div>
              <h4 className="font-bold text-purple-900 dark:text-purple-100">
                Mở khóa Premium
              </h4>
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                Truy cập đầy đủ tất cả tính năng
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Nâng cấp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-3xl p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-bold mb-4">
          <span className="text-lg">✨</span>
          PREMIUM FEATURES
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Mở khóa toàn bộ tiềm năng của bạn
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Nâng cấp Premium để truy cập không giới hạn tất cả tính năng và nhận được hỗ trợ cá nhân hóa
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-start gap-4">
              <div className="text-3xl">{feature.icon}</div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Nâng cấp Premium ngay</span>
          <span className="text-lg">🚀</span>
        </button>
        
        <p className="text-purple-600 dark:text-purple-400 text-sm mt-4 font-medium">
          💝 Chỉ từ 299,000đ/tháng - Hủy bất cứ lúc nào
        </p>
      </div>
    </div>
  );
};

export default PremiumFeatureShowcase;