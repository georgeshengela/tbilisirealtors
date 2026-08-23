import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { useTranslation } from '../i18n/LocaleContext';
import { useProperties } from '../hooks/usePublicData';
import { useFavorites } from '../lib/favorites';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { data: properties, loading } = useProperties();
  const { ids: favoriteIds } = useFavorites();
  const [search, setSearch] = useState('');

  const favorites = properties.filter(p => favoriteIds.includes(p.id));

  const filtered = favorites.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.city.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 page-under-header">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container-xl py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Heart size={28} className="text-red-500" fill="currentColor" />
                {t('favorites.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t('favorites.subtitle', { count: favorites.length })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-xl py-8">
        {loading ? (
          <div className="text-center py-24 text-slate-500">{t('common.loading')}</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-red-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">{t('favorites.emptyTitle')}</h2>
            <p className="text-slate-500 mb-8">{t('favorites.emptyHint')}</p>
            <Link to="/listings" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors">
              {t('favorites.browse')}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-8">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('favorites.searchPlaceholder')}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-blue-600 focus:outline-none text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: t('favorites.saved'), value: favorites.length, color: 'blue' },
                { label: t('favorites.forSale'), value: favorites.filter(p => p.status === 'sale').length, color: 'emerald' },
                { label: t('favorites.forRent'), value: favorites.filter(p => p.status === 'rent').length, color: 'blue' },
                { label: t('favorites.premium'), value: favorites.filter(p => p.isPremium).length, color: 'amber' },
              ].map(stat => (
                <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <AnimatePresence>
                {filtered.map(p => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <PropertyCard property={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
