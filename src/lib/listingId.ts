/** Listing public codes are eight digits, e.g. 24171150. */

export function looksLikeListingId(value: string): boolean {
  return /^\d{4,8}$/.test(value.trim());
}

export function isExactListingId(value: string): boolean {
  return /^\d{8}$/.test(value.trim());
}

/** Match against a listing id — exact, prefix, or substring for partial digit search. */
export function listingIdMatches(id: string, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  if (!/^\d+$/.test(q)) return id.toLowerCase().includes(q.toLowerCase());
  return id === q || id.startsWith(q) || id.includes(q);
}
