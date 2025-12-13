/**
 * Subscription utilities for debugging and cache management
 */

export const clearSubscriptionCache = () => {
  // Clear localStorage cache
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.includes('subscription') || 
    key.includes('plan') || 
    key.includes('premium')
  );
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage cache
  const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
    key.includes('subscription') || 
    key.includes('plan') || 
    key.includes('premium')
  );
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
  
  console.log('Subscription cache cleared');
};

export const forceRefreshSubscription = async () => {
  // Clear cache first
  clearSubscriptionCache();
  
  // Force reload the page to get fresh data
  window.location.reload();
};

export const debugSubscriptionStatus = (subscriptionData: any) => {
  console.group('🔍 Subscription Debug');
  console.log('Raw subscription data:', subscriptionData);
  console.log('Is Premium:', subscriptionData?.subscription?.is_premium);
  console.log('Plan Name:', subscriptionData?.subscription?.plan_name);
  console.log('Status:', subscriptionData?.subscription?.status);
  console.log('Limits:', subscriptionData?.subscription?.limits);
  console.log('Expires At:', subscriptionData?.subscription?.expires_at);
  console.groupEnd();
};

export const checkPaymentStatus = async () => {
  try {
    // Check if there's a recent payment in URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const recentPayment = localStorage.getItem('recent_payment');
    
    if (paymentSuccess === 'true' || recentPayment) {
      console.log('Recent payment detected, forcing subscription refresh...');
      
      // Clear the payment indicators
      if (paymentSuccess) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (recentPayment) {
        localStorage.removeItem('recent_payment');
      }
      
      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};