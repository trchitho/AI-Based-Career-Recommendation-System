import api from '../lib/api';

export interface PaymentCreateRequest {
  amount: number;
  description: string;
  payment_method: 'zalopay' | 'vnpay' | 'momo';
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
  status: string;
  created_at: string;
  paid_at?: string;
}

export interface PaymentQueryResponse {
  success: boolean;
  status: string;
  payment: Payment;
}

class PaymentService {
  async createPayment(request: PaymentCreateRequest): Promise<PaymentCreateResponse> {
    const response = await api.post('/api/payment/create', request);
    return response.data;
  }

  async queryPayment(orderId: string): Promise<PaymentQueryResponse> {
    const response = await api.get(`/api/payment/query/${orderId}`);
    return response.data;
  }

  async getPaymentHistory(skip = 0, limit = 20) {
    const response = await api.get('/api/payment/history', {
      params: { skip, limit }
    });
    return response.data;
  }

  // Poll payment status until completion
  async pollPaymentStatus(orderId: string, maxAttempts = 30, intervalMs = 2000): Promise<PaymentQueryResponse> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await this.queryPayment(orderId);
        
        // If payment is completed (success or failed), return result
        if (result.payment.status !== 'pending') {
          return result;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        console.error('Error polling payment status:', error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new Error('Payment status polling timeout');
  }

  // Trigger subscription refresh after successful payment
  triggerSubscriptionRefresh() {
    // Use localStorage to communicate between components
    localStorage.setItem('payment_success', Date.now().toString());
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('payment_success', {
      detail: { timestamp: Date.now() }
    }));
  }

  // Handle payment success redirect
  handlePaymentSuccess(orderId?: string) {
    if (orderId) {
      // Store successful order ID
      localStorage.setItem('last_successful_payment', orderId);
    }
    
    this.triggerSubscriptionRefresh();
    
    // Redirect to payment return page for status checking
    window.location.href = `/payment/return${orderId ? `?order_id=${orderId}` : ''}`;
  }
}

export const paymentService = new PaymentService();

// Named exports for backward compatibility
export const createPayment = (request: PaymentCreateRequest) => {
  return paymentService.createPayment(request);
};

export const queryPayment = (orderId: string) => {
  return paymentService.queryPayment(orderId);
};

export const getPaymentHistory = (skip = 0, limit = 20) => {
  return paymentService.getPaymentHistory(skip, limit);
};

export const pollPaymentStatus = (orderId: string, maxAttempts = 30, intervalMs = 2000) => {
  return paymentService.pollPaymentStatus(orderId, maxAttempts, intervalMs);
};