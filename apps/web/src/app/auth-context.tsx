import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';
import { LoadingState } from '../components/ui';

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
  modules: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  org: AuthOrg | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    organization: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  has: (permission: string) => boolean;
  hasModule: (moduleKey: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredOrg(): AuthOrg | null {
  const raw = localStorage.getItem('org');
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as AuthOrg & { modules?: string[] };
  return {
    id: parsed.id,
    name: parsed.name,
    modules: Array.isArray(parsed.modules) ? parsed.modules : [],
  };
}

function persistSession(
  token: string,
  user: AuthUser,
  org: AuthOrg,
): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('org', JSON.stringify(org));
}

function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('org');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token'),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [org, setOrg] = useState<AuthOrg | null>(() => readStoredOrg());
  const [ready, setReady] = useState(() => !localStorage.getItem('token'));

  const applySession = useCallback((nextUser: AuthUser, nextOrg: AuthOrg) => {
    const orgWithModules: AuthOrg = {
      id: nextOrg.id,
      name: nextOrg.name,
      modules: nextOrg.modules ?? [],
    };
    setUser(nextUser);
    setOrg(orgWithModules);
    localStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('org', JSON.stringify(orgWithModules));
  }, []);

  const refreshSession = useCallback(async () => {
    const current = localStorage.getItem('token');
    if (!current) {
      setReady(true);
      return;
    }
    try {
      const data = await api<{ user: AuthUser; org: AuthOrg }>(
        '/auth/me',
        current,
      );
      applySession(data.user, data.org);
    } catch {
      setToken(null);
      setUser(null);
      setOrg(null);
      clearSession();
    } finally {
      setReady(true);
    }
  }, [applySession]);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }
    void refreshSession();
  }, [token, refreshSession]);

  useEffect(() => {
    if (!token) {
      return;
    }
    function onVisible() {
      if (document.visibilityState === 'visible') {
        void refreshSession();
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [token, refreshSession]);

  const login = useCallback(
    async (email: string, password: string, organization: string) => {
      const data = await api<{ token: string; user: AuthUser; org: AuthOrg }>(
        '/auth/login',
        null,
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            organization,
          }),
        },
      );
      const nextOrg: AuthOrg = {
        id: data.org.id,
        name: data.org.name,
        modules: data.org.modules ?? [],
      };
      setToken(data.token);
      setUser(data.user);
      setOrg(nextOrg);
      persistSession(data.token, data.user, nextOrg);
      setReady(true);
    },
    [],
  );

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
    clearSession();
    setReady(true);
  }, [token]);

  const has = useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

  const hasModule = useCallback(
    (moduleKey: string) => Boolean(org?.modules.includes(moduleKey)),
    [org],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      org,
      ready,
      login,
      logout,
      refreshSession,
      has,
      hasModule,
    }),
    [
      token,
      user,
      org,
      ready,
      login,
      logout,
      refreshSession,
      has,
      hasModule,
    ],
  );

  if (!ready) {
    return (
      <AuthContext.Provider value={value}>
        <div className="shell">
          <main>
            <LoadingState />
          </main>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
