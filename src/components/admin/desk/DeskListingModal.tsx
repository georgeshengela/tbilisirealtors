/**
 * A listing opened from the manager desk: the public page on the left, and on the
 * right everything a call usually ends in — refresh, status (with the old reason),
 * price, owner, notes, tasks — so the broker never leaves the desk.
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, Pencil, Phone, RefreshCw, Save, X } from 'lucide-react';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { propertyHref, withEmbedQuery } from '../../../lib/seoPropertyUrl';
import {
  LifecycleCell,
  NotesButton,
  OwnerCell,
  PriceCell,
  TouchedDateCell,
  type AdminPropertyRow,
  type PropertyPatch,
} from '../AdminPropertiesSection';
import ListingWorkPanel from './ListingWorkPanel';

export default function DeskListingModal({
  propertyId,
  api,
  showToast,
  onClose,
  onChanged,
}: {
  propertyId: string;
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
  /** A change was saved — the boards behind the window should reload. */
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { user, can } = useAdminAuth();
  const [row, setRow] = useState<AdminPropertyRow | null>(null);
  const [error, setError] = useState('');
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [workPanel, setWorkPanel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [priceDraft, setPriceDraft] = useState('');
  const [rentDraft, setRentDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    api(`/properties?ids=${encodeURIComponent(propertyId)}&limit=1`)
      .then(data => {
        if (cancelled) return;
        const found = ((data as { data?: AdminPropertyRow[] }).data ?? [])[0] ?? null;
        if (!found) setError('განცხადება ვერ მოიძებნა ან წვდომა არ გაქვთ');
        setRow(found);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'შეცდომა'); });
    return () => { cancelled = true; };
  }, [api, propertyId]);

  useEffect(() => {
    if (!row) return;
    setPriceDraft(row.price ? String(Math.round(Number(row.price))) : '');
    setRentDraft(row.rentPrice ? String(Math.round(Number(row.rentPrice))) : '');
  }, [row]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      // Escape closes the top-most window only (status editor, tasks panel…).
      if (event.key === 'Escape' && !workPanel && !document.querySelector('[role="dialog"], [data-popover]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, workPanel]);

  const patch = useCallback(async (id: string, body: PropertyPatch) => {
    try {
      const updated = await api(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setRow(prev => (prev ? { ...prev, ...(updated as Partial<AdminPropertyRow>) } : prev));
      showToast('lifecycleState' in body ? 'სტატუსი განახლდა' : 'price' in body ? 'ფასი განახლდა' : 'განახლდა');
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
      throw err;
    }
  }, [api, showToast, onChanged]);

  async function refreshListing() {
    if (!row) return;
    setBusy(true);
    try {
      await patch(row.id, { lifecycleState: 'current', lifecycleOutcome: null });
    } catch { /* toast already shown */ } finally {
      setBusy(false);
    }
  }

  const both = row?.status === 'both';
  const priceChanged = row != null && (
    Number(priceDraft) !== Math.round(Number(row.price) || 0)
    || (both && Number(rentDraft || 0) !== Math.round(Number(row.rentPrice) || 0))
  );

  async function savePrice() {
    if (!row || !priceChanged) return;
    const next = Number(priceDraft);
    if (!Number.isFinite(next) || next <= 0) {
      showToast('ფასი არასწორია', 'error');
      return;
    }
    setBusy(true);
    try {
      await patch(row.id, {
        price: next,
        priceCurrency: row.priceCurrency || 'GEL',
        ...(both ? { rentPrice: rentDraft ? Number(rentDraft) : null } : {}),
      });
    } catch { /* toast already shown */ } finally {
      setBusy(false);
    }
  }

  function openFullEdit() {
    if (!row) return;
    const back = `${window.location.pathname}${window.location.search}`;
    navigate(`/admin/listings/${row.id}/edit?from=${encodeURIComponent(back)}`);
  }

  const editable = row?.canEdit !== false;
  const state = row?.lifecycleState || 'new';
  const ownerPhone = row?.owner?.phone?.trim();
  const currencySign = row?.priceCurrency === 'USD' ? '$' : '₾';

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" onClick={onClose} aria-label="დახურვა" />
      <div className="relative flex h-[96vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_rgba(15,23,42,0.4)]">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600">#{propertyId}</span>
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{row?.title || 'განცხადება'}</p>
          {row && editable && can('listings.edit') && (
            <button
              type="button"
              onClick={openFullEdit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Pencil size={13} />
              სრული რედაქტირება
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="დახურვა">
            <X size={18} />
          </button>
        </div>

        {!row ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            {error || <Loader2 size={28} className="animate-spin" />}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
            <div className="relative min-h-[45vh] flex-1 bg-slate-50 lg:min-h-0">
              {!frameLoaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-slate-400">
                  <Loader2 size={28} className="animate-spin" />
                </div>
              )}
              <iframe
                title={row.title || row.id}
                src={withEmbedQuery(propertyHref(row), true)}
                className="h-full w-full border-0"
                onLoad={() => setFrameLoaded(true)}
              />
            </div>

            <aside className="max-h-[50vh] w-full shrink-0 space-y-3 overflow-y-auto border-slate-100 bg-white p-4 lg:max-h-none lg:w-[380px] lg:border-l">
              {!editable && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                  ამ განცხადების შეცვლა მხოლოდ ავტორს შეუძლია — შეგიძლიათ ნახვა და დავალებები.
                </p>
              )}

              <section className="rounded-2xl border border-slate-100 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">სტატუსი</p>
                <div className="flex items-start justify-between gap-3">
                  {can('listings.lifecycle') && editable
                    ? <LifecycleCell p={row} onPatch={patch} />
                    : <span className="text-xs font-bold text-slate-600">{state}</span>}
                  <div className="text-center text-xs">
                    <TouchedDateCell p={row} />
                  </div>
                </div>
                {can('listings.lifecycle') && editable && state !== 'current' && (
                  <button
                    type="button"
                    onClick={refreshListing}
                    disabled={busy}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                    განახლება — აქტუალურია (current)
                  </button>
                )}
                <p className="mt-2 text-[10px] leading-snug text-slate-400">
                  გაუქმებისთვის სტატუსზე დააჭირე → old და აირჩიე მიზეზი (გაიყიდა, გაქირავდა, აღარ იყიდება…).
                </p>
              </section>

              <section className="rounded-2xl border border-slate-100 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">ფასი</p>
                <PriceCell p={row} />
                {can('listings.price') && editable && (
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold text-slate-400">
                        {row.status === 'rent' ? 'ქირა / თვე' : 'გასაყიდი ფასი'} ({currencySign})
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={priceDraft}
                        onChange={e => setPriceDraft(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold tabular-nums text-slate-800 focus:border-blue-400 focus:outline-none"
                      />
                    </label>
                    {both && (
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-400">ქირა / თვე ({currencySign})</span>
                        <input
                          type="number"
                          min={0}
                          value={rentDraft}
                          onChange={e => setRentDraft(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold tabular-nums text-slate-800 focus:border-blue-400 focus:outline-none"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={savePrice}
                      disabled={busy || !priceChanged}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Save size={13} />
                      ფასის შენახვა
                    </button>
                  </div>
                )}
              </section>

              {can('listings.owner') && (
                <section className="rounded-2xl border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">მესაკუთრე</p>
                    {ownerPhone && (
                      <a
                        href={`tel:${ownerPhone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Phone size={12} />
                        დარეკვა
                      </a>
                    )}
                  </div>
                  <OwnerCell p={row} onPatch={patch} />
                </section>
              )}

              <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 p-3">
                {can('listings.notes') && <NotesButton p={row} onPatch={patch} />}
                {can('listings.tasks') && (
                  <button
                    type="button"
                    onClick={() => setWorkPanel(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                  >
                    <ClipboardList size={13} />
                    დავალებები და ზარები
                  </button>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>

      {workPanel && row && (
        <ListingWorkPanel
          propertyId={row.id}
          propertyTitle={row.title}
          ownerPhone={row.owner?.phone ?? null}
          api={api}
          showToast={showToast}
          currentUserId={user?.id ?? 0}
          canAssignOthers={can('listings.assign')}
          canLogCalls={can('listings.tasks')}
          onClose={() => { setWorkPanel(false); onChanged(); }}
        />
      )}
    </div>,
    document.body,
  );
}
