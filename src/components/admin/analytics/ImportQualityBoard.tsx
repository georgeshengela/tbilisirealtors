/**
 * Import quality report: which myhome.ge / ss.ge imports failed, which came back
 * half-filled, what is usually missing, and whether the attempt became a listing.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileWarning,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { formatGeorgianDateTime } from '../../../lib/dateFormat';
import {
  IMPORT_ERROR_LABEL,
  IMPORT_STATUS_COLOR,
  IMPORT_STATUS_LABEL,
  importFieldLabel,
} from '../../../lib/permissions';
import { Chip, EmptyState, Spinner, StatTile, selectCls } from '../desk/ui';
import type { AnalyticsBoardProps, ImportQualityReport } from './types';

const RANGES = [
  { days: 7, label: '7 დღე' },
  { days: 30, label: '30 დღე' },
  { days: 90, label: '90 დღე' },
];

const STATUSES = [
  { id: '', label: 'ყველა' },
  { id: 'ok', label: 'სრული' },
  { id: 'partial', label: 'ნაწილობრივი' },
  { id: 'failed', label: 'წარუმატებელი' },
];

function StatusChip({ status }: { status: string }) {
  const color = IMPORT_STATUS_COLOR[status] ?? { bg: '#e2e8f0', text: '#475569' };
  return <Chip label={IMPORT_STATUS_LABEL[status] ?? status} bg={color.bg} text={color.text} />;
}

/** A tiny stacked bar per day — enough to spot the day a source broke. */
function DailyBars({ daily }: { daily: ImportQualityReport['daily'] }) {
  if (daily.length === 0) return null;
  const tallest = Math.max(...daily.map(day => day.ok + day.partial + day.failed), 1);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800">იმპორტი დღეების მიხედვით</h3>
      <p className="mt-0.5 text-[11px] text-slate-400">წითელი დღე ნიშნავს, რომ წყარო გატყდა</p>
      <div className="mt-3 flex h-24 items-end gap-1">
        {daily.map(day => {
          const total = day.ok + day.partial + day.failed;
          return (
            <div
              key={day.day}
              className="flex flex-1 flex-col justify-end gap-0.5"
              title={`${day.day}: ${day.ok} სრული, ${day.partial} ნაწილობრივი, ${day.failed} წარუმატებელი`}
            >
              {day.failed > 0 && (
                <div className="w-full rounded-sm bg-red-400" style={{ height: `${(day.failed / tallest) * 88}px` }} />
              )}
              {day.partial > 0 && (
                <div className="w-full rounded-sm bg-amber-400" style={{ height: `${(day.partial / tallest) * 88}px` }} />
              )}
              {day.ok > 0 && (
                <div className="w-full rounded-sm bg-emerald-500" style={{ height: `${(day.ok / tallest) * 88}px` }} />
              )}
              {total === 0 && <div className="h-0.5 w-full rounded-sm bg-slate-100" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ImportQualityBoard({ api, showToast }: AnalyticsBoardProps) {
  const [report, setReport] = useState<ImportQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [retrying, setRetrying] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (source) params.set('source', source);
      if (status) params.set('status', status);
      const data = await api(`/analytics/imports?${params}`) as ImportQualityReport;
      setReport(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast, days, source, status]);

  useEffect(() => { void load(); }, [load]);

  async function retry(id: number) {
    setRetrying(id);
    try {
      const result = await api(`/analytics/imports/${id}/retry`, { method: 'POST' }) as {
        meta?: { quality?: string; missingFields?: string[] };
      };
      const quality = result.meta?.quality;
      showToast(
        quality === 'ok'
          ? 'ხელახლა წარმატებით ჩამოიტვირთა'
          : `ჩამოიტვირთა, მაგრამ აკლია: ${(result.meta?.missingFields ?? []).map(importFieldLabel).join(', ')}`,
        quality === 'ok' ? 'success' : 'error',
      );
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ხელახლა ცდა ვერ მოხერხდა', 'error');
    } finally {
      setRetrying(null);
    }
  }

  if (loading && !report) return <Spinner />;
  if (!report) return <EmptyState icon={<Download size={22} />} title="მონაცემი არ არის" />;

  const { totals } = report;

  if (totals.attempts === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map(range => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                days === range.days
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <EmptyState
          icon={<Download size={22} />}
          title="ამ პერიოდში იმპორტი არ ყოფილა"
          hint="myhome.ge ან ss.ge-დან განცხადების ჩამოტვირთვისთანავე აქ გამოჩნდება"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(range => (
          <button
            key={range.days}
            onClick={() => setDays(range.days)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              days === range.days
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {range.label}
          </button>
        ))}
        <select value={source} onChange={event => setSource(event.target.value)} className={`${selectCls} w-auto`}>
          <option value="">ყველა წყარო</option>
          {report.sources.map(item => <option key={item.source} value={item.source}>{item.source}</option>)}
        </select>
        <select value={status} onChange={event => setStatus(event.target.value)} className={`${selectCls} w-auto`}>
          {STATUSES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="ცდა" value={totals.attempts} icon={<Download size={14} />} hint={`${days} დღეში`} />
        <StatTile
          label="სრული"
          value={totals.ok}
          tone="green"
          icon={<CheckCircle2 size={14} />}
          hint={`წაკითხულთა ${totals.cleanRate}%`}
        />
        <StatTile
          label="ნაწილობრივი"
          value={totals.partial}
          tone={totals.partial ? 'amber' : 'slate'}
          icon={<FileWarning size={14} />}
          hint="ხელით შესავსები დარჩა"
        />
        <StatTile
          label="წარუმატებელი"
          value={totals.failed}
          tone={totals.failed ? 'red' : 'slate'}
          icon={<XCircle size={14} />}
          hint={`წარმატება ${totals.successRate}%`}
        />
        <StatTile
          label="შენახული"
          value={totals.saved}
          tone="blue"
          icon={<CheckCircle2 size={14} />}
          hint={`წაკითხულთა ${totals.conversionRate}% გახდა განცხადება`}
        />
      </div>

      <DailyBars daily={report.daily} />

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Per source */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">წყაროები</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">წყარო</th>
                <th className="px-3 py-2 text-right">ცდა</th>
                <th className="px-3 py-2 text-right">სრული</th>
                <th className="px-3 py-2 text-right">ნაწ.</th>
                <th className="px-3 py-2 text-right">შეცდომა</th>
                <th className="px-4 py-2 text-right">საშ. სიჩქარე</th>
              </tr>
            </thead>
            <tbody>
              {report.sources.map(item => (
                <tr key={item.source} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-slate-800">{item.source}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.lastAttemptAt ? formatGeorgianDateTime(item.lastAttemptAt) : '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{item.attempts}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-700">{item.ok}</td>
                  <td className="px-3 py-2.5 text-right text-amber-700">{item.partial}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${item.failed ? 'text-red-600' : 'text-slate-300'}`}>
                    {item.failed || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                    {item.avgDurationMs ? `${(item.avgDurationMs / 1000).toFixed(1)} წმ` : '—'}
                    <p className="text-[10px] text-slate-400">{item.avgFieldCount} ველი</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Failure causes */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">რატომ ვარდება</h3>
          </div>
          {report.failures.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">ამ პერიოდში შეცდომა არ ყოფილა</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {report.failures.map(group => (
                <li key={`${group.source}-${group.code}`} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">
                        {IMPORT_ERROR_LABEL[group.code] ?? group.code}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {group.source} · {group.sampleMessage || group.code}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-sm font-extrabold text-red-600">{group.count}</span>
                      <p className="text-[10px] text-slate-400">
                        {group.lastSeenAt ? formatGeorgianDateTime(group.lastSeenAt) : ''}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* What the parser keeps failing to fill */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">ყველაზე ხშირად აკლია</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">ეს ველები ხელით ივსება ყოველ იმპორტზე</p>
          {report.gaps.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">ყველა ველი სრულად ჩამოდის</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {report.gaps.slice(0, 8).map(gap => (
                <div key={gap.field} className="flex items-center gap-2">
                  <span className="w-28 flex-shrink-0 truncate text-[11px] font-bold text-slate-600">
                    {importFieldLabel(gap.field)}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-slate-50">
                    <div className="h-full rounded bg-amber-400" style={{ width: `${Math.max(gap.share, 2)}%` }} />
                  </div>
                  <span className="w-16 flex-shrink-0 text-right text-[11px] font-semibold text-slate-500">
                    {gap.count} · {gap.share}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">გასამოწმებელი</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">ჩამოვიდა, მაგრამ სანდოობა ეჭვქვეშაა</p>
          {report.warnings.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">გაფრთხილება არ არის</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {report.warnings.slice(0, 8).map(warning => (
                <div key={warning.field} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                    <AlertTriangle size={12} className="flex-shrink-0 text-amber-500" />
                    <span className="truncate">{importFieldLabel(warning.field)}</span>
                  </span>
                  <span className="flex-shrink-0 font-bold text-slate-700">
                    {warning.count} <span className="text-[10px] font-semibold text-slate-400">{warning.share}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attempt log */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">ბოლო ცდები</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">ბმული</th>
                <th className="px-3 py-2">სტატუსი</th>
                <th className="px-3 py-2">დეტალები</th>
                <th className="px-3 py-2">ვინ</th>
                <th className="px-3 py-2">როდის</th>
                <th className="px-4 py-2 text-right">—</th>
              </tr>
            </thead>
            <tbody>
              {report.recent.map(row => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                  <td className="max-w-[260px] px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">{row.source}</span>
                      {row.sourceId && <span className="text-[10px] text-slate-400">#{row.sourceId}</span>}
                    </div>
                    {row.sourceUrl && (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 truncate text-[11px] text-blue-600 hover:underline"
                      >
                        <ExternalLink size={10} className="flex-shrink-0" />
                        <span className="truncate">{row.sourceUrl}</span>
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={row.status} /></td>
                  <td className="max-w-[280px] px-3 py-2.5">
                    {row.status === 'failed' ? (
                      <span className="text-[11px] text-red-600">
                        {IMPORT_ERROR_LABEL[row.errorCode ?? 'unknown'] ?? row.errorCode}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.missingFields.length === 0 && row.warnings.length === 0 && (
                          <span className="text-[11px] text-slate-400">{row.fieldCount} ველი · {row.photoCount} ფოტო</span>
                        )}
                        {row.missingFields.slice(0, 4).map(field => (
                          <span key={field} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            {importFieldLabel(field)}
                          </span>
                        ))}
                        {row.missingFields.length > 4 && (
                          <span className="text-[10px] font-bold text-slate-400">+{row.missingFields.length - 4}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-500">{row.actorName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-500">
                    {row.createdAt ? formatGeorgianDateTime(row.createdAt) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.propertyId ? (
                      <span className="text-[10px] font-bold text-emerald-600" title="შენახულია განცხადებად">
                        {row.propertyId}
                      </span>
                    ) : report.canRetry && row.sourceUrl ? (
                      <button
                        onClick={() => void retry(row.id)}
                        disabled={retrying === row.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={retrying === row.id ? 'animate-spin' : ''} />
                        ხელახლა
                      </button>
                    ) : null}
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
