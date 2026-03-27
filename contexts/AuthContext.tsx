'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken, getStoredUser, setStoredUser } from '@/lib/api-client';

interface User {
  userId: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ user: User; token: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      const storedToken = getToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(storedUser);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/auth/login`,
          
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Extract token from response (handle both token and access_token)
        const newToken = data.data?.access_token || data.data?.token;
        const newUser = data.data?.user;

        if (!newToken || !newUser) {
          throw new Error('Invalid login response');
        }

        // Store token and user
        setToken(newToken);
        setStoredUser(newUser);
        setTokenState(newToken);
        setUser(newUser);

        return {
          user: newUser,
          token: newToken,
        };
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear local state and storage
      clearToken();
      setTokenState(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      setStoredUser(newUser);
    } else {
      clearToken();
      setTokenState(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    setUser: updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
