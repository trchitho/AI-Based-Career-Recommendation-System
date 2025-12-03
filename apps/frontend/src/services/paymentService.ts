import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface SubscriptionPlan {
  id: number;
  code: string;
  name_vi: string;
  name_en: string;
  description_vi: string;
  description_en: string;
  price: number;
  duration_days: number;
  features: {
    view_all_careers?: boolean;
    unlimited_tests?: boolean;
    full_roadmap?: boolean;
    personal_consultation?: boolean;
  };
  is_active: boolean;
}

export interface UserPermissions {
  has_active_subscription: boolean;
  can_take_test: boolean;
  can_view_all_careers: boolean;
  can_view_full_roadmap: boolean;
  test_count_this_month: number;
  free_test_quota: number;
  remaining_free_tests: number;
}

export interface UserSubscription {
  id: number;
  plan_id: number;
  plan_name?: string;
  status: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
}

export interface CreatePaymentRequest {
  plan_id: number;
  payment_method: 'vnpay' | 'momo';
  return_url: string;
}

export interface PaymentResponse {
  payment_id: number;
  payment_url: string;
  transaction_id: string;
}

class PaymentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'
    console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NULL');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await axios.get(`${API_BASE}/api/payment/plans`);
    return response.data;
  }

  async getUserPermissions(): Promise<UserPermissions> {
    const response = await axios.get(`${API_BASE}/api/payment/permissions`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      const response = await axios.get(`${API_BASE}/api/payment/subscription`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.message ? null : response.data;
    } catch (error) {
      return null;
    }
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const response = await axios.post(
      `${API_BASE}/api/payment/create`,
      request,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data;
  }

  async checkTestQuota(): Promise<{ can_take_test: boolean; permissions: UserPermissions }> {
    const response = await axios.post(
      `${API_BASE}/api/payment/check-test-quota`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data;
  }

  async incrementTestCount(): Promise<void> {
    await axios.post(
      `${API_BASE}/api/payment/increment-test-count`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  // Helper methods
  canViewCareer(index: number, permissions: UserPermissions): boolean {
    // Chỉ cho xem nghề đầu tiên nếu không có subscription
    return index === 0 || permissions.can_view_all_careers;
  }

  canViewRoadmapLevel(level: number, permissions: UserPermissions): boolean {
    // Chỉ cho xem level 1 nếu không có subscription
    return level === 1 || permissions.can_view_full_roadmap;
  }

  shouldShowUpgradePrompt(permissions: UserPermissions): boolean {
    return !permissions.has_active_subscription;
  }
}

export const paymentService = new PaymentService();
