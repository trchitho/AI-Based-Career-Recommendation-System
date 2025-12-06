/**
 * useSubscription Hook
 * Hook để quản lý subscription và check giới hạn
 */
import { useState, useEffect, useCallback } from 'react';
import {
    getMyPlan,
    checkAssessmentLimit,
    checkCareerAccess,
    checkRoadmapLevel,
    trackAssessment,
    trackCareerView,
    type Plan,
    type Usage,
} from '../services/subscriptionService';

export const useSubscription = () => {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load plan và usage
    const loadPlan = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getMyPlan();
            setPlan(data.plan);
            setUsage(data.usage);
        } catch (err: any) {
            setError(err.message || 'Failed to load plan');
            console.error('Load plan error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlan();
    }, [loadPlan]);

    // Check có thể làm bài test không
    const canTakeAssessment = useCallback(async () => {
        try {
            const result = await checkAssessmentLimit();
            return result;
        } catch (err: any) {
            console.error('Check assessment error:', err);
            return { allowed: false, message: 'Error checking limit' };
        }
    }, []);

    // Check có thể xem nghề nghiệp không
    const canViewCareer = useCallback(async (careerId: number) => {
        try {
            const result = await checkCareerAccess(careerId);
            return result;
        } catch (err: any) {
            console.error('Check career error:', err);
            return { allowed: false, message: 'Error checking access' };
        }
    }, []);

    // Check có thể xem roadmap level không
    const canViewRoadmapLevel = useCallback(async (level: number) => {
        try {
            const result = await checkRoadmapLevel(level);
            return result;
        } catch (err: any) {
            console.error('Check roadmap error:', err);
            return { allowed: false, message: 'Error checking access' };
        }
    }, []);

    // Track assessment
    const recordAssessment = useCallback(async () => {
        try {
            await trackAssessment();
            await loadPlan(); // Reload để cập nhật usage
        } catch (err: any) {
            console.error('Track assessment error:', err);
            throw err;
        }
    }, [loadPlan]);

    // Track career view
    const recordCareerView = useCallback(
        async (careerId: number) => {
            try {
                await trackCareerView(careerId);
                await loadPlan(); // Reload để cập nhật usage
            } catch (err: any) {
                console.error('Track career error:', err);
                throw err;
            }
        },
        [loadPlan]
    );

    // Helper functions
    const isPremium = plan?.name === 'premium' || plan?.name === 'enterprise';
    const isFree = plan?.name === 'free';

    const assessmentsRemaining = () => {
        if (!plan || !usage) return 0;
        if (plan.max_assessments_per_month === -1) return Infinity;
        return Math.max(0, plan.max_assessments_per_month - usage.assessments_count);
    };

    const careersRemaining = () => {
        if (!plan || !usage) return 0;
        if (plan.can_view_all_careers) return Infinity;
        return Math.max(0, plan.max_career_views - usage.careers_viewed.length);
    };

    return {
        plan,
        usage,
        loading,
        error,
        isPremium,
        isFree,
        assessmentsRemaining: assessmentsRemaining(),
        careersRemaining: careersRemaining(),
        canTakeAssessment,
        canViewCareer,
        canViewRoadmapLevel,
        recordAssessment,
        recordCareerView,
        reload: loadPlan,
    };
};
