import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Award, BadgeCheck, Ban, Building2, CheckCircle2, Eye, ExternalLink,
  Languages, Mail, Pencil, Phone, Plus, Search, Shield, Star, Trash2,
  TrendingUp, Upload, UserCheck, Users, X, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { formatGeorgianShortDate } from '../../lib/dateFormat';

export interface BrokerStats {
  agentId: string;
  liveListings: number;
  forSale: number;
  forRent: number;
  featured: number;
  totalViews: number;
  needsAttention: number;
}

export interface LinkedStaff {
  id: number;
  email: string;
  name: string;
  role: string;
  scope: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  phone: string | null;
  avatarUrl: string | null;
  showOnFrontend: boolean | null;
}

export interface BrokerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  company: string | null;
  verified: boolean;
  isActive: boolean;
  propertyCount: number;
  rating: string | number | null;
  reviewCount: number | null;
  yearsExperience: number;
  bio: string | null;
  languages: string[];
  specialization: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  stats: BrokerStats;
  linkedStaff: LinkedStaff | null;
}

interface BrokerListing {
  id: string;
  title: string;
  price: string | null;
  rentPrice: string | null;
  status: string;
  city: string | null;
  district: string | null;
  type: string | null;
  images: string[] | null;
  viewCount: number | null;
  isFeatured: boolean | null;
  isPremium: boolean | null;
  lifecycleState: string | null;
  moderationStatus: string | null;
  listedDate: string | null;
  updatedAt: string | null;
}

type FilterKey = 'all' | 'active' | 'inactive' | 'verified' | 'attention' | 'unlinked';

interface AdminBrokersSectionProps {
  brokers: BrokerRow[];
  search: string;
  onSearchChange: (value: string) => void;
  onReload: () => void;
  api: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-white';

function money(value: string | null | undefined) {
  if (!value) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `$${n.toLocaleString('en-US')}`;
}

function statusLabel(status: string) {
  if (status === 'sale' || status === 'both') return 'იყიდება';
  if (status === 'rent' || status === 'daily_rent') return 'ქირავდება';
  return status;
}

function brokerPatchBody(broker: BrokerRow, overrides: Partial<BrokerRow> = {}) {
  const next = { ...broker, ...overrides };
  return {
    name: next.name,
    email: next.email,
    phone: next.phone,
    photo: next.photo,
    bio: next.bio,
    company: next.company,
    verified: next.verified,
    isActive: next.isActive,
    languages: next.languages,
    specialization: next.specialization,
    yearsExperience: next.yearsExperience,
    rating: next.rating,
    reviewCount: next.reviewCount,
  };
}

export default function AdminBrokersSection({
  brokers,
  search,
  onSearchChange,
  onReload,
  api,
  showToast,
}: AdminBrokersSectionProps) {
  const { can } = useAdminAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [editModal, setEditModal] = useState<{ mode: 'create' | 'edit'; data: Partial<BrokerRow> } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BrokerRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canCreate = can('agents.create');
  const canEdit = can('agents.edit');
  const canDelete = can('agents.delete');

  const summary = useMemo(() => {
    const active = brokers.filter(b => b.isActive).length;
    const verified = brokers.filter(b => b.verified).length;
    const listingsLive = brokers.reduce((sum, b) => sum + (b.stats?.liveListings ?? 0), 0);
    const views = brokers.reduce((sum, b) => sum + (b.stats?.totalViews ?? 0), 0);
    const withStaff = brokers.filter(b => b.linkedStaff).length;
    const attention = brokers.filter(b => (b.stats?.needsAttention ?? 0) > 0).length;
    return { total: brokers.length, active, verified, listingsLive, views, withStaff, attention };
  }, [brokers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brokers.filter(b => {
      if (filter === 'active' && !b.isActive) return false;
      if (filter === 'inactive' && b.isActive) return false;
      if (filter === 'verified' && !b.verified) return false;
      if (filter === 'attention' && !(b.stats?.needsAttention > 0)) return false;
      if (filter === 'unlinked' && b.linkedStaff) return false;
      if (!q) return true;
      const hay = [b.name, b.email, b.phone, b.company, ...(b.specialization ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [brokers, filter, search]);

  const selected = selectedId ? brokers.find(b => b.id === selectedId) ?? null : null;

  useEffect(() => {
    if (!selectedId) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setListingsLoading(true);
    api<{ data: BrokerListing[] }>(`/agents/${selectedId}/listings`)
      .then(res => {
        if (!cancelled) setListings(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId, api]);

  async function patchBroker(broker: BrokerRow, overrides: Partial<BrokerRow>) {
    setBusyId(broker.id);
    try {
      await api(`/agents/${broker.id}`, {
        method: 'PUT',
        body: JSON.stringify(brokerPatchBody(broker, overrides)),
      });
      showToast('ბროკერი განახლდა');
      onReload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function removeBroker(broker: BrokerRow) {
    setBusyId(broker.id);
    try {
      await api(`/agents/${broker.id}`, { method: 'DELETE' });
      showToast('ბროკერი წაიშალა');
      if (selectedId === broker.id) setSelectedId(null);
      setConfirmDelete(null);
      onReload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function saveBroker(payload: Record<string, unknown>, mode: 'create' | 'edit', id?: string) {
    if (mode === 'create') {
      await api('/agents', { method: 'POST', body: JSON.stringify(payload) });
      showToast('ბროკერი დაემატა');
    } else {
      await api(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('ბროკერი შენახულია');
    }
    setEditModal(null);
    onReload();
  }

  const filters: { id: FilterKey; label: string; count: number }[] = [
    { id: 'all', label: 'ყველა', count: summary.total },
    { id: 'active', label: 'აქტიური', count: summary.active },
    { id: 'verified', label: 'ვერიფიც.', count: summary.verified },
    { id: 'attention', label: 'ყურადღება', count: summary.attention },
    { id: 'unlinked', label: 'ანგარიშის გარეშე', count: summary.total - summary.withStaff },
    { id: 'inactive', label: 'დაბლოკილი', count: summary.total - summary.active },
  ];

  return (
    <div className="space-y-4">
      {/* Compact metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: 'ბროკერი', value: summary.total, icon: Users, color: '#0f172a' },
          { label: 'აქტიური', value: summary.active, icon: UserCheck, color: '#059669' },
          { label: 'ვერიფიცირებული', value: summary.verified, icon: BadgeCheck, color: '#2563eb' },
          { label: 'განცხადება', value: summary.listingsLive, icon: Building2, color: '#d97706' },
          { label: 'ნახვები', value: summary.views.toLocaleString('ka-GE'), icon: Eye, color: '#7c3aed' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5">
            <div className="flex items-center gap-2 text-slate-400 mb-1.5">
              <Icon size={13} style={{ color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {summary.attention > 0 && (
        <button
          type="button"
          onClick={() => setFilter('attention')}
          className="w-full flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100/80 transition-colors"
        >
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm font-bold text-slate-800">
            {summary.attention} ბროკერს აქვს განცხადება, რომელიც საჭიროებს ყურადღებას
          </span>
        </button>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="ძიება სახელით, ტელეფონით, ელ-ფოსტით, სპეციალიზაციით..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-slate-50/50 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setEditModal({ mode: 'create', data: {} })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
              style={{ background: '#059669' }}
            >
              <Plus size={16} strokeWidth={2.5} />
              ბროკერის დამატება
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map(item => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                style={
                  active
                    ? { background: '#0f172a', borderColor: '#0f172a', color: '#fff' }
                    : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }
                }
              >
                {item.label}
                <span
                  className="px-1.5 rounded-md text-[10px] font-extrabold"
                  style={{ background: active ? 'rgba(255,255,255,0.15)' : '#f1f5f9', color: active ? '#fff' : '#94a3b8' }}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3.5 pl-5 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[52px]">ფოტო</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">ბროკერი</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">კონტაქტი</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">სტატუსი</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">პორტფოლიო</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden lg:table-cell">ნახვა</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden xl:table-cell">რეიტინგი</th>
                <th className="text-left py-3.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden xl:table-cell">ანგარიში</th>
                <th className="py-3.5 pr-5 pl-2 w-[108px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Users size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-500 font-semibold text-sm">
                      {search || filter !== 'all' ? 'ფილტრებით ვერაფერი მოიძებნა' : 'ბროკერი ჯერ არ არის'}
                    </p>
                  </td>
                </tr>
              ) : filtered.map(broker => {
                const stats = broker.stats ?? {
                  liveListings: broker.propertyCount || 0,
                  forSale: 0,
                  forRent: 0,
                  featured: 0,
                  totalViews: 0,
                  needsAttention: 0,
                };
                const busy = busyId === broker.id;
                return (
                  <tr
                    key={broker.id}
                    className={`hover:bg-blue-50/30 transition-colors group cursor-pointer ${busy ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedId(broker.id)}
                  >
                    <td className="py-2.5 pl-5 pr-2">
                      <BrokerAvatar name={broker.name} photo={broker.photo} size="sm" />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-bold text-slate-800 text-[13px] truncate">{broker.name}</p>
                          {broker.verified && <BadgeCheck size={13} className="text-emerald-500 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {broker.company || 'TbilisiRealtor.GE'}
                          {broker.yearsExperience > 0 ? ` · ${broker.yearsExperience} წ.` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                      <div className="space-y-0.5 text-[11px] text-slate-500">
                        {broker.phone ? (
                          <a href={`tel:${broker.phone}`} className="flex items-center gap-1 hover:text-blue-600 truncate">
                            <Phone size={10} />{broker.phone}
                          </a>
                        ) : <span className="text-slate-300">—</span>}
                        {broker.email && (
                          <a href={`mailto:${broker.email}`} className="flex items-center gap-1 hover:text-blue-600 truncate max-w-[180px]">
                            <Mail size={10} />{broker.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusPill
                          ok={broker.isActive}
                          okLabel="აქტიური"
                          badLabel="დაბლოკილი"
                        />
                        {(stats.needsAttention ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                            <AlertTriangle size={10} />{stats.needsAttention}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="text-[13px] font-extrabold text-slate-800 tabular-nums">{stats.liveListings}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                        {stats.forSale} იყიდ. · {stats.forRent} ქირა
                      </div>
                    </td>
                    <td className="py-2.5 px-2 hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-700 tabular-nums">
                        <Eye size={12} className="text-slate-400" />
                        {(stats.totalViews ?? 0).toLocaleString('ka-GE')}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 hidden xl:table-cell">
                      {broker.rating != null ? (
                        <span className="inline-flex items-center gap-1 text-[13px] font-bold text-amber-700">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {Number(broker.rating).toFixed(1)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 px-2 hidden xl:table-cell">
                      {broker.linkedStaff ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                          <Shield size={10} /> დაკავშ.
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">არა</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-5 pl-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <IconBtn title="დეტალები" onClick={() => setSelectedId(broker.id)}>
                          <Eye size={14} />
                        </IconBtn>
                        {canEdit && (
                          <IconBtn title="რედაქტირება" onClick={() => setEditModal({ mode: 'edit', data: broker })}>
                            <Pencil size={14} />
                          </IconBtn>
                        )}
                        {canDelete && (
                          <IconBtn title="წაშლა" danger onClick={() => setConfirmDelete(broker)}>
                            <Trash2 size={14} />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-50 text-[11px] text-slate-400 font-medium">
          ნაჩვენებია {filtered.length} / {brokers.length} ბროკერი · დააჭირე რიგს დეტალებისთვის
        </div>
      </div>

      {selected && (
        <BrokerDetailModal
          broker={selected}
          listings={listings}
          listingsLoading={listingsLoading}
          canEdit={canEdit}
          canDelete={canDelete}
          busy={busyId === selected.id}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setEditModal({ mode: 'edit', data: selected });
          }}
          onDelete={() => setConfirmDelete(selected)}
          onToggleActive={() => patchBroker(selected, { isActive: !selected.isActive })}
          onToggleVerified={() => patchBroker(selected, { verified: !selected.verified })}
        />
      )}

      {editModal && (
        <BrokerFormModal
          mode={editModal.mode}
          data={editModal.data}
          onClose={() => setEditModal(null)}
          onSave={async payload => {
            try {
              await saveBroker(payload, editModal.mode, editModal.data.id);
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
              throw err;
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="ბროკერის წაშლა"
          message={`ნამდვილად გსურთ ${confirmDelete.name}-ის წაშლა? საჯარო პროფილი გაქრება.`}
          confirmLabel="წაშლა"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeBroker(confirmDelete)}
          busy={busyId === confirmDelete.id}
        />
      )}
    </div>
  );
}

function BrokerDetailModal({
  broker,
  listings,
  listingsLoading,
  canEdit,
  canDelete,
  busy,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleVerified,
}: {
  broker: BrokerRow;
  listings: BrokerListing[];
  listingsLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleVerified: () => void;
}) {
  const stats = broker.stats ?? {
    liveListings: broker.propertyCount || 0,
    forSale: 0,
    forRent: 0,
    featured: 0,
    totalViews: 0,
    needsAttention: 0,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-5">
      <button type="button" className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" onClick={onClose} aria-label="დახურვა" />
      <div className={`relative w-full sm:max-w-3xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 ${busy ? 'opacity-70' : ''}`}>
        {/* Header band */}
        <div className="relative bg-slate-900 text-white px-5 sm:px-7 pt-5 pb-16 overflow-hidden">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 12% 20%, rgba(245,158,11,0.45) 0, transparent 42%), radial-gradient(circle at 88% 10%, rgba(37,99,235,0.35) 0, transparent 38%)',
            }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/90 mb-1.5">ბროკერის პროფილი</p>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">{broker.name}</h3>
              <p className="text-slate-400 text-sm mt-1">
                {broker.company || 'TbilisiRealtor.GE'}
                {broker.yearsExperience > 0 ? ` · ${broker.yearsExperience} წლის გამოცდილება` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-7 -mt-10 relative pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
            <BrokerAvatar name={broker.name} photo={broker.photo} size="xl" ring />
            <div className="flex flex-wrap gap-2 flex-1 pb-1">
              <StatusPill ok={broker.isActive} okLabel="აქტიური" badLabel="დაბლოკილი" />
              {broker.verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <BadgeCheck size={12} /> ვერიფიცირებული
                </span>
              )}
              {broker.linkedStaff && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  <Shield size={12} /> სისტემური ანგარიში
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <a
              href={`/agent/${broker.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={13} /> საჯარო გვერდი
            </a>
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                <Pencil size={13} /> რედაქტირება
              </button>
            )}
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={onToggleVerified}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold"
                  style={
                    broker.verified
                      ? { background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }
                      : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }
                  }
                >
                  <BadgeCheck size={13} />
                  {broker.verified ? 'ვერიფიცირებული' : 'ვერიფიკაცია'}
                </button>
                <button
                  type="button"
                  onClick={onToggleActive}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold"
                  style={
                    broker.isActive
                      ? { background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }
                      : { background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }
                  }
                >
                  {broker.isActive ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                  {broker.isActive ? 'აქტიური' : 'გააქტიურება'}
                </button>
              </>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 ml-auto"
              >
                <Trash2 size={13} /> წაშლა
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            <DetailStat icon={Building2} label="პორტფოლიო" value={String(stats.liveListings)} />
            <DetailStat icon={TrendingUp} label="იყიდება / ქირა" value={`${stats.forSale} / ${stats.forRent}`} />
            <DetailStat icon={Eye} label="ნახვები" value={(stats.totalViews ?? 0).toLocaleString('ka-GE')} />
            <DetailStat
              icon={Award}
              label="რეიტინგი"
              value={broker.rating != null ? Number(broker.rating).toFixed(1) : '—'}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            <Section title="კონტაქტი">
              <ContactLine icon={Phone} label="ტელეფონი" value={broker.phone} href={broker.phone ? `tel:${broker.phone}` : undefined} />
              <ContactLine icon={Mail} label="ელ-ფოსტა" value={broker.email} href={broker.email ? `mailto:${broker.email}` : undefined} />
              {broker.createdAt && (
                <p className="text-xs text-slate-400 mt-2">დამატებულია {formatGeorgianShortDate(broker.createdAt)}</p>
              )}
            </Section>

            <Section title="სისტემური ანგარიში">
              {broker.linkedStaff ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={13} className="text-blue-700" />
                    <span className="text-sm font-bold text-slate-900">{broker.linkedStaff.name}</span>
                  </div>
                  <p>{broker.linkedStaff.email}</p>
                  <p>როლი: {broker.linkedStaff.role} · სკოპი: {broker.linkedStaff.scope === 'own' ? 'საკუთარი' : 'ყველა'}</p>
                  <p>
                    სტატუსი:{' '}
                    <span className={broker.linkedStaff.isActive ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                      {broker.linkedStaff.isActive ? 'აქტიური' : 'დაბლოკილი'}
                    </span>
                  </p>
                  {broker.linkedStaff.lastLoginAt && (
                    <p>ბოლო შესვლა: {formatGeorgianShortDate(broker.linkedStaff.lastLoginAt)}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed">
                  ანგარიში არ არის დაკავშირებული. შექმენი თანამშრომელი იმავე ელ-ფოსტით.
                </p>
              )}
            </Section>
          </div>

          {broker.bio && (
            <Section title="ბიოგრაფია">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{broker.bio}</p>
            </Section>
          )}

          {(broker.specialization?.length > 0 || broker.languages?.length > 0) && (
            <Section title="პროფილი">
              {broker.specialization?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">სპეციალიზაცია</p>
                  <div className="flex flex-wrap gap-1.5">
                    {broker.specialization.map(s => (
                      <span key={s} className="text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-100 px-2.5 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {broker.languages?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 inline-flex items-center gap-1">
                    <Languages size={11} /> ენები
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {broker.languages.map(l => (
                      <span key={l} className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section title={`პორტფოლიო · ${listingsLoading ? '...' : listings.length}`}>
            {listingsLoading ? (
              <p className="text-sm text-slate-400 py-6 text-center">იტვირთება...</p>
            ) : listings.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">განცხადება არ არის მიბმული</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {listings.map(item => {
                  const img = item.images?.[0];
                  return (
                    <a
                      key={item.id}
                      href={`/admin/listings/${item.id}/edit`}
                      className="flex gap-3 rounded-xl border border-slate-100 p-2.5 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      {img ? (
                        <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Building2 size={16} className="text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {statusLabel(item.status)} · {[item.district, item.city].filter(Boolean).join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {item.status === 'rent' ? money(item.rentPrice ?? item.price) : money(item.price)}
                          </span>
                          <span className="inline-flex items-center gap-0.5"><Eye size={10} />{item.viewCount ?? 0}</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function BrokerFormModal({
  mode,
  data,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<BrokerRow>;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { upload, uploading } = useFileUpload();
  const [form, setForm] = useState({
    name: String(data.name || ''),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    photo: String(data.photo || ''),
    bio: String(data.bio || ''),
    company: String(data.company || 'TbilisiRealtor.GE'),
    yearsExperience: String(data.yearsExperience || ''),
    rating: String(data.rating ?? '5.0'),
    reviewCount: String(data.reviewCount ?? '0'),
    specialization: Array.isArray(data.specialization) ? data.specialization.join(', ') : '',
    languages: Array.isArray(data.languages) ? data.languages.join(', ') : 'ქართული',
    verified: Boolean(data.verified),
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handlePhoto(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await upload(files);
    if (uploaded[0]?.url) set('photo', uploaded[0].url);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        photo: form.photo.trim() || null,
        bio: form.bio.trim() || null,
        company: form.company.trim() || 'TbilisiRealtor.GE',
        yearsExperience: parseInt(form.yearsExperience, 10) || 0,
        rating: form.rating || '5.0',
        reviewCount: parseInt(form.reviewCount, 10) || 0,
        specialization: form.specialization.split(',').map(s => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        verified: form.verified,
        isActive: form.isActive,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShellModal title={mode === 'create' ? 'ბროკერის დამატება' : 'ბროკერის რედაქტირება'} onClose={onClose} wide={false}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="სახელი, გვარი *">
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
        </Field>
        <Field label="ტელეფონი">
          <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="ფოტო">
            <div className="flex gap-3 items-center">
              {form.photo ? (
                <img src={form.photo} alt="" className="w-14 h-14 rounded-2xl object-cover bg-slate-100" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                  {form.name.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input type="url" value={form.photo} onChange={e => set('photo', e.target.value)} className={inputCls} placeholder="https://... ან ატვირთე" />
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 cursor-pointer hover:text-blue-800">
                  <Upload size={12} />
                  {uploading ? 'იტვირთება...' : 'ფოტოს ატვირთვა'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e.target.files)} />
                </label>
              </div>
            </div>
          </Field>
        </div>
        <Field label="კომპანია">
          <input type="text" value={form.company} onChange={e => set('company', e.target.value)} className={inputCls} />
        </Field>
        <Field label="გამოცდილება (წ.)">
          <input type="number" value={form.yearsExperience} onChange={e => set('yearsExperience', e.target.value)} className={inputCls} />
        </Field>
        <Field label="რეიტინგი">
          <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => set('rating', e.target.value)} className={inputCls} />
        </Field>
        <Field label="შეფასებები">
          <input type="number" value={form.reviewCount} onChange={e => set('reviewCount', e.target.value)} className={inputCls} />
        </Field>
        <Field label="სპეციალიზაცია" hint="მძიმით გამოყოფილი">
          <input type="text" value={form.specialization} onChange={e => set('specialization', e.target.value)} className={inputCls} placeholder="საცხოვრებელი, კომერციული" />
        </Field>
        <Field label="ენები" hint="მძიმით გამოყოფილი">
          <input type="text" value={form.languages} onChange={e => set('languages', e.target.value)} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="ბიოგრაფია">
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </Field>
        </div>
        <div className="col-span-2 flex flex-wrap gap-5">
          {[
            { k: 'verified' as const, l: 'ვერიფიცირებული' },
            { k: 'isActive' as const, l: 'აქტიური / ჩანს საიტზე' },
          ].map(opt => (
            <label key={opt.k} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <span
                className={`relative w-10 h-6 rounded-full transition-colors ${form[opt.k] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                onClick={() => set(opt.k, !form[opt.k])}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form[opt.k] ? 'translate-x-4' : ''}`} />
              </span>
              <span className="text-sm font-semibold text-slate-700">{opt.l}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">
          გაუქმება
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading || !form.name.trim()}
          className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? 'მიმდინარეობს...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </ShellModal>
  );
}

function BrokerAvatar({
  name,
  photo,
  size,
  ring,
}: {
  name: string;
  photo?: string | null;
  size: 'sm' | 'xl';
  ring?: boolean;
}) {
  const dim = size === 'xl' ? 'w-20 h-20 text-2xl rounded-2xl' : 'w-10 h-10 text-sm rounded-xl';
  const cls = `${dim} object-cover flex-shrink-0 ${ring ? 'ring-4 ring-white shadow-md' : ''}`;
  if (photo) return <img src={photo} alt={name} className={`${cls} bg-slate-100`} />;
  return (
    <div className={`${cls} bg-slate-900 text-white font-extrabold flex items-center justify-center`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusPill({ ok, okLabel, badLabel }: { ok: boolean; okLabel: string; badLabel: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border"
      style={
        ok
          ? { background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }
          : { background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }
      }
    >
      {ok ? <CheckCircle2 size={10} /> : <Ban size={10} />}
      {ok ? okLabel : badLabel}
    </span>
  );
}

function DetailStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        <Icon size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-extrabold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) {
    return (
      <div className="flex items-center gap-2.5 py-1.5 text-sm text-slate-400">
        <Icon size={14} />
        <span>{label}: არ არის მითითებული</span>
      </div>
    );
  }
  const Comp = href ? 'a' : 'div';
  return (
    <Comp
      href={href}
      className={`flex items-center gap-2.5 py-1.5 text-sm text-slate-700 ${href ? 'hover:text-blue-600' : ''}`}
    >
      <Icon size={14} className="text-slate-400" />
      <span className="font-medium">{value}</span>
    </Comp>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        danger
          ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
          : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1.5">
        {label}
        {hint && <span className="font-normal text-slate-400 ml-1">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ShellModal({
  title,
  onClose,
  children,
  wide = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-label="დახურვა" />
      <div className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-xl'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onCancel} aria-label="დახურვა" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white border border-slate-100 shadow-2xl p-5">
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
            გაუქმება
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
