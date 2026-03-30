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
  macAddress: string | null;
  routerIdentity: string | null;
  userIp: string | null;
  login: (username: string, password: string, macAddress?: string, routerIdentity?: string, fromWifi?: boolean) => Promise<{ user: User; token: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setMacAddress: (mac: string | null) => void;
  setRouterIdentity: (router: string | null) => void;
  setUserIp: (ip: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [macAddress, setMacAddressState] = useState<string | null>(null);
  const [routerIdentity, setRouterIdentityState] = useState<string | null>(null);
  const [userIp, setUserIpState] = useState<string | null>(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      const storedToken = getToken();
      const storedUser = getStoredUser();
      const storedMac = localStorage.getItem('macAddress');
      const storedRouter = localStorage.getItem('routerIdentity');
      const storedIp = localStorage.getItem('userIp');

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(storedUser);
      }
      if (storedMac) setMacAddressState(storedMac);
      if (storedRouter) setRouterIdentityState(storedRouter);
      if (storedIp) setUserIpState(storedIp);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (username: string, password: string, macAddress?: string, routerIdentity?: string, fromWifi?: boolean) => {
      setIsLoading(true);
      try {
        const requestBody: any = { username, password };
        
        // If WiFi parameters are present, this is a WiFi login
        if (macAddress || routerIdentity || fromWifi) {
          requestBody.fromWifi = true;
          if (macAddress) requestBody.macAddress = macAddress;
          console.log('📡 WiFi login detected in AuthContext:', { macAddress, routerIdentity });
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/auth/login`,
          
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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

        // Store WiFi info and password for potential silent auth
        if (macAddress) {
          localStorage.setItem('macAddress', macAddress);
          setMacAddressState(macAddress);
        }
        if (routerIdentity) {
          localStorage.setItem('routerIdentity', routerIdentity);
          setRouterIdentityState(routerIdentity);
        }
        
        // Store password for silent authentication during payment
        if (password) {
          localStorage.setItem('wifiSessionPassword', password);
          console.log('🔒 Password stored for silent authentication');
        }

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
      localStorage.removeItem('macAddress');
      localStorage.removeItem('routerIdentity');
      localStorage.removeItem('userIp');
      setMacAddressState(null);
      setRouterIdentityState(null);
      setUserIpState(null);
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

  const updateMacAddress = useCallback((mac: string | null) => {
    if (mac) {
      localStorage.setItem('macAddress', mac);
      setMacAddressState(mac);
    } else {
      localStorage.removeItem('macAddress');
      setMacAddressState(null);
    }
  }, []);

  const updateRouterIdentity = useCallback((router: string | null) => {
    if (router) {
      localStorage.setItem('routerIdentity', router);
      setRouterIdentityState(router);
    } else {
      localStorage.removeItem('routerIdentity');
      setRouterIdentityState(null);
    }
  }, []);

  const updateUserIp = useCallback((ip: string | null) => {
    if (ip) {
      localStorage.setItem('userIp', ip);
      setUserIpState(ip);
    } else {
      localStorage.removeItem('userIp');
      setUserIpState(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    macAddress,
    routerIdentity,
    userIp,
    login,
    logout,
    setUser: updateUser,
    setMacAddress: updateMacAddress,
    setRouterIdentity: updateRouterIdentity,
    setUserIp: updateUserIp,
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
