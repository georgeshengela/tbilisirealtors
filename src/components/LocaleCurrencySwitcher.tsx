import { useLocale } from '../i18n/LocaleContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { DisplayCurrency, Locale } from '../i18n/types';
import { LocaleFlag } from './icons/LocaleMarks';

interface LocaleCurrencySwitcherProps {
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'ghost' | 'utility';
}

export default function LocaleCurrencySwitcher({
  className = '',
  compact = false,
  variant = 'default',
}: LocaleCurrencySwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const { currency, setCurrency } = useCurrency();

  const locales: { id: Locale; code: string }[] = [
    { id: 'ka', code: 'KA' },
    { id: 'en', code: 'EN' },
  ];

  const currencies: { id: DisplayCurrency; code: string }[] = [
    { id: 'GEL', code: '₾' },
    { id: 'USD', code: '$' },
  ];

  return (
    <div
      className={`lc-switch lc-switch--${variant} ${compact ? 'is-compact' : ''} ${className}`}
      role="group"
      aria-label={`${t('header.language')}, ${t('header.currency')}`}
    >
      <div className="lc-switch__group" role="radiogroup" aria-label={t('header.language')}>
        {locales.map((item, index) => (
          <span key={item.id} className="lc-switch__unit">
            {index > 0 && <span className="lc-switch__sep" aria-hidden="true">/</span>}
            <button
              type="button"
              role="radio"
              aria-checked={locale === item.id}
              className={`lc-switch__opt ${locale === item.id ? 'is-on' : ''}`}
              onClick={() => setLocale(item.id)}
            >
              <LocaleFlag locale={item.id} />
              {item.code}
            </button>
          </span>
        ))}
      </div>

      <span className="lc-switch__dot" aria-hidden="true" />

      <div className="lc-switch__group" role="radiogroup" aria-label={t('header.currency')}>
        {currencies.map((item, index) => (
          <span key={item.id} className="lc-switch__unit">
            {index > 0 && <span className="lc-switch__sep" aria-hidden="true">/</span>}
            <button
              type="button"
              role="radio"
              aria-checked={currency === item.id}
              className={`lc-switch__opt ${currency === item.id ? 'is-on' : ''}`}
              onClick={() => setCurrency(item.id)}
            >
              {item.code}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
