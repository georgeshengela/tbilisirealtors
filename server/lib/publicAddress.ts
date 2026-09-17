const COUNTRY = /^(საქართველო|georgia)$/i;
const HOUSE_NUMBER = /(?:N|№|#)?\s*\d+[ა-ჰa-zA-Z]?[-/]?\d*[ა-ჰa-zA-Z]?/u;
const TRAILING_HOUSE_NUMBERS = /(?:[\s,]+(?:N|№|#)?\s*\d+[ა-ჰa-zA-Z]?[-/]?\d*[ა-ჰa-zA-Z]?)+$/u;

function stripHouseNumbers(value: string): string {
  return value.replace(TRAILING_HOUSE_NUMBERS, '').trim();
}

export function parseListingAddress(
  address: string,
  city = '',
  district = '',
): { street: string; streetNumber: string } {
  if (!address.trim()) return { street: '', streetNumber: '' };

  const drop = new Set(
    [city, district, 'საქართველო', 'Georgia', 'Tbilisi', 'თბილისი']
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
  );

  const parts = address
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(part => !drop.has(part.toLowerCase()) && !COUNTRY.test(part));

  let streetNumber = '';
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    if (new RegExp(`^${HOUSE_NUMBER.source}$`, 'u').test(part)) {
      if (!streetNumber) streetNumber = part.replace(/^(?:N|№|#)\s*/u, '');
      continue;
    }
    const streetOnly = stripHouseNumbers(part);
    const numbered = part.slice(streetOnly.length).match(HOUSE_NUMBER);
    if (numbered && !streetNumber) streetNumber = numbered[0].replace(/^(?:N|№|#)\s*/u, '');
    const key = streetOnly.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(streetOnly);
  }

  return {
    street: unique[0] || '',
    streetNumber,
  };
}

export function toPublicAddress(
  address: string | null | undefined,
  showExact: boolean | null | undefined,
  district?: string | null,
  city?: string | null,
): string {
  const raw = (address ?? '').trim();
  if (!raw) return '';
  if (showExact !== false) return raw;
  return parseListingAddress(raw, city ?? '', district ?? '').street || stripHouseNumbers(raw);
}
