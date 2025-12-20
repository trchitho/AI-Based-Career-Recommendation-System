import { useSubscription } from '../../hooks/useSubscription';

const SubscriptionDebugPanel = () => {
  const { subscriptionData, loading, error, refreshSubscription, isPremium, planName } = useSubscription();

  if (process.env['NODE_ENV'] === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold">🔍 Subscription Debug</h4>
        <button
          onClick={refreshSubscription}
          className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>
      
      {error && (
        <div className="text-red-400 mb-2">
          ❌ Error: {error}
        </div>
      )}
      
      <div className="space-y-1">
        <div>
          <strong>Plan:</strong> 
          <span className={isPremium ? 'text-green-400' : 'text-yellow-400'}>
            {planName}
          </span>
        </div>
        
        <div>
          <strong>Is Premium:</strong> 
          <span className={isPremium ? 'text-green-400' : 'text-red-400'}>
            {isPremium ? '✅ Yes' : '❌ No'}
          </span>
        </div>
        
        {subscriptionData?.subscription && (
          <>
            <div>
              <strong>Status:</strong> {subscriptionData.subscription.status}
            </div>
            
            <div>
              <strong>Expires:</strong> {
                subscriptionData.subscription.expires_at 
                  ? new Date(subscriptionData.subscription.expires_at).toLocaleDateString()
                  : 'Never'
              }
            </div>
            
            <div>
              <strong>Limits:</strong>
              <div className="ml-2 text-xs">
                {Object.entries(subscriptionData.subscription.limits || {}).map(([key, value]) => (
                  <div key={key}>
                    {key}: {value === -1 ? '∞' : value}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {subscriptionData?.usage && subscriptionData.usage.length > 0 && (
          <div>
            <strong>Usage:</strong>
            <div className="ml-2 text-xs">
              {subscriptionData.usage.map((usage) => (
                <div key={usage.feature}>
                  {usage.feature}: {usage.current_usage}/{usage.limit === -1 ? '∞' : usage.limit}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SubscriptionDebugPanel;