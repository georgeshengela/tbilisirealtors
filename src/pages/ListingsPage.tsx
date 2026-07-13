import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, Grid3X3, List, MapPin, X,
  ArrowUpDown, Map, Building2
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { properties, districts } from '../data/mockData';

const SORT_OPTIONS = [
  { label: 'ახალი პირველი', value: 'newest' },
  { label: 'ძვ. → იაფი', value: 'price-desc' },
  { label: 'იაფი → ძვ.', value: 'price-asc' },
  { label: 'ყ. დიდი', value: 'area-desc' },
  { label: 'პოპ.', value: 'popular' },
];

export default function ListingsPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('newest');
  const [showMap, setShowMap] = useState(false);
  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    city: searchParams.get('city') || '',
    district: '',
    type: searchParams.get('type') || '',
    bedrooms: '',
    priceMin: '',
    priceMax: '',
    areaMin: '',
    isPremium: searchParams.get('premium') === 'true',
    isNew: searchParams.get('new') === 'true',
  });

  const districtList = filters.city ? districts[filters.city as keyof typeof districts] || [] : [];

  const filtered = useMemo(() => {
    let r = [...properties];
    if (search) r = r.filter(p => p.title.includes(search) || p.city.includes(search) || p.district.includes(search));
    if (filters.status) r = r.filter(p => p.status === filters.status);
    if (filters.city) r = r.filter(p => p.city === filters.city);
    if (filters.district) r = r.filter(p => p.district === filters.district);
    if (filters.type) r = r.filter(p => p.type === filters.type);
    if (filters.bedrooms) r = r.filter(p => p.bedrooms >= parseInt(filters.bedrooms));
    if (filters.priceMin) r = r.filter(p => p.price >= parseInt(filters.priceMin));
    if (filters.priceMax) r = r.filter(p => p.price <= parseInt(filters.priceMax));
    if (filters.areaMin) r = r.filter(p => p.area >= parseInt(filters.areaMin));
    if (filters.isPremium) r = r.filter(p => p.isPremium);
    if (filters.isNew) r = r.filter(p => p.isNew);
    switch (sort) {
      case 'price-desc': r.sort((a, b) => b.price - a.price); break;
      case 'price-asc':  r.sort((a, b) => a.price - b.price); break;
      case 'area-desc':  r.sort((a, b) => b.area - a.area); break;
      case 'popular':    r.sort((a, b) => b.viewCount - a.viewCount); break;
      default:           r.sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    }
    return r;
  }, [filters, sort, search]);

  const activeCount = Object.values(filters).filter(v => v !== '' && v !== false).length;

  const setF = (key: string, val: string | boolean) =>
    setFilters(f => ({ ...f, [key]: val }));

  const clear = () => setFilters({
    status: '', city: '', district: '', type: '', bedrooms: '',
    priceMin: '', priceMax: '', areaMin: '', isPremium: false, isNew: false,
  });

  return (
    <div className="min-h-screen pt-[56px] lg:pt-[102px]" style={{ background: '#f7f9fb' }}>

      {/* ── Sticky toolbar ── */}
      <div
        className="sticky top-[68px] z-30"
        style={{ background: 'rgba(247,249,251,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e0e3e5' }}
      >
        <div className="container-xl py-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#76777d]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ქალაქი, რაიონი, მისამართი..."
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                style={{ background: 'white', border: '1.5px solid #e0e3e5' }}
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
              style={showFilters || activeCount > 0
                ? { background: '#4f46e5', color: '#fff', border: '1.5px solid #4f46e5', boxShadow: '0 2px 8px rgba(79,70,229,0.28)' }
                : { background: 'white', color: '#45464d', border: '1.5px solid #e0e3e5' }}
            >
              <SlidersHorizontal size={15} strokeWidth={2} />
              ფილტრი
              {activeCount > 0 && (
                <span className="w-4.5 h-4.5 bg-[#497cff] text-white rounded-full text-[10px] font-bold flex items-center justify-center" style={{ width: 18, height: 18 }}>
                  {activeCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#45464d] flex-shrink-0"
              style={{ background: 'white', border: '1.5px solid #e0e3e5' }}>
              <ArrowUpDown size={14} strokeWidth={2} className="text-[#76777d]" />
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-transparent text-sm text-[#45464d] outline-none cursor-pointer border-none"
                style={{ boxShadow: 'none' }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* View mode */}
            <div className="hidden sm:flex rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: '1.5px solid #e0e3e5' }}>
              {([['grid', Grid3X3], ['list', List]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className="p-2.5 transition-colors"
                  style={view === v ? { background: '#4f46e5', color: '#fff' } : { background: 'white', color: '#76777d' }}>
                  <Icon size={15} strokeWidth={2} />
                </button>
              ))}
            </div>

            {/* Map */}
            <button
              onClick={() => setShowMap(v => !v)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
              style={showMap
                ? { background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: '1.5px solid #059669', boxShadow: '0 2px 8px rgba(5,150,105,0.32)' }
                : { background: 'white', color: '#45464d', border: '1.5px solid #e0e3e5' }}
            >
              <Map size={15} strokeWidth={2} />
              <span className="hidden md:inline">რუკა</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-white"
            style={{ borderBottom: '1px solid #e0e3e5' }}
          >
            <div className="container-xl py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { label: 'სტატუსი', key: 'status', opts: [['', 'ყველა'], ['sale', 'იყიდება'], ['rent', 'ქირავ.']] },
                  { label: 'ქალაქი', key: 'city', opts: [['', 'ყველა'], ['თბილისი', 'თბ.'], ['ბათუმი', 'ბათ.'], ['ქუთაისი', 'ქუთ.'], ['მცხეთა', 'მცხ.'], ['სიღნაღი', 'სიგ.'], ['გორი', 'გორი']] },
                  { label: 'ტიპი', key: 'type', opts: [['', 'ყველა'], ['apartment', 'ბინა'], ['house', 'სახლი'], ['villa', 'ვილა'], ['commercial', 'კომ.']] },
                  { label: 'საძინ.', key: 'bedrooms', opts: [['', 'ნება.'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']] },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1.5 block">{f.label}</label>
                    <select
                      value={filters[f.key as keyof typeof filters] as string}
                      onChange={e => setF(f.key, e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{ background: '#f7f9fb', border: '1.5px solid #e0e3e5', color: '#191c1e' }}
                    >
                      {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}

                {/* Rаиon */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1.5 block">რაიონი</label>
                  <select
                    value={filters.district}
                    onChange={e => setF('district', e.target.value)}
                    disabled={!filters.city}
                    className="w-full rounded-xl px-3 py-2.5 text-sm disabled:opacity-40"
                    style={{ background: '#f7f9fb', border: '1.5px solid #e0e3e5', color: '#191c1e' }}
                  >
                    <option value="">ყველა</option>
                    {districtList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Price min */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1.5 block">ფ. მინ. $</label>
                  <input type="number" placeholder="0"
                    value={filters.priceMin} onChange={e => setF('priceMin', e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: '#f7f9fb', border: '1.5px solid #e0e3e5', color: '#191c1e' }} />
                </div>

                {/* Price max */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1.5 block">ფ. მაქ. $</label>
                  <input type="number" placeholder="∞"
                    value={filters.priceMax} onChange={e => setF('priceMax', e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: '#f7f9fb', border: '1.5px solid #e0e3e5', color: '#191c1e' }} />
                </div>

                {/* Area min */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1.5 block">ფართ. მ²</label>
                  <input type="number" placeholder="0"
                    value={filters.areaMin} onChange={e => setF('areaMin', e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: '#f7f9fb', border: '1.5px solid #e0e3e5', color: '#191c1e' }} />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2 justify-end pb-0.5">
                  {[['isPremium', 'პრემ.'], ['isNew', 'ახ.']].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer text-sm text-[#45464d] font-medium">
                      <input type="checkbox"
                        checked={filters[k as 'isPremium' | 'isNew']}
                        onChange={e => setF(k, e.target.checked)}
                        className="w-4 h-4 rounded accent-[#191c1e]" />
                      {l}
                    </label>
                  ))}
                </div>

                {/* Clear */}
                <div className="flex items-end">
                  <button onClick={clear}
                    className="flex items-center gap-1.5 text-sm text-[#76777d] hover:text-[#ba1a1a] font-semibold transition-colors">
                    <X size={14} strokeWidth={2} />გასუფ.
                  </button>
                </div>
              </div>

              {/* Active chips */}
              {activeCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #eceef0' }}>
                  {filters.status && <Chip label={filters.status === 'sale' ? 'იყ.' : 'ქ.'} onRemove={() => setF('status', '')} />}
                  {filters.city && <Chip label={filters.city} onRemove={() => setF('city', '')} />}
                  {filters.type && <Chip label={filters.type} onRemove={() => setF('type', '')} />}
                  {filters.isPremium && <Chip label="პრემ." onRemove={() => setF('isPremium', false)} />}
                  {filters.isNew && <Chip label="ახ." onRemove={() => setF('isNew', false)} />}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="container-xl py-8">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-[#191c1e] text-xl">
              {filtered.length} <span className="font-400 text-[#76777d]">განცხადება</span>
            </h1>
            <p className="text-sm text-[#76777d] mt-0.5 flex items-center gap-1">
              <MapPin size={12} strokeWidth={2} style={{ color: '#497cff' }} />
              {filters.city || 'საქართველო — ყველა ქ.'}
            </p>
          </div>
        </div>

        <div className={showMap ? 'grid lg:grid-cols-2 gap-6' : ''}>
          {/* Map */}
          {showMap && (
            <div className="sticky top-36 h-[calc(100vh-10rem)] rounded-2xl overflow-hidden map-bg border border-[#e0e3e5]">
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-white">
                <MapPin size={40} style={{ color: '#497cff', marginBottom: 12 }} strokeWidth={1.5} />
                <p className="text-xl font-bold mb-1">ინტ. რუკა</p>
                <p className="text-white/50 text-sm">{filtered.length} განცხადება</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-xs px-4">
                  {filtered.slice(0, 5).map(p => (
                    <div key={p.id} className="glass-navy rounded-lg px-2.5 py-1 text-xs text-white font-semibold">
                      {p.price >= 1000000 ? `₾${(p.price/1000000).toFixed(1)}M` : `₾${(p.price/1000).toFixed(0)}K`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 col-span-full">
              <Building2 size={48} strokeWidth={1} className="mx-auto mb-4 text-[#c6c6cd]" />
              <h3 className="headline-md text-[#45464d] mb-2">შედეგი არ მოიძ.</h3>
              <p className="text-[#76777d] mb-6">სცადეთ ფილტ. შეცვლა</p>
              <button onClick={clear} className="btn-primary px-6 py-3 rounded-xl">ფილტ. გასუფ.</button>
            </div>
          ) : (
            <div>
              <div className={
                view === 'grid'
                  ? `grid grid-cols-1 sm:grid-cols-2 ${showMap ? '' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-5`
                  : 'space-y-4'
              }>
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <PropertyCard property={p} variant={view === 'list' ? 'horizontal' : 'default'} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2 mt-12">
                {['‹', 1, 2, 3, 4, 5, '›'].map((page, i) => (
                  <button
                    key={i}
                    className="w-10 h-10 rounded-xl text-sm font-semibold transition-all"
                    style={page === 1
                      ? { background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(79,70,229,0.30)' }
                      : { background: 'white', color: '#45464d', border: '1.5px solid #e0e3e5' }}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: '#eceef0', color: '#45464d' }}>
      {label}
      <button onClick={onRemove} className="hover:text-[#ba1a1a] transition-colors">
        <X size={11} strokeWidth={2.5} />
      </button>
    </span>
  );
}
