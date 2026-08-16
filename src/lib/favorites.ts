/**
 * Single source of truth for saved listings.
 *
 * Guests keep their list in localStorage; signed-in members keep it on the
 * server. On sign-in the guest list is merged into the account so nothing a
 * visitor collected before registering is lost.
 *
 * Every consumer subscribes to the same store, so hearts on cards, the detail
 * page, the header counter and the favourites page can never disagree.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'favorite_property_ids';
const TOKEN_KEY = 'member_token';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Frozen array so `useSyncExternalStore` can compare snapshots by reference. */
let snapshot: readonly string[] = readLocal();
let ids = new Set(snapshot);

function readLocal(): readonly string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocal(next: readonly string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota — the in-memory set still works.
  }
}

function commit(next: Set<string>, persist = true) {
  ids = next;
  snapshot = Object.freeze([...next]);
  if (persist) writeLocal(snapshot);
  listeners.forEach(fn => fn());
}

function token(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function accountFetch(path: string, options: RequestInit = {}): Promise<Response | null> {
  const auth = token();
  if (!auth) return null;
  try {
    return await fetch(`/api/account${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth}`,
        ...options.headers,
      },
    });
  } catch {
    return null;
  }
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export function getFavoriteIds(): readonly string[] {
  return snapshot;
}

export function isFavorite(id: string): boolean {
  return ids.has(id);
}

export function subscribeFavorites(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Flips a listing. The UI updates immediately and the server call follows;
 * a failed call rolls the change back so the heart never lies.
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const adding = !ids.has(id);
  const next = new Set(ids);
  if (adding) next.add(id); else next.delete(id);
  commit(next);

  const res = await accountFetch(`/favorites/${encodeURIComponent(id)}`, {
    method: adding ? 'POST' : 'DELETE',
  });

  if (res && !res.ok) {
    const rollback = new Set(ids);
    if (adding) rollback.delete(id); else rollback.add(id);
    commit(rollback);
    return !adding;
  }

  return adding;
}

/** Pulls the account list and folds the guest list into it. Called after login. */
export async function syncFavoritesWithAccount(): Promise<void> {
  const res = await accountFetch('/favorites/merge', {
    method: 'POST',
    body: JSON.stringify({ ids: [...ids] }),
  });
  if (!res || !res.ok) return;

  const data = await res.json().catch(() => null);
  if (data && Array.isArray(data.ids)) commit(new Set<string>(data.ids));
}

/** Drops the account list on logout, leaving the visitor with an empty slate. */
export function clearFavorites(): void {
  commit(new Set());
}

export function useFavorites() {
  const list = useSyncExternalStore(subscribeFavorites, getFavoriteIds, getFavoriteIds);

  const toggle = useCallback((id: string) => { void toggleFavorite(id); }, []);
  const has = useCallback((id: string) => list.includes(id), [list]);

  return { ids: list, count: list.length, isFavorite: has, toggle };
}

/** Convenience hook for a single card — avoids re-rendering on unrelated changes. */
export function useIsFavorite(id: string): [boolean, () => void] {
  const { isFavorite: has, toggle } = useFavorites();
  const flip = useCallback(() => toggle(id), [toggle, id]);
  return [has(id), flip];
}
