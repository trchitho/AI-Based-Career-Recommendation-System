/**
 * Payment Service
 * 
 * Handles payment-related API calls including:
 * - Creating payments (ZaloPay, VNPay)
 * - Checking payment status
 * - Getting payment history
 * - Force checking payment status
 */

import api from '../lib/api';

export interface PaymentHistory {
  id: number;
  user_id: number;
  tier: string;
  amount: number;
  provider: string;
  status: string;
  transaction_id?: string;
  created_at: string;
  updated_at?: string;
  description?: string;
  order_id?: string;
}

export interface CreatePaymentRequest {
  tier?: string;
  provider?: 'zalopay' | 'vnpay';
  amount?: number;
  description?: string;
  payment_method?: string;
}

export interface CreatePaymentResponse {
  payment_id?: number;
  order_url: string;
  app_trans_id?: string;
  zp_trans_token?: string;
  success?: boolean;
  order_id?: string;
  message?: string;
}

export interface PaymentStatusResponse {
  payment_id: number;
  status: string;
  tier?: string;
  message?: string;
}

export const paymentService = {
  /**
   * Create a new payment
   */
  async createPayment(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const response = await api.post('/api/payment/create', data);
    return response.data;
  },

  /**
   * Check payment status by order ID
   */
  async checkStatus(orderId: string): Promise<PaymentStatusResponse> {
    const response = await api.get(`/api/payment/query/${orderId}`);
    return response.data;
  },

  /**
   * Force check payment status (queries payment provider directly)
   */
  async forceCheckStatus(orderId: string): Promise<PaymentStatusResponse> {
    const response = await api.post(`/api/payment/force-check/${orderId}`);
    return response.data;
  },

  /**
   * Get payment history for current user
   */
  async getHistory(): Promise<PaymentHistory[]> {
    const response = await api.get('/api/payment/history');
    return response.data;
  },

  /**
   * Get payment by order ID
   */
  async getPayment(orderId: string): Promise<PaymentHistory> {
    const response = await api.get(`/api/payment/query/${orderId}`);
    return response.data;
  },

  /**
   * Poll payment status until success/failure or timeout
   * Enhanced: 2 minutes polling with force-check attempts
   */
  async pollStatus(
    orderId: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000,
    onStatusChange?: (status: string) => void
  ): Promise<PaymentStatusResponse> {
    let attempts = 0;
    let lastStatus = '';

    while (attempts < maxAttempts) {
      try {
        // Force check at specific intervals (after 20s and 60s)
        const shouldForceCheck = attempts === 10 || attempts === 30;

        const result = shouldForceCheck
          ? await this.forceCheckStatus(orderId)
          : await this.checkStatus(orderId);

        if (result.status !== lastStatus) {
          lastStatus = result.status;
          onStatusChange?.(result.status);
        }

        // Success or failure - stop polling
        if (result.status === 'SUCCESS' || result.status === 'COMPLETED' || result.status === 'success') {
          return { ...result, status: 'SUCCESS' };
        }
        if (result.status === 'FAILED' || result.status === 'CANCELLED' || result.status === 'failed') {
          return result;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error('Error polling payment status:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Timeout - do one final force check
    try {
      const finalResult = await this.forceCheckStatus(orderId);
      return finalResult;
    } catch {
      return { payment_id: 0, status: 'TIMEOUT', message: 'Payment status check timed out' };
    }
  },

  /**
   * Poll payment status (alias for pollStatus with different return format)
   * Used by PaymentReturn component
   */
  async pollPaymentStatus(
    orderId: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<{ success: boolean; payment: { status: string; tier?: string | undefined } }> {
    const result = await this.pollStatus(orderId, maxAttempts, intervalMs);
    const isSuccess = result.status === 'SUCCESS' || result.status === 'success' || result.status === 'COMPLETED';
    const paymentResult: { status: string; tier?: string | undefined } = {
      status: isSuccess ? 'success' : result.status.toLowerCase(),
    };
    if (result.tier) {
      paymentResult.tier = result.tier;
    }
    return {
      success: isSuccess,
      payment: paymentResult,
    };
  },

  /**
   * Trigger subscription refresh event
   */
  triggerSubscriptionRefresh(): void {
    window.dispatchEvent(new CustomEvent('subscription-updated'));
  },
};

/**
 * Get payment history (standalone function for backward compatibility)
 */
export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  return paymentService.getHistory();
}

export default paymentService;
