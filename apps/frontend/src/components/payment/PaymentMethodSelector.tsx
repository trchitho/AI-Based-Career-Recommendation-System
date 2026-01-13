/**
 * Payment Method Selector Component
 * Redesigned to match CareerBridge green theme
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { getAccessToken } from '../../utils/auth';

interface PaymentMethodSelectorProps {
    amount: number;
    description: string;
    planName: string;
    onSuccess?: (orderId: string) => void;
    onError?: (error: string) => void;
    onClose?: () => void;
}

type PaymentMethod = 'vnpay' | 'zalopay' | 'momo';

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
    amount,
    description,
    planName,
    onSuccess,
    onError,
    onClose,
}) => {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('vnpay');
    const [loading, setLoading] = useState(false);
    const [showTestCards, setShowTestCards] = useState(false);
    const navigate = useNavigate();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const handlePayment = async () => {
        try {
            setLoading(true);
            const token = getAccessToken();
            if (!token) {
                alert('Vui lòng đăng nhập để thanh toán');
                navigate('/login');
                return;
            }

            const result = await paymentService.createPayment({
                amount,
                description,
                payment_method: selectedMethod,
            });

            if (result.success && result.order_url) {
                if (result.order_id) {
                    localStorage.setItem('pending_payment_order', result.order_id);
                }
                window.location.href = result.order_url;
                if (onSuccess && result.order_id) {
                    onSuccess(result.order_id);
                }
            } else {
                throw new Error(result.message || 'Không thể tạo đơn thanh toán');
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Lỗi thanh toán';
            if (onError) {
                onError(errorMessage);
            } else {
                alert(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header - Green gradient matching CareerBridge */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">{planName}</h2>
                            <p className="text-emerald-100 text-sm mt-1">Chọn phương thức thanh toán</p>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    {/* Amount display */}
                    <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
                        <p className="text-emerald-100 text-sm">Tổng thanh toán</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(amount)}₫</p>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="p-6 space-y-3">
                    {/* VNPay */}
                    <button
                        onClick={() => setSelectedMethod('vnpay')}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                            selectedMethod === 'vnpay'
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">VNPay</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">VNPay</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Visa, Mastercard, ATM nội địa</p>
                        </div>
                        {selectedMethod === 'vnpay' && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>

                    {/* ZaloPay */}
                    <button
                        onClick={() => setSelectedMethod('zalopay')}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                            selectedMethod === 'zalopay'
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-xs">ZaloPay</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">ZaloPay</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Quét QR, Visa, Mastercard</p>
                        </div>
                        {selectedMethod === 'zalopay' && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>

                    {/* MoMo - Disabled */}
                    <button
                        disabled
                        className="w-full p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 flex items-center gap-4 opacity-50 cursor-not-allowed"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">MoMo</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-400">MoMo</p>
                            <p className="text-sm text-gray-400">Sắp ra mắt</p>
                        </div>
                    </button>
                </div>

                {/* Test Cards Toggle */}
                <div className="px-6">
                    <button
                        onClick={() => setShowTestCards(!showTestCards)}
                        className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Thông tin thẻ test (Sandbox)
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${showTestCards ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {showTestCards && (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs space-y-2">
                            {selectedMethod === 'vnpay' ? (
                                <>
                                    <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-gray-500 mb-1">Thẻ ATM NCB (duy nhất hoạt động trên sandbox):</p>
                                        <p className="text-gray-700 dark:text-gray-300">Số thẻ: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded font-mono select-all">9704198526191432198</code></p>
                                        <p className="text-gray-700 dark:text-gray-300">Tên: NGUYEN VAN A | Ngày: 07/15 | OTP: 123456</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-500">Visa</span>
                                        <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded font-mono select-all">4111111111111111</code>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">CVV / Hết hạn</span>
                                        <span className="text-gray-600 dark:text-gray-400">123 / 12/25</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="p-6 pt-2 space-y-3">
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang xử lý...
                            </span>
                        ) : (
                            <>Thanh toán {formatCurrency(amount)}₫</>
                        )}
                    </button>
                    
                    <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Thanh toán được bảo mật SSL
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodSelector;
