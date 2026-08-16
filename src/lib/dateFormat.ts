/** Abbreviated Georgian months — ICU short names vary by browser build. */
const KA_MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

/** Full Georgian month names (admin / formal stamps). */
const KA_MONTHS_LONG = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/** Sunday-first weekday names matching Date#getDay(). */
const KA_WEEKDAYS_LONG = [
  'კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი',
];

/**
 * Long Georgian date — e.g. "კვირა, 16 აგვისტო, 2026".
 * Hand-rolled so Windows / incomplete ICU never falls back to English.
 */
export function formatGeorgianLongDate(input: Date | string | number = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return `${KA_WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} ${KA_MONTHS_LONG[date.getMonth()]}, ${date.getFullYear()}`;
}

/** Short Georgian date — e.g. "16 აგვ. 2026". */
export function formatGeorgianShortDate(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${KA_MONTHS[date.getMonth()]}. ${date.getFullYear()}`;
}

/** Georgian date + time — e.g. "16 აგვ. 2026, 14:05". */
export function formatGeorgianDateTime(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatGeorgianShortDate(date)}, ${hh}:${mm}`;
}

/** Day and month, with the year only when it is not the current one. */
export function formatShortDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const thisYear = date.getFullYear() === new Date().getFullYear();

  if (locale === 'ka') {
    const stamp = `${date.getDate()} ${KA_MONTHS[date.getMonth()]}.`;
    return thisYear ? stamp : `${stamp} ${date.getFullYear()}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: thisYear ? undefined : 'numeric',
  }).format(date);
}

/** "Today", "3 days ago", … turning into a plain date after a month. */
export function formatListedDate(
  dateStr: string,
  locale: string,
  t: (key: string) => string,
): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return t('listings.today');
  if (days === 1) return t('listings.yesterday');
  if (days < 7) return t('listings.daysAgo').replace('{n}', String(days));
  if (days < 30) return t('listings.weeksAgo').replace('{n}', String(Math.floor(days / 7)));

  return formatShortDate(dateStr, locale);
}
