/**
 * Remap legacy listing IDs (p1, p20abc…) to 8-digit codes like 24171150.
 * Updates properties + property_price_history in one pass.
 *
 *   npx tsx server/remap-listing-ids.ts
 */

import dotenv from 'dotenv';
import { client } from './db.js';
import { randomListingId } from './utils.js';

dotenv.config();

async function remap() {
  console.log('Remapping listing IDs to 8-digit codes…');

  const rows = await client<{ id: string }[]>`SELECT id FROM properties ORDER BY created_at ASC NULLS LAST, id ASC`;
  const used = new Set(rows.map(r => r.id).filter(id => /^\d{8}$/.test(id)));
  let changed = 0;

  for (const row of rows) {
    if (/^\d{8}$/.test(row.id)) continue;

    let next = randomListingId();
    while (used.has(next)) next = randomListingId();
    used.add(next);

    await client.begin(async sql => {
      // Drop FK temporarily if any — Neon tables use plain varchar refs.
      await sql`UPDATE property_price_history SET property_id = ${next} WHERE property_id = ${row.id}`;
      await sql`UPDATE properties SET id = ${next} WHERE id = ${row.id}`;
    });

    console.log(`  ${row.id} → ${next}`);
    changed += 1;
  }

  console.log(`Done. Remapped ${changed} listing(s); ${used.size} total numeric IDs in use.`);
  await client.end();
}

remap().catch(err => {
  console.error(err);
  process.exit(1);
});
