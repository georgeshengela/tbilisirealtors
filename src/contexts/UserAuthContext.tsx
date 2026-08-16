/**
 * Auth for public members. Deliberately separate from AdminAuthContext and
 * keyed on `member_token`, so a staff member can stay signed into the admin
 * panel in one tab and browse the public site as themselves in another
 * without the two sessions overwriting each other.
 */

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';
import { clearFavorites, syncFavoritesWithAccount } from '../lib/favorites';

export interface MemberUser {
  id: number;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string | null;
  role: string;
  permissions: string[];
}

const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'broker'];

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface UserAuthContextType {
  user: MemberUser | null;
  token: string | null;
  loading: boolean;
  /** True when the signed-in account also has back-office access. */
  isStaff: boolean;
  login: (email: string, password: string) => Promise<MemberUser>;
  register: (input: RegisterInput) => Promise<MemberUser>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<MemberUser>;
  requestPasswordReset: (email: string) => Promise<string>;
}

const UserAuthContext = createContext<UserAuthContextType | null>(null);

const TOKEN_KEY = 'member_token';
const USER_KEY = 'member_user';

type RawUser = Partial<MemberUser> & { id: number; email: string; role: string };

function normalize(raw: RawUser): MemberUser {
  const firstName = raw.firstName ?? '';
  const lastName = raw.lastName ?? '';
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name || [firstName, lastName].filter(Boolean).join(' ') || raw.email,
    firstName,
    lastName,
    phone: raw.phone ?? '',
    avatarUrl: raw.avatarUrl ?? null,
    role: raw.role,
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
  };
}

function persist(token: string, user: MemberUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Staff who sign in through the public form get the same session mirrored into
 * the admin keys, so `/admin` opens straight away instead of asking them to log
 * in a second time. Both tokens are the same JWT — only the storage key differs.
 */
function mirrorStaffSession(token: string, raw: RawUser) {
  if (!STAFF_ROLES.includes(raw.role)) return;
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(raw));
}

function clearStorage() {
  // Only drop the admin session if it is the very same one we mirrored.
  if (localStorage.getItem('admin_token') === localStorage.getItem(TOKEN_KEY)) {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'მოთხოვნა ვერ შესრულდა');
  return data;
}

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MemberUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const adopt = useCallback((nextToken: string, raw: RawUser) => {
    const next = normalize(raw);
    setToken(nextToken);
    setUser(next);
    persist(nextToken, next);
    mirrorStaffSession(nextToken, raw);
    return next;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearStorage();
    clearFavorites();
  }, []);

  const refresh = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;

    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${stored}` },
    });

    // 401 means the account was blocked, deleted, or its sessions were revoked.
    if (res.status === 401) {
      logout();
      return;
    }
    if (!res.ok) return;

    const next = normalize(await res.json());
    setUser(next);
    persist(stored, next);
  }, [logout]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (!stored || !storedUser) {
      setLoading(false);
      return;
    }

    setToken(stored);
    try {
      setUser(normalize(JSON.parse(storedUser)));
    } catch {
      clearStorage();
    }

    void refresh()
      .then(() => syncFavoritesWithAccount())
      .finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await postJson('/api/auth/login', { email, password });
    const next = adopt(data.token, data.user);
    await syncFavoritesWithAccount();
    return next;
  }, [adopt]);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await postJson('/api/auth/register', input);
    const next = adopt(data.token, data.user);
    await syncFavoritesWithAccount();
    return next;
  }, [adopt]);

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) throw new Error('სესია ამოიწურა');

    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stored}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'პროფილი ვერ შეინახა');

    const next = normalize(data);
    setUser(next);
    persist(stored, next);
    return next;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const data = await postJson('/api/auth/forgot-password', { email });
    return String(data.message ?? '');
  }, []);

  return (
    <UserAuthContext.Provider
      value={{
        user,
        token,
        loading,
        isStaff: Boolean(user && STAFF_ROLES.includes(user.role)),
        login,
        register,
        logout,
        refresh,
        updateProfile,
        requestPasswordReset,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}

/** Authenticated fetch against `/api/account/*`. */
export function useAccountRequest() {
  const { token, logout } = useUserAuth();

  const tokenRef = useRef(token);
  const logoutRef = useRef(logout);
  tokenRef.current = token;
  logoutRef.current = logout;

  return useCallback(async function accountRequest(path: string, options: RequestInit = {}) {
    const res = await fetch(`/api/account${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      logoutRef.current();
      throw new Error('სესია ამოიწურა');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `მოთხოვნა ვერ შესრულდა (${res.status})`);
    }

    return res.json();
  }, []);
}
