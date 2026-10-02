const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/**
 * Face-framed square/round crop for broker portraits. Cloudinary URLs get a
 * `g_face` thumb transform (the face stays in frame instead of a centre crop);
 * anything else passes through untouched.
 */
export function avatarUrl(url: string | null | undefined, size: number, zoom = 0.75): string {
  if (!url) return '';
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  const px = Math.round(size);
  return `${match[1]}c_thumb,g_face,z_${zoom},w_${px},h_${px},f_auto,q_auto/${match[2]}`;
}

/** Face-aware fill for non-square portrait slots (e.g. 3:4 cards). */
export function portraitUrl(url: string | null | undefined, width: number, height: number): string {
  if (!url) return '';
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  return `${match[1]}c_fill,g_face,w_${Math.round(width)},h_${Math.round(height)},f_auto,q_auto/${match[2]}`;
}

/** Width-capped Cloudinary delivery for thumbnails; other hosts pass through. */
export function cloudinarySized(url: string | null | undefined, width: number): string {
  if (!url) return '';
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  return `${match[1]}c_limit,w_${Math.round(width)},f_auto,q_auto/${match[2]}`;
}
