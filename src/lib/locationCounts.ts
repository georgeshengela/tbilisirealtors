import {
  canonicalCityName,
  canonicalDistrictName,
  findCityArea,
  findDistrictArea,
} from '../data/districts';
import type { Property } from '../types/listing';

/** Listing totals keyed by `city`, `city|district` and `city|group` (all canonical Georgian names). */
export type LocationCounts = Map<string, number>;

export function buildLocationCounts(properties: Property[]): LocationCounts {
  const counts: LocationCounts = new Map();
  const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const p of properties) {
    const city = canonicalCityName(p.city);
    if (!city) continue;
    bump(city);
    const district = canonicalDistrictName(city, p.district);
    if (!district) continue;
    bump(`${city}|${district}`);
    const group = findDistrictArea(findCityArea(city), district)?.group;
    if (group && group !== district) bump(`${city}|${group}`);
  }
  return counts;
}
