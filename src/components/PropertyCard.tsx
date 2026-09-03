import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, MapPin, Bed, Bath, Square, Sparkles, ArrowUpRight } from 'lucide-react';
import type { Property } from '../types/listing';
import { useCurrency } from '../contexts/CurrencyContext';
import { listingMoneyFrom } from '../lib/moneyEntry';
import { useIsFavorite } from '../lib/favorites';
import { useTranslation } from '../i18n/LocaleContext';
import { personInitials } from '../lib/personInitials';
import { propertyHref, withEmbedQuery } from '../lib/seoPropertyUrl';

function useListingHref() {
  const location = useLocation();
  const embed = new URLSearchParams(location.search).get('embed') === '1';
  return (property: Property) => withEmbedQuery(propertyHref(property), embed);
}

interface PropertyCardProps {
  property: Property;
  variant?: 'default' | 'horizontal';
}

function usePropertyLabels() {
  const { t } = useTranslation();
  return {
    typeLabels: {
      apartment: t('propertyTypes.apartment'),
      house: t('propertyTypes.house'),
      villa: t('propertyTypes.villa'),
      commercial: t('propertyTypes.commercial'),
      land: t('propertyTypes.land'),
    } as Record<string, string>,
    statusSale: t('propertyStatus.sale'),
    statusRent: t('propertyStatus.rent'),
    premium: t('common.premium'),
    isNew: t('common.new'),
    floor: t('property.floor'),
  };
}

function useFormatPropertyPrice() {
  const { formatMoney } = useCurrency();
  return (property: Property) =>
    formatMoney(property.price, { ...listingMoneyFrom(property), perMonth: property.status === 'rent' });
}

/* ─────────────────────────────────────────────────────── Default card ── */
export default function PropertyCard({ property, variant = 'default' }: PropertyCardProps) {
  const [liked, toggleLike] = useIsFavorite(property.id);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const labels = usePropertyLabels();
  const formatPrice = useFormatPropertyPrice();
  const { formatMoney } = useCurrency();
  const href = useListingHref()(property);

  if (variant === 'horizontal') return <HorizontalCard property={property} />;

  return (
    <div
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${hovered ? 'rgba(37, 99, 235,0.35)' : '#eceef0'}`,
        transition: 'border-color 0.25s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image area ── */}
      <Link to={href} className="relative block overflow-hidden" style={{ aspectRatio: '5/4' }}>
        {/* Skeleton */}
        {!imgLoaded && <div className="absolute inset-0 skeleton" />}

        {/* Photo */}
        <img
          src={property.images[0]}
          alt={property.title}
          onLoad={() => setImgLoaded(true)}
          className="w-full h-full object-cover"
          style={{
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Base gradient — always visible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(10,13,20,0.68) 0%, rgba(10,13,20,0.14) 45%, transparent 100%)',
          }}
        />

        {/* ── Top-left badges ── */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {property.isPremium && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(15,13,10,0.80)', color: '#f5c542', backdropFilter: 'blur(8px)', border: '1px solid rgba(245,197,66,0.30)' }}
            >
              <Sparkles size={9} fill="currentColor" /> {labels.premium}
            </span>
          )}
          {property.isNew && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
            >
              {labels.isNew}
            </span>
          )}
        </div>

        {/* ── Heart ── */}
        <button
          onClick={e => { e.preventDefault(); toggleLike(); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
          style={{
            background: liked ? '#ef4444' : 'rgba(255,255,255,0.92)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.16)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Heart size={14} strokeWidth={2} style={{ color: liked ? '#fff' : '#45464d', fill: liked ? '#fff' : 'none' }} />
        </button>

        {/* ── Status chips bottom-left ── */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: property.status === 'sale' ? 'rgba(25,28,30,0.85)' : 'rgba(37, 99, 235,0.9)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            {property.status === 'sale' ? labels.statusSale : labels.statusRent}
          </span>
          <span
            className="px-2 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#45464d', backdropFilter: 'blur(8px)' }}
          >
            {labels.typeLabels[property.type]}
          </span>
        </div>
      </Link>

      {/* ── Content ── */}
      <Link to={href} className="flex flex-col flex-1 p-4">

        {/* Price row */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span
              className="font-bold tracking-tight"
              style={{ fontSize: 20, color: '#191c1e', lineHeight: 1.1 }}
            >
              {formatPrice(property)}
            </span>
            {property.status === 'sale' && (
              <span
                className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: '#f0f2f5', color: '#76777d' }}
              >
                {formatMoney(property.pricePerSqm, { ...listingMoneyFrom(property), perSqm: true })}
              </span>
            )}
          </div>
          {property.floor && (
            <span className="text-[11px] font-semibold" style={{ color: '#9ea0a7' }}>
              {property.floor}/{property.totalFloors} {labels.floor}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-semibold line-clamp-2 leading-snug mb-2 transition-colors duration-200"
          style={{ fontSize: 13.5, color: hovered ? '#2563eb' : '#191c1e' }}
        >
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mb-3" style={{ color: '#9ea0a7' }}>
          <MapPin size={11} strokeWidth={2} style={{ color: '#2563eb', flexShrink: 0 }} />
          <span className="text-[12px] font-medium truncate">{property.district}, {property.city}</span>
        </div>

        {/* Divider */}
        <div className="mt-auto">
          <div className="h-px mb-3" style={{ background: '#f0f2f5' }} />

          {/* Stats + Agent */}
          <div className="flex items-center gap-0">
            {(property.rooms || property.bedrooms) > 0 && (
              <div className="flex items-center gap-1 pr-3" style={{ borderRight: '1px solid #f0f2f5' }}>
                <Bed size={12} strokeWidth={2} style={{ color: '#b0b2ba' }} />
                <span className="text-[12px] font-bold" style={{ color: '#191c1e' }}>{property.rooms || property.bedrooms}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-3" style={{ borderRight: '1px solid #f0f2f5' }}>
              <Bath size={12} strokeWidth={2} style={{ color: '#b0b2ba' }} />
              <span className="text-[12px] font-bold" style={{ color: '#191c1e' }}>{property.bathrooms}</span>
            </div>
            <div className="flex items-center gap-1 px-3">
              <Square size={12} strokeWidth={2} style={{ color: '#b0b2ba' }} />
              <span className="text-[12px] font-bold" style={{ color: '#191c1e' }}>{property.area}მ²</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {property.agent.photo ? (
                <img
                  src={property.agent.photo}
                  alt={property.agent.name}
                  className="w-6 h-6 rounded-full object-cover"
                  style={{ border: '1.5px solid #e8eaed' }}
                />
              ) : (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                  style={{ background: '#0f172a', border: '1.5px solid #e8eaed' }}
                  aria-hidden
                >
                  {personInitials(property.agent.name)}
                </span>
              )}
              <ArrowUpRight
                size={14}
                strokeWidth={2.5}
                style={{ color: hovered ? '#2563eb' : '#c0c2ca', transition: 'color 0.2s ease' }}
              />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────── Horizontal / list card ── */
function HorizontalCard({ property }: { property: Property }) {
  const [liked, toggleLike] = useIsFavorite(property.id);
  const { t } = useTranslation();
  const labels = usePropertyLabels();
  const formatPrice = useFormatPropertyPrice();
  const { formatMoney } = useCurrency();
  const href = useListingHref()(property);
  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden flex"
      style={{
        border: '1px solid #eceef0',
        transition: 'border-color 0.25s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37, 99, 235,0.35)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#eceef0'; }}
    >
      {/* Image */}
      <Link to={href} className="w-52 sm:w-72 flex-shrink-0 relative overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.08))' }} />
        {property.isPremium && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(15,13,10,0.80)', color: '#f5c542', backdropFilter: 'blur(8px)' }}>
            <Sparkles size={9} fill="currentColor" /> {labels.premium}
          </span>
        )}
        <span
          className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: property.status === 'sale' ? 'rgba(25,28,30,0.85)' : 'rgba(37, 99, 235,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {property.status === 'sale' ? labels.statusSale : labels.statusRent}
        </span>
      </Link>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="font-bold" style={{ fontSize: 20, color: '#191c1e' }}>
              {formatPrice(property)}
            </span>
            {property.status === 'sale' && (
              <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#f0f2f5', color: '#76777d' }}>
                {formatMoney(property.pricePerSqm, { ...listingMoneyFrom(property), perSqm: true })}
              </span>
            )}
          </div>
          <button
            onClick={toggleLike}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 flex-shrink-0"
            style={{ border: `1.5px solid ${liked ? '#ef4444' : '#eceef0'}`, background: liked ? '#ef4444' : '#fff' }}
          >
            <Heart size={14} strokeWidth={2} style={{ color: liked ? '#fff' : '#76777d', fill: liked ? '#fff' : 'none' }} />
          </button>
        </div>

        <Link to={href}>
          <h3 className="font-semibold text-[#191c1e] hover:text-[#2563eb] transition-colors mb-1.5" style={{ fontSize: 15 }}>
            {property.title}
          </h3>
        </Link>
        <p className="flex items-center gap-1 mb-3" style={{ fontSize: 12, color: '#76777d' }}>
          <MapPin size={11} strokeWidth={2} style={{ color: '#2563eb' }} />
          {property.district}, {property.city}
        </p>
        <p className="line-clamp-2 flex-1 mb-4" style={{ fontSize: 13, color: '#45464d' }}>{property.description}</p>

        <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid #f0f2f5', fontSize: 12, color: '#45464d' }}>
          {(property.rooms || property.bedrooms) > 0 && (
            <span className="flex items-center gap-1">
              <Bed size={13} strokeWidth={1.8} style={{ color: '#b0b2ba' }} />
              <strong style={{ color: '#191c1e' }}>{property.rooms || property.bedrooms}</strong> {t('property.bedsShort')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bath size={13} strokeWidth={1.8} style={{ color: '#b0b2ba' }} />
            <strong style={{ color: '#191c1e' }}>{property.bathrooms}</strong> {t('property.bathsShort')}
          </span>
          <span className="flex items-center gap-1">
            <Square size={13} strokeWidth={1.8} style={{ color: '#b0b2ba' }} />
            <strong style={{ color: '#191c1e' }}>{property.area}</strong> მ²
          </span>
          {property.floor && (
            <span style={{ color: '#9ea0a7' }}>{property.floor}/{property.totalFloors} {t('property.floorShort')}</span>
          )}
          <Link
            to={href}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors duration-200"
            style={{ background: '#191c1e' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2563eb'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#191c1e'; }}
          >
            {t('property.viewDetails')} <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
