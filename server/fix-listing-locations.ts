/**
 * Re-geocodes listing addresses and re-derives each listing's district from the
 * resulting coordinates, so pins land on their real building and always sit
 * inside the district the filters claim.
 *
 * Reports what it would change and writes nothing unless --apply is passed:
 *
 *   npm run db:fix-locations
 *   npm run db:fix-locations -- --apply
 */

import { eq } from 'drizzle-orm';
import { db, client } from './db.js';
import { properties } from './schema.js';
import { CITY_AREAS, findCityArea, findDistrictArea } from '../src/data/districts.js';
import { pointInRings } from '../src/lib/geoMath.js';
import type { Ring } from '../src/lib/geoApi.js';

const APPLY = process.argv.includes('--apply');
const API = process.env.GEO_API ?? 'http://localhost:3001';
const USER_AGENT = 'TbilisiRealtors/1.0 (https://tbilisirealtors.ge)';

/** Nominatim asks for at most one request per second. */
const NOMINATIM_DELAY_MS = 1200;
/** Below this, the existing coordinates are already good enough to keep. */
const MIN_MOVE_M = 40;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Georgian addresses are stored with abbreviations and trailing unit details.
 * OSM knows the full street name, so expand and drop the rest.
 */
function cleanAddress(address: string): string {
  const street = address
    .split(',')
    .filter(part => !/სართული|ბლოკი|კვ\.|ბინა|block|floor|apt/i.test(part))
    .slice(0, 2)
    .join(', ');

  return street
    .replace(/გამზ\./g, 'გამზირი')
    .replace(/გზ\./g, 'გზატკეცილი')
    // "ქ." is a street after a name but a city at the start ("ქ. თბილისი").
    // \b does not apply to Georgian letters, so anchor on the preceding word.
    .replace(/(\S)\s+ქ\./g, '$1 ქუჩა')
    .replace(/\s+/g, ' ')
    .trim();
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  category?: string;
  type?: string;
  addresstype?: string;
  address?: Record<string, string>;
}

async function search(params: Record<string, string>): Promise<NominatimHit[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '10');
  url.searchParams.set('accept-language', 'ka,en');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return (await res.json()) as NominatimHit[];
}

/** A hit pinned to an actual address point rather than a whole street. */
function isHouseLevel(hit: NominatimHit, houseNumber: string | null): boolean {
  if (houseNumber) return hit.address?.house_number === houseNumber;
  return hit.category === 'building' || hit.addresstype === 'building' || hit.addresstype === 'house';
}

const STREET_WORDS = /(ქუჩა|გამზირი|ჩიხი|გზატკეცილი|გზა|მოედანი|street|avenue|ave|road|lane)/gi;

const TRANSLITERATION: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k',
  ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u',
  ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts',
  ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

/** Georgian to Latin, so "ჭავჭავაძის" and "Chavchavadze" can be compared. */
function latinise(text: string): string {
  return [...text.toLowerCase()].map(char => TRANSLITERATION[char] ?? char).join('');
}

/** Comparable stems of a street name: no suffixes, numbers, or punctuation. */
function streetStems(name: string): string[] {
  return latinise(name.replace(STREET_WORDS, ' '))
    .replace(/[\d.,'"()\-–]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 5);
}

/**
 * House number 45 exists on many streets, so the road has to be the one the
 * listing names — otherwise the pin lands in a different neighbourhood. Endings
 * differ by case ("ჭავჭავაძის" vs "Chavchavadze"), so compare on a prefix.
 */
function roadMatchesAddress(hit: NominatimHit, cleaned: string): boolean {
  const road = hit.address?.road;
  if (!road) return false;

  const roadStems = streetStems(road);
  return streetStems(cleaned).some(stem =>
    roadStems.some(other => {
      const shared = Math.min(stem.length, other.length, 6);
      return stem.slice(0, shared) === other.slice(0, shared);
    }),
  );
}

/**
 * The district OSM itself files the address under. Its hierarchy runs from the
 * neighbourhood outwards, and the innermost name we know is the one locals use —
 * Kavtaradze street is "Saburtalo" to a local even though it sits in Vake district.
 */
function districtFromHierarchy(hit: NominatimHit, city: string): string | null {
  const area = findCityArea(city);
  const keys = ['neighbourhood', 'quarter', 'suburb', 'city_district', 'borough', 'village', 'hamlet'];
  for (const key of keys) {
    const value = hit.address?.[key];
    const match = value ? findDistrictArea(area, value) : undefined;
    if (match) return match.ka;
  }
  return null;
}

interface Resolution {
  /** Only set when the match is precise enough to move the pin. */
  point: { lat: number; lng: number } | null;
  district: string | null;
  note: string;
}

/** Nominatim's result set varies between calls, so ask a few ways and pool them. */
async function gatherHits(cleaned: string, city: string): Promise<NominatimHit[]> {
  const queries = [
    { street: cleaned, city, country: 'Georgia' },
    { q: `${cleaned}, ${city}, Georgia`, countrycodes: 'ge' },
    { q: `${cleaned}, ${city}`, countrycodes: 'ge', dedupe: '0' },
  ];

  const pooled = new Map<string, NominatimHit>();
  for (const query of queries) {
    for (const hit of await search(query)) pooled.set(`${hit.lat},${hit.lon}`, hit);
    await sleep(NOMINATIM_DELAY_MS);
  }
  return [...pooled.values()];
}

async function reverse(point: { lat: number; lng: number }): Promise<NominatimHit | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'ka,en');

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  await sleep(NOMINATIM_DELAY_MS);
  if (!res.ok) return null;
  return (await res.json()) as NominatimHit;
}

async function resolve(
  address: string,
  city: string,
  cityOutline: { rings: Ring[] },
  current: { lat: number; lng: number } | null,
): Promise<Resolution> {
  const cleaned = cleanAddress(address);
  const houseNumber = cleaned.match(/(\d+)\s*$/)?.[1] ?? null;
  const hasStreetName = streetStems(cleaned).length > 0;

  const hits = await gatherHits(cleaned, city);
  const inCity = hits.filter(hit => pointInRings(cityOutline.rings, Number(hit.lat), Number(hit.lon)));
  if (!inCity.length) {
    return { point: null, district: null, note: hits.length ? 'matches outside the city' : 'no geocode result' };
  }

  // The house number alone is not enough: 45 exists on many streets, so the road
  // has to be the one the listing names.
  const houses = inCity.filter(hit => isHouseLevel(hit, houseNumber));
  const confirmed = hasStreetName ? houses.filter(hit => roadMatchesAddress(hit, cleaned)) : houses;

  if (confirmed.length) {
    const roads = new Set(confirmed.map(hit => hit.address?.road ?? ''));
    if (roads.size > 1) return { point: null, district: null, note: `number on ${roads.size} streets` };

    const house = confirmed[0];
    return {
      point: { lat: Number(house.lat), lng: Number(house.lon) },
      district: districtFromHierarchy(house, city),
      note: 'exact address',
    };
  }

  if (houses.length && houseNumber && hasStreetName) {
    /* The number exists but only on streets we cannot tie to this address. Pin
       down the street's official name first, then ask for the house on it. */
    const streetOnly = cleaned.replace(/\s*\d+\s*$/, '').trim();
    const streetHits = await search({ q: `${streetOnly}, ${city}, Georgia`, countrycodes: 'ge' });
    await sleep(NOMINATIM_DELAY_MS);

    // Only a real road — a search for "Isnis" also returns the Isani district.
    const streetHit = streetHits.find(
      hit =>
        hit.category === 'highway' &&
        pointInRings(cityOutline.rings, Number(hit.lat), Number(hit.lon)) &&
        (roadMatchesAddress(hit, cleaned) ||
          roadMatchesAddress({ address: { road: hit.display_name.split(',')[0] } }, cleaned)),
    );

    const road = streetHit?.address?.road ?? streetHit?.display_name.split(',')[0].trim();

    if (road) {
      const retry = await search({ street: `${houseNumber} ${road}`, city, country: 'Georgia' });
      await sleep(NOMINATIM_DELAY_MS);

      const onRoad = retry.filter(
        hit =>
          isHouseLevel(hit, houseNumber) &&
          roadMatchesAddress(hit, cleaned) &&
          pointInRings(cityOutline.rings, Number(hit.lat), Number(hit.lon)),
      );

      if (onRoad.length) {
        return {
          point: { lat: Number(onRoad[0].lat), lng: Number(onRoad[0].lon) },
          district: districtFromHierarchy(onRoad[0], city),
          note: `exact address on ${road}`,
        };
      }

    }

    const roads = [...new Set(houses.map(hit => hit.address?.road).filter(Boolean))];
    return { point: null, district: null, note: `unconfirmed: number on ${roads.length} other street(s)` };
  }

  if (houses.length) {
    return { point: null, district: null, note: 'no street name to confirm against' };
  }

  // Street-level only. Names like "Nikoladze" belong to several unrelated streets.
  const streets = new Set(inCity.map(hit => hit.display_name.split(',')[0].trim()));
  if (streets.size > 1) return { point: null, district: null, note: `ambiguous street (${streets.size} matches)` };

  const street = inCity[0];
  const district = districtFromHierarchy(street, city);

  /* The pin stays put, but check it actually sits on the named street — an
     earlier pass could have left it on a same-numbered street elsewhere. */
  if (current && hasStreetName) {
    const here = await reverse(current);
    if (here && !roadMatchesAddress(here, cleaned)) {
      return { point: null, district, note: `pin is on ${here.address?.road ?? 'another street'}` };
    }
  }

  return { point: null, district, note: 'street only, kept pin' };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Outlines for every area in the dictionary, fetched through our cached proxy. */
async function loadOutlines() {
  const cities = new Map<string, { rings: Ring[]; centre: { lat: number; lng: number } }>();
  const districts = new Map<string, { city: string; name: string; rings: Ring[] }>();

  for (const city of CITY_AREAS) {
    for (const area of [{ osm: city.osm, name: null as string | null }, ...city.districts.map(d => ({ osm: d.osm, name: d.ka }))]) {
      if (!area.osm) continue;

      const boundary = (await fetch(`${API}/api/geo/boundary?osm=${area.osm}`).then(r => r.json())) as
        | { rings: Ring[]; bbox: [number, number, number, number] }
        | null;

      if (!boundary?.rings?.length) {
        console.warn(`  ! no outline for ${city.ka}${area.name ? ` / ${area.name}` : ''} (${area.osm})`);
        continue;
      }

      const [south, west, north, east] = boundary.bbox;
      if (area.name) districts.set(`${city.ka}|${area.name}`, { city: city.ka, name: area.name, rings: boundary.rings });
      else cities.set(city.ka, { rings: boundary.rings, centre: { lat: (south + north) / 2, lng: (west + east) / 2 } });
    }
  }

  return { cities, districts };
}

function districtFor(
  districts: Awaited<ReturnType<typeof loadOutlines>>['districts'],
  city: string,
  point: { lat: number; lng: number },
): string | null {
  const hits = [...districts.values()].filter(
    d => d.city === city && pointInRings(d.rings, point.lat, point.lng),
  );
  if (!hits.length) return null;

  // Prefer the tightest match, so a neighbourhood wins over the district holding it.
  hits.sort((a, b) => ringsArea(a.rings) - ringsArea(b.rings));
  return hits[0].name;
}

/** Rough relative size, only used to compare nested areas. */
function ringsArea(rings: Ring[]): number {
  let area = 0;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      area += ring[j][1] * ring[i][0] - ring[i][1] * ring[j][0];
    }
  }
  return Math.abs(area / 2);
}

async function main() {
  console.log(`${APPLY ? 'Applying' : 'Dry run'} — loading area outlines…`);
  const { cities, districts } = await loadOutlines();
  console.log(`Loaded ${cities.size} city and ${districts.size} district outlines.\n`);

  const rows = await db
    .select({
      id: properties.id,
      title: properties.title,
      address: properties.address,
      city: properties.city,
      district: properties.district,
      coordinates: properties.coordinates,
    })
    .from(properties);

  let moved = 0;
  let relabelled = 0;
  let untouched = 0;

  for (const row of rows) {
    const city = row.city ?? '';
    const cityOutline = cities.get(city);
    const current = row.coordinates;
    const label = `${row.address || row.title || row.id}`.slice(0, 42).padEnd(42);

    const currentPoint = current && typeof current.lat === 'number' ? { lat: current.lat, lng: current.lng } : null;

    let resolution: Resolution = { point: null, district: null, note: 'no address to check' };
    if (row.address && cityOutline) {
      try {
        resolution = await resolve(row.address, city, cityOutline, currentPoint);
      } catch (error) {
        resolution = { point: null, district: null, note: `lookup failed: ${(error as Error).message}` };
      }
    }

    const point = resolution.point;
    const movedM = point && current ? distanceKm(point, current) * 1000 : null;
    const takeCoordinates = Boolean(point) && (movedM === null || movedM > MIN_MOVE_M);

    /* The label has to describe where the pin actually is, so derive it from the
       pin we end up keeping — and leave it alone while it still holds. */
    const finalPoint = takeCoordinates ? point : currentPoint;
    const currentArea = findDistrictArea(findCityArea(city), row.district ?? '');
    const currentDistrict = currentArea?.ka ?? row.district;
    const currentRings = currentArea ? districts.get(`${city}|${currentArea.ka}`)?.rings : undefined;

    const currentStillHolds = Boolean(
      finalPoint && currentRings && pointInRings(currentRings, finalPoint.lat, finalPoint.lng),
    );

    /* Only a confirmed address may overrule the stored label. Otherwise the
       address stays the better evidence, however rough its pin. */
    const verified = resolution.note.startsWith('exact address');

    const nextDistrict =
      !verified || currentStillHolds
        ? currentDistrict
        : resolution.district ?? (finalPoint ? districtFor(districts, city, finalPoint) : null);

    const takeDistrict = Boolean(nextDistrict) && nextDistrict !== currentDistrict;

    if (takeCoordinates) moved += 1;
    if (takeDistrict) relabelled += 1;
    if (!takeCoordinates && !takeDistrict) untouched += 1;

    const change = [
      takeCoordinates ? `pin ${movedM === null ? 'set' : movedM > 9_000 ? `+${(movedM / 1000).toFixed(1)}km` : `+${Math.round(movedM)}m`}` : '',
      takeDistrict ? `${row.district ?? '—'} -> ${nextDistrict}` : '',
    ].filter(Boolean).join(', ');

    console.log(`${label} ${resolution.note.padEnd(32)} ${change || 'unchanged'}`);

    if (APPLY && (takeCoordinates || takeDistrict)) {
      await db
        .update(properties)
        .set({
          ...(takeCoordinates && point ? { coordinates: point } : null),
          ...(takeDistrict && nextDistrict ? { district: nextDistrict } : null),
        })
        .where(eq(properties.id, row.id));
    }
  }

  console.log(
    `\n${rows.length} listings — ${moved} pin fix(es), ${relabelled} district relabel(s), ${untouched} left alone.`,
  );
  if (!APPLY) console.log('Nothing written. Re-run with --apply to save.');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
