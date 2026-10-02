import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, CheckCircle2, Clock, Eye, Heart, Plus, UserRound, XCircle,
} from 'lucide-react';
import MiniListingCard, { AddListingTile } from '../../components/account/MiniListingCard';
import { ListingPrice, StatusPill, isSentBack } from '../../components/account/MyListingRow';
import { Alert, Spinner, btnGhost, card } from '../../components/account/ui';
import { useProperties } from '../../hooks/usePublicData';
import { useFavorites } from '../../lib/favorites';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { listingsHref } from '../../lib/seoListingsUrl';
import { propertyHref } from '../../lib/seoPropertyUrl';
import { listingMoneyFrom } from '../../lib/moneyEntry';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAccountData } from './AccountLayout';

function SectionHead({ title, count, href, linkLabel }: { title: string; count: number; href?: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
        {title}
        {count > 0 && <span className="min-w-[24px] h-6 px-2 rounded-md bg-slate-100 text-xs font-bold text-slate-500 inline-flex items-center justify-center">{count}</span>}
      </h2>
      {href && (
        <Link to={href} className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700">
          {linkLabel} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export default function AccountOverviewPage() {
  const { t } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.overview.${key}`, vars);
  const { user } = useUserAuth();
  const { listings, loading, error, reload } = useAccountData();
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { formatMoney } = useCurrency();
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

      {/* Recent listings */}
      <section>
        <SectionHead
          title={tx('recentListings')}
          count={listings.length}
          href={listings.length ? '/dashboard/listings' : undefined}
          linkLabel={tx('viewAll')}
        />
        {loading ? <Spinner className="py-10" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.slice(0, 3).map(listing => (
              <MiniListingCard
                key={listing.id}
                href={`/dashboard/listings/${listing.id}/edit`}
                image={listing.images?.[0]}
                price={<ListingPrice listing={listing} />}
                title={listing.title}
                place={[listing.district, listing.city].filter(Boolean).join(', ')}
                area={listing.area}
                rooms={listing.bedrooms}
                views={listing.viewCount ?? 0}
                badge={<StatusPill status={listing.moderationStatus} />}
              />
            ))}
            {listings.length < 3 && (
              <AddListingTile
                href="/dashboard/submit"
                label={tx('addCta')}
                hint={listings.length === 0 ? t('account.listings.emptyText') : undefined}
                className={listings.length ? 'hidden sm:flex' : 'flex'}
              />
            )}
          </div>
        )}
      </section>

      {/* Recently saved */}
      <section>
        <SectionHead
          title={tx('recentFavorites')}
          count={favoriteIds.length}
          href={favoriteIds.length ? '/dashboard/favorites' : undefined}
          linkLabel={tx('viewAll')}
        />
        {propertiesLoading ? <Spinner className="py-10" /> : favorites.length === 0 ? (
          <div className={`${card} px-6 py-10 text-center`}>
            <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto"><Heart size={20} /></span>
            <p className="text-sm text-slate-500 mt-3">{tx('noFavorites')}</p>
            <Link to={listingsHref()} className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-blue-600 hover:text-blue-700">
              {tx('browse')} <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {favorites.map(property => (
              <MiniListingCard
                key={property.id}
                href={propertyHref(property)}
                image={property.images?.[0]}
                price={(
                  <>
                    {formatMoney(Number(property.price), listingMoneyFrom(property))}
                    {(property.status === 'rent' || property.status === 'daily_rent') && (
                      <span className="text-sm font-semibold text-slate-500">{t('common.perMonth')}</span>
                    )}
                  </>
                )}
                title={property.title}
                place={[property.district, property.city].filter(Boolean).join(', ')}
                area={property.area}
                rooms={property.rooms ?? property.bedrooms}
                onUnsave={() => toggleFavorite(property.id)}
                unsaveLabel={t('home.unsaveListing')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
