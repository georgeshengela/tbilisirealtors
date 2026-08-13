import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Pencil, Trash2, Eye, ExternalLink,
  Star, Zap, MapPin, Bed, Layers, Ruler, User, Phone,
  ArrowUpDown, ArrowUp, ArrowDown, X, Building2, TrendingUp, Home,
  Image as ImageIcon, Calendar, ChevronDown, Check,
  type LucideIcon,
} from 'lucide-react';

export interface AdminPropertyRow {
  id: string;
  title: string;
  price: string;
  pricePerSqm: string;
  city: string;
  district: string;
  type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  floor: number;
  totalFloors: number;
  yearBuilt: number;
  images: string[];
  isFeatured: boolean;
  isNew: boolean;
  isPremium: boolean;
  viewCount: number;
  listedDate: string;
  createdAt: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
}

type StatusFilter = 'all' | 'sale' | 'rent';
type BadgeFilter = 'all' | 'premium' | 'featured' | 'new';
type SortKey =
  | 'title' | 'price' | 'pricePerSqm' | 'area' | 'city' | 'type' | 'status'
  | 'bedrooms' | 'floor' | 'viewCount' | 'createdAt' | 'agentName';
type SortDir = 'asc' | 'desc';

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა', house: 'სახლი', commercial: 'კომ.', land: 'მიწა', villa: 'ვილა', hotel: 'სასტუმრო',
};
const TYPE_COLORS: Record<string, string> = {
  apartment: '#2563eb', house: '#10B981', commercial: '#f59e0b', land: '#2563eb', villa: '#ec4899', hotel: '#ef4444',
};
const STATUS_LABEL: Record<string, string> = { sale: 'იყიდება', rent: 'ქირავდება' };
const STATUS_COLOR: Record<string, string> = { sale: '#f59e0b', rent: '#10B981' };

const GEL = (n: number | string) => Number(n).toLocaleString('ka-GE') + ' ₾';

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  );
}

function Toggle({ on, onToggle, label, color = '#10B981' }: { on: boolean; onToggle: () => void; label: string; color?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${on ? 'opacity-100' : 'opacity-35'}`}
      style={{ background: on ? color : '#94a3b8' }}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ImgThumb({ src, large }: { src?: string; large?: boolean }) {
  const cls = large ? 'w-14 h-11' : 'w-12 h-10';
  if (!src) {
    return (
      <div className={`${cls} rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200/80`}>
        <ImageIcon size={14} className="text-slate-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={`${cls} rounded-xl object-cover flex-shrink-0 bg-slate-100 border border-slate-200/80`}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ka-GE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function sortValue(p: AdminPropertyRow, key: SortKey): string | number {
  switch (key) {
    case 'title': return (p.title || '').toLowerCase();
    case 'price': return Number(p.price) || 0;
    case 'pricePerSqm': return Number(p.pricePerSqm) || 0;
    case 'area': return Number(p.area) || 0;
    case 'city': return `${p.city} ${p.district}`.toLowerCase();
    case 'type': return p.type || '';
    case 'status': return p.status || '';
    case 'bedrooms': return p.bedrooms || 0;
    case 'floor': return p.floor || 0;
    case 'viewCount': return p.viewCount || 0;
    case 'createdAt': return p.createdAt || p.listedDate || '';
    case 'agentName': return (p.agentName || '').toLowerCase();
    default: return 0;
  }
}

const SORT_PRESETS: { id: string; label: string; key: SortKey; dir: SortDir; icon: LucideIcon }[] = [
  { id: 'created-desc', label: 'უახლესი პირველი', key: 'createdAt', dir: 'desc', icon: Calendar },
  { id: 'created-asc',  label: 'ძველი პირველი',   key: 'createdAt', dir: 'asc',  icon: Calendar },
  { id: 'price-desc',   label: 'ფასი — ძვირი',    key: 'price',     dir: 'desc', icon: TrendingUp },
  { id: 'price-asc',    label: 'ფასი — იაფი',     key: 'price',     dir: 'asc',  icon: TrendingUp },
  { id: 'area-desc',    label: 'ფართი — დიდი',    key: 'area',      dir: 'desc', icon: Ruler },
  { id: 'area-asc',     label: 'ფართი — პატარა',  key: 'area',      dir: 'asc',  icon: Ruler },
  { id: 'views-desc',   label: 'ნახვები — მეტი',  key: 'viewCount', dir: 'desc', icon: Eye },
  { id: 'title-asc',    label: 'სათაური A→Z',     key: 'title',     dir: 'asc',  icon: Building2 },
  { id: 'city-asc',     label: 'ლოკაცია A→Z',     key: 'city',      dir: 'asc',  icon: MapPin },
];

function FilterDropdown<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  accent = '#2563eb',
}: {
  label: string;
  icon?: LucideIcon;
  value: T;
  options: { value: T; label: string; dot?: string }[];
  onChange: (v: T) => void;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== ('all' as T);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200"
        style={
          active
            ? {
                background: `${accent}10`,
                borderColor: `${accent}35`,
                color: accent,
                boxShadow: 'none',
              }
            : {
                background: '#fff',
                borderColor: '#e2e8f0',
                color: '#475569',
              }
        }
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
            (e.currentTarget as HTMLElement).style.background = '#f8fafc';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
            (e.currentTarget as HTMLElement).style.background = '#fff';
          }
        }}
      >
        {Icon && (
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: active ? `${accent}18` : '#f1f5f9' }}
          >
            <Icon size={12} style={{ color: active ? accent : '#94a3b8' }} />
          </span>
        )}
        <span className="max-w-[120px] truncate">{selected?.label ?? label}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: active ? accent : '#94a3b8', opacity: 0.8 }}
        />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[200px] py-1.5 rounded-2xl border border-slate-200/90 bg-white overflow-hidden"
          style={{ boxShadow: '0 16px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)' }}
        >
          <p className="px-3.5 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          {options.map(opt => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs font-semibold text-left transition-colors"
                style={
                  isSelected
                    ? { background: `${accent}0c`, color: accent }
                    : { color: '#475569' }
                }
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {opt.dot && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.dot }} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${accent}20` }}
                  >
                    <Check size={11} strokeWidth={3} style={{ color: accent }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortDropdown({
  sortKey,
  sortDir,
  onSelect,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSelect: (key: SortKey, dir: SortDir) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentId = SORT_PRESETS.find(p => p.key === sortKey && p.dir === sortDir)?.id
    ?? `${sortKey}-${sortDir}`;
  const current = SORT_PRESETS.find(p => p.id === currentId);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
          borderColor: '#bfdbfe',
          color: '#2563eb',
          boxShadow: 'none',
        }}
      >
        <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
          <ArrowUpDown size={12} className="text-blue-600" />
        </span>
        <span className="hidden sm:inline max-w-[140px] truncate">
          {current?.label ?? 'დალაგება'}
        </span>
        <span className="sm:hidden">დალაგ.</span>
        <ChevronDown size={14} className={`text-blue-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] right-0 sm:left-0 sm:right-auto z-50 w-[240px] py-1.5 rounded-2xl border border-slate-200/90 bg-white overflow-hidden"
          style={{ boxShadow: '0 16px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)' }}
        >
          <p className="px-3.5 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">დალაგება</p>
          {SORT_PRESETS.map(preset => {
            const isSelected = sortKey === preset.key && sortDir === preset.dir;
            const DirIcon = preset.dir === 'asc' ? ArrowUp : ArrowDown;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => { onSelect(preset.key, preset.dir); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-left transition-colors"
                style={isSelected ? { background: '#eff6ff', color: '#2563eb' } : { color: '#475569' }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <preset.icon size={12} className="text-slate-500" />
                  </span>
                  <span className="truncate">{preset.label}</span>
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <DirIcon size={11} className={isSelected ? 'text-blue-600' : 'text-slate-300'} />
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                      <Check size={11} strokeWidth={3} className="text-blue-600" />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
function SortHeader({
  label, sortKey, currentKey, dir, onSort, className = '',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${className}`}
      style={
        active
          ? { background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' }
          : { background: 'transparent', color: '#64748b' }
      }
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
      <Icon size={11} className={active ? 'opacity-100' : 'opacity-35'} />
    </button>
  );
}

interface AdminPropertiesSectionProps {
  properties: AdminPropertyRow[];
  onPatch: (id: string, field: 'isPremium' | 'isFeatured' | 'isNew', value: boolean) => void;
  onDelete: (id: string) => void;
}

export default function AdminPropertiesSection({ properties, onPatch, onDelete }: AdminPropertiesSectionProps) {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const cities = useMemo(() => {
    const set = new Set(properties.map(p => p.city).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ka'));
  }, [properties]);

  const stats = useMemo(() => ({
    total: properties.length,
    sale: properties.filter(p => p.status === 'sale').length,
    rent: properties.filter(p => p.status === 'rent').length,
    premium: properties.filter(p => p.isPremium).length,
    featured: properties.filter(p => p.isFeatured).length,
    views: properties.reduce((s, p) => s + (p.viewCount || 0), 0),
  }), [properties]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'title' || key === 'city' || key === 'agentName' ? 'asc' : 'desc'); }
  }

  function applySort(key: SortKey, dir: SortDir) {
    setSortKey(key);
    setSortDir(dir);
  }

  const typeOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'ყველა ტიპი' },
      ...Object.entries(TYPE_LABELS).map(([k, v]) => ({
        value: k,
        label: v,
        dot: TYPE_COLORS[k],
      })),
    ],
    [],
  );

  const cityOptions = useMemo(
    () => [
      { value: 'all', label: 'ყველა ქალაქი' },
      ...cities.map(c => ({ value: c, label: c })),
    ],
    [cities],
  );

  const badgeOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'ყველა სტიკერი' },
      { value: 'premium' as const, label: 'VIP / პრემიუმი', dot: '#f59e0b' },
      { value: 'featured' as const, label: 'გამორჩეული', dot: '#2563eb' },
      { value: 'new' as const, label: 'ახალი', dot: '#10b981' },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = properties.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (cityFilter !== 'all' && p.city !== cityFilter) return false;
      if (badgeFilter === 'premium' && !p.isPremium) return false;
      if (badgeFilter === 'featured' && !p.isFeatured) return false;
      if (badgeFilter === 'new' && !p.isNew) return false;
      if (!q) return true;
      const hay = [
        p.title, p.city, p.district, p.agentName, p.agentPhone, p.agentEmail,
        TYPE_LABELS[p.type], STATUS_LABEL[p.status], p.id,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });

    const mul = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return list;
  }, [properties, search, statusFilter, typeFilter, cityFilter, badgeFilter, sortKey, sortDir]);

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || cityFilter !== 'all' || badgeFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCityFilter('all');
    setBadgeFilter('all');
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'სულ', value: stats.total, color: '#2563eb', bg: '#eff6ff', icon: Building2 },
          { label: 'იყიდება', value: stats.sale, color: '#f59e0b', bg: '#fffbeb', icon: TrendingUp },
          { label: 'ქირავდება', value: stats.rent, color: '#10b981', bg: '#ecfdf5', icon: Home },
          { label: 'VIP', value: stats.premium, color: '#f59e0b', bg: '#fef9c3', icon: Zap },
          { label: 'გამორჩეული', value: stats.featured, color: '#2563eb', bg: '#eff6ff', icon: Star },
          { label: 'ნახვები', value: stats.views.toLocaleString('ka-GE'), color: '#64748b', bg: '#f8fafc', icon: Eye },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-4 border border-slate-100 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-800 leading-none">{value}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ძიება: სათაური, ქალაქი, რაიონი, აგენტი, ID..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-slate-50/50"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/listings/new')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            ახალი განცხადება
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 gap-0.5">
            {([['all', 'ყველა'], ['sale', 'იყიდება'], ['rent', 'ქირავდება']] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <FilterDropdown
            label="ტიპი"
            icon={Building2}
            value={typeFilter}
            options={typeOptions}
            onChange={setTypeFilter}
            accent="#2563eb"
          />

          {cities.length > 1 && (
            <FilterDropdown
              label="ქალაქი"
              icon={MapPin}
              value={cityFilter}
              options={cityOptions}
              onChange={setCityFilter}
              accent="#10b981"
            />
          )}

          <FilterDropdown
            label="სტიკერი"
            icon={Star}
            value={badgeFilter}
            options={badgeOptions}
            onChange={v => setBadgeFilter(v as BadgeFilter)}
            accent="#f59e0b"
          />

          <SortDropdown sortKey={sortKey} sortDir={sortDir} onSelect={applySort} />

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
            >
              <X size={13} />
              გასუფთავება
            </button>
          )}

          <span className="text-xs text-slate-400 ml-auto font-medium">
            ნაჩვენებია <b className="text-slate-700">{filtered.length}</b> / {properties.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left py-3.5 pl-5 pr-2 w-[240px]">
                  <SortHeader label="განცხადება" sortKey="title" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2">
                  <SortHeader label="ტიპი" sortKey="type" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2">
                  <SortHeader label="გარიგ." sortKey="status" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2">
                  <SortHeader label="ფასი" sortKey="price" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2 hidden xl:table-cell">
                  <SortHeader label="₾/მ²" sortKey="pricePerSqm" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2">
                  <SortHeader label="ფართი" sortKey="area" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2 hidden lg:table-cell">
                  <SortHeader label="ოთახი" sortKey="bedrooms" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2 hidden lg:table-cell">
                  <SortHeader label="სართ." sortKey="floor" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2 hidden xl:table-cell">
                  <SortHeader label="აგენტი" sortKey="agentName" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2">
                  <SortHeader label="ნახვა" sortKey="viewCount" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left py-3.5 px-2 hidden md:table-cell">
                  <SortHeader label="თარიღი" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-center py-3.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">VIP</th>
                <th className="text-center py-3.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">გამ.</th>
                <th className="text-center py-3.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">ახ.</th>
                <th className="py-3.5 pr-5 pl-2 w-[100px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center">
                    <Building2 size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-500 font-semibold text-sm">
                      {hasFilters ? 'ფილტრებით ვერაფერი მოიძებნა' : 'განცხადება ჯერ არ არის'}
                    </p>
                    {hasFilters && (
                      <button type="button" onClick={clearFilters} className="mt-2 text-xs font-bold text-blue-600 hover:underline">
                        ფილტრების გასუფთავება
                      </button>
                    )}
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="py-3 pl-5 pr-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <ImgThumb src={p.images?.[0]} large />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 max-w-[200px]" title={p.title}>
                          {p.title || '—'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={10} className="flex-shrink-0 text-blue-400" />
                          {[p.district, p.city].filter(Boolean).join(', ') || '—'}
                        </p>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5 truncate" title={p.id}>{p.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <Badge label={TYPE_LABELS[p.type] || p.type} color={TYPE_COLORS[p.type] || '#94a3b8'} />
                  </td>
                  <td className="py-3 px-2">
                    <Badge label={STATUS_LABEL[p.status] || p.status} color={STATUS_COLOR[p.status] || '#94a3b8'} />
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <p className="font-extrabold text-slate-800">{GEL(p.price)}</p>
                  </td>
                  <td className="py-3 px-2 hidden xl:table-cell whitespace-nowrap text-xs text-slate-500">
                    {p.pricePerSqm ? GEL(p.pricePerSqm) : '—'}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Ruler size={11} className="text-slate-400" />
                      {p.area ? `${Number(p.area).toLocaleString('ka-GE')} მ²` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-2 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <Bed size={11} className="text-slate-400" />
                      {p.bedrooms || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-2 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <Layers size={11} className="text-slate-400" />
                      {p.floor ? `${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ''}` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-2 hidden xl:table-cell max-w-[140px]">
                    {p.agentName ? (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1">
                          <User size={10} className="text-slate-400 flex-shrink-0" />
                          {p.agentName}
                        </p>
                        {p.agentPhone && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Phone size={9} />
                            {p.agentPhone}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <Eye size={11} className="text-slate-400" />
                      {(p.viewCount ?? 0).toLocaleString('ka-GE')}
                    </span>
                  </td>
                  <td className="py-3 px-2 hidden md:table-cell whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar size={10} className="text-slate-400" />
                      {fmtDate(p.createdAt || p.listedDate)}
                    </span>
                  </td>
                  <td className="py-3 px-1 text-center">
                    <Toggle on={p.isPremium} onToggle={() => onPatch(p.id, 'isPremium', !p.isPremium)} label="VIP" color="#f59e0b" />
                  </td>
                  <td className="py-3 px-1 text-center">
                    <Toggle on={p.isFeatured} onToggle={() => onPatch(p.id, 'isFeatured', !p.isFeatured)} label="გამორჩეული" color="#2563eb" />
                  </td>
                  <td className="py-3 px-1 text-center">
                    <Toggle on={p.isNew} onToggle={() => onPatch(p.id, 'isNew', !p.isNew)} label="ახალი" color="#10B981" />
                  </td>
                  <td className="py-3 pr-5 pl-2">
                    <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <a
                        href={`/property/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="საიტზე ნახვა"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/listings/${p.id}/edit`)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title="რედაქტირება"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="წაშლა"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
