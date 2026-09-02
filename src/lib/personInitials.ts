/** First letters of given name and surname. One-word names keep a single letter. */
export function personInitials(name: string): string {
  const parts = name
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? '—').toUpperCase();
}
