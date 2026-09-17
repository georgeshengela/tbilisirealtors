import { sql } from 'drizzle-orm';
import { db } from '../db.js';
import { orders } from '../schema.js';

const SEQUENCE_START = 20_000_000;

/** Next unused 8-digit order ID, counting up from 20000000. */
export async function allocateOrderId(): Promise<string> {
  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(sql`${orders.id} ~ '^[0-9]{8}$'`);

  const used = new Set(existing.map(row => row.id));
  let next = SEQUENCE_START;
  while (used.has(String(next))) next += 1;
  if (next > 99_999_999) throw new Error('Could not allocate a unique order ID');
  return String(next);
}
