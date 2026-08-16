/**
 * Broker leaderboard: views, new listings and attention items cleared over a period,
 * each compared with the window immediately before it so a good week is visible.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Handshake,
  Minus,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { formatGeorgianDateTime } from '../../../lib/dateFormat';
import { Avatar, EmptyState, RoleChip, Spinner, StatTile } from '../desk/ui';
import type { AnalyticsBoardProps, LeaderboardPeriod, LeaderboardReport, LeaderboardRow } from './types';

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'week', label: 'კვირა' },
  { id: 'month', label: 'თვე' },
  { id: 'quarter', label: 'კვარტალი' },
];

type SortKey = keyof Pick<
  LeaderboardRow,
  'score' | 'views' | 'newListings' | 'attentionCleared' | 'deals' | 'calls' | 'liveListings'
>;

const COLUMNS: { key: SortKey | 'rank' | 'person' | 'activity'; label: string; hint?: string; numeric?: boolean }[] = [
  { key: 'rank', label: '#' },
  { key: 'person', label: 'თანამშრომელი' },
  { key: 'score', label: 'ქულა', hint: 'ახალი განცხადება, დახურული საქმე, გარიგება და ნახვები ერთად', numeric: true },
  { key: 'views', label: 'ნახვები', hint: 'პერიოდში დაფიქსირებული ნახვები', numeric: true },
  { key: 'newListings', label: 'ახალი', hint: 'პერიოდში დამატებული განცხადებები', numeric: true },
  { key: 'attentionCleared', label: 'დახურული', hint: 'შესრულებული დავალებები + ბაზარზე დაბრუნებული განცხადებები', numeric: true },
  { key: 'deals', label: 'გარიგება', hint: 'პერიოდში გაქირავებულად მონიშნული', numeric: true },
  { key: 'liveListings', label: 'ბაზარზე', hint: 'ახლა აქტიური პორტფელი', numeric: true },
  { key: 'activity', label: 'ბოლო აქტივობა' },
];

/** Period-over-period delta as a coloured arrow. */
function Delta({ now, before }: { now: number; before: number }) {
  const diff = now - before;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-300">
        <Minus size={10} />
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}
      title={`წინა პერიოდი: ${before}`}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{diff}
    </span>
  );
}

function Metric({ value, before }: { value: number; before: number }) {
  return (
    <div className="text-right">
      <span className="font-bold text-slate-800">{value.toLocaleString('ka-GE')}</span>
      <div><Delta now={value} before={before} /></div>
    </div>
  );
}

const MEDALS = ['#f59e0b', '#94a3b8', '#b45309'];

export default function LeaderboardBoard({ api, showToast }: AnalyticsBoardProps) {
  const [report, setReport] = useState<LeaderboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [sort, setSort] = useState<SortKey>('score');
  const [hideIdle, setHideIdle] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/analytics/leaderboard?period=${period}`) as LeaderboardReport;
      setReport(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast, period]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    if (!report) return [];
    const visible = hideIdle
      ? report.rows.filter(row => row.score > 0 || row.liveListings > 0)
      : report.rows;
    return [...visible].sort((a, b) => b[sort] - a[sort] || b.score - a.score);
  }, [report, sort, hideIdle]);

  if (loading && !report) return <Spinner />;
  if (!report) return <EmptyState icon={<Trophy size={22} />} title="მონაცემი არ არის" />;

  const { totals, weights } = report;
  const scoreHint =
    `ახალი ×${weights.newListings} · დახურული ×${weights.attentionCleared} · ` +
    `გარიგება ×${weights.deals} · ნახვა ×${weights.views}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map(item => (
          <button
            key={item.id}
            onClick={() => setPeriod(item.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              period === item.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-500">
          <input
            type="checkbox"
            checked={hideIdle}
            onChange={event => setHideIdle(event.target.checked)}
            className="h-3.5 w-3.5 accent-slate-800"
          />
          მხოლოდ აქტიურები
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="ნახვები"
          value={totals.views.toLocaleString('ka-GE')}
          tone="blue"
          icon={<Eye size={14} />}
          hint={`წინა პერიოდი ${totals.previous.views.toLocaleString('ka-GE')}`}
        />
        <StatTile
          label="ახალი განცხადება"
          value={totals.newListings}
          tone="green"
          icon={<PlusCircle size={14} />}
          hint={`წინა პერიოდი ${totals.previous.newListings}`}
        />
        <StatTile
          label="დახურული საქმე"
          value={totals.attentionCleared}
          tone="amber"
          icon={<CheckCircle2 size={14} />}
          hint={`${totals.tasksCleared} დავალება · ${totals.revived} დაბრუნდა ბაზარზე`}
        />
        <StatTile
          label="გარიგება"
          value={totals.deals}
          icon={<Handshake size={14} />}
          hint={`${totals.calls} ზარი პერიოდში`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="ამ პერიოდში აქტივობა არ არის"
          hint="სცადეთ უფრო ხანგრძლივი პერიოდი"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {COLUMNS.map(column => {
                    const sortable = column.key !== 'rank' && column.key !== 'person' && column.key !== 'activity';
                    return (
                      <th
                        key={column.key}
                        onClick={() => sortable && setSort(column.key as SortKey)}
                        title={column.key === 'score' ? scoreHint : column.hint}
                        className={`select-none px-3 py-2.5 transition-colors ${column.numeric ? 'text-right' : ''} ${
                          sortable ? 'cursor-pointer hover:text-slate-800' : ''
                        } ${sort === column.key ? 'text-slate-900' : ''}`}
                      >
                        {column.label}
                        {sort === column.key && ' ↓'}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.userId} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-extrabold text-white"
                        style={{ background: MEDALS[row.rank - 1] ?? '#e2e8f0', color: row.rank <= 3 ? '#fff' : '#475569' }}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.name} photo={row.avatarUrl} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-800">{row.name}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <RoleChip role={row.role} />
                            {row.overdueTasks > 0 && (
                              <span className="text-[10px] font-bold text-red-500">
                                {row.overdueTasks} ვადაგადაცილებული
                              </span>
                            )}
                            {!row.isActive && (
                              <span className="text-[10px] font-bold text-slate-400">დაბლოკილი</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right" title={scoreHint}>
                      <span className="text-base font-extrabold text-slate-900">{row.score}</span>
                      <div><Delta now={row.score} before={row.previous.score} /></div>
                    </td>
                    <td className="px-3 py-3"><Metric value={row.views} before={row.previous.views} /></td>
                    <td className="px-3 py-3"><Metric value={row.newListings} before={row.previous.newListings} /></td>
                    <td className="px-3 py-3">
                      <Metric value={row.attentionCleared} before={row.previous.attentionCleared} />
                      <p className="text-right text-[10px] text-slate-400">
                        {row.tasksCleared} + {row.revived}
                      </p>
                    </td>
                    <td className="px-3 py-3"><Metric value={row.deals} before={row.previous.deals} /></td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-bold text-slate-800">{row.liveListings}</span>
                      <p className="text-[10px] text-slate-400">
                        {row.needsAttention > 0 ? `${row.needsAttention} ყურადღება` : `${row.totalListings} სულ`}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {row.lastActivityAt ? formatGeorgianDateTime(row.lastActivityAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
            ქულა: {scoreHint}
          </div>
        </div>
      )}
    </div>
  );
}
