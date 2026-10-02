/**
 * Public site members (role `user`) — the people who register on the site, save
 * favourites and send listings for review. Staff and brokers live in the staff
 * section; the server refuses these routes for any non-member account.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban, Building2, CheckCircle2, Clock, ExternalLink, Heart, Loader2, Mail, MoreHorizontal, Pencil,
  Phone, Search, ShieldCheck, Trash2, UserCog, Users, X, XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdminAuth, useApiRequest } from '../../contexts/AdminAuthContext';
import { formatGeorgianShortDate } from '../../lib/dateFormat';
import {
  Alert, Avatar, Field, Modal, PasswordField, btnDanger, btnGhost, btnPrimary,
} from '../account/ui';
import { StatusPill } from '../account/MyListingRow';

interface ListingStats { total: number; pending: number; approved: number; rejected: number }

export interface MemberRow {
  id: number;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  blockedReason: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  listingCount: number;
  listings: ListingStats;
}

interface MemberDetail extends MemberRow {
  favoriteCount: number;
  listingRows: {
    id: string;
    title: string;
    price: string | null;
    priceCurrency: string | null;
    district: string | null;
    cover: string | null;
    moderationStatus: string;
    moderationNote: string | null;
    viewCount: number | null;
    createdAt: string | null;
  }[];
}

type StatusFilter = 'all' | 'active' | 'blocked' | 'withListings';

const BLOCK_REASONS = ['სპამი / ყალბი განცხადებები', 'შეურაცხმყოფელი ქცევა', 'თაღლითობის ეჭვი', 'მომხმარებლის მოთხოვნით'];

/** Asking price in the currency it was entered in — no conversion in the admin list. */
function formatMoneyPlain(amount: number, currency: string | null): string {
  return `${currency === 'USD' ? '$' : '₾'}${Math.round(amount).toLocaleString('en-US')}`;
}

function relativeDays(date: string | null): string {
  if (!date) return '—';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return 'დღეს';
  if (days === 1) return 'გუშინ';
  if (days < 30) return `${days} დღის წინ`;
  return formatGeorgianShortDate(date);
}

export default function AdminMembersSection({ onToast }: { onToast: (message: string, type?: 'success' | 'error') => void }) {
  const api = useApiRequest();
  const { can } = useAdminAuth();

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [blocking, setBlocking] = useState<MemberRow | null>(null);
  const [deleting, setDeleting] = useState<MemberRow | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await api('/members'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const replaceRow = useCallback((next: MemberRow) => {
    setRows(list => list.map(row => (row.id === next.id ? next : row)));
  }, []);

  const totals = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    return {
      all: rows.length,
      active: rows.filter(r => r.isActive).length,
      blocked: rows.filter(r => !r.isActive).length,
      withListings: rows.filter(r => r.listingCount > 0).length,
      newThisWeek: rows.filter(r => r.createdAt && new Date(r.createdAt).getTime() > weekAgo).length,
      pending: rows.reduce((sum, r) => sum + r.listings.pending, 0),
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === 'active' && !row.isActive) return false;
      if (filter === 'blocked' && row.isActive) return false;
      if (filter === 'withListings' && row.listingCount === 0) return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q)
        || row.email.toLowerCase().includes(q)
        || (row.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
        || String(row.id) === q;
    });
  }, [rows, query, filter]);

  async function unblock(member: MemberRow) {
    try {
      replaceRow(await api(`/members/${member.id}`, { method: 'PUT', body: JSON.stringify({ isActive: true }) }));
      onToast('ბლოკი მოიხსნა');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    }
  }

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'ყველა', count: totals.all },
    { key: 'active', label: 'აქტიური', count: totals.active },
    { key: 'blocked', label: 'დაბლოკილი', count: totals.blocked },
    { key: 'withListings', label: 'განცხადებით', count: totals.withListings },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">საიტის მომხმარებლები</h2>
          <p className="text-sm text-slate-500 mt-0.5">საიტზე დარეგისტრირებული ადამიანები — ფავორიტები და მათი განცხადებები. თანამშრომლები აქ არ ჩანან.</p>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'სულ მომხმარებელი', value: totals.all, icon: Users, tint: 'bg-blue-50 text-blue-600' },
          { label: 'ახალი ამ კვირაში', value: totals.newThisWeek, icon: UserCog, tint: 'bg-violet-50 text-violet-600' },
          { label: 'განცხადება განხილვაში', value: totals.pending, icon: Clock, tint: 'bg-amber-50 text-amber-600' },
          { label: 'დაბლოკილი', value: totals.blocked, icon: Ban, tint: 'bg-red-50 text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.tint}`}><stat.icon size={18} /></span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">{loading ? '–' : stat.value}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="სახელი, ელ-ფოსტა ან ტელეფონი"
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center" aria-label="გასუფთავება">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 h-10 px-3.5 rounded-xl text-[13px] font-bold border transition ${
                filter === tab.key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {tab.label} <span className="opacity-60 ml-1">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="hidden lg:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)_120px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>მომხმარებელი</span>
          <span>ტელეფონი</span>
          <span>განცხადებები</span>
          <span>აქტივობა</span>
          <span className="text-right">მოქმედება</span>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={26} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{rows.length === 0 ? 'ჯერ არავინ დარეგისტრირებულა' : 'ამ ფილტრით ვერავინ მოიძებნა'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map(member => (
              <li
                key={member.id}
                className={`px-4 lg:px-5 py-3.5 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)_120px] lg:gap-4 lg:items-center hover:bg-slate-50/60 transition ${member.isActive ? '' : 'bg-red-50/30'}`}
              >
                <button type="button" onClick={() => setDetailId(member.id)} className="flex items-center gap-3 min-w-0 text-left w-full">
                  <span className="relative flex-shrink-0">
                    <Avatar name={member.name} src={member.avatarUrl} size={40} className={member.isActive ? '' : 'grayscale opacity-70'} />
                    {!member.isActive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 border-2 border-white flex items-center justify-center"><Ban size={8} className="text-white" /></span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">{member.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">#{member.id}</span>
                    </span>
                    <span className="block text-xs text-slate-500 truncate">{member.email}</span>
                  </span>
                </button>

                <div className="hidden lg:block text-sm text-slate-600 truncate">
                  {member.phone ? <a href={`tel:${member.phone.replace(/\s/g, '')}`} className="hover:text-blue-600">{member.phone}</a> : <span className="text-slate-300">—</span>}
                </div>

                <div className="mt-2 lg:mt-0 flex flex-wrap items-center gap-1.5 pl-[52px] lg:pl-0">
                  {member.listingCount === 0 ? <span className="text-xs text-slate-300">—</span> : (
                    <>
                      {member.listings.pending > 0 && <span className="h-6 px-2 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1"><Clock size={11} />{member.listings.pending}</span>}
                      {member.listings.approved > 0 && <span className="h-6 px-2 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1"><CheckCircle2 size={11} />{member.listings.approved}</span>}
                      {member.listings.rejected > 0 && <span className="h-6 px-2 rounded-md bg-red-50 text-red-700 text-[11px] font-bold inline-flex items-center gap-1"><XCircle size={11} />{member.listings.rejected}</span>}
                    </>
                  )}
                  {!member.isActive && (
                    <span className="lg:hidden h-6 px-2 rounded-md bg-red-600 text-white text-[11px] font-bold inline-flex items-center">დაბლოკილი</span>
                  )}
                </div>

                <div className="hidden lg:block text-xs text-slate-500 leading-relaxed">
                  <p>რეგ.: {member.createdAt ? formatGeorgianShortDate(member.createdAt) : '—'}</p>
                  <p className="text-slate-400">შემოვიდა: {relativeDays(member.lastLoginAt)}</p>
                </div>

                <div className="mt-2.5 lg:mt-0 flex items-center justify-end gap-1 pl-[52px] lg:pl-0">
                  <button type="button" onClick={() => setDetailId(member.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center" title="დეტალები">
                    <MoreHorizontal size={16} />
                  </button>
                  {can('members.block') && (
                    <button type="button" onClick={() => setEditing(member)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center" title="რედაქტირება">
                      <Pencil size={15} />
                    </button>
                  )}
                  {can('members.block') && (member.isActive ? (
                    <button type="button" onClick={() => setBlocking(member)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 flex items-center justify-center" title="დაბლოკვა">
                      <Ban size={15} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => void unblock(member)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center" title="ბლოკის მოხსნა">
                      <ShieldCheck size={15} />
                    </button>
                  ))}
                  {can('members.delete') && (
                    <button type="button" onClick={() => setDeleting(member)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" title="წაშლა">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MemberDrawer
        id={detailId}
        onClose={() => setDetailId(null)}
        onEdit={member => setEditing(member)}
        onBlock={member => setBlocking(member)}
        onUnblock={member => void unblock(member)}
        onDelete={member => setDeleting(member)}
        refreshKey={rows}
      />

      <EditMemberModal
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={next => { replaceRow(next); setEditing(null); onToast('მომხმარებელი განახლდა'); }}
      />

      <BlockMemberModal
        member={blocking}
        onClose={() => setBlocking(null)}
        onSaved={next => { replaceRow(next); setBlocking(null); onToast('მომხმარებელი დაიბლოკა'); }}
      />

      <DeleteMemberModal
        member={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id, listings) => {
          setRows(list => list.filter(row => row.id !== id));
          setDeleting(null);
          if (detailId === id) setDetailId(null);
          onToast(listings ? `მომხმარებელი და ${listings} განცხადება წაიშალა` : 'მომხმარებელი წაიშალა');
        }}
      />
    </div>
  );
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function MemberDrawer({ id, onClose, onEdit, onBlock, onUnblock, onDelete, refreshKey }: {
  id: number | null;
  onClose: () => void;
  onEdit: (m: MemberRow) => void;
  onBlock: (m: MemberRow) => void;
  onUnblock: (m: MemberRow) => void;
  onDelete: (m: MemberRow) => void;
  refreshKey: unknown;
}) {
  const api = useApiRequest();
  const { can } = useAdminAuth();
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id == null) { setDetail(null); return; }
    let cancelled = false;
    setError('');
    api(`/members/${id}`)
      .then(data => { if (!cancelled) setDetail(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'შეცდომა'); });
    return () => { cancelled = true; };
  }, [id, api, refreshKey]);

  useEffect(() => {
    if (id == null) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  const member = detail && detail.id === id ? detail : null;

  return (
    <AnimatePresence>
      {id != null && (
        <motion.div className="fixed inset-0 z-[120]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="დახურვა" onClick={onClose} className="absolute inset-0 bg-slate-900/40 cursor-default" />
          <motion.aside
            className="absolute right-0 top-0 bottom-0 w-full max-w-[460px] bg-white shadow-2xl flex flex-col"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 flex-shrink-0">
              <p className="font-bold text-slate-900">მომხმარებლის პროფილი</p>
              <button type="button" onClick={onClose} className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center" aria-label="დახურვა"><X size={18} /></button>
            </div>

            {error ? <div className="p-5"><Alert tone="error">{error}</Alert></div> : !member ? (
              <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="p-5 flex items-center gap-4">
                  <Avatar name={member.name} src={member.avatarUrl} size={64} />
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500">ID #{member.id} · რეგ. {member.createdAt ? formatGeorgianShortDate(member.createdAt) : '—'}</p>
                    <span className={`mt-1.5 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-600 text-white'}`}>
                      {member.isActive ? <><CheckCircle2 size={12} /> აქტიური</> : <><Ban size={12} /> დაბლოკილი</>}
                    </span>
                  </div>
                </div>

                {!member.isActive && member.blockedReason && (
                  <div className="mx-5 mb-4"><Alert tone="error" title="დაბლოკვის მიზეზი">{member.blockedReason}</Alert></div>
                )}

                <div className="mx-5 rounded-xl border border-slate-100 divide-y divide-slate-100 text-sm">
                  <a href={`mailto:${member.email}`} className="flex items-center gap-3 px-4 h-11 text-slate-700 hover:text-blue-600"><Mail size={15} className="text-slate-400" /><span className="truncate">{member.email}</span></a>
                  {member.phone
                    ? <a href={`tel:${member.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 px-4 h-11 text-slate-700 hover:text-blue-600"><Phone size={15} className="text-slate-400" />{member.phone}</a>
                    : <p className="flex items-center gap-3 px-4 h-11 text-slate-400"><Phone size={15} />ტელეფონი არ არის მითითებული</p>}
                  <p className="flex items-center gap-3 px-4 h-11 text-slate-600"><Clock size={15} className="text-slate-400" />ბოლო შესვლა: {relativeDays(member.lastLoginAt)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mx-5 mt-4">
                  {[
                    { label: 'განცხადება', value: member.listingCount, icon: Building2 },
                    { label: 'განხილვაში', value: member.listings.pending, icon: Clock },
                    { label: 'ფავორიტი', value: member.favoriteCount, icon: Heart },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl bg-slate-50 p-3 text-center">
                      <stat.icon size={15} className="mx-auto text-slate-400" />
                      <p className="text-lg font-extrabold text-slate-900 mt-1 tabular-nums">{stat.value}</p>
                      <p className="text-[11px] text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="px-5 pt-6 pb-3 flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-sm">განცხადებები</p>
                  {member.listingCount > 0 && (
                    <Link to={`/admin?section=properties&member=${encodeURIComponent(member.email)}`} onClick={onClose} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                      ცხრილში ნახვა
                    </Link>
                  )}
                </div>
                {member.listingRows.length === 0 ? (
                  <p className="px-5 pb-6 text-sm text-slate-400">განცხადება არ დაუმატებია.</p>
                ) : (
                  <ul className="px-3 pb-4">
                    {member.listingRows.map(row => (
                      <li key={row.id}>
                        <Link to={`/admin/listings/${row.id}/edit`} className="flex gap-3 p-2 rounded-xl hover:bg-slate-50">
                          <span className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                            {row.cover && <img src={row.cover} alt="" className="w-full h-full object-cover" loading="lazy" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold text-slate-900 truncate">{row.title}</span>
                            <span className="block text-xs text-slate-500 truncate">
                              #{row.id}{row.district ? ` · ${row.district}` : ''}{row.price ? ` · ${formatMoneyPlain(Number(row.price), row.priceCurrency)}` : ''}
                            </span>
                            <span className="mt-1 block"><StatusPill status={row.moderationStatus} /></span>
                          </span>
                          <ExternalLink size={14} className="text-slate-300 flex-shrink-0 mt-1" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {member && (
              <div className="border-t border-slate-100 p-4 grid grid-cols-3 gap-2 flex-shrink-0">
                {can('members.block') ? (
                  <button type="button" onClick={() => onEdit(member)} className={`${btnGhost} h-10 px-2`}><Pencil size={15} /> რედაქტირება</button>
                ) : <span />}
                {can('members.block') ? (member.isActive ? (
                  <button type="button" onClick={() => onBlock(member)} className={`${btnGhost} h-10 px-2 text-orange-700`}><Ban size={15} /> დაბლოკვა</button>
                ) : (
                  <button type="button" onClick={() => onUnblock(member)} className={`${btnGhost} h-10 px-2 text-emerald-700`}><ShieldCheck size={15} /> განბლოკვა</button>
                )) : <span />}
                {can('members.delete') ? (
                  <button type="button" onClick={() => onDelete(member)} className={`${btnGhost} h-10 px-2 text-red-600`}><Trash2 size={15} /> წაშლა</button>
                ) : <span />}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Edit ────────────────────────────────────────────────────────────────── */

function EditMemberModal({ member, onClose, onSaved }: {
  member: MemberRow | null;
  onClose: () => void;
  onSaved: (next: MemberRow) => void;
}) {
  const api = useApiRequest();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', removeAvatar: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!member) return;
    setForm({
      firstName: member.firstName ?? member.name,
      lastName: member.lastName ?? '',
      email: member.email,
      phone: member.phone ?? '',
      password: '',
      removeAvatar: false,
    });
    setErrors({});
    setError('');
  }, [member]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'სახელი სავალდებულოა';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'შეიყვანეთ სწორი ელ-ფოსტა';
    if (form.password && form.password.length < 8) next.password = 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      if (form.password) body.password = form.password;
      if (form.removeAvatar) body.avatarUrl = null;
      onSaved(await api(`/members/${member.id}`, { method: 'PUT', body: JSON.stringify(body) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  return (
    <Modal open={Boolean(member)} onClose={() => !busy && onClose()} title="მომხმარებლის რედაქტირება" closeLabel="დახურვა" width={520}>
      {member && (
        <form onSubmit={save} noValidate className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="სახელი" value={form.firstName} onChange={e => set('firstName', e.target.value)} error={errors.firstName} maxLength={120} />
            <Field label="გვარი" value={form.lastName} onChange={e => set('lastName', e.target.value)} maxLength={120} />
          </div>
          <Field label="ელ-ფოსტა" type="email" icon={Mail} value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
          <Field label="ტელეფონი" type="tel" icon={Phone} value={form.phone} onChange={e => set('phone', e.target.value)} maxLength={50} />
          <PasswordField
            label="ახალი პაროლი"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            autoComplete="new-password"
            placeholder="ცარიელი — არ იცვლება"
            error={errors.password}
            hint="შეცვლისას მომხმარებელი ყველა მოწყობილობიდან გამოვა."
            showLabel="ჩვენება"
            hideLabel="დამალვა"
          />
          {member.avatarUrl && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer">
              <Avatar name={member.name} src={member.avatarUrl} size={36} />
              <span className="flex-1 text-sm text-slate-700">პროფილის ფოტოს წაშლა</span>
              <input type="checkbox" checked={form.removeAvatar} onChange={e => set('removeAvatar', e.target.checked)} className="w-[18px] h-[18px] accent-red-600" />
            </label>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>გაუქმება</button>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />} შენახვა
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ── Block ───────────────────────────────────────────────────────────────── */

function BlockMemberModal({ member, onClose, onSaved }: {
  member: MemberRow | null;
  onClose: () => void;
  onSaved: (next: MemberRow) => void;
}) {
  const api = useApiRequest();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setReason(''); setError(''); }, [member]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    setBusy(true);
    setError('');
    try {
      onSaved(await api(`/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: false, blockedReason: reason.trim() }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(member)} onClose={() => !busy && onClose()} title="მომხმარებლის დაბლოკვა" closeLabel="დახურვა" width={480}>
      {member && (
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <Avatar name={member.name} src={member.avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{member.name}</p>
              <p className="text-xs text-slate-500 truncate">{member.email}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            მომხმარებელი მაშინვე გამოვა ანგარიშიდან და ვეღარ შევა. მისი განცხადებები ადგილზე რჩება — საჭიროების შემთხვევაში ცალკე წაშალეთ.
          </p>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5" htmlFor="block-reason">მიზეზი (მომხმარებელი დაინახავს შესვლისას)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BLOCK_REASONS.map(item => (
                <button key={item} type="button" onClick={() => setReason(item)} className={`h-8 px-3 rounded-lg text-xs font-semibold border transition ${reason === item ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {item}
                </button>
              ))}
            </div>
            <textarea
              id="block-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={255}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none"
            />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>გაუქმება</button>
            <button type="submit" className={`${btnDanger} bg-orange-600 hover:bg-orange-700`} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} დაბლოკვა
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ── Delete ──────────────────────────────────────────────────────────────── */

function DeleteMemberModal({ member, onClose, onDeleted }: {
  member: MemberRow | null;
  onClose: () => void;
  onDeleted: (id: number, listings: number) => void;
}) {
  const api = useApiRequest();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setConfirmText(''); setError(''); }, [member]);

  // Typing the email back is only asked for when listings would go with the account.
  const needsConfirm = Boolean(member && member.listingCount > 0);
  const confirmed = !needsConfirm || confirmText.trim().toLowerCase() === member?.email.toLowerCase();

  async function remove(event: FormEvent) {
    event.preventDefault();
    if (!member || !confirmed) return;
    setBusy(true);
    setError('');
    try {
      const result = await api(`/members/${member.id}`, { method: 'DELETE' });
      onDeleted(member.id, Number(result?.listings) || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(member)} onClose={() => !busy && onClose()} title="მომხმარებლის წაშლა" closeLabel="დახურვა" width={480}>
      {member && (
        <form onSubmit={remove} className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            <b className="text-slate-900">{member.name}</b> ({member.email}) სამუდამოდ წაიშლება ფავორიტებთან და შენახულ ძიებებთან ერთად.
          </p>
          {member.listingCount > 0 && (
            <Alert tone="error" title={`ერთად წაიშლება ${member.listingCount} განცხადება`}>
              მათ შორის {member.listings.approved} გამოქვეყნებული. თუ განცხადებების შენახვა გინდათ, ჯობს მომხმარებელი დაბლოკოთ.
            </Alert>
          )}
          {needsConfirm && (
            <Field
              label={`დასადასტურებლად ჩაწერეთ ელ-ფოსტა: ${member.email}`}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>გაუქმება</button>
            <button type="submit" className={btnDanger} disabled={busy || !confirmed}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} სამუდამოდ წაშლა
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
