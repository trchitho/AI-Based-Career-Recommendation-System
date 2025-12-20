import { useSubscription } from '../../hooks/useSubscription';

const QuickSubscriptionTest = () => {
  const { subscriptionData, isPremium, planName, loading } = useSubscription();

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'black',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>Quick Test:</strong></div>
      <div>Plan: {planName}</div>
      <div>Is Premium: {isPremium ? '✅ YES' : '❌ NO'}</div>
      <div>API Premium: {subscriptionData?.subscription?.is_premium ? '✅' : '❌'}</div>
      <div>Status: {subscriptionData?.subscription?.status}</div>
      <div>Limits: {JSON.stringify(subscriptionData?.subscription?.limits)}</div>
    </div>
  );
};

export default QuickSubscriptionTest;