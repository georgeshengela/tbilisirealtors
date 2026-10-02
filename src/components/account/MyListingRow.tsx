import { Link } from 'react-router-dom';
import {
  Building2, CheckCircle2, Clock, ExternalLink, Eye, MapPin, MessageSquareWarning, Pencil, Trash2, XCircle,
} from 'lucide-react';
import { useTranslation } from '../../i18n/LocaleContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { listingMoneyFrom } from '../../lib/moneyEntry';
import { formatShortDate } from '../../lib/dateFormat';
import { cloudinarySized } from '../../lib/imageUrl';
import type { MyListing } from '../../pages/account/AccountLayout';
import { card, iconBtn } from './ui';

const STATUS = {
  pending: { key: 'statusPending', icon: Clock, cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  approved: { key: 'statusApproved', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  changes_requested: { key: 'statusChanges', icon: MessageSquareWarning, cls: 'bg-orange-50 text-orange-800 ring-orange-200' },
  rejected: { key: 'statusRejected', icon: XCircle, cls: 'bg-red-50 text-red-700 ring-red-200' },
  draft: { key: 'statusDraft', icon: Clock, cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
} as const;

/** The moderator handed it back — either for fixes or as a rejection; both can be edited and resent. */
export function isSentBack(status: string): boolean {
  return status === 'rejected' || status === 'changes_requested';
}

export function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const meta = STATUS[status as keyof typeof STATUS] ?? STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-bold ring-1 ring-inset ${meta.cls}`}>
      <meta.icon size={13} />
      {t(`account.listings.${meta.key}`)}
    </span>
  );
}

export function ListingPrice({ listing }: { listing: MyListing }) {
  const { formatMoney } = useCurrency();
  const { t } = useTranslation();
  if (!listing.price) return <span className="text-slate-400">—</span>;
  return (
    <span className="font-bold text-slate-900">
      {formatMoney(Number(listing.price), listingMoneyFrom(listing))}
      {listing.status === 'rent' && <span className="text-slate-500 font-semibold">{t('common.perMonth')}</span>}
    </span>
  );
}

function Cover({ listing, className }: { listing: MyListing; className: string }) {
  const src = listing.images?.[0];
  return (
    <div className={`bg-slate-100 overflow-hidden flex-shrink-0 ${className}`}>
      {src
        ? <img src={cloudinarySized(src, 480)} alt="" loading="lazy" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center"><Building2 size={24} className="text-slate-300" /></div>}
    </div>
  );
}

export default function MyListingRow({ listing, onDelete, compact = false }: {
  listing: MyListing;
  onDelete?: (listing: MyListing) => void;
  compact?: boolean;
}) {
  const { t, locale } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.listings.${key}`, vars);
  const place = [listing.district, listing.address].filter(Boolean).join(', ');
  const editHref = `/dashboard/listings/${listing.id}/edit`;

  if (compact) {
    return (
      <Link to={editHref} className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-slate-50 transition">
        <Cover listing={listing} className="w-16 h-12 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">{listing.title}</p>
          <p className="text-xs text-slate-500 truncate">{place || '—'}</p>
        </div>
        <StatusPill status={listing.moderationStatus} />
      </Link>
    );
  }

  return (
    <article className={`${card} p-3 sm:p-4`}>
      <div className="flex gap-3 sm:gap-4">
        <Link to={editHref} className="flex-shrink-0">
          <Cover listing={listing} className="w-24 h-24 sm:w-40 sm:h-[108px] rounded-xl" />
        </Link>

        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <StatusPill status={listing.moderationStatus} />
            <span className="text-[11px] font-mono text-slate-400">#{listing.id}</span>
          </div>

          <Link to={editHref} className="mt-1.5 font-bold text-slate-900 leading-snug line-clamp-2 sm:line-clamp-1 hover:text-blue-700 transition">
            {listing.title}
          </Link>
          {place && (
            <p className="mt-0.5 text-[13px] text-slate-500 truncate inline-flex items-center gap-1">
              <MapPin size={13} className="flex-shrink-0" /> <span className="truncate">{place}</span>
            </p>
          )}

          <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <ListingPrice listing={listing} />
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Eye size={14} /> {tx('views', { count: listing.viewCount ?? 0 })}
            </span>
            <span className="hidden sm:inline text-slate-400">{tx('added', { date: formatShortDate(listing.createdAt, locale) })}</span>
          </div>
        </div>

        <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
          {listing.moderationStatus === 'approved' && (
            <Link to={`/property/${listing.id}`} className={iconBtn} title={tx('view')} aria-label={tx('view')}>
              <ExternalLink size={16} />
            </Link>
          )}
          <Link to={editHref} className={iconBtn} title={tx('edit')} aria-label={tx('edit')}>
            <Pencil size={16} />
          </Link>
          {onDelete && (
            <button type="button" onClick={() => onDelete(listing)} className={`${iconBtn} hover:!text-red-600 hover:!border-red-200`} title={tx('delete')} aria-label={tx('delete')}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {isSentBack(listing.moderationStatus) && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 sm:flex sm:items-center sm:gap-4">
          <div className="flex gap-2.5 min-w-0 flex-1">
            <MessageSquareWarning size={17} className="text-red-600 flex-shrink-0 mt-px" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-red-800">{tx('rejectedNote')}</p>
              <p className="text-sm text-red-700 mt-0.5 break-words">{listing.moderationNote || '—'}</p>
            </div>
          </div>
          <Link to={editHref} className="mt-3 sm:mt-0 inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition flex-shrink-0 w-full sm:w-auto">
            <Pencil size={14} /> {tx('fix')}
          </Link>
        </div>
      )}

      {listing.moderationStatus === 'pending' && (
        <p className="mt-3 text-xs text-amber-800 bg-amber-50/70 rounded-lg px-3 py-2">{tx('pendingHint')}</p>
      )}

      {/* Phones: actions under the card instead of a side column */}
      <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
        {listing.moderationStatus === 'approved' ? (
          <Link to={`/property/${listing.id}`} className="h-9 rounded-lg bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5">
            <ExternalLink size={14} /> {tx('view')}
          </Link>
        ) : <span />}
        <Link to={editHref} className="h-9 rounded-lg bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5">
          <Pencil size={14} /> {tx('edit')}
        </Link>
        {onDelete && (
          <button type="button" onClick={() => onDelete(listing)} className="h-9 rounded-lg bg-slate-50 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5">
            <Trash2 size={14} /> {tx('delete')}
          </button>
        )}
      </div>
    </article>
  );
}
