import { useSubscription } from '../../hooks/useSubscription';

const PremiumBenefitsCard = () => {
  const { isPremium: isUserPremium, planName } = useSubscription();

  if (!isUserPremium) return null;

  const isPro = planName?.toLowerCase().includes('pro');
  const isPremium = planName?.toLowerCase().includes('premium');

  const benefits = [
    {
      icon: '🚀',
      title: 'Unlimited Assessments',
      description: isPro ? 'Không giới hạn bài kiểm tra' : (isPremium ? 'Không giới hạn bài kiểm tra' : 'Tối đa 20 bài kiểm tra/tháng'),
      active: true
    },
    {
      icon: '🎯',
      title: 'Career Recommendations',
      description: isPro ? 'Toàn bộ danh mục nghề nghiệp' : (isPremium ? 'Toàn bộ danh mục nghề nghiệp' : '5 nghề nghiệp phù hợp nhất'),
      active: true
    },
    {
      icon: '🗺️',
      title: 'Learning Roadmaps',
      description: isPro ? 'Lộ trình đầy đủ + cá nhân hóa' : (isPremium ? 'Lộ trình học tập đầy đủ' : 'Lộ trình cơ bản (Level 1-2)'),
      active: true
    },
    {
      icon: '🧠',
      title: 'AI Analysis',
      description: isPro ? 'Phân tích AI chuyên sâu' : (isPremium ? 'Phân tích AI chi tiết tính cách & tiềm năng' : 'Phân tích tóm tắt RIASEC & Big Five'),
      active: true
    },
    {
      icon: '⚡',
      title: 'Priority Support',
      description: isPro ? 'Hỗ trợ ưu tiên 24/7' : (isPremium ? 'Ưu tiên hỗ trợ kỹ thuật và tư vấn' : 'Hỗ trợ thông thường qua Email'),
      active: true
    },
    {
      icon: '🤖',
      title: 'AI Career Assistant',
      description: 'Trợ lý ảo AI 24/7 với Gemini API',
      active: isPremium || isPro
    },
    {
      icon: '📄',
      title: 'PDF Reports',
      description: 'Xuất báo cáo PDF chuyên sâu với biểu đồ RIASEC & Big Five',
      active: isPro
    },
    {
      icon: '📊',
      title: 'Progress Tracking',
      description: 'So sánh lịch sử phát triển qua các lần kiểm tra',
      active: isPro
    },
    {
      icon: '🎓',
      title: 'Course Recommendations',
      description: 'Gợi ý khóa học từ Coursera, LinkedIn Learning',
      active: isPro
    }
  ];

  return (
    <div className={`bg-gradient-to-br ${isPro ? 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20' : 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'} rounded-[24px] p-6 shadow-lg border-2 ${isPro ? 'border-purple-200 dark:border-purple-700' : 'border-green-200 dark:border-green-700'} relative overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className={`w-full h-full bg-gradient-to-br ${isPro ? 'from-purple-400 to-pink-500' : 'from-green-400 to-emerald-500'} rounded-full blur-2xl`}></div>
      </div>
      
      {/* Premium badge */}
      <div className="absolute -top-2 -right-2">
        <div className={`px-3 py-1 bg-gradient-to-r ${isPro ? 'from-purple-500 to-pink-500' : 'from-green-500 to-emerald-500'} text-white text-xs font-bold rounded-full shadow-lg transform rotate-12`}>
          {isPro ? 'PRO' : 'PREMIUM'}
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-r ${isPro ? 'from-purple-500 to-pink-500' : 'from-green-500 to-emerald-500'} rounded-full flex items-center justify-center shadow-lg`}>
            <span className="text-2xl">{isPro ? '👑' : '✨'}</span>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-lg">
              {isPro ? 'Pro Benefits' : 'Premium Benefits'}
            </h4>
            <p className={`${isPro ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'} text-sm font-medium`}>
              You're enjoying all {planName} features
            </p>
          </div>
        </div>

        {/* Benefits grid */}
        <div className="space-y-3">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                benefit.active 
                  ? `bg-white/70 dark:bg-gray-800/70 border ${isPro ? 'border-purple-200 dark:border-purple-700' : 'border-green-200 dark:border-green-700'}` 
                  : 'bg-gray-100/50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 opacity-60'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                benefit.active 
                  ? `bg-gradient-to-r ${isPro ? 'from-purple-500 to-pink-500' : 'from-green-500 to-emerald-500'} shadow-lg` 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <span className={`text-lg ${benefit.active ? 'text-white' : 'text-gray-500'}`}>
                  {benefit.icon}
                </span>
              </div>
              
              <div className="flex-1">
                <h5 className={`font-semibold text-sm ${
                  benefit.active 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {benefit.title}
                </h5>
                <p className={`text-xs mt-1 ${
                  benefit.active 
                    ? 'text-gray-600 dark:text-gray-300' 
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {benefit.description}
                </p>
              </div>
              
              {benefit.active && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Upgrade hint for Premium users */}
        {!isPro && (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Want even more features?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Upgrade to Pro for advanced analytics and more assessments
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/pricing?view=all'}
              className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md text-sm"
            >
              Explore Pro ✨
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumBenefitsCard;