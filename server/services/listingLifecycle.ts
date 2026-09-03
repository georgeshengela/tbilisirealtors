import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { listingTasks, properties, propertyPriceHistory } from '../schema.js';

/**
 * new     — just added, not worked yet
 * current — live and actively offered (also: sold-while-rented via rented_owner)
 * old     — parked with a reason: sold, withdrawn, paused, or we rented it
 * new_r   — pause/rental term ran out: call the owner and re-check
 */
export const LIFECYCLE_STATES = ['new', 'current', 'old', 'new_r'] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export function isLifecycleState(value: unknown): value is LifecycleState {
  return typeof value === 'string' && (LIFECYCLE_STATES as readonly string[]).includes(value);
}

export const PRICE_SOURCES = ['admin', 'import', 'system'] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function asDateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const stamp = value.slice(0, 10);
  return DATE_ONLY.test(stamp) ? stamp : null;
}

/** Term end date, clamped so that e.g. Jan 31 + 1 month lands on Feb 28. */
export function addMonths(startedAt: string, months: number): string {
  const date = new Date(`${startedAt}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

interface LifecycleInput {
  lifecycleState?: unknown;
  rentTermMonths?: unknown;
  rentStartedAt?: unknown;
  rentExpiresAt?: unknown;
  lifecycleNote?: unknown;
  lifecycleOutcome?: unknown;
  lifecycleDealPrice?: unknown;
}

export interface LifecycleFields {
  lifecycleState: LifecycleState;
  rentTermMonths: number | null;
  rentStartedAt: string | null;
  rentExpiresAt: string | null;
  lifecycleNote: string | null;
  lifecycleUpdatedAt: Date;
  lifecycleOutcome: string | null;
  lifecycleDealPrice: string | null;
}

export const LIFECYCLE_OUTCOMES = [
  'paused',
  'sold_owner',
  'sold',
  'sold_us',
  'withdrawn',
  'rented_owner',
  'rented_us',
] as const;
export type LifecycleOutcome = (typeof LIFECYCLE_OUTCOMES)[number];

export function isLifecycleOutcome(value: unknown): value is LifecycleOutcome {
  return typeof value === 'string' && (LIFECYCLE_OUTCOMES as readonly string[]).includes(value);
}

const TERM_OUTCOMES: LifecycleOutcome[] = ['paused', 'rented_us'];

export const REFRESH_TASK_TITLE = 'განახლება — დასარეკი';
const REFRESH_TASK_NOTE =
  'განცხადება ჩაძველდა. დაურეკე მესაკუთრეს და განაახლე მაქსიმუმ 2 დღეში (შაბათს ჩაძველებისას — ორშაბათის ჩათვლით).';

export function addDays(startedAt: string, days: number): string {
  const date = new Date(`${startedAt}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Two calendar days, bumped to Monday when the deadline lands on a weekend. */
export function callDeadlineFrom(agedOn: string): string {
  let due = addDays(agedOn, 2);
  const weekday = new Date(`${due}T00:00:00Z`).getUTCDay();
  if (weekday === 6) due = addDays(due, 2);
  if (weekday === 0) due = addDays(due, 1);
  return due;
}

export function isTermOutcome(value: unknown): boolean {
  return typeof value === 'string' && TERM_OUTCOMES.includes(value as LifecycleOutcome);
}

function dealPriceOf(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(n) : null;
}

/**
 * Turns whatever the admin form sent into a consistent lifecycle record.
 *
 * "old" always carries a reason. Owner-rented-while-for-sale (`rented_owner`)
 * stays live as `current` so it does not disappear into the archive or the
 * public listing feed.
 */
export function buildLifecycleFields(
  input: LifecycleInput,
  current?: {
    lifecycleState?: string | null;
    rentStartedAt?: string | null;
    rentExpiresAt?: string | null;
    rentTermMonths?: number | null;
    lifecycleOutcome?: string | null;
    lifecycleDealPrice?: string | number | null;
  },
): LifecycleFields {
  const requested = isLifecycleState(input.lifecycleState)
    ? input.lifecycleState
    : (isLifecycleState(current?.lifecycleState) ? current!.lifecycleState : 'new');

  const outcomeExplicit = Object.prototype.hasOwnProperty.call(input, 'lifecycleOutcome');
  const parsedOutcome = isLifecycleOutcome(input.lifecycleOutcome) ? input.lifecycleOutcome : null;
  const inherited = isLifecycleOutcome(current?.lifecycleOutcome) ? current.lifecycleOutcome : null;
  const outcome = outcomeExplicit ? parsedOutcome : (requested === 'new' ? null : inherited);

  const note = typeof input.lifecycleNote === 'string' ? input.lifecycleNote.trim().slice(0, 500) : null;
  const stamp = new Date();

  if (outcome === 'rented_owner') {
    return {
      lifecycleState: requested === 'new' ? 'new' : 'current',
      rentTermMonths: null,
      rentStartedAt: null,
      rentExpiresAt: null,
      lifecycleNote: note,
      lifecycleUpdatedAt: stamp,
      lifecycleOutcome: 'rented_owner',
      lifecycleDealPrice: null,
    };
  }

  if (requested !== 'old' && requested !== 'new_r') {
    return {
      lifecycleState: requested,
      rentTermMonths: null,
      rentStartedAt: null,
      rentExpiresAt: null,
      lifecycleNote: note,
      lifecycleUpdatedAt: stamp,
      lifecycleOutcome: null,
      lifecycleDealPrice: null,
    };
  }

  const needsTerm = !outcome || TERM_OUTCOMES.includes(outcome);
  const price = outcome === 'rented_us'
    ? (dealPriceOf(input.lifecycleDealPrice) ?? dealPriceOf(current?.lifecycleDealPrice))
    : null;

  if (!needsTerm) {
    return {
      lifecycleState: 'old',
      rentTermMonths: null,
      rentStartedAt: null,
      rentExpiresAt: null,
      lifecycleNote: note,
      lifecycleUpdatedAt: stamp,
      lifecycleOutcome: outcome,
      lifecycleDealPrice: null,
    };
  }

  if (outcome === 'paused') {
    const expiresAt = asDateOnly(input.rentExpiresAt) ?? asDateOnly(current?.rentExpiresAt);
    return {
      lifecycleState: expiresAt && expiresAt <= today() ? 'new_r' : 'old',
      rentTermMonths: null,
      rentStartedAt: null,
      rentExpiresAt: expiresAt,
      lifecycleNote: note,
      lifecycleUpdatedAt: stamp,
      lifecycleOutcome: 'paused',
      lifecycleDealPrice: null,
    };
  }

  const months = Number(input.rentTermMonths ?? current?.rentTermMonths);
  const termMonths = Number.isFinite(months) && months > 0 ? Math.round(months) : null;
  const startedAt = asDateOnly(input.rentStartedAt) ?? asDateOnly(current?.rentStartedAt) ?? today();
  const explicitEnd = asDateOnly(input.rentExpiresAt);
  const expiresAt = explicitEnd ?? (termMonths ? addMonths(startedAt, termMonths) : null);

  return {
    lifecycleState: expiresAt && expiresAt <= today() ? 'new_r' : requested === 'new_r' ? 'new_r' : 'old',
    rentTermMonths: termMonths,
    rentStartedAt: startedAt,
    rentExpiresAt: expiresAt,
    lifecycleNote: note,
    lifecycleUpdatedAt: stamp,
    lifecycleOutcome: outcome,
    lifecycleDealPrice: price,
  };
}

interface PriceChange {
  propertyId: string;
  oldPrice: unknown;
  newPrice: unknown;
  changedBy?: string | null;
  source?: PriceSource;
}

/** Logs a price edit, skipping no-op saves so the history stays readable. */
export async function recordPriceChange({
  propertyId,
  oldPrice,
  newPrice,
  changedBy,
  source = 'admin',
}: PriceChange): Promise<boolean> {
  const next = Number(newPrice);
  if (!Number.isFinite(next)) return false;

  const previous = oldPrice == null || oldPrice === '' ? null : Number(oldPrice);
  if (previous !== null && Math.abs(previous - next) < 0.005) return false;

  await db.insert(propertyPriceHistory).values({
    propertyId,
    oldPrice: previous === null ? null : String(previous),
    newPrice: String(next),
    changedBy: changedBy?.slice(0, 255) ?? null,
    source,
  });

  return true;
}

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = 0;

export async function completeRefreshTasks(propertyId: string): Promise<void> {
  await db
    .update(listingTasks)
    .set({
      status: 'done',
      completedAt: new Date(),
      completedByName: 'სისტემა',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(listingTasks.propertyId, propertyId),
        eq(listingTasks.status, 'open'),
        eq(listingTasks.title, REFRESH_TASK_TITLE),
      ),
    );
}

async function ensureRefreshTask(row: {
  id: string;
  assignedToUserId: number | null;
  createdByUserId: number | null;
}, dueAt: string): Promise<void> {
  const assignee = row.assignedToUserId ?? row.createdByUserId;
  const [open] = await db
    .select({ id: listingTasks.id })
    .from(listingTasks)
    .where(
      and(
        eq(listingTasks.propertyId, row.id),
        eq(listingTasks.status, 'open'),
        eq(listingTasks.title, REFRESH_TASK_TITLE),
      ),
    )
    .limit(1);
  if (open) return;

  await db.insert(listingTasks).values({
    propertyId: row.id,
    title: REFRESH_TASK_TITLE,
    kind: 'call',
    status: 'open',
    priority: 'high',
    assignedToUserId: assignee,
    dueAt,
    note: REFRESH_TASK_NOTE,
    createdByName: 'სისტემა',
  });
}

/**
 * Live sale/rent listings age into "new R" so brokers must call and refresh them.
 * Rent: 1 month. Sale / pledge: 2 months. Brokers get 2 days (weekend → Monday).
 */
async function markStaleListings(): Promise<number> {
  const stale = await db
    .select({
      id: properties.id,
      assignedToUserId: properties.assignedToUserId,
      createdByUserId: properties.createdByUserId,
    })
    .from(properties)
    .where(
      and(
        inArray(properties.lifecycleState, ['new', 'current']),
        or(
          sql`${properties.lifecycleOutcome} is null`,
          eq(properties.lifecycleOutcome, 'rented_owner'),
        ),
        or(
          and(
            inArray(properties.status, ['sale', 'pledge']),
            sql`COALESCE(${properties.refreshedAt}, ${properties.listedDate}, ${properties.createdAt}::date)
                <= CURRENT_DATE - INTERVAL '2 months'`,
          ),
          and(
            sql`COALESCE(${properties.status}, 'rent') NOT IN ('sale', 'pledge')`,
            sql`COALESCE(${properties.refreshedAt}, ${properties.listedDate}, ${properties.createdAt}::date)
                <= CURRENT_DATE - INTERVAL '1 month'`,
          ),
        ),
      ),
    )
    .limit(400);

  if (stale.length === 0) return 0;

  const dueAt = callDeadlineFrom(today());
  const stamp = new Date();
  await db
    .update(properties)
    .set({
      lifecycleState: 'new_r',
      lifecycleUpdatedAt: stamp,
      nextFollowUpAt: dueAt,
    })
    .where(inArray(properties.id, stale.map(row => row.id)));

  for (const row of stale) {
    try {
      await ensureRefreshTask(row, dueAt);
    } catch (err) {
      console.error(`Refresh task failed for ${row.id}:`, err);
    }
  }

  console.log(`↻ ${stale.length} stale listing(s) → "new R" (call by ${dueAt})`);
  return stale.length;
}

/**
 * Parked rentals whose term ran out, plus live listings that aged past the
 * refresh window, become call-back reminders. Throttled so it can run on
 * every listing request.
 */
export async function refreshExpiredRentals(force = false): Promise<number> {
  if (!force && Date.now() - lastSweep < SWEEP_INTERVAL_MS) return 0;
  lastSweep = Date.now();

  try {
    const expired = await db
      .update(properties)
      .set({ lifecycleState: 'new_r', lifecycleUpdatedAt: new Date() })
      .where(
        and(
          eq(properties.lifecycleState, 'old'),
          isNotNull(properties.rentExpiresAt),
          sql`${properties.rentExpiresAt} <= CURRENT_DATE`,
          sql`(${properties.lifecycleOutcome} is null
               or ${properties.lifecycleOutcome} in ('paused', 'rented_us'))`,
        ),
      )
      .returning({ id: properties.id });

    if (expired.length > 0) {
      console.log(`↻ ${expired.length} paused/rented listing(s) → marked "new R"`);
    }

    const stale = await markStaleListings();
    return expired.length + stale;
  } catch (err) {
    console.error('Lifecycle sweep failed:', err);
    return 0;
  }
}
