/** SVG marks that render on Windows. Emoji flags (🇬🇪 🇬🇧) do not. */

export function FlagGeorgia({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false">
      <rect width="36" height="24" fill="#fff" />
      <rect x="15" width="6" height="24" fill="#E8112D" />
      <rect y="9" width="36" height="6" fill="#E8112D" />
      <g fill="#E8112D">
        <rect x="6.5" y="2.2" width="2.2" height="6.2" />
        <rect x="4.5" y="4.2" width="6.2" height="2.2" />
        <rect x="27.3" y="2.2" width="2.2" height="6.2" />
        <rect x="25.3" y="4.2" width="6.2" height="2.2" />
        <rect x="6.5" y="15.6" width="2.2" height="6.2" />
        <rect x="4.5" y="17.6" width="6.2" height="2.2" />
        <rect x="27.3" y="15.6" width="2.2" height="6.2" />
        <rect x="25.3" y="17.6" width="6.2" height="2.2" />
      </g>
    </svg>
  );
}

export function FlagUnitedKingdom({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false">
      <rect width="36" height="24" fill="#012169" />
      <path d="M0 0 L36 24 M36 0 L0 24" stroke="#fff" strokeWidth="4.8" />
      <path d="M0 0 L36 24" stroke="#C8102E" strokeWidth="2.4" />
      <path d="M36 0 L0 24" stroke="#C8102E" strokeWidth="2.4" />
      <path d="M18 0 V24 M0 12 H36" stroke="#fff" strokeWidth="8" />
      <path d="M18 0 V24 M0 12 H36" stroke="#C8102E" strokeWidth="4.8" />
    </svg>
  );
}

export function GelMark({ className = '' }: { className?: string }) {
  return (
    <span className={`currency-chip currency-chip--gel ${className}`} aria-hidden="true">
      ₾
    </span>
  );
}

export function UsdMark({ className = '' }: { className?: string }) {
  return (
    <span className={`currency-chip currency-chip--usd ${className}`} aria-hidden="true">
      $
    </span>
  );
}

export function LocaleFlag({ locale, className = '' }: { locale: 'ka' | 'en'; className?: string }) {
  return (
    <span className={`flag-chip ${className}`}>
      {locale === 'ka' ? <FlagGeorgia /> : <FlagUnitedKingdom />}
    </span>
  );
}

export function CurrencyMark({ currency, className = '' }: { currency: 'GEL' | 'USD'; className?: string }) {
  return currency === 'GEL' ? <GelMark className={className} /> : <UsdMark className={className} />;
}
