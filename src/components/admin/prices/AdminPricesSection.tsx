/**
 * ფასები — market intelligence desk.
 *
 * Everything on this page is built from two layers: the live listing base (what we
 * actually carry right now) and the Geostat RPPI reference for Tbilisi, so a number
 * can always be read as "ours" versus "the market".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  ChevronDown,
  Coins,
  Crown,
  Download,
  ExternalLink,
  Flame,
  Gauge,
  Home,
  Layers,
  MapPin,
  Minus,
  PieChart,
  Ruler,
  Search,
  Sparkles,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Spinner } from '../desk/ui';
import MarketPriceMap from './MarketPriceMap';
import ExternalMarketBoard from './ExternalMarketBoard';
import type {
  DealFilter,
  DistrictPriceRow,
  MapMode,
  MarketPricesReport,
  PricesBoardProps,
  TrendDirection,
} from './types';

/* ══════════════════════════════════════════════════════════════════════════
   Formatting
   ══════════════════════════════════════════════════════════════════════════ */

const MONTHS_GEO = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  villa: 'ვილა',
  commercial: 'კომერციული',
  land: 'მიწა',
  unknown: 'სხვა',
};

const num = (n: number) => Math.round(n).toLocaleString('ka-GE');

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} მლნ`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)} ათ`;
  return num(n);
}

function signed(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`;
}

function monthLabel(ym: string): string {
  const [, m] = ym.split('-');
  return MONTHS_GEO[Math.max(0, Math.min(11, Number(m) - 1))] ?? ym;
}

function trendDir(change: number): TrendDirection {
  if (change > 1.5) return 'up';
  if (change < -1.5) return 'down';
  return 'flat';
}

const DEALS: { id: DealFilter; label: string }[] = [
  { id: 'sale', label: 'იყიდება' },
  { id: 'rent', label: 'ქირავდება' },
];

const MAP_MODES: { id: MapMode; label: string }[] = [
  { id: 'price', label: 'ფასი' },
  { id: 'trend', label: 'ცვლილება' },
  { id: 'volume', label: 'მოცულობა' },
];

/* ══════════════════════════════════════════════════════════════════════════
   Primitives
   ══════════════════════════════════════════════════════════════════════════ */

function Card({
  children,
  className = '',
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-white ${pad ? 'p-5' : ''} ${className}`}
      style={{ border: '1px solid #e8ecf1', boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)' }}
    >
      {children}
    </div>
  );
}

function Heading({
  icon: Icon,
  title,
  hint,
  right,
  accent = '#2563eb',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-2.5 min-w-0">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-800 leading-tight">{title}</h3>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function TrendChip({
  value,
  direction,
  size = 'sm',
  invert = false,
  reliable = true,
}: {
  value: number;
  direction?: TrendDirection;
  size?: 'sm' | 'md';
  invert?: boolean;
  reliable?: boolean;
}) {
  if (!reliable) {
    return (
      <span
        title="შესადარებელ პერიოდებში საკმარისი განცხადება არ არის"
        className={`inline-flex items-center gap-0.5 rounded-full font-bold whitespace-nowrap text-slate-400 ${
          size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
        }`}
        style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}
      >
        <Minus size={size === 'md' ? 14 : 12} />
        არ არის
      </span>
    );
  }

  const dir = direction ?? trendDir(value);
  const good = invert ? dir === 'down' : dir === 'up';
  const bad = invert ? dir === 'up' : dir === 'down';
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;

  const palette = good
    ? { bg: 'rgba(16,185,129,0.10)', fg: '#047857', bd: 'rgba(16,185,129,0.25)' }
    : bad
      ? { bg: 'rgba(239,68,68,0.10)', fg: '#b91c1c', bd: 'rgba(239,68,68,0.25)' }
      : { bg: 'rgba(100,116,139,0.10)', fg: '#475569', bd: 'rgba(100,116,139,0.20)' };

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-bold tabular-nums whitespace-nowrap ${
        size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      }`}
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}` }}
    >
      <Icon size={size === 'md' ? 14 : 12} />
      {signed(value)}
    </span>
  );
}

function Sparkline({
  data,
  color = '#2563eb',
  width = 110,
  height = 34,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pt = (v: number, i: number) =>
    `${(i / (data.length - 1)) * width},${height - 3 - ((v - min) / range) * (height - 8)}`;

  const line = data.map(pt).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  const uid = `sp${color.replace('#', '')}${data.length}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${uid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Market temperature gauge
   ══════════════════════════════════════════════════════════════════════════ */

function PulseGauge({ trend, label, reliable }: { trend: number; label: string; reliable: boolean }) {
  // -10%…+10% mapped onto a 220° arc.
  const clamped = Math.max(-10, Math.min(10, trend));
  const pct = (clamped + 10) / 20;
  const startAngle = 160;
  const sweep = 220;
  const angle = startAngle + pct * sweep;

  const R = 62;
  const cx = 80;
  const cy = 78;
  const toXY = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const [sx, sy] = toXY(startAngle, R);
  const [ex, ey] = toXY(startAngle + sweep, R);
  const [nx, ny] = toXY(angle, R - 6);

  const color = !reliable ? '#94a3b8' : trend > 1.5 ? '#10b981' : trend < -1.5 ? '#ef4444' : '#64748b';
  const mood = !reliable
    ? 'მონაცემი არასაკმარისია'
    : trend > 6 ? 'ცხელი ბაზარი'
      : trend > 1.5 ? 'ზრდადი'
        : trend < -6 ? 'ცივი ბაზარი'
          : trend < -1.5 ? 'კლებადი'
            : 'სტაბილური';

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={112} viewBox="0 0 160 112">
        <defs>
          <linearGradient id="gaugeRamp" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d={`M ${sx} ${sy} A ${R} ${R} 0 1 1 ${ex} ${ey}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d={`M ${sx} ${sy} A ${R} ${R} 0 1 1 ${ex} ${ey}`}
          fill="none"
          stroke="url(#gaugeRamp)"
          strokeWidth="13"
          strokeLinecap="round"
          opacity="0.85"
        />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#0f172a" />
        <circle cx={cx} cy={cy} r="2.5" fill="#fff" />
      </svg>
      <p className="text-2xl font-extrabold tabular-nums -mt-3" style={{ color }}>
        {reliable ? signed(trend) : '—'}
      </p>
      <p className="text-xs font-bold text-slate-700 mt-0.5">{mood}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Interactive 12-month trend chart
   ══════════════════════════════════════════════════════════════════════════ */

function TrendChart({
  points,
}: {
  points: { month: string; avgPricePerSqm: number; medianPricePerSqm: number; count: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) {
    return (
      <div className="py-16 text-center">
        <Activity size={28} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">დინამიკის საჩვენებლად ჯერ საკმარისი ისტორია არ არის</p>
      </div>
    );
  }

  const W = 720;
  const H = 260;
  const pad = { t: 18, r: 18, b: 54, l: 56 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const all = points.flatMap(p => [p.avgPricePerSqm, p.medianPricePerSqm]).filter(v => v > 0);
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const span = rawMax - rawMin || 1;
  const min = Math.max(0, rawMin - span * 0.15);
  const max = rawMax + span * 0.15;
  const range = max - min || 1;

  const maxCount = Math.max(...points.map(p => p.count), 1);

  const xAt = (i: number) => pad.l + (i / (points.length - 1)) * innerW;
  const yAt = (v: number) => pad.t + innerH - ((v - min) / range) * innerH;

  const avgLine = points.map((p, i) => `${xAt(i)},${yAt(p.avgPricePerSqm)}`).join(' ');
  const medLine = points.map((p, i) => `${xAt(i)},${yAt(p.medianPricePerSqm)}`).join(' ');
  const avgArea = `${pad.l},${pad.t + innerH} ${avgLine} ${xAt(points.length - 1)},${pad.t + innerH}`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - pad.l) / innerW) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const active = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <g key={p}>
            <line
              x1={pad.l}
              y1={pad.t + innerH * (1 - p)}
              x2={W - pad.r}
              y2={pad.t + innerH * (1 - p)}
              stroke={p === 0 ? '#e2e8f0' : '#f4f6f9'}
              strokeWidth="1"
            />
            <text
              x={pad.l - 8}
              y={pad.t + innerH * (1 - p) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
              className="tabular-nums"
            >
              {num(min + range * p)}
            </text>
          </g>
        ))}

        {/* Listing volume behind the lines */}
        {points.map((p, i) => {
          const bw = Math.max(6, (innerW / points.length) * 0.42);
          const bh = (p.count / maxCount) * 30;
          return (
            <rect
              key={`v${p.month}`}
              x={xAt(i) - bw / 2}
              y={pad.t + innerH - bh}
              width={bw}
              height={bh}
              rx="2.5"
              fill="#cbd5e1"
              opacity={hover === i ? 0.75 : 0.4}
            />
          );
        })}

        <polygon points={avgArea} fill="url(#trendArea)" />
        <polyline
          points={medLine}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
        <polyline
          points={avgLine}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hover != null && (
          <line
            x1={xAt(hover)}
            y1={pad.t}
            x2={xAt(hover)}
            y2={pad.t + innerH}
            stroke="#2563eb"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
        )}

        {points.map((p, i) => (
          <g key={p.month}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.avgPricePerSqm)}
              r={hover === i ? 6 : 4}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth="2.5"
            />
            <text
              x={xAt(i)}
              y={H - 32}
              textAnchor="middle"
              fontSize="10"
              fontWeight={hover === i ? 700 : 400}
              fill={hover === i ? '#2563eb' : '#94a3b8'}
            >
              {monthLabel(p.month)}
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${pad.l}, ${H - 12})`}>
          <line x1="0" y1="-4" x2="18" y2="-4" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
          <text x="24" y="0" fontSize="10" fill="#64748b">საშუალო ₾/მ²</text>
          <line x1="110" y1="-4" x2="128" y2="-4" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
          <text x="134" y="0" fontSize="10" fill="#64748b">მედიანა</text>
          <rect x="196" y="-8" width="9" height="9" rx="2" fill="#cbd5e1" />
          <text x="211" y="0" fontSize="10" fill="#64748b">განცხადებები</text>
        </g>
      </svg>

      {active && hover != null && (
        <div
          className="absolute top-2 pointer-events-none rounded-xl px-3 py-2 text-xs"
          style={{
            left: `${(xAt(hover) / W) * 100}%`,
            transform: `translateX(${hover > points.length / 2 ? '-108%' : '8%'})`,
            background: 'rgba(15,23,42,0.94)',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(15,23,42,0.28)',
            minWidth: 148,
          }}
        >
          <p className="font-bold mb-1.5">{monthLabel(active.month)} · {active.month.split('-')[0]}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-blue-300">საშუალო</span>
            <span className="font-bold tabular-nums">{num(active.avgPricePerSqm)} ₾</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">მედიანა</span>
            <span className="tabular-nums">{num(active.medianPricePerSqm)} ₾</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">განცხადება</span>
            <span className="tabular-nums">{active.count}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Histogram
   ══════════════════════════════════════════════════════════════════════════ */

function Histogram({ buckets }: { buckets: { label: string; count: number; from: number }[] }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">მონაცემი არ არის</p>;
  }
  const max = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-40">
      {buckets.map(b => (
        <div key={`${b.from}-${b.label}`} className="flex-1 flex flex-col items-center gap-1.5 group">
          <span className="text-[10px] font-bold text-slate-500 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
            {b.count}
          </span>
          <div
            className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-100"
            style={{
              height: `${Math.max((b.count / max) * 100, 3)}%`,
              background: 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
              opacity: 0.85,
            }}
          />
          <span className="text-[9px] text-slate-400 tabular-nums leading-none text-center">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Donut
   ══════════════════════════════════════════════════════════════════════════ */

function Donut({
  segments,
}: {
  segments: { label: string; value: number; color: string; meta?: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="text-sm text-slate-400 py-8 text-center">მონაცემი არ არის</p>;

  const R = 44;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={116} height={116} viewBox="0 0 116 116" className="flex-shrink-0">
        <circle cx="58" cy="58" r={R} fill="none" stroke="#f1f5f9" strokeWidth="15" />
        {segments.map(seg => {
          const len = (seg.value / total) * C;
          const dash = `${len} ${C - len}`;
          const el = (
            <circle
              key={seg.label}
              cx="58"
              cy="58"
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth="15"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 58 58)"
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text x="58" y="54" textAnchor="middle" fontSize="19" fontWeight="800" fill="#0f172a">
          {total}
        </text>
        <text x="58" y="70" textAnchor="middle" fontSize="9" fill="#94a3b8">
          განცხადება
        </text>
      </svg>

      <div className="flex-1 min-w-0 space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            <span className="font-semibold text-slate-700 truncate flex-1">{seg.label}</span>
            <span className="tabular-nums text-slate-400">
              {Math.round((seg.value / total) * 100)}%
            </span>
            {seg.meta && <span className="tabular-nums text-slate-500 font-medium">{seg.meta}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Ranked bar list
   ══════════════════════════════════════════════════════════════════════════ */

function RankList({
  rows,
  metric,
  color,
  emptyHint,
  onPick,
  selectedKey,
}: {
  rows: DistrictPriceRow[];
  metric: 'price' | 'trend';
  color: string;
  emptyHint: string;
  onPick: (key: string) => void;
  selectedKey: string | null;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-slate-400 py-6 text-center">{emptyHint}</p>;
  }
  const values = rows.map(r => (metric === 'price' ? r.avgPricePerSqm : Math.abs(r.trend30d)));
  const max = Math.max(...values, 1);

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => {
        const value = metric === 'price' ? row.avgPricePerSqm : Math.abs(row.trend30d);
        const active = selectedKey === row.key;
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => onPick(row.key)}
            className={`w-full text-left group rounded-xl px-2.5 py-2 transition-colors ${
              active ? 'bg-blue-50' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                style={{ background: `${color}18`, color }}
              >
                {i + 1}
              </span>
              <span className="text-xs font-bold text-slate-700 truncate flex-1">{row.district}</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color }}>
                {metric === 'price' ? `${num(row.avgPricePerSqm)} ₾` : signed(row.trend30d)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max((value / max) * 100, 4)}%`, background: color }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main section
   ══════════════════════════════════════════════════════════════════════════ */

type SortKey =
  | 'district' | 'avgPricePerSqm' | 'medianPricePerSqm' | 'avgPrice'
  | 'avgArea' | 'count' | 'trend30d' | 'vsBenchmark';

function tableColumns(isRent: boolean): { key: SortKey; label: string; numeric?: boolean; hint?: string }[] {
  const cols: { key: SortKey; label: string; numeric?: boolean; hint?: string }[] = [
    { key: 'district', label: 'რაიონი' },
    { key: 'avgPricePerSqm', label: '₾/მ² საშ.', numeric: true },
    { key: 'medianPricePerSqm', label: '₾/მ² მედ.', numeric: true, hint: 'მედიანა ნაკლებად რეაგირებს ერთეულ ძვირ განცხადებაზე' },
    { key: 'avgPrice', label: isRent ? 'საშ. ქირა' : 'საშ. ფასი', numeric: true },
    { key: 'avgArea', label: 'ფართი', numeric: true },
    { key: 'count', label: 'რაოდ.', numeric: true },
    { key: 'trend30d', label: '30 დღე', numeric: true, hint: 'ბოლო 30 დღე წინა 30-თან შედარებით' },
  ];
  if (!isRent) {
    cols.push({
      key: 'vsBenchmark',
      label: 'vs Geostat',
      numeric: true,
      hint: 'ჩვენი საშუალო Geostat-ის მედიანასთან',
    });
  }
  return cols;
}

export default function AdminPricesSection({ api, showToast }: PricesBoardProps) {
  const [report, setReport] = useState<MarketPricesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [deal, setDeal] = useState<DealFilter>('sale');
  const [selected, setSelected] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('price');
  const [mapLabels, setMapLabels] = useState(true);
  const [sort, setSort] = useState<SortKey>('avgPricePerSqm');
  const [sortDesc, setSortDesc] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ deal });
      if (city) params.set('city', city);
      const data = (await api(`/analytics/market-prices?${params}`)) as MarketPricesReport;
      setReport(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast, city, deal]);

  useEffect(() => { void load(); }, [load]);

  const cities = useMemo(
    () => (report ? [...new Set(report.cities.map(c => c.city))].sort((a, b) => a.localeCompare(b, 'ka')) : []),
    [report],
  );

  const tableRows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? report.districts.filter(
        d => d.district.toLowerCase().includes(q) || d.city.toLowerCase().includes(q),
      )
      : report.districts;

    return [...filtered].sort((a, b) => {
      if (sort === 'district') {
        return sortDesc
          ? b.district.localeCompare(a.district, 'ka')
          : a.district.localeCompare(b.district, 'ka');
      }
      const av = (a[sort] as number | null) ?? -Infinity;
      const bv = (b[sort] as number | null) ?? -Infinity;
      return sortDesc ? bv - av : av - bv;
    });
  }, [report, sort, sortDesc, query]);

  const selectedRow = useMemo(
    () => report?.districts.find(d => d.key === selected) ?? null,
    [report, selected],
  );

  const rankings = useMemo(() => {
    if (!report) return { expensive: [], cheap: [] };
    const withVolume = report.districts.filter(d => d.count > 0);
    return {
      expensive: [...withVolume].sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm).slice(0, 5),
      cheap: [...withVolume].sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm).slice(0, 5),
    };
  }, [report]);

  const insights = useMemo(() => {
    if (!report) return [];
    const out: { icon: React.ComponentType<{ size?: number }>; text: string; tone: 'up' | 'down' | 'neutral' }[] = [];
    const o = report.overview;

    if (o.trendReliable && o.trend30d !== 0) {
      out.push({
        icon: o.trend30d > 0 ? TrendingUp : TrendingDown,
        tone: o.trend30d > 0 ? 'up' : 'down',
        text: `ბოლო 30 დღეში ₾/მ² ${o.trend30d > 0 ? 'გაიზარდა' : 'დაიკლო'} ${Math.abs(o.trend30d)}%-ით`,
      });
    }

    const top = report.topGainers[0];
    if (top && top.trend30d > 0) {
      out.push({ icon: Flame, tone: 'up', text: `${top.district} ლიდერობს ზრდით — ${signed(top.trend30d)}` });
    }

    const drop = report.topLosers[0];
    if (drop && drop.trend30d < 0) {
      out.push({ icon: TrendingDown, tone: 'down', text: `${drop.district} ყველაზე მეტად დაეცა — ${signed(drop.trend30d)}` });
    }

    const overBench = report.districts
      .filter(d => d.vsBenchmark != null && d.vsBenchmark > 10)
      .sort((a, b) => (b.vsBenchmark ?? 0) - (a.vsBenchmark ?? 0))[0];
    if (overBench) {
      out.push({
        icon: Target,
        tone: 'neutral',
        text: `${overBench.district} Geostat-ის ეტალონზე ${signed(overBench.vsBenchmark ?? 0)} მაღალია`,
      });
    }

    if (out.length === 0) {
      out.push({
        icon: Sparkles,
        tone: 'neutral',
        text: `ტრენდისთვის საჭიროა მინიმუმ ${report.overview.minTrendSample} განცხადება ორივე პერიოდში`,
      });
    }

    const bestYield = report.rentYield[0];
    if (bestYield) {
      out.push({
        icon: Coins,
        tone: 'neutral',
        text: `${bestYield.city}: მშრალი დაბრუნება ${bestYield.grossYield}% წელიწადში`,
      });
    }

    if (report.priceChanges.total > 0) {
      out.push({
        icon: Tag,
        tone: report.priceChanges.avgChangePct >= 0 ? 'up' : 'down',
        text: `90 დღეში ${report.priceChanges.total} ფასის კორექცია, საშუალოდ ${signed(report.priceChanges.avgChangePct)}`,
      });
    }

    return out.slice(0, 4);
  }, [report]);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDesc(d => !d);
    else {
      setSort(key);
      setSortDesc(key !== 'district');
    }
  }

  function exportCsv() {
    if (!report) return;
    const header = [
      'ქალაქი', 'რაიონი', 'განცხადება', 'იყიდება', 'ქირავდება',
      'საშ ₾/მ²', 'მედიანა ₾/მ²', 'საშ ფასი', 'მედიანა ფასი', 'საშ ფართი',
      '30დღე %', 'Geostat ₾/მ²', 'vs Geostat %',
    ];
    const lines = report.districts.map(d => [
      d.city, d.district, d.count, d.forSale, d.forRent,
      d.avgPricePerSqm, d.medianPricePerSqm, d.avgPrice, d.medianPrice, d.avgArea,
      d.trend30d, d.benchmarkPricePerSqm ?? '', d.vsBenchmark ?? '',
    ].join(','));

    const blob = new Blob([`\uFEFF${[header.join(','), ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasebi-${city || 'saqartvelo'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV ჩამოიტვირთა');
  }

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center py-28">
        <Spinner label="ბაზრის მონაცემები იტვირთება…" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="py-16 text-center">
        <BarChart3 size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-600">მონაცემები ვერ ჩაიტვირთა</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
        >
          ხელახლა ცდა
        </button>
      </Card>
    );
  }

  const o = report.overview;
  const isRent = deal === 'rent';
  const sqmUnit = isRent ? '₾/მ² თვეში' : '₾/მ²';
  const columns = tableColumns(isRent);
  const spark = report.monthlyTrend.map(m => m.avgPricePerSqm).filter(v => v > 0);
  const totalYield = report.rentYield.length
    ? Math.round((report.rentYield.reduce((s, r) => s + r.grossYield, 0) / report.rentYield.length) * 10) / 10
    : 0;

  const kpis = [
    {
      icon: Banknote,
      accent: '#2563eb',
      label: `საშუალო ${sqmUnit}`,
      value: num(o.avgPricePerSqm),
      unit: '₾',
      sub: `მედიანა ${num(o.medianPricePerSqm)} ₾`,
      trend: o.trend30d,
      dir: o.trendDirection,
      reliable: o.trendReliable,
    },
    {
      icon: Home,
      accent: '#0ea5e9',
      label: isRent ? 'საშუალო ქირა' : 'საშუალო ფასი',
      value: compact(o.avgPrice),
      unit: '₾',
      sub: `მედიანა ${compact(o.medianPrice)} ₾`,
      trend: null,
      dir: 'flat' as TrendDirection,
      reliable: true,
    },
    {
      icon: Layers,
      accent: '#8b5cf6',
      label: isRent ? 'საქირავებელი' : 'საყიდელი',
      value: num(o.pricedListings),
      unit: '',
      sub: `${num(report.districts.length)} რაიონი · ${num(report.cities.length)} ქალაქი`,
      trend: null,
      dir: 'flat' as TrendDirection,
      reliable: true,
    },
    {
      icon: Ruler,
      accent: '#f59e0b',
      label: 'საშუალო ფართი',
      value: num(o.avgArea),
      unit: 'მ²',
      sub: `${num(report.freshness.last30)} ახალი 30 დღეში`,
      trend: null,
      dir: 'flat' as TrendDirection,
      reliable: true,
    },
    {
      icon: Coins,
      accent: '#10b981',
      label: 'მშრალი დაბრუნება',
      value: totalYield ? `${totalYield}` : '—',
      unit: totalYield ? '%' : '',
      sub: totalYield ? `${report.rentYield[0]?.paybackYears ?? 0} წელი ანაზღაურება` : 'ქირის მონაცემი აკლია',
      trend: null,
      dir: 'flat' as TrendDirection,
      reliable: true,
    },
    {
      icon: Gauge,
      accent: '#6366f1',
      label: `Geostat RPPI · ${o.geostatQuarter}`,
      value: signed(o.geostatIndexYoY),
      unit: '',
      sub: `კვარტალში ${signed(o.geostatIndexQoQ)}`,
      trend: o.geostatIndexQoQ,
      dir: trendDir(o.geostatIndexQoQ),
      reliable: true,
    },
  ];

  return (
    <div className="space-y-4 price-rise">
      {/* ── Command bar ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl text-white"
        style={{ background: 'linear-gradient(120deg,#0b1220 0%,#132a4d 45%,#1d4ed8 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 15%, rgba(96,165,250,0.30) 0%, transparent 55%), radial-gradient(circle at 15% 95%, rgba(16,185,129,0.18) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="relative flex w-2 h-2">
                  <span className="price-live-dot absolute inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">
                  ცოცხალი მონაცემები
                </span>
                <span className="text-[10px] text-white/40">·</span>
                <span className="text-[10px] text-white/60">
                  {new Date(report.generatedAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <h2 className="text-2xl sm:text-[32px] font-extrabold tracking-tight leading-none">
                ფასები
                <span className="text-white/45 font-bold text-lg sm:text-xl ml-2.5">
                  {city || 'საქართველო'}
                </span>
              </h2>

              <div className="flex flex-wrap items-end gap-x-7 gap-y-3 mt-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
                    საშუალო {sqmUnit}
                  </p>
                  <div className="flex items-end gap-2.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none">
                      {num(o.avgPricePerSqm)}
                    </span>
                    <span className="text-lg font-bold text-white/50 leading-none mb-0.5">₾</span>
                    <TrendChip
                      value={o.trend30d}
                      direction={o.trendDirection}
                      size="md"
                      reliable={o.trendReliable}
                    />
                  </div>
                </div>

                {spark.length > 1 && (
                  <div className="hidden sm:block">
                    <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">12 თვე</p>
                    <Sparkline data={spark} color="#7dd3fc" width={150} height={40} />
                  </div>
                )}

                <div className="hidden md:block">
                  <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">90 დღე</p>
                  <p className="text-xl font-extrabold tabular-nums leading-none">
                    {o.trend90d !== 0 ? signed(o.trend90d) : '—'}
                  </p>
                </div>

                <div className="hidden md:block">
                  <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">ბაზა</p>
                  <p className="text-xl font-extrabold tabular-nums leading-none">{num(o.pricedListings)}</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <div className="relative">
                <select
                  value={city}
                  onChange={e => { setCity(e.target.value); setSelected(null); }}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm font-semibold cursor-pointer focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}
                >
                  <option value="" className="text-slate-900">ყველა ქალაქი</option>
                  {cities.map(c => (
                    <option key={c} value={c} className="text-slate-900">{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" />
              </div>

              <div
                className="flex rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}
              >
                {DEALS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDeal(d.id)}
                    className="px-3.5 py-2.5 text-xs font-bold transition-colors"
                    style={
                      deal === d.id
                        ? { background: '#fff', color: '#0f172a' }
                        : { background: 'transparent', color: 'rgba(255,255,255,0.75)' }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                <Download size={14} /> CSV
              </button>

              <button
                type="button"
                onClick={() => void load()}
                className="p-2.5 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
                title="განახლება"
              >
                <Activity size={15} className={loading ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>

          {/* Insight ticker */}
          {insights.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              {insights.map(ins => (
                <span
                  key={ins.text}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background:
                      ins.tone === 'up' ? 'rgba(16,185,129,0.16)'
                        : ins.tone === 'down' ? 'rgba(239,68,68,0.16)'
                          : 'rgba(255,255,255,0.10)',
                    color:
                      ins.tone === 'up' ? '#6ee7b7'
                        : ins.tone === 'down' ? '#fca5a5'
                          : 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <ins.icon size={12} />
                  {ins.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="relative rounded-2xl bg-white p-4 overflow-hidden transition-shadow hover:shadow-md"
            style={{ border: '1px solid #e8ecf1', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: kpi.accent }} />
            <div className="flex items-center justify-between mb-2.5">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${kpi.accent}14`, color: kpi.accent }}
              >
                <kpi.icon size={16} />
              </span>
              {kpi.trend != null && (
                <TrendChip value={kpi.trend} direction={kpi.dir} reliable={kpi.reliable} />
              )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 leading-tight truncate">
              {kpi.label}
            </p>
            <p className="text-[22px] font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
              {kpi.value}
              {kpi.unit && <span className="text-sm font-bold text-slate-400 ml-1">{kpi.unit}</span>}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Map + pulse ─────────────────────────────────────────────────── */}
      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" pad={false}>
          <div className="p-5 pb-3">
            <Heading
              icon={MapPin}
              title="რაიონების რუკა"
              hint="ბუშტის ზომა — განცხადებების რაოდენობა, ფერი — არჩეული მეტრიკა"
              right={
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                    {MAP_MODES.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMapMode(m.id)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                          mapMode === m.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapLabels(v => !v)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      mapLabels ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-400'
                    }`}
                    style={{ border: '1px solid #e2e8f0' }}
                  >
                    ლეიბლები
                  </button>
                </div>
              }
            />
          </div>

          <div className="px-5">
            <MarketPriceMap
              districts={report.districts}
              selectedKey={selected}
              onSelect={setSelected}
              mode={mapMode}
              showLabels={mapLabels}
              height={430}
            />
          </div>

          {/* Selected district detail */}
          <div className="p-5 pt-4">
            {selectedRow ? (
              <div
                className="rounded-xl p-4"
                style={{ background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', border: '1px solid #dbeafe' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-blue-600" />
                    <span className="text-sm font-extrabold text-slate-800">{selectedRow.district}</span>
                    <span className="text-xs text-slate-400">{selectedRow.city}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    გასუფთავება
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { l: `საშ. ${sqmUnit}`, v: num(selectedRow.avgPricePerSqm) },
                    { l: 'მედიანა', v: num(selectedRow.medianPricePerSqm) },
                    { l: isRent ? 'საშ. ქირა' : 'საშ. ფასი', v: compact(selectedRow.avgPrice) },
                    { l: 'ფართი', v: `${num(selectedRow.avgArea)} მ²` },
                    { l: 'განცხადება', v: num(selectedRow.count) },
                    {
                      l: isRent ? '30 დღე' : 'Geostat',
                      v: isRent
                        ? (selectedRow.trendReliable ? signed(selectedRow.trend30d) : '—')
                        : (selectedRow.benchmarkPricePerSqm ? num(selectedRow.benchmarkPricePerSqm) : '—'),
                    },
                  ].map(x => (
                    <div key={x.l}>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{x.l}</p>
                      <p className="text-sm font-extrabold text-slate-800 tabular-nums">{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center">
                აირჩიე რაიონი რუკაზე ან ცხრილში დეტალების სანახავად
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <Heading
              icon={Gauge}
              title="ბაზრის ტემპერატურა"
              hint={`${sqmUnit} ცვლილება 30 დღეში`}
              accent="#10b981"
            />
            <PulseGauge trend={o.trend30d} label={city || 'საქართველო'} reliable={o.trendReliable} />
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
              {[
                { l: '7 დღე', v: report.freshness.last7 },
                { l: '30 დღე', v: report.freshness.last30 },
                { l: '90+ დღე', v: report.freshness.stale90 },
              ].map(x => (
                <div key={x.l} className="text-center">
                  <p className="text-lg font-extrabold text-slate-800 tabular-nums leading-none">{num(x.v)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{x.l}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Heading icon={Building2} title="ქალაქები" hint="დააჭირე ფილტრისთვის" accent="#8b5cf6" />
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {report.cities.map(c => {
                const active = city === c.city;
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => { setCity(active ? '' : c.city); setSelected(null); }}
                    className="w-full text-left p-3 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${active ? '#bfdbfe' : '#eef2f7'}`,
                      background: active ? '#eff6ff' : '#fff',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800 truncate">{c.city}</span>
                      <TrendChip value={c.trend30d} direction={c.trendDirection} reliable={c.trendReliable} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{num(c.count)} განცხადება</span>
                      <span className="font-bold text-blue-600 tabular-nums">
                        {num(c.avgPricePerSqm)} {sqmUnit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Trend + distribution ────────────────────────────────────────── */}
      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <Heading
            icon={Activity}
            title="₾/მ² დინამიკა — 12 თვე"
            hint="საშუალო და მედიანა შეთავაზების ფასი, ფონზე განცხადებების მოცულობა"
            right={
              spark.length > 1 ? (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">პერიოდის ცვლილება</p>
                  <p
                    className="text-lg font-extrabold tabular-nums"
                    style={{
                      color: spark[spark.length - 1] >= spark[0] ? '#047857' : '#b91c1c',
                    }}
                  >
                    {signed(Math.round(((spark[spark.length - 1] - spark[0]) / (spark[0] || 1)) * 1000) / 10)}
                  </p>
                </div>
              ) : undefined
            }
          />
          <TrendChart points={report.monthlyTrend} />
        </Card>

        <Card>
          <Heading
            icon={BarChart3}
            title="ფასების განაწილება"
            hint="რამდენი განცხადებაა თითო ₾/მ² დიაპაზონში"
            accent="#6366f1"
          />
          <Histogram buckets={report.histogram} />
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">ყველაზე იაფი რაიონი</p>
              <p className="text-sm font-extrabold text-slate-800 truncate">
                {rankings.cheap[0]?.district ?? '—'}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold tabular-nums">
                {rankings.cheap[0] ? `${num(rankings.cheap[0].avgPricePerSqm)} ₾/მ²` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">ყველაზე ძვირი რაიონი</p>
              <p className="text-sm font-extrabold text-slate-800 truncate">
                {rankings.expensive[0]?.district ?? '—'}
              </p>
              <p className="text-[11px] text-blue-600 font-bold tabular-nums">
                {rankings.expensive[0] ? `${num(rankings.expensive[0].avgPricePerSqm)} ₾/მ²` : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Market-wide benchmark ───────────────────────────────────────── */}
      <ExternalMarketBoard
        api={api}
        showToast={showToast}
        ourCities={report.cities}
        isRent={isRent}
      />

      {/* ── Rankings ────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <Heading icon={TrendingUp} title="იზრდება" hint="30 დღის ლიდერები" accent="#10b981" />
          <RankList
            rows={report.topGainers.filter(r => r.trend30d > 0)}
            metric="trend"
            color="#10b981"
            emptyHint="ზრდა არ ფიქსირდება"
            onPick={k => setSelected(k === selected ? null : k)}
            selectedKey={selected}
          />
        </Card>

        <Card>
          <Heading icon={TrendingDown} title="იკლებს" hint="30 დღის ვარდნა" accent="#ef4444" />
          <RankList
            rows={report.topLosers.filter(r => r.trend30d < 0)}
            metric="trend"
            color="#ef4444"
            emptyHint="ვარდნა არ ფიქსირდება"
            onPick={k => setSelected(k === selected ? null : k)}
            selectedKey={selected}
          />
        </Card>

        <Card>
          <Heading icon={Crown} title="ყველაზე ძვირი" hint="საშუალო ₾/მ²" accent="#2563eb" />
          <RankList
            rows={rankings.expensive}
            metric="price"
            color="#2563eb"
            emptyHint="მონაცემი არ არის"
            onPick={k => setSelected(k === selected ? null : k)}
            selectedKey={selected}
          />
        </Card>

        <Card>
          <Heading icon={Tag} title="ყველაზე ხელმისაწვდომი" hint="საშუალო ₾/მ²" accent="#f59e0b" />
          <RankList
            rows={rankings.cheap}
            metric="price"
            color="#f59e0b"
            emptyHint="მონაცემი არ არის"
            onPick={k => setSelected(k === selected ? null : k)}
            selectedKey={selected}
          />
        </Card>
      </div>

      {/* ── Structure: deal / type / rooms ──────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <Heading icon={PieChart} title="გარიგების ტიპი" accent="#0ea5e9" />
          <Donut
            segments={report.dealSplit.map((d, i) => ({
              label: d.label,
              value: d.count,
              color: ['#2563eb', '#10b981', '#94a3b8'][i] ?? '#cbd5e1',
              meta: `${num(d.avgPricePerSqm)} ₾`,
            }))}
          />
        </Card>

        <Card>
          <Heading icon={Building2} title="ქონების ტიპი" accent="#8b5cf6" />
          <Donut
            segments={report.typeSplit.slice(0, 5).map((t, i) => ({
              label: TYPE_LABELS[t.type] ?? t.type,
              value: t.count,
              color: ['#8b5cf6', '#2563eb', '#10b981', '#f59e0b', '#94a3b8'][i] ?? '#cbd5e1',
              meta: `${num(t.avgPricePerSqm)} ₾`,
            }))}
          />
        </Card>

        <Card>
          <Heading icon={Layers} title="ოთახების მიხედვით" hint="საშუალო ₾/მ² და მედიანა ფასი" accent="#f59e0b" />
          {report.roomsSplit.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">მონაცემი არ არის</p>
          ) : (
            <div className="space-y-2.5">
              {report.roomsSplit.map(r => {
                const max = Math.max(...report.roomsSplit.map(x => x.avgPricePerSqm), 1);
                return (
                  <div key={r.rooms}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700">{r.label}</span>
                      <span className="text-slate-400">
                        {r.count} · {num(r.avgArea)} მ² ·{' '}
                        <span className="font-bold text-slate-600 tabular-nums">{compact(r.medianPrice)} ₾</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max((r.avgPricePerSqm / max) * 100, 3)}%`,
                            background: 'linear-gradient(90deg,#fbbf24,#f59e0b)',
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 tabular-nums w-16 text-right">
                        {num(r.avgPricePerSqm)} ₾
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Geostat comparison + yield + price moves ────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className={isRent ? 'lg:col-span-2 opacity-60' : 'lg:col-span-2'}>
          {isRent ? (
            <>
              <Heading
                icon={Target}
                title="Geostat RPPI შედარება"
                hint="ხელმისაწვდომია მხოლოდ ყიდვის რეჟიმში"
                accent="#6366f1"
              />
              <p className="text-sm text-slate-400 py-10 text-center">
                Geostat-ის ინდექსი ყიდვის ფასებს ეხება — ქირასთან შედარება არაკორექტულია.
                გადართე „იყიდება“ რეჟიმზე.
              </p>
            </>
          ) : (
            <>
          <Heading
            icon={Target}
            title={`Geostat RPPI შედარება · ${o.geostatQuarter}`}
            hint="ჩვენი საშუალო (ლურჯი) vs ოფიციალური მედიანა ახალ ბინებზე (იისფერი)"
            accent="#6366f1"
            right={
              <a
                href="https://www.geostat.ge/en/modules/categories/698/residential-property-price-index"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                წყარო <ExternalLink size={11} />
              </a>
            }
          />
          <div className="space-y-3">
            {[...report.benchmarks]
              .sort((a, b) => b.pricePerSqm - a.pricePerSqm)
              .map(b => {
                const live = report.districts.find(
                  d => d.district.trim().toLowerCase() === b.key.toLowerCase(),
                );
                const scaleMax = Math.max(
                  ...report.benchmarks.map(x => x.pricePerSqm),
                  ...report.districts.map(d => d.avgPricePerSqm),
                  1,
                );
                const benchPct = (b.pricePerSqm / scaleMax) * 100;
                const livePct = live ? (live.avgPricePerSqm / scaleMax) * 100 : 0;
                const delta = live?.vsBenchmark ?? null;

                return (
                  <div key={b.key} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 w-[86px] truncate flex-shrink-0">{b.key}</span>
                    <div className="flex-1 min-w-0">
                      <div className="relative h-2 rounded-full bg-slate-100 mb-1">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${benchPct}%`, background: '#c7d2fe' }}
                        />
                      </div>
                      <div className="relative h-2 rounded-full bg-slate-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                          style={{ width: `${livePct}%`, background: live ? '#2563eb' : '#e2e8f0' }}
                        />
                      </div>
                    </div>
                    <div className="w-[120px] flex-shrink-0 text-right">
                      <p className="text-[11px] tabular-nums text-slate-500 leading-tight">
                        {num(b.pricePerSqm)} ₾
                      </p>
                      {live ? (
                        <p className="text-[11px] font-bold tabular-nums text-blue-600 leading-tight">
                          {num(live.avgPricePerSqm)} ₾
                          {delta != null && (
                            <span className={delta >= 0 ? 'text-emerald-600 ml-1' : 'text-red-500 ml-1'}>
                              {signed(delta)}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-300 leading-tight">ჩვენთან არ არის</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <Heading icon={Coins} title="საინვესტიციო დაბრუნება" hint="ქირა × 12 ÷ ყიდვის ფასი" accent="#10b981" />
            {report.rentYield.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                გაანგარიშებისთვის ერთსა და იმავე ქალაქში საჭიროა ორივე — საყიდელი და საქირავებელი განცხადებები
              </p>
            ) : (
              <div className="space-y-3">
                {report.rentYield.map(y => (
                  <div key={y.city} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate">{y.city}</p>
                      <p className="text-[10px] text-slate-400 tabular-nums">
                        {num(y.salePricePerSqm)} ₾/მ² · ქირა {num(y.rentPricePerSqm)} ₾
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-emerald-600 tabular-nums leading-none">
                        {y.grossYield}%
                      </p>
                      <p className="text-[10px] text-slate-400">{y.paybackYears} წელი</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <Heading icon={CalendarClock} title="ფასის კორექციები" hint="ბოლო 90 დღე" accent="#f59e0b" />
            {report.priceChanges.total === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">ფასის ცვლილება არ დაფიქსირებულა</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <p className="text-[10px] font-bold uppercase text-emerald-700">გაძვირება</p>
                    <p className="text-xl font-extrabold text-emerald-700 tabular-nums">
                      {report.priceChanges.increases}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <p className="text-[10px] font-bold uppercase text-red-600">გაიაფება</p>
                    <p className="text-xl font-extrabold text-red-600 tabular-nums">
                      {report.priceChanges.decreases}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">საშუალო ცვლილება</span>
                    <span className="font-bold tabular-nums text-slate-700">
                      {signed(report.priceChanges.avgChangePct)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">მედიანა</span>
                    <span className="font-bold tabular-nums text-slate-700">
                      {signed(report.priceChanges.medianChangePct)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ჯამური მოძრაობა</span>
                    <span className="font-bold tabular-nums text-slate-700">
                      {compact(report.priceChanges.totalMovement)} ₾
                    </span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── District table ──────────────────────────────────────────────── */}
      <Card pad={false}>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3">
          <Heading
            icon={Layers}
            title="რაიონების დეტალური ცხრილი"
            hint="სვეტზე დაჭერით დახარისხდება · რიგზე დაჭერით რაიონი აირჩევა რუკაზე"
          />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="რაიონის ძებნა…"
              className="pl-9 pr-3 py-2 rounded-xl text-sm w-52 focus:outline-none focus:border-blue-400 transition-colors"
              style={{ border: '1px solid #e2e8f0' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    title={col.hint}
                    className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-800 transition-colors ${
                      col.numeric ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sort === col.key && (
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${sortDesc ? '' : 'rotate-180'}`}
                        />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-400">
                    შედეგი ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                tableRows.map(row => {
                  const maxSqm = Math.max(...tableRows.map(r => r.avgPricePerSqm), 1);
                  const active = selected === row.key;
                  return (
                    <tr
                      key={row.key}
                      onClick={() => setSelected(active ? null : row.key)}
                      className="cursor-pointer transition-colors hover:bg-blue-50/40"
                      style={{
                        borderTop: '1px solid #f1f5f9',
                        background: active ? '#eff6ff' : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 leading-tight">{row.district}</p>
                        <p className="text-[11px] text-slate-400">
                          {row.city} · {row.forSale} იყიდება / {row.forRent} ქირა
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden lg:block">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${(row.avgPricePerSqm / maxSqm) * 100}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-blue-600 tabular-nums">
                            {num(row.avgPricePerSqm)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {num(row.medianPricePerSqm)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-semibold">
                        {compact(row.avgPrice)} ₾
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {row.avgArea ? `${num(row.avgArea)} მ²` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">
                        {row.count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TrendChip
                          value={row.trend30d}
                          direction={row.trendDirection}
                          reliable={row.trendReliable}
                        />
                      </td>
                      {!isRent && (
                        <td className="px-4 py-3 text-right">
                          {row.benchmarkPricePerSqm != null ? (
                            <div>
                              <p className="text-[11px] text-slate-400 tabular-nums leading-tight">
                                {num(row.benchmarkPricePerSqm)} ₾
                              </p>
                              {row.vsBenchmark != null && (
                                <p
                                  className="text-xs font-extrabold tabular-nums leading-tight"
                                  style={{
                                    color:
                                      row.vsBenchmark > 0 ? '#047857' : row.vsBenchmark < 0 ? '#b91c1c' : '#64748b',
                                  }}
                                >
                                  {signed(row.vsBenchmark)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"
          style={{ borderTop: '1px solid #f1f5f9', background: '#fbfcfe' }}
        >
          <span>{tableRows.length} რაიონი · {num(o.pricedListings)} ფასიანი განცხადება</span>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700"
          >
            <Download size={12} /> ცხრილის ექსპორტი
          </button>
        </div>
      </Card>

      {/* ── Sources ─────────────────────────────────────────────────────── */}
      <Card>
        <Heading
          icon={Sparkles}
          title="მონაცემების წყაროები და მეთოდოლოგია"
          hint="ცოცხალი ფენა — ჩვენი ბაზა; საორიენტაციო ფენა — ოფიციალური სტატისტიკა"
          accent="#0ea5e9"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.sources.map(src => (
            <a
              key={src.id}
              href={src.url || undefined}
              target={src.url ? '_blank' : undefined}
              rel="noopener noreferrer"
              className={`block p-4 rounded-xl transition-all ${src.url ? 'hover:border-blue-200 hover:shadow-sm' : ''}`}
              style={{ border: '1px solid #eef2f7', background: '#fbfcfe', textDecoration: 'none' }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm font-extrabold text-slate-800">{src.label}</span>
                {src.url ? (
                  <ExternalLink size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 flex-shrink-0">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{src.note}</p>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-4 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          ყველა ფასი შეთავაზების ფასია (offer price), არა რეგისტრირებული გარიგების. Geostat-ის RPPI მოიცავს მხოლოდ
          თბილისს და ახალ საცხოვრებელ ფონდს. ბოლო განახლება: {new Date(report.generatedAt).toLocaleString('ka-GE')}
        </p>
      </Card>
    </div>
  );
}
