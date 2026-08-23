import { Router } from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
  return {
    lat,
    lng,
    displayName: place.display_name || place.name || '',
    ...parsed,
  };
}

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
    const results = await nominatimAddress('search', {
      q,
      limit: '6',
      countrycodes: 'ge',
    }) as NominatimPlace[];
    res.json(results.map(r => toGeocodingResult(r)).filter(Boolean));
  } catch (error) {
    console.error('[geo] address-search failed:', error);
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
