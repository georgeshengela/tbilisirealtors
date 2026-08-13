export type Ring = [number, number][];

export interface AreaBoundary {
  name: string;
  rings: Ring[];
  bbox: [number, number, number, number];
}

const boundaryCache = new Map<string, AreaBoundary | null>();
const boundaryInFlight = new Map<string, Promise<AreaBoundary | null>>();
const buildingCache = new Map<string, Ring[]>();

const STORAGE_PREFIX = 'tr_boundary_';

function readStoredBoundary(key: string): AreaBoundary | null | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as AreaBoundary | null;
  } catch {
    return undefined;
  }
}

function storeBoundary(key: string, value: AreaBoundary | null) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or private mode — cache in memory only */
  }
}

export interface AreaQuery {
  /** OSM relation of the area, e.g. "R11300449" — the exact, unambiguous lookup. */
  osm?: string;
  city?: string;
  district?: string;
}

export async function fetchAreaBoundary(query: AreaQuery): Promise<AreaBoundary | null> {
  const { osm, city, district } = query;
  if (!osm && !city && !district) return null;

  const key = osm ?? `${city ?? ''}|${district ?? ''}`;
  if (boundaryCache.has(key)) return boundaryCache.get(key) ?? null;

  const stored = readStoredBoundary(key);
  if (stored !== undefined) {
    boundaryCache.set(key, stored);
    return stored;
  }

  const existing = boundaryInFlight.get(key);
  if (existing) return existing;

  const params = new URLSearchParams();
  if (osm) params.set('osm', osm);
  else {
    if (city) params.set('city', city);
    if (district) params.set('district', district);
  }

  const request = fetch(`/api/geo/boundary?${params.toString()}`)
    .then(res => (res.ok ? (res.json() as Promise<AreaBoundary | null>) : null))
    .then(value => {
      boundaryCache.set(key, value);
      storeBoundary(key, value);
      return value;
    })
    .catch(() => null)
    .finally(() => {
      boundaryInFlight.delete(key);
    });

  boundaryInFlight.set(key, request);
  return request;
}

export async function fetchBuildingFootprints(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<Ring[]> {
  const key = bbox.map(n => n.toFixed(4)).join(',');
  const cached = buildingCache.get(key);
  if (cached) return cached;

  const res = await fetch(`/api/geo/buildings?bbox=${key}`, { signal });
  if (!res.ok) return [];

  const json = (await res.json()) as { buildings?: Ring[] };
  const buildings = json.buildings ?? [];

  buildingCache.set(key, buildings);
  if (buildingCache.size > 60) {
    const oldest = buildingCache.keys().next().value;
    if (oldest !== undefined) buildingCache.delete(oldest);
  }

  return buildings;
}
