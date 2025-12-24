import { useState, useEffect, useCallback } from 'react';
import { useFeatureAccess } from './useFeatureAccess';
import { useAuth } from '../contexts/AuthContext';

interface UsageData {
  feature: string;
  current_usage: number;
  limit: number;
  remaining: number;
}

// Local storage keys for tracking usage
const USAGE_KEYS = {
  career_view: 'usage_career_view',
  assessment: 'usage_assessment', 
  roadmap_level: 'usage_roadmap_level'
};

export const useUsageTracking = () => {
  const { currentPlan } = useFeatureAccess();
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData[]>([]);

  // Get current month key for resetting monthly limits
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  };

  // Get user-specific storage key
  const getUserStorageKey = (feature: string): string => {
    const monthKey = getCurrentMonthKey();
    const userId = user?.id || 'anonymous';
    return `${USAGE_KEYS[feature as keyof typeof USAGE_KEYS]}_${userId}_${monthKey}`;
  };

  // Get usage from localStorage (user-specific)
  const getUsageFromStorage = (feature: string): number => {
    // Force clean state if reset flag is set
    if ((window as any).forceCleanUsage) {
      return 0;
    }
    
    const storageKey = getUserStorageKey(feature);
    const stored = localStorage.getItem(storageKey);
    
    // If no stored data, start from 0 (clean state)
    if (!stored) {
      return 0;
    }
    
    const parsedValue = parseInt(stored, 10);
    
    // Validate the parsed value - if invalid, start from 0
    if (isNaN(parsedValue) || parsedValue < 0) {
      localStorage.removeItem(storageKey); // Clean up invalid data
      return 0;
    }
    
    return parsedValue;
  };

  // Set usage to localStorage (user-specific)
  const setUsageToStorage = (feature: string, usage: number) => {
    const storageKey = getUserStorageKey(feature);
    localStorage.setItem(storageKey, usage.toString());
  };

  // Increment usage for a feature
  const incrementUsage = (feature: string) => {
    console.log(`🔄 incrementUsage called for: ${feature}`);
    const currentUsage = getUsageFromStorage(feature);
    const newUsage = currentUsage + 1;
    console.log(`📊 Usage increment: ${currentUsage} → ${newUsage}`);
    setUsageToStorage(feature, newUsage);
    
    // Update state to trigger re-render
    generateUsageData();
    console.log('✅ Usage data regenerated');
  };

  // Generate usage data based on current plan - READ ACTUAL USAGE FROM STORAGE
  const generateUsageData = useCallback(() => {
    // Don't generate data if no user
    if (!user) {
      setUsageData([]);
      return;
    }

    const data: UsageData[] = [];
    
    // Career viewing limits
    if (currentPlan === 'free') {
      const currentUsage = getUsageFromStorage('career_view');
      data.push({
        feature: 'career_view',
        current_usage: currentUsage,
        limit: 1,
        remaining: Math.max(0, 1 - currentUsage)
      });
    } else if (currentPlan === 'basic') {
      const currentUsage = getUsageFromStorage('career_view');
      data.push({
        feature: 'career_view',
        current_usage: currentUsage,
        limit: 5,
        remaining: Math.max(0, 5 - currentUsage)
      });
    }
    // Premium/Pro have unlimited career viewing
    
    // Assessment limits - Always show for free and basic plans
    if (currentPlan === 'free') {
      const currentUsage = getUsageFromStorage('assessment');
      data.push({
        feature: 'assessment',
        current_usage: currentUsage,
        limit: 5,
        remaining: Math.max(0, 5 - currentUsage)
      });
    } else if (currentPlan === 'basic') {
      const currentUsage = getUsageFromStorage('assessment');
      data.push({
        feature: 'assessment',
        current_usage: currentUsage,
        limit: 20,
        remaining: Math.max(0, 20 - currentUsage)
      });
    }
    // Premium/Pro have unlimited assessments
    
    // Roadmap level limits
    if (currentPlan === 'free') {
      const currentUsage = getUsageFromStorage('roadmap_level');
      data.push({
        feature: 'roadmap_level',
        current_usage: currentUsage,
        limit: 1,
        remaining: Math.max(0, 1 - currentUsage)
      });
    } else if (currentPlan === 'basic') {
      const currentUsage = getUsageFromStorage('roadmap_level');
      data.push({
        feature: 'roadmap_level',
        current_usage: currentUsage,
        limit: 2,
        remaining: Math.max(0, 2 - currentUsage)
      });
    }
    // Premium/Pro have unlimited roadmap levels
    
    setUsageData(data);
  }, [currentPlan, user]); // Add user as dependency

  // Check if user can use a feature
  const canUseFeature = (feature: string): boolean => {
    const usage = usageData.find(u => u.feature === feature);
    if (!usage) return true; // Unlimited for premium/pro
    return usage.remaining > 0;
  };

  // Get remaining usage for a feature
  const getRemainingUsage = (feature: string): number => {
    const usage = usageData.find(u => u.feature === feature);
    return usage ? usage.remaining : -1; // -1 means unlimited
  };

  // Initialize usage data on mount and when plan/user changes
  useEffect(() => {
    generateUsageData();
  }, [generateUsageData]); // Use generateUsageData as dependency since it's now memoized

  return {
    usageData,
    incrementUsage,
    canUseFeature,
    getRemainingUsage,
    refreshUsage: generateUsageData
  };
};