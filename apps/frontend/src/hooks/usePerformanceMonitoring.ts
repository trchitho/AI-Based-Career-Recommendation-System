/**
 * Performance monitoring hook for frontend optimization
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface PerformanceMetrics {
    performance: {
        total_requests: number;
        total_errors: number;
        routes: Record<string, {
            request_count: number;
            error_count: number;
            error_rate: number;
            avg_response_time: number;
            max_response_time: number;
            p95_response_time: number;
        }>;
        slow_requests: Array<{
            route: string;
            response_time: number;
            timestamp: number;
            status_code: number;
        }>;
    };
    database: {
        total_queries: number;
        average_time: number;
        error_count: number;
        error_rate: number;
        slow_queries_count: number;
        query_types: Record<string, number>;
    };
    cache: {
        total_requests: number;
        hits: number;
        misses: number;
        hit_rate: number;
        available: boolean;
    };
    errors: {
        total_errors: number;
        critical_errors: number;
        error_types: Record<string, number>;
        sentry_enabled: boolean;
    };
    timestamp: number;
}

interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
        database: {
            status: 'healthy' | 'unhealthy';
            response_time: number;
            message: string;
        };
        neo4j: {
            status: 'healthy' | 'unhealthy';
            response_time: number;
            message: string;
        };
        redis: {
            status: 'healthy' | 'unhealthy';
            response_time: number;
            message: string;
        };
    };
    performance: PerformanceMetrics['performance'];
    database_metrics: PerformanceMetrics['database'];
    cache_metrics: PerformanceMetrics['cache'];
    timestamp: number;
}

export const usePerformanceMonitoring = () => {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/metrics');
            setMetrics(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
            console.error('Failed to fetch performance metrics:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/health/detailed');
            setHealth(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch health status');
            console.error('Failed to fetch system health:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh metrics every 30 seconds
    useEffect(() => {
        fetchMetrics();
        fetchHealth();

        const interval = setInterval(() => {
            fetchMetrics();
            fetchHealth();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchMetrics, fetchHealth]);

    const getSystemStatus = useCallback(() => {
        if (!health) return 'unknown';

        const serviceStatuses = Object.values(health.services).map(service => service.status);
        const allHealthy = serviceStatuses.every(status => status === 'healthy');

        if (allHealthy) return 'healthy';
        if (serviceStatuses.some(status => status === 'healthy')) return 'degraded';
        return 'unhealthy';
    }, [health]);

    const getPerformanceScore = useCallback(() => {
        if (!metrics) return 0;

        let score = 100;

        // Deduct points for high error rates
        if (metrics.performance.total_errors > 0) {
            const errorRate = (metrics.performance.total_errors / metrics.performance.total_requests) * 100;
            score -= Math.min(errorRate * 2, 30); // Max 30 points deduction
        }

        // Deduct points for slow responses
        const avgResponseTime = Object.values(metrics.performance.routes)
            .reduce((sum, route) => sum + route.avg_response_time, 0) /
            Object.keys(metrics.performance.routes).length;

        if (avgResponseTime > 1) {
            score -= Math.min((avgResponseTime - 1) * 10, 20); // Max 20 points deduction
        }

        // Deduct points for low cache hit rate
        if (metrics.cache.available && metrics.cache.hit_rate < 80) {
            score -= (80 - metrics.cache.hit_rate) / 4; // Max 20 points deduction
        }

        // Deduct points for database issues
        if (metrics.database.error_rate > 0) {
            score -= Math.min(metrics.database.error_rate, 15); // Max 15 points deduction
        }

        return Math.max(Math.round(score), 0);
    }, [metrics]);

    return {
        metrics,
        health,
        loading,
        error,
        systemStatus: getSystemStatus(),
        performanceScore: getPerformanceScore(),
        refresh: () => {
            fetchMetrics();
            fetchHealth();
        }
    };
};

// Hook for tracking frontend performance
export const useFrontendPerformance = () => {
    const [pageLoadTime, setPageLoadTime] = useState<number | null>(null);
    const [renderTime, setRenderTime] = useState<number | null>(null);

    useEffect(() => {
        // Measure page load time
        if (typeof window !== 'undefined' && window.performance) {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            setPageLoadTime(loadTime);
        }
    }, []);

    const measureRenderTime = useCallback((startTime: number) => {
        const endTime = performance.now();
        const renderDuration = endTime - startTime;
        setRenderTime(renderDuration);

        // Log slow renders
        if (renderDuration > 100) {
            console.warn(`Slow render detected: ${renderDuration.toFixed(2)}ms`);
        }

        return renderDuration;
    }, []);

    const trackUserAction = useCallback((action: string, properties?: Record<string, any>) => {
        // Track user actions for analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', action, {
                ...properties,
                timestamp: new Date().toISOString(),
            });
        }

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('User Action:', action, properties);
        }
    }, []);

    return {
        pageLoadTime,
        renderTime,
        measureRenderTime,
        trackUserAction
    };
};