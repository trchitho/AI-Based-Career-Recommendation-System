import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Shield, ArrowLeft } from 'lucide-react';
import { paymentService, SubscriptionPlan } from '../services/paymentService';
import { formatVND } from '../utils/currency';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await paymentService.getSubscriptionPlans();
      setPlans(data);
    } catch (error) {
      // Mock data for demo
      setPlans([
        {
          id: 1,
          code: 'BASIC_1M',
          name_vi: 'Gói Cơ Bản',
          name_en: 'Basic Plan',
          description_vi: 'Hoàn hảo để bắt đầu khám phá nghề nghiệp',
          description_en: 'Perfect to start exploring careers',
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
          description_vi: 'Lựa chọn thông minh cho 3 tháng',
          description_en: 'Smart choice for 3 months',
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
          description_vi: 'Tốt nhất cho sự phát triển dài hạn',
          description_en: 'Best for long-term development',
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
          description_vi: 'Giá trị tốt nhất cho cả năm',
          description_en: 'Best value for the whole year',
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
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (planId: number) => {
    // Redirect to checkout page with plan ID
    navigate(`/checkout?plan=${planId}`);
  };

  const getDurationText = (days: number) => {
    if (days === 30) return '1 tháng';
    if (days === 90) return '3 tháng';
    if (days === 180) return '6 tháng';
    if (days === 365) return '1 năm';
    return `${days} ngày`;
  };

  const getSavingBadge = (code: string) => {
    if (code.includes('3M')) return '20%';
    if (code.includes('6M')) return '30%';
    if (code.includes('1Y')) return '40%';
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Quay lại
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Chọn gói phù hợp với bạn
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Đầu tư cho tương lai nghề nghiệp của bạn ngay hôm nay
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center text-gray-700">
              <Star className="text-yellow-500 mr-2" size={20} />
              <span>Xem tất cả nghề nghiệp</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Zap className="text-purple-600 mr-2" size={20} />
              <span>Test không giới hạn</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Shield className="text-blue-600 mr-2" size={20} />
              <span>Thanh toán bảo mật</span>
            </div>
          </div>
        </div>



        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => {
            const saving = getSavingBadge(plan.code);
            const isPremium = plan.code.includes('PREMIUM');
            
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
                  isPremium ? 'ring-2 ring-purple-600' : ''
                }`}
              >
                {/* Badge */}
                {isPremium && (
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-2 rounded-t-2xl font-bold text-sm">
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name_vi}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description_vi}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                      {formatVND(plan.price)}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {getDurationText(plan.duration_days)}
                    </div>
                    {saving && (
                      <div className="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full mt-2">
                        Tiết kiệm {saving}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
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

                  {/* Button */}
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    className={`w-full py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      isPremium
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    Chọn gói này
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Câu hỏi thường gặp
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Thanh toán có an toàn không?</h4>
              <p className="text-gray-600 text-sm">
                Hoàn toàn an toàn. Chúng tôi sử dụng VNPay và Momo - hai cổng thanh toán uy tín nhất Việt Nam với mã hóa SSL 256-bit.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Tôi có thể hủy bất cứ lúc nào không?</h4>
              <p className="text-gray-600 text-sm">
                Có, bạn có thể hủy bất cứ lúc nào. Tuy nhiên, chúng tôi không hoàn tiền cho thời gian chưa sử dụng.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Tôi nhận được gì sau khi thanh toán?</h4>
              <p className="text-gray-600 text-sm">
                Ngay sau khi thanh toán thành công, tài khoản của bạn sẽ được nâng cấp tự động và bạn có thể truy cập tất cả tính năng premium.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
