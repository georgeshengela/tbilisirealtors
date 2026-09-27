/** Comparisons drawn from the live listings: similar homes and local price levels. */

import { canonicalDistrictName } from '../data/districts';
import type { Property } from '../types/listing';
import { searchPrice, statusMatches } from './listingSearch';

type ToGel = (amount: number, currency?: string | null) => number;

const rooms = (p: Property) => p.rooms || p.bedrooms || 0;
const district = (p: Property) => canonicalDistrictName(p.city, p.district);

/**
 * Listings a visitor of `property` would also consider: always the same kind
 * of deal, then ranked by neighbourhood, type, size and price.
 */
export function similarListings(property: Property, all: Property[], toGel: ToGel, limit = 4): Property[] {
  const deal = property.status === 'both' ? 'sale' : property.status;
  const price = toGel(searchPrice(property, deal), property.priceCurrency);
  const home = district(property);

  return all
    .filter(p => p.id !== property.id && statusMatches(p, deal))
    .map(p => {
      let score = 0;
      if (p.city === property.city) score += 2;
      if (home && district(p) === home) score += 4;
      if (p.type === property.type) score += 3;
      const r = rooms(p);
      if (r && r === rooms(property)) score += 2;
      else if (r && Math.abs(r - rooms(property)) === 1) score += 1;
      const other = toGel(searchPrice(p, deal), p.priceCurrency);
      if (price && other) {
        const gap = Math.abs(other - price) / price;
        if (gap <= 0.15) score += 3;
        else if (gap <= 0.35) score += 1.5;
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || Number(b.p.isFeatured) - Number(a.p.isFeatured))
    .slice(0, limit)
    .map(x => x.p);
}

export type PriceInsight = {
  /** Price per m² of this listing, in GEL. */
  own: number;
  median: number;
  min: number;
  max: number;
  /** Signed percentage against the median; negative means cheaper. */
  diffPct: number;
  sample: number;
};

const MIN_SAMPLE = 3;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Price per m² against comparable listings: same deal, same neighbourhood,
 * same property type. Returns null when there are too few to say anything honest.
 */
export function priceInsight(property: Property, all: Property[], toGel: ToGel): PriceInsight | null {
  if (!property.area) return null;
  const deal = property.status === 'both' ? 'sale' : property.status;
  const home = district(property);
  if (!home) return null;

  const pps = (p: Property) => toGel(searchPrice(p, deal), p.priceCurrency) / p.area;
  const own = pps(property);
  if (!Number.isFinite(own) || own <= 0) return null;

  const peers = all
    .filter(p => p.id !== property.id && p.area > 0 && p.type === property.type
      && statusMatches(p, deal) && p.city === property.city && district(p) === home)
    .map(pps)
    .filter(v => Number.isFinite(v) && v > 0);
  if (peers.length < MIN_SAMPLE) return null;

  const mid = median(peers);
  return {
    own,
    median: mid,
    min: Math.min(...peers, own),
    max: Math.max(...peers, own),
    diffPct: Math.round(((own - mid) / mid) * 100),
    sample: peers.length,
  };
}

/** Georgian mobile numbers without a country code get +995 for WhatsApp links. */
export function whatsappNumber(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('995')) return digits;
  if (digits.length === 9 && digits.startsWith('5')) return `995${digits}`;
  return digits.length >= 10 ? digits : null;
}

/** "596881155" → "596 88 11 55", the way Georgian numbers are read out. */
export function formatPhone(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const local = digits.startsWith('995') ? digits.slice(3) : digits;
  if (local.length === 9) return `${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
  return phone ?? '';
}
