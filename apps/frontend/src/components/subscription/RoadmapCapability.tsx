import React, { useState, useEffect } from 'react';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { getPaymentHistory, Payment } from '../../services/paymentService';
import { getAccessToken } from '../../utils/auth';

interface RoadmapCapabilityProps {
  className?: string;
}

const RoadmapCapability: React.FC<RoadmapCapabilityProps> = ({ className = "" }) => {
  const { currentPlan } = useFeatureAccess();
  
  // Add payment-based plan detection (same as other components)
  const [detectedPlan, setDetectedPlan] = useState<string>('Free');
  const isLoggedIn = !!getAccessToken();

  // Detect user plan from payment history
  const detectUserPlan = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const payments = await getPaymentHistory(0, 10);
      const successfulPayments = payments.filter((p: Payment) => p.status === 'success');
      
      if (successfulPayments.length > 0) {
        const latestPayment = successfulPayments[0];
        
        if (latestPayment.description.includes('Cơ Bản') || 
            (latestPayment.amount >= 99000 && latestPayment.amount < 250000)) {
          setDetectedPlan('Basic');
        } else if (latestPayment.description.includes('Premium') || 
                  (latestPayment.amount >= 250000 && latestPayment.amount < 450000)) {
          setDetectedPlan('Premium');
        } else if (latestPayment.description.includes('Pro') || 
                  latestPayment.amount >= 450000) {
          setDetectedPlan('Pro');
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
          description: 'Truy cập Level 1 (Nền tảng)',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: '🔒'
        };
      case 'basic':
        return {
          levels: [1, 2],
          description: 'Truy cập Level 1-2 (Nền tảng & Cơ bản)',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: '📚'
        };
      case 'premium':
      case 'pro':
        return {
          levels: [1, 2, 3, 4, 5],
          description: 'Truy cập tất cả Level (Đầy đủ)',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: '🚀'
        };
      default:
        return {
          levels: [1],
          description: 'Truy cập Level 1',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: '🔒'
        };
    }
  };
  
  const capability = getRoadmapCapability();
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Roadmap Level
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${capability.bgColor} ${capability.color} font-medium`}>
          {capability.icon} Level {capability.levels.join(', ')}
        </span>
      </div>
      
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`flex-1 h-2 rounded-full ${
              capability.levels.includes(level)
                ? 'bg-green-500'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      
      <p className={`text-xs ${capability.color}`}>
        {capability.description}
      </p>
      
      {detectedPlan !== 'Pro' && detectedPlan !== 'Premium' && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
          💡 {detectedPlan === 'Free' 
            ? 'Nâng cấp gói Cơ Bản để truy cập Level 1-2'
            : 'Nâng cấp Premium để truy cập tất cả Level'
          }
        </p>
      )}
    </div>
  );
};

export default RoadmapCapability;