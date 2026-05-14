import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import axios from 'axios';
import api from '../lib/api';
import { clearSubscriptionCache } from '../hooks/useSubscription';

const API_BASE_URL = import.meta.env.DEV ? '/' : (import.meta.env.VITE_API_URL || '/');

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string; // 'admin' | 'user' | 'manager'
  is_email_verified?: boolean;
}

interface RegisterResult {
  verificationRequired: boolean;
  message?: string;
  verifyUrl?: string;
  devToken?: string;
  user?: User | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<RegisterResult>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false); // Prevent duplicate initialization

  useEffect(() => {
    if (initRef.current) return; // Prevent duplicate calls
    initRef.current = true;

    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!token && !refreshToken) {
        setLoading(false);
        return;
      }

      // Nếu không có accessToken nhưng có refreshToken, thử refresh trước
      if (!token && refreshToken) {
        try {
          const base = API_BASE_URL.replace(/\/$/, '');
          const resp = await axios.post(`${base}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newAccess = resp.data?.access_token;
          if (newAccess) {
            localStorage.setItem('accessToken', newAccess);
          } else {
            localStorage.removeItem('refreshToken');
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setLoading(false);
          return;
        }
      }

      try {
        // Interceptor sẽ tự động refresh nếu accessToken hết hạn và retry request
        const response = await api.get('/api/users/me');
        setUser(response.data);
      } catch (error: any) {
        console.error('Failed to fetch user profile:', error);
        // Interceptor đã xử lý 401 (refresh + retry hoặc redirect login)
        // Chỉ xóa token với lỗi khác (403, 404, 500...)
        const status = error?.response?.status;
        if (status && status !== 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []); // Remove dependencies to prevent re-runs

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, refresh_token, user: userPayload } = response.data;

      if (access_token) localStorage.setItem('accessToken', access_token);
      if (refresh_token) localStorage.setItem('refreshToken', refresh_token);

      if (userPayload) {
        setUser(userPayload);
        return userPayload as User;
      } else {
        const profileResponse = await api.get('/api/users/me');
        setUser(profileResponse.data);
        return profileResponse.data as User;
      }
    } catch (error: any) {
      if (error?.response) {
        const detail = error?.response?.data?.detail;
        if (detail && typeof detail === 'object') {
          return Promise.reject({ response: { status: error.response.status, data: detail } });
        }
        return Promise.reject(error);
      }

      return Promise.reject({
        response: {
          status: 0,
          data: { detail: "Không thể kết nối server" }
        }
      });
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        full_name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      });
      const data = response.data;
      const { access_token, refresh_token, user: userPayload } = data;

      // If BE still returns tokens (e.g., admin flow), keep existing behavior
      if (access_token && refresh_token) {
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);

        if (userPayload) {
          setUser(userPayload);
          return { verificationRequired: false, user: userPayload as User };
        } else {
          const profileResponse = await api.get('/api/users/me');
          setUser(profileResponse.data);
          return { verificationRequired: false, user: profileResponse.data as User };
        }
      }

      // Verification-first flow
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      return {
        verificationRequired: true,
        message: data?.message || 'Please verify your email to activate your account.',
        verifyUrl: data?.verify_url,
        devToken: data?.dev_token,
        user: data?.user || null,
      } as RegisterResult;
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = error?.response?.data?.message;
      const isObj = typeof detail === 'object' && detail !== null;
      const errorCode = isObj ? detail?.error_code : undefined;
      const detailMessage = isObj ? detail?.message : detail;
      let friendly = detailMessage || message || error?.message;
      if (errorCode === 'EMAIL_ALREADY_REGISTERED') {
        friendly = 'Email already exists, please try again with another email.';
      }
      if (!friendly || typeof friendly === 'object') {
        friendly = 'Registration failed. Please try again.';
      }
      console.error('Registration failed:', friendly);
      throw new Error(friendly);
    }
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');

    // Revoke tokens server-side (blacklist access_token for TC02)
    if (refreshToken) {
      api.post('/api/auth/logout', {
        refresh_token: refreshToken,
        access_token: accessToken || '',
      }).catch(() => {/* ignore network errors on logout */ });
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearSubscriptionCache();
    
    // Clear all game-related data to prevent data leakage between users
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('pg_backup_') ||
        key.startsWith('pg_session_') ||
        key.startsWith('assessment_session_') ||
        key.startsWith('assessment_seed_') ||
        key === 'pg_backup_current'
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setUser(null);
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: !!user && (user as any).role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
