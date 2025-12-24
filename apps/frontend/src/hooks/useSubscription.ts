import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

interface SubscriptionInfo {
  subscription_id: number | null;
  plan_name: string;
  limits: Record<string, any>;
  features: Record<string, any>;
  status: string;
  expires_at: string | null;
  is_premium: boolean;
}

interface UsageInfo {
  feature: string;
  current_usage: number;
  limit: number;
  remaining: number;
  allowed: boolean;
}

interface SubscriptionData {
  subscription: SubscriptionInfo;
  usage: UsageInfo[];
}

export const useSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/subscription/usage');
      setSubscriptionData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch subscription data:', err);
      setError(err.response?.data?.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(() => {
    return fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const checkFeatureAccess = useCallback(async (featureType: string, level?: number) => {
    try {
      const response = await api.post('/api/subscription/check-access', {
        feature_type: featureType,
        level: level
      });
      return response.data;
    } catch (err: any) {
      console.error('Failed to check feature access:', err);
      return { allowed: false, reason: 'Error checking access' };
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Enhanced premium detection - Include Basic as a paid plan
  const planName = subscriptionData?.subscription?.plan_name || 'Free';
  const isPremiumFromAPI = subscriptionData?.subscription?.is_premium === true;
  const isPremiumFromPlan = planName === 'Pro' || planName === 'Premium' || planName === 'Enterprise' || planName === 'Basic';
  const finalIsPremium = isPremiumFromAPI || isPremiumFromPlan;

  return {
    subscriptionData,
    loading,
    error,
    refreshSubscription,
    checkFeatureAccess,
    isPremium: finalIsPremium,
    planName: planName
  };
};