/**
 * Payment Button Component
 * Nút thanh toán với ZaloPay
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPayment } from '../../services/paymentService';
import { getAccessToken } from '../../utils/auth';

interface PaymentButtonProps {
    amount: number;
    description: string;
    onSuccess?: (orderId: string) => void;
    onError?: (error: string) => void;
    className?: string;
    children?: React.ReactNode;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
    amount,
    description,
    onSuccess,
    onError,
    className = '',
    children = 'Thanh toán',
}) => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handlePayment = async () => {
        try {
            setLoading(true);

            // Lấy token từ localStorage
            const token = getAccessToken();
            if (!token) {
                // Redirect đến login
                alert('Vui lòng đăng nhập để thanh toán');
                navigate('/login');
                return;
            }

            console.log('Token found:', token.substring(0, 20) + '...');

            // Tạo đơn thanh toán
            const result = await createPayment(
                {
                    amount,
                    description,
                    payment_method: 'zalopay',
                },
                token
            );

            if (result.success && result.order_url) {
                // Chuyển hướng đến trang thanh toán ZaloPay
                window.location.href = result.order_url;

                if (onSuccess) {
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
        <button
            onClick={handlePayment}
            disabled={loading}
            className={`
        px-6 py-3 rounded-lg font-semibold
        bg-blue-600 hover:bg-blue-700 text-white
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Đang xử lý...
                </span>
            ) : (
                children
            )}
        </button>
    );
};
