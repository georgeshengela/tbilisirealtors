import { Router } from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CITY_AREAS,
  canonicalCityName,
  canonicalDistrictName,
  cityViewbox,
  findCityArea,
} from '../../src/data/districts.js';

const router = Router();

const USER_AGENT = 'TbilisiRealtors/1.0 (https://tbilisirealtors.ge)';

type Ring = [number, number][];

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const boundaryCache = new Map<string, CacheEntry<BoundaryPayload | null>>();

/**
 * Public Overpass instances rotate through heavy load, so we try the fast
 * mirrors first and fall through on 429/504 instead of failing the request.
 */
const OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

let overpassCooldownUntil = 0;

const OVERPASS_CONCURRENCY = 3;
const HEDGE_DELAY_MS = 3_500;
const ENDPOINT_TIMEOUT_MS = 20_000;

let inFlight = 0;
const waiting: Array<() => void> = [];

/** Caps how many Overpass queries we have open at once while a user pans around. */
async function withOverpassSlot<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= OVERPASS_CONCURRENCY) {
    await new Promise<void>(resolve => waiting.push(resolve));
  }
  inFlight += 1;
  try {
    return await task();
  } finally {
    inFlight -= 1;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Public Overpass mirrors are unpredictable: one can answer in a second while
 * another hangs for a minute. So we start with the first mirror and hedge onto
 * the next one every few seconds, keeping whichever answers first.
 */
async function queryOverpass(query: string): Promise<string | null> {
  const body = `data=${encodeURIComponent(query)}`;
  const controllers: AbortController[] = [];

  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint, index) => {
    await sleep(index * HEDGE_DELAY_MS);

    const controller = new AbortController();
    controllers.push(controller);
    const timer = setTimeout(() => controller.abort(), ENDPOINT_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`${endpoint} responded ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  });

  try {
    const winner = await Promise.any(attempts);
    controllers.forEach(c => c.abort());
    return winner;
  } catch (error) {
    const reasons = (error as AggregateError).errors ?? [];
    console.warn('[geo] every Overpass mirror failed:', reasons.map(e => (e as Error).message).join(' | '));
    return null;
  }
}

/* Footprints barely change, so tiles are kept on disk and survive restarts.
   Snapping viewports to a fixed grid means panning re-uses the same tiles. */
const TILE_SIZE = 0.01;
const TILE_TTL = 30 * 24 * 60 * 60 * 1000;
const MAX_TILES_PER_REQUEST = 12;
const CACHE_DIR = path.resolve(process.cwd(), '.cache', 'buildings');

const tileMemory = new Map<string, CacheEntry<Ring[]>>();
const tileInFlight = new Map<string, Promise<Ring[] | null>>();

function tilesForBbox(south: number, west: number, north: number, east: number) {
  const tiles: { key: string; bounds: [number, number, number, number] }[] = [];
  const latStart = Math.floor(south / TILE_SIZE);
  const latEnd = Math.floor(north / TILE_SIZE);
  const lngStart = Math.floor(west / TILE_SIZE);
  const lngEnd = Math.floor(east / TILE_SIZE);

  for (let y = latStart; y <= latEnd; y += 1) {
    for (let x = lngStart; x <= lngEnd; x += 1) {
      tiles.push({
        key: `${y}_${x}`,
        bounds: [y * TILE_SIZE, x * TILE_SIZE, (y + 1) * TILE_SIZE, (x + 1) * TILE_SIZE],
      });
    }
  }
  return tiles;
}

async function readTileFromDisk(key: string): Promise<Ring[] | null> {
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${key}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { savedAt: number; buildings: Ring[] };
    if (Date.now() - parsed.savedAt > TILE_TTL) return null;
    return parsed.buildings;
  } catch {
    return null;
  }
}

async function writeTileToDisk(key: string, buildings: Ring[]) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify({ savedAt: Date.now(), buildings }),
      'utf8',
    );
  } catch (error) {
    console.warn('[geo] could not cache tile', key, (error as Error).message);
  }
}

function parseOverpassBuildings(body: string): Ring[] {
  const data = JSON.parse(body) as {
    elements?: Array<{ geometry?: Array<{ lat: number; lon: number }> }>;
  };

  const buildings: Ring[] = [];
  for (const element of data.elements ?? []) {
    if (!element.geometry || element.geometry.length < 4) continue;
    buildings.push(
      element.geometry.map(
        ({ lat, lon }) => [Number(lat.toFixed(6)), Number(lon.toFixed(6))] as [number, number],
      ),
    );
  }
  return buildings;
}

/** Footprints for one grid tile: memory, then disk, then Overpass. */
async function loadTile(key: string, bounds: [number, number, number, number]): Promise<Ring[] | null> {
  const memory = readCache(tileMemory, key);
  if (memory) return memory;

  const existing = tileInFlight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const onDisk = await readTileFromDisk(key);
    if (onDisk) {
      writeCache(tileMemory, key, onDisk, TILE_TTL);
      return onDisk;
    }

    if (Date.now() < overpassCooldownUntil) return null;

    const [south, west, north, east] = bounds.map(n => n.toFixed(4));
    const query = `[out:json][timeout:25];way["building"](${south},${west},${north},${east});out geom;`;
    const body = await withOverpassSlot(() => queryOverpass(query));

    if (body === null) {
      overpassCooldownUntil = Date.now() + 60_000;
      return null;
    }

    const buildings = parseOverpassBuildings(body);
    writeCache(tileMemory, key, buildings, TILE_TTL);
    void writeTileToDisk(key, buildings);
    return buildings;
  })().finally(() => {
    tileInFlight.delete(key);
  });

  tileInFlight.set(key, job);
  return job;
}

const BOUNDARY_TTL = 30 * 24 * 60 * 60 * 1000;

interface BoundaryPayload {
  name: string;
  rings: Ring[];
  bbox: [number, number, number, number];
}

function readCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number, max?: number) {
  store.set(key, { value, expires: Date.now() + ttl });
  if (max && store.size > max) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}

/** GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng]. */
function geoJsonToRings(geometry: unknown): Ring[] {
  const geo = geometry as { type?: string; coordinates?: unknown };
  if (!geo?.type || !geo.coordinates) return [];

  const toRing = (coords: unknown): Ring =>
    (coords as [number, number][])
      .filter(pt => Array.isArray(pt) && pt.length >= 2)
      .map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))] as [number, number]);

  if (geo.type === 'Polygon') {
    return (geo.coordinates as unknown[]).map(toRing).filter(r => r.length > 2);
  }

  if (geo.type === 'MultiPolygon') {
    const rings: Ring[] = [];
    for (const polygon of geo.coordinates as unknown[]) {
      for (const ring of polygon as unknown[]) {
        const converted = toRing(ring);
        if (converted.length > 2) rings.push(converted);
      }
    }
    return rings;
  }

  return [];
}

function ringsBbox(rings: Ring[]): [number, number, number, number] {
  let south = 90;
  let west = 180;
  let north = -90;
  let east = -180;
  for (const ring of rings) {
    for (const [lat, lng] of ring) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }
  }
  return [south, west, north, east];
}

interface NominatimPlace {
  display_name?: string;
  name?: string;
  geojson?: unknown;
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

interface GeocodingPayload {
  lat: number;
  lng: number;
  displayName: string;
  address: string;
  city: string;
  district: string;
}

function parseNominatimAddress(addr?: NominatimPlace['address']): Pick<GeocodingPayload, 'address' | 'city' | 'district'> {
  if (!addr) return { address: '', city: '', district: '' };
  const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
  const city = addr.city || addr.town || addr.village || 'თბილისი';
  const district = addr.suburb || addr.neighbourhood || addr.state || '';
  return { address: street, city, district };
}

function toGeocodingResult(place: NominatimPlace): GeocodingPayload | null {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const parsed = parseNominatimAddress(place.address);
  const city = canonicalCityName(parsed.city) || parsed.city;
  const district = canonicalDistrictName(city, parsed.district);
  return {
    lat,
    lng,
    displayName: place.display_name || place.name || '',
    address: parsed.address,
    city,
    district,
  };
}

interface StreetHit {
  street: string;
  streetNumber: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  label: string;
  sublabel: string;
}

interface IndexedStreet {
  name: string;
  lat: number;
  lng: number;
}

const STREET_SEED: Record<string, string[]> = {
  თბილისი: [
    'ილია ჭავჭავაძის გამზირი',
    'ალექსანდრე ყაზბეგის გამზირი',
    'ვაჟა-ფშაველას გამზირი',
    'მერაბ კოსტავას ქუჩა',
    'შოთა რუსთაველის გამზირი',
    'დავით აღმაშენებლის გამზირი',
    'პეკინის გამზირი',
    'ბერბუკის ქუჩა',
    'ელიზბარ მინდელის ქუჩა',
    'შარტავას ქუჩა',
    'დავით თავხელიძის ქუჩა',
    'ანა პოლიტკოვსკაიას ქუჩა',
    'თამარ იოსებიძის ქუჩა',
    'ნუცუბიძის ქუჩა',
    'უნივერსიტეტის ქუჩა',
    'აკაკი წერეთლის გამზირი',
    'ალექსანდრე გრიბოედოვის ქუჩა',
    'ლადო ასათიანის ქუჩა',
    'კოტე აფხაზის ქუჩა',
    'სულხან-საბას ქუჩა',
  ],
};

const streetIndex = new Map<string, IndexedStreet[]>();
const streetIndexBusy = new Map<string, Promise<IndexedStreet[]>>();
const STREET_INDEX_TTL = 30 * 24 * 60 * 60 * 1000;

function streetKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function splitStreetQuery(query: string): { street: string; number: string } {
  const trimmed = query.trim();
  const match = trimmed.match(/^(.*?)[\s,]+(\d+[ა-ჰa-zA-Z]?[-/]?\d*[ა-ჰa-zA-Z]?)$/u);
  if (match?.[1]?.trim()) return { street: match[1].trim(), number: match[2] };
  return { street: trimmed, number: '' };
}

function filterStreets(streets: IndexedStreet[], query: string): IndexedStreet[] {
  const key = streetKey(query);
  if (key.length < 2) return [];
  const starts: IndexedStreet[] = [];
  const includes: IndexedStreet[] = [];
  for (const street of streets) {
    const name = streetKey(street.name);
    if (name.startsWith(key)) starts.push(street);
    else if (name.includes(key)) includes.push(street);
  }
  return [...starts, ...includes].slice(0, 10);
}

function seedStreets(cityKa: string): IndexedStreet[] {
  const city = findCityArea(cityKa);
  const center = city?.center ?? { lat: 41.7151, lng: 44.8271 };
  return (STREET_SEED[cityKa] ?? []).map(name => ({ name, lat: center.lat, lng: center.lng }));
}

function parseOverpassStreets(body: string): IndexedStreet[] {
  const data = JSON.parse(body) as {
    elements?: Array<{ tags?: { name?: string }; center?: { lat: number; lon: number }; lat?: number; lon?: number }>;
  };
  const byName = new Map<string, IndexedStreet>();
  for (const element of data.elements ?? []) {
    const name = String(element.tags?.name || '').trim();
    if (name.length < 2) continue;
    const lat = element.center?.lat ?? element.lat;
    const lng = element.center?.lon ?? element.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = streetKey(name);
    if (!byName.has(key)) byName.set(key, { name, lat: lat as number, lng: lng as number });
  }
  return [...byName.values()];
}

async function loadStreetIndex(cityKa: string): Promise<IndexedStreet[]> {
  const cached = streetIndex.get(cityKa);
  if (cached) return cached;

  const busy = streetIndexBusy.get(cityKa);
  if (busy) return busy;

  const job = (async () => {
    const city = findCityArea(cityKa);
    const file = path.join(CACHE_DIR, `streets-${cityKa}.json`);
    try {
      const raw = JSON.parse(await readFile(file, 'utf8')) as { savedAt: number; streets: IndexedStreet[] };
      if (Date.now() - raw.savedAt < STREET_INDEX_TTL && raw.streets?.length) {
        streetIndex.set(cityKa, raw.streets);
        return raw.streets;
      }
    } catch { /* build below */ }

    const rel = city?.osm?.replace(/^R/i, '');
    if (!rel) return seedStreets(cityKa);

    const query = `[out:json][timeout:50];rel(${rel});map_to_area;way["highway"~"^(residential|living_street|primary|secondary|tertiary|unclassified|pedestrian|trunk)$"]["name"](area);out tags center;`;
    const body = await queryOverpass(query);
    if (!body) return seedStreets(cityKa);

    const streets = parseOverpassStreets(body);
    if (streets.length) {
      streetIndex.set(cityKa, streets);
      try {
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(file, JSON.stringify({ savedAt: Date.now(), streets }));
      } catch { /* ignore disk errors */ }
    }
    return streets.length ? streets : seedStreets(cityKa);
  })().finally(() => streetIndexBusy.delete(cityKa));

  streetIndexBusy.set(cityKa, job);
  return job;
}

async function searchNominatim(q: string, cityName = ''): Promise<GeocodingPayload[]> {
  const city = findCityArea(cityName);
  const query = city && !q.toLowerCase().includes(city.ka.toLowerCase())
    ? `${q}, ${city.ka}, Georgia`
    : q;
  const params: Record<string, string> = {
    q: query,
    limit: '8',
    countrycodes: 'ge',
  };
  if (city) {
    const box = cityViewbox(city);
    params.viewbox = `${box.left},${box.top},${box.right},${box.bottom}`;
  }
  const results = await nominatimAddress('search', params) as NominatimPlace[];
  const seen = new Set<string>();
  const out: GeocodingPayload[] = [];
  for (const place of results) {
    const row = toGeocodingResult(place);
    if (!row) continue;
    const key = `${streetKey(row.address)}|${row.lat.toFixed(4)}|${row.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function toStreetHit(row: {
  street: string;
  streetNumber?: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
}): StreetHit {
  const city = canonicalCityName(row.city) || row.city;
  const district = canonicalDistrictName(city, row.district);
  const parsed = splitStreetQuery(row.street);
  const street = parsed.street || row.street;
  const streetNumber = row.streetNumber || parsed.number || '';
  return {
    street,
    streetNumber,
    city,
    district,
    lat: row.lat,
    lng: row.lng,
    label: [street, streetNumber].filter(Boolean).join(' '),
    sublabel: [district, city].filter(Boolean).join(' · '),
  };
}

async function suggestStreets(q: string, cityName: string): Promise<StreetHit[]> {
  const city = findCityArea(cityName);
  const cityKa = city?.ka || cityName || 'თბილისი';
  const { street: streetQuery, number: typedNumber } = splitStreetQuery(q);
  const queryKey = streetKey(streetQuery);

  const index = await Promise.race([
    loadStreetIndex(cityKa),
    new Promise<IndexedStreet[]>(resolve => setTimeout(() => resolve(seedStreets(cityKa)), 180)),
  ]);
  const local = filterStreets([...seedStreets(cityKa), ...index], streetQuery);
  const uniqueStarts = local.filter(row => streetKey(row.name).startsWith(queryKey));

  const nominatimQuery = uniqueStarts.length === 1
    ? `${uniqueStarts[0].name}${typedNumber ? ` ${typedNumber}` : ''}`
    : q;

  const remote = await searchNominatim(nominatimQuery, cityKa).catch(() => [] as GeocodingPayload[]);

  const merged = new Map<string, StreetHit>();
  for (const row of remote) {
    const raw = row.address || row.displayName.split(',')[0] || '';
    if (!raw) continue;
    const hit = toStreetHit({
      street: raw,
      streetNumber: typedNumber,
      city: row.city,
      district: row.district,
      lat: row.lat,
      lng: row.lng,
    });
    merged.set(streetKey(hit.street), hit);
  }
  for (const row of local) {
    const key = streetKey(row.name);
    if (merged.has(key)) continue;
    const isSeedCenter = STREET_SEED[cityKa]?.includes(row.name)
      && Math.abs(row.lat - (city?.center.lat ?? 0)) < 1e-6;
    if (isSeedCenter) continue;
    merged.set(key, toStreetHit({
      street: row.name,
      streetNumber: typedNumber,
      city: cityKa,
      district: '',
      lat: row.lat,
      lng: row.lng,
    }));
  }

  if (uniqueStarts.length === 1 && remote[0]?.district) {
    const hit = merged.get(streetKey(uniqueStarts[0].name));
    if (hit && !hit.district) {
      hit.district = canonicalDistrictName(cityKa, remote[0].district);
      hit.sublabel = [hit.district, hit.city].filter(Boolean).join(' · ');
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      const aStart = streetKey(a.street).startsWith(queryKey) ? 0 : 1;
      const bStart = streetKey(b.street).startsWith(queryKey) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return a.street.localeCompare(b.street, 'ka');
    })
    .slice(0, 8);
}

void loadStreetIndex('თბილისი').catch(() => undefined);

async function nominatimAddress(path: 'search' | 'reverse', params: Record<string, string>): Promise<NominatimPlace | NominatimPlace[]> {
  const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'ka,en');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const upstream = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!upstream.ok) throw new Error(`nominatim ${path} ${upstream.status}`);
  return (await upstream.json()) as NominatimPlace | NominatimPlace[];
}

function toBoundary(results: NominatimPlace[], fallbackName: string): BoundaryPayload | null {
  for (const result of results) {
    const rings = geoJsonToRings(result.geojson);
    if (rings.length) {
      return {
        name: result.name || result.display_name || fallbackName,
        rings,
        bbox: ringsBbox(rings),
      };
    }
  }
  return null;
}

async function nominatim(path: 'search' | 'lookup', params: Record<string, string>): Promise<NominatimPlace[]> {
  const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('polygon_geojson', '1');
  url.searchParams.set('accept-language', 'ka,en');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const upstream = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!upstream.ok) throw new Error(`nominatim ${path} ${upstream.status}`);
  return (await upstream.json()) as NominatimPlace[];
}

/**
 * Outline of a city or district so the map can highlight the selected area.
 * An OSM id gives an exact answer; the name search is only a fallback, since
 * names alone are ambiguous.
 */
router.get('/boundary', async (req, res) => {
  const osmId = String(req.query.osm || '').trim().toUpperCase();
  const city = String(req.query.city || '').trim();
  const district = String(req.query.district || '').trim();

  if (osmId && !/^[NWR]\d{1,12}$/.test(osmId)) {
    res.status(400).json({ error: 'osm must look like R11300449' });
    return;
  }

  if (!osmId && !city && !district) {
    res.status(400).json({ error: 'osm, city or district is required' });
    return;
  }

  const cacheKey = osmId || `${city}|${district}`.toLowerCase();
  const cached = readCache(boundaryCache, cacheKey);
  if (cached !== undefined) {
    res.json(cached);
    return;
  }

  const label = [district, city].filter(Boolean).join(', ') || osmId;

  try {
    const results = osmId
      ? await nominatim('lookup', { osm_ids: osmId })
      : await nominatim('search', {
          q: district ? `${district}, ${city}, Georgia` : `${city}, Georgia`,
          limit: '6',
          countrycodes: 'ge',
        });

    const payload = toBoundary(results, label);
    writeCache(boundaryCache, cacheKey, payload, BOUNDARY_TTL);
    res.json(payload);
  } catch (error) {
    console.error('[geo] boundary lookup failed:', error);
    res.json(null);
  }
});

/**
 * Building footprints inside a viewport, used to paint the Korter-style
 * highlighted buildings once the user is zoomed in far enough.
 */
router.get('/buildings', async (req, res) => {
  const parts = String(req.query.bbox || '').split(',').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) {
    res.status(400).json({ error: 'bbox must be "south,west,north,east"' });
    return;
  }

  const [south, west, north, east] = parts;
  const tiles = tilesForBbox(south, west, north, east);

  // Guard against huge Overpass queries — the client only asks when zoomed in.
  if (tiles.length > MAX_TILES_PER_REQUEST) {
    res.json({ buildings: [], reason: 'area-too-large' });
    return;
  }

  try {
    const results = await Promise.all(tiles.map(tile => loadTile(tile.key, tile.bounds)));

    const buildings: Ring[] = [];
    let missing = 0;
    for (const result of results) {
      if (result === null) missing += 1;
      else buildings.push(...result);
    }

    res.json({
      buildings,
      ...(missing ? { reason: missing === tiles.length ? 'upstream-busy' : 'partial' } : {}),
    });
  } catch (error) {
    console.error('[geo] buildings lookup failed:', error);
    res.json({ buildings: [], reason: 'error' });
  }
});

/**
 * Forward geocode for the admin location picker — proxied through the server
 * so Nominatim gets a proper User-Agent and rate limits stay predictable.
 */
router.get('/address-search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json([]);
    return;
  }

  try {
    res.json(await searchNominatim(q, String(req.query.city || '')));
  } catch (error) {
    console.error('[geo] address-search failed:', error);
    res.json([]);
  }
});

/**
 * Live street suggestions for the listing form. Prefix matches come from a
 * cached OSM street index (so „ბერ“ finds ბერბუკის ქუჩა); Nominatim fills
 * in house numbers and the district name in Georgian.
 */
router.get('/street-suggest', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const cityName = String(req.query.city || 'თბილისი');
  if (q.length < 2) {
    res.json([]);
    return;
  }

  try {
    res.json(await suggestStreets(q, cityName));
  } catch (error) {
    console.error('[geo] street-suggest failed:', error);
    res.json([]);
  }
});

/** Reverse geocode lat/lng for map pin placement. */
router.get('/address-reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }

  try {
    const result = await nominatimAddress('reverse', {
      lat: String(lat),
      lon: String(lng),
    }) as NominatimPlace;
    const payload = toGeocodingResult(result);
    res.json(payload);
  } catch (error) {
    console.error('[geo] address-reverse failed:', error);
    res.json(null);
  }
});

export default router;
