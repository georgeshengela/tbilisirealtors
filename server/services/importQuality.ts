/**
 * Everything that touches `listing_imports`: writing an attempt down as it happens
 * and reading it back as the import quality report.
 *
 * The report only exists because attempts are recorded here. A failed scrape saves
 * no listing, so without this table a broken source is invisible until somebody
 * complains that imports "stopped working".
 */
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { client, db } from '../db.js';
import { listingImports } from '../schema.js';
import type {
  ImportErrorCode,
  ImportMissingField,
  ImportQuality,
  ImportWarning,
  ImportedListingData,
} from './listingImport.js';

export interface AttemptActor {
  id?: number | null;
  name?: string | null;
}

interface RecordArgs {
  url: string;
  actor: AttemptActor;
  durationMs: number;
  retryOfId?: number | null;
}

/** Writes a successful (or partial) parse down and returns the row id. */
export async function recordImportSuccess(
  args: RecordArgs & {
    data: ImportedListingData;
    quality: ImportQuality;
    missingFields: ImportMissingField[];
    warnings: ImportWarning[];
  },
): Promise<number> {
  const [row] = await db
    .insert(listingImports)
    .values({
      source: args.data.source,
      sourceUrl: args.url.slice(0, 600),
      sourceId: args.data.sourceId ? args.data.sourceId.slice(0, 100) : null,
      status: args.quality,
      missingFields: args.missingFields,
      warnings: args.warnings,
      fieldCount: args.data.meta.importedFields ?? 0,
      photoCount: args.data.images.length,
      durationMs: args.durationMs,
      retryOfId: args.retryOfId ?? null,
      actorUserId: args.actor.id ?? null,
      actorName: args.actor.name ?? null,
    })
    .returning({ id: listingImports.id });

  return row.id;
}

/** Writes a failure down so the report can group it by cause. */
export async function recordImportFailure(
  args: RecordArgs & {
    source: string;
    code: ImportErrorCode;
    message: string;
  },
): Promise<number> {
  const [row] = await db
    .insert(listingImports)
    .values({
      source: args.source.slice(0, 30),
      sourceUrl: args.url.slice(0, 600),
      status: 'failed',
      errorCode: args.code,
      errorMessage: args.message.slice(0, 300),
      durationMs: args.durationMs,
      retryOfId: args.retryOfId ?? null,
      actorUserId: args.actor.id ?? null,
      actorName: args.actor.name ?? null,
    })
    .returning({ id: listingImports.id });

  return row.id;
}

/**
 * Links the newest unlinked attempt for a URL to the listing it became, which is
 * what turns "we tried" into a conversion rate. Called on listing create, so it
 * must never throw the save away — a missing link is only a reporting gap.
 */
export async function linkImportToListing(sourceUrl: string, propertyId: string): Promise<void> {
  if (!sourceUrl.trim()) return;
  try {
    const [candidate] = await db
      .select({ id: listingImports.id })
      .from(listingImports)
      .where(and(
        eq(listingImports.sourceUrl, sourceUrl.slice(0, 600)),
        sql`${listingImports.propertyId} is null`,
        sql`${listingImports.status} <> 'failed'`,
      ))
      .orderBy(desc(listingImports.createdAt))
      .limit(1);

    if (!candidate) return;
    await db
      .update(listingImports)
      .set({ propertyId })
      .where(eq(listingImports.id, candidate.id));
  } catch (err) {
    console.error('Import link error:', err);
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */

export interface ImportSourceStats {
  source: string;
  attempts: number;
  ok: number;
  partial: number;
  failed: number;
  saved: number;
  avgFieldCount: number;
  avgDurationMs: number;
  lastAttemptAt: Date | null;
}

export interface ImportFailureGroup {
  code: string;
  source: string;
  count: number;
  lastSeenAt: Date | null;
  sampleMessage: string;
  sampleUrl: string | null;
}

export interface ImportGapRow {
  field: string;
  count: number;
  /** Share of the parses that got far enough to be graded. */
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
  createdAt: Date | null;
}

export interface ImportQualityReport {
  totals: {
    attempts: number;
    ok: number;
    partial: number;
    failed: number;
    saved: number;
    /** Parses that returned data, whether clean or partial. */
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
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export interface ReportFilters {
  days: number;
  source?: string;
  status?: string;
}

export async function importQualityReport(filters: ReportFilters): Promise<ImportQualityReport> {
  const days = Math.min(Math.max(filters.days, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const window = gte(listingImports.createdAt, since);

  const [totalsRow] = await db
    .select({
      attempts: sql<number>`count(*)::int`,
      ok: sql<number>`count(*) filter (where ${listingImports.status} = 'ok')::int`,
      partial: sql<number>`count(*) filter (where ${listingImports.status} = 'partial')::int`,
      failed: sql<number>`count(*) filter (where ${listingImports.status} = 'failed')::int`,
      saved: sql<number>`count(*) filter (where ${listingImports.propertyId} is not null)::int`,
    })
    .from(listingImports)
    .where(window);

  const sourceRows = await db
    .select({
      source: listingImports.source,
      attempts: sql<number>`count(*)::int`,
      ok: sql<number>`count(*) filter (where ${listingImports.status} = 'ok')::int`,
      partial: sql<number>`count(*) filter (where ${listingImports.status} = 'partial')::int`,
      failed: sql<number>`count(*) filter (where ${listingImports.status} = 'failed')::int`,
      saved: sql<number>`count(*) filter (where ${listingImports.propertyId} is not null)::int`,
      avgFieldCount: sql<number>`coalesce(round(avg(${listingImports.fieldCount}) filter (where ${listingImports.status} <> 'failed')), 0)::int`,
      avgDurationMs: sql<number>`coalesce(round(avg(${listingImports.durationMs}) filter (where ${listingImports.durationMs} > 0)), 0)::int`,
      lastAttemptAt: sql<Date | null>`max(${listingImports.createdAt})`,
    })
    .from(listingImports)
    .where(window)
    .groupBy(listingImports.source)
    .orderBy(desc(sql`count(*)`));

  const failureRows = await db
    .select({
      code: sql<string>`coalesce(${listingImports.errorCode}, 'unknown')`,
      source: listingImports.source,
      count: sql<number>`count(*)::int`,
      lastSeenAt: sql<Date | null>`max(${listingImports.createdAt})`,
      sampleMessage: sql<string>`coalesce((array_agg(${listingImports.errorMessage} order by ${listingImports.createdAt} desc))[1], '')`,
      sampleUrl: sql<string | null>`(array_agg(${listingImports.sourceUrl} order by ${listingImports.createdAt} desc))[1]`,
    })
    .from(listingImports)
    .where(and(window, eq(listingImports.status, 'failed')))
    .groupBy(sql`coalesce(${listingImports.errorCode}, 'unknown')`, listingImports.source)
    .orderBy(desc(sql`count(*)`));

  /**
   * `missing_fields` and `warnings` are JSON arrays, so unnest them to count how
   * often each individual gap shows up rather than how many attempts had any gap.
   */
  const gapRows = await client<{ field: string; count: number }[]>`
    SELECT field, COUNT(*)::int AS count
    FROM listing_imports,
         jsonb_array_elements_text(COALESCE(missing_fields, '[]'::jsonb)) AS field
    WHERE created_at >= now() - make_interval(days => ${days})
      AND status <> 'failed'
    GROUP BY field
    ORDER BY count DESC
  `;

  const warningRows = await client<{ flag: string; count: number }[]>`
    SELECT flag, COUNT(*)::int AS count
    FROM listing_imports,
         jsonb_array_elements_text(COALESCE(warnings, '[]'::jsonb)) AS flag
    WHERE created_at >= now() - make_interval(days => ${days})
      AND status <> 'failed'
    GROUP BY flag
    ORDER BY count DESC
  `;

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${listingImports.createdAt}), 'YYYY-MM-DD')`,
      ok: sql<number>`count(*) filter (where ${listingImports.status} = 'ok')::int`,
      partial: sql<number>`count(*) filter (where ${listingImports.status} = 'partial')::int`,
      failed: sql<number>`count(*) filter (where ${listingImports.status} = 'failed')::int`,
    })
    .from(listingImports)
    .where(window)
    .groupBy(sql`date_trunc('day', ${listingImports.createdAt})`)
    .orderBy(sql`date_trunc('day', ${listingImports.createdAt})`);

  const recentFilters = [window];
  if (filters.source) recentFilters.push(eq(listingImports.source, filters.source));
  if (filters.status) recentFilters.push(eq(listingImports.status, filters.status));

  const recent = await db
    .select({
      id: listingImports.id,
      source: listingImports.source,
      sourceUrl: listingImports.sourceUrl,
      sourceId: listingImports.sourceId,
      status: listingImports.status,
      missingFields: listingImports.missingFields,
      warnings: listingImports.warnings,
      errorCode: listingImports.errorCode,
      errorMessage: listingImports.errorMessage,
      fieldCount: listingImports.fieldCount,
      photoCount: listingImports.photoCount,
      durationMs: listingImports.durationMs,
      actorName: listingImports.actorName,
      propertyId: listingImports.propertyId,
      createdAt: listingImports.createdAt,
    })
    .from(listingImports)
    .where(and(...recentFilters))
    .orderBy(desc(listingImports.createdAt))
    .limit(60);

  const attempts = num(totalsRow?.attempts);
  const ok = num(totalsRow?.ok);
  const partial = num(totalsRow?.partial);
  const failed = num(totalsRow?.failed);
  const saved = num(totalsRow?.saved);
  const parsed = ok + partial;

  return {
    totals: {
      attempts,
      ok,
      partial,
      failed,
      saved,
      parsed,
      successRate: rate(parsed, attempts),
      cleanRate: rate(ok, parsed),
      conversionRate: rate(saved, parsed),
    },
    sources: sourceRows.map(row => ({
      source: row.source,
      attempts: num(row.attempts),
      ok: num(row.ok),
      partial: num(row.partial),
      failed: num(row.failed),
      saved: num(row.saved),
      avgFieldCount: num(row.avgFieldCount),
      avgDurationMs: num(row.avgDurationMs),
      lastAttemptAt: row.lastAttemptAt ?? null,
    })),
    failures: failureRows.map(row => ({
      code: row.code,
      source: row.source,
      count: num(row.count),
      lastSeenAt: row.lastSeenAt ?? null,
      sampleMessage: row.sampleMessage ?? '',
      sampleUrl: row.sampleUrl ?? null,
    })),
    gaps: gapRows.map(row => ({
      field: row.field,
      count: num(row.count),
      share: rate(num(row.count), parsed),
    })),
    warnings: warningRows.map(row => ({
      field: row.flag,
      count: num(row.count),
      share: rate(num(row.count), parsed),
    })),
    daily: dailyRows.map(row => ({
      day: row.day,
      ok: num(row.ok),
      partial: num(row.partial),
      failed: num(row.failed),
    })),
    recent: recent.map(row => ({
      ...row,
      missingFields: row.missingFields ?? [],
      warnings: row.warnings ?? [],
      fieldCount: num(row.fieldCount),
      photoCount: num(row.photoCount),
      durationMs: num(row.durationMs),
    })),
  };
}

/** One attempt, for the retry flow. */
export async function importAttempt(id: number): Promise<{ id: number; sourceUrl: string | null } | null> {
  const [row] = await db
    .select({ id: listingImports.id, sourceUrl: listingImports.sourceUrl })
    .from(listingImports)
    .where(eq(listingImports.id, id));
  return row ?? null;
}
