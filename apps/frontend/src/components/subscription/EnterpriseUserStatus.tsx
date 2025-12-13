import { useSubscription } from '../../hooks/useSubscription';
import MainLayout from '../layout/MainLayout';

const EnterpriseUserStatus = () => {
  const { subscriptionData, isPremium, planName } = useSubscription();

  // Only show for Enterprise users
  const isEnterprise = planName?.toLowerCase().includes('enterprise') || planName?.toLowerCase().includes('doanh nghiệp');
  
  if (!isPremium || !isEnterprise) return null;

  const subscription = subscriptionData?.subscription;
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at) : null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-800/20 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/25 relative">
              {/* Crown animation */}
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👑</div>
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 bg-clip-text text-transparent mb-3">
              🎉 Chào mừng đến với Enterprise!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xl">
              Bạn hiện đang sử dụng gói cao cấp nhất với đầy đủ tính năng doanh nghiệp
            </p>
          </div>

          {/* Enterprise Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* Main Status Card */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-2 border-purple-200 dark:border-purple-700 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Gói Enterprise</h2>
                    <p className="text-purple-100">Trạng thái: Đang hoạt động</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-bold">
                      <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                      ENTERPRISE
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Subscription Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                      Thông tin gói
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Gói:</span>
                        <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Enterprise</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Trạng thái:</span>
                        <span className="text-green-600 font-bold">Đã thanh toán</span>
                      </div>
                      {expiryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Hết hạn:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {expiryDate.toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                      Quyền lợi Enterprise
                    </h3>
                    <div className="space-y-3">
                      {[
                        'Tất cả tính năng Premium',
                        'Quản lý nhiều người dùng',
                        'API tích hợp',
                        'Hỗ trợ 24/7',
                        'Tùy chỉnh theo yêu cầu'
                      ].map((benefit, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Enterprise Features */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-700">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    Tính năng doanh nghiệp độc quyền
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">∞</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Người dùng không giới hạn</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">API</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Tích hợp hệ thống</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">24/7</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Hỗ trợ ưu tiên</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              {/* Admin Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  Admin Panel
                </h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-sm">
                    Quản lý người dùng
                  </button>
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-sm">
                    Xem báo cáo
                  </button>
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-sm">
                    Cấu hình API
                  </button>
                </div>
              </div>

              {/* Support */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">🎧</span>
                  Hỗ trợ VIP
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Hỗ trợ 24/7 đang hoạt động</span>
                  </div>
                  <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors text-sm">
                    Liên hệ Account Manager
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              Truy cập Dashboard Enterprise
            </button>
            
            <button
              onClick={() => window.location.href = '/careers'}
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600"
            >
              Khám phá tính năng
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              Cần hỗ trợ Enterprise? Liên hệ Account Manager của bạn
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="mailto:enterprise@careerbridge.com" className="text-purple-600 hover:text-purple-700 font-medium">
                enterprise@careerbridge.com
              </a>
              <span className="text-gray-400">|</span>
              <a href="tel:+84123456789" className="text-purple-600 hover:text-purple-700 font-medium">
                +84 123 456 789
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EnterpriseUserStatus;