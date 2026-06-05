/**
 * @deprecated Dùng api-client.ts cho code mới.
 * File này giữ nguyên để backward compatibility với các service cũ.
 * Migration: thay `import api from '../lib/api'`
 *            thành `import apiClient from '../lib/api-client'`
 */
import axios from 'axios';

// In dev, use relative base to leverage Vite proxy (avoids CORS).
// In prod, use VITE_API_URL if provided.
const API_BASE_URL = import.meta.env.DEV
  ? '/'
  : (import.meta.env.VITE_API_URL || '/');

const api = axios.create({
  baseURL: API_BASE_URL,
  // Default 60s — AI endpoints (recommendations, skill-gap, interview) can take 10-90s.
  // Per-request override available via { timeout: N } in axios call.
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
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
          const base = (api.defaults.baseURL || '/').replace(/\/$/, '');
          const resp = await axios.post(`${base}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newAccess = resp.data?.access_token;
          if (newAccess) {
            localStorage.setItem('accessToken', newAccess);
            // Set the new token directly - request interceptor will see it's already set
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
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
