import React from 'react';
import { Check, CreditCard, Shield } from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface PaymentSummaryProps {
  planName: string;
  price: number;
  duration: string;
  features: string[];
  paymentMethod: 'vnpay' | 'momo';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  planName,
  price,
  duration,
  features,
  paymentMethod,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard size={32} className="text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Xác nhận thanh toán</h3>
        <p className="text-gray-600">Vui lòng kiểm tra thông tin trước khi thanh toán</p>
      </div>

      {/* Plan Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-bold text-gray-900">{planName}</h4>
            <p className="text-sm text-gray-600">{duration}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {formatVND(price)}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mb-6">
        <h5 className="font-semibold text-gray-900 mb-3">Bạn sẽ nhận được:</h5>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm">
              <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Method */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Phương thức thanh toán:</span>
          <div className="flex items-center">
            <span className="font-bold text-gray-900 mr-2">
              {paymentMethod === 'vnpay' ? 'VNPay' : 'Momo'}
            </span>
            {paymentMethod === 'vnpay' ? (
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                VNP
              </div>
            ) : (
              <div className="w-12 h-8 bg-pink-600 rounded flex items-center justify-center text-white text-xs font-bold">
                M
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start text-xs text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg">
        <Shield size={16} className="mr-2 flex-shrink-0 text-blue-600 mt-0.5" />
        <p>
          Giao dịch được bảo mật bởi {paymentMethod === 'vnpay' ? 'VNPay' : 'Momo'}. 
          Thông tin thanh toán của bạn được mã hóa và bảo vệ.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Đang xử lý...
            </>
          ) : (
            'Thanh toán ngay'
          )}
        </button>
      </div>
    </div>
  );
};
