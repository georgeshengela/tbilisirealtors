/** Badge ids packed into a listing's features list. They are not public feature text. */
export const VERIFIED_LISTING_BADGE = 'verified';

export const INTERNAL_LISTING_BADGE_IDS = [
  VERIFIED_LISTING_BADGE,
  'key_code',
  'airbnb',
  'investment',
  'accessible',
] as const;

const INTERNAL = new Set<string>(INTERNAL_LISTING_BADGE_IDS);

export function listingIsVerified(
  source?: { features?: string[] | null; badges?: string[] | null } | null,
): boolean {
  if (!source) return false;
  return Boolean(
    source.badges?.includes(VERIFIED_LISTING_BADGE)
    || source.features?.includes(VERIFIED_LISTING_BADGE),
  );
}

export function listingBadgeIds(features?: string[] | null): string[] {
  return (features ?? []).filter(item => INTERNAL.has(item));
}

/** Feature chips shown to visitors, without internal badge ids. */
export function publicListingFeatures(features?: string[] | null): string[] {
  return [...new Set(features ?? [])].filter(item => item && !INTERNAL.has(item));
}
