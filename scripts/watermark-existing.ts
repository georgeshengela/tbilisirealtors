/**
 * Bake the centered brand watermark into every listing photo we already store.
 *
 *   npx tsx scripts/watermark-existing.ts
 */
import { eq } from 'drizzle-orm';
import { v2 as cloudinary } from 'cloudinary';
import { db, client } from '../server/db.js';
import { properties } from '../server/schema.js';
import { WATERMARK_TAG, ensureWatermark, watermarkImageUrl } from '../server/lib/watermark.js';

cloudinary.config(true);

const CONCURRENCY = 3;

function listUrls(value: string[] | null | undefined): string[] {
  return (value ?? []).filter(url => typeof url === 'string' && /^https?:\/\//i.test(url));
}

async function alreadyWatermarked(url: string): Promise<boolean> {
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)\.(?:jpe?g|png|webp|avif|gif)(?:\?|$)/i);
  if (!match?.[1] || !/res\.cloudinary\.com\//i.test(url)) return false;
  try {
    const resource = await cloudinary.api.resource(match[1], { context: true, tags: true });
    const tags: string[] = resource.tags ?? [];
    const context = resource.context?.custom ?? {};
    return tags.includes(WATERMARK_TAG) || context.watermarked === 'v2';
  } catch {
    return false;
  }
}

async function mapPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }));
}

const rows = await db
  .select({
    id: properties.id,
    images: properties.images,
    hiddenImages: properties.hiddenImages,
  })
  .from(properties);

const jobs = rows.flatMap(row => {
  const images = listUrls(row.images);
  const hidden = listUrls(row.hiddenImages);
  if (images.length + hidden.length === 0) return [];
  return [{ id: row.id, images, hidden }];
});

console.log(`Listings with photos: ${jobs.length}`);
await ensureWatermark();

let updated = 0;
let skipped = 0;
let failed = 0;

await mapPool(jobs, async (job) => {
  const nextImages: string[] = [];
  const nextHidden: string[] = [];
  let changed = false;

  for (const [bucket, target] of [[job.images, nextImages], [job.hidden, nextHidden]] as const) {
    for (const url of bucket) {
      try {
        if (await alreadyWatermarked(url)) {
          target.push(url);
          skipped += 1;
          continue;
        }
        const watermarked = await watermarkImageUrl(url);
        target.push(watermarked);
        changed = true;
        updated += 1;
        console.log(`ok  ${job.id}  ${url.slice(0, 72)}…`);
      } catch (err) {
        failed += 1;
        target.push(url);
        console.error(`fail ${job.id}  ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (!changed) return;
  await db
    .update(properties)
    .set({
      images: nextImages,
      hiddenImages: nextHidden,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, job.id));
});

console.log(`Done. watermarked=${updated} skipped=${skipped} failed=${failed}`);
await client.end({ timeout: 5 });
