/**
 * @file hooks/useAsync.ts
 * @description Generic hook để quản lý async state (loading/data/error).
 *
 * Tại sao cần hook này?
 * - Loại bỏ pattern lặp lại: useState(loading) + useState(data) + useState(error)
 * - Xử lý race condition khi component unmount giữa chừng (cleanup)
 * - Consistent error handling qua isApiError()
 *
 * Update guide:
 *   - Thêm retry logic    → thêm retryCount param vào execute()
 *   - Thêm toast on error → gọi addToast trong handleError()
 *   - Thêm caching        → tích hợp với react-query hoặc SWR
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '../lib/api-client';

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

export interface AsyncState<TData> {
  /** Data từ async operation, null khi chưa có */
  data: TData | null;
  /** True trong khi đang fetch */
  isLoading: boolean;
  /** Error message nếu thất bại */
  error: string | null;
  /** True nếu đã fetch xong ít nhất 1 lần */
  hasFetched: boolean;
}

export interface UseAsyncOptions<TData> {
  /** Gọi ngay khi mount (default: false) */
  immediate?: boolean;
  /** Giá trị data ban đầu */
  initialData?: TData | null;
  /** Callback khi fetch thành công */
  onSuccess?: (data: TData) => void;
  /** Callback khi fetch thất bại */
  onError?: (errorMessage: string) => void;
}

export interface UseAsyncReturn<TData, TArgs extends unknown[]> extends AsyncState<TData> {
  /** Thực thi async function */
  execute: (...args: TArgs) => Promise<TData | null>;
  /** Reset state về ban đầu */
  reset: () => void;
  /** Set data thủ công (optimistic update) */
  setData: (data: TData | null) => void;
}

// ─────────────────────────────────────────────────────────────
//  Hook Implementation
// ─────────────────────────────────────────────────────────────

/**
 * Hook quản lý async state cho bất kỳ async operation nào.
 *
 * @template TData  - Type của data trả về
 * @template TArgs  - Type của arguments cho asyncFn
 *
 * @param asyncFn  - Async function cần execute
 * @param options  - Cấu hình (immediate, initialData, callbacks)
 *
 * @returns AsyncState + execute + reset + setData
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error, execute } = useAsync(
 *   (userId: number) => mentorMatchingService.findMentors(userId)
 * );
 *
 * // Auto-fetch on mount
 * const { data: sessions } = useAsync(
 *   () => scheduleService.mySessions(),
 *   { immediate: true }
 * );
 */
export function useAsync<TData, TArgs extends unknown[] = []>(
  asyncFn: (...args: TArgs) => Promise<TData>,
  options: UseAsyncOptions<TData> = {},
): UseAsyncReturn<TData, TArgs> {
  const {
    immediate = false,
    initialData = null,
    onSuccess,
    onError,
  } = options;

  // ── State ────────────────────────────────────────────────────
  const [data, setData] = useState<TData | null>(initialData);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Ref để tránh setState sau khi unmount
  const isMountedRef = useRef(true);

  // Ref để store callbacks (tránh dependency trong useCallback)
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef   = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current   = onError;

  // ── Cleanup on unmount ───────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Execute ──────────────────────────────────────────────────
  const execute = useCallback(
    async (...args: TArgs): Promise<TData | null> => {
      // 1. Set loading state
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        // 2. Gọi async function
        const result = await asyncFn(...args);

        // 3. Update state nếu component vẫn mounted
        if (isMountedRef.current) {
          setData(result);
          setHasFetched(true);
          onSuccessRef.current?.(result);
        }

        return result;
      } catch (caughtError) {
        // 4. Normalize error message
        const errorMessage = extractErrorMessage(caughtError);

        if (isMountedRef.current) {
          setError(errorMessage);
          setHasFetched(true);
          onErrorRef.current?.(errorMessage);
        }

        return null;
      } finally {
        // 5. Luôn tắt loading (dù success hay fail)
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [asyncFn], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Auto-execute on mount ────────────────────────────────────
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as TArgs));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset ────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
    setHasFetched(false);
  }, [initialData]);

  return { data, isLoading, error, hasFetched, execute, reset, setData };
}

// ─────────────────────────────────────────────────────────────
//  Helper
// ─────────────────────────────────────────────────────────────

/**
 * Extract human-readable error message từ bất kỳ loại error nào.
 *
 * @param error - Unknown error từ catch block
 * @returns String error message
 */
function extractErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Đã xảy ra lỗi không mong đợi';
}
