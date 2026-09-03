function extensionOf(url: string): string {
  const match = url.match(/\.(jpe?g|png|webp|gif|avif)(?:\?|$)/i);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

export function listingPhotoFilename(url: string, index: number, listingId?: string): string {
  return `${listingId || 'listing'}-${String(index + 1).padStart(2, '0')}.${extensionOf(url)}`;
}

export async function downloadListingPhoto(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function downloadListingPhotos(
  urls: string[],
  listingId?: string,
): Promise<void> {
  for (const [index, url] of urls.entries()) {
    if (!url) continue;
    await downloadListingPhoto(url, listingPhotoFilename(url, index, listingId));
    if (index < urls.length - 1) {
      await new Promise(resolve => window.setTimeout(resolve, 250));
    }
  }
}
