import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  message: string;
  currentUsage?: number;
  limit?: number;
  className?: string;
}

const UpgradePrompt = ({ 
  feature, 
  message, 
  currentUsage, 
  limit, 
  className = "" 
}: UpgradePromptProps) => {
  const navigate = useNavigate();

  const getFeatureTitle = (feature: string) => {
    switch (feature) {
      case 'career_view':
        return 'Xem Chi Tiết Nghề Nghiệp';
      case 'assessment':
        return 'Làm Bài Test Đánh Giá';
      case 'roadmap_level':
        return 'Xem Roadmap Đầy Đủ';
      default:
        return 'Tính Năng Premium';
    }
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'career_view':
        return '👔';
      case 'assessment':
        return '📝';
      case 'roadmap_level':
        return '🗺️';
      default:
        return '⭐';
    }
  };

  return (
    <div className={`bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="text-3xl">{getFeatureIcon(feature)}</div>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {getFeatureTitle(feature)}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>
          
          {currentUsage !== undefined && limit !== undefined && limit > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span>Đã sử dụng</span>
                <span>{currentUsage}/{limit}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Nâng Cấp Ngay
            </button>
            
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
            >
              Xem Gói Dịch Vụ
            </button>
          </div>
        </div>
      </div>
      
      {/* Premium Features Preview */}
      <div className="mt-6 pt-4 border-t border-orange-200 dark:border-orange-800">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          ✨ Với gói Premium bạn sẽ có:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Xem không giới hạn nghề nghiệp</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Test đánh giá không giới hạn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Roadmap chi tiết tất cả level</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Hỗ trợ ưu tiên 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;