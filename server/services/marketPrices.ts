/**
 * Market price analytics — live aggregates from the listings DB plus Geostat benchmarks.
 */
import { client } from '../db.js';
import {
  GEOSTAT_BENCHMARK,
  MARKET_DATA_SOURCES,
} from '../data/geostatBenchmarks.js';

const SALE_STATUSES = ['sale', 'both'];
const RENT_STATUSES = ['rent', 'both', 'daily_rent'];

/**
 * Sale prices and monthly rents live on different scales, so they are never pooled
 * into one ₾/m² figure — every report is anchored to exactly one side of the market.
 */
export type DealFilter = 'sale' | 'rent';
export type TrendDirection = 'up' | 'down' | 'flat';

/** Below this many listings in either window a period-over-period change is noise. */
const MIN_TREND_SAMPLE = 3;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * A change is only reported when both windows hold enough listings to mean anything;
 * otherwise a single new listing can swing the number by 100%.
 */
function sampledTrend(
  current: number,
  previous: number,
  currentCount: unknown,
  previousCount: unknown,
): { change: number; reliable: boolean } {
  const n1 = num(currentCount);
  const n0 = num(previousCount);
  if (n1 < MIN_TREND_SAMPLE || n0 < MIN_TREND_SAMPLE) {
    return { change: 0, reliable: false };
  }
  return { change: pctChange(current, previous), reliable: true };
}

function trendDir(change: number): TrendDirection {
  if (change > 1.5) return 'up';
  if (change < -1.5) return 'down';
  return 'flat';
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

function benchmarkForDistrict(district: string): number | null {
  const key = district.trim().toLowerCase();
  const row = GEOSTAT_BENCHMARK.districts.find(
    d => d.key.toLowerCase() === key || d.geostatEn.toLowerCase() === key,
  );
  return row?.pricePerSqm ?? null;
}

export interface MarketFilters {
  city?: string;
  deal: DealFilter;
}

export interface DistrictPriceRow {
  key: string;
  city: string;
  district: string;
  count: number;
  forSale: number;
  forRent: number;
  avgPricePerSqm: number;
  medianPricePerSqm: number;
  avgPrice: number;
  medianPrice: number;
  avgArea: number;
  lat: number | null;
  lng: number | null;
  trend30d: number;
  trendDirection: TrendDirection;
  /** False when either comparison window held too few listings to trust the change. */
  trendReliable: boolean;
  benchmarkPricePerSqm: number | null;
  vsBenchmark: number | null;
}

export interface CityPriceRow {
  city: string;
  count: number;
  avgPricePerSqm: number;
  medianPricePerSqm: number;
  avgPrice: number;
  trend30d: number;
  trendDirection: TrendDirection;
  trendReliable: boolean;
}

export interface MonthlyPricePoint {
  month: string;
  count: number;
  avgPricePerSqm: number;
  medianPricePerSqm: number;
  forSale: number;
  forRent: number;
}

export interface HistogramBucket {
  from: number;
  to: number | null;
  label: string;
  count: number;
}

export interface RoomsPriceRow {
  rooms: number;
  label: string;
  count: number;
  avgPricePerSqm: number;
  medianPrice: number;
  avgArea: number;
}

export interface RentYieldRow {
  city: string;
  salePricePerSqm: number;
  rentPricePerSqm: number;
  /** Gross annual yield, percent. */
  grossYield: number;
  /** Years of rent to cover the purchase price. */
  paybackYears: number;
}

export interface PriceChangeStats {
  windowDays: number;
  total: number;
  increases: number;
  decreases: number;
  avgChangePct: number;
  medianChangePct: number;
  /** Sum of absolute price movement, GEL. */
  totalMovement: number;
}

export interface FreshnessStats {
  last7: number;
  last30: number;
  last90: number;
  stale90: number;
}

export interface MarketPricesReport {
  generatedAt: string;
  filters: MarketFilters;
  overview: {
    totalListings: number;
    pricedListings: number;
    avgPricePerSqm: number;
    medianPricePerSqm: number;
    avgPrice: number;
    medianPrice: number;
    avgArea: number;
    trend30d: number;
    trend90d: number;
    trendDirection: TrendDirection;
    trendReliable: boolean;
    minTrendSample: number;
    geostatIndexQoQ: number;
    geostatIndexYoY: number;
    geostatQuarter: string;
  };
  cities: CityPriceRow[];
  districts: DistrictPriceRow[];
  monthlyTrend: MonthlyPricePoint[];
  dealSplit: { deal: string; label: string; count: number; avgPricePerSqm: number; share: number }[];
  typeSplit: { type: string; count: number; avgPricePerSqm: number; share: number }[];
  topGainers: DistrictPriceRow[];
  topLosers: DistrictPriceRow[];
  histogram: HistogramBucket[];
  roomsSplit: RoomsPriceRow[];
  rentYield: RentYieldRow[];
  priceChanges: PriceChangeStats;
  freshness: FreshnessStats;
  benchmarks: typeof GEOSTAT_BENCHMARK.districts;
  sources: typeof MARKET_DATA_SOURCES;
}

function marketWhere(filters: MarketFilters) {
  let where = client`price_per_sqm IS NOT NULL AND price_per_sqm > 0
    AND district IS NOT NULL AND btrim(district) <> ''`;

  if (filters.city) where = client`${where} AND city = ${filters.city}`;
  where = filters.deal === 'rent'
    ? client`${where} AND status = ANY(${RENT_STATUSES})`
    : client`${where} AND status = ANY(${SALE_STATUSES})`;

  return where;
}

export async function marketPricesReport(filters: MarketFilters): Promise<MarketPricesReport> {
  const where = marketWhere(filters);

  const [overviewRow] = await client<Record<string, unknown>[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE price_per_sqm > 0)::int AS priced,
      coalesce(round(avg(price_per_sqm) FILTER (WHERE price_per_sqm > 0)), 0)::int AS avg_sqm,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_sqm) FILTER (WHERE price_per_sqm > 0)), 0)::int AS median_sqm,
      coalesce(round(avg(price) FILTER (WHERE price > 0)), 0)::int AS avg_price,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price) FILTER (WHERE price > 0)), 0)::int AS median_price,
      coalesce(round(avg(area) FILTER (WHERE area > 0)), 0)::int AS avg_area,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE price_per_sqm > 0 AND coalesce(listed_date, created_at::date) >= current_date - 30
      )), 0)::int AS recent_30_sqm,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE price_per_sqm > 0
          AND coalesce(listed_date, created_at::date) >= current_date - 60
          AND coalesce(listed_date, created_at::date) < current_date - 30
      )), 0)::int AS prior_30_sqm,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE price_per_sqm > 0 AND coalesce(listed_date, created_at::date) >= current_date - 90
      )), 0)::int AS recent_90_sqm,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE price_per_sqm > 0
          AND coalesce(listed_date, created_at::date) >= current_date - 180
          AND coalesce(listed_date, created_at::date) < current_date - 90
      )), 0)::int AS prior_90_sqm,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 30)::int AS n_recent_30,
      COUNT(*) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 60
          AND coalesce(listed_date, created_at::date) < current_date - 30
      )::int AS n_prior_30,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 90)::int AS n_recent_90,
      COUNT(*) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 180
          AND coalesce(listed_date, created_at::date) < current_date - 90
      )::int AS n_prior_90
    FROM properties
    WHERE ${where}
  `;

  const districtRows = await client<Record<string, unknown>[]>`
    SELECT
      lower(btrim(district)) AS key,
      coalesce(mode() WITHIN GROUP (ORDER BY district), '') AS district,
      coalesce(mode() WITHIN GROUP (ORDER BY city), '') AS city,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = ANY(${SALE_STATUSES}))::int AS for_sale,
      COUNT(*) FILTER (WHERE status = ANY(${RENT_STATUSES}))::int AS for_rent,
      coalesce(round(avg(price_per_sqm)), 0)::int AS avg_sqm,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_sqm)), 0)::int AS median_sqm,
      coalesce(round(avg(price) FILTER (WHERE price > 0)), 0)::int AS avg_price,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price) FILTER (WHERE price > 0)), 0)::int AS median_price,
      coalesce(round(avg(area) FILTER (WHERE area > 0)), 0)::int AS avg_area,
      avg((coordinates->>'lat')::double precision) FILTER (WHERE coordinates IS NOT NULL) AS lat,
      avg((coordinates->>'lng')::double precision) FILTER (WHERE coordinates IS NOT NULL) AS lng,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 30
      )), 0)::int AS recent_30,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 60
          AND coalesce(listed_date, created_at::date) < current_date - 30
      )), 0)::int AS prior_30,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 30)::int AS n_recent_30,
      COUNT(*) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 60
          AND coalesce(listed_date, created_at::date) < current_date - 30
      )::int AS n_prior_30
    FROM properties
    WHERE ${where}
    GROUP BY lower(btrim(district))
    ORDER BY avg_sqm DESC
  `;

  const cityRows = await client<Record<string, unknown>[]>`
    SELECT
      city,
      COUNT(*)::int AS count,
      coalesce(round(avg(price_per_sqm)), 0)::int AS avg_sqm,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_sqm)), 0)::int AS median_sqm,
      coalesce(round(avg(price) FILTER (WHERE price > 0)), 0)::int AS avg_price,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 30
      )), 0)::int AS recent_30,
      coalesce(round(avg(price_per_sqm) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 60
          AND coalesce(listed_date, created_at::date) < current_date - 30
      )), 0)::int AS prior_30,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 30)::int AS n_recent_30,
      COUNT(*) FILTER (
        WHERE coalesce(listed_date, created_at::date) >= current_date - 60
          AND coalesce(listed_date, created_at::date) < current_date - 30
      )::int AS n_prior_30
    FROM properties
    WHERE ${where}
    GROUP BY city
    ORDER BY count DESC
  `;

  const monthlyRows = await client<Record<string, unknown>[]>`
    SELECT
      to_char(date_trunc('month', coalesce(listed_date, created_at::date)), 'YYYY-MM') AS month,
      COUNT(*)::int AS count,
      coalesce(round(avg(price_per_sqm)), 0)::int AS avg_sqm,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_sqm)), 0)::int AS median_sqm,
      COUNT(*) FILTER (WHERE status = ANY(${SALE_STATUSES}))::int AS for_sale,
      COUNT(*) FILTER (WHERE status = ANY(${RENT_STATUSES}))::int AS for_rent
    FROM properties
    WHERE ${where}
      AND coalesce(listed_date, created_at::date) >= current_date - interval '12 months'
    GROUP BY month
    ORDER BY month ASC
  `;

  /**
   * The sale/rent mix is the one place we want both sides at once, so it deliberately
   * ignores the deal filter and only follows the city selection.
   */
  let mixWhere = client`price_per_sqm IS NOT NULL AND price_per_sqm > 0
    AND district IS NOT NULL AND btrim(district) <> ''`;
  if (filters.city) mixWhere = client`${mixWhere} AND city = ${filters.city}`;

  const dealRows = await client<Record<string, unknown>[]>`
    SELECT
      CASE
        WHEN status = ANY(${RENT_STATUSES}) THEN 'rent'
        WHEN status = ANY(${SALE_STATUSES}) THEN 'sale'
        ELSE 'other'
      END AS deal,
      COUNT(*)::int AS count,
      coalesce(round(avg(price_per_sqm)), 0)::int AS avg_sqm
    FROM properties
    WHERE ${mixWhere}
    GROUP BY deal
    ORDER BY count DESC
  `;

  const typeRows = await client<Record<string, unknown>[]>`
    SELECT
      coalesce(type, 'unknown') AS type,
      COUNT(*)::int AS count,
      coalesce(round(avg(price_per_sqm)), 0)::int AS avg_sqm
    FROM properties
    WHERE ${where}
    GROUP BY coalesce(type, 'unknown')
    ORDER BY count DESC
  `;

  /** ₾/m² spread, clipped at the 2nd/98th percentile so one outlier cannot flatten it. */
  const histogramRows = await client<Record<string, unknown>[]>`
    WITH bounds AS (
      SELECT
        percentile_cont(0.02) WITHIN GROUP (ORDER BY price_per_sqm) AS lo,
        percentile_cont(0.98) WITHIN GROUP (ORDER BY price_per_sqm) AS hi
      FROM properties
      WHERE ${where}
    )
    SELECT
      width_bucket(
        price_per_sqm,
        bounds.lo,
        GREATEST(bounds.hi, bounds.lo + 1),
        8
      ) AS bucket,
      COUNT(*)::int AS count,
      round(MIN(price_per_sqm))::int AS min_v,
      round(MAX(price_per_sqm))::int AS max_v
    FROM properties, bounds
    WHERE ${where}
    GROUP BY bucket
    ORDER BY bucket
  `;

  const roomsRows = await client<Record<string, unknown>[]>`
    SELECT
      LEAST(coalesce(bedrooms, 0), 5)::int AS rooms,
      COUNT(*)::int AS count,
      coalesce(round(avg(price_per_sqm)), 0)::int AS avg_sqm,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price) FILTER (WHERE price > 0)), 0)::int AS median_price,
      coalesce(round(avg(area) FILTER (WHERE area > 0)), 0)::int AS avg_area
    FROM properties
    WHERE ${where}
    GROUP BY LEAST(coalesce(bedrooms, 0), 5)
    ORDER BY rooms ASC
  `;

  /**
   * Gross yield needs both sides of the market, so it ignores the deal filter and
   * only follows the city selection.
   */
  let yieldWhere = client`price_per_sqm > 0 AND city IS NOT NULL AND btrim(city) <> ''`;
  if (filters.city) yieldWhere = client`${yieldWhere} AND city = ${filters.city}`;

  const yieldRows = await client<Record<string, unknown>[]>`
    SELECT
      city,
      coalesce(round(avg(price_per_sqm) FILTER (WHERE status = 'sale')), 0)::int AS sale_sqm,
      coalesce(round(avg(price_per_sqm) FILTER (WHERE status = 'rent')), 0)::int AS rent_sqm
    FROM properties
    WHERE ${yieldWhere}
    GROUP BY city
    ORDER BY city
  `;

  let historyWhere = client`h.created_at >= now() - interval '90 days'
    AND h.old_price IS NOT NULL AND h.old_price > 0`;
  if (filters.city) historyWhere = client`${historyWhere} AND p.city = ${filters.city}`;

  const [changeRow] = await client<Record<string, unknown>[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE h.new_price > h.old_price)::int AS increases,
      COUNT(*) FILTER (WHERE h.new_price < h.old_price)::int AS decreases,
      coalesce(round(avg((h.new_price - h.old_price) / h.old_price * 100)::numeric, 1), 0)::float8 AS avg_pct,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (
        ORDER BY (h.new_price - h.old_price) / h.old_price * 100
      )::numeric, 1), 0)::float8 AS median_pct,
      coalesce(round(sum(abs(h.new_price - h.old_price))), 0)::bigint AS movement
    FROM property_price_history h
    JOIN properties p ON p.id = h.property_id
    WHERE ${historyWhere}
  `;

  const [freshRow] = await client<Record<string, unknown>[]>`
    SELECT
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 7)::int   AS last_7,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 30)::int  AS last_30,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) >= current_date - 90)::int  AS last_90,
      COUNT(*) FILTER (WHERE coalesce(listed_date, created_at::date) <  current_date - 90)::int  AS stale_90
    FROM properties
    WHERE ${where}
  `;

  const overviewTrend30 = sampledTrend(
    num(overviewRow?.recent_30_sqm), num(overviewRow?.prior_30_sqm),
    overviewRow?.n_recent_30, overviewRow?.n_prior_30,
  );
  const overviewTrend90 = sampledTrend(
    num(overviewRow?.recent_90_sqm), num(overviewRow?.prior_90_sqm),
    overviewRow?.n_recent_90, overviewRow?.n_prior_90,
  );

  const districts: DistrictPriceRow[] = districtRows.map(row => {
    const trend = sampledTrend(num(row.recent_30), num(row.prior_30), row.n_recent_30, row.n_prior_30);
    // Geostat RPPI tracks sale prices only — comparing a monthly rent against it is meaningless.
    const benchmark = filters.deal === 'sale' ? benchmarkForDistrict(String(row.district)) : null;
    const avgSqm = num(row.avg_sqm);
    return {
      key: String(row.key),
      city: String(row.city),
      district: String(row.district),
      count: num(row.count),
      forSale: num(row.for_sale),
      forRent: num(row.for_rent),
      avgPricePerSqm: avgSqm,
      medianPricePerSqm: num(row.median_sqm),
      avgPrice: num(row.avg_price),
      medianPrice: num(row.median_price),
      avgArea: num(row.avg_area),
      lat: row.lat != null ? num(row.lat) : null,
      lng: row.lng != null ? num(row.lng) : null,
      trend30d: trend.change,
      trendDirection: trendDir(trend.change),
      trendReliable: trend.reliable,
      benchmarkPricePerSqm: benchmark,
      vsBenchmark: benchmark ? pctChange(avgSqm, benchmark) : null,
    };
  });

  const movers = districts.filter(d => d.trendReliable && d.trend30d !== 0);
  const topGainers = movers.filter(d => d.trend30d > 0).sort((a, b) => b.trend30d - a.trend30d).slice(0, 5);
  const topLosers = movers.filter(d => d.trend30d < 0).sort((a, b) => a.trend30d - b.trend30d).slice(0, 5);

  const dealTotal = dealRows.reduce((sum, r) => sum + num(r.count), 0);
  const typeTotal = typeRows.reduce((sum, r) => sum + num(r.count), 0);

  /** Rent buckets sit in the tens of GEL, sale buckets in the thousands — label accordingly. */
  const asBucketLabel = (value: number, useThousands: boolean) =>
    useThousands ? `${Math.round(value / 100) / 10}k` : String(value);

  const histogram: HistogramBucket[] = histogramRows.map(row => {
    const from = num(row.min_v);
    const to = num(row.max_v);
    const useThousands = to >= 1000;
    return {
      from,
      to,
      label: from === to
        ? asBucketLabel(from, useThousands)
        : `${asBucketLabel(from, useThousands)}–${asBucketLabel(to, useThousands)}`,
      count: num(row.count),
    };
  });

  const ROOM_LABELS: Record<number, string> = {
    0: 'სტუდიო',
    1: '1 ოთახი',
    2: '2 ოთახი',
    3: '3 ოთახი',
    4: '4 ოთახი',
    5: '5+ ოთახი',
  };

  const roomsSplit: RoomsPriceRow[] = roomsRows.map(row => ({
    rooms: num(row.rooms),
    label: ROOM_LABELS[num(row.rooms)] ?? `${num(row.rooms)} ოთახი`,
    count: num(row.count),
    avgPricePerSqm: num(row.avg_sqm),
    medianPrice: num(row.median_price),
    avgArea: num(row.avg_area),
  }));

  const rentYield: RentYieldRow[] = yieldRows
    .map(row => {
      const sale = num(row.sale_sqm);
      const rent = num(row.rent_sqm);
      const grossYield = sale > 0 && rent > 0
        ? Math.round(((rent * 12) / sale) * 1000) / 10
        : 0;
      return {
        city: String(row.city),
        salePricePerSqm: sale,
        rentPricePerSqm: rent,
        grossYield,
        paybackYears: grossYield > 0 ? Math.round((100 / grossYield) * 10) / 10 : 0,
      };
    })
    .filter(row => row.grossYield > 0)
    .sort((a, b) => b.grossYield - a.grossYield);

  const DEAL_LABELS: Record<string, string> = {
    sale: 'იყიდება',
    rent: 'ქირავდება',
    other: 'სხვა',
  };

  return {
    generatedAt: new Date().toISOString(),
    filters,
    overview: {
      totalListings: num(overviewRow?.total),
      pricedListings: num(overviewRow?.priced),
      avgPricePerSqm: num(overviewRow?.avg_sqm),
      medianPricePerSqm: num(overviewRow?.median_sqm),
      avgPrice: num(overviewRow?.avg_price),
      medianPrice: num(overviewRow?.median_price),
      avgArea: num(overviewRow?.avg_area),
      trend30d: overviewTrend30.change,
      trend90d: overviewTrend90.change,
      trendDirection: trendDir(overviewTrend30.change),
      trendReliable: overviewTrend30.reliable,
      minTrendSample: MIN_TREND_SAMPLE,
      geostatIndexQoQ: GEOSTAT_BENCHMARK.indexChangeQoQ,
      geostatIndexYoY: GEOSTAT_BENCHMARK.indexChangeYoY,
      geostatQuarter: GEOSTAT_BENCHMARK.quarter,
    },
    cities: cityRows.map(row => {
      const trend = sampledTrend(num(row.recent_30), num(row.prior_30), row.n_recent_30, row.n_prior_30);
      return {
        city: String(row.city),
        count: num(row.count),
        avgPricePerSqm: num(row.avg_sqm),
        medianPricePerSqm: num(row.median_sqm),
        avgPrice: num(row.avg_price),
        trend30d: trend.change,
        trendDirection: trendDir(trend.change),
        trendReliable: trend.reliable,
      };
    }),
    districts,
    monthlyTrend: monthlyRows.map(row => ({
      month: String(row.month),
      count: num(row.count),
      avgPricePerSqm: num(row.avg_sqm),
      medianPricePerSqm: num(row.median_sqm),
      forSale: num(row.for_sale),
      forRent: num(row.for_rent),
    })),
    dealSplit: dealRows.map(row => ({
      deal: String(row.deal),
      label: DEAL_LABELS[String(row.deal)] ?? String(row.deal),
      count: num(row.count),
      avgPricePerSqm: num(row.avg_sqm),
      share: share(num(row.count), dealTotal),
    })),
    typeSplit: typeRows.map(row => ({
      type: String(row.type),
      count: num(row.count),
      avgPricePerSqm: num(row.avg_sqm),
      share: share(num(row.count), typeTotal),
    })),
    topGainers,
    topLosers,
    histogram,
    roomsSplit,
    rentYield,
    priceChanges: {
      windowDays: 90,
      total: num(changeRow?.total),
      increases: num(changeRow?.increases),
      decreases: num(changeRow?.decreases),
      avgChangePct: num(changeRow?.avg_pct),
      medianChangePct: num(changeRow?.median_pct),
      totalMovement: num(changeRow?.movement),
    },
    freshness: {
      last7: num(freshRow?.last_7),
      last30: num(freshRow?.last_30),
      last90: num(freshRow?.last_90),
      stale90: num(freshRow?.stale_90),
    },
    benchmarks: [...GEOSTAT_BENCHMARK.districts],
    sources: [...MARKET_DATA_SOURCES],
  };
}
