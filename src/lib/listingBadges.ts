/** Badge ids packed into a listing's features list. They are not public feature text. */
export const VERIFIED_LISTING_BADGE = 'verified';

export const INTERNAL_LISTING_BADGE_IDS = [
  VERIFIED_LISTING_BADGE,
  'key_code',
  'airbnb',
  'investment',
  'accessible',
] as const;

/**
 * Imported listings carry the building's age as a bare code in their features
 * ("new" / "old"). It belongs in the specs as building status, not in the chips.
 */
const BUILDING_CODES = new Set(['new', 'old', 'under']);

const INTERNAL = new Set<string>(INTERNAL_LISTING_BADGE_IDS);

/** Building status code packed into the features list, if any. */
export function listingBuildingCode(features?: string[] | null): 'new' | 'old' | 'under' | null {
  const hit = (features ?? []).find(item => BUILDING_CODES.has(item));
  return (hit as 'new' | 'old' | 'under' | undefined) ?? null;
}

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
  return [...new Set(features ?? [])].filter(item => item && !INTERNAL.has(item) && !BUILDING_CODES.has(item));
}
