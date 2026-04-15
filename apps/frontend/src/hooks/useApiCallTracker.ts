import { useRef, useCallback } from 'react';

interface ApiCall {
    url: string;
    timestamp: number;
    component: string;
}

// Global tracker to monitor API calls across components
const apiCallTracker = {
    calls: [] as ApiCall[],
    duplicateThreshold: 1000, // 1 second

    track(url: string, component: string) {
        const now = Date.now();
        const recentCalls = this.calls.filter(call =>
            call.url === url &&
            call.component === component &&
            now - call.timestamp < this.duplicateThreshold
        );

        if (recentCalls.length > 0) {
            console.warn(`🚨 Duplicate API call detected:`, {
                url,
                component,
                duplicateCount: recentCalls.length + 1,
                timeSinceLastCall: now - recentCalls[recentCalls.length - 1].timestamp
            });
        }

        this.calls.push({ url, component, timestamp: now });

        // Clean old calls (keep only last 100)
        if (this.calls.length > 100) {
            this.calls = this.calls.slice(-100);
        }
    },

    getDuplicates() {
        const now = Date.now();
        const recent = this.calls.filter(call => now - call.timestamp < 5000); // Last 5 seconds
        const grouped = recent.reduce((acc, call) => {
            const key = `${call.component}:${call.url}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).filter(([, count]) => count > 1);
    }
};

export const useApiCallTracker = (componentName: string) => {
    const trackCall = useCallback((url: string) => {
        apiCallTracker.track(url, componentName);
    }, [componentName]);

    const getDuplicates = useCallback(() => {
        return apiCallTracker.getDuplicates();
    }, []);

    return { trackCall, getDuplicates };
};

// Development helper to log duplicate calls
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const duplicates = apiCallTracker.getDuplicates();
        if (duplicates.length > 0) {
            console.group('🚨 API Call Duplicates Detected');
            duplicates.forEach(([key, count]) => {
                console.warn(`${key}: ${count} calls`);
            });
            console.groupEnd();
        }
    }, 3000);
}