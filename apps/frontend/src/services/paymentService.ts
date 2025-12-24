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
}

export interface CreatePaymentRequest {
  tier: string;
  provider: 'zalopay' | 'vnpay';
}

export interface CreatePaymentResponse {
  payment_id: number;
  order_url: string;
  app_trans_id?: string;
  zp_trans_token?: string;
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
    const response = await api.post('/api/payments/create', data);
    return response.data;
  },

  /**
   * Check payment status by payment ID
   */
  async checkStatus(paymentId: number): Promise<PaymentStatusResponse> {
    const response = await api.get(`/api/payments/${paymentId}/status`);
    return response.data;
  },

  /**
   * Force check payment status (queries payment provider directly)
   */
  async forceCheckStatus(paymentId: number): Promise<PaymentStatusResponse> {
    const response = await api.post(`/api/payments/${paymentId}/force-check`);
    return response.data;
  },

  /**
   * Get payment history for current user
   */
  async getHistory(): Promise<PaymentHistory[]> {
    const response = await api.get('/api/payments/history');
    return response.data;
  },

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: number): Promise<PaymentHistory> {
    const response = await api.get(`/api/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Poll payment status until success/failure or timeout
   * Enhanced: 2 minutes polling with force-check attempts
   */
  async pollStatus(
    paymentId: number,
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
          ? await this.forceCheckStatus(paymentId)
          : await this.checkStatus(paymentId);

        if (result.status !== lastStatus) {
          lastStatus = result.status;
          onStatusChange?.(result.status);
        }

        // Success or failure - stop polling
        if (result.status === 'SUCCESS' || result.status === 'COMPLETED') {
          return { ...result, status: 'SUCCESS' };
        }
        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
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
      const finalResult = await this.forceCheckStatus(paymentId);
      return finalResult;
    } catch {
      return { payment_id: paymentId, status: 'TIMEOUT', message: 'Payment status check timed out' };
    }
  },
};

/**
 * Get payment history (standalone function for backward compatibility)
 */
export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  return paymentService.getHistory();
}

export default paymentService;
