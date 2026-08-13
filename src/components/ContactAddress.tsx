import { MapPin, ExternalLink } from 'lucide-react';
import { CONTACT } from '../data/contactInfo';
import { useTranslation } from '../i18n/LocaleContext';

interface ContactAddressProps {
  variant?: 'dark' | 'light';
  showMapsHint?: boolean;
  className?: string;
}

export default function ContactAddress({
  variant = 'light',
  showMapsHint = true,
  className = '',
}: ContactAddressProps) {
  const { t } = useTranslation();
  const isDark = variant === 'dark';
  const cityPrefix = t('contactAddress.cityPrefix');

  return (
    <a
      href={CONTACT.googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block transition-colors ${className}`}
      style={{ textDecoration: 'none' }}
    >
      <p
        className={`text-sm font-semibold leading-snug ${isDark ? 'text-white/90' : 'text-slate-800 dark:text-slate-100'} group-hover:text-blue-400 transition-colors`}
      >
        {cityPrefix ? `${cityPrefix} ` : ''}{CONTACT.city}
      </p>
      <p
        className={`text-sm mt-0.5 leading-snug ${isDark ? 'text-white/55' : 'text-slate-500 dark:text-slate-400'} group-hover:text-blue-300/90 transition-colors`}
      >
        {CONTACT.street}
      </p>
      {showMapsHint && (
        <span
          className={`inline-flex items-center gap-1 mt-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            isDark ? 'text-blue-300/80 group-hover:text-blue-200' : 'text-blue-600 group-hover:text-blue-700'
          }`}
        >
          <MapPin size={11} className="flex-shrink-0" />
          {t('contactAddress.mapsHint')}
          <ExternalLink size={10} className="opacity-70" />
        </span>
      )}
    </a>
  );
}
