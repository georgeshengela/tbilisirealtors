import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { properties } from '../schema.js';
import { randomListingId } from '../utils.js';

/** Allocate a unique 8-digit listing ID, retrying on the rare collision. */
export async function allocateListingId(maxAttempts = 12): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = randomListingId();
    const [existing] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);
    if (!existing) return id;
  }
  throw new Error('Could not allocate a unique listing ID');
}
