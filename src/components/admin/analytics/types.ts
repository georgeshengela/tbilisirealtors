/** Shapes returned by /api/admin/analytics/*. Mirrors server/services/analytics.ts. */

export interface AnalyticsBoardProps {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

/* ── Inventory funnel ────────────────────────────────────────────────────── */

export type DealFilter = 'all' | 'sale' | 'rent';

export interface DistrictInventoryRow {
  key: string;
  city: string;
  district: string;
  total: number;
  forSale: number;
  forRent: number;
  live: number;
  parked: number;
  needsCall: number;
  pending: number;
  unassigned: number;
  avgPrice: number;
  medianPrice: number;
  avgPricePerSqm: number;
  avgArea: number;
  views: number;
  avgAgeDays: number;
  medianAgeDays: number;
  fresh: number;
  stale: number;
  oldestDays: number;
}

export type FunnelStageId = 'submitted' | 'approved' | 'live' | 'engaged' | 'converted';

export interface FunnelStage {
  id: FunnelStageId;
  count: number;
  stepRate: number;
  totalRate: number;
}

export interface AgeBucket {
  id: string;
  from: number;
  to: number | null;
  count: number;
  forSale: number;
  forRent: number;
}

export interface InventoryReport {
  totals: {
    listings: number;
    forSale: number;
    forRent: number;
    live: number;
    parked: number;
    needsCall: number;
    pending: number;
    unassigned: number;
    views: number;
    avgAgeDays: number;
    medianAgeDays: number;
    districts: number;
  };
  funnel: FunnelStage[];
  ageBuckets: AgeBucket[];
  dealSplit: { status: string; count: number; share: number }[];
  typeSplit: { type: string; count: number; share: number }[];
  districts: DistrictInventoryRow[];
  cities: string[];
}

/* ── Leaderboard ─────────────────────────────────────────────────────────── */

export type LeaderboardPeriod = 'week' | 'month' | 'quarter';

export interface LeaderboardMetrics {
  views: number;
  newListings: number;
  tasksCleared: number;
  revived: number;
  attentionCleared: number;
  calls: number;
  deals: number;
  score: number;
}

export interface LeaderboardRow extends LeaderboardMetrics {
  userId: number;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  liveListings: number;
  totalListings: number;
  needsAttention: number;
  openTasks: number;
  overdueTasks: number;
  totalViews: number;
  lastActivityAt: string | null;
  previous: LeaderboardMetrics;
  rank: number;
}

export interface LeaderboardReport {
  period: LeaderboardPeriod;
  days: number;
  since: string;
  weights: {
    newListings: number;
    attentionCleared: number;
    deals: number;
    views: number;
  };
  rows: LeaderboardRow[];
  totals: LeaderboardMetrics & { previous: LeaderboardMetrics };
}

/* ── Import quality ──────────────────────────────────────────────────────── */

export interface ImportSourceStats {
  source: string;
  attempts: number;
  ok: number;
  partial: number;
  failed: number;
  saved: number;
  avgFieldCount: number;
  avgDurationMs: number;
  lastAttemptAt: string | null;
}

export interface ImportFailureGroup {
  code: string;
  source: string;
  count: number;
  lastSeenAt: string | null;
  sampleMessage: string;
  sampleUrl: string | null;
}

export interface ImportGapRow {
  field: string;
  count: number;
  share: number;
}

export interface ImportAttemptRow {
  id: number;
  source: string;
  sourceUrl: string | null;
  sourceId: string | null;
  status: string;
  missingFields: string[];
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
  fieldCount: number;
  photoCount: number;
  durationMs: number;
  actorName: string | null;
  propertyId: string | null;
  createdAt: string | null;
}

export interface ImportQualityReport {
  totals: {
    attempts: number;
    ok: number;
    partial: number;
    failed: number;
    saved: number;
    parsed: number;
    successRate: number;
    cleanRate: number;
    conversionRate: number;
  };
  sources: ImportSourceStats[];
  failures: ImportFailureGroup[];
  gaps: ImportGapRow[];
  warnings: ImportGapRow[];
  daily: { day: string; ok: number; partial: number; failed: number }[];
  recent: ImportAttemptRow[];
  canRetry: boolean;
}
