import { PaymentButton } from '../payment/PaymentButton';

interface UpgradeOptionsProps {
  currentPlan: string;
  onClose: () => void;
}

const UpgradeOptions = ({ currentPlan, onClose }: UpgradeOptionsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Available upgrade plans based on current plan
  const getAvailablePlans = () => {
    const allPlans = [
      {
        id: 'premium',
        name: 'Gói Premium',
        price: 299000,
        description: 'Phổ biến nhất - Không giới hạn',
        features: [
          'Không giới hạn bài test',
          'Xem tất cả nghề nghiệp',
          'Roadmap đầy đủ',
          'Phân tích AI chi tiết',
          'Hỗ trợ ưu tiên',
        ],
        gradient: 'from-green-500 to-emerald-500',
        available: false, // User already has Premium
      },
      {
        id: 'enterprise',
        name: 'Gói Doanh Nghiệp',
        price: 999000,
        description: 'Giải pháp cho tổ chức',
        features: [
          'Tất cả tính năng Premium',
          'Quản lý nhiều người dùng',
          'API tích hợp',
          'Hỗ trợ 24/7',
          'Tùy chỉnh theo yêu cầu',
          'Báo cáo chi tiết',
          'Đào tạo nhóm',
        ],
        gradient: 'from-purple-500 to-pink-500',
        available: true,
      },
    ];

    // Filter based on current plan
    const current = currentPlan?.toLowerCase() || '';
    return allPlans.filter(plan => {
      if (current.includes('enterprise') || current.includes('doanh nghiệp')) {
        return false; // Already has highest plan
      }
      if (current.includes('premium') || current.includes('pro')) {
        return plan.id === 'enterprise'; // Can only upgrade to Enterprise
      }
      return plan.available;
    });
  };

  const availablePlans = getAvailablePlans();

  if (availablePlans.length === 0) {
    return (
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Bạn đã có gói cao nhất!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Bạn đang sử dụng gói {currentPlan} - gói cao nhất của chúng tôi.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Nâng cấp gói của bạn
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Mở khóa thêm nhiều tính năng mạnh mẽ cho {currentPlan} của bạn
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {availablePlans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 relative overflow-hidden"
          >
            {/* Gradient background */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${plan.gradient} opacity-10 rounded-full blur-2xl`}></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {plan.name}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                    {formatCurrency(plan.price).replace(' ₫', '')}đ
                  </div>
                  <p className="text-xs text-gray-500">thanh toán một lần</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Tính năng bổ sung:
                  </h5>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-center">
                  <PaymentButton
                    amount={plan.price}
                    description={`Nâng cấp ${plan.name}`}
                    onSuccess={(orderId) => {
                      console.log('Upgrade initiated', plan.name, orderId);
                      if (orderId) {
                        window.location.reload();
                      }
                    }}
                    className={`w-full px-6 py-3 bg-gradient-to-r ${plan.gradient} hover:shadow-lg text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg`}
                  >
                    Nâng cấp {plan.name} ✨
                  </PaymentButton>
                  
                  <button
                    onClick={onClose}
                    className="mt-3 w-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm transition-colors"
                  >
                    Để sau
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpgradeOptions;