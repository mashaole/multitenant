import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roleName: string;
  permissions: string[];
}

export interface AuthOrg {
  id: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  org: AuthOrg | null;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  has: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [org, setOrg] = useState<AuthOrg | null>(() => {
    const raw = localStorage.getItem('org');
    return raw ? (JSON.parse(raw) as AuthOrg) : null;
  });

  const login = useCallback(async (userId: string) => {
    const data = await api<{ token: string; user: AuthUser; org: AuthOrg }>(
      '/auth/login',
      null,
      { method: 'POST', body: JSON.stringify({ userId }) },
    );
    setToken(data.token);
    setUser(data.user);
    setOrg(data.org);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('org', JSON.stringify(data.org));
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await api('/auth/logout', token, { method: 'POST' });
      } catch {
        /* already revoked */
      }
    }
    setToken(null);
    setUser(null);
    setOrg(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('org');
  }, [token]);

  const has = useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

  const value = useMemo(
    () => ({ token, user, org, login, logout, has }),
    [token, user, org, login, logout, has],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
