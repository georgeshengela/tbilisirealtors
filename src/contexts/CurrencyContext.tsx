import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DisplayCurrency } from '../i18n/types';
import { useLocale } from '../i18n/LocaleContext';

interface RatesResponse {
  date: string;
  rates: Record<string, number>;
  source?: 'nbg' | 'fallback';
}

interface FormatMoneyOptions {
  perMonth?: boolean;
  perSqm?: boolean;
  compact?: boolean;
  /** Currency the amount is stored in. Default GEL (projects, market stats). */
  from?: DisplayCurrency;
}

interface CurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  rates: Record<string, number>;
  ratesDate: string | null;
  ratesLoading: boolean;
  ratesSource: 'nbg' | 'fallback' | null;
  formatMoney: (amount: number, options?: FormatMoneyOptions) => string;
  currencySymbol: string;
  /** Convert a user-entered display amount to stored GEL. */
  displayToGel: (amountDisplay: number) => number;
  /** Convert stored GEL to display currency for form inputs. */
  gelToDisplay: (amountGel: number) => number;
  /** Convert a listing's asking price to GEL using the live rate. */
  listingToGel: (amount: number, from?: DisplayCurrency | string | null) => number;
}

const STORAGE_KEY = 'tr_currency';
export const FALLBACK_USD_RATE = 2.6181;

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function readStoredCurrency(): DisplayCurrency {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'USD' || v === 'GEL') return v;
  } catch {
    /* ignore */
  }
  return 'USD';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [currency, setCurrencyState] = useState<DisplayCurrency>(readStoredCurrency);
  const [rates, setRates] = useState<Record<string, number>>({ GEL: 1, USD: FALLBACK_USD_RATE });
  const [ratesDate, setRatesDate] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesSource, setRatesSource] = useState<'nbg' | 'fallback' | null>(null);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      setRatesLoading(true);
      try {
        const resp = await fetch('/api/rates');
        if (!resp.ok) throw new Error('rates fetch failed');
        const data = (await resp.json()) as RatesResponse;
        if (cancelled) return;
        setRates(data.rates);
        setRatesDate(data.date);
        setRatesSource(data.source ?? 'nbg');
      } catch {
        if (!cancelled) {
          setRates({ GEL: 1, USD: FALLBACK_USD_RATE });
          setRatesSource('fallback');
        }
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    }

    loadRates();
    return () => {
      cancelled = true;
    };
  }, []);

  const numberLocale = locale === 'ka' ? 'ka-GE' : 'en-US';

  const formatMoney = useCallback(
    (amount: number, options: FormatMoneyOptions = {}) => {
      const { perMonth = false, perSqm = false, compact = false, from = 'GEL' } = options;
      const usdRate = rates.USD ?? FALLBACK_USD_RATE;

      let value = amount;
      if (from !== currency) {
        value = from === 'USD' ? amount * usdRate : amount / usdRate;
      }

      const symbol = currency === 'USD' ? '$' : '₾';
      let suffix = '';

      const formatted = compact
        ? new Intl.NumberFormat(numberLocale, {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(value)
        : new Intl.NumberFormat(numberLocale, {
            maximumFractionDigits: 0,
          }).format(Math.round(value));

      if (perMonth) {
        suffix = locale === 'ka' ? '/თვ.' : '/mo';
      } else if (perSqm) {
        suffix = locale === 'ka' ? '/მ²' : '/m²';
      }

      return `${symbol}${formatted}${suffix}`;
    },
    [currency, rates.USD, numberLocale, locale],
  );

  const usdRate = rates.USD ?? FALLBACK_USD_RATE;

  const displayToGel = useCallback(
    (amountDisplay: number) => {
      if (!amountDisplay || !Number.isFinite(amountDisplay)) return 0;
      if (currency === 'USD') return Math.round(amountDisplay * usdRate);
      return Math.round(amountDisplay);
    },
    [currency, usdRate],
  );

  const gelToDisplay = useCallback(
    (amountGel: number) => {
      if (!amountGel || !Number.isFinite(amountGel)) return 0;
      if (currency === 'USD') return Math.round(amountGel / usdRate);
      return Math.round(amountGel);
    },
    [currency, usdRate],
  );

  const listingToGel = useCallback(
    (amount: number, from?: DisplayCurrency | string | null) => {
      if (!amount || !Number.isFinite(amount)) return 0;
      const stored = String(from ?? 'GEL').toUpperCase();
      return stored === 'USD' || stored === '$' ? Math.round(amount * usdRate) : Math.round(amount);
    },
    [usdRate],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rates,
      ratesDate,
      ratesLoading,
      ratesSource,
      formatMoney,
      currencySymbol: currency === 'USD' ? '$' : '₾',
      displayToGel,
      gelToDisplay,
      listingToGel,
    }),
    [currency, setCurrency, rates, ratesDate, ratesLoading, ratesSource, formatMoney, displayToGel, gelToDisplay, listingToGel],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
