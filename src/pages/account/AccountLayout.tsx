/**
 * Shell for every member page under /dashboard: profile card and navigation on
 * the left (a scrollable tab strip on phones), the page itself on the right.
 * It loads the member's listings, counters and saved searches once and hands
 * them down, so switching tabs is instant and the badges never disagree.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2, Heart, LayoutGrid, LogOut, Plus, Search, Settings, Camera, type LucideIcon,
} from 'lucide-react';
import { useAccountRequest, useUserAuth } from '../../contexts/UserAuthContext';
import { useFavorites } from '../../lib/favorites';
import { formatMonthYear } from '../../lib/dateFormat';
import { useTranslation } from '../../i18n/LocaleContext';
import { Avatar, ToastProvider, btnBlue, card } from '../../components/account/ui';
import { isSentBack } from '../../components/account/MyListingRow';

export interface MyListing {
  id: string;
  title: string;
  description?: string | null;
  price: string | null;
  priceCurrency?: string | null;
  rentPrice?: string | null;
  status?: string | null;
  type?: string | null;
  address: string | null;
  city?: string | null;
  district: string | null;
  area?: string | null;
  bedrooms?: number | null;
  images: string[] | null;
  viewCount: number | null;
  moderationStatus: string;
  moderationNote: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SavedSearch {
  id: number;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
}

interface AccountData {
  listings: MyListing[];
  searches: SavedSearch[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  setListings: React.Dispatch<React.SetStateAction<MyListing[]>>;
  setSearches: React.Dispatch<React.SetStateAction<SavedSearch[]>>;
}

const AccountDataContext = createContext<AccountData | null>(null);

/** Null outside the account area — for components shared with the admin panel. */
export function useOptionalAccountData() {
  return useContext(AccountDataContext);
}

export function useAccountData() {
  const ctx = useContext(AccountDataContext);
  if (!ctx) throw new Error('useAccountData must be used inside AccountLayout');
  return ctx;
}

export function memberSince(date: string | null | undefined, locale: string): string {
  return date ? formatMonthYear(date, locale) : '';
}

export default function AccountLayout() {
  const { t, locale } = useTranslation();
  const { user, logout } = useUserAuth();
  const request = useAccountRequest();
  const navigate = useNavigate();
  const { ids: favoriteIds } = useFavorites();

  const [listings, setListings] = useState<MyListing[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [mine, saved] = await Promise.all([request('/my-listings'), request('/saved-searches')]);
      setListings(mine.data ?? []);
      setSearches(saved.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.common.error'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => { void reload(); }, [reload]);

  const data = useMemo<AccountData>(
    () => ({ listings, searches, loading, error, reload, setListings, setSearches }),
    [listings, searches, loading, error, reload],
  );

  if (!user) return null;

  const rejected = listings.filter(row => isSentBack(row.moderationStatus)).length;
  const nav: { to: string; label: string; icon: LucideIcon; count?: number; alert?: boolean; end?: boolean }[] = [
    { to: '/dashboard', label: t('account.nav.overview'), icon: LayoutGrid, end: true },
    { to: '/dashboard/listings', label: t('account.nav.listings'), icon: Building2, count: listings.length, alert: rejected > 0 },
    { to: '/dashboard/favorites', label: t('account.nav.favorites'), icon: Heart, count: favoriteIds.length },
    { to: '/dashboard/searches', label: t('account.nav.searches'), icon: Search, count: searches.length },
    { to: '/dashboard/settings', label: t('account.nav.settings'), icon: Settings },
  ];

  const signOut = () => {
    logout();
    navigate('/');
  };

  const since = memberSince(user.createdAt, locale);

  return (
    <ToastProvider>
      <AccountDataContext.Provider value={data}>
        <div className="min-h-screen bg-slate-50 page-under-header">
          <div className="container-xl py-5 sm:py-8 lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-8 lg:items-start">
            {/* ── Sidebar (desktop) ── */}
            <aside className="hidden lg:block sticky" style={{ top: 'calc(var(--site-header-h) + 24px)' }}>
              <div className={`${card} p-5`}>
                <div className="flex flex-col items-center text-center">
                  <Link to="/dashboard/settings" className="relative group" aria-label={t('account.settings.photoChange')}>
                    <Avatar name={user.name} src={user.avatarUrl} size={84} className="ring-4 ring-slate-50" />
                    <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-600 group-hover:text-blue-600 transition">
                      <Camera size={14} />
                    </span>
                  </Link>
                  <p className="mt-3 font-bold text-slate-900 text-[17px] leading-snug break-words max-w-full">{user.name}</p>
                  <p className="text-[13px] text-slate-500 truncate max-w-full">{user.email}</p>
                  {since && <p className="text-xs text-slate-400 mt-1">{t('account.nav.memberSince', { date: since })}</p>}
                </div>

                <Link to="/dashboard/submit" className={`${btnBlue} w-full mt-5 px-3 text-[13px] whitespace-nowrap`}>
                  <Plus size={17} /> {t('account.nav.addListing')}
                </Link>

                <nav className="mt-4 -mx-1 space-y-0.5" aria-label={t('account.nav.account')}>
                  {nav.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-semibold transition ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={18} className="flex-shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.alert && <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden />}
                          {Boolean(item.count) && (
                            <span className={`min-w-[22px] h-[22px] px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>

                <div className="mt-3 pt-3 border-t border-slate-100 -mx-1">
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    <LogOut size={18} /> {t('account.nav.logout')}
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Top strip (phones and tablets) ── */}
            <div className="lg:hidden mb-5">
              <div className={`${card} p-4 flex items-center gap-3`}>
                <Link to="/dashboard/settings" aria-label={t('account.settings.photoChange')}>
                  <Avatar name={user.name} src={user.avatarUrl} size={48} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <Link to="/dashboard/submit" className={`${btnBlue} h-10 px-3.5`} aria-label={t('account.nav.addListing')}>
                  <Plus size={17} /> <span className="hidden sm:inline">{t('account.nav.addListing')}</span>
                </Link>
              </div>
              <nav className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4 pb-1" aria-label={t('account.nav.account')}>
                {nav.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `relative flex-shrink-0 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold border transition ${
                      isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                    {Boolean(item.count) && <span className="text-[11px] font-bold opacity-70">{item.count}</span>}
                    {item.alert && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />}
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={signOut}
                  className="flex-shrink-0 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold border bg-white border-slate-200 text-slate-500"
                >
                  <LogOut size={16} /> {t('account.nav.logout')}
                </button>
              </nav>
            </div>

            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </AccountDataContext.Provider>
    </ToastProvider>
  );
}
