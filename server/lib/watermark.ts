import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** v4: the TBILISIREALTOR.GE wordmark alone (no icon, no subtitle), larger and clearly visible. */
export const WATERMARK_VERSION = 'v4';
export const WATERMARK_PUBLIC_ID = 'tbilisirealtor/brand/watermark-v4';
export const WATERMARK_TAG = 'watermarked-v4';
export const WATERMARK_CONTEXT = `watermarked=${WATERMARK_VERSION}`;
/** Every tag a stamped photo may carry — older versions still count as "has a watermark". */
export const WATERMARK_TAGS = ['watermarked-v2', 'watermarked-v3', WATERMARK_TAG];

/** Centered wordmark — 60% of the photo width, half-transparent. */
export const WATERMARK_TRANSFORM = [
  {
    overlay: WATERMARK_PUBLIC_ID.replace(/\//g, ':'),
    opacity: 50,
    gravity: 'center' as const,
    width: 0.6,
    flags: 'relative' as const,
  },
];

let ready: Promise<void> | null = null;

export function ensureWatermark(): Promise<void> {
  if (!ready) ready = uploadWatermark();
  return ready;
}

async function uploadWatermark() {
  const file = path.join(__dirname, '../assets/watermark-v4.png');
  await cloudinary.uploader.upload(file, {
    public_id: WATERMARK_PUBLIC_ID,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    tags: ['brand-watermark'],
  });
}

export function isCloudinaryUrl(url: string): boolean {
  return /res\.cloudinary\.com\//i.test(url);
}

export function parseCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)\.(?:jpe?g|png|webp|avif|gif|svg)(?:\?|$)/i);
  if (!match?.[1]) return null;
  return match[1].replace(/^l_[^/]+\/(?:[^/]+\/)*/i, '').replace(/^v\d+\//, '');
}

export async function watermarkImageUrl(url: string): Promise<string> {
  await ensureWatermark();
  const existingId = isCloudinaryUrl(url) ? parseCloudinaryPublicId(url) : null;
  const publicId = existingId && !existingId.startsWith('tbilisirealtor/brand/')
    ? existingId
    : `tbilisirealtor/photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const result = await cloudinary.uploader.upload(url, {
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    tags: [WATERMARK_TAG],
    context: WATERMARK_CONTEXT,
    transformation: WATERMARK_TRANSFORM,
  });

  if (!result.secure_url) throw new Error('CLOUDINARY_EMPTY');
  return result.secure_url;
}
