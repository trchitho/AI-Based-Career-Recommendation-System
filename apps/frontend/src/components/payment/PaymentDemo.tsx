import React, { useState } from 'react';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface PaymentDemoProps {
  amount: number;
  planName: string;
  paymentMethod: 'vnpay' | 'momo';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PaymentDemo: React.FC<PaymentDemoProps> = ({
  amount,
  planName,
  paymentMethod,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'failed'>('confirm');
  const [countdown, setCountdown] = useState(3);

  const handleConfirm = () => {
    setStep('processing');
    
    // Simulate payment processing
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(interval);
        // 90% success rate for demo
        const success = Math.random() > 0.1;
        setStep(success ? 'success' : 'failed');
        
        if (success && onSuccess) {
          setTimeout(() => onSuccess(), 2000);
        }
      }
    }, 1000);
  };

  const handleRetry = () => {
    setStep('confirm');
    setCountdown(3);
  };

  if (step === 'confirm') {
    return (
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Xác nhận thanh toán
          </h3>
          <p className="text-gray-600">Demo Mode - Không thanh toán thật</p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700">Gói:</span>
            <span className="font-bold text-gray-900">{planName}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700">Số tiền:</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatVND(amount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Phương thức:</span>
            <span className="font-bold text-gray-900">
              {paymentMethod === 'vnpay' ? 'VNPay' : 'Momo'}
            </span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ Đây là chế độ demo. Không có giao dịch thật nào được thực hiện.
            Trong production, bạn sẽ được chuyển đến trang thanh toán {paymentMethod === 'vnpay' ? 'VNPay' : 'Momo'}.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            Thanh toán Demo
          </button>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Đang xử lý thanh toán...
        </h3>
        <p className="text-gray-600 mb-4">
          Vui lòng không đóng trang này
        </p>
        <div className="text-4xl font-bold text-blue-600">
          {countdown}
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Thanh toán thành công!
        </h3>
        <p className="text-gray-600 mb-4">
          Tài khoản của bạn đã được nâng cấp
        </p>
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">Gói:</span> {planName}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">Số tiền:</span> {formatVND(amount)}
          </div>
        </div>
        <button
          onClick={onSuccess}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Tiếp tục
        </button>
      </div>
    );
  }

  // Failed state
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <XCircle size={40} className="text-red-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        Thanh toán thất bại
      </h3>
      <p className="text-gray-600 mb-6">
        Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleRetry}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
};
