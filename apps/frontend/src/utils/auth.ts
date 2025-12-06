/**
 * Auth utilities
 */

/**
 * Lấy access token từ localStorage
 * Thử cả 2 key: 'accessToken' (mới) và 'token' (cũ)
 */
export const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

/**
 * Kiểm tra user đã đăng nhập chưa
 */
export const isAuthenticated = (): boolean => {
    return !!getAccessToken();
};

/**
 * Lưu access token
 */
export const setAccessToken = (token: string): void => {
    localStorage.setItem('accessToken', token);
};

/**
 * Xóa access token
 */
export const removeAccessToken = (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
};
