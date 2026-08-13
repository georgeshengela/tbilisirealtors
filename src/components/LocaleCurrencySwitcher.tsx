import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { DisplayCurrency, Locale } from '../i18n/types';

interface LocaleCurrencySwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LocaleCurrencySwitcher({ className = '', compact = false }: LocaleCurrencySwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const { currency, setCurrency, rates, ratesLoading, ratesDate } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const localeLabel = locale === 'ka' ? t('locale.kaShort') : t('locale.enShort');
  const currencyLabel = currency === 'GEL' ? t('currency.gelShort') : t('currency.usdShort');
  const usdRate = rates.USD?.toFixed(4) ?? '—';

  const locales: { id: Locale; label: string; flag: string }[] = [
    { id: 'ka', label: t('locale.ka'), flag: '🇬🇪' },
    { id: 'en', label: t('locale.en'), flag: '🇬🇧' },
  ];

  const currencies: { id: DisplayCurrency; label: string; symbol: string }[] = [
    { id: 'GEL', label: t('currency.gel'), symbol: '₾' },
    { id: 'USD', label: t('currency.usd'), symbol: '$' },
  ];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5"
        style={{
          height: 40,
          padding: compact ? '0 12px' : '0 14px',
          width: compact ? '100%' : undefined,
          justifyContent: compact ? 'space-between' : undefined,
          borderRadius: 12,
          border: '1.5px solid #e4e6ea',
          background: open ? '#eff6ff' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: open ? '#2563eb' : '#191c1e',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        <Globe size={13} strokeWidth={2} />
        <span>{localeLabel} — {currencyLabel}</span>
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          style={{
            color: '#9ca3af',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-[100] overflow-hidden"
          style={{
            width: 280,
            borderRadius: 16,
            background: '#fff',
            border: '1px solid #e4e6ea',
            boxShadow: '0 22px 56px rgba(15,20,35,0.16), 0 0 0 1px rgba(228,230,234,0.9)',
          }}
        >
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {t('header.language')}
            </p>
            <div className="space-y-1">
              {locales.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLocale(item.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-blue-50"
                  style={{
                    background: locale === item.id ? '#eff6ff' : 'transparent',
                    color: locale === item.id ? '#2563eb' : '#374151',
                  }}
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className="text-base leading-none">{item.flag}</span>
                    {item.label}
                  </span>
                  {locale === item.id && <Check size={16} strokeWidth={2.5} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {t('header.currency')}
            </p>
            <div className="space-y-1">
              {currencies.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrency(item.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-blue-50"
                  style={{
                    background: currency === item.id ? '#eff6ff' : 'transparent',
                    color: currency === item.id ? '#2563eb' : '#374151',
                  }}
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ background: '#f3f4f6', color: '#111827' }}
                    >
                      {item.symbol}
                    </span>
                    {item.label}
                  </span>
                  {currency === item.id && <Check size={16} strokeWidth={2.5} className="text-blue-600" />}
                </button>
              ))}
            </div>

            <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] leading-relaxed text-gray-500">
              {ratesLoading ? t('common.loading') : t('currency.rateHint', { rate: usdRate })}
              {ratesDate && !ratesLoading && (
                <span className="block mt-0.5 text-gray-400">
                  {t('currency.nbgSource')} · {ratesDate}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
