import { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import api from '../../lib/api';

const SubscriptionDebug = () => {
  const { refreshSubscription, isPremium, planName } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleForceRefresh = async () => {
    setLoading(true);
    try {
      await refreshSubscription();
      console.log('Subscription refreshed');
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugSubscription = async () => {
    setLoading(true);
    try {
      // Get detailed subscription info
      const [usageResponse, subscriptionResponse] = await Promise.all([
        api.get('/api/subscription/usage'),
        api.get('/api/subscription/subscription')
      ]);

      setDebugInfo({
        usage: usageResponse.data,
        subscription: subscriptionResponse.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get debug info:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    // Clear localStorage cache
    localStorage.removeItem('payment_success');
    localStorage.removeItem('last_successful_payment');
    localStorage.removeItem('pending_payment_order');
    
    // Trigger refresh
    window.location.reload();
  };

  const handleManualUpgrade = async (planName: string) => {
    setLoading(true);
    try {
      const response = await api.post('/api/subscription/debug/upgrade', {
        plan_name: planName
      });
      
      if (response.data.success) {
        console.log('Manual upgrade successful');
        await refreshSubscription();
        alert(`Successfully upgraded to ${planName}!`);
      } else {
        alert(`Upgrade failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Manual upgrade failed:', error);
      alert('Manual upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          🔧 Subscription Debug
        </h3>
        
        {/* Current Status */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className={`font-bold ${isPremium ? 'text-green-600' : 'text-gray-600'}`}>
                {planName}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Premium:</span>
              <span className={isPremium ? 'text-green-600' : 'text-red-600'}>
                {isPremium ? '✓ Yes' : '✗ No'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleForceRefresh}
            disabled={loading}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Force Refresh'}
          </button>
          
          <button
            onClick={handleDebugSubscription}
            disabled={loading}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Debug Info
          </button>
          
          <button
            onClick={handleClearCache}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Clear Cache
          </button>
          
          {/* Manual Upgrade Buttons */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 mb-2">Manual Upgrade:</div>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => handleManualUpgrade('Premium')}
                disabled={loading}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
              >
                Premium
              </button>
              <button
                onClick={() => handleManualUpgrade('Pro')}
                disabled={loading}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
              >
                Pro
              </button>
            </div>
          </div>
        </div>

        {/* Debug Info Display */}
        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-40 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDebug;