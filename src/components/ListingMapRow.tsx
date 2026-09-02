import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bed, Heart, Maximize2, MapPin, Sparkles } from 'lucide-react';
import type { Property } from '../types/listing';
import { formatListedDate } from '../lib/dateFormat';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { propertyHref } from '../lib/seoPropertyUrl';

interface ListingMapRowProps {
  property: Property;
  active?: boolean;
  onHover?: (id: string | null) => void;
  formatPrice: (property: Property) => string;
  formatPricePerSqm: (property: Property) => string;
}

export default function ListingMapRow({
  property,
  active,
  onHover,
  formatPrice,
  formatPricePerSqm,
}: ListingMapRowProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [liked, setLiked] = useState(false);

  const typeLabels: Record<string, string> = {
    apartment: t('propertyTypes.apartment'),
    house: t('propertyTypes.house'),
    villa: t('propertyTypes.villa'),
    commercial: t('propertyTypes.commercial'),
    land: t('propertyTypes.land'),
  };

  return (
    <article
      id={`listing-row-${property.id}`}
      className={`listing-map-row ${active ? 'is-active' : ''}`}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={propertyHref(property)} className="listing-map-row__link">
        <div className="listing-map-row__image">
          <img src={property.images[0]} alt={property.title} loading="lazy" />
          <span className="listing-map-row__scrim" aria-hidden="true" />

          <div className="listing-map-row__badges">
            {property.isPremium && (
              <span className="listing-map-row__badge listing-map-row__badge--vip">
                <Sparkles size={9} fill="currentColor" /> VIP
              </span>
            )}
            {property.isNew && (
              <span className="listing-map-row__badge listing-map-row__badge--new">
                {t('common.new')}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`listing-map-row__like ${liked ? 'is-liked' : ''}`}
            aria-label={t('property.save')}
            aria-pressed={liked}
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              setLiked(v => !v);
            }}
          >
            <Heart size={13} strokeWidth={2.2} />
          </button>

          <div className="listing-map-row__tags">
            <span
              className={`listing-map-row__tag ${
                property.status === 'sale' ? 'is-sale' : 'is-rent'
              }`}
            >
              {property.status === 'sale' ? t('propertyStatus.sale') : t('propertyStatus.rent')}
            </span>
            {typeLabels[property.type] && (
              <span className="listing-map-row__tag is-type">{typeLabels[property.type]}</span>
            )}
          </div>
        </div>

        <div className="listing-map-row__body">
          <div className="listing-map-row__price-row">
            <span className="listing-map-row__price">{formatPrice(property)}</span>
            {property.status === 'sale' && (
              <span className="listing-map-row__sqm">{formatPricePerSqm(property)}</span>
            )}
          </div>

          <div className="listing-map-row__meta">
            <span className="listing-map-row__meta-item">
              <Maximize2 size={12} strokeWidth={2} />
              <strong>{property.area}</strong> მ²
            </span>
            {property.bedrooms > 0 && (
              <span className="listing-map-row__meta-item">
                <Bed size={13} strokeWidth={2} />
                <strong>{property.bedrooms}</strong> {t('property.bedsShort')}
              </span>
            )}
            {property.floor != null && property.totalFloors != null && (
              <span className="listing-map-row__meta-item">
                <strong>{property.floor}/{property.totalFloors}</strong> {t('property.floorShort')}
              </span>
            )}
          </div>

          <p className="listing-map-row__address">
            <MapPin size={12} strokeWidth={2.2} />
            <span>{property.address || `${property.district}, ${property.city}`}</span>
          </p>

          <div className="listing-map-row__footer">
            <span className="listing-map-row__id" title={`ID ${property.id}`}>
              #{property.id}
            </span>
            <span className="listing-map-row__date">
              {formatListedDate(property.listedDate, locale, t)}
            </span>
            <span className="listing-map-row__cta">
              {t('property.details')}
              <ArrowUpRight size={13} strokeWidth={2.6} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
