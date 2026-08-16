export function nanoid(size = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Public listing IDs — eight digits like 24171150.
 * Range stays away from leading zeros so they always look like real codes.
 */
export function randomListingId(): string {
  return String(10_000_000 + Math.floor(Math.random() * 90_000_000));
}

/** True for our numeric listing codes (and partial digit searches). */
export function looksLikeListingId(value: string): boolean {
  return /^\d{4,8}$/.test(value.trim());
}
