import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
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

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await api.get('/api/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

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
      const msg = error?.response?.data?.detail || error?.response?.data?.message || error?.message;
      console.error('Registration failed:', msg || error);
      throw new Error(msg || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
