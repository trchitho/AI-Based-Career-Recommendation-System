/**
 * Payment Button Component
 * Nút thanh toán với ZaloPay
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
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
    children = 'Pay Now',
}) => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handlePayment = async () => {
        try {
            setLoading(true);

            // Get token from localStorage
            const token = getAccessToken();
            if (!token) {
                // Redirect to login
                alert('Please login to make payment');
                navigate('/login');
                return;
            }

            console.log('Token found:', token.substring(0, 20) + '...');

            // Create payment order
            const result = await paymentService.createPayment({
                amount,
                description,
                payment_method: 'zalopay',
            });

            if (result.success && result.order_url) {
                // Store order ID for tracking
                if (result.order_id) {
                    localStorage.setItem('pending_payment_order', result.order_id);
                }

                // Redirect to ZaloPay payment page
                window.location.href = result.order_url;

                if (onSuccess && result.order_id) {
                    onSuccess(result.order_id);
                }
            } else {
                throw new Error(result.message || 'Unable to create payment order');
            }
        } catch (error: any) {
            console.error('Payment error:', error);

            let errorMessage = 'Payment error';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to server. Please check your network connection.';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Session expired. Please login again.';
            } else if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }

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
                    Processing...
                </span>
            ) : (
                children
            )}
        </button>
    );
};
