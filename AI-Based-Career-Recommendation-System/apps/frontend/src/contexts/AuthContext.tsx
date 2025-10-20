import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
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
    // Check if user is already logged in
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
      const { access_token, user: userPayload } = response.data;

      if (access_token) {
        localStorage.setItem('accessToken', access_token);
      }

      // Use returned user if available; otherwise fetch
      if (userPayload) {
        setUser(userPayload);
      } else {
        const profileResponse = await api.get('/api/users/me');
        setUser(profileResponse.data);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || error?.message;
      console.error('Login failed:', msg || error);
      throw new Error(msg || 'Login failed');
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        full_name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      });
      const { access_token, user: userPayload } = response.data;

      if (access_token) {
        localStorage.setItem('accessToken', access_token);
      }

      // Use returned user if available; otherwise fetch
      if (userPayload) {
        setUser(userPayload);
      } else {
        const profileResponse = await api.get('/api/users/me');
        setUser(profileResponse.data);
      }
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
