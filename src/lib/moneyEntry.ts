import { FALLBACK_USD_RATE } from '../contexts/CurrencyContext';

export type EntryCurrency = 'GEL' | 'USD';

/** Admin listing form currency chip → entry currency. */
export function formCurrencyToEntry(symbol: string): EntryCurrency {
  return symbol === '$' ? 'USD' : 'GEL';
}

/** Stored GEL → amount shown in the admin price field. */
export function gelToEntryAmount(
  gel: number,
  entry: EntryCurrency,
  usdRate = FALLBACK_USD_RATE,
): number {
  if (!gel || !Number.isFinite(gel)) return 0;
  return entry === 'USD' ? Math.round(gel / usdRate) : Math.round(gel);
}

/** Admin price field value → GEL for database storage. */
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
