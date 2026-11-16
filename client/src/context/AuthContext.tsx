import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiResponse, LoginInput, RegisterInput } from '@structured-qa/shared';
import {
  loginRequest,
  logoutAllRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  type AuthUser,
} from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<ApiResponse<{ user: AuthUser }>>;
  register: (input: RegisterInput) => Promise<ApiResponse<{ message: string }>>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<ApiResponse<{ message: string }>>;
  refreshUser: () => Promise<ApiResponse<{ user: AuthUser }>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    meRequest().then((response) => {
      if (cancelled) return;
      setUser(response.success ? response.data.user : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginRequest(input);
    if (response.success) {
      // Login only succeeds for verified accounts, and the login payload omits the flag.
      setUser({ ...response.data.user, emailVerified: true });
    }
    return response;
  }, []);

  const register = useCallback(
    (input: RegisterInput) => registerRequest(input),
    [],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    const response = await logoutAllRequest();
    if (response.success) {
      setUser(null);
    }
    return response;
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await meRequest();
    if (response.success) {
      setUser(response.data.user);
    }
    return response;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, logoutAll, refreshUser }),
    [user, loading, login, register, logout, logoutAll, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
