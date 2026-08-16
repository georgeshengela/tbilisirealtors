/**
 * Inventory by district and status: where the stock sits, how it splits between
 * sale and rent, how old it is, and where listings drop out of the funnel.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  Building2,
  Clock,
  Eye,
  HelpCircle,
  Layers,
  MapPin,
  Phone,
} from 'lucide-react';
import {
  AGE_BUCKET_LABEL,
  DEAL_STATUS_LABEL,
  FUNNEL_STAGE,
  PROPERTY_TYPE_LABEL,
} from '../../../lib/permissions';
import { CITY_AREAS, findCityArea, findDistrictArea } from '../../../data/districts';
import { EmptyState, GEL, Spinner, StatTile, selectCls } from '../desk/ui';
import type { AnalyticsBoardProps, DealFilter, DistrictInventoryRow, InventoryReport } from './types';

type SortKey = keyof Pick<
  DistrictInventoryRow,
  'total' | 'live' | 'parked' | 'needsCall' | 'views' | 'avgAgeDays' | 'medianPrice' | 'stale'
>;

const COLUMNS: { key: SortKey | 'district'; label: string; hint?: string; numeric?: boolean }[] = [
  { key: 'district', label: 'რაიონი' },
  { key: 'total', label: 'სულ', numeric: true },
  { key: 'live', label: 'ბაზარზე', hint: 'ახალი ან აქტიური', numeric: true },
  { key: 'parked', label: 'გაქირავებული', numeric: true },
  { key: 'needsCall', label: 'დასარეკი', numeric: true },
  { key: 'medianPrice', label: 'მედიანა ფასი', hint: 'უფრო სანდოა საშუალოზე', numeric: true },
  { key: 'avgAgeDays', label: 'საშ. ასაკი', hint: 'დღე დაფაზე გამოჩენიდან', numeric: true },
  { key: 'stale', label: '90+ დღე', hint: 'დიდი ხანია იდგა უცვლელად', numeric: true },
  { key: 'views', label: 'ნახვები', numeric: true },
];

const DEALS: { id: DealFilter; label: string }[] = [
  { id: 'all', label: 'ყველა' },
  { id: 'sale', label: 'იყიდება' },
  { id: 'rent', label: 'ქირავდება' },
];

/** True when the stored district name is not in our own district dictionary. */
function isUnknownDistrict(row: DistrictInventoryRow): boolean {
  const city = findCityArea(row.city) ?? CITY_AREAS[0];
  return !findDistrictArea(city, row.district);
}

export default function InventoryFunnelBoard({ api, showToast }: AnalyticsBoardProps) {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [deal, setDeal] = useState<DealFilter>('all');
  const [sort, setSort] = useState<SortKey>('total');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ deal });
      if (city) params.set('city', city);
      const data = await api(`/analytics/inventory?${params}`) as InventoryReport;
      setReport(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast, city, deal]);

  useEffect(() => { void load(); }, [load]);

  const districts = useMemo(() => {
    if (!report) return [];
    return [...report.districts].sort((a, b) => b[sort] - a[sort]);
  }, [report, sort]);

  if (loading && !report) return <Spinner />;
  if (!report) return <EmptyState icon={<Layers size={22} />} title="მონაცემი არ არის" />;

  const { totals, funnel, ageBuckets } = report;
  const widest = Math.max(...ageBuckets.map(bucket => bucket.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={city} onChange={event => setCity(event.target.value)} className={`${selectCls} w-auto`}>
          <option value="">ყველა ქალაქი</option>
          {report.cities.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        {DEALS.map(item => (
          <button
            key={item.id}
            onClick={() => setDeal(item.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              deal === item.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="სულ განცხადება" value={totals.listings} icon={<Building2 size={14} />} hint={`${totals.districts} რაიონში`} />
        <StatTile label="ბაზარზე" value={totals.live} tone="green" icon={<Layers size={14} />} hint={`${totals.forSale} იყიდება · ${totals.forRent} ქირავდება`} />
        <StatTile label="დასარეკი" value={totals.needsCall} tone={totals.needsCall ? 'red' : 'slate'} icon={<Phone size={14} />} hint={`${totals.parked} გაქირავებული`} />
        <StatTile label="მედიანა ასაკი" value={`${totals.medianAgeDays} დღე`} tone="amber" icon={<Clock size={14} />} hint={`საშუალო ${totals.avgAgeDays} დღე`} />
        <StatTile label="ნახვები" value={totals.views.toLocaleString('ka-GE')} tone="blue" icon={<Eye size={14} />} hint={`${totals.unassigned} გადაუბმელი`} />
      </div>

      {/* Funnel — each stage as a share of the one above it. */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">სტატუსის ძაბრი</h3>
        <p className="mt-0.5 text-[11px] text-slate-400">
          სად ითიშება განცხადება შემოსვლიდან ჩაბარებამდე
        </p>
        <div className="mt-3 space-y-1.5">
          {funnel.map((stage, index) => {
            const meta = FUNNEL_STAGE.find(item => item.id === stage.id);
            const width = Math.max(stage.totalRate, 1.5);
            const dropped = index > 0 ? funnel[index - 1].count - stage.count : 0;
            return (
              <div key={stage.id}>
                {index > 0 && dropped > 0 && (
                  <div className="flex items-center gap-1 py-0.5 pl-1 text-[10px] font-semibold text-slate-400">
                    <ArrowDown size={10} />
                    −{dropped}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-28 flex-shrink-0 text-right text-[11px] font-bold text-slate-600" title={meta?.hint}>
                    {meta?.label ?? stage.id}
                  </div>
                  <div className="h-7 flex-1 overflow-hidden rounded-lg bg-slate-50">
                    <div
                      className="flex h-full items-center justify-end rounded-lg bg-slate-800 px-2 text-[11px] font-extrabold text-white transition-all"
                      style={{ width: `${width}%` }}
                    >
                      {stage.count}
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-[11px] font-semibold text-slate-500">
                    {stage.stepRate}% <span className="text-slate-300">/ {stage.totalRate}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Age of listing */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800">განცხადების ასაკი</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">რამდენი ხანია დაფაზე, გაყიდვა/ქირა ცალკე</p>
          <div className="mt-3 space-y-2">
            {ageBuckets.map(bucket => (
              <div key={bucket.id} className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0 text-[11px] font-bold text-slate-600">
                  {AGE_BUCKET_LABEL[bucket.id] ?? bucket.id}
                </div>
                <div className="flex h-6 flex-1 gap-0.5 overflow-hidden rounded-lg bg-slate-50">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(bucket.forSale / widest) * 100}%` }}
                    title={`${bucket.forSale} იყიდება`}
                  />
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(bucket.forRent / widest) * 100}%` }}
                    title={`${bucket.forRent} ქირავდება`}
                  />
                </div>
                <div className="w-10 flex-shrink-0 text-right text-xs font-extrabold text-slate-700">
                  {bucket.count}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> იყიდება</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ქირავდება</span>
          </div>
        </div>

        {/* Deal + property type split */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">გარიგების ტიპი</h3>
            <div className="mt-2 space-y-1.5">
              {report.dealSplit.map(item => (
                <div key={item.status} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-600">{DEAL_STATUS_LABEL[item.status] ?? item.status}</span>
                  <span className="font-bold text-slate-800">
                    {item.count} <span className="text-[10px] font-semibold text-slate-400">{item.share}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">ობიექტის ტიპი</h3>
            <div className="mt-2 space-y-1.5">
              {report.typeSplit.slice(0, 6).map(item => (
                <div key={item.type} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-600">{PROPERTY_TYPE_LABEL[item.type] ?? item.type}</span>
                  <span className="font-bold text-slate-800">
                    {item.count} <span className="text-[10px] font-semibold text-slate-400">{item.share}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* District table */}
      {districts.length === 0 ? (
        <EmptyState
          icon={<MapPin size={22} />}
          title="რაიონული მონაცემი არ არის"
          hint="განცხადებებს რაიონი არ აქვთ მითითებული"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {COLUMNS.map(column => (
                    <th
                      key={column.key}
                      onClick={() => column.key !== 'district' && setSort(column.key as SortKey)}
                      title={column.hint}
                      className={`select-none px-3 py-2.5 transition-colors ${
                        column.numeric ? 'text-right' : ''
                      } ${column.key === 'district' ? '' : 'cursor-pointer hover:text-slate-800'} ${
                        sort === column.key ? 'text-slate-900' : ''
                      }`}
                    >
                      {column.label}
                      {sort === column.key && ' ↓'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {districts.map(row => {
                  const unknown = isUnknownDistrict(row);
                  return (
                    <tr key={row.key} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{row.district || '—'}</span>
                          {unknown && (
                            <span title="ეს დასახელება ჩვენს რაიონების სიაში არ არის — შესაძლოა იმპორტიდან შემოვიდა">
                              <HelpCircle size={13} className="text-amber-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {row.city || '—'} · {row.forSale} იყიდება · {row.forRent} ქირავდება
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold text-slate-800">{row.total}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700">{row.live}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{row.parked}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${row.needsCall ? 'text-red-600' : 'text-slate-400'}`}>
                        {row.needsCall || '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">
                        {row.medianPrice ? GEL(row.medianPrice) : '—'}
                        {row.avgPricePerSqm > 0 && (
                          <p className="text-[10px] text-slate-400">{row.avgPricePerSqm} ₾/მ²</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">
                        {row.avgAgeDays} დღე
                        <p className="text-[10px] text-slate-400">უხუცესი {row.oldestDays}</p>
                      </td>
                      <td className={`px-3 py-3 text-right font-semibold ${row.stale ? 'text-amber-700' : 'text-slate-400'}`}>
                        {row.stale ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {row.stale}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">{row.views.toLocaleString('ka-GE')}</td>
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
