/**
 * @file api-client.ts
 * @description Centralized Axios instance với interceptors, error normalization,
 *              auto token refresh và typed error responses.
 *
 * Tại sao cần file này?
 * - Một nơi duy nhất để cấu hình auth header (DRY)
 * - Normalize tất cả API errors thành ApiError type (không để AxiosError rò rỉ vào business code)
 * - Auto refresh token khi 401 mà không cần xử lý ở từng service
 *
 * Update guide:
 *   - Thêm request timeout toàn cục  → sửa `timeout` trong axios.create()
 *   - Đổi cách lưu token (vd: cookie) → sửa TokenStorage class
 *   - Thêm header mới cho mọi request → thêm vào requestInterceptor
 *   - Đổi API base URL theo env       → sửa getBaseUrl()
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

/** Chuẩn hóa lỗi từ API — không để AxiosError lọt vào Service/Component */
export interface ApiError {
  /** HTTP status code (400, 401, 404, 500…) */
  status: number;
  /** Message hiển thị cho user */
  message: string;
  /** Error code từ backend (vd: "NOT_FOUND", "VALIDATION_ERROR") */
  code?: string;
  /** Chi tiết lỗi validation theo field */
  fieldErrors?: Record<string, string>;
  /** Raw error để debug */
  raw?: unknown;
}

/** Kiểm tra error có phải ApiError không */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

// ─────────────────────────────────────────────────────────────
//  Token Storage — tách biệt khỏi API client để dễ swap (cookie, memory…)
// ─────────────────────────────────────────────────────────────

/**
 * Quản lý access/refresh token trong localStorage.
 * Nếu muốn chuyển sang cookie: thay class này mà không cần sửa api-client.
 */
export const TokenStorage = {
  /** @returns Access token hoặc null */
  getAccessToken: (): string | null => localStorage.getItem('accessToken'),

  /** @returns Refresh token hoặc null */
  getRefreshToken: (): string | null => localStorage.getItem('refreshToken'),

  /** @param token - Access token mới từ server */
  setAccessToken: (token: string): void => localStorage.setItem('accessToken', token),

  /** Xoá cả access và refresh token (logout) */
  clearAll: (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  /** @returns True nếu có access token */
  isAuthenticated: (): boolean => !!localStorage.getItem('accessToken'),
} as const;

// ─────────────────────────────────────────────────────────────
//  Base URL
// ─────────────────────────────────────────────────────────────

/** Lấy base URL theo environment. */
function getBaseUrl(): string {
  // Dev: dùng '/' để Vite proxy forward đến localhost:8000
  if (import.meta.env.DEV) return '/';
  // Prod: dùng env var hoặc fallback về '/'
  return import.meta.env.VITE_API_URL || '/';
}

// ─────────────────────────────────────────────────────────────
//  Error Normalizer
// ─────────────────────────────────────────────────────────────

/**
 * Chuyển AxiosError thành ApiError chuẩn.
 * Không để AxiosError rò rỉ ra ngoài api-client.
 *
 * @param error - Raw AxiosError từ interceptor
 * @returns ApiError với thông tin đã normalize
 */
function normalizeAxiosError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;

  // 1. Ưu tiên message từ backend
  const backendMessage =
    (data?.detail as string) ||
    (data?.message as string) ||
    (data?.error as string) ||
    null;

  // 2. Fallback message theo HTTP status
  const fallbackMessages: Record<number, string> = {
    400: 'Dữ liệu không hợp lệ',
    401: 'Phiên đăng nhập hết hạn',
    403: 'Bạn không có quyền thực hiện hành động này',
    404: 'Không tìm thấy dữ liệu',
    409: 'Dữ liệu đã tồn tại',
    422: 'Dữ liệu không đúng định dạng',
    429: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    500: 'Lỗi server, vui lòng thử lại sau',
    503: 'Dịch vụ tạm thời không khả dụng',
  };

  // 3. Parse field-level validation errors (FastAPI 422 format)
  const fieldErrors: Record<string, string> = {};
  if (status === 422 && Array.isArray(data?.detail)) {
    for (const item of data.detail as { loc: string[]; msg: string }[]) {
      const field = item.loc?.slice(1).join('.') ?? 'unknown';
      fieldErrors[field] = item.msg;
    }
  }

  return {
    status,
    message:
      backendMessage ||
      fallbackMessages[status] ||
      error.message ||
      'Đã xảy ra lỗi không mong đợi',
    code: data?.code as string | undefined,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    raw: error,
  };
}

// ─────────────────────────────────────────────────────────────
//  Axios Instance
// ─────────────────────────────────────────────────────────────

/** Axios instance đã được cấu hình với interceptors */
const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15_000,           // 15 giây timeout
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor ───────────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    // 1. Attach access token vào Authorization header
    const accessToken = TokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(normalizeAxiosError(error)),
);

// ── Response Interceptor ──────────────────────────────────────

/** Flag để tránh loop refresh token */
let isRefreshingToken = false;
/** Queue các request đang chờ refresh token */
let pendingRequestQueue: Array<(newToken: string) => void> = [];

apiClient.interceptors.response.use(
  // Success: trả về response nguyên vẹn
  (response: AxiosResponse) => response,

  // Error: xử lý token refresh + normalize error
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retried?: boolean };
    const isUnauthorized = error.response?.status === 401;
    const isNotAlreadyRetried = !originalRequest._retried;

    // 1. Thử refresh token khi 401 và chưa retry
    if (isUnauthorized && isNotAlreadyRetried && originalRequest) {
      originalRequest._retried = true;

      if (isRefreshingToken) {
        // 2. Đang refresh: xếp request vào hàng đợi
        return new Promise((resolve) => {
          pendingRequestQueue.push((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      // 3. Bắt đầu quá trình refresh
      isRefreshingToken = true;
      const refreshToken = TokenStorage.getRefreshToken();

      if (refreshToken) {
        try {
          const { data } = await axios.post<{ access_token: string }>(
            `${getBaseUrl()}api/auth/refresh`,
            { refresh_token: refreshToken },
          );
          const newAccessToken = data.access_token;

          // 4. Lưu token mới, xử lý queue
          TokenStorage.setAccessToken(newAccessToken);
          pendingRequestQueue.forEach((callback) => callback(newAccessToken));
          pendingRequestQueue = [];

          // 5. Retry request gốc với token mới
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch {
          // Refresh thất bại → logout
          pendingRequestQueue = [];
          TokenStorage.clearAll();
          redirectToLogin();
        } finally {
          isRefreshingToken = false;
        }
      } else {
        // Không có refresh token → logout
        TokenStorage.clearAll();
        redirectToLogin();
      }
    }

    // 6. Normalize và propagate error
    return Promise.reject(normalizeAxiosError(error));
  },
);

/** Redirect về login page, tránh redirect nếu đã ở login */
function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default apiClient;
