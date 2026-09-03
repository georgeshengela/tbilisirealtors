import { FALLBACK_USD_RATE } from '../contexts/CurrencyContext';

export type EntryCurrency = 'GEL' | 'USD';

/** Admin listing form currency chip → entry currency. */
export function formCurrencyToEntry(symbol: string): EntryCurrency {
  return symbol === '$' ? 'USD' : 'GEL';
}

export function parsePriceCurrency(value: unknown): EntryCurrency {
  const v = String(value ?? '').trim().toUpperCase();
  if (v === 'USD' || v === '$') return 'USD';
  return 'GEL';
}

/** Pass to formatMoney so a USD listing stays $950 when the viewer is in USD. */
export function listingMoneyFrom(property: { priceCurrency?: string | null }): { from: EntryCurrency } {
  return { from: parsePriceCurrency(property.priceCurrency) };
}

/** Convert a listing's stored asking price to GEL for filters and sort. */
export function listingAmountToGel(
  amount: number,
  currency: EntryCurrency | string | null | undefined,
  usdRate = FALLBACK_USD_RATE,
): number {
  if (!amount || !Number.isFinite(amount)) return 0;
  return parsePriceCurrency(currency) === 'USD' ? Math.round(amount * usdRate) : Math.round(amount);
}

/** Convert a GEL amount into the admin entry currency. */
export function gelToEntryAmount(
  gel: number,
  entry: EntryCurrency,
  usdRate = FALLBACK_USD_RATE,
): number {
  if (!gel || !Number.isFinite(gel)) return 0;
  return entry === 'USD' ? Math.round(gel / usdRate) : Math.round(gel);
}

/** Convert an admin entry amount into GEL. */
export function entryAmountToGel(
  amount: number,
  entry: EntryCurrency,
  usdRate = FALLBACK_USD_RATE,
): number {
  if (!amount || !Number.isFinite(amount)) return 0;
  return entry === 'USD' ? Math.round(amount * usdRate) : Math.round(amount);
}

/** Switch admin form currency while preserving the real GEL value. */
export function convertEntryAmount(
  amount: number,
  from: EntryCurrency,
  to: EntryCurrency,
  usdRate = FALLBACK_USD_RATE,
): number {
  if (!amount || !Number.isFinite(amount)) return 0;
  if (from === to) return Math.round(amount);
  if (from === 'GEL') return Math.round(amount / usdRate);
  return Math.round(amount * usdRate);
}
