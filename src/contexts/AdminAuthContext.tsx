import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string;
  avatarUrl: string | null;
  jobTitle: string;
  bio: string;
  showOnFrontend: boolean;
  role: string;
  /** Effective set resolved server-side — role template plus per-user overrides. */
  permissions: string[];
  /** 'own' means this account only ever sees listings it created. */
  scope: 'own' | 'all';
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserProfile: (user: AdminUser) => void;
  /** UI gating only — the server enforces the same check on every request. */
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

function normalizeUser(raw: Partial<AdminUser> & { id: number; email: string; role: string }): AdminUser {
  const firstName = raw.firstName ?? '';
  const lastName = raw.lastName ?? '';
  const name = raw.name
    || [firstName, lastName].filter(Boolean).join(' ')
    || raw.email;
  return {
    id: raw.id,
    email: raw.email,
    name,
    firstName,
    lastName,
    dateOfBirth: raw.dateOfBirth ?? null,
    phone: raw.phone ?? '',
    avatarUrl: raw.avatarUrl ?? null,
    jobTitle: raw.jobTitle ?? '',
    bio: raw.bio ?? '',
    showOnFrontend: Boolean(raw.showOnFrontend),
    role: raw.role,
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    scope: raw.scope === 'own' ? 'own' : 'all',
  };
}

function persist(token: string, user: AdminUser) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setUserProfile = useCallback((next: AdminUser) => {
    const normalized = normalizeUser(next);
    setUser(normalized);
    const tk = localStorage.getItem('admin_token');
    if (tk) persist(tk, normalized);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('admin_token');
    if (!storedToken) return;
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${storedToken}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
      return;
    }
    const data = normalizeUser(await res.json());
    setUser(data);
    persist(storedToken, data);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(normalizeUser(JSON.parse(storedUser)));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
      // Pull fresh profile (new fields) without blocking first paint.
      void refreshUser().finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, [refreshUser]);

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    const next = normalizeUser(data.user);
    setToken(data.token);
    setUser(next);
    persist(data.token, next);
    return next;
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  const can = useCallback(
    (permission: string) =>
      user?.role === 'super_admin' || Boolean(user?.permissions.includes(permission)),
    [user],
  );

  const canAny = useCallback(
    (...permissions: string[]) => permissions.some(can),
    [can],
  );

  return (
    <AdminAuthContext.Provider
      value={{ user, token, login, logout, refreshUser, setUserProfile, can, canAny, loading }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export function useApiRequest() {
  const { token, logout } = useAdminAuth();

  const tokenRef = useRef(token);
  const logoutRef = useRef(logout);
  tokenRef.current = token;
  logoutRef.current = logout;

  return useCallback(async function apiRequest(path: string, options: RequestInit = {}) {
    const res = await fetch(`/api/admin${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      logoutRef.current();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return res.json();
  }, []);
}
