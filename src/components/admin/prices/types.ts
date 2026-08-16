/** Sale prices and monthly rents are never pooled — a report is always one or the other. */
export type DealFilter = 'sale' | 'rent';
export type TrendDirection = 'up' | 'down' | 'flat';

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
  grossYield: number;
  paybackYears: number;
}

export interface PriceChangeStats {
  windowDays: number;
  total: number;
  increases: number;
  decreases: number;
  avgChangePct: number;
  medianChangePct: number;
  totalMovement: number;
}

export interface FreshnessStats {
  last7: number;
  last30: number;
  last90: number;
  stale90: number;
}

export type MapMode = 'price' | 'trend' | 'volume';

export interface MarketPricesReport {
  generatedAt: string;
  filters: { city?: string; deal: DealFilter };
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
  benchmarks: { key: string; geostatEn: string; pricePerSqm: number }[];
  sources: { id: string; label: string; url: string; note: string }[];
}

/* ── External benchmark (MyGE.ge) ─────────────────────────────────────────── */

export interface ExternalCityRow {
  slug: string;
  city: string;
  totalListings: number;
  saleListings: number;
  rentListings: number;
  sources: string[];
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
  sourceUpdated: string | null;
}

export interface ExternalHistoryPoint {
  slug: string;
  city: string;
  first: { date: string; saleMedianPerSqm: number };
  last: { date: string; saleMedianPerSqm: number };
  changePct: number;
  days: number;
}

export interface ExternalMarketReport {
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  cached: boolean;
  /** GEL per USD — MyGE publishes in dollars. */
  usdRate: number;
  currency: 'USD';
  totals: { listings: number; sale: number; rent: number; cities: number };
  cities: ExternalCityRow[];
  history: ExternalHistoryPoint[];
  error?: string;
}

export interface PricesBoardProps {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}
