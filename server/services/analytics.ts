/**
 * Read models for the analytics section: what the inventory looks like broken down
 * by district and status, and how each broker did over a period.
 *
 * Same rules as the manager desk service — read-only, plain rows out, and the route
 * layer decides who is allowed to see them.
 */
import { inArray } from 'drizzle-orm';
import { client, db } from '../db.js';
import { users } from '../schema.js';
import { STAFF_ROLES } from '../permissions.js';

/** Live inventory: on the market and visible. */
const LIVE_STATES = ['new', 'current'];
/** Off the market for now — a parked rental or an expired term waiting on a call. */
const ATTENTION_STATES = ['old', 'new_r'];

/** `status` doubles as the deal type, and 'both' counts on either side. */
const SALE_STATUSES = ['sale', 'both'];
const RENT_STATUSES = ['rent', 'both', 'daily_rent'];

export type DealFilter = 'all' | 'sale' | 'rent';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/* ── District / status funnel ────────────────────────────────────────────── */

export interface DistrictInventoryRow {
  /** lower(trim(district)) — stable grouping key across spelling variants. */
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

export interface FunnelStage {
  id: 'submitted' | 'approved' | 'live' | 'engaged' | 'converted';
  count: number;
  /** Percentage of the stage before it, so drop-off is readable at a glance. */
  stepRate: number;
  /** Percentage of the very first stage. */
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

export interface InventoryFilters {
  city?: string;
  deal: DealFilter;
  /** Broker scope — only listings this user carries. */
  ownerUserId?: number | null;
}

/**
 * Age is measured from the day the listing went on the board. `listed_date` is set
 * on admin create; member submissions only have `created_at`, hence the coalesce.
 * Built as a query fragment so it can be nested into the aggregates below.
 */
const ageDays = () => client`(current_date - coalesce(listed_date, created_at::date))`;

/** Filters shared by every query in the report, as one composable fragment. */
function inventoryWhere(filters: InventoryFilters) {
  let where = client`district IS NOT NULL AND btrim(district) <> ''`;

  if (filters.city) where = client`${where} AND city = ${filters.city}`;
  if (filters.deal === 'sale') where = client`${where} AND status = ANY(${SALE_STATUSES})`;
  if (filters.deal === 'rent') where = client`${where} AND status = ANY(${RENT_STATUSES})`;
  if (filters.ownerUserId) {
    where = client`${where} AND coalesce(assigned_to_user_id, created_by_user_id) = ${filters.ownerUserId}`;
  }

  return where;
}

export async function inventoryReport(filters: InventoryFilters): Promise<InventoryReport> {
  const where = inventoryWhere(filters);

  /**
   * Grouped on the normalised district so "ვაკე" and " ვაკე " land in one row, with
   * the most common raw spelling kept for display.
   */
  const districtRows = await client<Record<string, unknown>[]>`
    SELECT
      lower(btrim(district))                                        AS key,
      coalesce(mode() WITHIN GROUP (ORDER BY district), '')          AS district,
      coalesce(mode() WITHIN GROUP (ORDER BY city), '')              AS city,
      COUNT(*)::int                                                  AS total,
      COUNT(*) FILTER (WHERE status = ANY(${SALE_STATUSES}))::int     AS for_sale,
      COUNT(*) FILTER (WHERE status = ANY(${RENT_STATUSES}))::int     AS for_rent,
      COUNT(*) FILTER (WHERE lifecycle_state = ANY(${LIVE_STATES}))::int      AS live,
      COUNT(*) FILTER (WHERE lifecycle_state = 'old')::int           AS parked,
      COUNT(*) FILTER (WHERE lifecycle_state = 'new_r')::int         AS needs_call,
      COUNT(*) FILTER (WHERE moderation_status = 'pending')::int     AS pending,
      COUNT(*) FILTER (WHERE assigned_to_user_id IS NULL)::int       AS unassigned,
      coalesce(round(avg(price) FILTER (WHERE price > 0)), 0)::int    AS avg_price,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price) FILTER (WHERE price > 0)), 0)::int AS median_price,
      coalesce(round(avg(price_per_sqm) FILTER (WHERE price_per_sqm > 0)), 0)::int AS avg_price_per_sqm,
      coalesce(round(avg(area) FILTER (WHERE area > 0)), 0)::int      AS avg_area,
      coalesce(sum(view_count), 0)::int                               AS views,
      coalesce(round(avg(${ageDays()})), 0)::int                      AS avg_age_days,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${ageDays()})), 0)::int AS median_age_days,
      COUNT(*) FILTER (WHERE ${ageDays()} <= 7)::int                  AS fresh,
      COUNT(*) FILTER (WHERE ${ageDays()} > 90)::int                  AS stale,
      coalesce(max(${ageDays()}), 0)::int                             AS oldest_days
    FROM properties
    WHERE ${where}
    GROUP BY lower(btrim(district))
    ORDER BY total DESC
  `;

  /**
   * The funnel is measured on the same filtered set. "Engaged" means the listing
   * actually got looked at; "converted" means it came off the market.
   */
  const [funnelRow] = await client<Record<string, unknown>[]>`
    SELECT
      COUNT(*)::int                                                        AS submitted,
      COUNT(*) FILTER (WHERE moderation_status = 'approved')::int           AS approved,
      COUNT(*) FILTER (WHERE moderation_status = 'approved'
                         AND lifecycle_state = ANY(${LIVE_STATES}))::int    AS live,
      COUNT(*) FILTER (WHERE moderation_status = 'approved'
                         AND lifecycle_state = ANY(${LIVE_STATES})
                         AND view_count > 0)::int                           AS engaged,
      COUNT(*) FILTER (WHERE lifecycle_state = ANY(${ATTENTION_STATES}))::int AS converted,
      COUNT(*) FILTER (WHERE status = ANY(${SALE_STATUSES}))::int           AS for_sale,
      COUNT(*) FILTER (WHERE status = ANY(${RENT_STATUSES}))::int           AS for_rent,
      COUNT(*) FILTER (WHERE lifecycle_state = 'old')::int                  AS parked,
      COUNT(*) FILTER (WHERE lifecycle_state = 'new_r')::int                AS needs_call,
      COUNT(*) FILTER (WHERE moderation_status = 'pending')::int            AS pending,
      COUNT(*) FILTER (WHERE assigned_to_user_id IS NULL)::int              AS unassigned,
      coalesce(sum(view_count), 0)::int                                     AS views,
      coalesce(round(avg(${ageDays()})), 0)::int                            AS avg_age_days,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${ageDays()})), 0)::int AS median_age_days
    FROM properties
    WHERE ${where}
  `;

  const ageRows = await client<Record<string, unknown>[]>`
    SELECT
      CASE
        WHEN ${ageDays()} <= 7   THEN '0-7'
        WHEN ${ageDays()} <= 30  THEN '8-30'
        WHEN ${ageDays()} <= 90  THEN '31-90'
        WHEN ${ageDays()} <= 180 THEN '91-180'
        ELSE '180+'
      END                                                          AS bucket,
      COUNT(*)::int                                                AS count,
      COUNT(*) FILTER (WHERE status = ANY(${SALE_STATUSES}))::int   AS for_sale,
      COUNT(*) FILTER (WHERE status = ANY(${RENT_STATUSES}))::int   AS for_rent
    FROM properties
    WHERE ${where}
    GROUP BY bucket
  `;

  const dealRows = await client<Record<string, unknown>[]>`
    SELECT coalesce(status, 'unknown') AS status, COUNT(*)::int AS count
    FROM properties
    WHERE ${where}
    GROUP BY coalesce(status, 'unknown')
    ORDER BY count DESC
  `;

  const typeRows = await client<Record<string, unknown>[]>`
    SELECT coalesce(type, 'unknown') AS type, COUNT(*)::int AS count
    FROM properties
    WHERE ${where}
    GROUP BY coalesce(type, 'unknown')
    ORDER BY count DESC
  `;

  const cityRows = await client<{ city: string }[]>`
    SELECT DISTINCT city
    FROM properties
    WHERE city IS NOT NULL AND btrim(city) <> ''
    ORDER BY city
  `;

  const submitted = num(funnelRow?.submitted);
  const approved = num(funnelRow?.approved);
  const live = num(funnelRow?.live);
  const engaged = num(funnelRow?.engaged);
  const converted = num(funnelRow?.converted);

  const funnel: FunnelStage[] = [
    { id: 'submitted', count: submitted, stepRate: 100, totalRate: 100 },
    { id: 'approved', count: approved, stepRate: share(approved, submitted), totalRate: share(approved, submitted) },
    { id: 'live', count: live, stepRate: share(live, approved), totalRate: share(live, submitted) },
    { id: 'engaged', count: engaged, stepRate: share(engaged, live), totalRate: share(engaged, submitted) },
    { id: 'converted', count: converted, stepRate: share(converted, live), totalRate: share(converted, submitted) },
  ];

  const BUCKETS: { id: string; from: number; to: number | null }[] = [
    { id: '0-7', from: 0, to: 7 },
    { id: '8-30', from: 8, to: 30 },
    { id: '31-90', from: 31, to: 90 },
    { id: '91-180', from: 91, to: 180 },
    { id: '180+', from: 181, to: null },
  ];

  const ageByBucket = new Map(ageRows.map(row => [String(row.bucket), row]));

  return {
    totals: {
      listings: submitted,
      forSale: num(funnelRow?.for_sale),
      forRent: num(funnelRow?.for_rent),
      live,
      parked: num(funnelRow?.parked),
      needsCall: num(funnelRow?.needs_call),
      pending: num(funnelRow?.pending),
      unassigned: num(funnelRow?.unassigned),
      views: num(funnelRow?.views),
      avgAgeDays: num(funnelRow?.avg_age_days),
      medianAgeDays: num(funnelRow?.median_age_days),
      districts: districtRows.length,
    },
    funnel,
    ageBuckets: BUCKETS.map(bucket => {
      const row = ageByBucket.get(bucket.id);
      return {
        ...bucket,
        count: num(row?.count),
        forSale: num(row?.for_sale),
        forRent: num(row?.for_rent),
      };
    }),
    dealSplit: dealRows.map(row => ({
      status: String(row.status),
      count: num(row.count),
      share: share(num(row.count), submitted),
    })),
    typeSplit: typeRows.map(row => ({
      type: String(row.type),
      count: num(row.count),
      share: share(num(row.count), submitted),
    })),
    districts: districtRows.map(row => ({
      key: String(row.key),
      city: String(row.city ?? ''),
      district: String(row.district ?? ''),
      total: num(row.total),
      forSale: num(row.for_sale),
      forRent: num(row.for_rent),
      live: num(row.live),
      parked: num(row.parked),
      needsCall: num(row.needs_call),
      pending: num(row.pending),
      unassigned: num(row.unassigned),
      avgPrice: num(row.avg_price),
      medianPrice: num(row.median_price),
      avgPricePerSqm: num(row.avg_price_per_sqm),
      avgArea: num(row.avg_area),
      views: num(row.views),
      avgAgeDays: num(row.avg_age_days),
      medianAgeDays: num(row.median_age_days),
      fresh: num(row.fresh),
      stale: num(row.stale),
      oldestDays: num(row.oldest_days),
    })),
    cities: cityRows.map(row => row.city),
  };
}

/* ── Broker leaderboard ─────────────────────────────────────────────────── */

export const LEADERBOARD_PERIODS = { week: 7, month: 30, quarter: 90 } as const;
export type LeaderboardPeriod = keyof typeof LEADERBOARD_PERIODS;

export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return typeof value === 'string' && value in LEADERBOARD_PERIODS;
}

/**
 * Weights behind the ranking. Kept here (and shown in the UI) so the leaderboard
 * order is arguable rather than magic: winning a new listing is worth more than a
 * view, and closing a deal is worth more than either.
 */
export const SCORE_WEIGHTS = {
  newListings: 10,
  attentionCleared: 6,
  deals: 20,
  views: 0.2,
} as const;

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
  /** Standing figures, not period figures. */
  liveListings: number;
  totalListings: number;
  needsAttention: number;
  openTasks: number;
  overdueTasks: number;
  totalViews: number;
  lastActivityAt: Date | null;
  /** Same metrics over the immediately preceding window. */
  previous: LeaderboardMetrics;
  rank: number;
}

export interface LeaderboardReport {
  period: LeaderboardPeriod;
  days: number;
  since: string;
  weights: typeof SCORE_WEIGHTS;
  rows: LeaderboardRow[];
  totals: LeaderboardMetrics & { previous: LeaderboardMetrics };
}

function scoreOf(metrics: Omit<LeaderboardMetrics, 'score'>): number {
  const raw =
    metrics.newListings * SCORE_WEIGHTS.newListings +
    metrics.attentionCleared * SCORE_WEIGHTS.attentionCleared +
    metrics.deals * SCORE_WEIGHTS.deals +
    metrics.views * SCORE_WEIGHTS.views;
  return Math.round(raw);
}

/**
 * Period metrics per staff member. The window is given as day offsets from now and
 * resolved in SQL, so the current and the preceding window share one query and the
 * comparison happens in the database's own clock rather than the server's.
 */
async function periodMetrics(
  fromDaysAgo: number,
  toDaysAgo: number,
): Promise<Map<number, Omit<LeaderboardMetrics, 'score'>>> {
  const from = () => client`(now() - make_interval(days => ${fromDaysAgo}))`;
  const to = () => client`(now() - make_interval(days => ${toDaysAgo}))`;

  const rows = await client<Record<string, unknown>[]>`
    WITH owned AS (
      SELECT id,
             coalesce(assigned_to_user_id, created_by_user_id) AS owner_id,
             created_at,
             lifecycle_state,
             lifecycle_updated_at
      FROM properties
      WHERE coalesce(assigned_to_user_id, created_by_user_id) IS NOT NULL
    ),
    listing_stats AS (
      SELECT owner_id,
             COUNT(*) FILTER (WHERE created_at >= ${from()} AND created_at < ${to()})::int AS new_listings,
             /*
              * A revival is a listing that already existed when the window opened and
              * came back to live inside it — creating a listing is counted separately.
              */
             COUNT(*) FILTER (
               WHERE lifecycle_updated_at >= ${from()}
                 AND lifecycle_updated_at < ${to()}
                 AND created_at < ${from()}
                 AND lifecycle_state = ANY(${LIVE_STATES})
             )::int AS revived,
             COUNT(*) FILTER (
               WHERE lifecycle_updated_at >= ${from()}
                 AND lifecycle_updated_at < ${to()}
                 AND lifecycle_state = 'old'
             )::int AS deals
      FROM owned
      GROUP BY owner_id
    ),
    view_stats AS (
      SELECT o.owner_id, COUNT(*)::int AS views
      FROM property_views v
      JOIN owned o ON o.id = v.property_id
      WHERE v.viewed_at >= ${from()} AND v.viewed_at < ${to()}
      GROUP BY o.owner_id
    ),
    task_stats AS (
      SELECT completed_by_user_id AS owner_id, COUNT(*)::int AS tasks_cleared
      FROM listing_tasks
      WHERE status = 'done'
        AND completed_at >= ${from()} AND completed_at < ${to()}
        AND completed_by_user_id IS NOT NULL
      GROUP BY completed_by_user_id
    ),
    call_stats AS (
      SELECT actor_user_id AS owner_id, COUNT(*)::int AS calls
      FROM listing_call_logs
      WHERE created_at >= ${from()} AND created_at < ${to()}
        AND actor_user_id IS NOT NULL
      GROUP BY actor_user_id
    )
    SELECT
      owner_id,
      coalesce(new_listings, 0)  AS new_listings,
      coalesce(revived, 0)       AS revived,
      coalesce(deals, 0)         AS deals,
      coalesce(views, 0)         AS views,
      coalesce(tasks_cleared, 0) AS tasks_cleared,
      coalesce(calls, 0)         AS calls
    FROM (
      SELECT owner_id FROM listing_stats
      UNION SELECT owner_id FROM view_stats
      UNION SELECT owner_id FROM task_stats
      UNION SELECT owner_id FROM call_stats
    ) ids
    LEFT JOIN listing_stats USING (owner_id)
    LEFT JOIN view_stats    USING (owner_id)
    LEFT JOIN task_stats    USING (owner_id)
    LEFT JOIN call_stats    USING (owner_id)
  `;

  const map = new Map<number, Omit<LeaderboardMetrics, 'score'>>();
  for (const row of rows) {
    const id = num(row.owner_id);
    if (!id) continue;
    const tasksCleared = num(row.tasks_cleared);
    const revived = num(row.revived);
    map.set(id, {
      views: num(row.views),
      newListings: num(row.new_listings),
      tasksCleared,
      revived,
      attentionCleared: tasksCleared + revived,
      calls: num(row.calls),
      deals: num(row.deals),
    });
  }
  return map;
}

const EMPTY_METRICS: Omit<LeaderboardMetrics, 'score'> = {
  views: 0,
  newListings: 0,
  tasksCleared: 0,
  revived: 0,
  attentionCleared: 0,
  calls: 0,
  deals: 0,
};

function withScore(metrics: Omit<LeaderboardMetrics, 'score'>): LeaderboardMetrics {
  return { ...metrics, score: scoreOf(metrics) };
}

export async function leaderboardReport(
  period: LeaderboardPeriod,
  onlyUserId?: number | null,
): Promise<LeaderboardReport> {
  const days = LEADERBOARD_PERIODS[period];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [staff, current, previous, standing] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
      })
      .from(users)
      .where(inArray(users.role, STAFF_ROLES))
      .orderBy(users.name),
    periodMetrics(days, 0),
    periodMetrics(days * 2, days),
    standingMetrics(),
  ]);

  const visible = onlyUserId ? staff.filter(row => row.userId === onlyUserId) : staff;

  const rows: LeaderboardRow[] = visible
    .map(person => {
      const metrics = withScore(current.get(person.userId) ?? EMPTY_METRICS);
      const stand = standing.get(person.userId);
      return {
        ...person,
        ...metrics,
        liveListings: stand?.liveListings ?? 0,
        totalListings: stand?.totalListings ?? 0,
        needsAttention: stand?.needsAttention ?? 0,
        openTasks: stand?.openTasks ?? 0,
        overdueTasks: stand?.overdueTasks ?? 0,
        totalViews: stand?.totalViews ?? 0,
        lastActivityAt: stand?.lastActivityAt ?? null,
        previous: withScore(previous.get(person.userId) ?? EMPTY_METRICS),
        rank: 0,
      };
    })
    // Score first, then live inventory, so a quiet week does not shuffle everyone.
    .sort((a, b) => b.score - a.score || b.liveListings - a.liveListings)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const sum = (pick: (row: LeaderboardRow) => number): number =>
    rows.reduce((acc, row) => acc + pick(row), 0);

  const totalsBase = {
    views: sum(row => row.views),
    newListings: sum(row => row.newListings),
    tasksCleared: sum(row => row.tasksCleared),
    revived: sum(row => row.revived),
    attentionCleared: sum(row => row.attentionCleared),
    calls: sum(row => row.calls),
    deals: sum(row => row.deals),
  };
  const previousBase = {
    views: sum(row => row.previous.views),
    newListings: sum(row => row.previous.newListings),
    tasksCleared: sum(row => row.previous.tasksCleared),
    revived: sum(row => row.previous.revived),
    attentionCleared: sum(row => row.previous.attentionCleared),
    calls: sum(row => row.previous.calls),
    deals: sum(row => row.previous.deals),
  };

  return {
    period,
    days,
    since: since.toISOString(),
    weights: SCORE_WEIGHTS,
    rows,
    totals: { ...withScore(totalsBase), previous: withScore(previousBase) },
  };
}

interface StandingRow {
  liveListings: number;
  totalListings: number;
  needsAttention: number;
  openTasks: number;
  overdueTasks: number;
  totalViews: number;
  lastActivityAt: Date | null;
}

/** Where each broker stands right now, independent of the selected period. */
async function standingMetrics(): Promise<Map<number, StandingRow>> {
  const rows = await client<Record<string, unknown>[]>`
    WITH owned AS (
      SELECT coalesce(assigned_to_user_id, created_by_user_id) AS owner_id,
             lifecycle_state,
             view_count,
             greatest(coalesce(updated_at, created_at), coalesce(last_call_at, created_at)) AS touched_at
      FROM properties
      WHERE coalesce(assigned_to_user_id, created_by_user_id) IS NOT NULL
    ),
    listing_stats AS (
      SELECT owner_id,
             COUNT(*)::int AS total_listings,
             COUNT(*) FILTER (WHERE lifecycle_state = ANY(${LIVE_STATES}))::int      AS live_listings,
             COUNT(*) FILTER (WHERE lifecycle_state = ANY(${ATTENTION_STATES}))::int AS needs_attention,
             coalesce(sum(view_count), 0)::int AS total_views,
             max(touched_at) AS last_touched_at
      FROM owned
      GROUP BY owner_id
    ),
    task_stats AS (
      SELECT assigned_to_user_id AS owner_id,
             COUNT(*) FILTER (WHERE status = 'open')::int AS open_tasks,
             COUNT(*) FILTER (WHERE status = 'open' AND due_at IS NOT NULL AND due_at < current_date)::int AS overdue_tasks
      FROM listing_tasks
      WHERE assigned_to_user_id IS NOT NULL
      GROUP BY assigned_to_user_id
    ),
    activity_stats AS (
      SELECT actor_user_id AS owner_id, max(created_at) AS last_action_at
      FROM activity_log
      WHERE actor_user_id IS NOT NULL
      GROUP BY actor_user_id
    )
    SELECT
      owner_id,
      coalesce(total_listings, 0)   AS total_listings,
      coalesce(live_listings, 0)    AS live_listings,
      coalesce(needs_attention, 0)  AS needs_attention,
      coalesce(total_views, 0)      AS total_views,
      coalesce(open_tasks, 0)       AS open_tasks,
      coalesce(overdue_tasks, 0)    AS overdue_tasks,
      greatest(last_touched_at, last_action_at) AS last_activity_at
    FROM (
      SELECT owner_id FROM listing_stats
      UNION SELECT owner_id FROM task_stats
      UNION SELECT owner_id FROM activity_stats
    ) ids
    LEFT JOIN listing_stats  USING (owner_id)
    LEFT JOIN task_stats     USING (owner_id)
    LEFT JOIN activity_stats USING (owner_id)
  `;

  const map = new Map<number, StandingRow>();
  for (const row of rows) {
    const id = num(row.owner_id);
    if (!id) continue;
    map.set(id, {
      liveListings: num(row.live_listings),
      totalListings: num(row.total_listings),
      needsAttention: num(row.needs_attention),
      openTasks: num(row.open_tasks),
      overdueTasks: num(row.overdue_tasks),
      totalViews: num(row.total_views),
      lastActivityAt: (row.last_activity_at as Date | null) ?? null,
    });
  }
  return map;
}
