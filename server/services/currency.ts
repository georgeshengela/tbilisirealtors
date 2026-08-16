/**
 * National Bank of Georgia exchange rates, cached in-process.
 *
 * The NBG publishes one set of rates per day, so a single fetch per hour is more
 * than enough and keeps us from hammering their gateway on every request.
 */

const NBG_BASE = 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/';

/** Used when NBG is unreachable so price conversion degrades instead of failing. */
export const FALLBACK_RATES: Record<string, number> = {
  GEL: 1,
  USD: 2.6181,
  EUR: 3.0205,
};

export interface RatesSnapshot {
  date: string;
  rates: Record<string, number>;
  fetchedAt: number;
  source: 'nbg' | 'fallback';
}

let cache: RatesSnapshot | null = null;
const CACHE_MS = 60 * 60 * 1000;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getRates(): Promise<RatesSnapshot> {
  const date = todayIso();

  if (cache && cache.date === date && cache.source === 'nbg' && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache;
  }

  try {
    const resp = await fetch(`${NBG_BASE}?date=${date}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) throw new Error(`NBG HTTP ${resp.status}`);

    const data = (await resp.json()) as Array<{
      currencies?: Array<{ code: string; quantity: number; rate: number }>;
    }>;

    const rates: Record<string, number> = { GEL: 1 };
    for (const c of data[0]?.currencies ?? []) {
      if (c.code === 'USD' || c.code === 'EUR') {
        rates[c.code] = c.rate / (c.quantity || 1);
      }
    }
    if (!rates.USD) rates.USD = FALLBACK_RATES.USD;

    cache = { date, rates, fetchedAt: Date.now(), source: 'nbg' };
    return cache;
  } catch {
    cache = { date, rates: { ...FALLBACK_RATES }, fetchedAt: Date.now(), source: 'fallback' };
    return cache;
  }
}

/** GEL per 1 USD. */
export async function usdToGel(): Promise<number> {
  const snapshot = await getRates();
  return snapshot.rates.USD || FALLBACK_RATES.USD;
}
