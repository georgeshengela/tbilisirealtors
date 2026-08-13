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
}

interface CurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  rates: Record<string, number>;
  ratesDate: string | null;
  ratesLoading: boolean;
  ratesSource: 'nbg' | 'fallback' | null;
  formatMoney: (amountGel: number, options?: FormatMoneyOptions) => string;
  currencySymbol: string;
}

const STORAGE_KEY = 'tr_currency';

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): DisplayCurrency {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'USD' || v === 'GEL') return v;
  } catch {
    /* ignore */
  }
  return 'GEL';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [currency, setCurrencyState] = useState<DisplayCurrency>(readStoredCurrency);
  const [rates, setRates] = useState<Record<string, number>>({ GEL: 1, USD: 2.6181 });
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
          setRates({ GEL: 1, USD: 2.6181 });
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
    (amountGel: number, options: FormatMoneyOptions = {}) => {
      const { perMonth = false, perSqm = false, compact = false } = options;

      let value = amountGel;
      let symbol = '₾';
      let suffix = '';

      if (currency === 'USD') {
        const usdRate = rates.USD ?? 2.6181;
        value = amountGel / usdRate;
        symbol = '$';
      }

      const formatted = compact
        ? new Intl.NumberFormat(numberLocale, {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(value)
        : new Intl.NumberFormat(numberLocale, {
            maximumFractionDigits: currency === 'USD' ? 0 : 0,
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
    }),
    [currency, setCurrency, rates, ratesDate, ratesLoading, ratesSource, formatMoney],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
