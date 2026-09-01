export type ListingOrigin = 'imported' | 'member' | 'office';
export type ListingPlacement = 'free' | 'paid';

export function listingOrigin(input: {
  source?: string | null;
  sourceUrl?: string | null;
  creatorRole?: string | null;
}): ListingOrigin {
  const source = (input.source || '').toLowerCase();
  const url = (input.sourceUrl || '').toLowerCase();
  if (
    source.includes('myhome')
    || source.includes('ss.ge')
    || source.includes('ssge')
    || source === 'import'
    || url.includes('myhome')
    || url.includes('ss.ge')
  ) {
    return 'imported';
  }
  if (input.creatorRole === 'user') return 'member';
  return 'office';
}

export function normalizePlacement(value: unknown, fallback: ListingPlacement = 'free'): ListingPlacement {
  return value === 'paid' || value === 'free' ? value : fallback;
}

export function normalizePlacementPackage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 80);
  return trimmed || null;
}
