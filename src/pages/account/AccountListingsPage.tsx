import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, Plus, Trash2 } from 'lucide-react';
import MyListingRow, { isSentBack } from '../../components/account/MyListingRow';
import {
  Alert, EmptyState, Modal, PageTitle, Spinner, btnBlue, btnDanger, btnGhost, useToast,
} from '../../components/account/ui';
import { useAccountRequest } from '../../contexts/UserAuthContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { useAccountData, type MyListing } from './AccountLayout';

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
type Filter = typeof FILTERS[number];

export default function AccountListingsPage() {
  const { t } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.listings.${key}`, vars);
  const request = useAccountRequest();
  const toast = useToast();
  const { listings, loading, error, setListings } = useAccountData();
  const [params, setParams] = useSearchParams();

  const filter: Filter = FILTERS.includes(params.get('status') as Filter) ? params.get('status') as Filter : 'all';
  const [pendingDelete, setPendingDelete] = useState<MyListing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: listings.length, pending: 0, approved: 0, rejected: 0 };
    for (const row of listings) {
      if (isSentBack(row.moderationStatus)) out.rejected += 1;
      else if (row.moderationStatus in out) out[row.moderationStatus as Filter] += 1;
    }
    return out;
  }, [listings]);

  const visible = filter === 'all' ? listings
    : filter === 'rejected' ? listings.filter(row => isSentBack(row.moderationStatus))
      : listings.filter(row => row.moderationStatus === filter);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await request(`/my-listings/${pendingDelete.id}`, { method: 'DELETE' });
      setListings(list => list.filter(row => row.id !== pendingDelete.id));
      setPendingDelete(null);
      toast(tx('deleted'));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('account.common.error'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageTitle
        title={tx('title')}
        subtitle={tx('subtitle')}
        action={listings.length > 0 ? (
          <Link to="/dashboard/submit" className={`${btnBlue} hidden sm:inline-flex`}>
            <Plus size={17} /> {t('account.nav.addListing')}
          </Link>
        ) : undefined}
      />

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {loading ? <Spinner /> : listings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={tx('emptyTitle')}
          text={tx('emptyText')}
          action={<Link to="/dashboard/submit" className={btnBlue}><Plus size={17} /> {t('account.nav.addListing')}</Link>}
        />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-4" role="tablist">
            {FILTERS.map(key => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParams(key === 'all' ? {} : { status: key }, { replace: true })}
                  className={`flex-shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-bold border transition ${
                    active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {tx(key)}
                  <span className={`text-[11px] ${active ? 'text-white/70' : 'text-slate-400'}`}>{counts[key]}</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">{tx('emptyFiltered')}</p>
          ) : (
            <div className="space-y-3">
              {visible.map(listing => (
                <MyListingRow key={listing.id} listing={listing} onDelete={row => { setDeleteError(''); setPendingDelete(row); }} />
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        title={tx('deleteTitle')}
        closeLabel={t('account.common.close')}
      >
        <p className="text-sm text-slate-600 leading-relaxed">{tx('deleteText', { title: pendingDelete?.title ?? '' })}</p>
        {deleteError && <div className="mt-4"><Alert tone="error">{deleteError}</Alert></div>}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" className={btnGhost} onClick={() => setPendingDelete(null)} disabled={deleting}>
            {t('account.common.cancel')}
          </button>
          <button type="button" className={btnDanger} onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} {tx('delete')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
