/**
 * Broker performance board — one sortable row per staff member. A listing counts
 * towards whoever it is assigned to, falling back to whoever created it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  Eye,
  Flame,
  PhoneCall,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import { formatGeorgianDateTime } from '../../../lib/dateFormat';
import type { DeskBoardProps, PerformanceRow, PerformanceTotals } from './types';
import { Avatar, Chip, EmptyState, RoleChip, Spinner, StatTile } from './ui';

type SortKey =
  | 'name' | 'liveListings' | 'totalViews' | 'avgViews' | 'needsAttention'
  | 'pendingModeration' | 'newLast30' | 'dealsLast90' | 'callsLast30'
  | 'openTasks' | 'overdueTasks' | 'lastActivityAt';

const COLUMNS: { key: SortKey; label: string; hint?: string; numeric: boolean }[] = [
  { key: 'name', label: 'ბროკერი', numeric: false },
  { key: 'liveListings', label: 'აქტიური', hint: 'ახალი + აქტიური განცხადება', numeric: true },
  { key: 'totalViews', label: 'ნახვები', numeric: true },
  { key: 'avgViews', label: 'საშ. ნახვა', hint: 'ნახვა ერთ განცხადებაზე', numeric: true },
  { key: 'needsAttention', label: 'ყურადღება', hint: 'გაქირავებული / დასარეკი', numeric: true },
  { key: 'pendingModeration', label: 'მოდერაცია', numeric: true },
  { key: 'newLast30', label: 'ახალი 30დღ', numeric: true },
  { key: 'dealsLast90', label: 'გარიგება 90დღ', hint: 'გაქირავებულად გადატანილი', numeric: true },
  { key: 'callsLast30', label: 'ზარი 30დღ', numeric: true },
  { key: 'openTasks', label: 'დავალება', numeric: true },
  { key: 'overdueTasks', label: 'გადაცილება', numeric: true },
  { key: 'lastActivityAt', label: 'ბოლო აქტივობა', numeric: false },
];

function conversion(row: PerformanceRow): number {
  const worked = row.liveListings + row.dealsLast90;
  return worked > 0 ? Math.round((row.dealsLast90 / worked) * 100) : 0;
}

export default function PerformanceBoard({ api, showToast }: DeskBoardProps) {
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [totals, setTotals] = useState<PerformanceTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('liveListings');
  const [desc, setDesc] = useState(true);
  const [hideInactive, setHideInactive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/desk/performance') as { data: PerformanceRow[]; totals: PerformanceTotals };
      setRows(data.data ?? []);
      setTotals(data.totals);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const filtered = hideInactive ? rows.filter(row => row.isActive) : rows;
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'lastActivityAt') {
        return new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime();
      }
      return (b[sort] as number) - (a[sort] as number);
    });
    return desc ? sorted : sorted.reverse();
  }, [rows, sort, desc, hideInactive]);

  const topByViews = useMemo(
    () => [...rows].sort((a, b) => b.totalViews - a.totalViews)[0] ?? null,
    [rows],
  );
  const maxLive = Math.max(1, ...rows.map(row => row.liveListings));

  function pick(key: SortKey) {
    if (key === sort) setDesc(value => !value);
    else { setSort(key); setDesc(true); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="აქტიური განცხადება" value={totals?.liveListings ?? 0} tone="blue" icon={<Building2 size={14} />}
          hint={`${visible.length} ბროკერზე`} />
        <StatTile label="ნახვები სულ" value={(totals?.totalViews ?? 0).toLocaleString('ka-GE')} tone="green"
          icon={<Eye size={14} />} />
        <StatTile label="ზარი 30 დღეში" value={totals?.callsLast30 ?? 0} tone="slate" icon={<PhoneCall size={14} />} />
        <StatTile label="ვადაგადაცილებული" value={totals?.overdueTasks ?? 0}
          tone={(totals?.overdueTasks ?? 0) > 0 ? 'red' : 'green'} icon={<Flame size={14} />} hint="დავალებები" />
      </div>

      {topByViews && topByViews.totalViews > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="rounded-xl bg-amber-400/30 p-2 text-amber-700"><Trophy size={18} /></div>
          <Avatar name={topByViews.name} photo={topByViews.avatarUrl} size={40} />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-amber-900">{topByViews.name}</p>
            <p className="text-[11px] text-amber-700">
              ყველაზე მეტი ნახვა — {topByViews.totalViews.toLocaleString('ka-GE')} ნახვა{' '}
              {topByViews.liveListings} აქტიურ განცხადებაზე
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100"
          >
            <RefreshCw size={12} />განახლება
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <input
          type="checkbox"
          checked={hideInactive}
          onChange={event => setHideInactive(event.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
        დეაქტივირებულების დამალვა
      </label>

      {visible.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="მონაცემი არ არის" hint="დაამატეთ თანამშრომლები და გაანაწილეთ განცხადებები" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {COLUMNS.map(column => (
                    <th
                      key={column.key}
                      onClick={() => pick(column.key)}
                      title={column.hint}
                      className={`cursor-pointer select-none px-3 py-2.5 transition-colors hover:text-slate-800 ${
                        column.numeric ? 'text-right' : ''
                      }`}
                    >
                      <span className={`inline-flex items-center gap-1 ${column.numeric ? 'flex-row-reverse' : ''}`}>
                        {column.label}
                        {sort === column.key && (desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const rate = conversion(row);
                  return (
                    <tr key={row.userId} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} photo={row.avatarUrl} size={36} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="max-w-[150px] truncate text-xs font-bold text-slate-800">{row.name}</p>
                              <RoleChip role={row.role} />
                            </div>
                            <p className="truncate text-[11px] text-slate-400">{row.jobTitle || row.email}</p>
                            {!row.isActive && <Chip label="დეაქტივირებული" bg="#fee2e2" text="#991b1b" />}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="text-sm font-extrabold text-slate-800">{row.liveListings}</p>
                        <div className="ml-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(row.liveListings / maxLive) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">{row.totalListings} სულ</p>
                      </td>
                      <Num value={row.totalViews.toLocaleString('ka-GE')} />
                      <Num value={row.avgViews} />
                      <Num value={row.needsAttention} tone={row.needsAttention > 0 ? 'text-red-600' : undefined} />
                      <Num value={row.pendingModeration} tone={row.pendingModeration > 0 ? 'text-amber-600' : undefined} />
                      <Num value={row.newLast30} />
                      <td className="px-3 py-3 text-right">
                        <p className="text-sm font-bold text-slate-800">{row.dealsLast90}</p>
                        {rate > 0 && <p className="text-[10px] font-bold text-green-600">{rate}% კონვერსია</p>}
                      </td>
                      <Num value={row.callsLast30} />
                      <Num value={row.openTasks} />
                      <Num value={row.overdueTasks} tone={row.overdueTasks > 0 ? 'text-red-600' : undefined} />
                      <td className="px-3 py-3">
                        {row.lastActivityAt ? (
                          <p className="text-[11px] text-slate-500">{formatGeorgianDateTime(row.lastActivityAt)}</p>
                        ) : <span className="text-[11px] text-slate-400">—</span>}
                        {row.doneTasksLast30 > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-green-600">
                            <CheckCircle2 size={9} />{row.doneTasksLast30} დასრულებული 30დღ
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Num({ value, tone }: { value: number | string; tone?: string }) {
  return (
    <td className="px-3 py-3 text-right">
      <p className={`text-sm font-bold ${tone ?? 'text-slate-700'}`}>{value}</p>
    </td>
  );
}
