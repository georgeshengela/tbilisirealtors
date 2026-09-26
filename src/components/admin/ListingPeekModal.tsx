import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, X } from 'lucide-react';
import { propertyHref, withEmbedQuery, type PropertyUrlInput } from '../../lib/seoPropertyUrl';

export default function ListingPeekModal({
  listing,
  onClose,
  onEdit,
}: {
  listing: PropertyUrlInput;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = withEmbedQuery(propertyHref(listing), true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-5">
      <button type="button" className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" onClick={onClose} aria-label="დახურვა" />
      <div className="relative flex h-[96vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_rgba(15,23,42,0.4)]">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600">
            #{listing.id}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
            {listing.title || 'განცხადება'}
          </p>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Pencil size={13} />
              რედაქტირება
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="დახურვა"
          >
            <X size={18} />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-slate-50">
          {!loaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-slate-400">
              <Loader2 size={28} className="animate-spin" />
            </div>
          )}
          <iframe
            title={listing.title || listing.id}
            src={src}
            className="h-full w-full border-0"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
