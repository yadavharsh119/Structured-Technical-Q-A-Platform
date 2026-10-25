import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiResponse, LoginInput, RegisterInput } from '@structured-qa/shared';
import {
  loginRequest,
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

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
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
