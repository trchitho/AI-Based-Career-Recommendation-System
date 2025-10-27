import axios from 'axios';

// In dev, use relative base to leverage Vite proxy (avoids CORS).
// In prod, use VITE_API_URL if provided.
const API_BASE_URL = import.meta.env.DEV
  ? '/'
  : (import.meta.env.VITE_API_URL || '/');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 try refresh, else redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const resp = await axios.post(`${api.defaults.baseURL}api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newAccess = resp.data?.access_token;
          if (newAccess) {
            localStorage.setItem('accessToken', newAccess);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        }
      } catch (_) {
        // fallthrough to logout
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
