/** Listings page filter state: read from the URL, written back to it, and counted. */

import { FALLBACK_USD_RATE, readStoredCurrency } from '../contexts/CurrencyContext';
import { findCityArea, findDistrictArea, findDistrictGroup } from '../data/districts';
import { listingsHref, parseListingsLocation } from './seoListingsUrl';

export type ListingFilters = {
  status: string;
  city: string;
  /** Neighbourhoods or parent areas; one entry travels in the path, several in `?districts=`. */
  districts: string[];
  type: string;
  /** Exact room counts, "5" meaning five or more. */
  rooms: string[];
  /** In the visitor's display currency. */
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  vip: boolean;
  isPremium: boolean;
  isNew: boolean;
};

export const EMPTY_FILTERS: ListingFilters = {
  status: '',
  city: '',
  districts: [],
  type: '',
  rooms: [],
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  vip: false,
  isPremium: false,
  isNew: false,
};

export function filtersFromLocation(pathname: string, search: string): { filters: ListingFilters; q: string } {
  const parsed = parseListingsLocation(pathname, search);
  const city = findCityArea(parsed.city);
  const listed = parsed.districts?.length ? parsed.districts : parsed.district ? [parsed.district] : [];
  const districts = listed.map(d => findDistrictArea(city, d)?.ka ?? findDistrictGroup(city, d)?.ka ?? d);

  const stored = readStoredCurrency();
  const urlCurrency = parsed.currency === 'USD' ? 'USD' : 'GEL';
  const price = (param: string | undefined) => {
    const amount = param ? parseFloat(param) : 0;
    if (!amount) return '';
    // Written in the visitor's own currency: use it as typed, no lossy round trip.
    if (urlCurrency === stored) return param!;
    return String(Math.round(urlCurrency === 'GEL' ? amount / FALLBACK_USD_RATE : amount * FALLBACK_USD_RATE));
  };

  return {
    q: parsed.q || '',
    filters: {
      status: parsed.status || '',
      city: city?.ka ?? parsed.city ?? '',
      districts,
      type: parsed.type || '',
      // The "2-otaxiani" path means exactly two rooms, like the room buttons.
      rooms: parsed.rooms ?? (parsed.bedrooms ? [parsed.bedrooms] : []),
      priceMin: price(parsed.priceMin),
      priceMax: price(parsed.priceMax),
      areaMin: parsed.areaMin || '',
      areaMax: parsed.areaMax || '',
      vip: Boolean(parsed.vip),
      isPremium: Boolean(parsed.isPremium),
      isNew: Boolean(parsed.isNew),
    },
  };
}

export function filtersToHref(f: ListingFilters, q: string, currency: string): string {
  return listingsHref({
    status: f.status || undefined,
    type: f.type || undefined,
    city: f.city || undefined,
    districts: f.districts.length ? f.districts : undefined,
    rooms: f.rooms.length ? f.rooms : undefined,
    priceMin: f.priceMin || undefined,
    priceMax: f.priceMax || undefined,
    currency,
    areaMin: f.areaMin || undefined,
    areaMax: f.areaMax || undefined,
    vip: f.vip || undefined,
    isPremium: f.isPremium || undefined,
    isNew: f.isNew || undefined,
    q: q.trim() || undefined,
  });
}

/** Filters beyond the deal type — what the "clear" affordances count. */
export function activeFilterCount(f: ListingFilters): number {
  return [
    f.city, f.type, f.districts.length, f.rooms.length,
    f.priceMin || f.priceMax, f.areaMin || f.areaMax, f.vip, f.isPremium, f.isNew,
  ].filter(Boolean).length;
}

/** The "More" pill: area and the flag toggles. */
export function moreFilterCount(f: ListingFilters): number {
  return [f.areaMin || f.areaMax, f.vip, f.isPremium, f.isNew].filter(Boolean).length;
}
