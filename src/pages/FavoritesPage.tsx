import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { properties } from '../data/mockData';
import PropertyCard from '../components/PropertyCard';

export default function FavoritesPage() {
  const [favorites] = useState(properties.filter(p => p.isFeatured || p.isPremium).slice(0, 5));
  const [search, setSearch] = useState('');

  const filtered = favorites.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.city.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container-xl py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Heart size={28} className="text-red-500" fill="currentColor" />
                ფავორიტები
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">შენახული განცხადება — {favorites.length} განცხადება</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-xl py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-red-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">ფავორიტები ცარიელია</h2>
            <p className="text-slate-500 mb-8">შენახეთ განცხადება, ♥ ღილაკზე დაჭერით</p>
            <Link to="/listings" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-500 transition-colors">
              განცხადების ძებნა
            </Link>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="flex gap-4 mb-8">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ფავორიტებში ძებნა..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'შენახული განცხადება', value: favorites.length, color: 'blue' },
                { label: 'გაყიდვა', value: favorites.filter(p => p.status === 'sale').length, color: 'emerald' },
                { label: 'გაქირავება', value: favorites.filter(p => p.status === 'rent').length, color: 'purple' },
                { label: 'პრემიუმ', value: favorites.filter(p => p.isPremium).length, color: 'amber' },
              ].map(stat => (
                <div key={stat.label} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 text-center`}>
                  <p className={`text-3xl font-bold text-${stat.color}-600 mb-1`}>{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Property Grid */}
            <AnimatePresence>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="relative">
                      <PropertyCard property={property} />
                      <button className="absolute top-14 right-3 z-10 w-8 h-8 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 rounded-full flex items-center justify-center transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
