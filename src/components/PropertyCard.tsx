import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Bed, Bath, Square, Sparkles, ArrowUpRight } from 'lucide-react';
import type { Property } from '../data/mockData';

interface PropertyCardProps {
  property: Property;
  variant?: 'default' | 'horizontal';
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა', house: 'სახლი', villa: 'ვილა',
  commercial: 'კომერც.', land: 'მიწა',
};

function formatPrice(price: number, status: string) {
  if (status === 'rent') return `₾${price.toLocaleString()}/თვ.`;
  return `₾${price.toLocaleString()}`;
}

/* ─────────────────────────────────────────────────────── Default card ── */
export default function PropertyCard({ property, variant = 'default' }: PropertyCardProps) {
  const [liked, setLiked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  if (variant === 'horizontal') return <HorizontalCard property={property} />;

  return (
    <div
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: hovered
          ? '0 10px 32px rgba(15,23,42,0.12), 0 0 0 1px rgba(73,124,255,0.35)'
          : '0 2px 12px rgba(15,23,42,0.06), 0 0 0 1px #eceef0',
        transition: 'box-shadow 0.25s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image area ── */}
      <Link to={`/property/${property.id}`} className="relative block overflow-hidden" style={{ aspectRatio: '4/3' }}>
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
              <Sparkles size={9} fill="currentColor" /> პრემიუმ
            </span>
          )}
          {property.isNew && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
            >
              ახალი
            </span>
          )}
        </div>

        {/* ── Heart ── */}
        <button
          onClick={e => { e.preventDefault(); setLiked(l => !l); }}
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
              background: property.status === 'sale' ? 'rgba(25,28,30,0.85)' : 'rgba(73,124,255,0.9)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            {property.status === 'sale' ? 'იყიდება' : 'ქირავდება'}
          </span>
          <span
            className="px-2 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#45464d', backdropFilter: 'blur(8px)' }}
          >
            {TYPE_LABELS[property.type]}
          </span>
        </div>
      </Link>

      {/* ── Content ── */}
      <Link to={`/property/${property.id}`} className="flex flex-col flex-1 p-4">

        {/* Price row */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span
              className="font-bold tracking-tight"
              style={{ fontSize: 20, color: '#191c1e', lineHeight: 1.1 }}
            >
              {formatPrice(property.price, property.status)}
            </span>
            {property.status === 'sale' && (
              <span
                className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: '#f0f2f5', color: '#76777d' }}
              >
                ₾{property.pricePerSqm.toLocaleString()}/მ²
              </span>
            )}
          </div>
          {property.floor && (
            <span className="text-[11px] font-semibold" style={{ color: '#9ea0a7' }}>
              {property.floor}/{property.totalFloors} სართ.
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-semibold line-clamp-2 leading-snug mb-2 transition-colors duration-200"
          style={{ fontSize: 13.5, color: hovered ? '#497cff' : '#191c1e' }}
        >
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mb-3" style={{ color: '#9ea0a7' }}>
          <MapPin size={11} strokeWidth={2} style={{ color: '#497cff', flexShrink: 0 }} />
          <span className="text-[12px] font-medium truncate">{property.district}, {property.city}</span>
        </div>

        {/* Divider */}
        <div className="mt-auto">
          <div className="h-px mb-3" style={{ background: '#f0f2f5' }} />

          {/* Stats + Agent */}
          <div className="flex items-center gap-0">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1 pr-3" style={{ borderRight: '1px solid #f0f2f5' }}>
                <Bed size={12} strokeWidth={2} style={{ color: '#b0b2ba' }} />
                <span className="text-[12px] font-bold" style={{ color: '#191c1e' }}>{property.bedrooms}</span>
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
              <img
                src={property.agent.photo}
                alt={property.agent.name}
                className="w-6 h-6 rounded-full object-cover"
                style={{ border: '1.5px solid #e8eaed' }}
              />
              <ArrowUpRight
                size={14}
                strokeWidth={2.5}
                style={{ color: hovered ? '#497cff' : '#c0c2ca', transition: 'color 0.2s ease' }}
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
  const [liked, setLiked] = useState(false);
  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden flex"
      style={{
        boxShadow: '0 2px 12px rgba(15,23,42,0.06), 0 0 0 1px #eceef0',
        transition: 'box-shadow 0.25s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 32px rgba(15,23,42,0.12), 0 0 0 1px rgba(73,124,255,0.35)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(15,23,42,0.06), 0 0 0 1px #eceef0'; }}
    >
      {/* Image */}
      <Link to={`/property/${property.id}`} className="w-52 sm:w-72 flex-shrink-0 relative overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.08))' }} />
        {property.isPremium && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(15,13,10,0.80)', color: '#f5c542', backdropFilter: 'blur(8px)' }}>
            <Sparkles size={9} fill="currentColor" /> პრემიუმ
          </span>
        )}
        <span
          className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: property.status === 'sale' ? 'rgba(25,28,30,0.85)' : 'rgba(73,124,255,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {property.status === 'sale' ? 'იყიდება' : 'ქირავდება'}
        </span>
      </Link>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="font-bold" style={{ fontSize: 20, color: '#191c1e' }}>
              {formatPrice(property.price, property.status)}
            </span>
            {property.status === 'sale' && (
              <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#f0f2f5', color: '#76777d' }}>
                ₾{property.pricePerSqm.toLocaleString()}/მ²
              </span>
            )}
          </div>
          <button
            onClick={() => setLiked(l => !l)}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 flex-shrink-0"
            style={{ border: `1.5px solid ${liked ? '#ef4444' : '#eceef0'}`, background: liked ? '#ef4444' : '#fff' }}
          >
            <Heart size={14} strokeWidth={2} style={{ color: liked ? '#fff' : '#76777d', fill: liked ? '#fff' : 'none' }} />
          </button>
        </div>

        <Link to={`/property/${property.id}`}>
          <h3 className="font-semibold text-[#191c1e] hover:text-[#497cff] transition-colors mb-1.5" style={{ fontSize: 15 }}>
            {property.title}
          </h3>
        </Link>
        <p className="flex items-center gap-1 mb-3" style={{ fontSize: 12, color: '#76777d' }}>
          <MapPin size={11} strokeWidth={2} style={{ color: '#497cff' }} />
          {property.district}, {property.city}
        </p>
        <p className="line-clamp-2 flex-1 mb-4" style={{ fontSize: 13, color: '#45464d' }}>{property.description}</p>

        <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid #f0f2f5', fontSize: 12, color: '#45464d' }}>
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed size={13} strokeWidth={1.8} style={{ color: '#b0b2ba' }} />
              <strong style={{ color: '#191c1e' }}>{property.bedrooms}</strong> საძ.
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bath size={13} strokeWidth={1.8} style={{ color: '#b0b2ba' }} />
            <strong style={{ color: '#191c1e' }}>{property.bathrooms}</strong> სველ.
          </span>
          <span className="flex items-center gap-1">
            <Square size={13} strokeWidth={1.8} style={{ color: '#b0b2ba' }} />
            <strong style={{ color: '#191c1e' }}>{property.area}</strong> მ²
          </span>
          {property.floor && (
            <span style={{ color: '#9ea0a7' }}>{property.floor}/{property.totalFloors} სართ.</span>
          )}
          <Link
            to={`/property/${property.id}`}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors duration-200"
            style={{ background: '#191c1e' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#497cff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#191c1e'; }}
          >
            დეტ. ნახვა <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
