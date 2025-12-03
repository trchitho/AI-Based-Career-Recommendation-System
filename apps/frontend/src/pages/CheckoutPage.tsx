import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Shield, Check, Loader2 } from 'lucide-react';
import { paymentService, SubscriptionPlan } from '../services/paymentService';
import { formatVND } from '../utils/currency';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo'>('vnpay');

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) {
      navigate('/pricing');
      return;
    }

    try {
      const plans = await paymentService.getSubscriptionPlans();
      const selectedPlan = plans.find(p => p.id === parseInt(planId));
      
      if (selectedPlan) {
        setPlan(selectedPlan);
      } else {
        navigate('/pricing');
      }
    } catch (error) {
      // Mock data for demo
      const mockPlans = [
        {
          id: 1,
          code: 'BASIC_1M',
          name_vi: 'Gói Cơ Bản',
          name_en: 'Basic Plan',
          description_vi: 'Hoàn hảo để bắt đầu',
          description_en: 'Perfect to start',
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
          name_vi: 'Gói Tiết Kiệm',
          name_en: 'Value Plan',
          description_vi: '3 tháng - Tiết kiệm 20%',
          description_en: '3 months - Save 20%',
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
          name_vi: 'Gói Premium',
          name_en: 'Premium Plan',
          description_vi: '6 tháng - Tiết kiệm 30%',
          description_en: '6 months - Save 30%',
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
          name_vi: 'Gói Đặc Biệt',
          name_en: 'Special Plan',
          description_vi: '1 năm - Tiết kiệm 40%',
          description_en: '1 year - Save 40%',
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
      ];
      
      const selectedPlan = mockPlans.find(p => p.id === parseInt(planId || '1'));
      if (selectedPlan) {
        setPlan(selectedPlan);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!plan) return;

    setProcessing(true);

    try {
      // Use ngrok domain for return URL
      const returnUrl = `https://madonna-unpreposterous-unnationally.ngrok-free.dev/payment/callback`;
      
      const response = await paymentService.createPayment({
        plan_id: plan.id,
        payment_method: paymentMethod,
        return_url: returnUrl,
      });

      // Redirect to payment gateway
      window.location.href = response.payment_url;
    } catch (error) {
      console.error('Payment failed:', error);
      alert(
        `🎉 DEMO MODE\n\n` +
        `Gói: ${plan.name_vi}\n` +
        `Giá: ${formatVND(plan.price)}\n` +
        `Phương thức: ${paymentMethod === 'vnpay' ? 'VNPay' : 'Momo'}\n\n` +
        `Trong production, bạn sẽ được chuyển đến trang thanh toán.`
      );
      setProcessing(false);
    }
  };

  const getDurationText = (days: number) => {
    if (days === 30) return '1 tháng';
    if (days === 90) return '3 tháng';
    if (days === 180) return '6 tháng';
    if (days === 365) return '1 năm';
    return `${days} ngày`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
          <p className="text-gray-600 mt-2">Hoàn tất thanh toán để kích hoạt gói dịch vụ</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin đơn hàng</h2>
            
            {/* Plan Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name_vi}</h3>
              <p className="text-sm text-gray-600 mb-4">{plan.description_vi}</p>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Thời hạn:</span>
                <span className="font-semibold text-gray-900">{getDurationText(plan.duration_days)}</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Tổng cộng:</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {formatVND(plan.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Bạn sẽ nhận được:</h3>
              <ul className="space-y-2">
                <li className="flex items-start text-sm">
                  <Check size={18} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Xem tất cả nghề nghiệp phù hợp</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check size={18} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Làm test không giới hạn</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check size={18} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Xem roadmap đầy đủ 6 levels</span>
                </li>
                {plan.features.personal_consultation && (
                  <li className="flex items-start text-sm">
                    <Check size={18} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-purple-600">Tư vấn cá nhân hóa</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Right: Payment Method */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Phương thức thanh toán</h2>
            
            {/* Payment Methods */}
            <div className="space-y-4 mb-8">
              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="vnpay"
                  checked={paymentMethod === 'vnpay'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'vnpay')}
                  className="sr-only"
                />
                <div className={`border-2 rounded-xl p-4 transition-all ${
                  paymentMethod === 'vnpay' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                        <CreditCard size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">VNPay</div>
                        <div className="text-sm text-gray-600">Thẻ ATM, Visa, MasterCard</div>
                      </div>
                    </div>
                    {paymentMethod === 'vnpay' && (
                      <Check size={24} className="text-blue-600" />
                    )}
                  </div>
                </div>
              </label>

              <label className="block cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="momo"
                  checked={paymentMethod === 'momo'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'momo')}
                  className="sr-only"
                />
                <div className={`border-2 rounded-xl p-4 transition-all ${
                  paymentMethod === 'momo' 
                    ? 'border-pink-600 bg-pink-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mr-4">
                        <CreditCard size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">Momo</div>
                        <div className="text-sm text-gray-600">Ví điện tử Momo</div>
                      </div>
                    </div>
                    {paymentMethod === 'momo' && (
                      <Check size={24} className="text-pink-600" />
                    )}
                  </div>
                </div>
              </label>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <div className="flex items-start">
                <Shield size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Thanh toán an toàn</p>
                  <p>Giao dịch được bảo mật bởi {paymentMethod === 'vnpay' ? 'VNPay' : 'Momo'}. 
                  Thông tin thanh toán của bạn được mã hóa SSL 256-bit.</p>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {processing ? (
                <>
                  <Loader2 size={24} className="animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CreditCard size={24} className="mr-2" />
                  Thanh toán {formatVND(plan.price)}
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Bằng việc thanh toán, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
