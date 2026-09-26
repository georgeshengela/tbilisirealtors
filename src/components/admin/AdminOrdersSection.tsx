import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Loader2, Pencil, Phone, Plus, Search, Trash2, X,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../../contexts/AdminAuthContext';
import { formatDotDate } from '../../lib/dateFormat';
import {
  ORDER_DEAL_META,
  ORDER_ORIGINS,
  ORDER_STATUS_META,
  ORDER_STATUSES,
  type OrderRow,
  type OrderStatus,
} from '../../lib/orders';
import ListingPeekModal from './ListingPeekModal';
import { OrderListingThumbs, useOrderListings, type OrderListingCard } from './OrderListingIds';

const originLabel = (ids: string[]) => ids
  .map(id => ORDER_ORIGINS.find(item => item.id === id)?.label ?? id)
  .join(' · ') || '—';

export default function AdminOrdersSection() {
  const navigate = useNavigate();
  const api = useApiRequest();
  const { can } = useAdminAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, new: 0, current: 0, old: 0, problematic: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dealFilter, setDealFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [error, setError] = useState('');

  const canCreate = can('orders.create');
  const canDelete = can('orders.delete');
  const canStatus = can('orders.status');

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '80' });
      if (search.trim()) qs.set('q', search.trim());
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (dealFilter !== 'all') qs.set('dealType', dealFilter);
      const data = await api(`/orders?${qs}`) as {
        data: OrderRow[];
        summary?: typeof summary;
      };
      setRows(data.data ?? []);
      if (data.summary) setSummary(data.summary);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეკვეთები ვერ ჩაიტვირთა');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [statusFilter, dealFilter]);

  const visible = useMemo(() => rows, [rows]);
  const listingIds = useMemo(
    () => [...new Set(rows.flatMap(row => [...(row.requestedListingIds ?? []), ...(row.offeredListingIds ?? [])]))],
    [rows],
  );
  const listings = useOrderListings(listingIds);
  const [peek, setPeek] = useState<OrderListingCard | null>(null);

  async function changeStatus(row: OrderRow, status: OrderStatus) {
    try {
      await api(`/orders/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'სტატუსი ვერ შეიცვალა');
    }
  }

  async function remove(row: OrderRow) {
    if (!confirm(`წავშალოთ შეკვეთა #${row.id}?`)) return;
    await api(`/orders/${row.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">შეკვეთები</p>
          <h1 className="text-2xl font-extrabold text-slate-900">კლიენტების შეკვეთები</h1>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'all' as const, label: 'სულ', value: summary.total, color: '#0f172a', bg: '#f8fafc' },
          { id: 'new' as const, label: 'NEW', value: summary.new, color: '#2563eb', bg: '#eff6ff' },
          { id: 'current' as const, label: 'CURRENT', value: summary.current, color: '#059669', bg: '#ecfdf5' },
          { id: 'old' as const, label: 'OLD', value: summary.old, color: '#64748b', bg: '#f1f5f9' },
          { id: 'problematic' as const, label: 'PROBLEMATIC', value: summary.problematic, color: '#dc2626', bg: '#fef2f2' },
        ].map(card => (
          <button
            key={card.id}
            type="button"
            onClick={() => setStatusFilter(card.id === 'all' ? 'all' : card.id)}
            className="text-left rounded-2xl border bg-white p-4 shadow-sm"
            style={{ borderColor: statusFilter === card.id ? card.color : '#f1f5f9' }}
          >
            <p className="text-xl font-extrabold" style={{ color: card.value ? '#0f172a' : '#94a3b8' }}>{card.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide mt-1" style={{ color: card.color }}>{card.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void load(); }}
              placeholder="ძიება ID, სახელი, ნომერი, ავტორი..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setTimeout(() => { void load(); }, 0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(['all', 'sale', 'rent'] as const).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setDealFilter(key)}
                className="rounded-xl border px-3 py-2 text-xs font-extrabold"
                style={dealFilter === key ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a' } : { color: '#64748b', borderColor: '#e2e8f0' }}
              >
                {key === 'all' ? 'ყველა' : ORDER_DEAL_META[key].label}
              </button>
            ))}
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => navigate('/admin/orders/new')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
              style={{ background: '#2563eb' }}
            >
              <Plus size={16} />
              ახალი შეკვეთა
            </button>
          )}
        </div>

        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">თარიღი</th>
                <th className="py-2 pr-3">კლიენტი</th>
                <th className="py-2 pr-3">გარიგება</th>
                <th className="py-2 pr-3">ბიუჯეტი</th>
                <th className="py-2 pr-3">წარმომავლობა</th>
                <th className="py-2 pr-3">მოთხოვნილი</th>
                <th className="py-2 pr-3">შეთავაზებული</th>
                <th className="py-2 pr-3">სტატუსი</th>
                <th className="py-2 pr-3">ავტორი</th>
                <th className="py-2 pr-3">კომენტარი</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="py-12 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <ClipboardList size={28} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">შეკვეთა ჯერ არ არის</p>
                  </td>
                </tr>
              ) : visible.map(row => {
                const meta = ORDER_STATUS_META[row.status];
                const lastComment = row.comments?.[row.comments.length - 1]?.text;
                return (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                    <td className="py-2.5 pr-3">
                      <button type="button" onClick={() => navigate(`/admin/orders/${row.id}`)} className="font-mono text-[12px] font-extrabold text-blue-700">
                        #{row.id}
                      </button>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-500 whitespace-nowrap">{formatDotDate(row.createdAt)}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-bold text-slate-800">{row.clientName}</p>
                      <p className="text-[11px] text-slate-500 inline-flex items-center gap-1"><Phone size={10} />{row.clientPhone}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[11px] font-extrabold" style={{ color: ORDER_DEAL_META[row.dealType].color }}>
                        {ORDER_DEAL_META[row.dealType].label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-bold tabular-nums text-slate-800 whitespace-nowrap">
                      {row.budgetCurrency === 'GEL' ? `${Number(row.budgetAmount).toLocaleString('ka-GE')} ₾` : `$${Number(row.budgetAmount).toLocaleString('ka-GE')}`}
                    </td>
                    <td className="py-2.5 pr-3 text-[11px] text-slate-500 max-w-[140px]">{originLabel(row.origin)}</td>
                    <td className="py-2.5 pr-3">
                      <OrderListingThumbs ids={row.requestedListingIds ?? []} listings={listings} onOpen={setPeek} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <OrderListingThumbs ids={row.offeredListingIds ?? []} listings={listings} onOpen={setPeek} />
                    </td>
                    <td className="py-2.5 pr-3">
                      {canStatus ? (
                        <select
                          value={row.status}
                          onChange={e => { void changeStatus(row, e.target.value as OrderStatus); }}
                          className="rounded-lg border px-2 py-1 text-[10px] font-extrabold"
                          style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}40` }}
                        >
                          {ORDER_STATUSES.map(key => (
                            <option key={key} value={key} disabled={key === 'current' && row.status === 'new' && (row.viewings?.length ?? 0) === 0}>
                              {ORDER_STATUS_META[key].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-lg px-2 py-1 text-[10px] font-extrabold" style={{ background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-[12px] font-semibold text-slate-600">{row.createdByName || '—'}</td>
                    <td className="py-2.5 pr-3 text-[11px] text-slate-500 max-w-[180px] truncate">{lastComment || '—'}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => navigate(`/admin/orders/${row.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                          <Pencil size={13} />
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => { void remove(row); }} className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500">
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
      </div>
      {peek && <ListingPeekModal listing={peek} onClose={() => setPeek(null)} />}
    </div>
  );
}
