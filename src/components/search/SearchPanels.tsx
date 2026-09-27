/**
 * Search controls shared by the home search bar and the listings page filter
 * bar, so both pages pick type, rooms, price and area in exactly the same way.
 */

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { FALLBACK_USD_RATE, useCurrency } from '../../contexts/CurrencyContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { ROOM_CHOICES, ROOMS_OR_MORE } from '../../lib/listingSearch';
import { useTypeOptions } from './searchHelpers';

/**
 * "Up to" shortcuts per deal and currency. A monthly rent and a sale price
 * live on different scales, and each currency gets its own round numbers.
 */
const PRICE_PRESETS: Record<'GEL' | 'USD', Record<string, number[]>> = {
  GEL: {
    sale: [150000, 250000, 400000, 600000, 1000000, 2000000],
    pledge: [30000, 50000, 80000, 120000, 200000, 300000],
    rent: [1000, 1500, 2000, 3000, 4500, 6000],
    daily_rent: [100, 150, 200, 300, 500, 800],
  },
  USD: {
    sale: [50000, 80000, 120000, 200000, 350000, 700000],
    pledge: [10000, 20000, 30000, 50000, 80000, 120000],
    rent: [400, 600, 800, 1200, 1800, 2500],
    daily_rent: [40, 60, 80, 120, 200, 300],
  },
};
const AREA_PRESETS = [40, 60, 80, 100, 150, 200];

/* ── Building blocks ─────────────────────────────────────────────────────── */

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 10);
const grouped = (v: string) => (v ? Number(v).toLocaleString('en-US') : '');

/** Two number boxes with thousands separators. */
export function RangeInputs({
  min, max, onMin, onMax, prefix, suffix, fromLabel, toLabel,
}: {
  min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void;
  prefix?: string; suffix?: string; fromLabel: string; toLabel: string;
}) {
  return (
    <div className="hs-range">
      <label className="hs-range__box">
        <span className="hs-range__cap">{fromLabel}</span>
        <span className="hs-range__row">
          {prefix && <em>{prefix}</em>}
          <input inputMode="numeric" value={grouped(min)} onChange={e => onMin(digits(e.target.value))} placeholder="0" aria-label={fromLabel} />
          {suffix && <em>{suffix}</em>}
        </span>
      </label>
      <span className="hs-range__dash" aria-hidden />
      <label className="hs-range__box">
        <span className="hs-range__cap">{toLabel}</span>
        <span className="hs-range__row">
          {prefix && <em>{prefix}</em>}
          <input inputMode="numeric" value={grouped(max)} onChange={e => onMax(digits(e.target.value))} placeholder="∞" aria-label={toLabel} />
          {suffix && <em>{suffix}</em>}
        </span>
      </label>
    </div>
  );
}

/**
 * Bottom sheet on phones, centred dialog on wide screens. Rendered into
 * <body> so no stacking context on the page can tuck it under the header.
 */
export function Sheet({ title, onClose, children, footer, tall }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; tall?: boolean;
}) {
  const { t } = useTranslation();
  return createPortal(
    <>
      <motion.div className="hs-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className={`hs-sheet ${tall ? 'hs-sheet--tall' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: '100%', opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.6 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      >
        <div className="hs-sheet__handle" />
        <div className="hs-sheet__head">
          <p>{title}</p>
          <button type="button" className="hs-x" onClick={onClose} aria-label={t('common.close')}><X size={16} /></button>
        </div>
        <div className="hs-sheet__body">{children}</div>
        {footer && <div className="hs-sheet__foot">{footer}</div>}
      </motion.div>
    </>,
    document.body,
  );
}

/** "Clear" + "Done (n)" under a panel. */
export function PanelFoot({ onClear, clearDisabled, onDone, count }: {
  onClear: () => void; clearDisabled: boolean; onDone: () => void; count?: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="hs-pop__foot">
      <button type="button" className="hs-link" onClick={onClear} disabled={clearDisabled}>{t('common.clear')}</button>
      <button type="button" className="hs-done" onClick={onDone}>
        {t('home.search.done')}{count !== null && count !== undefined && <span>{count}</span>}
      </button>
    </div>
  );
}

export function TypeGrid({ value, counts, onPick }: {
  value: string; counts?: Map<string, number>; onPick: (type: string) => void;
}) {
  const options = useTypeOptions();
  return (
    <div className="hs-types">
      {options.map(opt => {
        const Icon = opt.icon;
        const n = opt.v && counts ? counts.get(opt.v) ?? 0 : null;
        return (
          <button
            key={opt.v || 'all'}
            type="button"
            className={`hs-type ${value === opt.v ? 'is-on' : ''} ${n === 0 ? 'is-empty' : ''}`}
            aria-pressed={value === opt.v}
            onClick={() => onPick(opt.v)}
          >
            <span className="hs-type__icon"><Icon size={18} strokeWidth={2} /></span>
            <span className="hs-type__label">{opt.l}</span>
            {n !== null && n > 0 && <span className="hs-type__n">{n}</span>}
            {value === opt.v && <Check size={15} strokeWidth={2.8} className="hs-type__check" />}
          </button>
        );
      })}
    </div>
  );
}

export function RoomsPicker({ value, onChange }: {
  value: readonly string[]; onChange: (update: (prev: string[]) => string[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="hs-rooms">
      <div className="hs-rooms__row" role="group" aria-label={t('home.search.rooms')}>
        <button type="button" className={`hs-room hs-room--any ${value.length ? '' : 'is-on'}`} onClick={() => onChange(() => [])}>
          {t('common.all')}
        </button>
        {ROOM_CHOICES.map(r => {
          const on = value.includes(r);
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              className={`hs-room ${on ? 'is-on' : ''}`}
              onClick={() => onChange(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]))}
            >
              {r === ROOMS_OR_MORE ? `${r}+` : r}
            </button>
          );
        })}
      </div>
      <p className="hs-hint">{t('home.search.roomsHint')}</p>
    </div>
  );
}

/** Currency switch, from–to, and deal-aware "up to" shortcuts. Amounts are in the display currency. */
export function PricePanel({ status, min, max, onChange }: {
  status: string; min: string; max: string; onChange: (min: string, max: string) => void;
}) {
  const { t } = useTranslation();
  const { currency, setCurrency, rates, currencySymbol, formatMoney } = useCurrency();
  const presets = PRICE_PRESETS[currency][status] ?? PRICE_PRESETS[currency].sale;

  function switchTo(cur: 'GEL' | 'USD') {
    if (currency === cur) return;
    // Keep the typed amounts meaning the same money in the other currency.
    const rate = rates.USD ?? FALLBACK_USD_RATE;
    const convert = (v: string) => (v ? String(Math.round(cur === 'USD' ? Number(v) / rate : Number(v) * rate)) : '');
    onChange(convert(min), convert(max));
    setCurrency(cur);
  }

  return (
    <div className="hs-price">
      <div className="hs-seg" role="radiogroup" aria-label={t('home.search.currency')}>
        {(['GEL', 'USD'] as const).map(cur => (
          <button key={cur} type="button" role="radio" aria-checked={currency === cur} className={currency === cur ? 'is-on' : ''} onClick={() => switchTo(cur)}>
            {cur === 'GEL' ? '₾ GEL' : '$ USD'}
          </button>
        ))}
      </div>
      <RangeInputs
        min={min}
        max={max}
        onMin={v => onChange(v, max)}
        onMax={v => onChange(min, v)}
        prefix={currencySymbol}
        fromLabel={t('home.from')}
        toLabel={t('home.to')}
      />
      <p className="hs-label">{t('home.quickSelect')}</p>
      <div className="hs-presets">
        {presets.map(amount => {
          const value = String(amount);
          const on = max === value && !min;
          return (
            <button key={amount} type="button" className={on ? 'is-on' : ''} onClick={() => onChange('', on ? '' : value)}>
              {t('home.upToPrice', { amount: formatMoney(amount, { compact: true, from: currency }) })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AreaPanel({ min, max, onChange }: {
  min: string; max: string; onChange: (min: string, max: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="hs-price">
      <RangeInputs
        min={min}
        max={max}
        onMin={v => onChange(v, max)}
        onMax={v => onChange(min, v)}
        suffix={t('home.areaUnit')}
        fromLabel={t('home.from')}
        toLabel={t('home.to')}
      />
      <div className="hs-presets">
        {AREA_PRESETS.map(a => {
          const on = min === String(a) && !max;
          return (
            <button key={a} type="button" className={on ? 'is-on' : ''} onClick={() => onChange(on ? '' : String(a), '')}>
              {a}+ {t('home.areaUnit')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
