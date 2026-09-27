/**
 * One definition of "does this listing match the search" shared by the home
 * search bar (live result count) and the listings page (the actual results),
 * so the number on the search button is the number the visitor lands on.
 */

import { CITY_AREAS, findCityArea, listingMatchesDistrict } from '../data/districts';
import type { Property } from '../types/listing';
import { normalizeCadastralCode } from './cadastralCode';
import { listingIdMatches } from './listingId';

/** Room buttons 1–4 match exactly; the last button means "this many or more". */
export const ROOM_CHOICES = ['1', '2', '3', '4', '5'] as const;
export const ROOMS_OR_MORE = '5';

export function roomsMatch(property: Property, rooms: readonly string[]): boolean {
  if (!rooms.length) return true;
  const n = property.rooms || property.bedrooms || 0;
  return rooms.some(r => (r === ROOMS_OR_MORE ? n >= Number(r) : n === Number(r)));
}

/** Any of the selected neighbourhoods or parent areas. */
export function districtsMatch(property: Property, city: string, districts: readonly string[]): boolean {
  if (!districts.length) return true;
  const area = findCityArea(city);
  return districts.some(d => listingMatchesDistrict(area, d, property.district));
}

/**
 * Listings whose address could not be geocoded are saved at a city's centre
 * point. That spot says nothing about where the flat is, so geographic checks
 * (district outlines, map viewport) must not judge these listings by it.
 */
const CITY_CENTRES = CITY_AREAS.map(c => c.center);
export function hasKnownLocation(property: Property): boolean {
  const { lat, lng } = property.coordinates ?? { lat: 0, lng: 0 };
  if (!lat && !lng) return false;
  return !CITY_CENTRES.some(c => Math.abs(c.lat - lat) < 1e-6 && Math.abs(c.lng - lng) < 1e-6);
}

/** "both" listings are offered for sale and for rent, so they match either deal. */
export function statusMatches(property: Property, status: string): boolean {
  if (!status) return true;
  return property.status === status || (property.status === 'both' && (status === 'sale' || status === 'rent'));
}

/** The price a visitor is shopping on: the rent figure when a sale+rent listing is searched as a rental. */
export function searchPrice(property: Property, status: string): number {
  if (status === 'rent' && property.status === 'both' && property.rentPrice) return property.rentPrice;
  return property.price;
}

export type QueryKind = 'id' | 'cadastral' | 'text' | 'empty';

export function classifyQuery(raw: string): QueryKind {
  const q = raw.trim();
  if (!q) return 'empty';
  if (/^\d{1,8}$/.test(q)) return 'id';
  // Cadastral codes are dotted digit groups: 01.10.15.006.048
  if (/^[Nn№]?\s*\d{2}\.\d{2}(\.\d+)+$/.test(q)) return 'cadastral';
  return 'text';
}

/** Free-text box: listing ID, cadastral code, or words in the title/address/district. */
export function textQueryMatches(property: Property, raw: string): boolean {
  const q = raw.trim();
  if (!q) return true;
  const kind = classifyQuery(q);
  if (kind === 'id') return listingIdMatches(property.id, q);
  if (kind === 'cadastral') {
    const code = normalizeCadastralCode(property.cadastralCode ?? '');
    return Boolean(code) && code.startsWith(normalizeCadastralCode(q));
  }
  const words = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const hay = [property.title, property.city, property.district, property.address, property.id]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return words.every(w => hay.includes(w));
}

export type SearchCriteria = {
  status: string;
  type: string;
  city: string;
  /** Neighbourhoods and/or parent areas, canonical Georgian names. */
  districts: string[];
  rooms: string[];
  /** In the visitor's display currency, as typed. */
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  q: string;
};

export const EMPTY_CRITERIA: SearchCriteria = {
  status: 'sale',
  type: '',
  city: '',
  districts: [],
  rooms: [],
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  q: '',
};

type Money = {
  displayToGel: (value: number) => number;
  listingToGel: (value: number, currency?: string | null) => number;
};

export function matchesCriteria(property: Property, c: SearchCriteria, money: Money): boolean {
  if (!statusMatches(property, c.status)) return false;
  if (c.type && property.type !== c.type) return false;
  if (c.city && property.city !== c.city) return false;
  if (!districtsMatch(property, c.city, c.districts)) return false;
  if (!roomsMatch(property, c.rooms)) return false;
  const price = money.listingToGel(searchPrice(property, c.status), property.priceCurrency);
  if (c.priceMin && price < money.displayToGel(Number(c.priceMin))) return false;
  if (c.priceMax && price > money.displayToGel(Number(c.priceMax))) return false;
  if (c.areaMin && property.area < Number(c.areaMin)) return false;
  if (c.areaMax && property.area > Number(c.areaMax)) return false;
  if (!textQueryMatches(property, c.q)) return false;
  return true;
}

/** Keeps "from" below "to" whichever way round the visitor typed them. */
export function orderedRange(min: string, max: string): [string, string] {
  if (min && max && Number(min) > Number(max)) return [max, min];
  return [min, max];
}
