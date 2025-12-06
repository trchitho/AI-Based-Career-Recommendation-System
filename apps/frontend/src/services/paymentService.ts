/**
 * Payment Service - ZaloPay Integration
 */
import axios from 'axios';

const API_BASE = import.meta.env['VITE_API_BASE'] || 'http://localhost:8000';

export interface PaymentCreateRequest {
    amount: number;
    description: string;
    payment_method?: 'zalopay' | 'momo' | 'vnpay';
}

export interface PaymentCreateResponse {
    success: boolean;
    order_id: string;
    order_url?: string;
    message?: string;
}

export interface Payment {
    id: number;
    order_id: string;
    amount: number;
    description: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    payment_method: string;
    created_at: string;
    paid_at?: string;
}

export interface PaymentQueryResponse {
    success: boolean;
    status: string;
    message?: string;
    payment?: Payment;
}

/**
 * Tạo đơn thanh toán mới
 */
export const createPayment = async (
    data: PaymentCreateRequest,
    token: string
): Promise<PaymentCreateResponse> => {
    const response = await axios.post(
        `${API_BASE}/api/payment/create`,
        data,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data;
};

/**
 * Truy vấn trạng thái thanh toán
 */
export const queryPayment = async (
    orderId: string,
    token: string
): Promise<PaymentQueryResponse> => {
    const response = await axios.get(
        `${API_BASE}/api/payment/query/${orderId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    return response.data;
};

/**
 * Lấy lịch sử thanh toán
 */
export const getPaymentHistory = async (
    token: string,
    skip: number = 0,
    limit: number = 20
): Promise<Payment[]> => {
    const response = await axios.get(
        `${API_BASE}/api/payment/history`,
        {
            params: { skip, limit },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    return response.data;
};

/**
 * Poll payment status - Tự động kiểm tra trạng thái thanh toán
 */
export const pollPaymentStatus = async (
    orderId: string,
    token: string,
    maxAttempts: number = 30, // 30 lần = 2.5 phút (mỗi 5 giây)
    interval: number = 5000 // 5 giây
): Promise<PaymentQueryResponse> => {
    let attempts = 0;

    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                attempts++;
                console.log(`Polling attempt ${attempts}/${maxAttempts} for order ${orderId}`);

                const result = await queryPayment(orderId, token);
                console.log(`Polling result:`, result);

                // Dừng polling nếu có kết quả cuối cùng
                if (result.status === 'success' || result.status === 'failed' || result.status === 'cancelled') {
                    resolve(result);
                    return;
                }

                // Nếu hết số lần thử
                if (attempts >= maxAttempts) {
                    resolve({
                        success: false,
                        status: 'failed',
                        message: 'Không thể xác nhận thanh toán. Giao dịch có thể đã bị hủy hoặc hết hạn.',
                    });
                    return;
                }

                // Tiếp tục polling
                setTimeout(checkStatus, interval);
            } catch (error) {
                console.error('Polling error:', error);
                reject(error);
            }
        };

        checkStatus();
    });
};
