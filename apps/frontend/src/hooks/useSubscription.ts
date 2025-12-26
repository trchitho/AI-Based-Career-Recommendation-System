import { useState, useEffect, useCallback, useRef } from 'react';
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

// Global cache to prevent multiple API calls across components
let globalSubscriptionData: SubscriptionData | null = null;
let globalLoading = false;
let globalError: string | null = null;
let globalFetchPromise: Promise<void> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

// Subscribers for state updates
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

export const useSubscription = () => {
  const [, forceUpdate] = useState({});
  const isMounted = useRef(true);

  // Subscribe to global state changes
  useEffect(() => {
    isMounted.current = true;
    const callback = () => {
      if (isMounted.current) {
        forceUpdate({});
      }
    };
    subscribers.add(callback);
    return () => {
      isMounted.current = false;
      subscribers.delete(callback);
    };
  }, []);

  const fetchSubscriptionData = useCallback(async (force = false) => {
    const now = Date.now();

    // Return cached data if still valid and not forcing refresh
    if (!force && globalSubscriptionData && (now - lastFetchTime) < CACHE_DURATION) {
      return;
    }

    // If already fetching, wait for that promise
    if (globalFetchPromise && !force) {
      await globalFetchPromise;
      return;
    }

    globalLoading = true;
    globalError = null;
    notifySubscribers();

    globalFetchPromise = (async () => {
      try {
        const response = await api.get('/api/subscription/usage');
        globalSubscriptionData = response.data;
        lastFetchTime = Date.now();
      } catch (err: any) {
        console.error('Failed to fetch subscription data:', err);
        globalError = err.response?.data?.message || 'Failed to load subscription data';
      } finally {
        globalLoading = false;
        globalFetchPromise = null;
        notifySubscribers();
      }
    })();

    await globalFetchPromise;
  }, []);

  const refreshSubscription = useCallback(() => {
    return fetchSubscriptionData(true); // Force refresh
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

  // Initial fetch on first mount
  useEffect(() => {
    if (!globalSubscriptionData && !globalFetchPromise) {
      fetchSubscriptionData();
    }
  }, [fetchSubscriptionData]);

  // Enhanced premium detection - Include Basic as a paid plan
  const planName = globalSubscriptionData?.subscription?.plan_name || 'Free';
  const isPremiumFromAPI = globalSubscriptionData?.subscription?.is_premium === true;
  const isPremiumFromPlan = planName === 'Pro' || planName === 'Premium' || planName === 'Enterprise' || planName === 'Basic';
  const finalIsPremium = isPremiumFromAPI || isPremiumFromPlan;

  return {
    subscriptionData: globalSubscriptionData,
    loading: globalLoading,
    error: globalError,
    refreshSubscription,
    checkFeatureAccess,
    isPremium: finalIsPremium,
    planName: planName
  };
};

// Export function to clear cache (useful for logout)
export const clearSubscriptionCache = () => {
  globalSubscriptionData = null;
  globalLoading = false;
  globalError = null;
  globalFetchPromise = null;
  lastFetchTime = 0;
  notifySubscribers();
};