import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { properties, propertyPriceHistory } from '../schema.js';

/**
 * new    — just added, not worked yet
 * current— live and actively offered
 * old    — rented/sold out for a fixed term, parked
 * new_r  — a parked rental whose term ran out: call the owner and re-check
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
}

export interface LifecycleFields {
  lifecycleState: LifecycleState;
  rentTermMonths: number | null;
  rentStartedAt: string | null;
  rentExpiresAt: string | null;
  lifecycleNote: string | null;
  lifecycleUpdatedAt: Date;
}

/**
 * Turns whatever the admin form sent into a consistent lifecycle record: a parked
 * rental keeps its term dates, anything else drops them.
 */
export function buildLifecycleFields(
  input: LifecycleInput,
  current?: { lifecycleState?: string | null; rentStartedAt?: string | null; rentTermMonths?: number | null },
): LifecycleFields {
  const state = isLifecycleState(input.lifecycleState)
    ? input.lifecycleState
    : (isLifecycleState(current?.lifecycleState) ? current!.lifecycleState : 'new');

  const note = typeof input.lifecycleNote === 'string' ? input.lifecycleNote.trim().slice(0, 500) : null;

  if (state !== 'old' && state !== 'new_r') {
    return {
      lifecycleState: state,
      rentTermMonths: null,
      rentStartedAt: null,
      rentExpiresAt: null,
      lifecycleNote: note,
      lifecycleUpdatedAt: new Date(),
    };
  }

  const months = Number(input.rentTermMonths ?? current?.rentTermMonths);
  const termMonths = Number.isFinite(months) && months > 0 ? Math.round(months) : null;
  const startedAt = asDateOnly(input.rentStartedAt) ?? asDateOnly(current?.rentStartedAt) ?? today();
  const explicitEnd = asDateOnly(input.rentExpiresAt);
  const expiresAt = explicitEnd ?? (termMonths ? addMonths(startedAt, termMonths) : null);

  return {
    // A term that is already up is a call-back right away, no waiting for the sweep.
    lifecycleState: expiresAt && expiresAt <= today() ? 'new_r' : state,
    rentTermMonths: termMonths,
    rentStartedAt: startedAt,
    rentExpiresAt: expiresAt,
    lifecycleNote: note,
    lifecycleUpdatedAt: new Date(),
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

/**
 * A parked rental becomes "new R" the day its term runs out, which is what makes
 * it resurface in the admin list as a call-back reminder. Throttled so it can be
 * called on every listing request.
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
        ),
      )
      .returning({ id: properties.id });

    if (expired.length > 0) {
      console.log(`↻ ${expired.length} rental(s) freed up → marked "new R"`);
    }
    return expired.length;
  } catch (err) {
    console.error('Lifecycle sweep failed:', err);
    return 0;
  }
}
