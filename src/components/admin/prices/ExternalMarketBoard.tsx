/**
 * Market-wide benchmark from MyGE.ge (which pools ss.ge, myhome.ge and korter.ge).
 *
 * Loaded separately from the main report so a slow third party never blocks the page,
 * and framed as a daily benchmark because that is how often MyGE recomputes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Globe2,
  Loader2,
  RefreshCw,
  Scale,
} from 'lucide-react';
import type { CityPriceRow, ExternalMarketReport } from './types';

const num = (n: number) => Math.round(n).toLocaleString('ka-GE');
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}%`;

interface Props {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  ourCities: CityPriceRow[];
  isRent: boolean;
}

export default function ExternalMarketBoard({ api, showToast, ourCities, isRent }: Props) {
  const [data, setData] = useState<ExternalMarketReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const res = (await api(`/analytics/external-market${force ? '?refresh=1' : ''}`)) as ExternalMarketReport;
      setData(res);
      if (force) showToast(res.error ? `MyGE მიუწვდომელია — ნაჩვენებია ბოლო ასლი` : 'ბაზრის მონაცემები განახლდა');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'გარე მონაცემები ვერ ჩაიტვირთა', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, showToast]);

  useEffect(() => { void load(false); }, [load]);

  /** Our GEL/m² beside MyGE's USD/m² converted at today's NBG rate. */
  const comparison = useMemo(() => {
    if (!data) return [];
    return ourCities
      .map(ours => {
        const ext = data.cities.find(c => c.city.trim() === ours.city.trim());
        if (!ext) return null;

        const rate = data.usdRate;
        const marketMedian = (isRent ? ext.rentMedianPerSqm : ext.saleMedianPerSqm) * rate;
        if (marketMedian <= 0) return null;

        const p25 = !isRent && ext.saleP25PerSqm ? ext.saleP25PerSqm * rate : null;
        const p75 = !isRent && ext.saleP75PerSqm ? ext.saleP75PerSqm * rate : null;

        return {
          city: ours.city,
          ours: ours.avgPricePerSqm,
          ourCount: ours.count,
          marketMedian,
          marketSample: isRent ? ext.rentSample : ext.saleSample,
          marketListings: isRent ? ext.rentListings : ext.saleListings,
          p25,
          p75,
          deltaPct: Math.round(((ours.avgPricePerSqm - marketMedian) / marketMedian) * 1000) / 10,
          sourceUpdated: ext.sourceUpdated,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.marketListings - a.marketListings);
  }, [data, ourCities, isRent]);

  if (loading) {
    return (
      <div
        className="rounded-2xl bg-white p-8 flex items-center justify-center gap-2 text-sm text-slate-400"
        style={{ border: '1px solid #e8ecf1' }}
      >
        <Loader2 size={16} className="animate-spin" />
        ბაზრის მონაცემები იტვირთება MyGE-დან…
      </div>
    );
  }

  if (!data || (data.cities.length === 0 && data.error)) {
    return (
      <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #e8ecf1' }}>
        <div className="flex items-center gap-2 text-amber-600 mb-2">
          <AlertTriangle size={16} />
          <span className="text-sm font-bold">გარე ბაზრის მონაცემები მიუწვდომელია</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{data?.error ?? 'უცნობი შეცდომა'}</p>
        <button
          type="button"
          onClick={() => void load(true)}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          ხელახლა ცდა
        </button>
      </div>
    );
  }

  const updatedLabel = data.cities.find(c => c.sourceUpdated)?.sourceUpdated;

  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e8ecf1' }}>
      {/* Header */}
      <div
        className="p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg,#0f172a 0%,#1e293b 55%,#0369a1 100%)' }}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Globe2 size={15} className="text-sky-300" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300">
                მთელი ბაზარი
              </span>
            </div>
            <h3 className="text-lg font-extrabold leading-tight">
              MyGE.ge ბენჩმარკი
              <span className="text-white/45 text-sm font-bold ml-2">ss.ge · myhome.ge · korter.ge</span>
            </h3>
            <p className="text-[11px] text-white/55 mt-1">
              {updatedLabel ? `წყარო განახლდა ${updatedLabel} · ` : ''}
              დღიური აგრეგატი, არა წამიერი ფიდი · 1 USD = {data.usdRate.toFixed(4)} ₾
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              წყარო <ExternalLink size={11} />
            </a>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="p-2 rounded-xl transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
              title="ხელახლა ჩამოტვირთვა"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {[
            { l: 'განცხადება ბაზარზე', v: num(data.totals.listings) },
            { l: 'იყიდება', v: num(data.totals.sale) },
            { l: 'ქირავდება', v: num(data.totals.rent) },
            { l: 'ქალაქი', v: num(data.totals.cities) },
          ].map(x => (
            <div key={x.l}>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{x.l}</p>
              <p className="text-xl font-extrabold tabular-nums">{x.v}</p>
            </div>
          ))}
        </div>

        {data.error && (
          <p className="relative text-[11px] text-amber-300 mt-3">
            ბოლო ჩამოტვირთვა ვერ მოხერხდა ({data.error}) — ნაჩვენებია შენახული ასლი.
          </p>
        )}
      </div>

      {/* Our position inside the market band */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={15} className="text-blue-600" />
          <h4 className="text-sm font-extrabold text-slate-800">ჩვენი ფასი ბაზრის ფონზე</h4>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          {isRent
            ? 'ჩვენი საშუალო ქირა მ²-ზე vs ბაზრის მედიანა'
            : 'ზოლი — ბაზრის P25–P75 დიაპაზონი, ხაზი — მედიანა, წერტილი — ჩვენი საშუალო'}
        </p>

        {comparison.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            ჩვენს ქალაქებს MyGE-ის სიაში დამთხვევა არ მოეძებნა
          </p>
        ) : (
          <div className="space-y-4">
            {comparison.map(row => {
              // Scale the band so P25..P75 occupies the middle 60% of the track.
              const lo = row.p25 ?? row.marketMedian * 0.7;
              const hi = row.p75 ?? row.marketMedian * 1.3;
              const pad = (hi - lo) * 0.35 || row.marketMedian * 0.2;
              const min = Math.min(lo - pad, row.ours);
              const max = Math.max(hi + pad, row.ours);
              const span = max - min || 1;
              const pos = (v: number) => ((v - min) / span) * 100;

              const inBand = row.p25 != null && row.p75 != null
                ? row.ours >= row.p25 && row.ours <= row.p75
                : Math.abs(row.deltaPct) <= 15;

              return (
                <div key={row.city}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{row.city}</span>
                      <span className="text-[11px] text-slate-400">
                        ჩვენი {row.ourCount} · ბაზარზე {num(row.marketListings)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        ჩვენი <b className="text-blue-600">{num(row.ours)}</b> ₾ · ბაზარი{' '}
                        <b className="text-slate-700">{num(row.marketMedian)}</b> ₾
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums"
                        style={
                          inBand
                            ? { background: 'rgba(16,185,129,0.10)', color: '#047857', border: '1px solid rgba(16,185,129,0.25)' }
                            : { background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.28)' }
                        }
                      >
                        {signed(row.deltaPct)}
                      </span>
                    </div>
                  </div>

                  <div className="relative h-9">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-slate-100" />

                    {row.p25 != null && row.p75 != null && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full"
                        style={{
                          left: `${pos(row.p25)}%`,
                          width: `${Math.max(pos(row.p75) - pos(row.p25), 1)}%`,
                          background: 'linear-gradient(90deg,#c7d2fe,#a5b4fc)',
                        }}
                      />
                    )}

                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ left: `${pos(row.marketMedian)}%`, background: '#475569' }}
                      title={`ბაზრის მედიანა ${num(row.marketMedian)} ₾`}
                    />

                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                      style={{
                        left: `calc(${pos(row.ours)}% - 7px)`,
                        background: '#2563eb',
                        border: '2.5px solid #fff',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.45)',
                      }}
                      title={`ჩვენი საშუალო ${num(row.ours)} ₾`}
                    />
                  </div>

                  {row.p25 != null && row.p75 != null && (
                    <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                      <span>P25 {num(row.p25)} ₾</span>
                      <span>P75 {num(row.p75)} ₾</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full city table */}
      <div className="overflow-x-auto" style={{ borderTop: '1px solid #f1f5f9' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['ქალაქი', 'სულ', 'იყიდება', 'ქირავდება', 'მედ. ₾/მ²', 'P25–P75 ₾/მ²', 'მედ. ქირა', 'წყაროები'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap ${
                    i === 0 || i === 7 ? 'text-left' : 'text-right'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cities.map(c => (
              <tr key={c.slug} style={{ borderTop: '1px solid #f1f5f9' }} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <p className="font-bold text-slate-800 leading-tight">{c.city}</p>
                  <p className="text-[10px] text-slate-400">
                    {c.saleSample > 0 ? `${c.saleSample} ანალიზში` : 'მცირე შერჩევა'}
                  </p>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-700">
                  {num(c.totalListings)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{num(c.saleListings)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{num(c.rentListings)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-extrabold text-blue-600">
                  {c.saleMedianPerSqm > 0 ? num(c.saleMedianPerSqm * data.usdRate) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 text-[12px]">
                  {c.saleP25PerSqm && c.saleP75PerSqm
                    ? `${num(c.saleP25PerSqm * data.usdRate)}–${num(c.saleP75PerSqm * data.usdRate)}`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {c.rentMedianPrice > 0 ? `${num(c.rentMedianPrice * data.usdRate)} ₾` : '—'}
                </td>
                <td className="px-4 py-2.5 text-left text-[10px] text-slate-400">{c.sources.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Accrued history */}
      {data.history.length > 0 && (
        <div className="p-5" style={{ borderTop: '1px solid #f1f5f9' }}>
          <h4 className="text-sm font-extrabold text-slate-800 mb-1">ბაზრის მოძრაობა ჩვენი დაკვირვებით</h4>
          <p className="text-[11px] text-slate-400 mb-3">
            MyGE ისტორიას არ აქვეყნებს — ეს ცვლილება ჩვენს ყოველდღიურ ასლებზეა დათვლილი
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.history.map(h => (
              <div key={h.slug} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{h.city}</p>
                  <p className="text-[10px] text-slate-400 tabular-nums">
                    {h.days} დღე · {num(h.first.saleMedianPerSqm * data.usdRate)} → {num(h.last.saleMedianPerSqm * data.usdRate)} ₾
                  </p>
                </div>
                <span
                  className="text-xs font-extrabold tabular-nums"
                  style={{ color: h.changePct > 0 ? '#047857' : h.changePct < 0 ? '#b91c1c' : '#64748b' }}
                >
                  {signed(h.changePct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="px-5 py-3 text-[10px] text-slate-400" style={{ borderTop: '1px solid #f1f5f9', background: '#fbfcfe' }}>
        MyGE-ის სტატისტიკა ბოლო 30 დღის ახალ განცხადებებზეა (მცირე ქალაქებზე 90 დღე) და დოლარშია
        გამოქვეყნებული; აქ ეროვნული ბანკის დღევანდელი კურსით არის გადაყვანილი. ეს შეთავაზების და არა
        გარიგების ფასებია.
      </p>
    </div>
  );
}
