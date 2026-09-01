import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale } from '../i18n/LocaleContext';
import type { DisplayCurrency } from '../i18n/types';

interface PriceCurrencyToggleProps {
  className?: string;
  /** Show a tiny NBG rate under the switcher. */
  showRate?: boolean;
  align?: 'start' | 'end';
}

/**
 * Segmented $ / ₾ control for property detail prices.
 * Writes into CurrencyContext so every formatMoney call on the page updates.
 */
export default function PriceCurrencyToggle({
  className = '',
  showRate = true,
  align = 'end',
}: PriceCurrencyToggleProps) {
  const { currency, setCurrency, rates, ratesDate, ratesLoading } = useCurrency();
  const { t } = useLocale();

  const options: { id: DisplayCurrency; symbol: string; label: string }[] = [
    { id: 'USD', symbol: '$', label: t('currency.usdShort') },
    { id: 'GEL', symbol: '₾', label: t('currency.gelShort') },
  ];

  const usdRate = rates.USD?.toFixed(4) ?? '—';
  const rateHint = ratesLoading
    ? t('common.loading')
    : t('currency.rateHint', { rate: usdRate });

  return (
    <div
      className={`price-fx ${align === 'start' ? 'is-start' : 'is-end'} ${className}`}
    >
      <div
        className="price-fx__track"
        role="radiogroup"
        aria-label={t('header.currency')}
      >
        <span
          className="price-fx__thumb"
          style={{ transform: currency === 'USD' ? 'translateX(0)' : 'translateX(100%)' }}
          aria-hidden="true"
        />
        {options.map(opt => {
          const on = currency === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`price-fx__opt ${on ? 'is-on' : ''}`}
              onClick={() => setCurrency(opt.id)}
            >
              <span className="price-fx__symbol">{opt.symbol}</span>
              <span className="price-fx__code">{opt.id}</span>
            </button>
          );
        })}
      </div>

      {showRate && (
        <p
          className="price-fx__hint"
          title={ratesDate ? `${t('currency.nbgSource')} · ${ratesDate}` : t('currency.nbgSource')}
        >
          {rateHint}
        </p>
      )}
    </div>
  );
}
