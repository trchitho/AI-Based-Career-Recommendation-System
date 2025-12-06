import React, { useEffect, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { paymentService, SubscriptionPlan } from '../../services/paymentService';
import { formatVND } from '../../utils/currency';
import { PaymentDemo } from './PaymentDemo';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'careers' | 'tests' | 'roadmap';
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, reason }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo'>('vnpay');
  const [showDemo, setShowDemo] = useState(false);
  const [demoData, setDemoData] = useState<{ amount: number; planName: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      const data = await paymentService.getSubscriptionPlans();
      setPlans(data);
    } catch (error) {
      // Use mock data when backend is not available
      setPlans([
        {
          id: 1,
          code: 'BASIC_1M',
          name_vi: 'Gói Cơ Bản 1 Tháng',
          name_en: 'Basic 1 Month',
          description_vi: 'Xem tất cả nghề nghiệp phù hợp, làm test không giới hạn, xem roadmap đầy đủ',
          description_en: 'View all career matches, unlimited tests, full roadmap access',
          price: 99000,
          duration_days: 30,
          features: {
            view_all_careers: true,
            unlimited_tests: true,
            full_roadmap: true
          },
          is_active: true
        },
        {
          id: 2,
          code: 'BASIC_3M',
          name_vi: 'Gói Cơ Bản 3 Tháng',
          name_en: 'Basic 3 Months',
          description_vi: 'Xem tất cả nghề nghiệp phù hợp, làm test không giới hạn, xem roadmap đầy đủ - Tiết kiệm 20%',
          description_en: 'View all career matches, unlimited tests, full roadmap access - Save 20%',
          price: 237000,
          duration_days: 90,
          features: {
            view_all_careers: true,
            unlimited_tests: true,
            full_roadmap: true
          },
          is_active: true
        },
        {
          id: 3,
          code: 'PREMIUM_6M',
          name_vi: 'Gói Premium 6 Tháng',
          name_en: 'Premium 6 Months',
          description_vi: 'Tất cả tính năng + Tư vấn cá nhân hóa - Tiết kiệm 30%',
          description_en: 'All features + Personalized consultation - Save 30%',
          price: 417000,
          duration_days: 180,
          features: {
            view_all_careers: true,
            unlimited_tests: true,
            full_roadmap: true,
            personal_consultation: true
          },
          is_active: true
        },
        {
          id: 4,
          code: 'PREMIUM_1Y',
          name_vi: 'Gói Premium 1 Năm',
          name_en: 'Premium 1 Year',
          description_vi: 'Tất cả tính năng + Tư vấn cá nhân hóa - Tiết kiệm 40%',
          description_en: 'All features + Personalized consultation - Save 40%',
          price: 713000,
          duration_days: 365,
          features: {
            view_all_careers: true,
            unlimited_tests: true,
            full_roadmap: true,
            personal_consultation: true
          },
          is_active: true
        }
      ]);
    }
  };

  const handlePurchase = async (planId: number) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const returnUrl = `${window.location.origin}/payment/callback`;
      const response = await paymentService.createPayment({
        plan_id: planId,
        payment_method: paymentMethod,
        return_url: returnUrl,
      });

      // Redirect to payment gateway
      window.location.href = response.payment_url;
    } catch (error) {
      console.error('Payment creation failed:', error);
      
      // DEMO MODE: Show payment demo
      const selectedPlanData = plans.find(p => p.id === planId);
      if (selectedPlanData) {
        setDemoData({
          amount: selectedPlanData.price,
          planName: selectedPlanData.name_vi,
        });
        setShowDemo(true);
      }
      
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getReasonMessage = () => {
    switch (reason) {
      case 'careers':
        return 'Nâng cấp để xem tất cả các nghề nghiệp phù hợp với bạn';
      case 'tests':
        return 'Bạn đã hết lượt làm test miễn phí. Nâng cấp để làm test không giới hạn';
      case 'roadmap':
        return 'Nâng cấp để xem toàn bộ lộ trình phát triển nghề nghiệp';
      default:
        return 'Chọn gói phù hợp với bạn';
    }
  };

  if (!isOpen) return null;

  // Show payment demo if triggered
  if (showDemo && demoData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <PaymentDemo
          amount={demoData.amount}
          planName={demoData.planName}
          paymentMethod={paymentMethod}
          onSuccess={() => {
            setShowDemo(false);
            setDemoData(null);
            onClose();
            // Reload page to refresh permissions
            window.location.reload();
          }}
          onCancel={() => {
            setShowDemo(false);
            setDemoData(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nâng cấp tài khoản</h2>
            <p className="text-gray-600 mt-1">{getReasonMessage()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Payment Method Selection */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <p className="text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán:</p>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="payment_method"
                value="vnpay"
                checked={paymentMethod === 'vnpay'}
                onChange={(e) => setPaymentMethod(e.target.value as 'vnpay')}
                className="mr-2"
              />
              <img src="/vnpay-logo.png" alt="VNPay" className="h-8" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.textContent = 'VNPay';
              }} />
              <span className="ml-2 font-medium">VNPay</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="payment_method"
                value="momo"
                checked={paymentMethod === 'momo'}
                onChange={(e) => setPaymentMethod(e.target.value as 'momo')}
                className="mr-2"
              />
              <img src="/momo-logo.png" alt="Momo" className="h-8" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.textContent = 'Momo';
              }} />
              <span className="ml-2 font-medium">Momo</span>
            </label>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow relative"
              >
                {plan.code.includes('PREMIUM') && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-bold">
                    PHỔ BIẾN
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name_vi}</h3>
                <div className="mb-4">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {formatVND(plan.price)}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {plan.duration_days === 30 ? '1 tháng' : 
                     plan.duration_days === 90 ? '3 tháng' : 
                     plan.duration_days === 180 ? '6 tháng' : 
                     plan.duration_days === 365 ? '1 năm' : `${plan.duration_days} ngày`}
                  </div>
                  {plan.code.includes('3M') && (
                    <div className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mt-2">
                      Tiết kiệm 20%
                    </div>
                  )}
                  {plan.code.includes('6M') && (
                    <div className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mt-2">
                      Tiết kiệm 30%
                    </div>
                  )}
                  {plan.code.includes('1Y') && (
                    <div className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mt-2">
                      Tiết kiệm 40%
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{plan.description_vi}</p>

                <ul className="space-y-2 mb-6">
                  {plan.features.view_all_careers && (
                    <li className="flex items-start text-sm">
                      <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Xem tất cả nghề nghiệp</span>
                    </li>
                  )}
                  {plan.features.unlimited_tests && (
                    <li className="flex items-start text-sm">
                      <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Làm test không giới hạn</span>
                    </li>
                  )}
                  {plan.features.full_roadmap && (
                    <li className="flex items-start text-sm">
                      <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Xem roadmap đầy đủ</span>
                    </li>
                  )}
                  {plan.features.personal_consultation && (
                    <li className="flex items-start text-sm">
                      <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tư vấn cá nhân hóa</span>
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.code.includes('PREMIUM')
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Mua ngay'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Thanh toán an toàn qua VNPay hoặc Momo. Hỗ trợ 24/7.
          </p>
        </div>
      </div>
    </div>
  );
};
