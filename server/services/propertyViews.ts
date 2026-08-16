import { and, eq, gte } from 'drizzle-orm';
import { client, db } from '../db.js';
import { properties, propertyViews } from '../schema.js';

/** Same browser / tab only counts once per listing within this window. */
const DEDUPE_HOURS = 24;

function normalizeSessionKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().slice(0, 64);
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(key)) return null;
  return key;
}

/**
 * Counts a public listing open. Returns the listing's view_count after the call
 * (unchanged when this session already viewed it recently).
 */
export async function recordPropertyView(
  propertyId: string,
  sessionRaw: unknown,
  currentCount: number,
): Promise<{ viewCount: number; counted: boolean }> {
  const sessionKey = normalizeSessionKey(sessionRaw);
  if (!sessionKey) {
    return { viewCount: currentCount, counted: false };
  }

  const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000);
  const [recent] = await db
    .select({ id: propertyViews.id })
    .from(propertyViews)
    .where(and(
      eq(propertyViews.propertyId, propertyId),
      eq(propertyViews.sessionKey, sessionKey),
      gte(propertyViews.viewedAt, since),
    ))
    .limit(1);

  if (recent) {
    return { viewCount: currentCount, counted: false };
  }

  await db.insert(propertyViews).values({
    propertyId,
    sessionKey,
    viewedAt: new Date(),
  });

  const next = currentCount + 1;
  await db
    .update(properties)
    .set({ viewCount: next, updatedAt: new Date() })
    .where(eq(properties.id, propertyId));

  return { viewCount: next, counted: true };
}

/**
 * Last 12 calendar months of listing creates + counted views (zeros filled in).
 * Pass an owner id to narrow the series to one staff member's own listings.
 */
export async function monthlyActivitySeries(ownerId?: number | null): Promise<{
  months: string[];
  listings: number[];
  views: number[];
}> {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const owner = typeof ownerId === 'number' ? ownerId : null;

  const listingRows = await client`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
           COUNT(*)::int AS count
    FROM properties
    WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
      AND (${owner}::int IS NULL OR created_by_user_id = ${owner}::int)
    GROUP BY 1
    ORDER BY 1
  `;

  const viewRows = await client`
    SELECT to_char(date_trunc('month', v.viewed_at), 'YYYY-MM') AS month,
           COUNT(*)::int AS count
    FROM property_views v
    JOIN properties p ON p.id = v.property_id
    WHERE v.viewed_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
      AND (${owner}::int IS NULL OR p.created_by_user_id = ${owner}::int)
    GROUP BY 1
    ORDER BY 1
  `;

  const listingMap = new Map<string, number>();
  for (const row of listingRows) {
    listingMap.set(String(row.month), Number(row.count));
  }
  const viewMap = new Map<string, number>();
  for (const row of viewRows) {
    viewMap.set(String(row.month), Number(row.count));
  }

  return {
    months,
    listings: months.map(m => listingMap.get(m) ?? 0),
    views: months.map(m => viewMap.get(m) ?? 0),
  };
}
