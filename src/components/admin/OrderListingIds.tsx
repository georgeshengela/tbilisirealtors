import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Image as ImageIcon, Loader2, Plus, X } from 'lucide-react';
import { useApiRequest } from '../../contexts/AdminAuthContext';
import type { PropertyUrlInput } from '../../lib/seoPropertyUrl';
import ListingPeekModal from './ListingPeekModal';

export type OrderListingCard = PropertyUrlInput & {
  title?: string | null;
  images?: string[] | null;
};

function normalizeId(raw: string): string {
  return raw.trim().replace(/^#/, '').slice(0, 50);
}

function parseIds(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map(normalizeId)
    .filter(id => id.length >= 4);
}

function toCard(row: Record<string, unknown>): OrderListingCard {
  return {
    id: String(row.id ?? ''),
    title: typeof row.title === 'string' ? row.title : '',
    images: Array.isArray(row.images) ? row.images.filter((u): u is string => typeof u === 'string') : [],
    status: typeof row.status === 'string' ? row.status : null,
    type: typeof row.type === 'string' ? row.type : null,
    rooms: typeof row.rooms === 'number' ? row.rooms : null,
    bedrooms: typeof row.bedrooms === 'number' ? row.bedrooms : null,
    district: typeof row.district === 'string' ? row.district : null,
    city: typeof row.city === 'string' ? row.city : null,
    address: typeof row.address === 'string' ? row.address : null,
    area: row.area as string | number | null,
    price: row.price as string | number | null,
    rentPrice: row.rentPrice as string | number | null,
    priceCurrency: typeof row.priceCurrency === 'string' ? row.priceCurrency : null,
  };
}

export function useOrderListings(ids: string[]) {
  const api = useApiRequest();
  const [byId, setById] = useState<Record<string, OrderListingCard | null>>({});
  const key = ids.join(',');

  useEffect(() => {
    const unique = [...new Set(ids.map(normalizeId).filter(Boolean))];
    if (!unique.length) return;
    let cancelled = false;
    api(`/properties?ids=${encodeURIComponent(unique.join(','))}&limit=80`)
      .then((data: { data?: Record<string, unknown>[] }) => {
        if (cancelled) return;
        const next: Record<string, OrderListingCard | null> = {};
        for (const id of unique) next[id] = null;
        for (const row of data.data ?? []) {
          const card = toCard(row);
          if (card.id) next[card.id] = card;
        }
        setById(prev => ({ ...prev, ...next }));
      })
      .catch(() => {
        if (!cancelled) {
          setById(prev => {
            const next = { ...prev };
            for (const id of unique) if (!(id in next)) next[id] = null;
            return next;
          });
        }
      });
    return () => { cancelled = true; };
  }, [api, key]);

  return byId;
}

export function OrderListingThumbs({
  ids,
  listings,
  onOpen,
}: {
  ids: string[];
  listings: Record<string, OrderListingCard | null>;
  onOpen: (listing: OrderListingCard) => void;
}) {
  if (!ids.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map(id => {
        const card = listings[id];
        const photo = card?.images?.[0];
        if (card) {
          return (
            <button
              key={id}
              type="button"
              title={`${card.title || id}`}
              onClick={() => onOpen(card)}
              className="relative h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {photo ? (
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <ImageIcon size={14} className="text-slate-300" />
                </span>
              )}
            </button>
          );
        }
        return (
          <span
            key={id}
            title={card === null ? 'განცხადება ამ ID-ით არ არის' : 'მოწმდება...'}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border px-1.5 font-mono text-[10px] font-bold"
            style={card === null
              ? { borderColor: '#fecaca', background: '#fef2f2', color: '#dc2626' }
              : { borderColor: '#e2e8f0', background: '#f8fafc', color: '#94a3b8' }}
          >
            {id.slice(-4)}
          </span>
        );
      })}
    </div>
  );
}

export default function OrderListingIdsField({
  label,
  hint,
  ids,
  onChange,
}: {
  label: string;
  hint: string;
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const api = useApiRequest();
  const listings = useOrderListings(ids);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [peek, setPeek] = useState<OrderListingCard | null>(null);

  const known = useMemo(() => new Set(ids), [ids]);

  async function addFromDraft() {
    const incoming = parseIds(draft).filter(id => !known.has(id));
    if (!incoming.length) {
      setDraft('');
      return;
    }
    setBusy(true);
    setError('');
    const accepted: string[] = [];
    const missing: string[] = [];
    for (const id of incoming) {
      try {
        await api(`/properties/${encodeURIComponent(id)}`);
        accepted.push(id);
      } catch {
        missing.push(id);
      }
    }
    if (accepted.length) onChange([...ids, ...accepted]);
    setDraft('');
    setBusy(false);
    if (missing.length) {
      setError(`საიტზე არ არის: ${missing.join(', ')}`);
    }
  }

  return (
    <div>
      <p className="text-xs font-bold text-slate-600 mb-1">{label}</p>
      <p className="text-[11px] text-slate-400 mb-2">{hint}</p>
      <div className="flex gap-2 mb-2">
        <input
          value={draft}
          onChange={e => { setDraft(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addFromDraft(); } }}
          placeholder="განცხადების ID — მაგ. 24171150"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-white font-mono"
        />
        <button
          type="button"
          onClick={() => { void addFromDraft(); }}
          disabled={busy || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          დამატება
        </button>
      </div>
      {error && (
        <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      <div className="space-y-2">
        {ids.map(id => {
          const card = listings[id];
          const photo = card?.images?.[0];
          const ok = Boolean(card);
          return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-xl border px-2 py-1.5"
              style={{
                borderColor: card === null ? '#fecaca' : '#e2e8f0',
                background: card === null ? '#fef2f2' : '#fff',
              }}
            >
              <button
                type="button"
                disabled={!ok}
                onClick={() => { if (card) setPeek(card); }}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 disabled:cursor-default"
              >
                {photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    {card === undefined
                      ? <Loader2 size={14} className="animate-spin text-slate-300" />
                      : <ImageIcon size={14} className="text-slate-300" />}
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] font-extrabold text-slate-700">#{id}</p>
                <p className="truncate text-[12px] text-slate-600">
                  {card?.title || (card === null ? 'განცხადება ამ ID-ით არ არის საიტზე' : 'მოწმდება...')}
                </p>
              </div>
              {ok && <Check size={14} className="shrink-0 text-emerald-500" />}
              <button
                type="button"
                onClick={() => onChange(ids.filter(item => item !== id))}
                className="shrink-0 p-1 text-slate-300 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      {peek && <ListingPeekModal listing={peek} onClose={() => setPeek(null)} />}
    </div>
  );
}
