/**
 * Member dashboard. Everything on this page is real account data pulled from
 * `/api/account/*` — saved listings, submitted listings with their moderation
 * state, saved searches and the profile form.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Heart, Building2, Search as SearchIcon, Settings, Eye,
  Plus, Trash2, LogOut, Loader2, AlertCircle, CheckCircle2, Clock,
  Pencil, ExternalLink, type LucideIcon,
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { useProperties } from '../hooks/usePublicData';
import { useAccountRequest, useUserAuth } from '../contexts/UserAuthContext';
import { useFavorites } from '../lib/favorites';
import { MODERATION_COLOR, MODERATION_LABEL } from '../lib/permissions';
import { useTranslation } from '../i18n/LocaleContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatShortDate } from '../lib/dateFormat';
import { listingsHref, listingsHrefFromSearchParams } from '../lib/seoListingsUrl';

type Tab = 'overview' | 'favorites' | 'listings' | 'searches' | 'profile';

interface Overview {
  favorites: number;
  listings: number;
  pending: number;
  approved: number;
  rejected: number;
  totalViews: number;
  savedSearches: number;
}

interface MyListing {
  id: string;
  title: string;
  price: string | null;
  address: string | null;
  district: string | null;
  images: string[] | null;
  viewCount: number | null;
  moderationStatus: string;
  moderationNote: string | null;
  createdAt: string;
}

interface SavedSearch {
  id: number;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
}

const CARD = 'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700';

function StatusBadge({ status }: { status: string }) {
  const color = MODERATION_COLOR[status] ?? MODERATION_COLOR.draft;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: color.bg, color: color.text }}
    >
      {MODERATION_LABEL[status] ?? status}
    </span>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: {
  icon: LucideIcon; title: string; hint: string; action?: React.ReactNode;
}) {
  return (
    <div className={`${CARD} py-16 px-6 text-center`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
        <Icon size={26} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 mb-6">{hint}</p>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const { t, locale } = useTranslation();
  const { formatMoney } = useCurrency();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, logout, updateProfile } = useUserAuth();
  const request = useAccountRequest();

  const tabParam = params.get('tab');
  const tab: Tab = (['overview', 'favorites', 'listings', 'searches', 'profile'] as Tab[])
    .includes(tabParam as Tab) ? tabParam as Tab : 'overview';

  const { ids: favoriteIds } = useFavorites();
  const { data: allProperties, loading: propertiesLoading } = useProperties();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', phone: '', password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileForm(f => ({
      ...f,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    }));
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stats, listings, savedSearches] = await Promise.all([
        request('/overview'),
        request('/my-listings'),
        request('/saved-searches'),
      ]);
      setOverview(stats);
      setMyListings(listings.data ?? []);
      setSearches(savedSearches.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const favorites = useMemo(
    () => allProperties.filter(p => favoriteIds.includes(p.id)),
    [allProperties, favoriteIds],
  );

  function switchTab(next: Tab) {
    setParams(next === 'overview' ? {} : { tab: next });
  }

  async function removeListing(id: string) {
    if (!window.confirm(t('dashboard.confirmDeleteListing'))) return;
    try {
      await request(`/my-listings/${id}`, { method: 'DELETE' });
      setMyListings(list => list.filter(row => row.id !== id));
      setToast(t('dashboard.listingDeleted'));
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function removeSearch(id: number) {
    try {
      await request(`/saved-searches/${id}`, { method: 'DELETE' });
      setSearches(list => list.filter(row => row.id !== id));
      setToast(t('dashboard.searchDeleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    try {
      const patch: Record<string, unknown> = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
      };
      if (profileForm.password) patch.password = profileForm.password;

      await updateProfile(patch);
      setProfileForm(f => ({ ...f, password: '' }));
      setToast(t('dashboard.profileSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSavingProfile(false);
    }
  }

  if (!user) return null;

  const menu: { id: Tab; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: Home },
    { id: 'favorites', label: t('dashboard.favorites'), icon: Heart, badge: favoriteIds.length },
    { id: 'listings', label: t('dashboard.myListings'), icon: Building2, badge: myListings.length },
    { id: 'searches', label: t('dashboard.savedSearches'), icon: SearchIcon, badge: searches.length },
    { id: 'profile', label: t('dashboard.profile'), icon: Settings },
  ];

  const statCards = [
    { label: t('dashboard.statSaved'), value: overview?.favorites ?? favoriteIds.length, icon: Heart, color: '#ef4444' },
    { label: t('dashboard.statListings'), value: overview?.listings ?? 0, icon: Building2, color: '#2563eb' },
    { label: t('dashboard.statPending'), value: overview?.pending ?? 0, icon: Clock, color: '#d97706' },
    { label: t('dashboard.statViews'), value: overview?.totalViews ?? 0, icon: Eye, color: '#059669' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 page-under-header">
      <div className="container-xl py-8">
        {/* Greeting */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold overflow-hidden flex-shrink-0">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : (user.firstName || user.name).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                {t('dashboard.greeting', { name: user.firstName || user.name })}
              </h1>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              {t('dashboard.submitListing')}
            </Link>
            <button
              type="button"
              onClick={() => { logout(); navigate('/'); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              {t('dashboard.logout')}
            </button>
          </div>
        </div>

        {toast && (
          <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
            <CheckCircle2 size={16} />
            {toast}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className={`${CARD} p-1.5 mb-6 flex gap-1 overflow-x-auto`}>
          {menu.map(item => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <item.icon size={15} />
                {item.label}
                {item.badge ? (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className={`${CARD} py-24 flex items-center justify-center text-slate-400`}>
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* ── Overview ── */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map(stat => (
                    <div key={stat.label} className={`${CARD} p-5`}>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: `${stat.color}18` }}
                      >
                        <stat.icon size={18} style={{ color: stat.color }} />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {overview && overview.rejected > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                    <AlertCircle size={16} />
                    {t('dashboard.rejectedHint', { count: overview.rejected })}
                    <button
                      type="button"
                      onClick={() => switchTab('listings')}
                      className="ml-auto underline"
                    >
                      {t('dashboard.review')}
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('dashboard.recentFavorites')}
                    </h2>
                    {favorites.length > 4 && (
                      <button
                        type="button"
                        onClick={() => switchTab('favorites')}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {t('common.viewAll')}
                      </button>
                    )}
                  </div>

                  {propertiesLoading ? (
                    <div className={`${CARD} py-16 flex justify-center text-slate-400`}>
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : favorites.length === 0 ? (
                    <EmptyState
                      icon={Heart}
                      title={t('favorites.emptyTitle')}
                      hint={t('favorites.emptyHint')}
                      action={(
                        <Link to={listingsHref()} className="inline-flex px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
                          {t('favorites.browse')}
                        </Link>
                      )}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      {favorites.slice(0, 4).map(property => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Favorites ── */}
            {tab === 'favorites' && (
              propertiesLoading ? (
                <div className={`${CARD} py-24 flex justify-center text-slate-400`}>
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : favorites.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title={t('favorites.emptyTitle')}
                  hint={t('favorites.emptyHint')}
                  action={(
                    <Link to="/listings" className="inline-flex px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
                      {t('favorites.browse')}
                    </Link>
                  )}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {favorites.map(property => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )
            )}

            {/* ── My listings ── */}
            {tab === 'listings' && (
              myListings.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title={t('dashboard.noListingsTitle')}
                  hint={t('dashboard.noListingsHint')}
                  action={(
                    <Link to="/dashboard/submit" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
                      <Plus size={16} />
                      {t('dashboard.submitListing')}
                    </Link>
                  )}
                />
              ) : (
                <div className="space-y-3">
                  {myListings.map(listing => (
                    <div key={listing.id} className={`${CARD} p-4 flex flex-col sm:flex-row gap-4`}>
                      <div className="w-full sm:w-36 h-28 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        {listing.images?.[0]
                          ? <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Building2 size={22} className="text-slate-300" /></div>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <StatusBadge status={listing.moderationStatus} />
                          <span className="text-[11px] font-mono text-slate-400">#{listing.id}</span>
                          <span className="text-[11px] text-slate-400">
                            {formatShortDate(listing.createdAt, locale)}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{listing.title}</h3>
                        <p className="text-sm text-slate-500 truncate">
                          {[listing.district, listing.address].filter(Boolean).join(' · ') || '—'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                          <span className="font-bold text-blue-600">
                            {listing.price ? formatMoney(Number(listing.price)) : '—'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Eye size={14} />
                            {listing.viewCount ?? 0}
                          </span>
                        </div>

                        {listing.moderationStatus === 'rejected' && listing.moderationNote && (
                          <p className="mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                            {listing.moderationNote}
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                        {listing.moderationStatus === 'approved' && (
                          <Link
                            to={`/property/${listing.id}`}
                            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            title={t('dashboard.viewPublic')}
                          >
                            <ExternalLink size={15} />
                          </Link>
                        )}
                        <Link
                          to={`/dashboard/submit?id=${listing.id}`}
                          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          title={t('common.edit')}
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeListing(listing.id)}
                          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── Saved searches ── */}
            {tab === 'searches' && (
              searches.length === 0 ? (
                <EmptyState
                  icon={SearchIcon}
                  title={t('dashboard.noSearchesTitle')}
                  hint={t('dashboard.noSearchesHint')}
                  action={(
                    <Link to="/listings" className="inline-flex px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
                      {t('favorites.browse')}
                    </Link>
                  )}
                />
              ) : (
                <div className="space-y-3">
                  {searches.map(row => {
                    const query = new URLSearchParams(
                      Object.entries(row.query ?? {})
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => [key, String(value)]),
                    ).toString();

                    return (
                      <div key={row.id} className={`${CARD} p-4 flex items-center gap-4`}>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <SearchIcon size={17} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{row.name}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {query || t('dashboard.allListings')}
                          </p>
                        </div>
                        <Link
                          to={listingsHrefFromSearchParams(new URLSearchParams(query))}
                          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors flex-shrink-0"
                        >
                          {t('dashboard.runSearch')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeSearch(row.id)}
                          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── Profile ── */}
            {tab === 'profile' && (
              <form onSubmit={saveProfile} className={`${CARD} p-6 max-w-2xl space-y-5`}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      {t('dashboard.firstName')}
                    </span>
                    <input
                      value={profileForm.firstName}
                      onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      {t('dashboard.lastName')}
                    </span>
                    <input
                      value={profileForm.lastName}
                      onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    {t('common.phone')}
                  </span>
                  <input
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    {t('dashboard.newPassword')}
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.password}
                    onChange={e => setProfileForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('dashboard.passwordHint')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </label>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {savingProfile && <Loader2 size={15} className="animate-spin" />}
                    {t('common.save')}
                  </button>
                  <span className="text-xs text-slate-400">{t('dashboard.emailLocked')}</span>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
