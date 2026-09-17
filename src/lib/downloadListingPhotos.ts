import { buildZipStore } from './zipStore';

/** Prefer Cloudinary JPEG delivery when possible. */
function cloudinaryJpgUrl(url: string): string {
  if (!/res\.cloudinary\.com\//i.test(url)) return url;
  let next = url;
  if (!/\/upload\/(?:[^/?#]*,)?f_jpg(?:[/,?]|$)/i.test(next)) {
    next = next.replace(/\/image\/upload\//i, '/image/upload/f_jpg,q_auto:good/');
  }
  return next.replace(/\.(webp|png|avif|gif)(\?|#|$)/i, '.jpg$2');
}

export function listingPhotoFilename(_url: string, index: number, listingId?: string): string {
  return `${listingId || 'listing'}-${String(index + 1).padStart(2, '0')}.jpg`;
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  triggerDownload(href, filename);
  window.setTimeout(() => URL.revokeObjectURL(href), 2000);
}

/** Decode any browser-supported image and re-encode as JPEG. */
async function blobToJpeg(blob: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        part => (part ? resolve(part) : reject(new Error('toBlob'))),
        'image/jpeg',
        0.92,
      );
    });
    return new Uint8Array(await jpeg.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

async function fetchAsJpeg(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(cloudinaryJpgUrl(url), { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    try {
      return await blobToJpeg(blob);
    } catch {
      return new Uint8Array(await blob.arrayBuffer());
    }
  } catch {
    return null;
  }
}

export async function downloadListingPhoto(url: string, filename: string): Promise<void> {
  const jpgName = filename.replace(/\.(webp|png|avif|gif|jpe?g)$/i, '.jpg');
  try {
    const data = await fetchAsJpeg(url);
    if (!data?.byteLength) throw new Error('download failed');
    saveBlob(new Blob([Uint8Array.from(data)], { type: 'image/jpeg' }), jpgName);
  } catch {
    window.open(cloudinaryJpgUrl(url), '_blank', 'noopener,noreferrer');
  }
}

async function zipFromUrls(urls: string[], listingId?: string): Promise<Blob> {
  const files: { name: string; data: Uint8Array }[] = [];
  for (let i = 0; i < urls.length; i += 4) {
    const batch = urls.slice(i, i + 4);
    const parts = await Promise.all(batch.map(async (url, offset) => {
      const data = await fetchAsJpeg(url);
      if (!data?.byteLength) return null;
      return {
        name: listingPhotoFilename(url, i + offset, listingId),
        data,
      };
    }));
    for (const part of parts) {
      if (part?.data.byteLength) files.push(part);
    }
  }
  if (!files.length) throw new Error('zip empty');
  return new Blob([buildZipStore(files)], { type: 'application/zip' });
}

async function zipFromServer(urls: string[], listingId: string | undefined, token: string): Promise<Blob> {
  const res = await fetch('/api/admin/photos/zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ urls, listingId }),
  });
  if (!res.ok) throw new Error('server zip failed');
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) throw new Error('server zip failed');
  return res.blob();
}

export async function downloadListingPhotos(
  urls: string[],
  listingId?: string,
  token?: string | null,
): Promise<void> {
  const clean = urls.filter(Boolean);
  if (!clean.length) return;
  const filename = `${listingId || 'listing'}-photos-jpg.zip`;

  if (token) {
    try {
      saveBlob(await zipFromServer(clean, listingId, token), filename);
      return;
    } catch {
      /* fall through to browser zip */
    }
  }

  saveBlob(await zipFromUrls(clean, listingId), filename);
}
