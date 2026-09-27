import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble, ChevronDown, HardHat, Hash, LayoutGrid, Loader2, MapPin, Ruler, Search,
  SlidersHorizontal, X,
} from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { fetchPropertyById } from '../lib/publicApi';
import { listingsHref } from '../lib/seoListingsUrl';
import { propertyHref } from '../lib/seoPropertyUrl';
import {
  EMPTY_CRITERIA,
  classifyQuery,
  matchesCriteria,
  orderedRange,
  statusMatches,
  type SearchCriteria,
} from '../lib/listingSearch';
import type { LocationCounts } from '../lib/locationCounts';
import type { Property } from '../types/listing';
import LocationPicker from './LocationPicker';
import { AreaPanel, PanelFoot, PricePanel, RoomsPicker, Sheet, TypeGrid } from './search/SearchPanels';
import {
  areaSummary, locationSummary, roomsSummary, useDealOptions, usePriceSummary, useTypeOptions,
} from './search/searchHelpers';

type Panel = 'type' | 'location' | 'rooms' | 'price' | 'filters';

const STORAGE_KEY = 'home_search_v1';

/** Remembers the shape of the last search (not prices, which depend on currency). */
function loadSaved(): SearchCriteria {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CRITERIA;
    const s = JSON.parse(raw) as Partial<SearchCriteria>;
    return {
      ...EMPTY_CRITERIA,
      status: typeof s.status === 'string' && s.status ? s.status : EMPTY_CRITERIA.status,
      type: typeof s.type === 'string' ? s.type : '',
      city: typeof s.city === 'string' ? s.city : '',
      districts: Array.isArray(s.districts) ? s.districts.filter(x => typeof x === 'string') : [],
      rooms: Array.isArray(s.rooms) ? s.rooms.filter(x => typeof x === 'string') : [],
      areaMin: typeof s.areaMin === 'string' ? s.areaMin : '',
      areaMax: typeof s.areaMax === 'string' ? s.areaMax : '',
    };
  } catch {
    return EMPTY_CRITERIA;
  }
}

function save(c: SearchCriteria) {
  try {
    const { status, type, city, districts, rooms, areaMin, areaMax } = c;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, type, city, districts, rooms, areaMin, areaMax }));
  } catch {
    // Private mode — nothing to remember, the search still works.
  }
}

export default function HomeSearch({
  properties,
  loading,
  locationCounts,
  projectsCount = 0,
}: {
  properties: Property[];
  loading: boolean;
  locationCounts?: LocationCounts;
  projectsCount?: number;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { currency, currencySymbol, displayToGel, listingToGel } = useCurrency();

  const [c, setC] = useState<SearchCriteria>(loadSaved);
  const [open, setOpen] = useState<Panel | null>(null);
  const [sheet, setSheet] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  const set = useCallback(<K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => {
    setC(prev => ({ ...prev, [key]: value }));
    if (key === 'q') setError('');
  }, []);

  const deals = useDealOptions();
  const typeOpts = useTypeOptions();

  /* ── Live result count (same rules as the listings page) ─────────────── */
  const money = useMemo(() => ({ displayToGel, listingToGel }), [displayToGel, listingToGel]);
  const effective = useMemo<SearchCriteria>(() => {
    const [priceMin, priceMax] = orderedRange(c.priceMin, c.priceMax);
    const [areaMin, areaMax] = orderedRange(c.areaMin, c.areaMax);
    return { ...c, priceMin, priceMax, areaMin, areaMax };
  }, [c]);
  const resultCount = useMemo(
    () => (loading ? null : properties.filter(p => matchesCriteria(p, effective, money)).length),
    [loading, properties, effective, money],
  );
  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of properties) if (statusMatches(p, c.status)) m.set(p.type, (m.get(p.type) ?? 0) + 1);
    return m;
  }, [properties, c.status]);

  /* ── Summaries on the closed fields ──────────────────────────────────── */
  const locationText = useMemo(() => locationSummary(c.city, c.districts, t, locale), [c.city, c.districts, t, locale]);
  const typeSummary = typeOpts.find(o => o.v === c.type)?.l ?? '';
  const roomsText = roomsSummary(c.rooms);
  const priceSummary = usePriceSummary(c.priceMin, c.priceMax);
  const moreCount = (c.areaMin || c.areaMax ? 1 : 0);
  const qKind = classifyQuery(c.q);

  /* ── Popover plumbing ────────────────────────────────────────────────── */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setSheet(null); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Bring an opened dropdown fully on screen, keeping the bar under the fixed header.
  useEffect(() => {
    if (!open || open === 'filters') return;
    const frame = requestAnimationFrame(() => {
      const pop = barRef.current?.querySelector<HTMLElement>('.hs-pop');
      const bar = barRef.current;
      if (!pop || !bar) return;
      const overflow = pop.getBoundingClientRect().bottom - (window.innerHeight - 16);
      if (overflow <= 0) return;
      const room = bar.getBoundingClientRect().top - 118;
      const by = Math.min(overflow, Math.max(room, 0));
      if (by > 0) window.scrollBy({ top: by, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sheet]);

  const toggle = (p: Panel) => setOpen(cur => (cur === p ? null : p));
  const closeAll = () => { setOpen(null); setSheet(null); };

  /* ── Search ──────────────────────────────────────────────────────────── */
  async function run() {
    const q = c.q.trim();
    save(c);
    if (qKind === 'id') {
      if (busy) return;
      setBusy(true);
      setError('');
      try {
        let hit: Property | null = null;
        if (q.length === 8) {
          hit = properties.find(p => p.id === q) ?? await fetchPropertyById(q);
          if (!hit) { setError(t('home.idNotFound')); return; }
        } else {
          const prefix = properties.filter(p => p.id.startsWith(q));
          if (prefix.length === 1) hit = prefix[0];
          else if (!prefix.length) { setError(t('home.idNotFound')); return; }
        }
        closeAll();
        // A unique match opens the listing; several go to the results list, best first.
        navigate(hit ? propertyHref(hit) : listingsHref({ q }));
      } finally {
        setBusy(false);
      }
      return;
    }
    const [priceMin, priceMax] = orderedRange(c.priceMin, c.priceMax);
    const [areaMin, areaMax] = orderedRange(c.areaMin, c.areaMax);
    closeAll();
    navigate(listingsHref({
      status: c.status || undefined,
      type: c.type || undefined,
      city: c.city || undefined,
      district: c.districts.length === 1 ? c.districts[0] : undefined,
      districts: c.districts.length > 1 ? c.districts : undefined,
      rooms: c.rooms.length ? c.rooms : undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
      currency,
      areaMin: areaMin || undefined,
      areaMax: areaMax || undefined,
      q: q || undefined,
    }));
  }

  function clearAll() {
    setC(prev => ({ ...EMPTY_CRITERIA, status: prev.status }));
    setError('');
  }

  const resultLabel = resultCount === null
    ? t('home.searchBtn')
    : resultCount === 0
      ? t('home.search.noResults')
      : t('home.search.showN', { n: resultCount.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US') });

  /* ── Panel bodies (shared by desktop popovers and phone sheets) ──────── */
  const typeBody = (
    <TypeGrid value={c.type} counts={typeCounts} onPick={v => { set('type', v); setOpen(null); setSheet(null); }} />
  );
  const roomsBody = <RoomsPicker value={c.rooms} onChange={update => setC(prev => ({ ...prev, rooms: update(prev.rooms) }))} />;
  const priceBody = (
    <PricePanel status={c.status} min={c.priceMin} max={c.priceMax} onChange={(priceMin, priceMax) => setC(prev => ({ ...prev, priceMin, priceMax }))} />
  );
  const areaBody = <AreaPanel min={c.areaMin} max={c.areaMax} onChange={(areaMin, areaMax) => setC(prev => ({ ...prev, areaMin, areaMax }))} />;

  const locationBody = (layout: 'pop' | 'sheet') => (
    <LocationPicker
      layout={layout}
      city={c.city}
      districts={c.districts}
      counts={locationCounts}
      onChange={(city, districts) => setC(prev => ({ ...prev, city, districts }))}
      onDone={closeAll}
      doneLabel={resultCount === null ? t('home.search.done') : `${t('home.search.done')} · ${resultCount}`}
    />
  );

  const panelFoot = (onClear: () => void, clearDisabled: boolean) => (
    <PanelFoot onClear={onClear} clearDisabled={clearDisabled} onDone={closeAll} count={resultCount} />
  );

  /* ── Field shells ────────────────────────────────────────────────────── */
  const field = ({ id, icon, label, value, placeholder, onClear, children, className = '' }: {
    id: Exclude<Panel, 'filters'>; icon: ReactNode; label: string; value: string; placeholder: string;
    onClear?: () => void; children: ReactNode; className?: string;
  }) => (
    <div className={`hs-field ${open === id ? 'is-open' : ''} ${value ? 'has-value' : ''} ${className}`}>
      <button type="button" className="hs-trigger" onClick={() => toggle(id)} aria-expanded={open === id} aria-haspopup="dialog">
        <span className="hs-trigger__icon">{icon}</span>
        <span className="hs-trigger__copy">
          <span className="hs-trigger__label">{label}</span>
          <span className={`hs-trigger__value ${value ? '' : 'is-empty'}`}>{value || placeholder}</span>
        </span>
        <ChevronDown size={15} strokeWidth={2.4} className="hs-trigger__chev" />
      </button>
      {value && onClear && (
        <button type="button" className="hs-clear" onClick={onClear} aria-label={`${t('common.clear')}: ${label}`}>
          <X size={12} strokeWidth={2.8} />
        </button>
      )}
      <AnimatePresence>
        {open === id && (
          <motion.div
            className={`hs-pop hs-pop--${id}`}
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const tile = ({ id, icon, label, value, placeholder, onClear, wide }: {
    id: Panel; icon: ReactNode; label: string; value: string; placeholder: string; onClear?: () => void; wide?: boolean;
  }) => (
    <div className={`hs-tile ${wide ? 'hs-tile--wide' : ''} ${value ? 'has-value' : ''}`}>
      <button type="button" className="hs-tile__btn" onClick={() => setSheet(id)}>
        <span className="hs-trigger__icon">{icon}</span>
        <span className="hs-trigger__copy">
          <span className="hs-trigger__label">{label}</span>
          <span className={`hs-trigger__value ${value ? '' : 'is-empty'}`}>{value || placeholder}</span>
        </span>
      </button>
      {value && onClear && (
        <button type="button" className="hs-clear" onClick={onClear} aria-label={`${t('common.clear')}: ${label}`}>
          <X size={12} strokeWidth={2.8} />
        </button>
      )}
    </div>
  );

  const clearLocation = () => setC(prev => ({ ...prev, city: '', districts: [] }));
  const clearRooms = () => set('rooms', []);
  const clearPrice = () => setC(prev => ({ ...prev, priceMin: '', priceMax: '' }));
  const clearArea = () => setC(prev => ({ ...prev, areaMin: '', areaMax: '' }));
  const areaText = areaSummary(c.areaMin, c.areaMax, t('home.areaUnit'));
  const currencyIcon = <span className="hs-cur">{currencySymbol}</span>;

  /** What each field shows while closed — shared by the desktop bar and the phone tiles. */
  const meta = {
    type: { id: 'type' as const, icon: <LayoutGrid size={16} strokeWidth={2.2} />, label: t('home.propertyType'), value: c.type ? typeSummary : '', placeholder: t('home.search.anyType'), onClear: () => set('type', '') },
    location: { id: 'location' as const, icon: <MapPin size={16} strokeWidth={2.2} />, label: t('home.location'), value: locationText, placeholder: t('home.locationHint'), onClear: clearLocation },
    rooms: { id: 'rooms' as const, icon: <BedDouble size={16} strokeWidth={2.2} />, label: t('home.search.rooms'), value: roomsText, placeholder: t('common.all'), onClear: clearRooms },
    price: { id: 'price' as const, icon: currencyIcon, label: t('home.price'), value: priceSummary, placeholder: t('common.any'), onClear: clearPrice },
    area: { id: 'filters' as const, icon: <Ruler size={16} strokeWidth={2.2} />, label: t('home.area'), value: areaText, placeholder: t('common.any'), onClear: clearArea },
  };

  const keywordInput = (
    <label className="hs-field hs-keyword">
      <span className="hs-trigger__icon"><Hash size={16} strokeWidth={2.2} /></span>
      <span className="hs-trigger__copy">
        <span className="hs-trigger__label">{t('home.search.keywordLabel')}</span>
        <input
          className="hs-keyword__input"
          value={c.q}
          onChange={e => set('q', e.target.value.slice(0, 80))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void run(); } }}
          placeholder={t('home.search.keywordPlaceholder')}
          autoComplete="off"
          enterKeyHint="search"
          aria-label={t('home.search.keywordLabel')}
        />
      </span>
      {(qKind === 'id' || qKind === 'cadastral') && (
        <span className="hs-kind">{qKind === 'id' ? 'ID' : t('home.search.kindCadastral')}</span>
      )}
      {c.q && (
        <button type="button" className="hs-clear hs-clear--inline" onClick={() => set('q', '')} aria-label={t('common.clear')}>
          <X size={12} strokeWidth={2.8} />
        </button>
      )}
    </label>
  );

  const submit = (
    <button type="button" className="hs-submit" onClick={() => { void run(); }} disabled={busy}>
      {busy ? <Loader2 size={17} strokeWidth={2.4} className="hs-spin" /> : <Search size={17} strokeWidth={2.4} />}
      <span className="hs-submit__label">{t('home.searchBtn')}</span>
      {resultCount !== null && qKind !== 'id' && (
        <span className={`hs-submit__n ${resultCount === 0 ? 'is-zero' : ''}`} aria-label={resultLabel}>
          {/* Say what is being counted — the deal tab narrows it, not an empty search. */}
          {resultCount} <em>{deals.find(d => d.v === c.status)?.l}</em>
        </span>
      )}
    </button>
  );

  const filtersBtn = (onClick: () => void) => (
    <button type="button" className={`hs-more ${moreCount ? 'is-active' : ''}`} onClick={onClick} aria-label={t('listings.filter')} title={t('listings.filter')}>
      <SlidersHorizontal size={17} strokeWidth={2.2} />
      <span className="hs-more__label">{t('listings.filter')}</span>
      {moreCount > 0 && <span className="hs-more__n">{moreCount}</span>}
    </button>
  );

  const filtersBody = (
    <div className="hs-filters">
      <section>
        <h3>{t('home.dealType')}</h3>
        <div className="hs-chips">
          {deals.map(d => (
            <button key={d.v} type="button" className={c.status === d.v ? 'is-on' : ''} onClick={() => set('status', d.v)}>{d.l}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>{t('home.propertyType')}</h3>
        {typeBody}
      </section>
      <section>
        <h3>{t('home.search.rooms')}</h3>
        {roomsBody}
      </section>
      <section>
        <h3>{t('home.totalPrice')}</h3>
        {priceBody}
      </section>
      <section>
        <h3>{t('home.area')}</h3>
        {areaBody}
      </section>
    </div>
  );

  const filtersFoot = (
    <>
      <button type="button" className="hs-link" onClick={clearAll}>{t('common.clear')}</button>
      <button type="button" className="hs-apply" onClick={() => { void run(); }} disabled={busy}>
        <Search size={16} strokeWidth={2.4} />
        {resultLabel}
      </button>
    </>
  );

  return (
    <div className="hs" ref={barRef}>
      <div className="hs__top">
        <div className="hs-deals" role="tablist" aria-label={t('home.dealType')}>
          {deals.map(d => (
            <button
              key={d.v}
              type="button"
              role="tab"
              aria-selected={c.status === d.v}
              className={`hs-deal ${c.status === d.v ? 'is-on' : ''}`}
              onClick={() => setC(prev => ({ ...prev, status: d.v, priceMin: '', priceMax: '' }))}
            >
              {d.l}
            </button>
          ))}
        </div>
        <Link to="/projects" className="hs-projects">
          <HardHat size={15} strokeWidth={2.2} />
          {t('home.newProjects')}
          {projectsCount > 0 && <span>{projectsCount}</span>}
        </Link>
      </div>

      {/* Desktop: one bar */}
      <div className="hs-bar">
        {field({ ...meta.type, children: typeBody })}
        {field({ ...meta.location, className: 'hs-field--loc', children: locationBody('pop') })}
        {field({ ...meta.rooms, children: <>{roomsBody}{panelFoot(clearRooms, !c.rooms.length)}</> })}
        {field({ ...meta.price, children: <>{priceBody}{panelFoot(clearPrice, !c.priceMin && !c.priceMax)}</> })}
        {keywordInput}
        <div className="hs-actions">
          {filtersBtn(() => { setOpen(null); setSheet('filters'); })}
          {submit}
        </div>
      </div>

      {/* Phones & tablets: stacked tiles that open sheets */}
      <div className="hs-stack">
        {tile({ ...meta.location, wide: true })}
        <div className="hs-stack__row">
          {tile(meta.type)}
          {tile(meta.rooms)}
        </div>
        <div className="hs-stack__row">
          {tile(meta.price)}
          {tile(meta.area)}
        </div>
        {keywordInput}
        <div className="hs-actions">
          {filtersBtn(() => setSheet('filters'))}
          {submit}
        </div>
      </div>

      {error && <p className="hs-error" role="alert">{error}</p>}

      <AnimatePresence>
        {sheet === 'location' && (
          <Sheet title={t('home.location')} onClose={closeAll} tall>
            {locationBody('sheet')}
          </Sheet>
        )}
        {sheet === 'type' && (
          <Sheet title={t('home.propertyType')} onClose={closeAll}>{typeBody}</Sheet>
        )}
        {sheet === 'rooms' && (
          <Sheet title={t('home.search.rooms')} onClose={closeAll} footer={panelFoot(clearRooms, !c.rooms.length)}>
            {roomsBody}
          </Sheet>
        )}
        {sheet === 'price' && (
          <Sheet title={t('home.priceRange')} onClose={closeAll} footer={panelFoot(clearPrice, !c.priceMin && !c.priceMax)}>
            {priceBody}
          </Sheet>
        )}
        {sheet === 'filters' && (
          <Sheet title={t('home.filterTitle')} onClose={closeAll} footer={filtersFoot} tall>
            {filtersBody}
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}
