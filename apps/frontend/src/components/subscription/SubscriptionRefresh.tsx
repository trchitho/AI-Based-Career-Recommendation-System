import { useEffect, useState } from 'react';
import { useSubscription, clearSubscriptionCache } from '../../hooks/useSubscription';

interface SubscriptionRefreshProps {
  onUpgradeDetected?: () => void;
}

const SubscriptionRefresh = ({ onUpgradeDetected }: SubscriptionRefreshProps) => {
  const { subscriptionData, refreshSubscription, isPremium, planName } = useSubscription();
  const [lastPlanName, setLastPlanName] = useState<string>('');
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);

  useEffect(() => {
    // Detect upgrade
    if (subscriptionData && lastPlanName && lastPlanName !== planName) {
      if (planName !== 'Free' && lastPlanName === 'Free') {
        setShowUpgradeSuccess(true);
        onUpgradeDetected?.();

        // Auto hide after 5 seconds
        setTimeout(() => {
          setShowUpgradeSuccess(false);
        }, 5000);
      }
    }

    if (subscriptionData) {
      setLastPlanName(planName);
    }
  }, [subscriptionData, planName, lastPlanName, onUpgradeDetected]);

  // Listen for payment success events
  useEffect(() => {
    const handlePaymentSuccess = () => {
      console.log('Payment success detected, refreshing subscription...');
      // Clear cache first to ensure fresh data
      clearSubscriptionCache();
      // Refresh subscription after payment success
      setTimeout(() => {
        refreshSubscription();
      }, 1000); // Wait 1 second for backend to process
    };

    // Listen for custom events
    const handleCustomEvent = (e: CustomEvent) => {
      console.log('Payment success event received:', e.detail);
      handlePaymentSuccess();
    };

    // Listen for subscription-updated event (from paymentService)
    const handleSubscriptionUpdated = () => {
      console.log('Subscription updated event received');
      handlePaymentSuccess();
    };

    // Listen for storage changes (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'payment_success') {
        console.log('Payment success storage event:', e.newValue);
        handlePaymentSuccess();
      }
    };

    window.addEventListener('payment_success', handleCustomEvent as EventListener);
    window.addEventListener('subscription-updated', handleSubscriptionUpdated);
    window.addEventListener('storage', handleStorageChange);

    // Check URL params for payment success on mount
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      console.log('Payment success detected in URL params');
      handlePaymentSuccess();

      // Clean up URL params
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment');
      window.history.replaceState({}, '', newUrl.toString());
    }

    // Check localStorage for recent payment success
    const lastPaymentSuccess = localStorage.getItem('payment_success');
    if (lastPaymentSuccess) {
      const timestamp = parseInt(lastPaymentSuccess);
      const now = Date.now();

      // If payment success was within last 5 minutes, refresh
      if (now - timestamp < 5 * 60 * 1000) {
        console.log('Recent payment success detected in localStorage');
        handlePaymentSuccess();
        localStorage.removeItem('payment_success'); // Clean up
      }
    }

    return () => {
      window.removeEventListener('payment_success', handleCustomEvent as EventListener);
      window.removeEventListener('subscription-updated', handleSubscriptionUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshSubscription]);

  if (!showUpgradeSuccess) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-up">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-6 shadow-2xl border border-green-400 max-w-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              Upgrade Successful!
            </h3>
            <p className="text-white/90 text-sm mb-3">
              You have been upgraded to <span className="font-semibold">{planName}</span> plan.
              All premium features are now unlocked!
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => setShowUpgradeSuccess(false)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowUpgradeSuccess(false)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRefresh;