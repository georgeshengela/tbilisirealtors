/**
 * Seeds 20 sample listings (+ 6 agents) without deleting existing data.
 * Run: npm run db:seed-listings
 */
import { db, client } from './db.js';
import { properties, agents } from './schema.js';
import { SAMPLE_AGENTS, SAMPLE_LISTINGS } from './sampleListings.js';
import { inArray } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const SAMPLE_COUNT = 20;

async function seedListings() {
  const listings = SAMPLE_LISTINGS.slice(0, SAMPLE_COUNT);

  console.log(`Seeding ${SAMPLE_COUNT} sample listings...\n`);

  try {
    console.log('Ensuring agents exist...');
    for (const agent of SAMPLE_AGENTS) {
      await db.insert(agents).values(agent).onConflictDoNothing();
    }
    console.log(`✅ ${SAMPLE_AGENTS.length} agents ready`);

    console.log(`Inserting ${listings.length} properties...`);
    const ids = listings.map(p => p.id);
    await db.delete(properties).where(inArray(properties.id, ids));

    for (const prop of listings) {
      await db.insert(properties).values(prop);
    }

    console.log(`✅ ${listings.length} sample properties inserted`);
    console.log('\n🎉 Sample listings seeded!');
    console.log('   Refresh the site to see them on the homepage and /listings');
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seedListings();
