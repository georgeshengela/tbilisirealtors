import sharp from 'sharp';

/** Force Cloudinary to deliver JPEG instead of webp/avif/png. */
export function cloudinaryJpgUrl(url: string): string {
  if (!/res\.cloudinary\.com\//i.test(url)) return url;
  let next = url;
  if (!/\/upload\/(?:[^/?#]*,)?f_jpg(?:[/,?]|$)/i.test(next)) {
    next = next.replace(/\/image\/upload\//i, '/image/upload/f_jpg,q_auto:good/');
  }
  return next.replace(/\.(webp|png|avif|gif)(\?|#|$)/i, '.jpg$2');
}

function isJpeg(data: Uint8Array): boolean {
  return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

/** Convert any image buffer to JPEG bytes (passes through if already JPEG). */
export async function ensureJpegBytes(data: Uint8Array): Promise<Uint8Array> {
  if (isJpeg(data)) return data;
  const out = await sharp(Buffer.from(data))
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return new Uint8Array(out);
}

export function listingPhotoJpgName(index: number, listingId?: string): string {
  return `${listingId || 'listing'}-${String(index + 1).padStart(2, '0')}.jpg`;
}
