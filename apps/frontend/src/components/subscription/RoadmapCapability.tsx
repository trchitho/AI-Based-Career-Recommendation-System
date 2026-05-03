import React, { useState, useEffect } from 'react';
import { getPaymentHistory, PaymentHistory } from '../../services/paymentService';
import { getAccessToken } from '../../utils/auth';
import './subscription-styles.css';

interface RoadmapCapabilityProps {
  className?: string;
}

const RoadmapCapability: React.FC<RoadmapCapabilityProps> = ({ className = "" }) => {
  // Add payment-based plan detection (same as other components)
  const [detectedPlan, setDetectedPlan] = useState<string>('Free');
  const isLoggedIn = !!getAccessToken();

  // Detect user plan from payment history
  const detectUserPlan = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const payments = await getPaymentHistory();
      const successfulPayments = payments.filter((p: PaymentHistory) => p.status === 'success');

      if (successfulPayments.length > 0) {
        const latestPayment = successfulPayments[0];
        const amount = latestPayment?.amount ?? 0;
        const description = latestPayment?.description ?? '';

        // Pro: 299,000 VND, Premium: 199,000 VND, Basic: 99,000 VND
        if (description.toLowerCase().includes('pro') || amount >= 280000) {
          setDetectedPlan('Pro');
        } else if (description.toLowerCase().includes('premium') || amount >= 180000) {
          setDetectedPlan('Premium');
        } else if (description.toLowerCase().includes('basic') || amount >= 80000) {
          setDetectedPlan('Basic');
        }
      }
    } catch (error) {
      console.error('Failed to detect user plan:', error);
    }
  };

  // Load plan detection on mount
  useEffect(() => {
    if (isLoggedIn) {
      detectUserPlan();
    }
  }, [isLoggedIn]);

  const getRoadmapCapability = () => {
    // Use detected plan instead of currentPlan for more accurate detection
    const planToUse = detectedPlan.toLowerCase();

    switch (planToUse) {
      case 'free':
        return {
          levels: [1],
          description: 'Foundation Level',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          darkBgColor: 'dark:bg-gray-700',
          darkColor: 'dark:text-gray-300'
        };
      case 'basic':
        return {
          levels: [1, 2],
          description: 'Foundation & Basic Levels',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          darkBgColor: 'dark:bg-blue-900',
          darkColor: 'dark:text-blue-300'
        };
      case 'premium':
      case 'pro':
        return {
          levels: [1, 2, 3, 4, 5],
          description: 'All Levels Unlocked',
          color: 'text-indigo-800',
          bgColor: 'bg-indigo-50',
          darkBgColor: 'dark:bg-indigo-950',
          darkColor: 'dark:text-indigo-300'
        };
      default:
        return {
          levels: [1],
          description: 'Foundation Level',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          darkBgColor: 'dark:bg-gray-700',
          darkColor: 'dark:text-gray-300'
        };
    }
  };

  const capability = getRoadmapCapability();

  return (
    <div className={`subscription-card bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Roadmap Level
        </span>
        <span className={`plan-badge text-xs px-3 py-1 rounded-full font-semibold ${capability.bgColor} ${capability.darkBgColor} ${capability.color} ${capability.darkColor}`}>
          Level {capability.levels[capability.levels.length - 1]}
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`roadmap-level flex-1 h-2.5 rounded-full transition-all duration-300 ${capability.levels.includes(level)
              ? 'active bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-sm'
              : 'locked bg-gray-200 dark:bg-gray-700'
              }`}
          />
        ))}
      </div>

      <p className={`text-xs font-medium ${capability.color} ${capability.darkColor}`}>
        {capability.description}
      </p>

      {detectedPlan !== 'Pro' && detectedPlan !== 'Premium' && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {detectedPlan === 'Free'
            ? 'Upgrade to unlock more levels'
            : 'Upgrade to Premium for full access'
          }
        </p>
      )}
    </div>
  );
};

export default RoadmapCapability;
