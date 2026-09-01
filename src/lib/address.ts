/**
 * Split a stored listing address into street + house number, and drop the
 * city / country tokens that often get concatenated on import.
 */

const COUNTRY = /^(საქართველო|georgia)$/i;

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
    if (/^\d+[ა-ჰa-zA-Z/-]*$/.test(part)) {
      if (!streetNumber) streetNumber = part;
      continue;
    }
    const numbered = part.match(/^(.*?)[\s]+(\d+[ა-ჰa-zA-Z]?[-/]?\d*[ა-ჰa-zA-Z]?)$/u);
    if (numbered?.[1]?.trim() && !streetNumber) streetNumber = numbered[2];
    const key = part.replace(/\d+[ა-ჰa-zA-Z/-]*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(numbered?.[1]?.trim() || part);
  }

  return {
    street: unique[0] || '',
    streetNumber,
  };
}

export function formatStreetAddress(street: string, streetNumber: string): string {
  return [street.trim(), streetNumber.trim()].filter(Boolean).join(' ');
}

/** Pull a trailing house number off a typed street query: „ბერბუკის 7“. */
export function splitStreetQuery(query: string): { street: string; number: string } {
  const trimmed = query.trim();
  const match = trimmed.match(/^(.*?)[\s,]+(\d+[ა-ჰa-zA-Z]?[-/]?\d*[ა-ჰa-zA-Z]?)$/u);
  if (match?.[1]?.trim()) return { street: match[1].trim(), number: match[2] };
  return { street: trimmed, number: '' };
}
