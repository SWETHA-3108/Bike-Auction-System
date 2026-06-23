import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken, setRefreshHandler } from '../lib/api';
import type { User } from '../types';
import { connectSocket, disconnectSocket, updateSocketAuth } from '../lib/socket';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTokens = useCallback(async (): Promise<string | null> => {
    try {
      const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>(
        '/auth/refresh',
        {}
      );
      setAccessToken(res.data.accessToken);
      updateSocketAuth(res.data.accessToken);
      return res.data.accessToken;
    } catch {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
      return null;
    }
  }, []);

  useEffect(() => {
    setRefreshHandler(refreshTokens);
  }, [refreshTokens]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ data: User }>('/auth/me');
      setUser(res.data);
      connectSocket(sessionStorage.getItem('accessToken'));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      setAccessToken(token);
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{
      data: { user: User; accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    connectSocket(res.data.accessToken);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; fullName: string }) => {
      await api.post('/auth/register', data);
      await login(data.email, data.password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
