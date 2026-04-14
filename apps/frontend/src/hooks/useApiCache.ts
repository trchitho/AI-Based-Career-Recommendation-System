import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

interface ApiCacheOptions {
    ttl?: number; // Time to live in milliseconds (default: 5 minutes)
    debounceMs?: number; // Debounce delay in milliseconds (default: 100ms)
}

/**
 * Hook to cache API responses and debounce requests
 * Prevents duplicate API calls and caches responses for better performance
 */
export function useApiCache<T>(options: ApiCacheOptions = {}) {
    const { ttl = 5 * 60 * 1000, debounceMs = 100 } = options;
    const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
    const pendingRequests = useRef<Map<string, Promise<T>>>(new Map());
    const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const getCachedData = useCallback((key: string): T | null => {
        const entry = cache.current.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now > entry.expiry) {
            cache.current.delete(key);
            return null;
        }

        return entry.data;
    }, []);

    const setCachedData = useCallback((key: string, data: T) => {
        const now = Date.now();
        cache.current.set(key, {
            data,
            timestamp: now,
            expiry: now + ttl,
        });
    }, [ttl]);

    const debouncedFetch = useCallback(
        <TArgs extends any[]>(
            key: string,
            fetchFn: (...args: TArgs) => Promise<T>,
            ...args: TArgs
        ): Promise<T> => {
            return new Promise((resolve, reject) => {
                // Clear existing timeout for this key
                const existingTimeout = timeouts.current.get(key);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                // Check cache first
                const cachedData = getCachedData(key);
                if (cachedData) {
                    resolve(cachedData);
                    return;
                }

                // Check if request is already pending
                const pendingRequest = pendingRequests.current.get(key);
                if (pendingRequest) {
                    pendingRequest.then(resolve).catch(reject);
                    return;
                }

                // Set debounced timeout
                const timeout = setTimeout(async () => {
                    try {
                        const request = fetchFn(...args);
                        pendingRequests.current.set(key, request);

                        const result = await request;
                        setCachedData(key, result);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    } finally {
                        pendingRequests.current.delete(key);
                        timeouts.current.delete(key);
                    }
                }, debounceMs);

                timeouts.current.set(key, timeout);
            });
        },
        [debounceMs, getCachedData, setCachedData]
    );

    const clearCache = useCallback((key?: string) => {
        if (key) {
            cache.current.delete(key);
            pendingRequests.current.delete(key);
            const timeout = timeouts.current.get(key);
            if (timeout) {
                clearTimeout(timeout);
                timeouts.current.delete(key);
            }
        } else {
            cache.current.clear();
            pendingRequests.current.clear();
            timeouts.current.forEach(timeout => clearTimeout(timeout));
            timeouts.current.clear();
        }
    }, []);

    const getCacheStats = useCallback(() => {
        const entries = Array.from(cache.current.entries());
        const now = Date.now();

        return {
            totalEntries: entries.length,
            validEntries: entries.filter(([, entry]) => now <= entry.expiry).length,
            expiredEntries: entries.filter(([, entry]) => now > entry.expiry).length,
            pendingRequests: pendingRequests.current.size,
        };
    }, []);

    return {
        debouncedFetch,
        getCachedData,
        setCachedData,
        clearCache,
        getCacheStats,
    };
}

// Specific hooks for common API patterns
export function useUserCache() {
    return useApiCache<any>({ ttl: 10 * 60 * 1000 }); // 10 minutes for user data
}

export function useSettingsCache() {
    return useApiCache<any>({ ttl: 30 * 60 * 1000 }); // 30 minutes for settings
}

export function useNotificationCache() {
    return useApiCache<any>({ ttl: 2 * 60 * 1000 }); // 2 minutes for notifications
}