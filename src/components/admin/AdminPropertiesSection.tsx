import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
  type MouseEvent as ReactMouseEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Pencil, Trash2, Eye, ExternalLink,
  Star, MapPin, Ruler, User, Phone,
  ArrowUpDown, ArrowUp, ArrowDown, X, Building2, TrendingUp, Home,
  Image as ImageIcon, Calendar, ChevronDown, Check, Copy, History,
  PhoneCall, CalendarClock, Loader2, Mail, FileText, MessageSquare,
  CreditCard as IdCard, Upload, ClipboardList, Lock, Archive, Key,
  type LucideIcon,
} from 'lucide-react';
import { listingIdMatches } from '../../lib/listingId';
import { formatDotDate, formatGeorgianDateTime, formatGeorgianShortDate } from '../../lib/dateFormat';
import { roleLabel } from '../../lib/permissions';
import { useFileUpload, type UploadedFile } from '../../hooks/useFileUpload';
import { useAdminAuth, useApiRequest } from '../../contexts/AdminAuthContext';
import { FALLBACK_USD_RATE, useCurrency } from '../../contexts/CurrencyContext';
import ListingWorkPanel from './desk/ListingWorkPanel';
import {
  LIFECYCLE_OUTCOMES,
  LIFECYCLE_OUTCOME_META,
  isLifecycleOutcome,
  type LifecycleOutcome,
} from '../../lib/lifecycle';

export interface PriceChangeRow {
  id: number;
  propertyId: string;
  oldPrice: string | null;
  newPrice: string;
  changedBy: string | null;
  source: string;
  createdAt: string;
}

export interface PropertyOwnerInfo {
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
  note?: string;
}

export interface PropertyContractDoc {
  id: string;
  title: string;
  url: string;
  kind: 'pdf' | 'image' | 'link';
  addedAt: string;
  addedBy?: string;
}

export interface InternalNoteRow {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

export interface AdminPropertyRow {
  id: string;
  title: string;
  price: string;
  rentPrice?: string | null;
  pricePerSqm: string;
  address?: string | null;
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
  offersLast30Days?: number;
  offersLast60Days?: number;
  listedDate: string;
  createdAt: string;
  updatedAt?: string | null;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  staffName?: string | null;
  staffRole?: string | null;
  staffJobTitle?: string | null;
  creatorRole?: string | null;
  origin?: 'imported' | 'member' | 'office' | null;
  placement?: 'free' | 'paid' | null;
  placementPackage?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  lifecycleState?: string | null;
  rentTermMonths?: number | null;
  rentStartedAt?: string | null;
  rentExpiresAt?: string | null;
  lifecycleNote?: string | null;
  lifecycleOutcome?: string | null;
  lifecycleDealPrice?: string | number | null;
  priceHistory?: PriceChangeRow[];
  owner?: PropertyOwnerInfo | null;
  contracts?: PropertyContractDoc[] | null;
  internalNotes?: InternalNoteRow[] | null;
  /**
   * False on listings a manager handed to this broker: they can open and work the
   * listing, but only the author may change it. Absent means editable.
   */
  canEdit?: boolean;
}

/** Patch payload sent to PATCH /admin/properties/:id */
export type PropertyPatch = Partial<{
  isPremium: boolean;
  isFeatured: boolean;
  isNew: boolean;
  price: number;
  rentPrice: number | null;
  status: string;
  lifecycleState: string;
  rentTermMonths: number | null;
  rentStartedAt: string | null;
  rentExpiresAt: string | null;
  lifecycleNote: string;
  lifecycleOutcome: string | null;
  lifecycleDealPrice: number | string | null;
  owner: PropertyOwnerInfo | null;
  contracts: PropertyContractDoc[];
  internalNotes: InternalNoteRow[];
}>;

type StatusFilter = 'all' | 'sale' | 'rent';
type LifecycleFilter = 'all' | 'new' | 'current' | 'old' | 'new_r';
type BadgeFilter = 'all' | 'premium' | 'featured' | 'new' | 'rented_invest';
type OutcomeFilter = 'all' | LifecycleOutcome;
type SortKey =
  | 'title' | 'price' | 'pricePerSqm' | 'area' | 'city' | 'type' | 'status'
  | 'bedrooms' | 'floor' | 'viewCount' | 'createdAt' | 'agentName' | 'lifecycle' | 'owner';
type SortDir = 'asc' | 'desc';

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა', house: 'სახლი', commercial: 'კომ.', land: 'მიწა', villa: 'ვილა', hotel: 'სასტუმრო',
};
const TYPE_COLORS: Record<string, string> = {
  apartment: '#2563eb', house: '#10B981', commercial: '#f59e0b', land: '#2563eb', villa: '#ec4899', hotel: '#ef4444',
};
const STATUS_LABEL: Record<string, string> = { sale: 'იყიდება', rent: 'ქირავდება', both: 'იყიდება + ქირავდება' };
/** A listing marked "both" is offered for sale and for rent at once. */
const sellsAt = (p: AdminPropertyRow) => p.status === 'sale' || p.status === 'both';
const rentsAt = (p: AdminPropertyRow) => p.status === 'rent' || p.status === 'both';

/* Lifecycle vocabulary is the client's own: new → current → old → new R */
const LIFECYCLE_ORDER = ['new', 'current', 'old', 'new_r'] as const;

const LIFECYCLE_META: Record<string, { label: string; note: string; color: string; bg: string }> = {
  new:     { label: 'new',     note: 'ახლად დამატებული, ჯერ დაუმუშავებელი', color: '#2563eb', bg: '#eff6ff' },
  current: { label: 'current', note: 'აქტიურია — გამოქვეყნებულია და იყიდება/ქირავდება', color: '#10b981', bg: '#ecfdf5' },
  old:     { label: 'old',     note: 'არქივი — აირჩიე რატომ: გაიყიდა, გაქირავდა, შეჩერდა, აღარ იყიდება', color: '#64748b', bg: '#f1f5f9' },
  new_r:   { label: 'new R',   note: 'ვადა გავიდა — თავისუფლდება, დასარეკი და გადასამოწმებელი', color: '#ef4444', bg: '#fef2f2' },
};

const RENT_TERMS = [6, 12, 18, 24];
const PAUSE_DAYS = [3, 7, 14];

const PRICE_SOURCE_LABEL: Record<string, string> = {
  admin: 'ადმინ პანელი',
  import: 'იმპორტი',
  system: 'სისტემა',
};

/** Admin listings table always shows USD (DB still stores GEL). */
function useAdminUsd() {
  const { rates } = useCurrency();
  const usdRate = rates.USD ?? FALLBACK_USD_RATE;

  const gelToUsd = (amountGel: number | string | null | undefined) => {
    const n = Number(amountGel);
    if (!Number.isFinite(n) || n === 0) return 0;
    return Math.round(n / usdRate);
  };

  const usdToGel = (amountUsd: number) => {
    if (!Number.isFinite(amountUsd) || amountUsd === 0) return 0;
    return Math.round(amountUsd * usdRate);
  };

  const USD = (amountGel: number | string | null | undefined) => {
    const n = Number(amountGel);
    if (!Number.isFinite(n) || n === 0) return '—';
    return `$${gelToUsd(n).toLocaleString('ka-GE')}`;
  };

  return { USD, gelToUsd, usdToGel, usdRate };
}

const lifecycleOf = (p: AdminPropertyRow) => (p.lifecycleState && LIFECYCLE_META[p.lifecycleState] ? p.lifecycleState : 'new');

/** The address minus the district and city, which are shown separately. */
function streetOf(p: AdminPropertyRow): string {
  const parts = (p.address || '').split(',').map(s => s.trim()).filter(Boolean);
  const skip = new Set([p.city, p.district].filter(Boolean));
  return parts.filter(part => !skip.has(part)).join(', ');
}

/** Split a long imported address into 3–4 short lines for the table. */
function addressLines(p: AdminPropertyRow): string[] {
  const chunks = (p.address || '').split(',').map(s => s.trim()).filter(Boolean);
  const lines: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string | null) => {
    const text = (value || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(text);
  };

  if (chunks.length > 0) {
    const first = chunks[0].toLowerCase();
    const district = (p.district || '').trim();
    const districtKey = district.toLowerCase();
    if (district && !first.includes(districtKey) && !districtKey.includes(first.replace(/რაიონი/g, '').trim())) {
      add(district);
    }
    chunks.forEach(add);
  } else {
    add(p.district);
  }
  add(p.city);
  return lines.slice(0, 4);
}

function AddressCell({ p }: { p: AdminPropertyRow }) {
  const lines = addressLines(p);
  if (lines.length === 0) return <span className="text-slate-300">—</span>;

  return (
    <div className="min-w-[196px] max-w-[248px]" title={p.address || undefined}>
      {lines.map((line, index) => {
        const isFirst = index === 0;
        const isLast = index === lines.length - 1 && lines.length > 1;
        return (
          <p
            key={`${line}-${index}`}
            className={
              isFirst
                ? 'text-[13px] font-bold text-slate-800 leading-[1.35]'
                : isLast
                  ? 'mt-0.5 text-[11px] font-medium text-slate-400 leading-[1.35]'
                  : 'mt-0.5 text-[12px] font-medium text-slate-600 leading-[1.35]'
            }
          >
            {isFirst ? (
              <span className="inline-flex items-start gap-1">
                <MapPin size={11} className="mt-[3px] flex-shrink-0 text-blue-500" />
                <span>{line}</span>
              </span>
            ) : line}
          </p>
        );
      })}
    </div>
  );
}

/** Whole days from today; negative once the date is in the past. */
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function addMonthsISO(startedAt: string, months: number): string {
  const date = new Date(`${startedAt}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function addDaysISO(startedAt: string, days: number): string {
  const date = new Date(`${startedAt}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function outcomeOf(p: AdminPropertyRow): LifecycleOutcome | null {
  return isLifecycleOutcome(p.lifecycleOutcome) ? p.lifecycleOutcome : null;
}

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

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return formatGeorgianShortDate(iso) || '—';
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  return formatGeorgianDateTime(iso) || '—';
}

function sortValue(p: AdminPropertyRow, key: SortKey): string | number {
  switch (key) {
    case 'title': return (p.title || '').toLowerCase();
    case 'price': return Number(p.price) || 0;
    case 'pricePerSqm': return Number(p.pricePerSqm) || 0;
    case 'area': return Number(p.area) || 0;
    case 'city': return `${p.district} ${streetOf(p)} ${p.city}`.toLowerCase();
    case 'owner': return (p.owner?.name || '').toLowerCase();
    case 'type': return p.type || '';
    case 'status': return p.status || '';
    case 'bedrooms': return p.bedrooms || 0;
    case 'floor': return p.floor || 0;
    case 'viewCount': return p.viewCount || 0;
    case 'createdAt': return p.createdAt || p.listedDate || '';
    case 'agentName': return (p.agentName || '').toLowerCase();
    /* new R first, then the ones about to free up. */
    case 'lifecycle': return LIFECYCLE_ORDER.indexOf(lifecycleOf(p) as (typeof LIFECYCLE_ORDER)[number]);
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
          background: '#f8fafc',
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

/* Portalled so the table's horizontal scroll container cannot clip it. */
function AnchoredPopover({
  anchor, width = 300, onClose, children,
}: {
  anchor: HTMLElement | null;
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = ref.current?.offsetHeight ?? 280;
      const fitsBelow = window.innerHeight - rect.bottom > height + 16;
      setPos({
        top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - height - 8),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, width]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      className="rounded-2xl border border-slate-200 bg-white p-3.5"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        zIndex: 80,
        boxShadow: '0 20px 50px rgba(15,23,42,0.16), 0 4px 12px rgba(15,23,42,0.08)',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

const ORIGIN_LABEL: Record<string, string> = {
  imported: 'გადმოტანილი',
  member: 'მესაკუთრემ განათავსა',
  office: 'ოფისი',
};

/* Photo, listing ID and public URL as one compact tile. */
function ListingLeadCell({ p, onOpen }: { p: AdminPropertyRow; onOpen: () => void }) {
  const [copied, setCopied] = useState(false);
  const viewHref = `/property/${encodeURIComponent(p.id)}`;
  const photo = p.images?.[0];

  async function copyId() {
    try {
      await navigator.clipboard.writeText(p.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="w-[92px]">
      <div className="mb-1 flex items-center gap-0.5">
        <button
          type="button"
          onClick={copyId}
          title={copied ? 'დაკოპირდა' : 'ID-ის კოპირება'}
          className="font-mono text-[10px] font-bold tabular-nums text-slate-700 hover:text-blue-600"
        >
          {p.id}
        </button>
        {p.isFeatured && <Star size={10} className="fill-amber-400 text-amber-400" />}
        {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={9} className="text-slate-300" />}
      </div>
      <button
        type="button"
        onClick={onOpen}
        title="რედაქტირება"
        className="relative block h-[52px] w-[80px] overflow-hidden rounded border border-slate-200 bg-slate-100"
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageIcon size={14} className="text-slate-300" />
          </span>
        )}
      </button>
      <a
        href={viewHref}
        target="_blank"
        rel="noreferrer"
        title="საიტზე ნახვა"
        className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600 hover:underline"
      >
        <ExternalLink size={9} />
        ლინკი
      </a>
    </div>
  );
}

/* One editable money value — displayed in USD, saved as GEL. */
function InlineMoney({
  value, label, labelColor, suffix, onSave, delta,
}: {
  value: number | null;
  label: string;
  labelColor: string;
  suffix?: string;
  onSave: (nextGel: number) => Promise<void>;
  delta?: { previous: number; current: number } | null;
}) {
  const { USD, gelToUsd, usdToGel } = useAdminUsd();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function commit() {
    const nextUsd = Number(draft.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(nextUsd) || nextUsd < 0) {
      setEditing(false);
      return;
    }
    const nextGel = usdToGel(nextUsd);
    if (nextGel === (value ?? 0)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextGel);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 py-0.5">
        <span className="text-[11px] font-bold text-slate-400">$</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          disabled={saving}
          className="w-[92px] px-2 py-1 rounded-lg border border-blue-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
          title="შენახვა"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={3} />}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
          title="გაუქმება"
        >
          <X size={11} strokeWidth={3} />
        </button>
      </div>
    );
  }

  const diff = delta ? delta.current - delta.previous : 0;
  const pct = delta && delta.previous ? Math.abs(diff / delta.previous) * 100 : 0;

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[9px] font-extrabold uppercase tracking-wide" style={{ color: labelColor }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => { setDraft(value ? String(gelToUsd(value)) : ''); setEditing(true); }}
        title="ფასის შეცვლა ($)"
        className="font-extrabold text-slate-800 hover:text-blue-600 transition-colors text-[13px]"
      >
        {value ? USD(value) : <span className="text-slate-300">ფასი —</span>}
        {value && suffix ? <span className="text-[10px] font-bold text-slate-400">{suffix}</span> : null}
      </button>

      {delta && diff !== 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[9px] font-extrabold"
          style={diff > 0 ? { background: '#fef2f2', color: '#ef4444' } : { background: '#ecfdf5', color: '#10b981' }}
        >
          {diff > 0 ? <ArrowUp size={8} strokeWidth={3} /> : <ArrowDown size={8} strokeWidth={3} />}
          {pct >= 0.1 ? `${pct.toFixed(pct < 10 ? 1 : 0)}%` : ''}
        </span>
      )}
    </div>
  );
}

/* ── Sale and/or rent price, inline editable, with the full change log ── */
function PriceCell({
  p, onPatch,
}: {
  p: AdminPropertyRow;
  onPatch: (id: string, patch: PropertyPatch) => Promise<void>;
}) {
  const { USD } = useAdminUsd();
  const [historyAnchor, setHistoryAnchor] = useState<HTMLElement | null>(null);

  const history = p.priceHistory ?? [];
  const lastChange = history.find(h => h.oldPrice != null && h.oldPrice !== '');
  const previous = lastChange ? Number(lastChange.oldPrice) : null;
  const current = Number(p.price) || 0;
  const rent = p.rentPrice == null || p.rentPrice === '' ? null : Number(p.rentPrice);

  const sells = sellsAt(p);
  const rents = rentsAt(p);

  return (
    <div className="min-w-0 space-y-0.5">
      {sells && (
        <InlineMoney
          value={current}
          label="იყიდება"
          labelColor="#f59e0b"
          onSave={next => onPatch(p.id, { price: next })}
          delta={previous !== null ? { previous, current } : null}
        />
      )}

      {rents && (
        <InlineMoney
          value={p.status === 'rent' ? current : rent}
          label="ქირავდება"
          labelColor="#10b981"
          suffix="/თვე"
          onSave={next => onPatch(p.id, p.status === 'rent' ? { price: next } : { rentPrice: next })}
          delta={p.status === 'rent' && previous !== null ? { previous, current } : null}
        />
      )}

      <button
        type="button"
        onClick={e => setHistoryAnchor(historyAnchor ? null : e.currentTarget)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-blue-600 mt-0.5 transition-colors"
        title="ფასის ისტორია"
      >
        <History size={10} />
        {previous !== null
          ? <span>წინა: <b className="text-slate-500">{USD(previous)}</b></span>
          : <span>ისტორია ({history.length})</span>}
      </button>

      {historyAnchor && (
        <AnchoredPopover anchor={historyAnchor} width={310} onClose={() => setHistoryAnchor(null)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">ფასის ისტორია ($)</p>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">ცვლილება ჯერ არ დაფიქსირებულა</p>
          ) : (
            <div className="max-h-[260px] overflow-y-auto -mx-1 px-1">
              {history.map(change => {
                const from = change.oldPrice == null || change.oldPrice === '' ? null : Number(change.oldPrice);
                const to = Number(change.newPrice);
                const up = from !== null && to > from;
                return (
                  <div key={change.id} className="py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      {from !== null ? (
                        <>
                          <span className="text-slate-400 line-through">{USD(from)}</span>
                          <span className="text-slate-300">→</span>
                          <span className="font-bold text-slate-800">{USD(to)}</span>
                          <span
                            className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-extrabold"
                            style={{ color: up ? '#ef4444' : '#10b981' }}
                          >
                            {up ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}
                            {USD(Math.abs(to - from))}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-slate-800">{USD(to)}</span>
                          <span className="ml-auto text-[10px] font-bold text-slate-400">დამატება</span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {fmtDateTime(change.createdAt)} · {PRICE_SOURCE_LABEL[change.source] ?? change.source}
                      {change.changedBy ? ` · ${change.changedBy}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </AnchoredPopover>
      )}
    </div>
  );
}

/* ── Lifecycle state + the old-subcategory that explains why it left the live table ── */
function LifecycleCell({
  p, onPatch,
}: {
  p: AdminPropertyRow;
  onPatch: (id: string, patch: PropertyPatch) => Promise<void>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);

  const state = lifecycleOf(p);
  const outcome = outcomeOf(p);
  const chipState = outcome === 'rented_owner' ? 'current' : state;
  const meta = LIFECYCLE_META[chipState];
  const days = daysUntil(p.rentExpiresAt);
  const outcomeMeta = outcome ? LIFECYCLE_OUTCOME_META[outcome] : null;

  const [draftState, setDraftState] = useState(state);
  const [draftOutcome, setDraftOutcome] = useState<LifecycleOutcome | ''>(outcome ?? '');
  const [draftTerm, setDraftTerm] = useState<number | null>(p.rentTermMonths ?? 12);
  const [draftStart, setDraftStart] = useState(p.rentStartedAt?.slice(0, 10) ?? todayISO());
  const [draftEnd, setDraftEnd] = useState(p.rentExpiresAt?.slice(0, 10) ?? '');
  const [draftPrice, setDraftPrice] = useState(p.lifecycleDealPrice != null ? String(p.lifecycleDealPrice) : '');
  const [draftNote, setDraftNote] = useState(p.lifecycleNote ?? '');

  function openEditor(e: ReactMouseEvent<HTMLButtonElement>) {
    const startsOld = state === 'old' || outcome === 'rented_owner';
    setDraftState(startsOld ? 'old' : state);
    setDraftOutcome(outcome ?? '');
    setDraftTerm(p.rentTermMonths ?? 12);
    setDraftStart(p.rentStartedAt?.slice(0, 10) ?? todayISO());
    setDraftEnd(
      p.rentExpiresAt?.slice(0, 10)
      ?? (outcome === 'paused' ? addDaysISO(todayISO(), 7) : addMonthsISO(p.rentStartedAt?.slice(0, 10) ?? todayISO(), p.rentTermMonths ?? 12)),
    );
    setDraftPrice(p.lifecycleDealPrice != null ? String(p.lifecycleDealPrice) : '');
    setDraftNote(p.lifecycleNote ?? '');
    setAnchor(anchor ? null : e.currentTarget);
  }

  function pickState(key: typeof LIFECYCLE_ORDER[number]) {
    setDraftState(key);
    if (key !== 'old' && key !== 'new_r') setDraftOutcome('');
    if (key === 'old' && !draftOutcome) {
      setDraftEnd(addDaysISO(todayISO(), 7));
    }
  }

  function pickOutcome(next: LifecycleOutcome) {
    setDraftOutcome(next);
    if (next === 'paused' && !p.rentExpiresAt) setDraftEnd(addDaysISO(todayISO(), 7));
    if (next === 'rented_us' && !draftStart) {
      const start = todayISO();
      setDraftStart(start);
      setDraftTerm(12);
      setDraftEnd(addMonthsISO(start, 12));
    }
  }

  function pickTerm(months: number) {
    setDraftTerm(months);
    setDraftEnd(addMonthsISO(draftStart || todayISO(), months));
  }

  function pickStart(value: string) {
    setDraftStart(value);
    if (draftTerm) setDraftEnd(addMonthsISO(value || todayISO(), draftTerm));
  }

  const parked = draftState === 'old' || draftState === 'new_r';
  const needsOutcome = draftState === 'old';
  const canSave = !needsOutcome || Boolean(draftOutcome);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const termOutcome = draftOutcome === 'rented_us' || (!draftOutcome && parked);
      await onPatch(p.id, {
        lifecycleState: draftState,
        lifecycleOutcome: parked ? (draftOutcome || null) : null,
        rentTermMonths: termOutcome ? draftTerm : null,
        rentStartedAt: termOutcome ? draftStart || todayISO() : null,
        rentExpiresAt: draftOutcome === 'paused' || termOutcome ? (draftEnd || null) : null,
        lifecycleDealPrice: draftOutcome === 'rented_us' ? (draftPrice.trim() || null) : null,
        lifecycleNote: draftNote.trim(),
      });
      setAnchor(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={openEditor}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all hover:brightness-95"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}25` }}
        title={outcomeMeta?.label ?? meta.note}
      >
        {chipState === 'new_r' && <PhoneCall size={10} strokeWidth={2.6} />}
        {outcome === 'rented_owner' && <Key size={10} strokeWidth={2.6} />}
        {meta.label}
        <ChevronDown size={10} className="opacity-50" />
      </button>

      {outcomeMeta && (
        <p className="text-[10px] font-bold mt-1 leading-snug" style={{ color: outcome === 'rented_owner' ? '#0f766e' : '#64748b' }}>
          {outcomeMeta.label}
        </p>
      )}

      {(state === 'old' || state === 'new_r') && p.rentExpiresAt && (outcome === 'paused' || outcome === 'rented_us' || !outcome) && (
        <p
          className="text-[10px] font-semibold mt-0.5 flex items-center gap-1 whitespace-nowrap"
          style={{ color: state === 'new_r' || (days !== null && days <= 30) ? '#d97706' : '#94a3b8' }}
        >
          <CalendarClock size={10} />
          {fmtDate(p.rentExpiresAt)}
          {days !== null && days >= 0 && <span>· {days} დღე</span>}
        </p>
      )}

      {state === 'new_r' && (
        <p className="text-[10px] font-bold text-red-500 mt-0.5 whitespace-nowrap">
          {days !== null && days < 0 ? `ვადა ${Math.abs(days)} დღის წინ გავიდა` : 'ვადა გავიდა — დაურეკე'}
        </p>
      )}

      {anchor && (
        <AnchoredPopover anchor={anchor} width={360} onClose={() => setAnchor(null)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">განცხადების სტატუსი</p>

          <div className="space-y-1">
            {LIFECYCLE_ORDER.map(key => {
              const item = LIFECYCLE_META[key];
              const selected = draftState === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickState(key)}
                  className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors"
                  style={selected ? { background: item.bg, border: `1px solid ${item.color}30` } : { border: '1px solid transparent' }}
                  onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span
                    className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: selected ? item.color : '#cbd5e1' }}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold" style={{ color: selected ? item.color : '#334155' }}>
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-slate-400 leading-snug">{item.note}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {needsOutcome && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">რატომ არის old</p>
              <div className="grid grid-cols-1 gap-1">
                {LIFECYCLE_OUTCOMES.map(id => {
                  const item = LIFECYCLE_OUTCOME_META[id];
                  const selected = draftOutcome === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickOutcome(id)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl border transition-colors"
                      style={selected
                        ? { background: '#f8fafc', borderColor: '#94a3b8' }
                        : { background: '#fff', borderColor: '#e2e8f0' }}
                    >
                      <span className="block text-[11px] font-extrabold text-slate-800">{item.label}</span>
                      <span className="block text-[10px] text-slate-400 leading-snug">{item.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {draftOutcome === 'paused' && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">როდის დაბრუნდეს New R-ში</p>
              <div className="flex flex-wrap gap-1">
                {PAUSE_DAYS.map(daysN => (
                  <button
                    key={daysN}
                    type="button"
                    onClick={() => setDraftEnd(addDaysISO(todayISO(), daysN))}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                    style={draftEnd === addDaysISO(todayISO(), daysN)
                      ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }
                      : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}
                  >
                    {daysN} დღე
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-400 mb-1">თარიღი</span>
                <input
                  type="date"
                  value={draftEnd}
                  onChange={e => setDraftEnd(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                />
              </label>
              <p className="text-[10px] text-slate-400">
                ამ თარიღზე სტატუსი ავტომატურად გახდება <b className="text-red-500">new R</b>.
              </p>
            </div>
          )}

          {draftOutcome === 'rented_us' && (
            <div className="mt-3 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ქირავნობის ვადა და ფასი</p>
              <div className="flex flex-wrap gap-1">
                {RENT_TERMS.map(months => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => pickTerm(months)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                    style={draftTerm === months
                      ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }
                      : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}
                  >
                    {months} თვე
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">დაწყება</span>
                  <input
                    type="date"
                    value={draftStart}
                    onChange={e => pickStart(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">თავისუფლდება</span>
                  <input
                    type="date"
                    value={draftEnd}
                    onChange={e => { setDraftEnd(e.target.value); setDraftTerm(null); }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-400 mb-1">ქირის ფასი (₾)</span>
                <input
                  type="number"
                  min={0}
                  value={draftPrice}
                  onChange={e => setDraftPrice(e.target.value)}
                  placeholder="მაგ. 1200"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                />
              </label>
              <p className="text-[10px] text-slate-400">
                ვადის გასვლის შემდეგ სტატუსი ავტომატურად გახდება <b className="text-red-500">new R</b>.
              </p>
            </div>
          )}

          {draftOutcome === 'rented_owner' && (
            <p className="mt-2 text-[10px] text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-2.5 py-2 leading-snug">
              განცხადება რჩება გაყიდვაზე და მთავარ ცხრილში. შიდა ნიშანია, რომ გაქირავებულია — ინვესტიციის ფილტრისთვის.
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-slate-100">
            <input
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              placeholder="კომენტარი (ნებისმიერი სტატუსისთვის)"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
            />
          </div>

          {!canSave && (
            <p className="mt-2 text-[10px] font-semibold text-amber-600">აირჩიე ქვეკატეგორია, შემდეგ შეინახე.</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !canSave}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
              style={{ background: '#059669' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
              შენახვა
            </button>
            <button
              type="button"
              onClick={() => setAnchor(null)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
            >
              გაუქმება
            </button>
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}

/* ── Owner: name in the row, full record in a popover ── */
const OWNER_FIELDS: { key: keyof PropertyOwnerInfo; label: string; placeholder: string; icon: LucideIcon }[] = [
  { key: 'name',     label: 'სახელი გვარი',    placeholder: 'ნინო ბერიძე',        icon: User },
  { key: 'phone',    label: 'ტელეფონი',        placeholder: '+995 5XX XXX XXX',   icon: Phone },
  { key: 'email',    label: 'Email',           placeholder: 'owner@mail.com',     icon: Mail },
  { key: 'idNumber', label: 'პირადი ნომერი',   placeholder: '01001XXXXXX',        icon: IdCard },
  { key: 'address',  label: 'მისამართი',       placeholder: 'ქ. თბილისი, ...',    icon: MapPin },
];

function OwnerCell({
  p, onPatch,
}: {
  p: AdminPropertyRow;
  onPatch: (id: string, patch: PropertyPatch) => Promise<void>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PropertyOwnerInfo>({});

  const owner = p.owner ?? {};
  const hasContact = Boolean(owner.phone || owner.email || owner.idNumber || owner.address || owner.note);
  const canMutateOwner = p.canEdit !== false;
  const canOpenOwner = canMutateOwner || hasContact;
  const filled = Object.values(owner).some(v => v && String(v).trim());

  function open(e: ReactMouseEvent<HTMLButtonElement>) {
    if (!canOpenOwner) return;
    setDraft({ ...owner });
    setEditing(!filled);
    setAnchor(anchor ? null : e.currentTarget);
  }

  async function save() {
    setSaving(true);
    try {
      await onPatch(p.id, { owner: draft });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={open}
        className="text-left min-w-0 max-w-[140px] group/owner disabled:cursor-default"
        title={canOpenOwner ? 'მესაკუთრის ინფორმაცია' : (owner.name || 'მესაკუთრის კონტაქტი დაფარულია')}
        disabled={!canOpenOwner}
      >
        {filled ? (
          <>
            <span className={`block text-xs font-bold text-slate-700 truncate ${canOpenOwner ? 'group-hover/owner:text-blue-600 transition-colors' : ''}`}>
              {owner.name || 'უსახელო'}
            </span>
            {hasContact ? (
              <span className="block text-[10px] text-slate-400 truncate">
                {owner.phone || owner.email}
              </span>
            ) : canOpenOwner ? (
              <span className="block text-[10px] text-slate-400 truncate">დეტალები</span>
            ) : null}
          </>
        ) : canOpenOwner ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-blue-500 transition-colors">
            <Plus size={11} /> მესაკუთრე
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-300">—</span>
        )}
      </button>

      {anchor && (
        <AnchoredPopover anchor={anchor} width={320} onClose={() => setAnchor(null)}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">მესაკუთრე</p>
            {!editing && canMutateOwner && (
              <button
                type="button"
                onClick={() => { setDraft({ ...owner }); setEditing(true); }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
              >
                <Pencil size={10} /> რედაქტირება
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              {OWNER_FIELDS.map(field => (
                <label key={field.key} className="block">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">{field.label}</span>
                  <input
                    value={draft[field.key] ?? ''}
                    onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
                  />
                </label>
              ))}
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-400 mb-1">შენიშვნა</span>
                <textarea
                  value={draft.note ?? ''}
                  onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                  rows={2}
                  placeholder="რეესტრი, თანამესაკუთრეები, სპეციფიკა..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:border-blue-400"
                />
              </label>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: '#059669' }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                  შენახვა
                </button>
                <button
                  type="button"
                  onClick={() => (filled ? setEditing(false) : setAnchor(null))}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {OWNER_FIELDS.filter(f => owner[f.key]).map(field => (
                <div key={field.key} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <field.icon size={11} className="text-slate-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{field.label}</p>
                    <p className="text-xs font-semibold text-slate-700 break-words">{owner[field.key]}</p>
                  </div>
                </div>
              ))}
              {owner.note && (
                <div className="pt-2 mt-1 border-t border-slate-100">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">შენიშვნა</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">{owner.note}</p>
                </div>
              )}
            </div>
          )}
        </AnchoredPopover>
      )}
    </div>
  );
}

/* ── Signed agreements kept against the listing ── */
function docKind(url: string): PropertyContractDoc['kind'] {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (/\.(jpe?g|png|webp|heic|gif)$/.test(clean)) return 'image';
  return 'link';
}

function ContractCell({
  p, onPatch,
}: {
  p: AdminPropertyRow;
  onPatch: (id: string, patch: PropertyPatch) => Promise<void>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error: uploadError } = useFileUpload();

  const docs = p.contracts ?? [];
  const signed = docs.length > 0;

  async function persist(next: PropertyContractDoc[]) {
    setSaving(true);
    try {
      await onPatch(p.id, { contracts: next });
    } finally {
      setSaving(false);
    }
  }

  async function attachFiles(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await upload(files);
    if (!uploaded.length) return;
    await persist([
      ...docs,
      ...uploaded.map((file: UploadedFile, i: number) => ({
        id: `c${Date.now().toString(36)}${i}`,
        title: title.trim() || file.name,
        url: file.url,
        kind: file.kind === 'pdf' ? ('pdf' as const) : ('image' as const),
        addedAt: new Date().toISOString(),
      })),
    ]);
    setTitle('');
  }

  async function add() {
    const link = url.trim();
    if (!link) return;
    await persist([
      ...docs,
      {
        id: `c${Date.now().toString(36)}`,
        title: title.trim() || 'ხელშეკრულება',
        url: link,
        kind: docKind(link),
        addedAt: new Date().toISOString(),
      },
    ]);
    setTitle('');
    setUrl('');
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={e => setAnchor(anchor ? null : e.currentTarget)}
        className="inline-flex items-center gap-1.5"
        title={signed ? `${docs.length} ხელშეკრულება` : 'ხელშეკრულება არ არის'}
      >
        <span
          className="w-[18px] h-[18px] rounded-[6px] border-2 flex items-center justify-center transition-all"
          style={
            signed
              ? { background: '#10b981', borderColor: '#10b981' }
              : { background: '#fff', borderColor: '#cbd5e1' }
          }
        >
          {signed && <Check size={11} strokeWidth={4} className="text-white" />}
        </span>
        <span className="text-[10px] font-bold" style={{ color: signed ? '#059669' : '#94a3b8' }}>
          {signed ? `${docs.length} ფაილი` : 'არა'}
        </span>
      </button>

      {anchor && (
        <AnchoredPopover anchor={anchor} width={330} onClose={() => setAnchor(null)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
            ხელშეკრულებები მესაკუთრესთან
          </p>

          {docs.length === 0 ? (
            <p className="text-[11px] text-slate-400 pb-2">ჯერ არაფერია მიმაგრებული</p>
          ) : (
            <div className="space-y-1.5 mb-3 max-h-[180px] overflow-y-auto -mx-1 px-1">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: doc.kind === 'pdf' ? '#fef2f2' : doc.kind === 'image' ? '#eff6ff' : '#f1f5f9' }}
                  >
                    {doc.kind === 'image'
                      ? <ImageIcon size={12} className="text-blue-500" />
                      : <FileText size={12} className={doc.kind === 'pdf' ? 'text-red-500' : 'text-slate-400'} />}
                  </span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 group/doc"
                  >
                    <span className="block text-[11px] font-bold text-slate-700 truncate group-hover/doc:text-blue-600">
                      {doc.title}
                    </span>
                    <span className="block text-[9px] text-slate-400">{fmtDate(doc.addedAt)}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => persist(docs.filter(d => d.id !== doc.id))}
                    className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                    title="მოხსნა"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="დასახელება (მაგ. ექსკლუზივი 12.08)"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              hidden
              onChange={e => { void attachFiles(e.target.files); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || saving}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: '#059669' }}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} strokeWidth={3} />}
              PDF / ფოტოს ატვირთვა
            </button>

            <div className="flex items-center gap-1.5">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); }}
                placeholder="ან ჩასვით ბმული"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={add}
                disabled={saving || !url.trim()}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                title="ბმულის მიმაგრება"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={3} />}
              </button>
            </div>

            {uploadError && <p className="text-[10px] font-bold text-red-500">{uploadError}</p>}
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}

/* ── Internal comments: registry details that must not reach the public site ── */
function NotesButton({
  p, onPatch,
}: {
  p: AdminPropertyRow;
  onPatch: (id: string, patch: PropertyPatch) => Promise<void>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const notes = p.internalNotes ?? [];

  async function persist(next: InternalNoteRow[]) {
    setSaving(true);
    try {
      await onPatch(p.id, { internalNotes: next });
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const body = text.trim();
    if (!body) return;
    await persist([
      { id: `n${Date.now().toString(36)}`, text: body, createdAt: new Date().toISOString() },
      ...notes,
    ]);
    setText('');
  }

  return (
    <>
      <button
        type="button"
        onClick={e => setAnchor(anchor ? null : e.currentTarget)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
        style={
          notes.length
            ? { background: '#eff6ff', color: '#2563eb' }
            : { background: '#f8fafc', color: '#94a3b8' }
        }
        title="შიდა კომენტარები"
      >
        <MessageSquare size={11} />
        კომენტარი
        {notes.length > 0 && (
          <span className="px-1 rounded-md bg-blue-100 text-blue-700 text-[9px] font-extrabold">{notes.length}</span>
        )}
      </button>

      {anchor && (
        <AnchoredPopover anchor={anchor} width={340} onClose={() => setAnchor(null)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">შიდა კომენტარები</p>
          <p className="text-[10px] text-slate-400 mb-2.5">ჩანს მხოლოდ ადმინში — საიტზე არ გამოქვეყნდება.</p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(); }}
            rows={3}
            placeholder="რეესტრი ვის სახელზეა, დამატებითი დეტალები..."
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-[11px] text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:border-blue-400"
          />
          <button
            type="button"
            onClick={add}
            disabled={saving || !text.trim()}
            className="w-full mt-1.5 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
            style={{ background: '#2563eb' }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
            შენახვა
          </button>

          {notes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 max-h-[220px] overflow-y-auto -mx-1 px-1">
              {notes.map(note => (
                <div key={note.id} className="group/note p-2 rounded-xl bg-slate-50">
                  <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-slate-400">
                      {fmtDateTime(note.createdAt)}{note.author ? ` · ${note.author}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => persist(notes.filter(n => n.id !== note.id))}
                      className="ml-auto p-0.5 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover/note:opacity-100 transition-opacity"
                      title="წაშლა"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnchoredPopover>
      )}
    </>
  );
}

export interface ListingStaffOption {
  id: number;
  name: string;
  fullName?: string;
  role: string;
  jobTitle?: string | null;
}

export interface ListingsSummary {
  total: number;
  sale: number;
  rent: number;
  new: number;
  current: number;
  old: number;
  new_r: number;
}

interface AdminPropertiesSectionProps {
  properties: AdminPropertyRow[];
  total?: number;
  page?: number;
  limit?: number;
  summary?: ListingsSummary | null;
  staffOptions?: ListingStaffOption[];
  onPatch: (id: string, patch: PropertyPatch) => Promise<void>;
  onDelete: (id: string) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function AdminPropertiesSection({
  properties,
  total = 0,
  page = 1,
  limit = 20,
  summary,
  staffOptions = [],
  onPatch,
  onDelete,
  showToast,
}: AdminPropertiesSectionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, can } = useAdminAuth();
  const api = useApiRequest();
  const staffId = searchParams.get('staff') || '';
  const memberQ = searchParams.get('member') || '';
  const [memberDraft, setMemberDraft] = useState(memberQ);

  useEffect(() => { setMemberDraft(memberQ); }, [memberQ]);

  function patchQuery(next: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams);
    params.set('section', 'properties');
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (resetPage) params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function openEdit(id: string) {
    sessionStorage.setItem('admin-listings-scroll', String(window.scrollY));
    const from = `?${searchParams.toString()}`;
    navigate(`/admin/listings/${id}/edit?from=${encodeURIComponent(from)}`);
  }

  useLayoutEffect(() => {
    const y = sessionStorage.getItem('admin-listings-scroll');
    if (!y) return;
    window.scrollTo(0, Number(y));
    sessionStorage.removeItem('admin-listings-scroll');
  }, []);

  useEffect(() => {
    if (page > 1 && properties.length === 0 && total > 0) {
      patchQuery({ page: String(page - 1) }, false);
    }
  }, [page, properties.length, total]);

  // The server already strips what this account may not see; these keep the
  // matching controls out of the table so nothing looks editable but isn't.
  const canPrice = can('listings.price');
  const canOwner = can('listings.owner');
  const canContracts = can('listings.contracts');
  const canNotes = can('listings.notes');
  const canLifecycle = can('listings.lifecycle');
  const canEdit = can('listings.edit');
  const canDelete = can('listings.delete');
  const canTasks = can('listings.tasks');
  const { USD } = useAdminUsd();

  const [workPanel, setWorkPanel] = useState<AdminPropertyRow | null>(null);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      const current = searchParams.get('q') || '';
      if (next === current) return;
      patchQuery({ q: next || null });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [mode, setMode] = useState<'active' | 'archive'>('active');

  const cities = useMemo(() => {
    const set = new Set(properties.map(p => p.city).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ka'));
  }, [properties]);

  const pool = useMemo(
    () => properties.filter(p => (mode === 'archive') === (lifecycleOf(p) === 'old')),
    [properties, mode],
  );

  const archivedCount = summary?.old ?? properties.filter(p => lifecycleOf(p) === 'old').length;

  const stats = useMemo(() => {
    const byState = (state: string) => pool.filter(p => lifecycleOf(p) === state).length;
    return {
      total: summary?.total ?? pool.length,
      sale: summary?.sale ?? pool.filter(sellsAt).length,
      rent: summary?.rent ?? pool.filter(rentsAt).length,
      premium: pool.filter(p => p.isPremium).length,
      views: pool.reduce((s, p) => s + (p.viewCount || 0), 0),
      new: summary?.new ?? byState('new'),
      current: summary?.current ?? byState('current'),
      old: summary?.old ?? byState('old'),
      newR: summary?.new_r ?? byState('new_r'),
      rentedOwner: pool.filter(p => outcomeOf(p) === 'rented_owner').length,
      freeingSoon: pool.filter(p => {
        if (lifecycleOf(p) !== 'old') return false;
        const days = daysUntil(p.rentExpiresAt);
        return days !== null && days >= 0 && days <= 30;
      }).length,
    };
  }, [pool, summary]);

  /* Rentals whose term ran out — the call-back list. */
  const needsCall = useMemo(
    () => pool.filter(p => lifecycleOf(p) === 'new_r'),
    [pool],
  );

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
      { value: 'rented_invest' as const, label: 'გაქირავებული (იყიდება)', dot: '#0f766e' },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = pool.filter(p => {
      if (statusFilter === 'sale' && !sellsAt(p)) return false;
      if (statusFilter === 'rent' && !rentsAt(p)) return false;
      if (lifecycleFilter !== 'all' && lifecycleOf(p) !== lifecycleFilter) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (cityFilter !== 'all' && p.city !== cityFilter) return false;
      if (badgeFilter === 'premium' && !p.isPremium) return false;
      if (badgeFilter === 'featured' && !p.isFeatured) return false;
      if (badgeFilter === 'new' && !p.isNew) return false;
      if (badgeFilter === 'rented_invest' && outcomeOf(p) !== 'rented_owner') return false;
      if (mode === 'archive' && outcomeFilter !== 'all' && outcomeOf(p) !== outcomeFilter) return false;
      if (!q) return true;
      if (listingIdMatches(p.id, search.trim())) return true;
      const hay = [
        p.title, p.city, p.district, p.address, p.agentName, p.agentPhone, p.agentEmail,
        // Owner details are only searchable for accounts allowed to see them.
        ...(canOwner ? [p.owner?.name, p.owner?.phone, p.owner?.email, p.owner?.idNumber] : []),
        TYPE_LABELS[p.type], STATUS_LABEL[p.status], p.sourceId, p.source, p.lifecycleNote,
        outcomeOf(p) ? LIFECYCLE_OUTCOME_META[outcomeOf(p)!].label : '',
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
  }, [pool, search, statusFilter, lifecycleFilter, typeFilter, cityFilter, badgeFilter, outcomeFilter, mode, sortKey, sortDir, canOwner]);

  const hasFilters = search || statusFilter !== 'all' || lifecycleFilter !== 'all'
    || typeFilter !== 'all' || cityFilter !== 'all' || badgeFilter !== 'all' || outcomeFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setLifecycleFilter('all');
    setTypeFilter('all');
    setCityFilter('all');
    setBadgeFilter('all');
    setOutcomeFilter('all');
  }

  return (
    <div className="space-y-5">
      {mode === 'archive' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm font-extrabold text-slate-800">არქივი — old განცხადებები</p>
          <p className="text-xs text-slate-500 mt-0.5">
            გაყიდული, შეჩერებული, ჩვენ რომ გავაქირავეთ, ან აღარ იყიდება. „გაქირავდა“ (მესაკუთრემ) მთავარ ცხრილში რჩება.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOutcomeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${outcomeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              ყველა
            </button>
            {LIFECYCLE_OUTCOMES.filter(id => id !== 'rented_owner').map(id => (
              <button
                key={id}
                type="button"
                onClick={() => setOutcomeFilter(id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${outcomeFilter === id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {LIFECYCLE_OUTCOME_META[id].label}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(mode === 'archive'
          ? [
              { label: 'არქივი', value: stats.total, color: '#64748b', bg: '#f8fafc', icon: Building2, filter: 'all' as LifecycleFilter },
              { label: 'იყიდება', value: stats.sale, color: '#f59e0b', bg: '#fffbeb', icon: TrendingUp },
              { label: 'ქირავდება', value: stats.rent, color: '#10b981', bg: '#ecfdf5', icon: Home },
              { label: 'თავისუფლდება 30 დღეში', value: stats.freeingSoon, color: '#d97706', bg: '#fffbeb', icon: CalendarClock },
              { label: 'ნახვები', value: stats.views.toLocaleString('ka-GE'), color: '#64748b', bg: '#f8fafc', icon: Eye },
            ]
          : [
              { label: 'სულ', value: stats.total, color: '#2563eb', bg: '#eff6ff', icon: Building2, filter: 'all' as LifecycleFilter },
              { label: 'იყიდება', value: stats.sale, color: '#f59e0b', bg: '#fffbeb', icon: TrendingUp },
              { label: 'ქირავდება', value: stats.rent, color: '#10b981', bg: '#ecfdf5', icon: Home },
              { label: 'დასარეკი (new R)', value: stats.newR, color: '#ef4444', bg: '#fef2f2', icon: PhoneCall, filter: 'new_r' as LifecycleFilter },
              { label: 'გაქირავებული', value: stats.rentedOwner, color: '#0f766e', bg: '#f0fdfa', icon: Key },
              { label: 'არქივი (old)', value: archivedCount, color: '#64748b', bg: '#f8fafc', icon: CalendarClock },
            ]
        ).map(({ label, value, color, bg, icon: Icon, filter }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (label.startsWith('არქივი') && mode === 'active') {
                setMode('archive');
                setLifecycleFilter('all');
                return;
              }
              if (label === 'გაქირავებული') {
                setBadgeFilter(v => (v === 'rented_invest' ? 'all' : 'rented_invest'));
                return;
              }
              if (filter) setLifecycleFilter(filter);
            }}
            className={`text-left rounded-2xl p-4 border bg-white shadow-sm transition-all ${filter || (mode === 'active' && (label.startsWith('არქივი') || label === 'გაქირავებული')) ? 'hover:border-slate-300 cursor-pointer' : 'cursor-default'}`}
            style={{ borderColor: (filter && lifecycleFilter === filter && filter !== 'all') || (label === 'გაქირავებული' && badgeFilter === 'rented_invest') ? color : '#f1f5f9' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-xl font-extrabold leading-none" style={{ color: value ? '#1e293b' : '#94a3b8' }}>{value}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{label}</p>
          </button>
        ))}
      </div>

      {/* Call-back reminder: rentals whose term ran out */}
      {mode === 'active' && needsCall.length > 0 && lifecycleFilter !== 'new_r' && (
        <div
          className="rounded-2xl border p-4 flex flex-wrap items-center gap-3"
          style={{ background: '#fef2f2', borderColor: '#fecaca' }}
        >
          <span className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <PhoneCall size={16} className="text-red-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-800">
              {needsCall.length} განცხადებას ვადა გაუვიდა — გადასამოწმებელია
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {needsCall.slice(0, 3).map(p => p.title || p.id).join(' · ')}
              {needsCall.length > 3 ? ` · +${needsCall.length - 3}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLifecycleFilter('new_r')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
            style={{ background: '#dc2626' }}
          >
            სიის ნახვა
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ძიება ID-ით (24171150), სათაური, ქალაქი, აგენტი..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-slate-50/50 font-medium"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setMode(m => (m === 'archive' ? 'active' : 'archive'));
              setLifecycleFilter('all');
              setOutcomeFilter('all');
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border flex-shrink-0 transition-colors"
            style={
              mode === 'archive'
                ? { background: '#0f172a', borderColor: '#0f172a', color: '#fff' }
                : { background: '#fff', borderColor: '#e2e8f0', color: '#334155' }
            }
          >
            <Archive size={15} />
            {mode === 'archive' ? 'აქტიური განცხადებები' : `არქივი (${archivedCount})`}
          </button>
          {mode === 'active' && (
          <button
            type="button"
            onClick={() => navigate('/admin/listings/new')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: '#059669' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            ახალი განცხადება
          </button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">შიდა მომხმარებელი</span>
            <select
              value={staffId}
              onChange={e => patchQuery({ staff: e.target.value || null })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none"
            >
              <option value="">ყველა ბროკერი / პორტფოლიო</option>
              {staffOptions.map(opt => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.name}{opt.jobTitle ? ` (${opt.jobTitle})` : opt.role ? ` (${roleLabel(opt.role)})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">გარე მომხმარებელი</span>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={memberDraft}
                onChange={e => setMemberDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') patchQuery({ member: memberDraft.trim() || null });
                }}
                onBlur={() => {
                  if (memberDraft.trim() !== memberQ) patchQuery({ member: memberDraft.trim() || null });
                }}
                placeholder="სახელი ან მობილური"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-9 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {memberDraft && (
                <button
                  type="button"
                  onClick={() => { setMemberDraft(''); patchQuery({ member: null }); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </label>
        </div>

        {/* Lifecycle: the client's own new → current → old → new R vocabulary */}
        {mode === 'active' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">სტატუსი</span>
          {([
            ['all', 'ყველა', '#64748b', stats.total],
            ['new', LIFECYCLE_META.new.label, LIFECYCLE_META.new.color, stats.new],
            ['current', LIFECYCLE_META.current.label, LIFECYCLE_META.current.color, stats.current],
            ['new_r', LIFECYCLE_META.new_r.label, LIFECYCLE_META.new_r.color, stats.newR],
          ] as const).map(([value, label, color, countValue]) => {
            const active = lifecycleFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLifecycleFilter(value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                style={
                  active
                    ? { background: `${color}14`, borderColor: `${color}45`, color }
                    : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }
                }
              >
                {value === 'new_r' && countValue > 0 && <PhoneCall size={11} />}
                {label}
                <span
                  className="px-1.5 rounded-md text-[10px] font-extrabold"
                  style={{ background: active ? `${color}20` : '#f1f5f9', color: active ? color : '#94a3b8' }}
                >
                  {countValue}
                </span>
              </button>
            );
          })}
        </div>
        )}

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
            ნაჩვენებია <b className="text-slate-700">{filtered.length}</b>
            {total ? ` / ${total}` : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="py-2 pl-3 pr-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">ID</th>
                <th className="py-2 px-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">განცხადება</th>
                <th className="py-2 px-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">ოთ.</th>
                <th className="py-2 px-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">სართ.</th>
                <th className="py-2 px-1.5 text-left">
                  <SortHeader label="ფასი" sortKey="price" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                {canOwner && (
                  <th className="py-2 px-1.5 text-left">
                    <SortHeader label="მესაკუთრე" sortKey="owner" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  </th>
                )}
                <th className="py-2 px-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">განთავსება</th>
                <th className="py-2 px-1.5 text-left">
                  <SortHeader label="სტატუსი" sortKey="lifecycle" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-2 px-1.5 text-center bg-slate-100/80">
                  <SortHeader label="თარიღი" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-2 px-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">წყარო</th>
                <th className="py-2 px-1.5 text-left">
                  <SortHeader label="აგენტი" sortKey="agentName" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-2 px-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">ნახ.</th>
                <th
                  className="py-2 pr-3 pl-1 w-[72px] sticky right-0 bg-slate-50"
                  style={{ boxShadow: '-8px 0 10px -8px rgba(15,23,42,0.12)' }}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center">
                    <Building2 size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-500 font-semibold text-sm">
                      {hasFilters || staffId || memberQ ? 'ფილტრებით ვერაფერი მოიძებნა' : 'განცხადება ჯერ არ არის'}
                    </p>
                    {(hasFilters || staffId || memberQ) && (
                      <button type="button" onClick={() => { clearFilters(); patchQuery({ staff: null, member: null }); setMemberDraft(''); }} className="mt-2 text-xs font-bold text-blue-600 hover:underline">
                        ფილტრების გასუფთავება
                      </button>
                    )}
                  </td>
                </tr>
              ) : filtered.map(p => {
                const state = lifecycleOf(p);
                const updated = formatDotDate(p.updatedAt || p.createdAt);
                const created = formatDotDate(p.createdAt || p.listedDate);
                return (
                <tr
                  key={p.id}
                  className="group hover:bg-blue-50/30"
                  style={state === 'new_r' ? { background: 'rgba(239,68,68,0.045)' } : undefined}
                >
                  <td className="py-1.5 pl-3 pr-1 align-top">
                    <ListingLeadCell p={p} onOpen={() => openEdit(p.id)} />
                  </td>
                  <td className="py-1.5 px-1.5 align-top min-w-[180px] max-w-[260px]">
                    <p className="text-[12px] font-semibold leading-snug text-slate-800 line-clamp-2">{p.title || '—'}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {TYPE_LABELS[p.type] || p.type}
                      {p.district ? `, ${p.district}` : ''}
                      {p.city ? `, ${p.city}` : ''}
                    </p>
                    {p.area ? (
                      <p className="mt-0.5 text-[10px] text-slate-400">{Number(p.area).toLocaleString('ka-GE')} მ²</p>
                    ) : null}
                    {!p.title ? <AddressCell p={p} /> : null}
                    {canContracts && (p.contracts?.length ?? 0) > 0 ? (
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">ხელშ. {p.contracts!.length}</p>
                    ) : null}
                  </td>
                  <td className="py-1.5 px-1.5 text-center align-middle font-semibold tabular-nums text-slate-700">
                    {p.bedrooms || '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-center align-middle tabular-nums text-slate-700 whitespace-nowrap">
                    {p.floor ? `${p.floor}${p.totalFloors ? ` (${p.totalFloors})` : ''}` : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 align-middle">
                    {canPrice
                      ? <PriceCell p={p} onPatch={onPatch} />
                      : (
                        <>
                          <p className="font-extrabold text-slate-800 whitespace-nowrap">{USD(p.price)}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{STATUS_LABEL[p.status] || p.status}</p>
                        </>
                      )}
                  </td>
                  {canOwner && (
                    <td className="py-1.5 px-1.5 align-middle">
                      <OwnerCell p={p} onPatch={onPatch} />
                    </td>
                  )}
                  <td className="py-1.5 px-1.5 align-middle whitespace-nowrap">
                    <p className="text-[11px] font-bold text-slate-600">{p.placement === 'paid' ? 'ფასიანი' : 'უფასო'}</p>
                    {p.placement === 'paid' && p.placementPackage ? (
                      <p className="text-[10px] text-slate-400">{p.placementPackage}</p>
                    ) : null}
                  </td>
                  <td className="py-1.5 px-1.5 align-middle">
                    {canLifecycle
                      ? <LifecycleCell p={p} onPatch={onPatch} />
                      : <Badge label={LIFECYCLE_META[state]?.label ?? state} color={LIFECYCLE_META[state]?.color ?? '#94a3b8'} />}
                  </td>
                  <td className="py-1.5 px-1.5 align-middle bg-slate-50/90 text-center leading-tight">
                    <p className="font-semibold tabular-nums text-slate-700">{updated || '—'}</p>
                    <p className="tabular-nums text-[11px] text-slate-400">{created && created !== updated ? created : created || ''}</p>
                  </td>
                  <td className="py-1.5 px-1.5 align-middle text-center">
                    {p.origin && p.origin !== 'office' ? (
                      <span className="inline-block max-w-[88px] text-[9px] font-bold leading-tight text-slate-500" title={ORIGIN_LABEL[p.origin]}>
                        {p.origin === 'imported' ? 'გადმ.' : 'მესაკ.'}
                      </span>
                    ) : (
                      <span className="text-slate-300">·</span>
                    )}
                  </td>
                  <td className="py-1.5 px-1.5 align-middle max-w-[140px]">
                    <p className="truncate text-[12px] font-semibold text-blue-600">{p.staffName || p.agentName || '—'}</p>
                    {(p.staffJobTitle || p.staffRole) && (
                      <p className="truncate text-[10px] text-slate-400">
                        ({p.staffJobTitle || roleLabel(p.staffRole || '')})
                      </p>
                    )}
                  </td>
                  <td className="py-1.5 px-1.5 text-center align-middle tabular-nums text-slate-600">
                    {p.viewCount ?? 0}
                  </td>
                  <td
                    className="sticky right-0 bg-white py-1.5 pl-1 pr-3 align-middle group-hover:bg-[#f5f9ff]"
                    style={{
                      boxShadow: '-8px 0 10px -8px rgba(15,23,42,0.12)',
                      ...(state === 'new_r' ? { background: '#fdf3f3' } : null),
                    }}
                  >
                    <div className="flex flex-col items-end gap-0.5">
                      {canEdit && (p.canEdit === false ? (
                        <span className="p-1 text-slate-300" title="რედაქტირება მხოლოდ საკუთარ განცხადებაზე შეგიძლიათ">
                          <Lock size={13} />
                        </span>
                      ) : (
                        <button type="button" onClick={() => openEdit(p.id)} className="p-1 text-slate-400 hover:text-blue-600" title="რედაქტირება">
                          <Pencil size={13} />
                        </button>
                      ))}
                      {canNotes && <NotesButton p={p} onPatch={onPatch} />}
                      {canContracts && <ContractCell p={p} onPatch={onPatch} />}
                      {canTasks && (
                        <button type="button" onClick={() => setWorkPanel(p)} className="p-1 text-slate-400 hover:text-indigo-600" title="დავალებები">
                          <ClipboardList size={13} />
                        </button>
                      )}
                      {canDelete && p.canEdit !== false && (
                        <button type="button" onClick={() => onDelete(p.id)} className="p-1 text-slate-400 hover:text-red-600" title="წაშლა">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-slate-500">
              ნაჩვენებია {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {([
                ['პირველი', 1],
                ['წინა', Math.max(1, page - 1)],
              ] as const).map(([label, target]) => (
                <button
                  key={label}
                  type="button"
                  disabled={page <= 1}
                  onClick={() => patchQuery({ page: String(target) }, false)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
              <span className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                გვერდი {page} / {Math.max(1, Math.ceil(total / limit))}
              </span>
              {([
                ['შემდეგი', Math.min(Math.max(1, Math.ceil(total / limit)), page + 1)],
                ['ბოლო', Math.max(1, Math.ceil(total / limit))],
              ] as const).map(([label, target]) => (
                <button
                  key={label}
                  type="button"
                  disabled={page >= Math.max(1, Math.ceil(total / limit))}
                  onClick={() => patchQuery({ page: String(target) }, false)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {workPanel && (
        <ListingWorkPanel
          propertyId={workPanel.id}
          propertyTitle={workPanel.title}
          ownerPhone={workPanel.owner?.phone ?? null}
          api={api}
          showToast={showToast ?? (() => {})}
          currentUserId={user?.id ?? 0}
          canAssignOthers={can('listings.assign')}
          canLogCalls={canTasks}
          onClose={() => setWorkPanel(null)}
        />
      )}
    </div>
  );
}
