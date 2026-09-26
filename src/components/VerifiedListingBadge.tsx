import { BadgeCheck } from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext';

type Variant = 'photo' | 'mini' | 'detail' | 'admin' | 'inline';

export default function VerifiedListingBadge({ variant = 'photo' }: { variant?: Variant }) {
  const { t } = useTranslation();
  const title = `${t('property.verifiedListing')}. ${t('property.verifiedListingHint')}`;

  if (variant === 'detail') {
    return (
      <p className="verified-listing verified-listing--detail">
        <BadgeCheck size={18} strokeWidth={2.2} aria-hidden />
        <span>
          <strong>{t('property.verifiedListing')}</strong>
          <em>{t('property.verifiedListingHint')}</em>
        </span>
      </p>
    );
  }

  if (variant === 'admin') {
    return (
      <span className="verified-listing verified-listing--admin" title="ვერიფიცირებული განცხადება. სანდო არჩევანი">
        <BadgeCheck size={11} strokeWidth={2.4} aria-hidden />
        ვერიფიცირებული
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span className="verified-listing verified-listing--inline" title={title}>
        <BadgeCheck size={11} strokeWidth={2.4} aria-hidden />
        {t('common.verified')}
      </span>
    );
  }

  return (
    <span
      className={`verified-listing verified-listing--photo ${variant === 'mini' ? 'is-mini' : ''}`}
      title={title}
    >
      <BadgeCheck size={variant === 'mini' ? 9 : 12} strokeWidth={2.4} aria-hidden />
      {t('common.verified')}
    </span>
  );
}
