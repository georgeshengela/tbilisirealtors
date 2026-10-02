/**
 * Undo scripts/rewatermark-v4.ts: point every listing + project photo back at the
 * pre-v4 URL from backups/rewatermark-v4.json. Nothing on Cloudinary is touched —
 * the pre-v4 files were never overwritten, and the -wm4 copies stay where they are.
 *
 * Before any row changes, the reverse map (v4 → pre-v4) is written to
 * backups/rollback-watermark-v4.json, so this rollback can itself be undone.
 *
 *   npx tsx scripts/rollback-watermark-v4.ts --dry-run   # count only
 *   npx tsx scripts/rollback-watermark-v4.ts
 */
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db, client } from '../server/db.js';
import { constructionProjects, properties } from '../server/schema.js';

const DRY_RUN = process.argv.includes('--dry-run');
const V4_MAP = path.resolve('backups/rewatermark-v4.json');
const REVERSE_MAP = path.resolve('backups/rollback-watermark-v4.json');

const forward = JSON.parse(fs.readFileSync(V4_MAP, 'utf8')) as Record<string, string>;
const reverse = new Map(Object.entries(forward).map(([original, stamped]) => [stamped, original]));

if (!DRY_RUN) fs.writeFileSync(REVERSE_MAP, JSON.stringify(Object.fromEntries(reverse), null, 1));

const stats = { photos: 0, listings: 0, projects: 0 };

function revert(urls: string[] | null | undefined): { next: string[]; changed: boolean } {
  let changed = false;
  const next = (urls ?? []).map(url => {
    const original = reverse.get(url);
    if (!original) return url;
    changed = true;
    stats.photos += 1;
    return original;
  });
  return { next, changed };
}

const listingRows = await db
  .select({ id: properties.id, images: properties.images, hiddenImages: properties.hiddenImages })
  .from(properties);
for (const row of listingRows) {
  const images = revert(row.images);
  const hidden = revert(row.hiddenImages);
  if (!images.changed && !hidden.changed) continue;
  stats.listings += 1;
  if (DRY_RUN) continue;
  // A photo swap is not an edit — leave the listing's dates alone.
  await db.update(properties)
    .set({ images: images.next, hiddenImages: hidden.next })
    .where(eq(properties.id, row.id));
}

const projectRows = await db
  .select({ id: constructionProjects.id, image: constructionProjects.image, images: constructionProjects.images })
  .from(constructionProjects);
for (const row of projectRows) {
  const images = revert(row.images);
  const cover = revert(row.image ? [row.image] : []);
  if (!images.changed && !cover.changed) continue;
  stats.projects += 1;
  if (DRY_RUN) continue;
  await db.update(constructionProjects)
    .set({ images: images.next, image: cover.next[0] ?? row.image, updatedAt: new Date() })
    .where(eq(constructionProjects.id, row.id));
}

console.log(`${DRY_RUN ? '[dry-run] would revert' : 'Reverted'} photos=${stats.photos} listings=${stats.listings} projects=${stats.projects}`);
await client.end({ timeout: 5 });
