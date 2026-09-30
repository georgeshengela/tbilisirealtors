/**
 * Re-stamp stored listing + project photos with the v4 watermark (wordmark only).
 *
 * The originals were overwritten when v2 was baked in, so the v4 logo goes on top
 * of the faint old one. Photos a v3 trial already restamped are taken back to their
 * pre-v3 source (from the v3 backup map), so no photo ever carries two new logos.
 * Every photo is copied to a NEW public id (`<old>-wm4`) —
 * nothing on Cloudinary is overwritten — and each old → new URL pair is written to
 * the backup map before the database row is touched. Re-running skips photos that
 * are already in the map, so an interrupted run simply resumes.
 *
 *   npx tsx scripts/rewatermark-v4.ts --dry-run            # count only, no uploads, no DB writes
 *   npx tsx scripts/rewatermark-v4.ts --limit 20           # first 20 photos (trial)
 *   npx tsx scripts/rewatermark-v4.ts                      # everything
 *   npx tsx scripts/rewatermark-v4.ts --backup path.json   # custom map file
 *
 * Roll back: the map file holds every old URL, e.g. swap them back with a small script.
 */
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { v2 as cloudinary } from 'cloudinary';
import { db, client } from '../server/db.js';
import { constructionProjects, properties } from '../server/schema.js';
import {
  WATERMARK_CONTEXT,
  WATERMARK_TAG,
  WATERMARK_TRANSFORM,
  ensureWatermark,
  isCloudinaryUrl,
  parseCloudinaryPublicId,
} from '../server/lib/watermark.js';

cloudinary.config(true);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Math.max(1, Number(args[limitArg + 1]) || 0) : Infinity;
const backupArg = args.indexOf('--backup');
const BACKUP_FILE = path.resolve(backupArg >= 0 ? args[backupArg + 1] : 'backups/rewatermark-v4.json');
const SUFFIX = '-wm4';
/** The earlier v3 trial: new URL → pre-v3 source. */
const V3_MAP_FILE = path.resolve('backups/rewatermark-v3.json');
const CONCURRENCY = 3;

type UrlMap = Record<string, string>;

function loadMap(): UrlMap {
  try {
    return JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')) as UrlMap;
  } catch {
    return {};
  }
}

const urlMap = loadMap();

const v3Source = new Map<string, string>();
try {
  const v3 = JSON.parse(fs.readFileSync(V3_MAP_FILE, 'utf8')) as UrlMap;
  for (const [original, stamped] of Object.entries(v3)) v3Source.set(stamped, original);
} catch {
  /* no v3 trial ran on this machine */
}

/** Where to stamp from: a v3-stamped photo goes back to its pre-v3 original. */
function sourceOf(url: string): string {
  const original = v3Source.get(url);
  if (original) return original;
  // A -wm3 copy missing from the map: its source is the same public id without the suffix.
  const V3_COPY = /-wm3(\.[a-z0-9]+)(\?.*)?$/i;
  if (!V3_COPY.test(url)) return url;
  return url.replace(V3_COPY, '$1').replace(/\/v\d+\//, '/');
}

const newUrls = new Set(Object.values(urlMap));

/** Write-then-rename so a crash never leaves a half-written map. */
function saveMap() {
  fs.mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
  const tmp = `${BACKUP_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(urlMap, null, 1));
  fs.renameSync(tmp, BACKUP_FILE);
}

function httpUrls(value: string[] | null | undefined): string[] {
  return (value ?? []).filter(url => typeof url === 'string' && /^https?:\/\//i.test(url));
}

let budget = LIMIT;
const stats = { stamped: 0, reused: 0, skipped: 0, failed: 0, rows: 0 };

/** New URL for a photo, or null to keep the old one. */
async function restamp(url: string): Promise<string | null> {
  if (urlMap[url]) {
    stats.reused += 1;
    return urlMap[url];
  }
  const source = sourceOf(url);
  const publicId = isCloudinaryUrl(source) ? parseCloudinaryPublicId(source) : null;
  if (!publicId || newUrls.has(url) || publicId.endsWith(SUFFIX) || publicId.startsWith('tbilisirealtor/brand/')) {
    stats.skipped += 1;
    return null;
  }
  if (budget <= 0) return null;
  budget -= 1;
  if (DRY_RUN) {
    stats.stamped += 1;
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(source, {
      public_id: `${publicId}${SUFFIX}`,
      overwrite: false,
      resource_type: 'image',
      tags: [WATERMARK_TAG, 'rewatermark-v4'],
      context: WATERMARK_CONTEXT,
      transformation: WATERMARK_TRANSFORM,
    });
    if (!result.secure_url) throw new Error('CLOUDINARY_EMPTY');
    urlMap[url] = result.secure_url;
    newUrls.add(result.secure_url);
    saveMap();
    stats.stamped += 1;
    return result.secure_url;
  } catch (err) {
    stats.failed += 1;
    console.error(`fail ${url.slice(0, 90)}  ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function mapList(urls: string[]): Promise<{ next: string[]; changed: boolean }> {
  const next: string[] = [];
  let changed = false;
  for (const url of urls) {
    const replaced = /^https?:\/\//i.test(url) ? await restamp(url) : null;
    next.push(replaced ?? url);
    if (replaced && replaced !== url) changed = true;
  }
  return { next, changed };
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length && budget > 0) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }));
}

console.log(`${DRY_RUN ? '[dry-run] ' : ''}backup map: ${BACKUP_FILE} (${Object.keys(urlMap).length} entries)`);
if (!DRY_RUN) await ensureWatermark();

const listingRows = await db
  .select({ id: properties.id, images: properties.images, hiddenImages: properties.hiddenImages })
  .from(properties);
const listingJobs = listingRows.filter(row => httpUrls(row.images).length + httpUrls(row.hiddenImages).length > 0);
console.log(`Listings with photos: ${listingJobs.length}`);

await pool(listingJobs, async row => {
  const images = await mapList(row.images ?? []);
  const hidden = await mapList(row.hiddenImages ?? []);
  if (DRY_RUN || (!images.changed && !hidden.changed)) return;
  await db.update(properties)
    // A photo re-stamp is not an edit — leave the listing's dates alone.
    .set({ images: images.next, hiddenImages: hidden.next })
    .where(eq(properties.id, row.id));
  stats.rows += 1;
  console.log(`ok  listing ${row.id}`);
});

const projectRows = await db
  .select({ id: constructionProjects.id, image: constructionProjects.image, images: constructionProjects.images })
  .from(constructionProjects);
console.log(`Projects: ${projectRows.length}`);

await pool(projectRows, async row => {
  const images = await mapList(row.images ?? []);
  const cover = row.image ? await mapList([row.image]) : { next: [row.image], changed: false };
  if (DRY_RUN || (!images.changed && !cover.changed)) return;
  await db.update(constructionProjects)
    .set({ images: images.next, image: cover.next[0] ?? row.image, updatedAt: new Date() })
    .where(eq(constructionProjects.id, row.id));
  stats.rows += 1;
  console.log(`ok  project ${row.id}`);
});

console.log(
  `${DRY_RUN ? '[dry-run] would stamp' : 'Done. stamped'}=${stats.stamped} reused=${stats.reused} `
  + `skipped=${stats.skipped} failed=${stats.failed} rowsUpdated=${stats.rows}`
  + (budget <= 0 && Number.isFinite(LIMIT) ? ` (stopped at --limit ${LIMIT})` : ''),
);
await client.end({ timeout: 5 });
