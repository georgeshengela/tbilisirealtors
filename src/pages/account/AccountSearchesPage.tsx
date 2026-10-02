import { Link } from 'react-router-dom';
import { ArrowRight, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { EmptyState, PageTitle, Spinner, btnBlue, card, iconBtn, useToast } from '../../components/account/ui';
import { useAccountRequest } from '../../contexts/UserAuthContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { formatShortDate } from '../../lib/dateFormat';
import { listingsHref, listingsHrefFromSearchParams } from '../../lib/seoListingsUrl';
import { useAccountData } from './AccountLayout';

function queryString(query: Record<string, unknown> | null | undefined): string {
  return new URLSearchParams(
    Object.entries(query ?? {})
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}

export default function AccountSearchesPage() {
  const { t, locale } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.searches.${key}`, vars);
  const request = useAccountRequest();
  const toast = useToast();
  const { searches, loading, setSearches } = useAccountData();

  async function remove(id: number) {
    const before = searches;
    setSearches(list => list.filter(row => row.id !== id));
    try {
      await request(`/saved-searches/${id}`, { method: 'DELETE' });
      toast(tx('deleted'));
    } catch (err) {
      setSearches(before);
      toast(err instanceof Error ? err.message : t('account.common.error'), 'error');
    }
  }

  return (
    <div>
      <PageTitle title={tx('title')} subtitle={tx('subtitle')} />

      {loading ? <Spinner /> : searches.length === 0 ? (
        <EmptyState
          icon={Search}
          title={tx('emptyTitle')}
          text={tx('emptyText')}
          action={<Link to={listingsHref()} className={btnBlue}>{t('account.overview.browse')}</Link>}
        />
      ) : (
        <div className="space-y-3">
          {searches.map(row => {
            const qs = queryString(row.query);
            const chips = [...new URLSearchParams(qs).entries()].slice(0, 6);
            return (
              <div key={row.id} className={`${card} p-4 flex items-center gap-4`}>
                <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <SlidersHorizontal size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{row.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {chips.length === 0
                      ? <span className="text-xs text-slate-500">{tx('allListings')}</span>
                      : chips.map(([key, value]) => (
                        <span key={key} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">{value}</span>
                      ))}
                    <span className="text-[11px] text-slate-400 self-center ml-1">{tx('saved', { date: formatShortDate(row.createdAt, locale) })}</span>
                  </div>
                </div>
                <Link
                  to={listingsHrefFromSearchParams(new URLSearchParams(qs))}
                  className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition flex-shrink-0"
                >
                  {tx('run')} <ArrowRight size={15} />
                </Link>
                <Link to={listingsHrefFromSearchParams(new URLSearchParams(qs))} className={`${iconBtn} sm:hidden`} aria-label={tx('run')}>
                  <ArrowRight size={16} />
                </Link>
                <button type="button" onClick={() => void remove(row.id)} className={`${iconBtn} hover:!text-red-600 hover:!border-red-200`} aria-label={t('account.listings.delete')}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
