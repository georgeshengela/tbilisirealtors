/**
 * External market benchmark — MyGE.ge aggregate city statistics.
 *
 * MyGE publishes server-rendered tables that pool listings from ss.ge, myhome.ge and
 * korter.ge, which gives us a market-wide reference our own inventory cannot provide.
 * Their robots.txt allows `/market` (only `/api/`, `/admin` and `/search?` are
 * disallowed) and signals `use=reference`, which is exactly how we consume it.
 *
 * Their figures refresh roughly once a day, so this is a daily benchmark rather than a
 * live feed. Every fetch is snapshotted to the DB so we accumulate the history MyGE
 * itself does not expose.
 */
import { client } from '../db.js';
import { usdToGel } from './currency.js';

const MYGE_URL = 'https://myge.ge/market?lang=ka';
const FETCH_TIMEOUT_MS = 15_000;

/** MyGE recomputes daily; refetching more often than this only adds load. */
const TTL_MS = 6 * 60 * 60 * 1000;

const USER_AGENT =
  'TbilisiRealtorsBot/1.0 (+https://tbilisirealtors.ge; market benchmark; contact info@tbilisirealtor.ge)';

export interface ExternalCityRow {
  slug: string;
  city: string;
  totalListings: number;
  saleListings: number;
  rentListings: number;
  sources: string[];
  /** Listings actually used for the price maths (MyGE's 30/90-day analytic window). */
  saleSample: number;
  saleMedianPrice: number;
  saleMedianPerSqm: number;
  saleAvgPerSqm: number;
  saleP25PerSqm: number | null;
  saleP75PerSqm: number | null;
  rentSample: number;
  rentMedianPrice: number;
  rentAvgPrice: number;
  rentMedianPerSqm: number;
  /** ISO date MyGE last recomputed this city. */
  sourceUpdated: string | null;
}

export interface ExternalMarketReport {
  source: 'myge.ge';
  sourceUrl: string;
  fetchedAt: string;
  /** True when served from the in-process cache or a recent DB snapshot. */
  cached: boolean;
  /** GEL per USD used to convert MyGE's dollar figures. */
  usdRate: number;
  currency: 'USD';
  totals: {
    listings: number;
    sale: number;
    rent: number;
    cities: number;
  };
  cities: ExternalCityRow[];
  /** Per-city change vs the oldest snapshot we hold, keyed by slug. */
  history: ExternalHistoryPoint[];
  error?: string;
}

export interface ExternalHistoryPoint {
  slug: string;
  city: string;
  first: { date: string; saleMedianPerSqm: number };
  last: { date: string; saleMedianPerSqm: number };
  changePct: number;
  days: number;
}

/* ── HTML helpers ─────────────────────────────────────────────────────────── */

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m] ?? m);
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

interface ParsedTable {
  headers: string[];
  rows: { cells: string[]; raw: string[] }[];
}

function parseTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];

  for (const tableMatch of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const body = tableMatch[1];
    const headers: string[] = [];
    const rows: { cells: string[]; raw: string[] }[] = [];

    for (const rowMatch of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const rowHtml = rowMatch[1];
      const raw: string[] = [];
      const cells: string[] = [];
      let isHeader = false;

      for (const cellMatch of rowHtml.matchAll(/<(t[hd])[^>]*>([\s\S]*?)<\/\1>/gi)) {
        if (cellMatch[1].toLowerCase() === 'th') isHeader = true;
        raw.push(cellMatch[2]);
        cells.push(stripTags(cellMatch[2]));
      }

      if (cells.length === 0) continue;
      if (isHeader && headers.length === 0) headers.push(...cells);
      else rows.push({ cells, raw });
    }

    if (rows.length > 0) tables.push({ headers, rows });
  }

  return tables;
}

/** "$1,689" / "4,868" / "—" / "მონაცემები არასაკმარისია" → number | null */
function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "$1,500 / $2,094" → [1500, 2094] */
function parseRange(value: string): [number | null, number | null] {
  const parts = value.split('/');
  if (parts.length < 2) return [null, null];
  return [parseNumber(parts[0]), parseNumber(parts[1])];
}

function parseIsoDate(value: string): string | null {
  const m = value.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function slugFromRow(raw: string[]): string | null {
  for (const cell of raw) {
    const m = cell.match(/[?&]city=([a-z0-9_%-]+)/i);
    if (m) return decodeURIComponent(m[1]).toLowerCase();
  }
  return null;
}

function headerHas(headers: string[], needle: string): boolean {
  return headers.some(h => h.includes(needle));
}

/* ── Parsing ──────────────────────────────────────────────────────────────── */

export function parseMygeMarket(html: string): Omit<ExternalCityRow, never>[] {
  const tables = parseTables(html);

  const listingsTable = tables.find(t => headerHas(t.headers, 'სულ') && headerHas(t.headers, 'გაყიდვა'));
  const saleTable = tables.find(t => headerHas(t.headers, 'მედიანური ფასი'));
  const rentTable = tables.find(t => headerHas(t.headers, 'მედიანური ქირა'));

  if (!listingsTable) {
    throw new Error('MyGE: ვერ მოიძებნა განცხადებების ცხრილი — გვერდის სტრუქტურა შეიცვალა');
  }

  const byCity = new Map<string, ExternalCityRow>();

  for (const row of listingsTable.rows) {
    const [city, total, sale, rent, sources, updated] = row.cells;
    if (!city) continue;
    byCity.set(city, {
      slug: slugFromRow(row.raw) ?? city,
      city,
      totalListings: parseNumber(total) ?? 0,
      saleListings: parseNumber(sale) ?? 0,
      rentListings: parseNumber(rent) ?? 0,
      sources: (sources ?? '').split(',').map(s => s.trim()).filter(Boolean),
      saleSample: 0,
      saleMedianPrice: 0,
      saleMedianPerSqm: 0,
      saleAvgPerSqm: 0,
      saleP25PerSqm: null,
      saleP75PerSqm: null,
      rentSample: 0,
      rentMedianPrice: 0,
      rentAvgPrice: 0,
      rentMedianPerSqm: 0,
      sourceUpdated: parseIsoDate(updated ?? ''),
    });
  }

  // ქალაქი | რაოდენობა | მედიანური ფასი | მედიანა ფასი/მ² | საშუალო ფასი/მ² | P25/P75 | განახლდა
  for (const row of saleTable?.rows ?? []) {
    const entry = byCity.get(row.cells[0]);
    if (!entry) continue;
    const [p25, p75] = parseRange(row.cells[5] ?? '');
    entry.saleSample = parseNumber(row.cells[1]) ?? 0;
    entry.saleMedianPrice = parseNumber(row.cells[2]) ?? 0;
    entry.saleMedianPerSqm = parseNumber(row.cells[3]) ?? 0;
    entry.saleAvgPerSqm = parseNumber(row.cells[4]) ?? 0;
    entry.saleP25PerSqm = p25;
    entry.saleP75PerSqm = p75;
  }

  // ქალაქი | რაოდენობა | მედიანური ქირა | საშუალო ქირა | მედიანა ქირა/მ² | P25/P75 | განახლდა
  for (const row of rentTable?.rows ?? []) {
    const entry = byCity.get(row.cells[0]);
    if (!entry) continue;
    entry.rentSample = parseNumber(row.cells[1]) ?? 0;
    entry.rentMedianPrice = parseNumber(row.cells[2]) ?? 0;
    entry.rentAvgPrice = parseNumber(row.cells[3]) ?? 0;
    entry.rentMedianPerSqm = parseNumber(row.cells[4]) ?? 0;
  }

  return [...byCity.values()];
}

/* ── Snapshot storage ─────────────────────────────────────────────────────── */

async function saveSnapshot(cities: ExternalCityRow[]): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);

  for (const c of cities) {
    await client`
      INSERT INTO external_market_snapshots (
        source, snapshot_date, city_slug, city,
        total_listings, sale_listings, rent_listings,
        sale_sample, sale_median_price, sale_median_per_sqm, sale_avg_per_sqm,
        sale_p25_per_sqm, sale_p75_per_sqm,
        rent_sample, rent_median_price, rent_avg_price, rent_median_per_sqm,
        source_updated, payload
      ) VALUES (
        'myge.ge', ${day}, ${c.slug}, ${c.city},
        ${c.totalListings}, ${c.saleListings}, ${c.rentListings},
        ${c.saleSample}, ${c.saleMedianPrice}, ${c.saleMedianPerSqm}, ${c.saleAvgPerSqm},
        ${c.saleP25PerSqm}, ${c.saleP75PerSqm},
        ${c.rentSample}, ${c.rentMedianPrice}, ${c.rentAvgPrice}, ${c.rentMedianPerSqm},
        ${c.sourceUpdated}, ${JSON.stringify(c)}::jsonb
      )
      ON CONFLICT (source, snapshot_date, city_slug) DO UPDATE SET
        total_listings      = EXCLUDED.total_listings,
        sale_listings       = EXCLUDED.sale_listings,
        rent_listings       = EXCLUDED.rent_listings,
        sale_sample         = EXCLUDED.sale_sample,
        sale_median_price   = EXCLUDED.sale_median_price,
        sale_median_per_sqm = EXCLUDED.sale_median_per_sqm,
        sale_avg_per_sqm    = EXCLUDED.sale_avg_per_sqm,
        sale_p25_per_sqm    = EXCLUDED.sale_p25_per_sqm,
        sale_p75_per_sqm    = EXCLUDED.sale_p75_per_sqm,
        rent_sample         = EXCLUDED.rent_sample,
        rent_median_price   = EXCLUDED.rent_median_price,
        rent_avg_price      = EXCLUDED.rent_avg_price,
        rent_median_per_sqm = EXCLUDED.rent_median_per_sqm,
        source_updated      = EXCLUDED.source_updated,
        payload             = EXCLUDED.payload,
        fetched_at          = NOW()
    `;
  }
}

/** Change per city between our oldest and newest stored snapshot. */
async function loadHistory(): Promise<ExternalHistoryPoint[]> {
  const rows = await client<Record<string, unknown>[]>`
    WITH ranked AS (
      SELECT
        city_slug, city, snapshot_date, sale_median_per_sqm,
        ROW_NUMBER() OVER (PARTITION BY city_slug ORDER BY snapshot_date ASC)  AS rn_first,
        ROW_NUMBER() OVER (PARTITION BY city_slug ORDER BY snapshot_date DESC) AS rn_last
      FROM external_market_snapshots
      WHERE source = 'myge.ge' AND sale_median_per_sqm > 0
    )
    SELECT
      f.city_slug,
      l.city,
      f.snapshot_date::text AS first_date,
      f.sale_median_per_sqm::float8 AS first_value,
      l.snapshot_date::text AS last_date,
      l.sale_median_per_sqm::float8 AS last_value,
      (l.snapshot_date - f.snapshot_date)::int AS days
    FROM ranked f
    JOIN ranked l ON l.city_slug = f.city_slug AND l.rn_last = 1
    WHERE f.rn_first = 1 AND l.snapshot_date > f.snapshot_date
    ORDER BY l.city
  `;

  return rows.map(r => {
    const first = Number(r.first_value);
    const last = Number(r.last_value);
    return {
      slug: String(r.city_slug),
      city: String(r.city),
      first: { date: String(r.first_date), saleMedianPerSqm: first },
      last: { date: String(r.last_date), saleMedianPerSqm: last },
      changePct: first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0,
      days: Number(r.days),
    };
  });
}

/** Most recent stored snapshot, used as the fallback when MyGE is unreachable. */
async function loadLatestSnapshot(): Promise<{ cities: ExternalCityRow[]; fetchedAt: string } | null> {
  const rows = await client<Record<string, unknown>[]>`
    SELECT payload, fetched_at
    FROM external_market_snapshots
    WHERE source = 'myge.ge'
      AND snapshot_date = (SELECT MAX(snapshot_date) FROM external_market_snapshots WHERE source = 'myge.ge')
    ORDER BY total_listings DESC
  `;
  if (rows.length === 0) return null;

  return {
    cities: rows.map(r => r.payload as ExternalCityRow),
    fetchedAt: new Date(String(rows[0].fetched_at)).toISOString(),
  };
}

/* ── Public entry point ───────────────────────────────────────────────────── */

let memo: { report: ExternalMarketReport; at: number } | null = null;

export async function externalMarketReport(force = false): Promise<ExternalMarketReport> {
  if (!force && memo && Date.now() - memo.at < TTL_MS) {
    return { ...memo.report, cached: true };
  }

  const usdRate = await usdToGel();

  try {
    const resp = await fetch(MYGE_URL, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`MyGE HTTP ${resp.status}`);

    const cities = parseMygeMarket(await resp.text());
    if (cities.length === 0) throw new Error('MyGE: ცხრილი ცარიელია');

    await saveSnapshot(cities);

    const report: ExternalMarketReport = {
      source: 'myge.ge',
      sourceUrl: MYGE_URL,
      fetchedAt: new Date().toISOString(),
      cached: false,
      usdRate,
      currency: 'USD',
      totals: {
        listings: cities.reduce((s, c) => s + c.totalListings, 0),
        sale: cities.reduce((s, c) => s + c.saleListings, 0),
        rent: cities.reduce((s, c) => s + c.rentListings, 0),
        cities: cities.length,
      },
      cities: cities.sort((a, b) => b.totalListings - a.totalListings),
      history: await loadHistory(),
    };

    memo = { report, at: Date.now() };
    return report;
  } catch (err) {
    // Serve the last good snapshot rather than blanking the dashboard.
    const fallback = await loadLatestSnapshot();
    const message = err instanceof Error ? err.message : 'MyGE fetch failed';

    if (!fallback) {
      return {
        source: 'myge.ge',
        sourceUrl: MYGE_URL,
        fetchedAt: new Date().toISOString(),
        cached: false,
        usdRate,
        currency: 'USD',
        totals: { listings: 0, sale: 0, rent: 0, cities: 0 },
        cities: [],
        history: [],
        error: message,
      };
    }

    return {
      source: 'myge.ge',
      sourceUrl: MYGE_URL,
      fetchedAt: fallback.fetchedAt,
      cached: true,
      usdRate,
      currency: 'USD',
      totals: {
        listings: fallback.cities.reduce((s, c) => s + c.totalListings, 0),
        sale: fallback.cities.reduce((s, c) => s + c.saleListings, 0),
        rent: fallback.cities.reduce((s, c) => s + c.rentListings, 0),
        cities: fallback.cities.length,
      },
      cities: fallback.cities,
      history: await loadHistory(),
      error: message,
    };
  }
}
