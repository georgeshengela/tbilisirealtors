import { Router } from 'express';

const router = Router();

const NBG_BASE =
  'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/';

const FALLBACK_RATES: Record<string, number> = {
  GEL: 1,
  USD: 2.6181,
  EUR: 3.0205,
};

interface CacheEntry {
  date: string;
  rates: Record<string, number>;
  fetchedAt: number;
  source: 'nbg' | 'fallback';
}

let cache: CacheEntry | null = null;
const CACHE_MS = 60 * 60 * 1000;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseNbgRates(currencies: Array<{ code: string; quantity: number; rate: number }>) {
  const rates: Record<string, number> = { GEL: 1 };
  for (const c of currencies) {
    if (c.code === 'USD' || c.code === 'EUR') {
      rates[c.code] = c.rate / (c.quantity || 1);
    }
  }
  return rates;
}

router.get('/', async (_req, res) => {
  const date = todayIso();

  if (
    cache &&
    cache.date === date &&
    Date.now() - cache.fetchedAt < CACHE_MS &&
    cache.source === 'nbg'
  ) {
    res.json(cache);
    return;
  }

  try {
    const resp = await fetch(`${NBG_BASE}?date=${date}`);
    if (!resp.ok) throw new Error(`NBG HTTP ${resp.status}`);

    const data = (await resp.json()) as Array<{ currencies?: Array<{ code: string; quantity: number; rate: number }> }>;
    const currencies = data[0]?.currencies ?? [];
    const rates = parseNbgRates(currencies);

    if (!rates.USD) {
      rates.USD = FALLBACK_RATES.USD;
    }

    cache = { date, rates, fetchedAt: Date.now(), source: 'nbg' };
    res.json(cache);
  } catch {
    cache = {
      date,
      rates: { ...FALLBACK_RATES },
      fetchedAt: Date.now(),
      source: 'fallback',
    };
    res.json(cache);
  }
});

export default router;
