/**
 * Compact listing tile for the account overview — one shape for "my recent
 * listings" and "recently saved", so the two sections line up in the same grid.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Building2, Eye, Heart, MapPin, Maximize2, Plus } from 'lucide-react';
import { cloudinarySized } from '../../lib/imageUrl';

interface MiniListingCardProps {
  href: string;
  image?: string | null;
  price: ReactNode;
  title: string;
  place?: string;
  area?: number | string | null;
  rooms?: number | null;
  views?: number | null;
  /** Top-left overlay, e.g. a moderation status. */
  badge?: ReactNode;
  /** Saved listings get a filled heart that removes them. */
  onUnsave?: () => void;
  unsaveLabel?: string;
}

export default function MiniListingCard({
  href, image, price, title, place, area, rooms, views, badge, onUnsave, unsaveLabel,
}: MiniListingCardProps) {
  const areaNum = Number(area);
  return (
    <article className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition">
      <Link to={href} className="relative block aspect-[16/10] bg-slate-100 overflow-hidden">
        {image
          ? <img src={cloudinarySized(image, 520)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          : <span className="absolute inset-0 flex items-center justify-center"><Building2 size={28} className="text-slate-300" /></span>}
        {badge && <span className="absolute top-2.5 left-2.5">{badge}</span>}
      </Link>

      {onUnsave && (
        <button
          type="button"
          onClick={onUnsave}
          aria-label={unsaveLabel}
          title={unsaveLabel}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-red-500 hover:scale-105 transition"
        >
          <Heart size={17} fill="currentColor" />
        </button>
      )}

      <Link to={href} className="flex-1 flex flex-col p-3.5">
        <div className="text-[17px] font-bold text-slate-900 leading-tight">{price}</div>
        <p className="mt-1 text-[13.5px] font-semibold text-slate-700 leading-snug line-clamp-2 min-h-[2.6em]">{title}</p>
        {place && (
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1 min-w-0">
            <MapPin size={12} className="flex-shrink-0" /><span className="truncate">{place}</span>
          </p>
        )}
        {(areaNum > 0 || Number(rooms) > 0 || views != null) && (
          <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-slate-500 border-t border-slate-100 mt-3">
            {areaNum > 0 && <span className="inline-flex items-center gap-1"><Maximize2 size={12} />{Math.round(areaNum)} მ²</span>}
            {Number(rooms) > 0 && <span className="inline-flex items-center gap-1"><BedDouble size={12} />{rooms}</span>}
            {views != null && <span className="inline-flex items-center gap-1 ml-auto"><Eye size={12} />{views}</span>}
          </div>
        )}
      </Link>
    </article>
  );
}

/** Dashed tile that sits in the grid where a missing card would be. */
export function AddListingTile({ href, label, hint, className = '' }: { href: string; label: string; hint?: string; className?: string }) {
  return (
    <Link
      to={href}
      className={`min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition p-6 text-center ${className || 'flex'}`}
    >
      <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><Plus size={22} /></span>
      <span className="text-sm font-bold">{label}</span>
      {hint && <span className="text-xs text-slate-400 max-w-[200px] leading-relaxed">{hint}</span>}
    </Link>
  );
}
