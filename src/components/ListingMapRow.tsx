import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, ChevronLeft, ChevronRight, Heart, Layers, MapPin, Maximize2, Sparkles, Star } from 'lucide-react';
import type { Property } from '../types/listing';
import { formatListedDate } from '../lib/dateFormat';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { propertyHref } from '../lib/seoPropertyUrl';
import { listingIsVerified } from '../lib/listingBadges';
import { useIsFavorite } from '../lib/favorites';
import VerifiedListingBadge from './VerifiedListingBadge';

interface ListingMapRowProps {
  property: Property;
  active?: boolean;
  onHover?: (id: string | null) => void;
  formatPrice: (property: Property) => string;
  formatPricePerSqm: (property: Property) => string;
}

const MAX_PHOTOS = 6;

export default function ListingMapRow({
  property,
  active,
  onHover,
  formatPrice,
  formatPricePerSqm,
}: ListingMapRowProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [liked, toggleLiked] = useIsFavorite(property.id);
  const trackRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState(0);

  const photos = property.images.slice(0, MAX_PHOTOS);
  const rooms = property.rooms || property.bedrooms;

  const statusLabel: Record<Property['status'], string> = {
    sale: t('propertyStatus.sale'),
    rent: t('propertyStatus.rent'),
    daily_rent: t('propertyStatus.daily_rent'),
    pledge: t('home.dealTypes.mortgage'),
    both: `${t('propertyStatus.sale')} / ${t('propertyStatus.rent')}`,
  };
  const typeLabel: Record<string, string> = {
    apartment: t('propertyTypes.apartment'),
    house: t('propertyTypes.house'),
    villa: t('propertyTypes.villa'),
    commercial: t('propertyTypes.commercial'),
    land: t('propertyTypes.land'),
    hotel: t('home.propertyTypes.hotel'),
  };

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setPhoto(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
  }, []);

  const step = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = trackRef.current;
    if (!el) return;
    const next = Math.min(Math.max(photo + dir, 0), photos.length - 1);
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <article
      id={`listing-row-${property.id}`}
      className={`lc ${active ? 'is-active' : ''}`}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={propertyHref(property)} className="lc__link">
        <div className="lc__media">
          <div className="lc__track" ref={trackRef} onScroll={onScroll}>
            {photos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={i === 0 ? property.title : ''}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
          <span className="lc__scrim" aria-hidden />

          {photos.length > 1 && (
            <>
              <button type="button" className="lc__nav lc__nav--prev" onClick={step(-1)} disabled={photo === 0} aria-label={t('home.prev')} tabIndex={-1}>
                <ChevronLeft size={16} strokeWidth={2.6} />
              </button>
              <button type="button" className="lc__nav lc__nav--next" onClick={step(1)} disabled={photo >= photos.length - 1} aria-label={t('home.next')} tabIndex={-1}>
                <ChevronRight size={16} strokeWidth={2.6} />
              </button>
              <div className="lc__dots" aria-hidden>
                {photos.map((_, i) => <span key={i} className={i === photo ? 'is-on' : ''} />)}
              </div>
            </>
          )}

          <div className="lc__badges">
            {/* Same badges as the home page: featured = SUPER VIP, premium = VIP. */}
            {property.isFeatured ? (
              <span className="lc__badge lc__badge--vip"><Star size={10} strokeWidth={2.6} fill="currentColor" /> {t('home.superVip')}</span>
            ) : property.isPremium ? (
              <span className="lc__badge lc__badge--vip"><Star size={10} strokeWidth={2.6} fill="currentColor" /> VIP</span>
            ) : null}
            {property.isNew && (
              <span className="lc__badge lc__badge--new"><Sparkles size={10} strokeWidth={2.6} /> {t('common.new')}</span>
            )}
            {listingIsVerified(property) && <VerifiedListingBadge variant="inline" />}
          </div>

          <button
            type="button"
            className={`lc__like ${liked ? 'is-on' : ''}`}
            aria-label={liked ? t('home.unsaveListing') : t('home.saveListing')}
            aria-pressed={liked}
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              toggleLiked();
            }}
          >
            <Heart size={15} strokeWidth={2.2} />
          </button>

          <div className="lc__tags">
            <span className={`lc__tag lc__tag--${property.status}`}>{statusLabel[property.status] ?? property.status}</span>
            {typeLabel[property.type] && <span className="lc__tag">{typeLabel[property.type]}</span>}
          </div>
        </div>

        <div className="lc__body">
          <div className="lc__price-row">
            <span className="lc__price">{formatPrice(property)}</span>
            {(property.status === 'sale' || property.status === 'pledge') && property.area > 0 && (
              <span className="lc__sqm">{formatPricePerSqm(property)}</span>
            )}
          </div>

          <p className="lc__title">{property.title}</p>

          <ul className="lc__facts">
            {rooms > 0 && (
              <li><BedDouble size={14} strokeWidth={2} /><strong>{rooms}</strong> {t('listings.bar.roomsShort')}</li>
            )}
            {property.area > 0 && (
              <li><Maximize2 size={13} strokeWidth={2} /><strong>{Math.round(property.area * 10) / 10}</strong> {t('home.areaUnit')}</li>
            )}
            {property.floor != null && property.totalFloors != null && (
              <li><Layers size={13} strokeWidth={2} /><strong>{property.floor}/{property.totalFloors}</strong> {t('property.floorShort')}</li>
            )}
          </ul>

          <p className="lc__address">
            <MapPin size={13} strokeWidth={2.2} />
            <span>{property.address || [property.district, property.city].filter(Boolean).join(', ')}</span>
          </p>

          <div className="lc__foot">
            <span className="lc__id">#{property.id}</span>
            <span className="lc__date">{formatListedDate(property.listedDate, locale, t)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
