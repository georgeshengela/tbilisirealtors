import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WATERMARK_PUBLIC_ID = 'tbilisirealtor/brand/watermark';
export const WATERMARK_TAG = 'watermarked-v2';

/** Centered brand lockup — faint enough to sit on the photo, still readable. */
export const WATERMARK_TRANSFORM = [
  {
    overlay: WATERMARK_PUBLIC_ID.replace(/\//g, ':'),
    opacity: 8,
    gravity: 'center' as const,
    width: 0.62,
    flags: 'relative' as const,
  },
];

let ready: Promise<void> | null = null;

export function ensureWatermark(): Promise<void> {
  if (!ready) ready = uploadWatermark();
  return ready;
}

async function uploadWatermark() {
  const file = path.join(__dirname, '../assets/watermark.png');
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
    context: 'watermarked=v2',
    transformation: WATERMARK_TRANSFORM,
  });

  if (!result.secure_url) throw new Error('CLOUDINARY_EMPTY');
  return result.secure_url;
}
