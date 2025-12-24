import { useNavigate } from 'react-router-dom';

interface LockedCareerCardProps {
  career: {
    id: string;
    title: string;
    description?: string;
    match_percentage?: number;
  };
  position: number;
  onUpgrade?: () => void;
  className?: string;
}

const LockedCareerCard = ({ 
  career, 
  position, 
  onUpgrade,
  className = "" 
}: LockedCareerCardProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/pricing', {
        state: {
          feature: 'career_view',
          message: 'Nâng cấp Premium để xem tất cả nghề nghiệp và lộ trình học tập chi tiết',
          highlightFeature: 'unlimited_careers'
        }
      });
    }
  };

  return (
    <div className={`relative overflow-hidden border border-purple-200 dark:border-purple-700 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 ${className}`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/50 to-transparent dark:via-purple-800/20 animate-pulse"></div>
      
      {/* Premium badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
          </svg>
          PREMIUM
        </span>
      </div>

      <div className="relative z-10 p-6">
        {/* Career info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mr-4">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">
                #{position}
              </span>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {career.title}
              </h4>
              {career.match_percentage && (
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full font-semibold text-sm">
                  {career.match_percentage}% Match
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Blurred preview */}
        <div className="mb-6 filter blur-sm opacity-60">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            {career.description || 'Khám phá chi tiết về nghề nghiệp này, bao gồm mô tả công việc, yêu cầu kỹ năng, mức lương và cơ hội phát triển...'}
          </p>
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>

        {/* Unlock section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
              </svg>
            </div>
            
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">
              Mở khóa nghề nghiệp này
            </h4>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Xem chi tiết đầy đủ, lộ trình học tập 6 levels và tài liệu chuyên sâu
            </p>

            {/* Premium benefits */}
            <div className="text-left mb-4 space-y-2">
              {[
                'Chi tiết mô tả công việc',
                'Yêu cầu kỹ năng cụ thể',
                'Lộ trình học tập 6 levels',
                'Tài liệu và khóa học đề xuất'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleUpgrade}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Nâng cấp Premium</span>
              <span>✨</span>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
    </div>
  );
};

export default LockedCareerCard;