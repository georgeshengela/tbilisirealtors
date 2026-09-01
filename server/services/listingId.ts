import { sql } from 'drizzle-orm';
import { db } from '../db.js';
import { properties } from '../schema.js';

const SEQUENCE_START = 10_000_000;

/**
 * Next unused 8-digit listing ID, counting up from 10000000.
 * Existing random codes (58M, 81M, …) stay as they are so public URLs do not break.
 */
export async function allocateListingId(): Promise<string> {
  const existing = await db
    .select({ id: properties.id })
    .from(properties)
    .where(sql`${properties.id} ~ '^[0-9]{8}$'`);

  const used = new Set(existing.map(row => row.id));
  let next = SEQUENCE_START;
  while (used.has(String(next))) next += 1;
  if (next > 99_999_999) throw new Error('Could not allocate a unique listing ID');
  return String(next);
}
