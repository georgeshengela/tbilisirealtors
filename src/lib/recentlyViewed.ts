/**
 * Listings this visitor opened recently, newest first. A per-browser
 * convenience only: it may be empty (private mode, cleared storage) and the
 * home page simply hides the row then.
 */

const KEY = 'recently_viewed_ids';
const MAX = 12;

export function getRecentlyViewed(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberViewed(id: string): void {
  if (!id) return;
  try {
    const next = [id, ...getRecentlyViewed().filter(x => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — nothing to remember.
  }
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable.
  }
}
