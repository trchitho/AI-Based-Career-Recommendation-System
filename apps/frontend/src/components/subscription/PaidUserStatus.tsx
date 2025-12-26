import { useSubscription } from '../../hooks/useSubscription';
import { useState } from 'react';
import UpgradeOptions from './UpgradeOptions';
import MainLayout from '../layout/MainLayout';

const PaidUserStatus = () => {
  const { subscriptionData, isPremium, planName } = useSubscription();
  const [showAllPlans, setShowAllPlans] = useState(false);

  if (!isPremium) return null;

  const subscription = subscriptionData?.subscription;
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at) : null;

  // Check if user can upgrade to higher plans
  const currentPlan = planName || 'Premium';
  const canUpgrade = !currentPlan?.toLowerCase().includes('pro');

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🎉 You are a Premium Member!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Thank you for trusting and using our service
            </p>
          </div>

          {/* Subscription Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">{planName} Plan</h2>
                  <p className="text-green-100">Status: Active</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Subscription Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Plan Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Plan:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{planName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Status:</span>
                      <span className="text-green-600 font-semibold">Paid</span>
                    </div>
                    {expiryDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Expires:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {expiryDate.toLocaleDateString('en-US')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Current Benefits
                  </h3>
                  <div className="space-y-2">
                    {[
                      'Unlimited assessments',
                      'View all careers',
                      'Full 6-level roadmaps',
                      'Advanced AI analysis',
                      'Priority support'
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Continue to Dashboard
                </button>

                <button
                  onClick={() => window.location.href = '/careers'}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
                >
                  Explore Careers
                </button>
              </div>

              {/* Show Upgrade Options Button */}
              {canUpgrade && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowAllPlans(!showAllPlans)}
                    className="w-full px-4 py-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className={`w-4 h-4 transition-transform ${showAllPlans ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showAllPlans ? 'Hide upgrade options' : 'View upgrade options'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upgrade Options Section */}
          {showAllPlans && (
            <UpgradeOptions
              currentPlan={currentPlan}
              onClose={() => setShowAllPlans(false)}
            />
          )}

          {/* Additional Options */}
          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => window.location.href = '/pricing?view=all'}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              View all plans
            </button>

            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Need help? Contact us via email:
              <a href="mailto:careersystemai@gmail.com" className="text-green-600 hover:text-green-700 ml-1">
                careersystemai@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PaidUserStatus;