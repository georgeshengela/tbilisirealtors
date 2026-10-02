import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, CheckCircle2, Clock, Eye, Heart, Plus, UserRound, XCircle,
} from 'lucide-react';
import PropertyCard from '../../components/PropertyCard';
import MyListingRow, { isSentBack } from '../../components/account/MyListingRow';
import { Alert, Spinner, btnGhost, card } from '../../components/account/ui';
import { useProperties } from '../../hooks/usePublicData';
import { useFavorites } from '../../lib/favorites';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { listingsHref } from '../../lib/seoListingsUrl';
import { useAccountData } from './AccountLayout';

export default function AccountOverviewPage() {
  const { t } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.overview.${key}`, vars);
  const { user } = useUserAuth();
  const { listings, loading, error, reload } = useAccountData();
  const { ids: favoriteIds } = useFavorites();
  const { data: properties, loading: propertiesLoading } = useProperties();

  const counts = useMemo(() => ({
    pending: listings.filter(row => row.moderationStatus === 'pending').length,
    approved: listings.filter(row => row.moderationStatus === 'approved').length,
    rejected: listings.filter(row => isSentBack(row.moderationStatus)).length,
    views: listings.reduce((sum, row) => sum + (row.viewCount ?? 0), 0),
  }), [listings]);

  // Newest saves first — the store keeps insertion order.
  const favorites = useMemo(() => {
    const byId = new Map(properties.map(p => [p.id, p]));
    return [...favoriteIds].reverse().map(id => byId.get(id)).filter(Boolean).slice(0, 3) as typeof properties;
  }, [properties, favoriteIds]);

  if (!user) return null;

  const stats = [
    { label: tx('statListings'), value: listings.length, icon: Building2, tint: 'bg-blue-50 text-blue-600' },
    { label: tx('statApproved'), value: counts.approved, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: tx('statPending'), value: counts.pending, icon: Clock, tint: 'bg-amber-50 text-amber-600' },
    { label: tx('statViews'), value: counts.views, icon: Eye, tint: 'bg-violet-50 text-violet-600' },
  ];

  const incomplete = !user.avatarUrl || !user.phone;

  return (
    <div className="space-y-6">
      {/* Greeting + call to action */}
      <section className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-600/25" aria-hidden />
        <div className="absolute right-24 -bottom-24 w-56 h-56 rounded-full bg-blue-500/10" aria-hidden />
        <div className="relative sm:flex sm:items-end sm:justify-between gap-6">
          <div className="max-w-lg">
            <h1 className="text-2xl sm:text-[28px] font-bold leading-tight">{tx('hello', { name: user.firstName || user.name })}</h1>
            <p className="text-white/65 mt-2 text-[15px] leading-relaxed">{tx('addCtaText')}</p>
          </div>
          <Link
            to="/dashboard/submit"
            className="mt-5 sm:mt-0 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-blue-50 transition flex-shrink-0 w-full sm:w-auto"
          >
            <Plus size={18} /> {tx('addCta')}
          </Link>
        </div>
      </section>

      {error && (
        <Alert tone="error" title={error}>
          <button type="button" onClick={() => void reload()} className="underline font-bold">{t('account.common.retry')}</button>
        </Alert>
      )}

      {/* Counters */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(stat => (
          <div key={stat.label} className={`${card} p-4 sm:p-5`}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.tint}`}>
              <stat.icon size={19} />
            </span>
            <p className="mt-3 text-2xl sm:text-[28px] font-bold text-slate-900 tabular-nums leading-none">
              {loading ? '–' : stat.value.toLocaleString()}
            </p>
            <p className="text-[13px] text-slate-500 mt-1.5">{stat.label}</p>
          </div>
        ))}
      </section>

      {counts.rejected > 0 && (
        <Link to="/dashboard/listings?status=rejected" className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 border border-red-200 hover:border-red-300 transition">
          <span className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"><XCircle size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-red-900 text-sm">{tx('rejectedAlert', { count: counts.rejected })}</p>
            <p className="text-[13px] text-red-700 mt-0.5">{tx('rejectedAlertHint')}</p>
          </div>
          <ArrowRight size={18} className="text-red-600 flex-shrink-0" />
        </Link>
      )}

      {counts.pending > 0 && counts.rejected === 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><Clock size={20} /></span>
          <div className="min-w-0">
            <p className="font-bold text-amber-900 text-sm">{tx('pendingAlert', { count: counts.pending })}</p>
            <p className="text-[13px] text-amber-800 mt-0.5">{tx('pendingAlertHint')}</p>
          </div>
        </div>
      )}

      {incomplete && (
        <div className={`${card} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
          <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><UserRound size={21} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-sm">{tx('completeTitle')}</p>
            <p className="text-[13px] text-slate-500 mt-0.5">{tx('completeText')}</p>
          </div>
          <Link to="/dashboard/settings" className={`${btnGhost} h-10 flex-shrink-0`}>{tx('completeCta')}</Link>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        {/* Recent listings */}
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">{tx('recentListings')}</h2>
            {listings.length > 0 && (
              <Link to="/dashboard/listings" className="text-sm font-bold text-blue-600 hover:text-blue-700">{tx('viewAll')}</Link>
            )}
          </div>
          {loading ? <Spinner className="py-10" /> : listings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">{t('account.listings.emptyTitle')}</p>
              <Link to="/dashboard/submit" className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-blue-600 hover:text-blue-700">
                <Plus size={16} /> {tx('addCta')}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {listings.slice(0, 4).map(listing => <MyListingRow key={listing.id} listing={listing} compact />)}
            </div>
          )}
        </section>

        {/* Recently saved */}
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 inline-flex items-center gap-2">
              {tx('recentFavorites')}
              {favoriteIds.length > 0 && <span className="text-xs font-bold text-slate-400">{favoriteIds.length}</span>}
            </h2>
            {favoriteIds.length > 0 && (
              <Link to="/dashboard/favorites" className="text-sm font-bold text-blue-600 hover:text-blue-700">{tx('viewAll')}</Link>
            )}
          </div>
          {propertiesLoading ? <Spinner className="py-10" /> : favorites.length === 0 ? (
            <div className="py-8 text-center">
              <Heart size={22} className="mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">{tx('noFavorites')}</p>
              <Link to={listingsHref()} className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-blue-600 hover:text-blue-700">
                {tx('browse')} <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map(property => <PropertyCard key={property.id} property={property} variant="horizontal" />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
